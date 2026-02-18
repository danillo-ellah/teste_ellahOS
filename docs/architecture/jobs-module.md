# Arquitetura: Modulo Jobs (Tabela Master)

**Data:** 2026-02-13
**Status:** Atualizado - Alinhado com spec refinada (respostas CEO)
**Autor:** Tech Lead - ELLAHOS
**Spec de referencia:** docs/specs/jobs-master-table.md

---

## 1. Visao Geral

O modulo Jobs e o nucleo do ELLAHOS. Ele centraliza todos os projetos audiovisuais de uma produtora, desde o briefing inicial ate a entrega final e fechamento financeiro. Todos os demais modulos (Financeiro, Contratos, Producao, Notificacoes) se integram ao Job como entidade central.

### Posicao na Arquitetura

```
[Auth / Multi-tenant]
        |
        v
[Cadastros Base] --> Clients, Agencies, People, Contacts
        |
        v
  [JOBS MODULE] <--- ESTE DOCUMENTO
   /    |    \
  v     v     v
[Finance] [Contracts] [Production]
        |
        v
[Google Drive] [n8n Automacoes] [Notificacoes WhatsApp]
```

### Principios Arquiteturais

- **Multi-tenant**: `tenant_id` em todas as tabelas, RLS obrigatorio
- **API-first**: Edge Functions expondo REST antes de qualquer UI
- **Idempotencia**: toda operacao pode ser executada 2x sem efeito colateral
- **Soft delete**: `deleted_at` em vez de DELETE fisico
- **Audit trail**: toda mudanca registrada em `job_history`
- **snake_case**: tabelas e colunas
- **Tabelas no plural**: `jobs`, `job_team_members`, `job_deliverables`

### Mudancas em relacao a versao anterior

- **14 status** (antes 13): adicionados `selecao_diretor` e `cronograma_planejamento`
- **Sub-status**: campo `sub_status` para granularidade na Pos-Producao (Edicao, Cor, VFX, Finalizacao)
- **Modelo financeiro Ellah**: campos `closed_value`, `production_cost`, `tax_value`, `tax_percentage`, `gross_profit`, `net_profit`, `margin_percentage` substituem modelo anterior
- **Health Score**: campo `health_score` (0-100 pts) com trigger de calculo automatico
- **URLs Google Drive**: 7 colunas de URLs diretos (drive_folder_url, budget_letter_url, etc.)
- **Aprovacao**: campos `approval_type`, `approved_by_user_id`, `approval_document_url`
- **Campos extras**: `account_email`, `media_type`, `complexity_level`, `audio_notes`, `job_category`, `custom_fields`, `created_by`
- **Novos endpoints**: health-score, approve, create-drive-structure, generate-budget-letter, generate-cast-contract
- **Novos componentes**: HealthScoreBadge, ApprovalFlow, DriveIntegrationPanel, MarginIndicator

---

## 2. Schema do Banco de Dados

### 2.1 ENUMs

```sql
-- ============================================================
-- ENUMs
-- ============================================================

-- Tipo de projeto
CREATE TYPE job_type AS ENUM (
  'filme_publicitario',
  'branded_content',
  'videoclipe',
  'documentario',
  'conteudo_digital',
  'evento',
  'institucional',
  'motion_graphics',
  'fotografia',
  'outro'
);

-- Status do job (lifecycle completo - 14 status)
CREATE TYPE job_status AS ENUM (
  'briefing_recebido',
  'orcamento_em_elaboracao',
  'orcamento_enviado',
  'aguardando_aprovacao_cliente',
  'selecao_diretor',
  'cronograma_planejamento',
  'pre_producao_em_andamento',
  'producao_filmagem',
  'pos_producao',
  'aguardando_aprovacao_final',
  'entregue',
  'finalizado',
  'cancelado',
  'pausado'
);

-- Prioridade
CREATE TYPE job_priority AS ENUM (
  'alta',
  'media',
  'baixa'
);

-- Segmento de mercado
CREATE TYPE segment_type AS ENUM (
  'automotivo',
  'varejo',
  'fintech',
  'alimentos',
  'moda',
  'tech',
  'saude',
  'educacao',
  'entretenimento',
  'outro'
);

-- Nivel de complexidade
CREATE TYPE complexity_level AS ENUM (
  'baixo',
  'medio',
  'alto'
);

-- Funcao no job
CREATE TYPE team_role AS ENUM (
  'diretor',
  'produtor_executivo',
  'coordenador_producao',
  'diretor_fotografia',
  'assistente_direcao',
  'editor',
  'colorista',
  'sound_designer',
  'motion_designer',
  'produtor_casting',
  'produtor_locacao',
  'diretor_arte',
  'figurinista',
  'maquiador',
  'atendimento',
  'freelancer',
  'outro'
);

-- Status de contratacao
CREATE TYPE hiring_status AS ENUM (
  'orcado',
  'proposta_enviada',
  'confirmado',
  'cancelado'
);

-- Status de entregavel
CREATE TYPE deliverable_status AS ENUM (
  'pendente',
  'em_producao',
  'aguardando_aprovacao',
  'aprovado',
  'entregue'
);

-- Tipo de evento no historico
CREATE TYPE history_event_type AS ENUM (
  'status_change',
  'field_update',
  'team_change',
  'deliverable_change',
  'comment',
  'file_upload',
  'created',
  'duplicated',
  'archived',
  'restored'
);

-- Categoria de anexo
CREATE TYPE attachment_category AS ENUM (
  'briefing',
  'contrato',
  'referencias',
  'aprovacoes',
  'entregaveis',
  'outro'
);

-- Tipo de aprovacao
CREATE TYPE approval_type AS ENUM (
  'internal',
  'external'
);
```

### 2.2 Tabelas de Suporte (pre-requisitos)

Estas tabelas precisam existir ANTES do modulo Jobs. Sao definidas aqui de forma minima para referencia; cada modulo tera sua propria spec detalhada.

```sql
-- ============================================================
-- Tabelas de Suporte (pre-requisitos)
-- ============================================================

-- Tenants (produtoras)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Users (usuarios do sistema)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Clients (anunciantes / clientes finais)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(tenant_id, name);

-- Agencies (agencias de publicidade)
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agencies_tenant_id ON agencies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agencies_name ON agencies(tenant_id, name);

-- Contacts (contatos de clientes e agencias)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID REFERENCES clients(id),
  agency_id UUID REFERENCES agencies(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_agency_id ON contacts(agency_id);

-- People (staff interno, freelancers, elenco)
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  type TEXT NOT NULL DEFAULT 'freelancer', -- 'staff', 'freelancer', 'talent'
  default_role team_role,
  daily_rate NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_people_tenant_id ON people(tenant_id);
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_people_full_name ON people(tenant_id, full_name);
```

### 2.3 Tabela Principal: jobs

```sql
-- ============================================================
-- Tabela Principal: jobs
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
  -- Identificacao
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  index_number INTEGER NOT NULL,                  -- Sequencial por tenant (001, 002...)
  job_code TEXT NOT NULL,                          -- JOB_ABA: {INDEX}_{NomeJob}_{Agencia}
  title TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  agency_id UUID REFERENCES agencies(id),
  brand TEXT,                                      -- Marca especifica do cliente
  account_email TEXT,                              -- Email do atendimento responsavel

  -- Classificacao
  job_type job_type NOT NULL DEFAULT 'filme_publicitario',
  media_type TEXT,                                 -- Tipo de midia (15", 30", Serie, Social Media)
  segment segment_type,
  complexity_level complexity_level,               -- Baixo, Medio, Alto
  audio_notes TEXT,                                -- Informacoes sobre audio do projeto
  job_category TEXT,                               -- Categoria customizavel (CATEGORIA DE JOB da master)
  tags TEXT[] DEFAULT '{}',                        -- Tags customizaveis

  -- Status e Lifecycle
  status job_status NOT NULL DEFAULT 'briefing_recebido',
  sub_status TEXT,                                 -- Sub-status livre (ex: Edicao, Cor, VFX na Pos-Producao)
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_updated_by UUID REFERENCES users(id),
  priority job_priority DEFAULT 'media',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  cancellation_reason TEXT,                        -- Obrigatorio se status = cancelado

  -- Hierarquia (Job Pai / Sub-jobs)
  parent_job_id UUID REFERENCES jobs(id),          -- FK para job pai (NULL se for raiz)
  is_parent_job BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Datas Importantes
  briefing_date DATE,
  budget_sent_date DATE,
  client_approval_deadline DATE,
  approval_date DATE,
  ppm_date DATE,                                   -- Pre-Producao Meeting
  post_start_date DATE,                            -- Inicio pos-producao
  post_deadline_date DATE,                         -- Deadline interno pos
  expected_delivery_date DATE,                     -- Promessa ao cliente
  actual_delivery_date DATE,                       -- Entrega efetiva
  payment_date DATE,                               -- Data de pagamento do cliente

  -- Financeiro (modelo real da Ellah)
  closed_value NUMERIC(12,2),                      -- Valor Fechado - quanto o cliente paga (R$)
  production_cost NUMERIC(12,2),                   -- Valor Producao - soma de despesas vinculadas (auto-calculado)
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 12.00, -- Percentual de imposto
  tax_value NUMERIC(12,2),                         -- Valor Imposto (auto-calculado: closed * tax% / 100)
  gross_profit NUMERIC(12,2),                      -- Valor W - lucro bruto (auto-calculado)
  net_profit NUMERIC(12,2),                        -- Valor Liquido - lucro final
  margin_percentage NUMERIC(5,2),                  -- Margem % (auto-calculado: gross / closed * 100)
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_terms TEXT,                              -- Ex: "50% adiantado, 50% entrega"
  po_number TEXT,                                  -- Purchase Order do cliente

  -- Health Score
  health_score INTEGER NOT NULL DEFAULT 0,         -- Pontuacao 0-100, calculada automaticamente

  -- URLs e Links (Google Drive)
  drive_folder_url TEXT,                           -- URL da pasta raiz do job no Drive
  budget_letter_url TEXT,                          -- URL da Carta Orcamento
  schedule_url TEXT,                               -- URL do Cronograma
  script_url TEXT,                                 -- URL do Roteiro
  ppm_url TEXT,                                    -- URL do documento de PPM
  production_sheet_url TEXT,                        -- URL da planilha GG_ (custos)
  contracts_folder_url TEXT,                        -- URL da pasta de contratos

  -- Briefing e Observacoes
  briefing_text TEXT,
  notes TEXT,                                      -- Notas gerais
  internal_notes TEXT,                             -- Notas internas (nao visivel para cliente)

  -- Relacionamentos e Aprovacao
  primary_client_contact_id UUID REFERENCES contacts(id),
  primary_agency_contact_id UUID REFERENCES contacts(id),
  approval_type approval_type,                     -- 'internal' ou 'external'
  approved_by_user_id UUID REFERENCES users(id),   -- Quem marcou como aprovado
  approval_document_url TEXT,                      -- URL do documento de Aprovacao Interna

  -- Campos Customizaveis
  custom_fields JSONB DEFAULT '{}',                -- Campos adicionais por produtora

  -- Auditoria
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(tenant_id, job_code)
);

-- Indices da tabela jobs
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_agency_id ON jobs(agency_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_parent_job_id ON jobs(parent_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_updated_by ON jobs(status_updated_by);
CREATE INDEX IF NOT EXISTS idx_jobs_primary_client_contact ON jobs(primary_client_contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_primary_agency_contact ON jobs(primary_agency_contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_approved_by ON jobs(approved_by_user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_job_code ON jobs(tenant_id, job_code);
CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(tenant_id, title);
CREATE INDEX IF NOT EXISTS idx_jobs_expected_delivery ON jobs(tenant_id, expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_jobs_is_archived ON jobs(tenant_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON jobs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_jobs_custom_fields ON jobs USING GIN(custom_fields);
CREATE INDEX IF NOT EXISTS idx_jobs_health_score ON jobs(tenant_id, health_score);

-- Indice composto para listagem principal (tenant + nao arquivado + status)
CREATE INDEX IF NOT EXISTS idx_jobs_active_listing
  ON jobs(tenant_id, is_archived, status, expected_delivery_date)
  WHERE deleted_at IS NULL;

-- Indice para busca textual (full-text search)
CREATE INDEX IF NOT EXISTS idx_jobs_search
  ON jobs USING GIN(
    to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(job_code, '') || ' ' || coalesce(brand, ''))
  );
```

### 2.4 Tabelas Relacionadas

```sql
-- ============================================================
-- job_team_members (equipe do job)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id),
  role team_role NOT NULL,
  fee NUMERIC(12,2),                               -- Cache/valor acordado (R$)
  hiring_status hiring_status NOT NULL DEFAULT 'orcado',
  is_lead_producer BOOLEAN NOT NULL DEFAULT false, -- Apenas 1 true por job
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Uma pessoa nao pode ter a mesma funcao duplicada no mesmo job
  UNIQUE(job_id, person_id, role)
);

CREATE INDEX IF NOT EXISTS idx_job_team_members_tenant_id ON job_team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_team_members_job_id ON job_team_members(job_id);
CREATE INDEX IF NOT EXISTS idx_job_team_members_person_id ON job_team_members(person_id);
CREATE INDEX IF NOT EXISTS idx_job_team_members_role ON job_team_members(job_id, role);
CREATE INDEX IF NOT EXISTS idx_job_team_members_lead
  ON job_team_members(job_id, is_lead_producer) WHERE is_lead_producer = true;


-- ============================================================
-- job_deliverables (entregaveis do job)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,                       -- "Filme Master 30s"
  format TEXT,                                     -- MP4, MOV, ProRes 422
  resolution TEXT,                                 -- 1080p, 4K, Vertical 1080x1920
  duration_seconds INTEGER,
  status deliverable_status NOT NULL DEFAULT 'pendente',
  version INTEGER NOT NULL DEFAULT 1,              -- Controle de versao v1, v2...
  delivery_date DATE,                              -- Quando foi efetivamente entregue
  file_url TEXT,                                   -- Link Google Drive, Dropbox, Vimeo
  review_url TEXT,                                 -- Link Frame.io para review na pos
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_deliverables_tenant_id ON job_deliverables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_deliverables_job_id ON job_deliverables(job_id);
CREATE INDEX IF NOT EXISTS idx_job_deliverables_status ON job_deliverables(job_id, status);


-- ============================================================
-- job_shooting_dates (diarias de filmagem - tabela separada
-- porque um job pode ter multiplas diarias)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_shooting_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  shooting_date DATE NOT NULL,
  description TEXT,                                -- "Dia 1 - Externa", "Dia 2 - Estudio"
  location TEXT,
  start_time TIME,
  end_time TIME,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_shooting_dates_tenant_id ON job_shooting_dates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_shooting_dates_job_id ON job_shooting_dates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_shooting_dates_date ON job_shooting_dates(tenant_id, shooting_date);


-- ============================================================
-- job_attachments (anexos do job)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,                          -- URL no Supabase Storage ou link externo
  file_size_bytes BIGINT,
  mime_type TEXT,
  category attachment_category NOT NULL DEFAULT 'outro',
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_attachments_tenant_id ON job_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id ON job_attachments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_category ON job_attachments(job_id, category);
CREATE INDEX IF NOT EXISTS idx_job_attachments_uploaded_by ON job_attachments(uploaded_by);


-- ============================================================
-- job_history (historico / audit trail)
-- Tabela APPEND-ONLY: nunca UPDATE ou DELETE
-- ============================================================

CREATE TABLE IF NOT EXISTS job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type history_event_type NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  previous_data JSONB,                             -- Estado anterior
  new_data JSONB,                                  -- Novo estado
  description TEXT NOT NULL,                       -- Descricao legivel: "Status alterado de X para Y"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Tabela append-only: sem updated_at ou deleted_at
);

CREATE INDEX IF NOT EXISTS idx_job_history_tenant_id ON job_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_history_job_id ON job_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_history_user_id ON job_history(user_id);
CREATE INDEX IF NOT EXISTS idx_job_history_event_type ON job_history(job_id, event_type);
CREATE INDEX IF NOT EXISTS idx_job_history_created_at ON job_history(job_id, created_at DESC);
```

### 2.5 Tabela auxiliar: Contadores de codigo de job

```sql
-- ============================================================
-- job_code_sequences (controle de sequencia para gerar codigos)
-- Um registro por tenant (sequencial global, nao por ano)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_code_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_code_sequences_tenant_id ON job_code_sequences(tenant_id);
```

---

## 3. RLS Policies

Todas as tabelas utilizam Row Level Security para isolamento por tenant. A claim `tenant_id` e extraida do JWT do Supabase Auth.

```sql
-- ============================================================
-- RLS Policies - Isolamento por Tenant
-- ============================================================

-- tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON tenants
  USING (id = (auth.jwt()->>'tenant_id')::uuid);

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON users
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON clients
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- agencies
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON agencies
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON contacts
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- people
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON people
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON jobs
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- job_team_members
ALTER TABLE job_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON job_team_members
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- job_deliverables
ALTER TABLE job_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON job_deliverables
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- job_shooting_dates
ALTER TABLE job_shooting_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON job_shooting_dates
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- job_attachments
ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON job_attachments
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- job_history
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON job_history
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- job_code_sequences
ALTER TABLE job_code_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON job_code_sequences
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
```

### Nota sobre policies granulares (fase futura)

As policies acima garantem isolamento por tenant. Na fase de RBAC granular, adicionaremos policies adicionais para:

- **Freelancer externo**: so ve jobs em que esta alocado (`job_team_members`)
- **Diretor**: visualiza jobs alocados + edita campos especificos
- **Financeiro**: visualiza todos + edita campos financeiros

Exemplo futuro:
```sql
-- Policy para freelancer externo (exemplo - sera implementada na fase RBAC)
CREATE POLICY "freelancer_own_jobs" ON jobs
  FOR SELECT
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND (
      auth.jwt()->>'role' != 'freelancer'
      OR id IN (
        SELECT job_id FROM job_team_members
        WHERE person_id IN (
          SELECT id FROM people WHERE user_id = auth.uid()
        )
      )
    )
  );
```

---

## 4. Triggers e Functions

### 4.1 Trigger: updated_at automatico

```sql
-- ============================================================
-- Function generica para atualizar updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas que possuem updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_shooting_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_code_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 Function: Gerar index_number e job_code

```sql
-- ============================================================
-- Function para gerar index_number sequencial e job_code
-- Formato job_code: {INDEX padded 3}_{NomeJob}_{Agencia}
-- Exemplo: 015_FilmeBBB_WMcCann
-- Atomica e segura para concorrencia (usa INSERT ON CONFLICT)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_job_index_and_code(
  p_tenant_id UUID,
  p_title TEXT,
  p_agency_name TEXT DEFAULT NULL
)
RETURNS TABLE(out_index INTEGER, out_code TEXT) AS $$
DECLARE
  v_sequence INTEGER;
  v_code TEXT;
  v_title_clean TEXT;
  v_agency_clean TEXT;
BEGIN
  -- Incrementar ou inserir o contador para este tenant
  INSERT INTO job_code_sequences (tenant_id, last_sequence)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id)
  DO UPDATE SET
    last_sequence = job_code_sequences.last_sequence + 1,
    updated_at = now()
  RETURNING last_sequence INTO v_sequence;

  -- Limpar titulo (remover espacos, caracteres especiais)
  v_title_clean := regexp_replace(p_title, '[^a-zA-Z0-9]', '', 'g');

  -- Limpar nome da agencia
  IF p_agency_name IS NOT NULL AND p_agency_name != '' THEN
    v_agency_clean := regexp_replace(p_agency_name, '[^a-zA-Z0-9]', '', 'g');
    v_code := lpad(v_sequence::TEXT, 3, '0') || '_' || v_title_clean || '_' || v_agency_clean;
  ELSE
    v_code := lpad(v_sequence::TEXT, 3, '0') || '_' || v_title_clean;
  END IF;

  out_index := v_sequence;
  out_code := v_code;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
```

### 4.3 Trigger: Auto-gerar index_number e job_code ao criar job

```sql
-- ============================================================
-- Trigger para gerar index_number e job_code automaticamente ao inserir job
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_generate_job_code()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_name TEXT;
  v_result RECORD;
BEGIN
  -- So gera se o job_code nao foi fornecido
  IF NEW.job_code IS NULL OR NEW.job_code = '' THEN
    -- Buscar nome da agencia se agency_id foi informado
    IF NEW.agency_id IS NOT NULL THEN
      SELECT name INTO v_agency_name FROM agencies WHERE id = NEW.agency_id;
    END IF;

    SELECT out_index, out_code INTO v_result
    FROM generate_job_index_and_code(NEW.tenant_id, NEW.title, v_agency_name);

    NEW.index_number := v_result.out_index;
    NEW.job_code := v_result.out_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_job_code BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION trigger_generate_job_code();
```

### 4.4 Trigger: Calcular campos financeiros automaticamente

```sql
-- ============================================================
-- Trigger para recalcular campos financeiros ao alterar valores
-- Formulas (replicando planilha Ellah):
--   tax_value = closed_value * (tax_percentage / 100)
--   gross_profit = closed_value - production_cost - tax_value
--   margin_percentage = (gross_profit / closed_value) * 100
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_job_financials()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular imposto
  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0 THEN
    NEW.tax_value := ROUND(NEW.closed_value * (NEW.tax_percentage / 100), 2);
  ELSE
    NEW.tax_value := NULL;
  END IF;

  -- Calcular lucro bruto (Valor W)
  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0 THEN
    NEW.gross_profit := ROUND(
      NEW.closed_value
      - COALESCE(NEW.production_cost, 0)
      - COALESCE(NEW.tax_value, 0),
      2
    );
  ELSE
    NEW.gross_profit := NULL;
  END IF;

  -- Calcular margem percentual
  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0
     AND NEW.gross_profit IS NOT NULL THEN
    NEW.margin_percentage := ROUND(
      (NEW.gross_profit / NEW.closed_value) * 100, 2
    );
  ELSE
    NEW.margin_percentage := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_job_financials BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION calculate_job_financials();
```

### 4.5 Trigger: Atualizar status_updated_at ao mudar status

```sql
-- ============================================================
-- Trigger para atualizar timestamp quando status muda
-- ============================================================

CREATE OR REPLACE FUNCTION update_job_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_job_status_timestamp BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_job_status_timestamp();
```

### 4.6 Trigger: Validar produtor responsavel unico

```sql
-- ============================================================
-- Function para garantir no maximo 1 produtor responsavel (is_lead_producer) por job
-- ============================================================

CREATE OR REPLACE FUNCTION validate_single_lead_producer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_lead_producer = true THEN
    -- Remover flag de outros membros do mesmo job
    UPDATE job_team_members
    SET is_lead_producer = false, updated_at = now()
    WHERE job_id = NEW.job_id
      AND id != NEW.id
      AND is_lead_producer = true
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_lead_producer
  AFTER INSERT OR UPDATE ON job_team_members
  FOR EACH ROW EXECUTE FUNCTION validate_single_lead_producer();
```

### 4.7 Trigger: Calcular Health Score automaticamente

```sql
-- ============================================================
-- Function para calcular Health Score do job (0-100 pts)
-- Regras (baseado no Apps Script existente da Ellah):
--   +15 pts: URL carta orcamento preenchido (budget_letter_url)
--   +15 pts: URL cronograma preenchido (schedule_url)
--   +15 pts: URL roteiro preenchido (script_url)
--   +15 pts: URL PPM preenchido (ppm_url)
--   +10 pts: Data entrega final definida (expected_delivery_date)
--   +10 pts: Data pagamento definida (payment_date)
--   +10 pts: Diretor definido na equipe (job_team_members role='diretor')
--   +10 pts: Produtor Executivo definido na equipe (job_team_members role='produtor_executivo')
--   Total maximo: 100 pontos
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_health_score(p_job_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_job RECORD;
  v_has_director BOOLEAN;
  v_has_pe BOOLEAN;
BEGIN
  -- Buscar dados do job
  SELECT
    budget_letter_url, schedule_url, script_url, ppm_url,
    expected_delivery_date, payment_date
  INTO v_job
  FROM jobs WHERE id = p_job_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- +15 pts por URL preenchido
  IF v_job.budget_letter_url IS NOT NULL AND v_job.budget_letter_url != '' THEN
    v_score := v_score + 15;
  END IF;
  IF v_job.schedule_url IS NOT NULL AND v_job.schedule_url != '' THEN
    v_score := v_score + 15;
  END IF;
  IF v_job.script_url IS NOT NULL AND v_job.script_url != '' THEN
    v_score := v_score + 15;
  END IF;
  IF v_job.ppm_url IS NOT NULL AND v_job.ppm_url != '' THEN
    v_score := v_score + 15;
  END IF;

  -- +10 pts por data definida
  IF v_job.expected_delivery_date IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  IF v_job.payment_date IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;

  -- +10 pts por equipe definida
  SELECT EXISTS(
    SELECT 1 FROM job_team_members
    WHERE job_id = p_job_id AND role = 'diretor' AND deleted_at IS NULL
  ) INTO v_has_director;

  SELECT EXISTS(
    SELECT 1 FROM job_team_members
    WHERE job_id = p_job_id AND role = 'produtor_executivo' AND deleted_at IS NULL
  ) INTO v_has_pe;

  IF v_has_director THEN
    v_score := v_score + 10;
  END IF;
  IF v_has_pe THEN
    v_score := v_score + 10;
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela jobs: recalcula quando URLs ou datas mudam
CREATE OR REPLACE FUNCTION trigger_recalculate_health_score_on_job()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    OLD.budget_letter_url IS DISTINCT FROM NEW.budget_letter_url OR
    OLD.schedule_url IS DISTINCT FROM NEW.schedule_url OR
    OLD.script_url IS DISTINCT FROM NEW.script_url OR
    OLD.ppm_url IS DISTINCT FROM NEW.ppm_url OR
    OLD.expected_delivery_date IS DISTINCT FROM NEW.expected_delivery_date OR
    OLD.payment_date IS DISTINCT FROM NEW.payment_date
  ) THEN
    NEW.health_score := calculate_health_score(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_health_score_on_job_update BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_health_score_on_job();

-- Trigger na tabela job_team_members: recalcula quando equipe muda
CREATE OR REPLACE FUNCTION trigger_recalculate_health_score_on_team()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id UUID;
  v_new_score INTEGER;
BEGIN
  -- Determinar job_id (NEW para INSERT/UPDATE, OLD para DELETE)
  IF TG_OP = 'DELETE' THEN
    v_job_id := OLD.job_id;
  ELSE
    v_job_id := NEW.job_id;
  END IF;

  -- So recalcular se a role e diretor ou produtor_executivo
  IF (TG_OP = 'DELETE' AND OLD.role IN ('diretor', 'produtor_executivo'))
     OR (TG_OP != 'DELETE' AND NEW.role IN ('diretor', 'produtor_executivo'))
     OR (TG_OP = 'UPDATE' AND OLD.role IN ('diretor', 'produtor_executivo'))
  THEN
    v_new_score := calculate_health_score(v_job_id);
    UPDATE jobs SET health_score = v_new_score WHERE id = v_job_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_health_score_on_team_change
  AFTER INSERT OR UPDATE OR DELETE ON job_team_members
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_health_score_on_team();
```

---

## 5. Edge Functions (API)

Todas as Edge Functions seguem o padrao:
- Autenticacao via JWT do Supabase Auth (header `Authorization: Bearer <token>`)
- `tenant_id` extraido do JWT (nunca do payload)
- Responses padronizadas: `{ data, error, meta }`
- Erros: `{ error: { code, message, details? } }`
- Content-Type: `application/json`
- Idempotencia: IDs fornecidos pelo client ou operacoes com upsert

### 5.1 CRUD de Jobs

#### POST /jobs - Criar job

```
Endpoint: POST /functions/v1/jobs
Auth: Bearer token (required)

Request Body:
{
  "title": "Campanha Verao 2026",           // required
  "client_id": "uuid",                      // required
  "job_type": "filme_publicitario",          // required
  "agency_id": "uuid",                      // optional
  "brand": "Marca X",                       // optional
  "account_email": "atendimento@email.com", // optional
  "media_type": "30s",                      // optional
  "segment": "varejo",                      // optional
  "complexity_level": "medio",              // optional
  "audio_notes": "Trilha original",         // optional
  "job_category": "Producao",               // optional
  "priority": "alta",                       // optional, default "media"
  "briefing_text": "...",                   // optional
  "expected_delivery_date": "2026-04-15",   // optional
  "closed_value": 150000.00,                // optional
  "parent_job_id": "uuid",                  // optional (se for sub-job)
  "notes": "...",                           // optional
  "tags": ["urgente", "cliente-vip"],       // optional
  "custom_fields": {}                       // optional
}

Response 201:
{
  "data": {
    "id": "uuid",
    "index_number": 42,
    "job_code": "042_CampanhaVerao2026_AgenciaX",
    "title": "Campanha Verao 2026",
    "status": "briefing_recebido",
    "health_score": 0,
    "created_at": "2026-02-13T10:00:00Z",
    ...todos os campos
  }
}

Response 400:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "client_id is required",
    "details": { "field": "client_id" }
  }
}
```

#### GET /jobs - Listar jobs (com filtros e paginacao)

```
Endpoint: GET /functions/v1/jobs
Auth: Bearer token (required)

Query Parameters:
  ?status=selecao_diretor,producao_filmagem       // filtro por status (multiplos)
  &client_id=uuid                                  // filtro por cliente
  &agency_id=uuid                                  // filtro por agencia
  &producer_id=uuid                                // filtro por produtor responsavel
  &job_type=filme_publicitario                     // filtro por tipo
  &segment=varejo                                  // filtro por segmento
  &complexity_level=alto                           // filtro por complexidade
  &priority=alta                                   // filtro por prioridade
  &is_archived=false                               // default: false
  &search=campanha                                 // busca textual (job_code, title, brand)
  &tags=urgente,cliente-vip                        // filtro por tags (AND)
  &date_from=2026-01-01                            // filtro de periodo (expected_delivery)
  &date_to=2026-06-30
  &margin_min=10                                   // filtro margem minima %
  &margin_max=50                                   // filtro margem maxima %
  &health_score_min=0                              // filtro health score minimo
  &health_score_max=100                            // filtro health score maximo
  &parent_job_id=uuid                              // listar sub-jobs de um pai
  &sort_by=expected_delivery_date                  // campo para ordenacao
  &sort_order=asc                                  // asc | desc
  &page=1                                          // paginacao
  &per_page=50                                     // default: 50, max: 200

Response 200:
{
  "data": [ ...array de jobs... ],
  "meta": {
    "total": 234,
    "page": 1,
    "per_page": 50,
    "total_pages": 5
  }
}
```

#### GET /jobs/:id - Detalhes do job

```
Endpoint: GET /functions/v1/jobs/:id
Auth: Bearer token (required)

Query Parameters:
  ?include=team,deliverables,shooting_dates,attachments,history

Response 200:
{
  "data": {
    "id": "uuid",
    "job_code": "042_CampanhaVerao2026_AgenciaX",
    ...todos os campos do job...,
    "client": { "id": "uuid", "name": "Cliente X" },
    "agency": { "id": "uuid", "name": "Agencia Y" },
    "team": [ ...membros da equipe... ],
    "deliverables": [ ...entregaveis... ],
    "shooting_dates": [ ...diarias... ],
    "attachments": [ ...anexos... ],
    "sub_jobs": [ ...sub-jobs se is_parent_job... ],
    "history": [ ...ultimos 20 eventos... ]
  }
}

Response 404:
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Job not found"
  }
}
```

#### PATCH /jobs/:id - Atualizar job

```
Endpoint: PATCH /functions/v1/jobs/:id
Auth: Bearer token (required)

Request Body (todos campos opcionais, envia apenas o que muda):
{
  "title": "Novo titulo",
  "brand": "Nova Marca",
  "media_type": "60s",
  "complexity_level": "alto",
  "priority": "alta",
  "closed_value": 200000.00,
  "expected_delivery_date": "2026-05-01",
  "budget_letter_url": "https://docs.google.com/...",
  "schedule_url": "https://docs.google.com/...",
  "notes": "Atualizado conforme reuniao",
  "tags": ["urgente"],
  "custom_fields": { "campo_extra": "valor" }
}

Response 200:
{
  "data": { ...job atualizado com health_score recalculado... }
}

Regras de negocio:
- Registra entrada em job_history para cada campo alterado
- Recalcula campos financeiros se closed_value, production_cost ou tax_percentage mudaram
- Recalcula health_score se URLs ou datas mudaram
- Nao permite alterar: id, tenant_id, index_number, job_code, created_at
```

#### DELETE /jobs/:id - Soft delete

```
Endpoint: DELETE /functions/v1/jobs/:id
Auth: Bearer token (required)

Response 200:
{
  "data": { "id": "uuid", "deleted_at": "2026-02-13T10:00:00Z" }
}

Regras:
- Soft delete (seta deleted_at)
- Nao deleta se houver sub-jobs ativos (deleted_at IS NULL)
- Registra em job_history
```

### 5.2 Gerenciar Status

#### PATCH /jobs/:id/status - Atualizar status

```
Endpoint: PATCH /functions/v1/jobs/:id/status
Auth: Bearer token (required)

Request Body:
{
  "status": "selecao_diretor",
  "sub_status": null,                           // optional
  "cancellation_reason": "Cliente desistiu"     // required se status = cancelado
}

Response 200:
{
  "data": {
    "id": "uuid",
    "status": "selecao_diretor",
    "sub_status": null,
    "status_updated_at": "2026-02-13T10:00:00Z",
    "status_updated_by": "uuid"
  }
}

Validacoes de negocio:
- "selecao_diretor" requer approval_date e closed_value preenchidos
- "entregue" requer pelo menos 1 entregavel com status "entregue"
- "cancelado" requer cancellation_reason
- "finalizado" requer actual_delivery_date preenchida
- "pausado" pode ser aplicado de qualquer status exceto "finalizado" e "cancelado"
- Status registrado em job_history com previous_data e new_data
- Notificacao via webhook para n8n quando status muda para "selecao_diretor"
```

### 5.3 Gerenciar Equipe

#### GET /jobs/:id/team - Listar equipe do job

```
Endpoint: GET /functions/v1/jobs/:id/team
Auth: Bearer token (required)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "person_id": "uuid",
      "person_name": "Joao Silva",
      "role": "diretor",
      "fee": 15000.00,
      "hiring_status": "confirmado",
      "is_lead_producer": false
    }
  ]
}
```

#### POST /jobs/:id/team - Adicionar membro

```
Endpoint: POST /functions/v1/jobs/:id/team
Auth: Bearer token (required)

Request Body:
{
  "person_id": "uuid",
  "role": "diretor",
  "fee": 15000.00,
  "hiring_status": "orcado",
  "is_lead_producer": false
}

Response 201:
{
  "data": { ...membro criado... },
  "warnings": [
    {
      "code": "SCHEDULE_CONFLICT",
      "message": "Joao Silva esta alocado em outro job na mesma data de filmagem"
    }
  ]
}

Regras:
- Verifica conflito de agenda (pessoa em outro job na mesma data de filmagem) - retorna warning, nao bloqueia
- Se is_lead_producer = true, remove flag de outros membros
- Registra em job_history (event_type: team_change)
- Recalcula health_score se role = diretor ou produtor_executivo
```

#### PATCH /jobs/:id/team/:member_id - Atualizar membro

```
Endpoint: PATCH /functions/v1/jobs/:id/team/:member_id
Auth: Bearer token (required)

Request Body:
{
  "fee": 18000.00,
  "hiring_status": "confirmado"
}

Response 200:
{
  "data": { ...membro atualizado... }
}
```

#### DELETE /jobs/:id/team/:member_id - Remover membro

```
Endpoint: DELETE /functions/v1/jobs/:id/team/:member_id
Auth: Bearer token (required)

Response 200:
{
  "data": { "id": "uuid", "deleted_at": "..." }
}

Regras:
- Soft delete
- Recalcula health_score se role = diretor ou produtor_executivo
```

### 5.4 Gerenciar Entregaveis

#### GET /jobs/:id/deliverables

```
Endpoint: GET /functions/v1/jobs/:id/deliverables
Auth: Bearer token (required)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "description": "Filme Master 30s",
      "format": "MP4",
      "resolution": "4K",
      "duration_seconds": 30,
      "status": "em_producao",
      "version": 1,
      "delivery_date": null,
      "file_url": null,
      "review_url": null
    }
  ]
}
```

#### POST /jobs/:id/deliverables

```
Endpoint: POST /functions/v1/jobs/:id/deliverables
Auth: Bearer token (required)

Request Body:
{
  "description": "Filme Master 30s",            // required
  "format": "MP4",                               // optional
  "resolution": "4K",                            // optional
  "duration_seconds": 30,                        // optional
  "status": "pendente",                          // optional, default "pendente"
  "file_url": "https://drive.google.com/...",    // optional
  "review_url": "https://frame.io/..."           // optional
}

Response 201:
{
  "data": { ...entregavel criado... }
}
```

#### PATCH /jobs/:id/deliverables/:deliverable_id

```
Endpoint: PATCH /functions/v1/jobs/:id/deliverables/:deliverable_id
Auth: Bearer token (required)

Request Body:
{
  "status": "entregue",
  "version": 2,
  "delivery_date": "2026-04-15",
  "file_url": "https://drive.google.com/final"
}
```

#### DELETE /jobs/:id/deliverables/:deliverable_id

```
Endpoint: DELETE /functions/v1/jobs/:id/deliverables/:deliverable_id
Auth: Bearer token (required)

Response 200: { "data": { "id": "uuid", "deleted_at": "..." } }
```

### 5.5 Gerenciar Datas de Filmagem

#### GET /jobs/:id/shooting-dates

```
Endpoint: GET /functions/v1/jobs/:id/shooting-dates
Auth: Bearer token (required)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "shooting_date": "2026-03-15",
      "description": "Dia 1 - Externa",
      "location": "Praia de Copacabana",
      "start_time": "06:00",
      "end_time": "18:00"
    }
  ]
}
```

#### POST /jobs/:id/shooting-dates

```
Endpoint: POST /functions/v1/jobs/:id/shooting-dates
Auth: Bearer token (required)

Request Body:
{
  "shooting_date": "2026-03-15",               // required
  "description": "Dia 1 - Externa",            // optional
  "location": "Praia de Copacabana",           // optional
  "start_time": "06:00",                       // optional
  "end_time": "18:00"                          // optional
}
```

#### PATCH /jobs/:id/shooting-dates/:date_id

```
Endpoint: PATCH /functions/v1/jobs/:id/shooting-dates/:date_id
Auth: Bearer token (required)
```

#### DELETE /jobs/:id/shooting-dates/:date_id

```
Endpoint: DELETE /functions/v1/jobs/:id/shooting-dates/:date_id
Auth: Bearer token (required)
```

### 5.6 Historico

#### GET /jobs/:id/history

```
Endpoint: GET /functions/v1/jobs/:id/history
Auth: Bearer token (required)

Query Parameters:
  ?event_type=status_change,field_update       // filtro por tipo
  &page=1
  &per_page=50

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "event_type": "status_change",
      "user_id": "uuid",
      "user_name": "Maria Silva",
      "previous_data": { "status": "aguardando_aprovacao_cliente" },
      "new_data": { "status": "selecao_diretor" },
      "description": "Status alterado de 'Aguardando Aprovacao Cliente' para 'Aprovado - Selecao de Diretor'",
      "created_at": "2026-02-13T10:00:00Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "per_page": 50, "total_pages": 1 }
}
```

### 5.7 Duplicar Job (Template)

#### POST /jobs/:id/duplicate

```
Endpoint: POST /functions/v1/jobs/:id/duplicate
Auth: Bearer token (required)

Request Body:
{
  "title": "Campanha Verao 2026 - V2",        // optional (default: titulo original + " (copia)")
  "copy_team": false,                          // optional, default false
  "copy_deliverables": false                   // optional, default false
}

Response 201:
{
  "data": {
    "id": "uuid (novo)",
    "index_number": 43,
    "job_code": "043_CampanhaVerao2026V2_AgenciaX",
    "title": "Campanha Verao 2026 - V2",
    "status": "briefing_recebido",
    ...
  }
}

Nota: Ellah NAO duplica jobs no sentido tradicional.
Sistema oferece "template de estrutura" que cria:
- Estrutura de pastas no Drive (via API)
- Planilha GG_ do zero
- Formularios de cadastro
NAO copia: Codigo, Status, Datas, Valores, Anexos
```

### 5.8 Exportacao

#### POST /jobs/export

```
Endpoint: POST /functions/v1/jobs/export
Auth: Bearer token (required)

Request Body:
{
  "format": "xlsx",                            // "xlsx" | "csv" | "pdf"
  "filters": {                                 // mesmos filtros de GET /jobs
    "status": ["selecao_diretor", "producao_filmagem"],
    "client_id": "uuid"
  },
  "columns": [                                 // colunas a incluir (optional, default: todas)
    "job_code", "title", "client", "status",
    "expected_delivery_date", "closed_value",
    "margin_percentage", "health_score"
  ]
}

Response 200:
{
  "data": {
    "download_url": "https://storage.supabase.co/...",
    "expires_at": "2026-02-13T11:00:00Z",
    "row_count": 42,
    "format": "xlsx"
  }
}

Regras:
- Gera arquivo no Supabase Storage
- URL com expiracao (1 hora)
- Cabecalho do arquivo inclui: data de geracao, filtros aplicados, tenant name
- Margem com formatacao e cores (verde/amarelo/vermelho)
- Maximo: 10.000 linhas por exportacao
```

### 5.9 Gerenciar Anexos

#### POST /jobs/:id/attachments

```
Endpoint: POST /functions/v1/jobs/:id/attachments
Auth: Bearer token (required)
Content-Type: multipart/form-data

Form Fields:
  file: <binary>                               // required, max 50MB
  category: "briefing"                         // required
  notes: "Briefing v2 atualizado"              // optional

Response 201:
{
  "data": {
    "id": "uuid",
    "file_name": "briefing-verao-2026.pdf",
    "file_url": "https://storage.supabase.co/tenants/{tenant_id}/jobs/{job_id}/briefing/...",
    "file_size_bytes": 2048576,
    "mime_type": "application/pdf",
    "category": "briefing",
    "version": 1,
    "uploaded_by": "uuid"
  }
}
```

#### GET /jobs/:id/attachments

```
Endpoint: GET /functions/v1/jobs/:id/attachments
Auth: Bearer token (required)

Query Parameters:
  ?category=briefing                           // optional

Response 200:
{
  "data": [ ...array de anexos... ]
}
```

#### DELETE /jobs/:id/attachments/:attachment_id

```
Endpoint: DELETE /functions/v1/jobs/:id/attachments/:attachment_id
Auth: Bearer token (required)
```

### 5.10 Health Score

#### POST /jobs/:id/calculate-health-score

```
Endpoint: POST /functions/v1/jobs/:id/calculate-health-score
Auth: Bearer token (required)

Response 200:
{
  "data": {
    "job_id": "uuid",
    "health_score": 75,
    "breakdown": {
      "budget_letter_url": 15,
      "schedule_url": 15,
      "script_url": 15,
      "ppm_url": 0,
      "expected_delivery_date": 10,
      "payment_date": 10,
      "director_assigned": 10,
      "pe_assigned": 0
    }
  }
}

Nota: O health_score tambem e recalculado automaticamente via triggers.
Este endpoint permite forcar recalculo e obter breakdown detalhado.
```

### 5.11 Aprovacao

#### POST /jobs/:id/approve

```
Endpoint: POST /functions/v1/jobs/:id/approve
Auth: Bearer token (required)

Request Body:
{
  "approval_type": "internal",                 // "internal" | "external"
  "approval_date": "2026-02-13",               // required
  "closed_value": 150000.00,                   // required
  "approval_document_url": "https://docs.google.com/..." // optional
}

Response 200:
{
  "data": {
    "id": "uuid",
    "status": "selecao_diretor",
    "approval_type": "internal",
    "approved_by_user_id": "uuid",
    "approval_date": "2026-02-13",
    "closed_value": 150000.00,
    "approval_document_url": "https://docs.google.com/..."
  }
}

Regras:
- Seta status para "selecao_diretor"
- Preenche approval_type, approved_by_user_id, approval_date, closed_value
- Se approval_type = "internal": Atendimento marca como aprovado (cliente aprovou por WhatsApp/ligacao)
- Se approval_type = "external": Sistema gera link de aprovacao digital (futuro: Portal do Cliente)
- Gera documento "Aprovacao Interna" automaticamente
- Dispara webhook n8n para notificar TODOS via WhatsApp
- Registra em job_history
```

### 5.12 Integracao Google Drive

#### POST /jobs/:id/create-drive-structure

```
Endpoint: POST /functions/v1/jobs/:id/create-drive-structure
Auth: Bearer token (required)

Response 200:
{
  "data": {
    "job_id": "uuid",
    "drive_folder_url": "https://drive.google.com/drive/folders/...",
    "created_folders": [
      "02_FINANCEIRO/03_GASTOS GERAIS",
      "05_CONTRATOS/02_CONTRATOEQUIPE",
      "05_CONTRATOS/03_CONTRATODEELENCO",
      "06_FORNECEDORES",
      "08_POS_PRODUCAO",
      "09_ATENDIMENTO",
      "10_VENDAS/PRODUTOR_EXECUTIVO"
    ],
    "created_documents": {
      "budget_letter_url": "https://docs.google.com/...",
      "production_sheet_url": "https://docs.google.com/spreadsheets/...",
      "schedule_url": "https://docs.google.com/spreadsheets/..."
    }
  }
}

Regras:
- Idempotente: nao duplica se ja existe (verifica drive_folder_url)
- Cria estrutura de pastas conforme padrao Ellah (secao 10 da spec)
- Gera documentos: Carta Orcamento, GG_, Cronograma, Formularios
- Atualiza URLs no job (drive_folder_url, budget_letter_url, production_sheet_url, schedule_url)
- Configura permissoes por departamento automaticamente
- Dispara webhook callback para n8n (ia.ellahfilmes.com)
- Recalcula health_score apos atualizar URLs
```

### 5.13 Gerar Carta Orcamento

#### POST /jobs/:id/generate-budget-letter

```
Endpoint: POST /functions/v1/jobs/:id/generate-budget-letter
Auth: Bearer token (required)

Response 200:
{
  "data": {
    "job_id": "uuid",
    "budget_letter_url": "https://docs.google.com/document/...",
    "template_fields": {
      "CLIENTE": "Nome do Cliente",
      "AGENCIA": "Nome da Agencia",
      "NOME_DO_JOB": "Campanha Verao 2026",
      "VALOR_TOTAL": "R$ 150.000,00"
    }
  }
}

Regras:
- Usa template Google Docs timbrado
- Preenche campos: {{CLIENTE}}, {{AGENCIA}}, {{NOME_DO_JOB}}, {{VALOR_TOTAL}}
- Salva em 10_VENDAS/PRODUTOR_EXECUTIVO/01_INICIO_DO_PROJETO/
- Atualiza budget_letter_url no job
- Recalcula health_score
- Idempotente (nao duplica se budget_letter_url ja existe)
```

### 5.14 Gerar Contrato de Elenco

#### POST /jobs/:id/generate-cast-contract

```
Endpoint: POST /functions/v1/jobs/:id/generate-cast-contract
Auth: Bearer token (required)

Request Body:
{
  "cast_member": {
    "name": "Nome Completo",
    "cpf": "123.456.789-00",
    "rg": "12.345.678-9",
    "drt": "12345",
    "email": "ator@email.com",
    "address": "Rua...",
    "performance_fee": 5000.00,
    "image_fee": 3000.00,
    "agency_fee": 1000.00
  }
}

Response 200:
{
  "data": {
    "contract_url": "https://docs.google.com/document/...",
    "pdf_url": "https://drive.google.com/.../contrato.pdf",
    "idempotency_hash": "sha256_of_job_cpf_email",
    "docuseal_ready": true
  }
}

Regras:
- Template Google Docs com ~40 campos {{placeholder}}
- Idempotente: job + CPF + email gera hash unica (nao duplica PDF)
- Gera PDF e salva em 05_CONTRATOS/03_CONTRATODEELENCO/01_CONTRATOS_EM_PDF/
- Retorna dados estruturados pro n8n (para assinatura digital via DocuSeal)
```

---

## 6. Componentes Frontend

### 6.1 Pages (Rotas)

| Rota | Componente | Descricao |
|------|-----------|-----------|
| `/jobs` | `JobsListPage` | Tabela master com filtros e busca |
| `/jobs/new` | `JobCreatePage` | Formulario de criacao de job |
| `/jobs/:id` | `JobDetailPage` | Detalhe do job com abas |
| `/jobs/:id/edit` | `JobEditPage` | Formulario de edicao (ou inline no detail) |

### 6.2 Componentes de Tabela / Lista

```
JobsListPage/
  JobsToolbar/
    SearchInput                    -- Busca textual (debounced 300ms)
    FilterPanel                    -- Painel de filtros expansivel
      StatusFilter                 -- Multi-select de 14 status
      ClientFilter                 -- Combobox com busca
      ProducerFilter               -- Combobox com busca
      TypeFilter                   -- Select de tipo de projeto
      ComplexityFilter             -- Select de complexidade (baixo, medio, alto)
      PriorityFilter               -- Select de prioridade
      DateRangeFilter              -- Date range picker
      MarginFilter                 -- Range slider min/max
      HealthScoreFilter            -- Range slider 0-100
      TagFilter                    -- Multi-select de tags
    SavedFiltersDropdown           -- Filtros salvos pelo usuario
    ExportButton                   -- Dropdown: XLSX, CSV, PDF
    NewJobButton                   -- Botao "Novo Job"
  JobsTable/
    JobsTableHeader                -- Colunas com sort
    JobsTableRow                   -- Linha do job com:
      StatusBadge                  -- Badge colorido por status (14 status)
      MarginIndicator              -- Indicador verde/amarelo/vermelho com % e cor
      HealthScoreBadge             -- Indicador visual 0-100 (novo)
      PriorityBadge                -- Badge de prioridade
      ClientName                   -- Nome do cliente (link)
      ProducerAvatar               -- Avatar do produtor responsavel
      DeliveryDateCell             -- Data com indicador de atraso
      ActionsMenu                  -- Menu: Editar, Duplicar, Arquivar, Cancelar
    SubJobsExpandable              -- Linha expansivel para sub-jobs
  JobsPagination                   -- Paginacao (ou infinite scroll)
  EmptyState                       -- Estado vazio com CTA
```

### 6.3 Formularios

```
JobForm/ (usado em Create e Edit)
  -- Secao: Identificacao
  TitleInput                       -- Campo titulo (required)
  ClientCombobox                   -- Busca + selecao de cliente (required)
    CreateClientInline             -- Modal rapido para criar cliente
  AgencyCombobox                   -- Busca + selecao de agencia
  BrandInput                       -- Campo marca
  AccountEmailInput                -- Email do atendimento (novo)

  -- Secao: Classificacao
  JobTypeSelect                    -- Select de tipo de projeto (required)
  MediaTypeInput                   -- Campo tipo de midia (novo)
  SegmentSelect                    -- Select de segmento
  ComplexityLevelSelect            -- Select baixo/medio/alto (novo)
  AudioNotesInput                  -- Campo informacoes de audio (novo)
  JobCategoryInput                 -- Campo categoria customizavel (novo)
  TagsInput                        -- Input de tags com autocomplete

  -- Secao: Datas
  BriefingDatePicker               -- Date picker
  ExpectedDeliveryDatePicker
  PaymentDatePicker                -- Data de pagamento (novo)
  ClientApprovalDeadlinePicker

  -- Secao: Financeiro (modelo Ellah)
  ClosedValueInput                 -- Valor Fechado (R$) (novo nome)
  ProductionCostInput              -- Valor Producao (R$) (novo nome)
  TaxPercentageInput               -- % Imposto (default 12%) (novo)
  TaxValueDisplay                  -- Valor Imposto (read-only, auto-calculado)
  GrossProfitDisplay               -- Valor W (read-only, auto-calculado)
  MarginIndicator                  -- Margem % com cor verde/amarelo/vermelho
  PaymentTermsInput                -- Textarea

  -- Secao: URLs Google Drive (novo)
  DriveUrlsPanel/
    DriveFolderUrlInput            -- URL pasta raiz
    BudgetLetterUrlInput           -- URL Carta Orcamento
    ScheduleUrlInput               -- URL Cronograma
    ScriptUrlInput                 -- URL Roteiro
    PpmUrlInput                    -- URL PPM
    ProductionSheetUrlInput        -- URL Planilha GG_
    ContractsFolderUrlInput        -- URL Pasta Contratos

  -- Secao: Briefing
  BriefingTextEditor               -- Rich text editor (markdown)
  NotesEditor                      -- Textarea
  InternalNotesEditor              -- Textarea (notas internas)

  -- Secao: Contatos e Aprovacao
  ClientContactSelect              -- Select de contatos do cliente
  AgencyContactSelect              -- Select de contatos da agencia
  PONumberInput                    -- Campo PO

  -- Secao: Hierarquia (condicional)
  ParentJobSelect                  -- Combobox para selecionar job pai

  -- Secao: Campos Customizaveis (novo)
  CustomFieldsEditor               -- Editor JSONB para campos extras
```

### 6.4 Detalhe do Job (com abas)

```
JobDetailPage/
  JobDetailHeader/
    JobCode                        -- "042_CampanhaVerao2026_AgenciaX"
    JobTitle                       -- Titulo editavel inline
    StatusBadge                    -- Badge do status atual (14 status)
    SubStatusBadge                 -- Badge do sub-status (novo)
    StatusDropdown                 -- Trocar status (com validacoes)
    HealthScoreBadge               -- Indicador visual 0-100 (novo)
    PriorityBadge                  -- Badge editavel
    ActionsMenu                    -- Duplicar, Arquivar, Cancelar, Excluir

  JobDetailTabs/
    -- Tab: Visao Geral
    OverviewTab/
      JobInfoCard                  -- Dados basicos (cliente, agencia, tipo, midia, complexidade)
      DatesTimeline                -- Timeline visual de datas
      FinancialSummaryCard         -- Fechado, Producao, Imposto, W, Margem (com cores)
      MarginIndicator              -- Verde >= 30%, Amarelo 15-29%, Vermelho < 15% (novo)
      HealthScoreCard              -- Score com breakdown detalhado (novo)
      DriveIntegrationPanel        -- Links para pastas/docs Google Drive (novo)
      SubJobsList                  -- Lista de sub-jobs (se is_parent_job)

    -- Tab: Equipe
    TeamTab/
      TeamMembersList              -- Lista de membros
      AddTeamMemberDialog          -- Modal para adicionar
      TeamMemberCard               -- Card com: nome, funcao, cache, status
      LeadProducerBadge            -- Destaque para produtor responsavel
      ScheduleConflictWarning      -- Alerta de conflito de agenda

    -- Tab: Entregaveis
    DeliverablesTab/
      DeliverablesList             -- Lista com checklist visual
      AddDeliverableDialog         -- Modal para adicionar
      DeliverableCard              -- Card com: descricao, formato, status, versao
      DeliveryProgress             -- Barra de progresso (X de Y entregues)

    -- Tab: Filmagem
    ShootingTab/
      ShootingDatesList            -- Lista de diarias
      AddShootingDateDialog        -- Modal para adicionar
      ShootingDateCard             -- Card com: data, descricao, locacao, horarios

    -- Tab: Anexos
    AttachmentsTab/
      AttachmentsList              -- Grid de anexos por categoria
      UploadDropzone               -- Drag & drop upload
      AttachmentCard               -- Card com: nome, tamanho, tipo, preview

    -- Tab: Aprovacao (novo)
    ApprovalTab/
      ApprovalFlow                 -- Dois caminhos: interno e externo (novo)
      ApprovalInternalForm         -- Formulario para aprovacao interna
      ApprovalExternalLink         -- Gerar link de aprovacao externa (futuro)
      ApprovalDocumentLink         -- Link para documento de Aprovacao Interna

    -- Tab: Historico
    HistoryTab/
      HistoryTimeline              -- Timeline cronologica reversa
      HistoryEventCard             -- Card com: tipo, usuario, data, descricao
      HistoryFilterBar             -- Filtro por tipo de evento

    -- Tab: Financeiro (resumo - link para modulo completo)
    FinancialTab/
      FinancialSummaryEllah        -- Fechado, Producao, Imposto, W, Liquido, Margem
      MarginGauge                  -- Gauge de margem com cores (verde/amarelo/vermelho)
      ExpensesList                 -- Lista de despesas vinculadas (do modulo financeiro)
      ContractsList                -- Lista de contratos vinculados
```

### 6.5 Componentes Compartilhados

```
shared/
  StatusBadge                      -- Badge colorido por status do job (14 status)
  SubStatusBadge                   -- Badge de sub-status (novo)
  PriorityBadge                    -- Badge de prioridade
  MarginIndicator                  -- Indicador verde/amarelo/vermelho de margem com % e cor (atualizado)
  HealthScoreBadge                 -- Indicador visual 0-100 com barra de progresso (novo)
  ApprovalFlow                     -- Componente de fluxo de aprovacao interno/externo (novo)
  DriveIntegrationPanel            -- Links para pastas/docs do Google Drive (novo)
  CurrencyInput                    -- Input formatado para BRL
  DatePickerWithStatus             -- Date picker que mostra "No Prazo" / "Atrasado"
  PersonCombobox                   -- Combobox reutilizavel para selecionar pessoas
  TagsInput                        -- Input de tags com autocomplete e criacao
  ConfirmDialog                    -- Dialog de confirmacao para acoes destrutivas
  EmptyState                       -- Estado vazio reutilizavel
```

---

## 7. Ordem de Implementacao

### Fase 1: Schema + Migrations + RLS
**Estimativa:** 2-3 dias
**Responsavel:** Backend

Tarefas:
1. Criar migration `001_create_enums.sql` com todos os ENUMs (incluindo complexity_level e approval_type)
2. Criar migration `002_create_support_tables.sql` com tabelas de suporte (tenants, users, clients, agencies, contacts, people)
3. Criar migration `003_create_jobs_table.sql` com tabela principal (incluindo campos financeiros Ellah, health_score, URLs Drive, aprovacao, custom_fields)
4. Criar migration `004_create_jobs_related_tables.sql` com tabelas relacionadas (job_team_members, job_deliverables, job_shooting_dates, job_attachments, job_history, job_code_sequences)
5. Criar migration `005_create_rls_policies.sql` com todas as policies RLS
6. Criar migration `006_create_triggers.sql` com todos os triggers e functions (incluindo calculate_job_financials, calculate_health_score, trigger equipe->health_score)
7. Criar migration `007_create_indexes.sql` com indices adicionais
8. Seed data para testes (tenant de dev, usuario admin, clientes/agencias de exemplo)

Criterio de aceite:
- Todas as migrations rodam sem erro em banco limpo
- Migrations sao idempotentes (podem rodar 2x)
- RLS impede acesso cross-tenant (testado)
- Trigger de job_code gera formato correto: {INDEX}_{NomeJob}_{Agencia}
- Trigger financeiro calcula tax_value, gross_profit, margin_percentage corretamente
- Trigger de health_score calcula 0-100 corretamente (testado com URLs e equipe)

### Fase 2: Edge Functions - CRUD Basico
**Estimativa:** 3-4 dias
**Responsavel:** Backend

Tarefas:
1. Edge Function `jobs/index.ts` - POST (criar) e GET (listar com filtros)
2. Edge Function `jobs/[id].ts` - GET (detalhe), PATCH (atualizar), DELETE (soft delete)
3. Edge Function `jobs/[id]/status.ts` - PATCH (atualizar status com validacoes para 14 status)
4. Edge Function `jobs/[id]/team.ts` - CRUD de equipe
5. Edge Function `jobs/[id]/deliverables.ts` - CRUD de entregaveis
6. Edge Function `jobs/[id]/shooting-dates.ts` - CRUD de datas de filmagem
7. Edge Function `jobs/[id]/history.ts` - GET (listar historico)
8. Testes de integracao para cada endpoint

Criterio de aceite:
- Todos os endpoints respondem conforme contrato definido na secao 5
- Validacoes de negocio implementadas (status transitions com 14 status, campos obrigatorios)
- job_history registra toda operacao
- health_score recalculado ao adicionar/remover equipe ou atualizar URLs
- Campos financeiros auto-calculados
- Idempotencia verificada
- Performance: <200ms para operacoes simples

### Fase 3: Frontend - Listagem e Criacao
**Estimativa:** 4-5 dias
**Responsavel:** Frontend

Tarefas:
1. Page `/jobs` com JobsTable (colunas: Index, Job Code, Title, Client, Status, Producer, Delivery Date, Margin, Health Score)
2. SearchInput com debounce
3. FilterPanel com filtros de Status (14), Client, Producer, Type, Complexity, Health Score
4. Paginacao
5. Page `/jobs/new` com JobForm (campos obrigatorios + opcionais basicos + modelo financeiro Ellah)
6. StatusBadge (14 status), PriorityBadge, MarginIndicator, HealthScoreBadge como componentes compartilhados
7. Empty state para lista vazia
8. Loading states e error handling

Criterio de aceite:
- Tabela carrega em <1s para 500 jobs
- Filtros funcionam corretamente (14 status)
- Criacao de job funciona end-to-end com campos financeiros Ellah
- Health Score visivel na tabela
- Margem com cores (verde >= 30%, amarelo 15-29%, vermelho < 15%)
- Responsivo (desktop e tablet)
- Codigo TypeScript strict, sem any

### Fase 4: Frontend - Detalhes e Edicao
**Estimativa:** 5-6 dias
**Responsavel:** Frontend

Tarefas:
1. Page `/jobs/:id` com layout de abas
2. Tab Visao Geral (info basica, datas, financeiro Ellah, health score, drive links)
3. Tab Equipe (CRUD de membros, produtor responsavel)
4. Tab Entregaveis (CRUD, checklist visual, progress bar, versoes)
5. Tab Filmagem (CRUD de diarias)
6. Tab Aprovacao (ApprovalFlow com interno/externo)
7. Tab Historico (timeline, filtro por tipo)
8. Atualizacao de status com validacoes visuais (14 status + sub-status)
9. DriveIntegrationPanel com links para pastas/docs
10. Edicao inline de campos
11. Real-time updates via Supabase Realtime

Criterio de aceite:
- Todas as abas funcionais
- Validacoes de status visualmente claras (14 status)
- Sub-status editavel na Pos-Producao (Edicao, Cor, VFX, Finalizacao)
- Health Score com breakdown detalhado
- Margem com cores conforme regra do CEO
- DriveIntegrationPanel com links clicaveis
- ApprovalFlow com dois caminhos
- Real-time: mudanca em uma aba reflete para outros usuarios
- Performance <500ms para carregar detalhes
- Navegacao por teclado (Tab, Enter, Esc)

### Fase 5: Features Avancadas
**Estimativa:** 5-7 dias
**Responsavel:** Full-stack

Tarefas:
1. Sub-jobs (criar sub-job, hierarquia expansivel ate 2 niveis, soma de orcamento)
2. Duplicar job como template (endpoint + UI)
3. Anexos (upload, categorias, versionamento, preview)
4. Exportacao (XLSX, CSV, PDF com margem colorida)
5. Filtros salvos (favoritos por usuario)
6. Busca full-text com ranking
7. Visao de carga de trabalho (agrupamento por produtor/diretor)
8. Endpoint POST /jobs/:id/approve com fluxo interno/externo
9. Endpoint POST /jobs/:id/calculate-health-score com breakdown

Criterio de aceite:
- Sub-jobs com 2 niveis de profundidade funcional
- Template cria estrutura sem copiar dados financeiros/datas
- Upload funciona ate 50MB
- Export XLSX com margens coloridas
- Aprovacao interna e externa funcionais
- Health Score com breakdown detalhado
- Busca full-text com performance <500ms

### Fase 6: Integracoes e Polish
**Estimativa:** Depende dos modulos
**Pre-requisitos:** Modulos Financeiro e Contratos

Tarefas:
1. Integracao Google Drive: POST /jobs/:id/create-drive-structure
2. Geracao Carta Orcamento: POST /jobs/:id/generate-budget-letter
3. Geracao Contrato Elenco: POST /jobs/:id/generate-cast-contract
4. Tab Financeiro (vincular despesas, production_cost auto-calculado da planilha GG_)
5. Tab Contratos (vincular contratos ao job, assinatura DocuSeal)
6. Notificacoes WhatsApp (via Evolution API + n8n)
7. Notificacoes in-app
8. Calendario de filmagens
9. Dashboard de metricas (jobs por status, margem media, health score medio)
10. Mobile optimization (tabela vira cards) - PWA
11. RBAC granular (policies por role)

---

## 8. Decisoes Tecnicas

### 8.1 Por que tabelas separadas para equipe, entregaveis e filmagem?

Arrays JSONB seriam mais simples, mas tabelas separadas permitem:
- RLS individual
- Queries e filtros eficientes (ex: "todos jobs do Diretor X")
- Foreign keys reais para integridade
- Indices para performance
- Historico granular
- Health Score: trigger na tabela job_team_members recalcula score quando diretor ou PE muda

### 8.2 Por que job_code gerado no banco (trigger) e nao na Edge Function?

- Atomicidade: INSERT + geracao de codigo na mesma transacao
- Seguranca contra race conditions (usa INSERT ON CONFLICT com lock implicito)
- Idempotencia: trigger so gera se job_code IS NULL
- Formato Ellah preservado: {INDEX}_{NomeJob}_{Agencia}

### 8.3 Por que soft delete em vez de exclusao fisica?

- Requisito de negocio: historico preservado por 5 anos (decisao CEO)
- Conformidade: dados financeiros nao podem ser apagados
- Cancelamento: custos NUNCA sao zerados (decisao CEO)
- Recuperacao: jobs cancelados podem ser reativados
- Auditoria: rastreabilidade completa
- Queries: `WHERE deleted_at IS NULL` em todos os endpoints

### 8.4 Por que ENUMs no PostgreSQL em vez de tabelas de lookup?

- Performance superior (armazenamento compacto)
- Validacao no nivel do banco (impossivel inserir valor invalido)
- Type-safety no TypeScript (mapeamento direto)
- Simplicidade (sem JOINs adicionais)
- Tradeoff: alterar enum requer migration (aceitavel para status fixos)
- Nota: produtoras podem customizar status via tenant settings (JSONB), nao via enum

### 8.5 Por que full-text search nativo em vez de servico externo?

- Complexidade: volume esperado (<10k jobs por tenant, 4-20 simultaneos) nao justifica Elasticsearch
- Performance: indice GIN com to_tsvector atende <500ms
- Custo: zero adicional
- Evolucao: se necessario, migrar para busca externa no futuro

### 8.6 Por que modelo financeiro com campos separados em vez de JSONB?

- Formulas Ellah preservadas: tax = closed * tax%/100, gross = closed - production - tax
- Trigger calcula automaticamente ao INSERT/UPDATE
- Indices nativos para filtros por margem
- Validacao de tipos no banco (NUMERIC, nao string)
- Cores de margem sao regra de apresentacao, nao de dados (Verde >= 30%, Amarelo 15-29%, Vermelho < 15%)

### 8.7 Por que Health Score calculado via trigger e nao apenas via API?

- Consistencia: score sempre atualizado, impossivel ficar desatualizado
- Performance: evita N+1 queries ao listar jobs
- Trigger duplo: na tabela jobs (URLs e datas) e na tabela job_team_members (equipe)
- Endpoint POST /calculate-health-score existe para forcar recalculo e obter breakdown

### 8.8 Por que sub_status como TEXT e nao como ENUM?

- Flexibilidade: sub-status sao livres e variam por contexto (Pos-Producao: Edicao, Cor, VFX, Finalizacao)
- Customizacao: cada produtora pode ter seus proprios sub-status
- Baixo risco: sub-status e informativo, nao controla fluxo de negocio
- Validacao: feita na Edge Function, nao no banco

---

## 9. Tipos TypeScript

```typescript
// ============================================================
// Tipos TypeScript para o modulo Jobs
// Alinhado com spec refinada (respostas CEO)
// ============================================================

// ENUMs
export type JobStatus =
  | 'briefing_recebido'
  | 'orcamento_em_elaboracao'
  | 'orcamento_enviado'
  | 'aguardando_aprovacao_cliente'
  | 'selecao_diretor'
  | 'cronograma_planejamento'
  | 'pre_producao_em_andamento'
  | 'producao_filmagem'
  | 'pos_producao'
  | 'aguardando_aprovacao_final'
  | 'entregue'
  | 'finalizado'
  | 'cancelado'
  | 'pausado';

export type JobType =
  | 'filme_publicitario'
  | 'branded_content'
  | 'videoclipe'
  | 'documentario'
  | 'conteudo_digital'
  | 'evento'
  | 'institucional'
  | 'motion_graphics'
  | 'fotografia'
  | 'outro';

export type JobPriority = 'alta' | 'media' | 'baixa';

export type SegmentType =
  | 'automotivo'
  | 'varejo'
  | 'fintech'
  | 'alimentos'
  | 'moda'
  | 'tech'
  | 'saude'
  | 'educacao'
  | 'entretenimento'
  | 'outro';

export type ComplexityLevel = 'baixo' | 'medio' | 'alto';

export type ApprovalType = 'internal' | 'external';

export type TeamRole =
  | 'diretor'
  | 'produtor_executivo'
  | 'coordenador_producao'
  | 'diretor_fotografia'
  | 'assistente_direcao'
  | 'editor'
  | 'colorista'
  | 'sound_designer'
  | 'motion_designer'
  | 'produtor_casting'
  | 'produtor_locacao'
  | 'diretor_arte'
  | 'figurinista'
  | 'maquiador'
  | 'atendimento'
  | 'freelancer'
  | 'outro';

export type HiringStatus =
  | 'orcado'
  | 'proposta_enviada'
  | 'confirmado'
  | 'cancelado';

export type DeliverableStatus =
  | 'pendente'
  | 'em_producao'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'entregue';

export type HistoryEventType =
  | 'status_change'
  | 'field_update'
  | 'team_change'
  | 'deliverable_change'
  | 'comment'
  | 'file_upload'
  | 'created'
  | 'duplicated'
  | 'archived'
  | 'restored';

export type AttachmentCategory =
  | 'briefing'
  | 'contrato'
  | 'referencias'
  | 'aprovacoes'
  | 'entregaveis'
  | 'outro';

// Cores de margem (regra CEO)
export type MarginColor = 'green' | 'yellow' | 'red';

export function getMarginColor(marginPercent: number | null): MarginColor | null {
  if (marginPercent === null || marginPercent === undefined) return null;
  if (marginPercent >= 30) return 'green';
  if (marginPercent >= 15) return 'yellow';
  return 'red';
}

// Entidades
export interface Job {
  id: string;
  tenant_id: string;
  index_number: number;
  job_code: string;
  title: string;
  client_id: string;
  agency_id: string | null;
  brand: string | null;
  account_email: string | null;

  // Classificacao
  job_type: JobType;
  media_type: string | null;
  segment: SegmentType | null;
  complexity_level: ComplexityLevel | null;
  audio_notes: string | null;
  job_category: string | null;
  tags: string[];

  // Status
  status: JobStatus;
  sub_status: string | null;
  status_updated_at: string;
  status_updated_by: string | null;
  priority: JobPriority;
  is_archived: boolean;
  cancellation_reason: string | null;

  // Hierarquia
  parent_job_id: string | null;
  is_parent_job: boolean;
  display_order: number;

  // Datas
  briefing_date: string | null;
  budget_sent_date: string | null;
  client_approval_deadline: string | null;
  approval_date: string | null;
  ppm_date: string | null;
  post_start_date: string | null;
  post_deadline_date: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  payment_date: string | null;

  // Financeiro (modelo Ellah)
  closed_value: number | null;
  production_cost: number | null;
  tax_percentage: number;
  tax_value: number | null;
  gross_profit: number | null;
  net_profit: number | null;
  margin_percentage: number | null;
  currency: string;
  payment_terms: string | null;
  po_number: string | null;

  // Health Score
  health_score: number;

  // URLs Google Drive
  drive_folder_url: string | null;
  budget_letter_url: string | null;
  schedule_url: string | null;
  script_url: string | null;
  ppm_url: string | null;
  production_sheet_url: string | null;
  contracts_folder_url: string | null;

  // Briefing e Observacoes
  briefing_text: string | null;
  notes: string | null;
  internal_notes: string | null;

  // Relacionamentos e Aprovacao
  primary_client_contact_id: string | null;
  primary_agency_contact_id: string | null;
  approval_type: ApprovalType | null;
  approved_by_user_id: string | null;
  approval_document_url: string | null;

  // Campos Customizaveis
  custom_fields: Record<string, unknown>;

  // Auditoria
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface JobWithRelations extends Job {
  client?: { id: string; name: string };
  agency?: { id: string; name: string } | null;
  team?: JobTeamMember[];
  deliverables?: JobDeliverable[];
  shooting_dates?: JobShootingDate[];
  attachments?: JobAttachment[];
  sub_jobs?: Job[];
  history?: JobHistoryEntry[];
}

export interface JobTeamMember {
  id: string;
  tenant_id: string;
  job_id: string;
  person_id: string;
  role: TeamRole;
  fee: number | null;
  hiring_status: HiringStatus;
  is_lead_producer: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  person_name?: string;
  person_email?: string;
  person_phone?: string;
}

export interface JobDeliverable {
  id: string;
  tenant_id: string;
  job_id: string;
  description: string;
  format: string | null;
  resolution: string | null;
  duration_seconds: number | null;
  status: DeliverableStatus;
  version: number;
  delivery_date: string | null;
  file_url: string | null;
  review_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface JobShootingDate {
  id: string;
  tenant_id: string;
  job_id: string;
  shooting_date: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface JobAttachment {
  id: string;
  tenant_id: string;
  job_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  category: AttachmentCategory;
  version: number;
  uploaded_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface JobHistoryEntry {
  id: string;
  tenant_id: string;
  job_id: string;
  event_type: HistoryEventType;
  user_id: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  description: string;
  created_at: string;
  // Joined fields
  user_name?: string;
}

// Health Score Breakdown
export interface HealthScoreBreakdown {
  budget_letter_url: number;    // 0 ou 15
  schedule_url: number;         // 0 ou 15
  script_url: number;           // 0 ou 15
  ppm_url: number;              // 0 ou 15
  expected_delivery_date: number; // 0 ou 10
  payment_date: number;         // 0 ou 10
  director_assigned: number;    // 0 ou 10
  pe_assigned: number;          // 0 ou 10
  total: number;                // 0-100
}

// Request/Response types
export interface CreateJobRequest {
  title: string;
  client_id: string;
  job_type: JobType;
  agency_id?: string;
  brand?: string;
  account_email?: string;
  media_type?: string;
  segment?: SegmentType;
  complexity_level?: ComplexityLevel;
  audio_notes?: string;
  job_category?: string;
  priority?: JobPriority;
  briefing_text?: string;
  expected_delivery_date?: string;
  payment_date?: string;
  closed_value?: number;
  parent_job_id?: string;
  notes?: string;
  tags?: string[];
  primary_client_contact_id?: string;
  primary_agency_contact_id?: string;
  po_number?: string;
  custom_fields?: Record<string, unknown>;
}

export interface UpdateJobRequest {
  title?: string;
  client_id?: string;
  agency_id?: string | null;
  brand?: string | null;
  account_email?: string | null;
  job_type?: JobType;
  media_type?: string | null;
  segment?: SegmentType | null;
  complexity_level?: ComplexityLevel | null;
  audio_notes?: string | null;
  job_category?: string | null;
  tags?: string[];
  sub_status?: string | null;
  priority?: JobPriority;
  briefing_date?: string | null;
  budget_sent_date?: string | null;
  client_approval_deadline?: string | null;
  approval_date?: string | null;
  ppm_date?: string | null;
  post_start_date?: string | null;
  post_deadline_date?: string | null;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  payment_date?: string | null;
  closed_value?: number | null;
  production_cost?: number | null;
  tax_percentage?: number;
  net_profit?: number | null;
  currency?: string;
  payment_terms?: string | null;
  po_number?: string | null;
  drive_folder_url?: string | null;
  budget_letter_url?: string | null;
  schedule_url?: string | null;
  script_url?: string | null;
  ppm_url?: string | null;
  production_sheet_url?: string | null;
  contracts_folder_url?: string | null;
  briefing_text?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  primary_client_contact_id?: string | null;
  primary_agency_contact_id?: string | null;
  custom_fields?: Record<string, unknown>;
}

export interface UpdateJobStatusRequest {
  status: JobStatus;
  sub_status?: string | null;
  cancellation_reason?: string;
}

export interface ApproveJobRequest {
  approval_type: ApprovalType;
  approval_date: string;
  closed_value: number;
  approval_document_url?: string;
}

export interface DuplicateJobRequest {
  title?: string;
  copy_team?: boolean;
  copy_deliverables?: boolean;
}

export interface GenerateCastContractRequest {
  cast_member: {
    name: string;
    cpf: string;
    rg: string;
    drt?: string;
    email: string;
    address: string;
    performance_fee: number;
    image_fee: number;
    agency_fee?: number;
  };
}

export interface JobsListFilters {
  status?: JobStatus[];
  client_id?: string;
  agency_id?: string;
  producer_id?: string;
  job_type?: JobType;
  segment?: SegmentType;
  complexity_level?: ComplexityLevel;
  priority?: JobPriority;
  is_archived?: boolean;
  search?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  margin_min?: number;
  margin_max?: number;
  health_score_min?: number;
  health_score_max?: number;
  parent_job_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface ExportJobsRequest {
  format: 'xlsx' | 'csv' | 'pdf';
  filters?: JobsListFilters;
  columns?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

---

## 10. Mapa de Status e Transicoes Validas (14 status)

```
briefing_recebido
  -> orcamento_em_elaboracao
  -> cancelado
  -> pausado

orcamento_em_elaboracao
  -> orcamento_enviado
  -> cancelado
  -> pausado

orcamento_enviado
  -> aguardando_aprovacao_cliente
  -> orcamento_em_elaboracao (revisao)
  -> cancelado
  -> pausado

aguardando_aprovacao_cliente
  -> selecao_diretor (requer: approval_date, closed_value)
  -> orcamento_em_elaboracao (revisao)
  -> cancelado
  -> pausado

selecao_diretor
  -> cronograma_planejamento
  -> cancelado
  -> pausado

cronograma_planejamento
  -> pre_producao_em_andamento
  -> cancelado
  -> pausado

pre_producao_em_andamento
  -> producao_filmagem
  -> cancelado
  -> pausado

producao_filmagem
  -> pos_producao
  -> cancelado
  -> pausado

pos_producao (sub_status: Edicao, Cor, Finalizacao, VFX)
  -> aguardando_aprovacao_final
  -> cancelado
  -> pausado

aguardando_aprovacao_final
  -> entregue (requer: >= 1 entregavel com status "entregue")
  -> pos_producao (revisao)
  -> cancelado
  -> pausado

entregue
  -> finalizado (requer: actual_delivery_date)
  -> cancelado

finalizado
  (estado terminal - sem transicoes, mas pode ser editado para ajustar custo real)

cancelado
  -> briefing_recebido (reativacao)

pausado
  -> (retorna ao status anterior, armazenado em job_history)
```

### Notificacoes por transicao de status

| Transicao | Notificacao | Destinatarios |
|-----------|-------------|---------------|
| -> selecao_diretor | WhatsApp + in-app | TODOS (Diretor, PE, Coordenador, Atendimento, Financeiro) |
| -> producao_filmagem | in-app | PE, Coordenador, Diretor |
| -> entregue | in-app | PE, Atendimento, Cliente (futuro) |
| -> cancelado | WhatsApp + in-app | PE, Coordenador |
| margin < 15% | WhatsApp + in-app (CRITICO) | PE, Financeiro |
| margin < 30% | in-app | PE, Financeiro |
| conflito agenda diretor | WhatsApp + in-app | PE, Coordenador, Diretor |

---

## Anexo A: Estrutura de Pastas (Frontend)

```
src/
  app/
    (dashboard)/
      jobs/
        page.tsx                     -- JobsListPage
        new/
          page.tsx                   -- JobCreatePage
        [id]/
          page.tsx                   -- JobDetailPage
          edit/
            page.tsx                 -- JobEditPage
  components/
    jobs/
      jobs-table.tsx
      jobs-toolbar.tsx
      jobs-filters.tsx
      job-form.tsx
      job-detail-header.tsx
      job-detail-tabs.tsx
      job-overview-tab.tsx
      job-team-tab.tsx
      job-deliverables-tab.tsx
      job-shooting-tab.tsx
      job-attachments-tab.tsx
      job-approval-tab.tsx           -- (novo)
      job-history-tab.tsx
      job-financial-tab.tsx
    shared/
      status-badge.tsx
      sub-status-badge.tsx           -- (novo)
      priority-badge.tsx
      margin-indicator.tsx
      health-score-badge.tsx         -- (novo)
      approval-flow.tsx              -- (novo)
      drive-integration-panel.tsx    -- (novo)
      currency-input.tsx
      date-picker-with-status.tsx
      person-combobox.tsx
      tags-input.tsx
      confirm-dialog.tsx
      empty-state.tsx
  lib/
    api/
      jobs.ts                        -- API client para jobs
      job-team.ts                    -- API client para equipe
      job-deliverables.ts            -- API client para entregaveis
      job-shooting-dates.ts          -- API client para datas de filmagem
      job-attachments.ts             -- API client para anexos
      job-history.ts                 -- API client para historico
      job-approval.ts                -- API client para aprovacao (novo)
      job-drive.ts                   -- API client para integracao Drive (novo)
      job-health-score.ts            -- API client para health score (novo)
    hooks/
      use-jobs.ts                    -- React Query hooks para jobs
      use-job-detail.ts              -- Hook para detalhe do job
      use-job-team.ts                -- Hook para equipe
      use-job-deliverables.ts        -- Hook para entregaveis
      use-job-filters.ts             -- Hook para filtros
      use-job-realtime.ts            -- Hook para Supabase Realtime
      use-job-health-score.ts        -- Hook para health score (novo)
      use-job-approval.ts            -- Hook para aprovacao (novo)
    types/
      jobs.ts                        -- Tipos TypeScript (do item 9)
    utils/
      job-status.ts                  -- Labels, cores, transicoes validas (14 status)
      job-margins.ts                 -- Calculo de margens e cores (verde/amarelo/vermelho)
      job-health-score.ts            -- Breakdown e formatacao do health score (novo)
      job-code.ts                    -- Formatacao de codigo ({INDEX}_{Nome}_{Agencia})
```

## Anexo B: Estrutura de Pastas (Edge Functions)

```
supabase/
  functions/
    jobs/
      index.ts                       -- POST (criar), GET (listar)
    jobs-detail/
      index.ts                       -- GET/:id, PATCH/:id, DELETE/:id
    jobs-status/
      index.ts                       -- PATCH (atualizar status + sub_status)
    jobs-team/
      index.ts                       -- CRUD de equipe
    jobs-deliverables/
      index.ts                       -- CRUD de entregaveis
    jobs-shooting-dates/
      index.ts                       -- CRUD de datas de filmagem
    jobs-attachments/
      index.ts                       -- CRUD de anexos
    jobs-history/
      index.ts                       -- GET (listar historico)
    jobs-duplicate/
      index.ts                       -- POST (duplicar job como template)
    jobs-export/
      index.ts                       -- POST (exportar)
    jobs-health-score/
      index.ts                       -- POST (calcular health score com breakdown) (novo)
    jobs-approve/
      index.ts                       -- POST (aprovar job interno/externo) (novo)
    jobs-drive-structure/
      index.ts                       -- POST (criar estrutura Google Drive) (novo)
    jobs-budget-letter/
      index.ts                       -- POST (gerar Carta Orcamento) (novo)
    jobs-cast-contract/
      index.ts                       -- POST (gerar contrato de elenco) (novo)
    _shared/
      cors.ts                        -- CORS headers
      auth.ts                        -- Extrair tenant_id e user_id do JWT
      response.ts                    -- Helpers de response padronizada
      validation.ts                  -- Validacao de payload (Zod)
      supabase-client.ts             -- Client Supabase com service role
  migrations/
    001_create_enums.sql
    002_create_support_tables.sql
    003_create_jobs_table.sql
    004_create_jobs_related_tables.sql
    005_create_rls_policies.sql
    006_create_triggers.sql
    007_create_indexes.sql
    008_seed_dev_data.sql
```

---

**Fim do documento de arquitetura: Modulo Jobs**

**Arquivo:** `docs/architecture/jobs-module.md`
**Tabelas definidas:** 13 (6 suporte + 7 modulo jobs)
**Edge Functions:** 15 endpoints agrupados (10 originais + 5 novos)
**Componentes Frontend:** ~60 componentes
**Fases de implementacao:** 6
**Status:** Alinhado com spec refinada (respostas CEO) - 14 status, modelo financeiro Ellah, Health Score, URLs Drive, Aprovacao
