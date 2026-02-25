# Arquitetura: Fase 9 -- Automacoes Operacionais

**Data:** 24/02/2026
**Status:** Proposta
**Autor:** Tech Lead -- ELLAHOS
**Roadmap:** docs/architecture/full-roadmap.md (Fase 9 -- redefinida)
**ADRs relacionados:** ADR-018, ADR-019, ADR-020, ADR-021
**Referencia:** docs/specs/analise-ecossistema-ellah.md (ecossistema Google/Apps Script)

---

## 1. Visao Geral

A Fase 9 substitui os workflows manuais de Apps Script e planilhas que a Ellah Filmes ainda usa em paralelo ao ELLAHOS. O foco e automatizar os fluxos operacionais que ainda dependem do ecossistema Google: processamento de NFs, envio de pedidos de NF, geracao de contratos via DocuSeal, copia de templates no Drive, e geracao de PDFs de aprovacao interna.

**Nota:** O roadmap original previa a Fase 9 como "Polimento + Multi-tenant real". Essa fase foi renumerada para Fase 10. A Fase 9 agora cobre automacoes operacionais que eram itens deferidos das Fases 5-7 e que sao bloqueantes para a operacao diaria da produtora.

### 1.1 Funcionalidades por Prioridade

| Prio | # | Feature | Descricao | Onde roda |
|------|---|---------|-----------|-----------|
| P0 | 1 | **Fluxo de NF (recebimento)** | Gmail polling -> PDF -> Drive -> Supabase -> notificacao + UI validacao | n8n + Edge Function + Frontend |
| P0 | 2 | **Envio de Pedido de NF** | Tela frontend -> workflow n8n -> email formatado via Gmail API | Frontend + n8n |
| P0 | 3 | **Conectar wf-job-approved ao JOB_FECHADO_CRIACAO** | Sub-workflow call no n8n existente | n8n |
| P1 | 4 | **DocuSeal Contracts** | Gerar/enviar contratos de elenco via DocuSeal + webhook de retorno | Edge Function + n8n + Frontend |
| P1 | 5 | **Drive Template Copy** | files.copy ao criar estrutura de pastas (GG_, cronograma, form equipe) | Edge Function (drive-integration) |
| P1 | 6 | **Aprovacao Interna PDF** | Gerar PDF resumo do job com todos os dados para aprovacao interna | Edge Function + Frontend |
| P2 | 7 | **OCR NFs com IA** | Claude extrai dados estruturados de PDFs de NF | Edge Function |
| P2 | 8 | **Claquete** | Template Slides -> substituir placeholders -> PDF + PNG | n8n |
| P2 | 9 | **Docker Volume Evolution API** | Persistir sessao WhatsApp (pre-requisito infra) | VPS Hetzner |

### 1.2 Posicao na Arquitetura

```
[Frontend Next.js]
     |
     | fetch() + Bearer token
     v
[Edge Functions]                         [n8n Self-hosted]
     |-- nf-processor (NOVO)                |-- wf-nf-processor (NOVO)
     |-- docuseal-integration (NOVO)        |-- wf-nf-request (NOVO)
     |-- pdf-generator (NOVO)               |-- wf-job-approved (EXISTENTE, expandir)
     |-- drive-integration (EXPANDIR)       |-- wf-docuseal-contracts (NOVO)
     |-- integration-processor (EXPANDIR)   |-- wf-claquete (NOVO, P2)
     |                                      |-- JOB_FECHADO_CRIACAO (EXISTENTE, nao alterar)
     v                                      v
[Supabase PostgreSQL]                   [APIs Externas]
     |-- nf_documents (NOVO)                |-- Gmail API (OAuth/delegation)
     |-- nf_validation_queue (NOVO)         |-- Google Drive API (Service Account)
     |-- docuseal_submissions (NOVO)        |-- DocuSeal API (self-hosted)
     |-- integration_events (expandir)      |-- Google Slides API (P2)
     |-- invoices (existente)               |-- Claude API (P2, OCR)
```

### 1.3 Principios Especificos da Fase 9

1. **n8n como orquestrador, Edge Functions como logica de negocio**: n8n coordena fluxos multi-passo com APIs externas (Gmail, Drive). Edge Functions validam dados, aplicam regras de negocio e persistem no banco.
2. **Workflows NOVOS ao lado dos existentes**: NAO alterar JOB_FECHADO_CRIACAO, WORKFLOW_PRINCIPAL, TESTE2_JURIDICO. Criar workflows novos que podem chamar os existentes como sub-workflows.
3. **Fail gracefully**: Falhas em automacoes NAO bloqueiam o fluxo principal. Se o n8n nao processar uma NF, o usuario pode registrar manualmente.
4. **Auditoria completa**: Todo documento processado (NF, contrato) gera registro no banco com metadados, timestamps e link para o arquivo original.
5. **UI de validacao humana**: Automacoes que envolvem classificacao (NF duvidosa, OCR impreciso) SEMPRE passam por validacao humana antes de confirmar.
6. **Idempotencia**: Reprocessar um email/NF nao cria duplicata. Usar hash do arquivo + message_id do Gmail como chave de deduplicacao.

---

## 2. Diagrama de Componentes

### 2.1 Fluxo de NF (P0 -- Critico)

```
Gmail (fornecedor envia NF)
  |
  | IMAP poll (5 min) via n8n
  v
[wf-nf-processor] (n8n, NOVO)
  |
  |-- 1. Buscar emails nao-lidos com label "NF" ou subject match
  |-- 2. Para cada email:
  |      |-- Extrair anexo PDF
  |      |-- Calcular SHA-256 do PDF
  |      |-- Verificar duplicata via hash
  |      |-- Salvar PDF no Drive (pasta fin_nf_recebimento)
  |      |-- POST callback -> Edge Function nf-processor/ingest
  |
  v
[nf-processor] (Edge Function, NOVA)
  |
  |-- /ingest (POST, n8n callback)
  |      |-- Criar registro em nf_documents (status: pending_review)
  |      |-- Tentar match automatico com financial_records (por fornecedor + valor)
  |      |-- Se match unico com confianca alta: status -> auto_matched
  |      |-- Se ambiguo: status -> pending_review
  |      |-- Criar notificacao para admin/financeiro
  |
  |-- /list (GET, frontend)
  |      |-- Listar NFs pendentes de validacao
  |
  |-- /validate (POST, frontend)
  |      |-- Usuario confirma match NF <-> financial_record
  |      |-- Atualiza invoices, financial_records, nf_documents
  |      |-- Move NF para pasta correta no Drive
  |
  |-- /reject (POST, frontend)
  |      |-- Marca NF como rejeitada (duplicata, errada, etc)
  |
  v
[Frontend] -- Tela /financial/nf-validation
  |-- Lista de NFs pendentes com preview do PDF
  |-- Match sugerido com financial_record
  |-- Botoes: Confirmar | Reclassificar | Rejeitar
```

### 2.2 Envio de Pedido de NF (P0)

```
[Frontend] -- /financial/nf-request
  |
  |-- Selecionar itens de financial_records (status: pendente, sem NF)
  |-- Preview do email formatado
  |-- Botao "Enviar Pedido de NF"
  |
  | POST /nf-processor/request-send
  v
[nf-processor] (Edge Function)
  |
  |-- Validar dados do fornecedor (email, dados bancarios)
  |-- Montar payload do email (tabela HTML formatada)
  |-- Enfileirar integration_event (type: nf_request_sent)
  |-- Atualizar financial_records.nf_request_status = 'enviado'
  |
  v
[integration-processor] -> [wf-nf-request] (n8n, NOVO)
  |
  |-- Receber payload via webhook
  |-- Enviar email via Gmail API (Send)
  |      |-- To: fornecedor.email
  |      |-- Subject: "Ellah Filmes - Pedido de NF - Job {CODE}"
  |      |-- Body: tabela HTML com itens, valores, dados da Ellah
  |      |-- Reply-To: financeiro@ellahfilmes.com
  |-- Callback -> nf-processor/request-sent-callback
  |      |-- Atualizar nf_request_status = 'enviado_confirmado'
  |      |-- Salvar message_id do Gmail para tracking
```

### 2.3 DocuSeal Contracts (P1)

```
[Frontend] -- Job Detail > Aba Elenco/Contratos
  |
  |-- Selecionar membros do elenco para gerar contrato
  |-- Preview de dados (nome, CPF, valores, clausulas)
  |-- Botao "Gerar e Enviar Contratos"
  |
  | POST /docuseal-integration/create-submissions
  v
[docuseal-integration] (Edge Function, NOVA)
  |
  |-- Validar dados obrigatorios (email, CPF, nome completo)
  |-- Para cada ator:
  |      |-- Criar registro em docuseal_submissions (status: pending)
  |      |-- Enfileirar integration_event (type: docuseal_submission_created)
  |
  v
[integration-processor] -> [wf-docuseal-contracts] (n8n, NOVO)
  |
  |-- Para cada submission:
  |      |-- POST DocuSeal API /api/submissions (template_id: 3)
  |      |-- Roles: "Modelo(a)/Ator(triz)" + "Produtora"
  |      |-- Preencher campos: nome, CPF, valor, diarias, etc.
  |      |-- send_email: true (DocuSeal envia email de assinatura)
  |-- Callback -> docuseal-integration/webhook
  |
  v
[DocuSeal Webhook] (POST /docuseal-integration/webhook)
  |
  |-- DocuSeal envia webhook quando contrato e assinado
  |-- Atualizar docuseal_submissions.status = 'signed'
  |-- Baixar PDF assinado via DocuSeal API
  |-- Salvar PDF no Drive (pasta contratos)
  |-- Criar notificacao para PE do job
```

### 2.4 Drive Template Copy (P1)

```
[drive-integration] (Edge Function EXISTENTE, expandir)
  |
  |-- /create-structure (EXISTENTE, expandir)
  |      |-- Apos criar 26 pastas vazias
  |      |-- Se tenant.settings.drive.templates configurado:
  |            |-- files.copy para cada template
  |            |-- Renomear com dados do job
  |            |-- Templates: GG_{JOB}, Cronograma_{JOB}, etc.
  |
  |-- /copy-templates (NOVO endpoint)
  |      |-- Trigger manual para copiar templates em jobs existentes
  |      |-- Util para jobs criados antes da configuracao de templates
```

### 2.5 Aprovacao Interna PDF (P1)

```
[Frontend] -- Job Detail > Acoes > "Gerar Aprovacao Interna"
  |
  | POST /pdf-generator/aprovacao-interna
  v
[pdf-generator] (Edge Function, NOVA)
  |
  |-- Buscar todos os dados do job:
  |      |-- Dados do cliente (razao social, CNPJ, endereco)
  |      |-- Dados do job (numero, nome, campanha, produto)
  |      |-- Diretor, PE, produtora de som
  |      |-- Detalhes tecnicos (secundagem, pecas, diarias, datas)
  |      |-- Elenco, periodo veiculacao, midias
  |-- Gerar HTML com layout formatado
  |-- Converter HTML -> PDF (via Deno: puppeteer ou html-to-pdf)
  |-- Salvar PDF no Drive (pasta documentos)
  |-- Salvar referencia em job_files
  |-- Retornar URL do PDF
```

---

## 3. Schema Changes (Novas Tabelas)

### 3.1 nf_documents

Registro de cada NF recebida ou processada. Ponto central do fluxo de NF.

```sql
CREATE TABLE IF NOT EXISTS nf_documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id          UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  -- Origem
  source          TEXT        NOT NULL DEFAULT 'email',  -- 'email' | 'manual_upload' | 'ocr'
  gmail_message_id TEXT,       -- ID do email no Gmail (para dedup e tracking)
  sender_email    TEXT,        -- Email do fornecedor que enviou
  sender_name     TEXT,        -- Nome extraido do email
  subject         TEXT,        -- Assunto do email original
  received_at     TIMESTAMPTZ, -- Quando o email chegou
  -- Arquivo
  file_hash       TEXT        NOT NULL,  -- SHA-256 do PDF (dedup)
  file_name       TEXT        NOT NULL,
  file_size_bytes INT,
  drive_file_id   TEXT,        -- ID do arquivo no Google Drive
  drive_url       TEXT,        -- URL publica do Drive
  storage_path    TEXT,        -- Path no Supabase Storage (fallback)
  -- Dados extraidos (manual ou OCR)
  nf_number       TEXT,
  nf_value        NUMERIC(15,2),
  nf_issuer_name  TEXT,        -- Razao social do emissor
  nf_issuer_cnpj  TEXT,
  nf_issue_date   DATE,
  extracted_data  JSONB       DEFAULT '{}',  -- Dados adicionais extraidos por OCR/IA
  -- Matching
  status          TEXT        NOT NULL DEFAULT 'pending_review',
  -- 'pending_review' | 'auto_matched' | 'confirmed' | 'rejected' | 'processing'
  matched_financial_record_id UUID REFERENCES financial_records(id) ON DELETE SET NULL,
  matched_invoice_id          UUID REFERENCES invoices(id) ON DELETE SET NULL,
  match_confidence  NUMERIC(3,2),  -- 0.00 a 1.00 (confianca do match automatico)
  match_method      TEXT,           -- 'auto_value_supplier' | 'auto_nf_number' | 'manual' | 'ocr_ai'
  validated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  validated_at      TIMESTAMPTZ,
  rejection_reason  TEXT,
  -- Metadata
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT chk_nf_status CHECK (
    status IN ('pending_review', 'auto_matched', 'confirmed', 'rejected', 'processing')
  )
);

COMMENT ON TABLE nf_documents IS 'Notas fiscais recebidas por email ou upload manual. Central do fluxo de NF.';
COMMENT ON COLUMN nf_documents.file_hash IS 'SHA-256 do PDF para deduplicacao.';
COMMENT ON COLUMN nf_documents.match_confidence IS 'Confianca do match automatico (0.00-1.00). > 0.90 = auto_matched.';

-- Indices
CREATE INDEX IF NOT EXISTS idx_nf_documents_tenant
  ON nf_documents(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nf_documents_status
  ON nf_documents(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nf_documents_job
  ON nf_documents(job_id) WHERE job_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nf_documents_hash
  ON nf_documents(tenant_id, file_hash);
CREATE INDEX IF NOT EXISTS idx_nf_documents_gmail
  ON nf_documents(gmail_message_id) WHERE gmail_message_id IS NOT NULL;

-- RLS
ALTER TABLE nf_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nf_documents_select" ON nf_documents
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "nf_documents_insert" ON nf_documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "nf_documents_update" ON nf_documents
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger updated_at
CREATE TRIGGER trg_nf_documents_updated_at
  BEFORE UPDATE ON nf_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.2 docuseal_submissions

Registro de cada contrato enviado via DocuSeal para assinatura.

```sql
CREATE TABLE IF NOT EXISTS docuseal_submissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id          UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  -- Partes do contrato
  person_id       UUID        REFERENCES people(id) ON DELETE SET NULL,  -- Ator/modelo
  person_name     TEXT        NOT NULL,
  person_email    TEXT        NOT NULL,
  person_cpf      TEXT,
  -- DocuSeal
  docuseal_submission_id  INT,         -- ID retornado pela API do DocuSeal
  docuseal_template_id    INT NOT NULL DEFAULT 3,  -- Template de contrato de elenco
  docuseal_status         TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'sent' | 'opened' | 'partially_signed' | 'signed' | 'declined' | 'expired' | 'error'
  -- Dados do contrato
  contract_data   JSONB       NOT NULL DEFAULT '{}',
  -- { valor_prestacao, valor_imagem, valor_agenciamento, diarias, periodo_veiculacao, ... }
  -- Arquivos
  signed_pdf_url  TEXT,        -- URL do PDF assinado (Drive)
  signed_pdf_drive_id TEXT,    -- ID do arquivo no Drive
  -- Tracking
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  signed_at       TIMESTAMPTZ,
  created_by      UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  error_message   TEXT,
  -- Metadata
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT chk_docuseal_status CHECK (
    docuseal_status IN ('pending', 'sent', 'opened', 'partially_signed', 'signed', 'declined', 'expired', 'error')
  )
);

COMMENT ON TABLE docuseal_submissions IS 'Contratos enviados via DocuSeal para assinatura digital.';
COMMENT ON COLUMN docuseal_submissions.contract_data IS 'Dados preenchidos no template: valores, clausulas, periodo.';

-- Indices
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_tenant
  ON docuseal_submissions(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_job
  ON docuseal_submissions(job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_person
  ON docuseal_submissions(person_id) WHERE person_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_status
  ON docuseal_submissions(tenant_id, docuseal_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_external
  ON docuseal_submissions(docuseal_submission_id) WHERE docuseal_submission_id IS NOT NULL;

-- RLS
ALTER TABLE docuseal_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docuseal_submissions_select" ON docuseal_submissions
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "docuseal_submissions_insert" ON docuseal_submissions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "docuseal_submissions_update" ON docuseal_submissions
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger updated_at
CREATE TRIGGER trg_docuseal_submissions_updated_at
  BEFORE UPDATE ON docuseal_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.3 Alteracoes em Tabelas Existentes

#### 3.3.1 financial_records -- novos campos para fluxo de NF

```sql
ALTER TABLE financial_records
  ADD COLUMN IF NOT EXISTS nf_request_status TEXT DEFAULT NULL,
  -- NULL | 'pendente' | 'enviado' | 'enviado_confirmado' | 'recebido' | 'validado'
  ADD COLUMN IF NOT EXISTS nf_request_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nf_request_gmail_id TEXT,
  ADD COLUMN IF NOT EXISTS supplier_email TEXT,
  ADD COLUMN IF NOT EXISTS supplier_cnpj TEXT;

COMMENT ON COLUMN financial_records.nf_request_status IS 'Status do pedido de NF ao fornecedor.';
```

#### 3.3.2 invoices -- vincular com nf_documents

```sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS nf_document_id UUID REFERENCES nf_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS issuer_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS issuer_name TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_nf_document
  ON invoices(nf_document_id) WHERE nf_document_id IS NOT NULL;
```

#### 3.3.3 integration_events -- novos event_types

Os event_types `nf_request_sent`, `nf_received`, `nf_validated`, `docuseal_submission_created`, `docuseal_submission_signed`, `docuseal_submission_failed` ja existem no ENUM (adicionados na Fase 5 como prep). Novos event_types necessarios:

```sql
-- Adicionar ao ENUM ou ao array EVENT_TYPES no integration-client.ts:
-- 'nf_email_send'           -- Enviar email de pedido de NF via Gmail
-- 'docuseal_create_batch'   -- Criar batch de submissions no DocuSeal
-- 'pdf_generate'            -- Gerar PDF (aprovacao interna, claquete)
-- 'drive_copy_templates'    -- Copiar templates de arquivos no Drive
```

### 3.4 Resumo de Tabelas

| Tabela | Tipo | Rows estimados/mes | Nova? |
|--------|------|---------------------|-------|
| nf_documents | Registro de NFs | ~30-100/tenant | SIM |
| docuseal_submissions | Contratos DocuSeal | ~10-50/tenant | SIM |
| financial_records | Campos adicionais | Existente | ALTER |
| invoices | Campos adicionais | Existente | ALTER |

**Total de tabelas do projeto apos Fase 9: 36** (34 atuais + 2 novas)

---

## 4. Novas Edge Functions

### 4.1 `nf-processor` -- Processamento de Notas Fiscais

Central do fluxo de NF: recebe callbacks do n8n, gerencia fila de validacao, expoe API para o frontend.

**Endpoints:**

| Metodo | Rota | Descricao | Auth |
|--------|------|-----------|------|
| POST | `/nf-processor/ingest` | Callback do n8n: registrar NF recebida | Cron Secret |
| GET | `/nf-processor/list` | Listar NFs (filtro por status, job_id) | JWT |
| GET | `/nf-processor/stats` | Estatisticas de NFs por status | JWT (admin/ceo) |
| POST | `/nf-processor/validate` | Confirmar match NF <-> financial_record | JWT (admin/ceo/financeiro) |
| POST | `/nf-processor/reject` | Rejeitar NF (duplicata, errada) | JWT (admin/ceo/financeiro) |
| POST | `/nf-processor/reassign` | Reclassificar NF para outro financial_record | JWT (admin/ceo/financeiro) |
| POST | `/nf-processor/request-send` | Montar e enfileirar pedido de NF | JWT |
| POST | `/nf-processor/request-sent-callback` | Callback do n8n: confirmar envio | Cron Secret |
| POST | `/nf-processor/upload` | Upload manual de NF (sem email) | JWT |

**Payload POST /ingest (callback do n8n):**

```typescript
{
  tenant_id: string;         // Identificado pelo n8n via settings
  gmail_message_id: string;  // ID do email no Gmail
  sender_email: string;
  sender_name: string;
  subject: string;
  received_at: string;       // ISO timestamp
  file_name: string;
  file_hash: string;         // SHA-256 do PDF
  file_size_bytes: number;
  drive_file_id: string;     // Arquivo ja salvo no Drive pelo n8n
  drive_url: string;
}
```

**Response POST /ingest:**

```typescript
{
  data: {
    nf_document_id: string;
    status: 'pending_review' | 'auto_matched' | 'duplicate';
    match?: {
      financial_record_id: string;
      description: string;
      amount: number;
      confidence: number;
    };
    is_duplicate: boolean;
  }
}
```

**Payload POST /validate:**

```typescript
{
  nf_document_id: string;
  financial_record_id: string;  // Confirma o match
  nf_number?: string;           // Numero da NF (preenchido pelo usuario se nao veio por OCR)
  nf_value?: number;            // Valor da NF (preenchido pelo usuario)
  job_id?: string;              // Job associado (pode ser diferente do sugerido)
}
```

**Response POST /validate:**

```typescript
{
  data: {
    nf_document_id: string;
    status: 'confirmed';
    invoice_id: string;           // Invoice criada/atualizada
    financial_record_updated: boolean;
  }
}
```

**Payload POST /request-send:**

```typescript
{
  financial_record_ids: string[];  // IDs dos registros para pedir NF
  custom_message?: string;         // Mensagem adicional no corpo do email
}
```

**Response POST /request-send:**

```typescript
{
  data: {
    requests_queued: number;
    event_ids: string[];          // IDs dos integration_events criados
    errors: Array<{
      financial_record_id: string;
      reason: string;             // "sem email do fornecedor", "NF ja recebida", etc.
    }>;
  }
}
```

**Logica de match automatico (ingest):**

1. Verificar duplicata via `file_hash` na tabela `nf_documents`
2. Se duplicata: retornar `is_duplicate: true`, nao criar registro
3. Buscar `financial_records` do tenant onde:
   - `supplier_email` = `sender_email` (match por email)
   - OU `person.email` = `sender_email` (via FK person_id)
   - AND `nf_request_status` IN ('enviado', 'enviado_confirmado')
   - AND `status` = 'pendente'
4. Se 1 match com mesmo valor (ou sem valor para comparar): `auto_matched` (confidence 0.95)
5. Se multiplos matches: `pending_review` (confidence < 0.90)
6. Se zero matches por email, tentar por CNPJ (se disponivel)
7. Se zero matches total: `pending_review` (confidence 0.0)

### 4.2 `docuseal-integration` -- Contratos via DocuSeal

Gerencia o ciclo de vida de contratos de elenco via DocuSeal (self-hosted em assinaturas.ellahfilmes.com).

**Endpoints:**

| Metodo | Rota | Descricao | Auth |
|--------|------|-----------|------|
| POST | `/docuseal-integration/create-submissions` | Criar batch de contratos | JWT |
| GET | `/docuseal-integration/list` | Listar submissions por job | JWT |
| GET | `/docuseal-integration/templates` | Listar templates disponiveis no DocuSeal | JWT (admin) |
| POST | `/docuseal-integration/webhook` | Webhook callback do DocuSeal | Webhook Secret |
| POST | `/docuseal-integration/resend` | Reenviar contrato nao assinado | JWT |
| GET | `/docuseal-integration/download/:id` | Baixar PDF assinado | JWT |

**Payload POST /create-submissions:**

```typescript
{
  job_id: string;
  submissions: Array<{
    person_id: string;         // UUID da pessoa no ELLAHOS
    template_id?: number;      // Default: 3 (contrato elenco)
    contract_data: {
      valor_prestacao: number;
      valor_imagem?: number;
      valor_agenciamento?: number;
      diarias: number;
      periodo_veiculacao?: string;
      midias?: string;
      observacoes?: string;
    };
    send_email?: boolean;      // Default: true
  }>;
}
```

**Response POST /create-submissions:**

```typescript
{
  data: {
    created: number;
    submissions: Array<{
      id: string;              // UUID no ELLAHOS
      person_name: string;
      person_email: string;
      docuseal_status: 'pending';
    }>;
    errors: Array<{
      person_id: string;
      reason: string;          // "email ausente", "CPF ausente", etc.
    }>;
  }
}
```

**Webhook payload (DocuSeal -> ELLAHOS):**

```typescript
// DocuSeal envia POST com este payload quando status muda
{
  event_type: 'submission.completed' | 'submission.expired' | 'submission.created';
  data: {
    id: number;               // DocuSeal submission ID
    status: string;
    submitters: Array<{
      email: string;
      completed_at?: string;
      documents: Array<{
        url: string;
      }>;
    }>;
  };
}
```

**Logica do webhook:**

1. Extrair `docuseal_submission_id` do payload
2. Buscar `docuseal_submissions` correspondente no banco
3. Se `event_type = 'submission.completed'`:
   - Baixar PDF assinado da URL
   - Salvar no Drive (pasta contratos do job)
   - Atualizar `docuseal_status = 'signed'`, `signed_at = now()`
   - Criar notificacao para o PE do job
4. Se `event_type = 'submission.expired'`:
   - Atualizar `docuseal_status = 'expired'`
   - Criar notificacao para o PE

### 4.3 `pdf-generator` -- Geracao de PDFs

Gera PDFs a partir de dados do banco. V1: Aprovacao Interna. V2: Claquete, Callsheet.

**Endpoints:**

| Metodo | Rota | Descricao | Auth |
|--------|------|-----------|------|
| POST | `/pdf-generator/aprovacao-interna` | Gerar PDF de aprovacao interna | JWT |
| GET | `/pdf-generator/preview/:type/:jobId` | Preview HTML (para debug/aprovacao) | JWT |

**Payload POST /aprovacao-interna:**

```typescript
{
  job_id: string;
  save_to_drive?: boolean;    // Default: true
  save_to_files?: boolean;    // Default: true (job_files)
}
```

**Response POST /aprovacao-interna:**

```typescript
{
  data: {
    pdf_url: string;           // URL do PDF no Drive
    drive_file_id: string;
    job_file_id: string;       // Registro em job_files
    pages: number;
    generated_at: string;
  }
}
```

**Dados incluidos no PDF de aprovacao interna (referencia do doc de ecossistema):**

1. Dados do cliente/anunciante (razao social, CNPJ, endereco)
2. Dados do job (numero, nome, titulo do filme, campanha, produto)
3. Diretor, produtora de som (audio_company)
4. Detalhes tecnicos: secundagem, pecas, diarias, datas de filmagem
5. Elenco (tipo, cachê)
6. Periodo de veiculacao, midias
7. Formato, legendagem, computacao grafica
8. Modelo de contrato

**Abordagem de geracao de PDF:**

Usar HTML renderizado com CSS inline, convertido para PDF via `jsPDF` ou `@react-pdf/renderer` (ver ADR-020 para decisao). A geracao acontece na Edge Function (server-side) para consistencia.

### 4.4 Expansao de `drive-integration`

Novo endpoint para copiar templates de arquivos.

**Endpoints novos:**

| Metodo | Rota | Descricao | Auth |
|--------|------|-----------|------|
| POST | `/drive-integration/:jobId/copy-templates` | Copiar templates para pastas do job | JWT (admin/ceo) |

**Payload POST /copy-templates:**

```typescript
{
  templates?: string[];  // IDs especificos para copiar. Se vazio, copia todos configurados.
}
```

**Response POST /copy-templates:**

```typescript
{
  data: {
    files_copied: number;
    files: Array<{
      template_name: string;
      source_id: string;
      copied_id: string;
      copied_url: string;
      target_folder: string;
    }>;
    errors: string[];
  }
}
```

**Configuracao de templates (tenant.settings):**

```json
{
  "integrations": {
    "drive": {
      "enabled": true,
      "templates": [
        {
          "name": "GG_{JOB_ABA}",
          "source_id": "1abc123...",
          "target_folder_key": "root",
          "type": "spreadsheet"
        },
        {
          "name": "Cronograma_{JOB_ABA}",
          "source_id": "1def456...",
          "target_folder_key": "cronograma",
          "type": "spreadsheet"
        },
        {
          "name": "Cadastro Equipe_{JOB_ABA}",
          "source_id": "1ghi789...",
          "target_folder_key": "root",
          "type": "form"
        }
      ]
    }
  }
}
```

**Logica:**

1. Ler templates configurados em `tenant.settings.integrations.drive.templates`
2. Para cada template: `files.copy` via Drive API (Service Account)
3. Renomear arquivo copiado substituindo placeholders (`{JOB_ABA}`, `{JOB_CODE}`, `{CLIENT}`)
4. Mover para a pasta correta (lookup via `drive_folders` do job)
5. Salvar referencia em `job_files` com `external_id` e `external_source = 'google_drive'`

### 4.5 Expansao de `integration-processor`

Novos handlers no `integration-processor` para os event_types adicionados:

```typescript
// Adicionar ao switch em index.ts:
case 'nf_email_send':
  result = await processNfEmailEvent(serviceClient, event);
  break;
case 'docuseal_create_batch':
  result = await processDocuSealEvent(serviceClient, event);
  break;
case 'pdf_generate':
  result = await processPdfEvent(serviceClient, event);
  break;
case 'drive_copy_templates':
  result = await processDriveCopyEvent(serviceClient, event);
  break;
```

---

## 5. Workflows n8n (Novos)

### 5.1 wf-nf-processor (P0)

**Trigger:** Schedule (a cada 5 minutos)
**Nodes (~15):**

1. **Schedule Trigger** -- Cron: `*/5 * * * *`
2. **Gmail IMAP** -- Buscar emails nao-lidos
   - Filtro: `from:* has:attachment filename:pdf label:NF`
   - OAuth: `financeiro@ellahfilmes.com`
3. **Filter** -- Apenas emails com anexo PDF
4. **Loop** -- Para cada email:
   a. **Extract Attachment** -- Extrair PDF anexo
   b. **Crypto** -- Calcular SHA-256 do PDF
   c. **HTTP Request (Dedup Check)** -- GET nf-processor/check-hash?hash=X
   d. **IF Duplicate** -- Se ja existe, marcar como lido e pular
   e. **Google Drive Upload** -- Salvar PDF na pasta `fin_nf_recebimento` do tenant
   f. **HTTP Request (Ingest)** -- POST nf-processor/ingest com metadados
   g. **Gmail Mark Read** -- Marcar email como lido
5. **Error Handler** -- Se falha, logar e continuar com proximo email

**Autenticacao:**
- Gmail: OAuth2 com scope `gmail.readonly` + `gmail.modify` (marcar como lido)
- Drive: Service Account (reusar existente)
- ELLAHOS: X-Cron-Secret header (mesmo padrao do integration-processor)

**Configuracao necessaria no n8n:**
- Credencial Gmail OAuth2 (financeiro@ellahfilmes.com)
- Credencial Google Drive Service Account (existente)
- Variavel `ELLAHOS_BASE_URL` (URL do Supabase Edge Functions)
- Variavel `ELLAHOS_CRON_SECRET` (secret para autenticacao)

### 5.2 wf-nf-request (P0)

**Trigger:** Webhook (chamado pelo integration-processor)
**Nodes (~10):**

1. **Webhook Trigger** -- POST /webhook/nf-request
2. **Validate Payload** -- Verificar campos obrigatorios
3. **Build Email HTML** -- Template com tabela formatada:
   ```
   Prezado(a) {FORNECEDOR},

   Solicitamos o envio da(s) Nota(s) Fiscal(is) referente(s) aos
   servicos prestados para a produtora Ellah Filmes:

   | Item | Descricao | Valor |
   |------|-----------|-------|
   | 1    | {DESC}    | R$ {VALOR} |

   Dados para emissao:
   Razao Social: ELLAH FILMES LTDA
   CNPJ: XX.XXX.XXX/0001-XX
   ...

   Por favor, envie a NF para: financeiro@ellahfilmes.com
   ```
4. **Gmail Send** -- Enviar email via Gmail API
   - To: fornecedor email
   - Subject: "Ellah Filmes - Pedido de NF - Job {CODE}"
   - Reply-To: financeiro@ellahfilmes.com
5. **HTTP Request (Callback)** -- POST nf-processor/request-sent-callback
   - Payload: { gmail_message_id, financial_record_ids, sent_at }
6. **Error Handler** -- Se falha no envio, retornar erro para callback

### 5.3 wf-job-approved -- Expansao (P0)

**Alteracao:** Adicionar node final que chama o workflow JOB_FECHADO_CRIACAO existente como sub-workflow.

**Nodes adicionados (~3):**

1. **Set** -- Montar payload no formato esperado pelo JOB_FECHADO_CRIACAO
   - Mapear campos: job_code -> numero, title -> nome, client -> cliente, etc.
   - Incluir URLs das pastas recem-criadas
2. **Execute Sub-Workflow** -- Chamar JOB_FECHADO_CRIACAO
   - Modo: sub-workflow call (nao webhook)
   - Passar payload mapeado
3. **IF Error** -- Se JOB_FECHADO_CRIACAO falhar (ex: Z-API fora), logar mas NAO falhar o wf-job-approved

**Nota:** NAO alterar o JOB_FECHADO_CRIACAO. Ele continua usando Z-API para criar 4 grupos WhatsApp. A migracao para Evolution API e escopo da Fase 10.

### 5.4 wf-docuseal-contracts (P1)

**Trigger:** Webhook (chamado pelo integration-processor)
**Nodes (~12):**

1. **Webhook Trigger** -- POST /webhook/docuseal-contracts
2. **Split** -- Separar array de submissions
3. **Loop** -- Para cada submission:
   a. **Validate** -- Verificar email, nome, CPF
   b. **HTTP Request (DocuSeal)** -- POST /api/submissions
      - URL: https://assinaturas.ellahfilmes.com/api/submissions
      - Header: X-Auth-Token: {DOCUSEAL_TOKEN}
      - Body: template_id, submitters, fields
   c. **IF Error** -- Se DocuSeal falhar, logar no callback
   d. **HTTP Request (Callback)** -- POST docuseal-integration/submission-created-callback
      - Payload: { submission_id (ELLAHOS), docuseal_submission_id, status }
4. **Aggregate Results** -- Juntar resultados
5. **HTTP Request (Final Callback)** -- POST com resumo do batch

### 5.5 wf-claquete (P2)

**Trigger:** Webhook
**Nodes (~8):**

1. **Webhook Trigger** -- POST /webhook/claquete
2. **Google Slides Copy** -- Copiar template de claquete
3. **Replace Placeholders** -- Substituir texto no Slides:
   - {TITULO}, {DURACAO}, {PRODUTO}, {CLIENTE}, {DIRETOR}, {DIARIA}, etc.
4. **Export PDF** -- Exportar Slides como PDF
5. **Export PNG** -- Exportar Slides como PNG
6. **Google Drive Upload** -- Salvar na pasta do job (documentos)
7. **HTTP Request (Callback)** -- POST pdf-generator/claquete-callback

---

## 6. Telas Frontend (Novas)

### 6.1 NF Validation -- `/financial/nf-validation`

**Descricao:** Lista de NFs recebidas pendentes de validacao. Dashboard do fluxo de NF.

**Componentes:**

| Componente | Descricao |
|------------|-----------|
| NfValidationPage | Pagina principal com stats cards + tabela |
| NfStatsCards | 4 cards: Pendentes, Auto-matched, Confirmadas (mes), Rejeitadas (mes) |
| NfDocumentTable | Tabela com filtros (status, job, data) + paginacao |
| NfDocumentRow | Linha com: arquivo, fornecedor, data, status badge, match sugerido |
| NfValidationDialog | Modal com: preview do PDF (iframe), dados extraidos, match sugerido, botoes |
| NfReassignDialog | Modal para reclassificar: buscar financial_record por descricao/valor |

**Fluxo UX:**

1. Usuario abre `/financial/nf-validation`
2. Ve cards de resumo (5 pendentes, 3 auto-matched)
3. Clica em NF pendente -> abre modal com preview do PDF ao lado
4. Ve match sugerido: "Uber equipe - R$ 350,00 (Job 038)"
5. Confirma ou reclassifica
6. NF muda para status "confirmed", financial_record atualizado

### 6.2 NF Request -- `/financial/nf-request`

**Descricao:** Tela para selecionar despesas pendentes e enviar pedido de NF por email.

**Componentes:**

| Componente | Descricao |
|------------|-----------|
| NfRequestPage | Pagina com seletor de itens + preview do email |
| FinancialRecordPicker | Tabela de financial_records sem NF, com checkbox multi-select |
| NfEmailPreview | Preview HTML do email que sera enviado |
| NfRequestConfirmDialog | Confirmacao antes de enviar |

**Fluxo UX:**

1. Usuario seleciona financial_records (filtro por job, fornecedor)
2. Agrupa automaticamente por fornecedor (1 email por fornecedor)
3. Preview do email formatado com tabela de itens
4. Confirma envio -> enfileira integration_event
5. Status dos registros muda para "enviado"

### 6.3 DocuSeal Contracts -- Job Detail > Aba Contratos

**Descricao:** Secao dentro do Job Detail para gerenciar contratos de elenco via DocuSeal.

**Componentes:**

| Componente | Descricao |
|------------|-----------|
| ContractsTab | Aba no Job Detail |
| ContractsList | Lista de contratos com status (pending, sent, signed) |
| CreateContractsDialog | Modal para selecionar elenco e gerar contratos |
| ContractDetailDrawer | Drawer com dados do contrato, timeline de eventos, link PDF |

**Fluxo UX:**

1. PE abre aba "Contratos" no detalhe do job
2. Ve lista de contratos existentes com status
3. Clica "Gerar Contratos" -> seleciona membros do elenco
4. Preenche dados do contrato (valores, diarias, periodo)
5. Confirma -> contratos enfileirados para DocuSeal
6. Status atualiza em tempo real (Realtime subscription)

### 6.4 Aprovacao Interna PDF -- Job Detail > Acoes

**Descricao:** Botao no Job Detail que gera PDF de aprovacao interna.

**Componentes:**

| Componente | Descricao |
|------------|-----------|
| GenerateApprovalButton | Botao com icone PDF no header do Job Detail |
| ApprovalPdfPreviewDialog | Modal com preview do PDF gerado |

### 6.5 Rotas Frontend Novas

| Rota | Componente | Descricao |
|------|-----------|-----------|
| `/financial/nf-validation` | NfValidationPage | Lista e validacao de NFs |
| `/financial/nf-request` | NfRequestPage | Pedido de NF por email |
| Job Detail tab "Contratos" | ContractsTab | Contratos DocuSeal |
| `/settings/integrations` (expandir) | DocuSeal section | Config DocuSeal + Gmail |

---

## 7. Sub-fases de Implementacao

### Fase 9.1 -- Infraestrutura e Schema (Foundation)
**Dependencias:** Nenhuma (base para tudo)
**Entregaveis:**
- [ ] Migration: tabelas `nf_documents`, `docuseal_submissions`
- [ ] Migration: ALTER financial_records (nf_request_status, supplier_email, supplier_cnpj)
- [ ] Migration: ALTER invoices (nf_document_id, drive_file_id, issuer_cnpj, issuer_name)
- [ ] Atualizar `_shared/integration-client.ts` com novos event_types
- [ ] Atualizar `_shared/types.ts` com novos tipos (NfDocumentRow, DocuSealSubmissionRow)
- [ ] Novo `_shared/docuseal-client.ts` (HTTP client para DocuSeal API)
- [ ] Novo `_shared/gmail-client.ts` (helpers para montar emails HTML)
- [ ] ADR-018 (NF Processing Pipeline)
- [ ] ADR-019 (DocuSeal Integration Pattern)

**Estimativa:** 2-3 dias

### Fase 9.2 -- Fluxo de NF: Recebimento (P0)
**Dependencias:** 9.1
**Entregaveis:**
- [ ] Edge Function `nf-processor` (ingest, list, validate, reject, reassign, upload)
- [ ] Workflow n8n `wf-nf-processor` (Gmail polling -> Drive -> callback)
- [ ] Frontend: `/financial/nf-validation` (lista, stats, modal validacao)
- [ ] Configurar credencial Gmail OAuth2 no n8n
- [ ] Testar fluxo end-to-end: email com NF -> aparece na UI -> validar

**Estimativa:** 5-7 dias

### Fase 9.3 -- Envio de Pedido de NF (P0)
**Dependencias:** 9.1
**Entregaveis:**
- [ ] Endpoints `nf-processor/request-send` e `request-sent-callback`
- [ ] Workflow n8n `wf-nf-request` (enviar email via Gmail API)
- [ ] Frontend: `/financial/nf-request` (selecionar itens, preview, enviar)
- [ ] Handler no integration-processor para `nf_email_send`

**Estimativa:** 3-4 dias

### Fase 9.4 -- Conectar wf-job-approved ao JOB_FECHADO_CRIACAO (P0)
**Dependencias:** Nenhuma (workflow n8n existente)
**Entregaveis:**
- [ ] Expandir wf-job-approved com sub-workflow call
- [ ] Mapear payload ELLAHOS -> formato JOB_FECHADO_CRIACAO
- [ ] Testar que grupos WhatsApp sao criados ao aprovar job no ELLAHOS
- [ ] Error handling: falha no JOB_FECHADO_CRIACAO NAO bloqueia o wf-job-approved

**Estimativa:** 1-2 dias

### Fase 9.5 -- DocuSeal Contracts (P1)
**Dependencias:** 9.1
**Entregaveis:**
- [ ] Edge Function `docuseal-integration` (create-submissions, list, webhook, resend, download)
- [ ] Workflow n8n `wf-docuseal-contracts` (criar submissions no DocuSeal)
- [ ] Handler no integration-processor para `docuseal_create_batch`
- [ ] Frontend: Aba "Contratos" no Job Detail
- [ ] Configurar webhook URL no DocuSeal (assinaturas.ellahfilmes.com)
- [ ] ADR-019 (DocuSeal Integration Pattern)

**Estimativa:** 4-5 dias

### Fase 9.6 -- Drive Template Copy (P1)
**Dependencias:** 9.1
**Entregaveis:**
- [ ] Novo endpoint `drive-integration/:jobId/copy-templates`
- [ ] Expandir `create-structure` para incluir copy se templates configurados
- [ ] Frontend: Configuracao de templates em Settings > Integracoes > Drive
- [ ] Testar: criar job -> pastas + templates copiados automaticamente

**Estimativa:** 2-3 dias

### Fase 9.7 -- Aprovacao Interna PDF (P1)
**Dependencias:** 9.1
**Entregaveis:**
- [ ] Edge Function `pdf-generator` (aprovacao-interna, preview)
- [ ] Template HTML da aprovacao interna (layout formatado)
- [ ] Frontend: Botao "Gerar Aprovacao Interna" no Job Detail
- [ ] Salvar PDF no Drive e em job_files
- [ ] ADR-020 (PDF Generation Approach)

**Estimativa:** 3-4 dias

### Fase 9.8 -- QA + Polish
**Dependencias:** 9.2-9.7
**Entregaveis:**
- [ ] Testes end-to-end de todos os fluxos
- [ ] Testar idempotencia (reprocessar mesmo email, recriar mesmo contrato)
- [ ] Testar fallback (n8n fora, DocuSeal fora, Gmail fora)
- [ ] Validar isolamento multi-tenant
- [ ] Security review: webhook signatures, secrets, input sanitization
- [ ] Performance: tempo do fluxo NF (email -> UI < 10 min)

**Estimativa:** 3-4 dias

### Fase 9.9 -- P2 Features (Nice to Have)
**Dependencias:** 9.2 (OCR depende de NF existir)
**Entregaveis:**
- [ ] OCR de NFs com Claude (endpoint nf-processor/ocr-analyze)
- [ ] Workflow n8n wf-claquete (Slides -> PDF + PNG)
- [ ] Persistir volume Docker da Evolution API (infra)
- [ ] ADR-021 (OCR NF via Claude Vision)

**Estimativa:** 4-5 dias (pode ser paralela com 9.8)

### Cronograma Total

| Sub-fase | Dias | Acumulado | Prioridade |
|----------|------|-----------|------------|
| 9.1 Foundation | 2-3 | 2-3 | - |
| 9.2 NF Recebimento | 5-7 | 7-10 | P0 |
| 9.3 Pedido NF | 3-4 | 10-14 | P0 |
| 9.4 Job Approved + JOB_FECHADO | 1-2 | 11-16 | P0 |
| 9.5 DocuSeal | 4-5 | 15-21 | P1 |
| 9.6 Drive Templates | 2-3 | 17-24 | P1 |
| 9.7 PDF Aprovacao | 3-4 | 20-28 | P1 |
| 9.8 QA | 3-4 | 23-32 | - |
| 9.9 P2 Features | 4-5 | 27-37 | P2 |
| **Total** | **27-37 dias** | | |

**Nota:** Fases 9.2, 9.3 e 9.4 podem ser parcialmente paralelizadas (independentes entre si apos 9.1). Fases 9.5, 9.6 e 9.7 tambem sao independentes. Se paralelizadas, o cronograma real cai para **18-25 dias** para P0+P1.

---

## 8. ADRs Necessarios

### ADR-018: NF Processing Pipeline (Gmail -> n8n -> Supabase)
**Escopo:** Como monitorar emails de NF, processar PDFs e registrar no sistema.
**Decisao:**
- n8n faz polling do Gmail (IMAP, a cada 5 min), nao push webhook
- n8n salva PDF no Drive e faz callback para Edge Function
- Edge Function faz match automatico e cria registro
- Frontend apresenta fila de validacao humana
**Justificativa:** Gmail API nao suporta push notifications confiavel para anexos. Polling de 5 min e aceitavel para NFs (nao e tempo-real). n8n e ideal para orquestrar o fluxo multi-passo (Gmail -> Drive -> Supabase).
**Alternativas rejeitadas:**
- Edge Function com Gmail API direta: Edge Functions tem timeout de 150s, polling de caixa inteira pode exceder
- Pub/Sub do Gmail: Complexidade de setup (Cloud Functions, topic), notifica que ha email novo mas nao entrega o anexo
- Monitorar caixa por label via Apps Script: Queremos eliminar Apps Script, nao criar mais

### ADR-019: DocuSeal Integration Pattern
**Escopo:** Como integrar com DocuSeal self-hosted para assinatura de contratos.
**Decisao:**
- Edge Function `docuseal-integration` gerencia o ciclo de vida no Supabase
- n8n workflow `wf-docuseal-contracts` faz as chamadas HTTP para DocuSeal API
- DocuSeal webhook chama diretamente a Edge Function (sem passar por n8n)
- Token do DocuSeal armazenado no Vault
**Justificativa:** DocuSeal e self-hosted (assinaturas.ellahfilmes.com), API simples (REST), webhook nativo. O n8n e necessario para o batch de criacao (loop + error handling + callback), mas o webhook de retorno e simples o suficiente para a Edge Function receber diretamente.
**Alternativas rejeitadas:**
- Todo o fluxo na Edge Function: Batch de 20+ contratos com DocuSeal API pode exceder timeout de 150s
- Todo o fluxo no n8n: Perde validacao Zod, RLS, audit trail. n8n nao deve ser fonte de verdade.

### ADR-020: PDF Generation Approach (Server-side)
**Escopo:** Como gerar PDFs (aprovacao interna, claquete) no backend.
**Decisao:**
- Gerar HTML com template literals + CSS inline na Edge Function
- Converter HTML para PDF usando a biblioteca `jspdf` + `html2canvas` via esm.sh no Deno
- Alternativa: Usar n8n com node HTML to PDF para conversao (mais estavel)
- PDFs salvos no Drive via Service Account + referencia em job_files
**Justificativa:** Edge Functions do Supabase (Deno Deploy) nao suportam Puppeteer (precisa de Chrome headless). `jspdf` e leve e funciona no Deno, mas limitado para layouts complexos. Para a v1 da aprovacao interna (1-2 paginas, layout tabular simples), e suficiente. Se precisar de layouts mais ricos, delegar para n8n que roda em VPS (onde Puppeteer funciona).
**Trade-off:**
- Edge Function: Rapido, inline, sem dependencia externa. Limitado em layout.
- n8n: Puppeteer disponivel, layout rico. Adiciona latencia (webhook + processamento).
- Decisao: **v1 com jspdf na Edge Function. Se insuficiente, migrar para n8n.**
**Alternativas rejeitadas:**
- Client-side PDF (browser): Inconsistencia entre navegadores, dados sensíveis expostos no client
- Servico externo de PDF (ex: html2pdf.app): Dependencia externa paga, dados financeiros saem da infra

### ADR-021: OCR de NF via Claude Vision (P2)
**Escopo:** Como extrair dados estruturados de PDFs de NF usando IA.
**Decisao:**
- Converter PDF para imagem (PNG) no n8n (usando ImageMagick/Ghostscript na VPS)
- Enviar imagem para Claude Sonnet via Vision API
- Prompt estruturado para extrair: nf_number, valor, CNPJ emissor, razao social, data emissao
- Salvar dados extraidos em nf_documents.extracted_data (JSONB)
- Resultado e sugestao -- sempre requer validacao humana
**Justificativa:** NFs brasileiras tem formatos diversos (servico, produto, MEI, etc.). Claude Vision com prompt bem estruturado consegue extrair dados com ~85-90% de precisao. Mais barato e flexível que OCR dedicado (ocr.space). Custo: ~$0.01 por NF (1 imagem, Sonnet Vision).
**Alternativas rejeitadas:**
- OCR.space (API): Extrai texto bruto, precisa de regex para cada formato de NF. Fragil.
- Tesseract local: Precisa de setup na VPS, qualidade inferior para NFs escaneadas
- Google Document AI: Custo alto, vendor lock-in, overhead de integracao

---

## 9. Trade-offs

### 9.1 PDF Server-side vs Client-side

| Criterio | Server-side (Edge Function) | Client-side (Browser) |
|----------|---------------------------|----------------------|
| Consistencia | Alta (mesmo output sempre) | Baixa (varia por browser/OS) |
| Seguranca | Dados nao saem para o client | Dados expostos no JS |
| Complexidade | Media (Deno + jspdf) | Baixa (react-pdf) |
| Layout rico | Limitado sem Puppeteer | Melhor com @react-pdf |
| Latencia | ~2-5s | ~1-3s |

**Decisao:** Server-side. Dados financeiros e contratuais nao devem ser montados no client.

### 9.2 n8n vs Edge Function para Processamento de Email

| Criterio | n8n | Edge Function |
|----------|-----|---------------|
| Gmail IMAP polling | Nativo (node Gmail) | Nao suportado (Deno) |
| Timeout | Sem limite (VPS) | 150s |
| File manipulation | Completo (Buffer, fs) | Limitado (Deno APIs) |
| Error handling visual | Sim (UI do n8n) | Logs apenas |
| Observabilidade | Execucoes com visual | Apenas logs |
| Manutenibilidade | Visual (nao-dev) | Codigo (dev) |

**Decisao:** n8n para tudo que envolve polling, files, e chamadas sequenciais a APIs externas. Edge Function para logica de negocio, validacao, e persistencia.

### 9.3 DocuSeal Webhook Direto vs via n8n

| Criterio | Direto (Edge Function) | Via n8n relay |
|----------|----------------------|---------------|
| Latencia | Baixa (~200ms) | Media (~1-2s) |
| Complexidade | Baixa (1 handler) | Media (webhook + transform) |
| Flexibilidade | Limitada | Alta (pode fazer acoes extras) |
| Observabilidade | Logs | Visual no n8n |

**Decisao:** Webhook direto para a Edge Function. O payload do DocuSeal e simples (JSON com status + URLs). Nao precisa de transformacao complexa.

### 9.4 Polling vs Push para Gmail

| Criterio | Polling (IMAP 5min) | Push (Pub/Sub) |
|----------|---------------------|----------------|
| Setup | Simples (credencial Gmail) | Complexo (Cloud Functions, topic) |
| Latencia | 0-5 min | ~segundos |
| Confiabilidade | Alta (n8n retry built-in) | Media (Pub/Sub pode perder msgs) |
| Custo | Zero (ja tem n8n) | Cloud Functions billing |

**Decisao:** Polling de 5 min. NFs nao sao real-time. Simplicidade vence.

---

## 10. Seguranca

### 10.1 Autenticacao de Webhooks

| Webhook | Metodo de Auth | Descricao |
|---------|---------------|-----------|
| n8n -> nf-processor | X-Cron-Secret header | Mesmo padrao do integration-processor |
| DocuSeal -> docuseal-integration | Webhook Secret (HMAC) | DocuSeal suporta assinatura HMAC |
| n8n -> docuseal-integration (callback) | X-Cron-Secret header | Padrao existente |

**DocuSeal Webhook Signature:**

```typescript
// Validar HMAC do DocuSeal
const signature = req.headers.get('x-docuseal-signature');
const secret = await getSecret(serviceClient, 'DOCUSEAL_WEBHOOK_SECRET');
const expectedSig = await hmacSha256(secret, rawBody);
if (signature !== expectedSig) {
  return error('UNAUTHORIZED', 'Webhook signature invalida', 401);
}
```

### 10.2 Protecao de Dados Sensiveis

- **CPF, CNPJ, dados bancarios:** Ja protegidos por RLS (tenant isolation). Nunca expostos em logs.
- **Emails de fornecedores:** Armazenados no banco, nao em logs do n8n (n8n logs desabilitados para dados sensiveis).
- **PDFs de NF:** Armazenados no Drive (Shared Drive da Ellah, acesso restrito). Referencia no banco, nao o arquivo em si.
- **DocuSeal Token:** Armazenado no Vault, nunca exposto ao frontend.
- **Gmail OAuth Token:** Gerenciado pelo n8n (credential store), nunca exposto.

### 10.3 Rate Limiting

- `nf-processor/ingest`: 100 requests/hora por tenant (n8n deveria enviar menos que isso)
- `nf-processor/request-send`: 50 requests/hora por usuario (evitar spam de emails)
- `docuseal-integration/create-submissions`: 20 requests/hora por usuario
- `docuseal-integration/webhook`: 200 requests/hora por IP (DocuSeal server)

### 10.4 Input Sanitization

- Nomes de arquivos: Sanitizar caracteres especiais antes de salvar (remover `../`, `\0`, etc.)
- Emails: Validar formato antes de enviar pedido de NF
- CPF/CNPJ: Validar digito verificador antes de enviar ao DocuSeal
- HTML do email: Escapar inputs do usuario para prevenir injection
- Webhook payload: Validar com Zod schema antes de processar

---

## 11. Performance e Resiliencia

### 11.1 SLAs Esperados

| Fluxo | Latencia target | Frequencia |
|-------|----------------|------------|
| Email NF -> UI | < 10 min (polling 5 min + processamento) | ~30-100 NFs/mes |
| Pedido NF -> Email enviado | < 2 min | ~30-100/mes |
| DocuSeal contrato criado | < 30s | ~10-50/mes |
| DocuSeal assinado -> notificacao | < 5 min (webhook) | ~10-50/mes |
| PDF aprovacao gerado | < 10s | ~20-50/mes |
| Drive templates copiados | < 30s | ~10-20/mes |

### 11.2 Fallbacks

| Cenario | Fallback |
|---------|----------|
| n8n fora do ar | NFs acumulam no Gmail, processadas quando n8n voltar. Pedidos de NF: usuario envia email manualmente. |
| Gmail API fora | n8n retry automatico. NFs nao processadas ate Gmail voltar. |
| DocuSeal fora | Submissions ficam com status 'pending'. Retry manual via botao "Reenviar". |
| Drive API fora | Templates nao copiados. Retry manual via botao "Copiar Templates". |
| Claude API fora (OCR) | OCR desabilitado. Usuario preenche dados da NF manualmente. |
| Edge Function timeout | n8n recebe erro, agenda retry. integration_events pendente. |

### 11.3 Idempotencia

| Operacao | Chave de dedup | Comportamento |
|----------|---------------|---------------|
| Ingest NF | file_hash (SHA-256) | Retorna registro existente, nao cria duplicata |
| Pedido NF | financial_record_id + data | idempotency_key no integration_events |
| DocuSeal submission | job_id + person_id + template_id | Verifica se ja existe submission ativa |
| Drive copy template | job_id + template_source_id | Verifica se arquivo ja existe na pasta |
| PDF aprovacao | job_id + tipo | Sobrescreve PDF anterior (versiona em job_files) |

### 11.4 Observabilidade

- **n8n:** Execucoes visíveis na UI do n8n (sucesso/falha/tempo). Alertas via email para falhas.
- **Edge Functions:** Logs no Supabase Dashboard (funcao + timestamp + duracao).
- **integration_events:** Tabela serve como audit trail. Status: pending -> processing -> completed/failed.
- **Notificacoes:** Admin notificado via app para falhas permanentes (apos MAX_ATTEMPTS).

---

## 12. Riscos Tecnicos

| Risco | Impacto | Probabilidade | Mitigacao |
|-------|---------|---------------|-----------|
| Gmail OAuth token expira | Alto (NFs param de ser processadas) | Medio | Refresh token automatico no n8n. Alerta se refresh falhar. |
| DocuSeal self-hosted cai | Medio (contratos param) | Baixo | Monitorar com healthcheck. Retry automatico. |
| Docker volume Evolution API nao persistido | Alto (sessao WhatsApp perde) | Alto (JA E O CASO) | **BLOQUEANTE**: Resolver na 9.9 (P2). Documentar volume bind mount. |
| Formato de NF muda | Baixo (OCR falha) | Medio | OCR e sugestao, validacao humana sempre. |
| Z-API descontinua/muda pricing | Alto (JOB_FECHADO_CRIACAO para) | Baixo | Interface abstrata IWhatsAppProvider ja existe (ADR-008). Migrar para Evolution API. |
| Gmail rate limit (500 msgs/dia) | Medio (pedidos NF bloqueados) | Baixo | Monitorar cota. Batch: agrupar itens por fornecedor em 1 email. |
| PDF jspdf nao suporta layout necessario | Baixo (layout simples na v1) | Medio | Fallback: n8n + Puppeteer na VPS. Documentado no ADR-020. |
| n8n VPS fica sem espaco em disco | Alto (tudo para) | Baixo | Monitorar disco. PDFs armazenados no Drive, nao no n8n. |
| Emails de NF nao seguem padrao | Medio (match automatico falha) | Alto | Match manual via UI. Treinar fornecedores com template de email padrao. |

---

## 13. Modulos Compartilhados Novos

### 13.1 `_shared/docuseal-client.ts`

Cliente HTTP para a API do DocuSeal (self-hosted).

```typescript
import { getSecret } from './vault.ts';

export interface DocuSealSubmission {
  template_id: number;
  send_email: boolean;
  submitters: Array<{
    role: string;
    email: string;
    fields: Array<{
      name: string;
      value: string;
      default_value?: string;
    }>;
  }>;
}

export interface DocuSealResponse {
  id: number;
  status: string;
  submitters: Array<{
    id: number;
    email: string;
    status: string;
    documents: Array<{ url: string; filename: string }>;
  }>;
}

// Cria submission no DocuSeal
export async function createSubmission(
  serviceClient: SupabaseClient,
  tenantId: string,
  submission: DocuSealSubmission,
): Promise<DocuSealResponse>;

// Busca status de uma submission
export async function getSubmission(
  serviceClient: SupabaseClient,
  tenantId: string,
  submissionId: number,
): Promise<DocuSealResponse>;

// Lista templates disponiveis
export async function listTemplates(
  serviceClient: SupabaseClient,
  tenantId: string,
): Promise<Array<{ id: number; name: string; fields: string[] }>>;

// Valida HMAC signature do webhook
export async function validateWebhookSignature(
  serviceClient: SupabaseClient,
  tenantId: string,
  signature: string,
  rawBody: string,
): Promise<boolean>;
```

### 13.2 `_shared/email-template.ts`

Helpers para montar emails HTML formatados (pedido de NF, notificacoes).

```typescript
// Monta HTML do email de pedido de NF
export function buildNfRequestEmail(params: {
  supplierName: string;
  items: Array<{
    description: string;
    amount: number;
    jobCode: string;
  }>;
  companyData: {
    name: string;
    cnpj: string;
    address: string;
    email: string;
  };
  customMessage?: string;
}): { subject: string; htmlBody: string };

// Monta HTML do email de notificacao generica
export function buildNotificationEmail(params: {
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}): string;
```

### 13.3 `_shared/pdf-generator.ts`

Helpers para gerar PDFs server-side.

```typescript
// Gera PDF a partir de HTML string
// Usa jspdf + html rendering
export async function generatePdfFromHtml(
  html: string,
  options?: {
    format?: 'a4' | 'letter';
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  },
): Promise<Uint8Array>;

// Salva PDF no Drive e registra em job_files
export async function savePdfToDrive(
  serviceClient: SupabaseClient,
  params: {
    tenantId: string;
    jobId: string;
    pdfBytes: Uint8Array;
    fileName: string;
    folderKey: string;  // ex: 'documentos', 'contratos'
    fileType?: string;  // ex: 'aprovacao_interna', 'claquete'
  },
): Promise<{ driveFileId: string; driveUrl: string; jobFileId: string }>;
```

---

## 14. Mudancas em Modulos Existentes

### 14.1 `_shared/integration-client.ts`

Adicionar novos event_types:

```typescript
export const EVENT_TYPES = [
  // Existentes
  'drive_create_structure',
  'whatsapp_send',
  'n8n_webhook',
  'nf_request_sent',
  'nf_received',
  'nf_validated',
  'docuseal_submission_created',
  'docuseal_submission_signed',
  'docuseal_submission_failed',
  // Novos (Fase 9)
  'nf_email_send',
  'docuseal_create_batch',
  'pdf_generate',
  'drive_copy_templates',
] as const;
```

### 14.2 `_shared/types.ts`

Adicionar interfaces:

```typescript
export interface NfDocumentRow {
  id: string;
  tenant_id: string;
  job_id: string | null;
  source: 'email' | 'manual_upload' | 'ocr';
  gmail_message_id: string | null;
  sender_email: string | null;
  sender_name: string | null;
  subject: string | null;
  received_at: string | null;
  file_hash: string;
  file_name: string;
  file_size_bytes: number | null;
  drive_file_id: string | null;
  drive_url: string | null;
  storage_path: string | null;
  nf_number: string | null;
  nf_value: number | null;
  nf_issuer_name: string | null;
  nf_issuer_cnpj: string | null;
  nf_issue_date: string | null;
  extracted_data: Record<string, unknown>;
  status: NfDocumentStatus;
  matched_financial_record_id: string | null;
  matched_invoice_id: string | null;
  match_confidence: number | null;
  match_method: string | null;
  validated_by: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type NfDocumentStatus =
  | 'pending_review'
  | 'auto_matched'
  | 'confirmed'
  | 'rejected'
  | 'processing';

export interface DocuSealSubmissionRow {
  id: string;
  tenant_id: string;
  job_id: string;
  person_id: string | null;
  person_name: string;
  person_email: string;
  person_cpf: string | null;
  docuseal_submission_id: number | null;
  docuseal_template_id: number;
  docuseal_status: DocuSealStatus;
  contract_data: Record<string, unknown>;
  signed_pdf_url: string | null;
  signed_pdf_drive_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
  signed_at: string | null;
  created_by: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type DocuSealStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'partially_signed'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'error';
```

### 14.3 `integration-processor/index.ts`

Adicionar novos handlers no switch:

```typescript
import { processNfEmailEvent } from './handlers/nf-email-handler.ts';
import { processDocuSealEvent } from './handlers/docuseal-handler.ts';
import { processPdfEvent } from './handlers/pdf-handler.ts';
import { processDriveCopyEvent } from './handlers/drive-copy-handler.ts';

// No switch:
case 'nf_email_send':
  result = await processNfEmailEvent(serviceClient, event);
  break;
case 'docuseal_create_batch':
  result = await processDocuSealEvent(serviceClient, event);
  break;
case 'pdf_generate':
  result = await processPdfEvent(serviceClient, event);
  break;
case 'drive_copy_templates':
  result = await processDriveCopyEvent(serviceClient, event);
  break;
```

### 14.4 `tenant-settings` Edge Function

Adicionar configuracao de DocuSeal e Gmail:

```json
{
  "integrations": {
    "docuseal": {
      "enabled": true,
      "url": "https://assinaturas.ellahfilmes.com",
      "default_template_id": 3,
      "send_email_by_default": true
    },
    "gmail": {
      "enabled": true,
      "monitored_email": "financeiro@ellahfilmes.com",
      "nf_label": "NF",
      "polling_interval_min": 5
    }
  }
}
```

### 14.5 Frontend -- Novas Rotas

| Rota | Componente | Descricao |
|------|-----------|-----------|
| `/financial/nf-validation` | NfValidationPage | Lista e validacao de NFs recebidas |
| `/financial/nf-request` | NfRequestPage | Envio de pedido de NF por email |
| Job Detail tab "Contratos" | ContractsTab | Gestao de contratos DocuSeal |
| `/settings/integrations` (expandir) | DocuSeal + Gmail config | Novas secoes de configuracao |

---

## 15. Estimativa de Custos Operacionais

### 15.1 APIs Externas

| Servico | Uso mensal estimado | Custo |
|---------|---------------------|-------|
| Gmail API | ~200 emails lidos + ~100 enviados | Gratuito (quota Google Workspace) |
| Google Drive API | ~200 file uploads + ~50 copies | Gratuito (quota Google Workspace) |
| DocuSeal | ~50 contratos/mes | Gratuito (self-hosted) |
| Claude API (OCR P2) | ~100 NFs/mes * ~$0.01 | ~$1/mes |
| n8n | Self-hosted | Gratuito (VPS ja paga) |

### 15.2 Infraestrutura

| Componente | Custo atual | Mudanca |
|------------|-------------|---------|
| VPS Hetzner | Ja pago | Nenhuma (n8n ja roda la) |
| Supabase | Ja pago | +2 tabelas, ~1K rows/mes |
| Vercel | Ja pago | Nenhuma |

**Custo adicional estimado: ~$1/mes (apenas OCR, P2)**

---

## 16. Metricas de Sucesso

| Metrica | Target | Medicao |
|---------|--------|---------|
| Tempo email NF -> UI | < 10 min | nf_documents.created_at - received_at |
| Taxa de auto-match NFs | > 60% | nf_documents WHERE match_method = 'auto_*' |
| Taxa de validacao manual | < 40% | nf_documents WHERE match_method = 'manual' |
| Contratos DocuSeal enviados/mes | >= 10 | docuseal_submissions COUNT |
| Taxa de assinatura DocuSeal | > 80% | signed / (signed + expired + declined) |
| Tempo pedido NF -> email | < 2 min | integration_events processed_at - created_at |
| PDFs de aprovacao gerados | >= 80% dos jobs aprovados | job_files WHERE file_type = 'aprovacao_interna' |
| NFs em fila pendente | < 10 | nf_documents WHERE status = 'pending_review' |

---

## 17. Evolucoes Futuras (pos-Fase 9)

1. **NF Automatica com OCR + IA:** Auto-preencher nf_number, valor, CNPJ sem intervencao humana (quando confidence > 0.95)
2. **Callsheet Automatica:** Gerar PDF com clima (OpenWeather), transito (Maps), equipe, elenco
3. **Reconciliacao bancaria:** Importar extrato CSV -> match com financial_records -> conciliar
4. **WhatsApp para NF:** Fornecedor envia NF por WhatsApp (foto) -> OCR -> mesmo fluxo
5. **DocuSeal templates dinamicos:** Criar templates no DocuSeal via API baseado em tipo de contrato
6. **Assinatura do PE no contrato:** Assinatura digital do Produtor Executivo automatica
7. **Fluxo de ANCINE:** Preencher formulario ANCINE com dados do job automaticamente
8. **Dashboard NF:** Graficos de NFs pendentes, recebidas, pagas por periodo

---

## Apendice A: Estrutura de Arquivos (prevista)

```
supabase/functions/
  _shared/
    docuseal-client.ts          (NOVO)
    email-template.ts           (NOVO)
    pdf-generator.ts            (NOVO)
    integration-client.ts       (EXPANDIR - novos event_types)
    types.ts                    (EXPANDIR - novos tipos)
    ... (16 modulos existentes)

  nf-processor/                 (NOVA Edge Function)
    index.ts
    handlers/
      ingest.ts
      list.ts
      stats.ts
      validate.ts
      reject.ts
      reassign.ts
      request-send.ts
      request-sent-callback.ts
      upload.ts

  docuseal-integration/         (NOVA Edge Function)
    index.ts
    handlers/
      create-submissions.ts
      list.ts
      templates.ts
      webhook.ts
      resend.ts
      download.ts

  pdf-generator/                (NOVA Edge Function)
    index.ts
    handlers/
      aprovacao-interna.ts
      preview.ts
    templates/
      aprovacao-interna.ts      (template HTML)

  drive-integration/            (EXPANDIR)
    handlers/
      copy-templates.ts         (NOVO handler)

  integration-processor/        (EXPANDIR)
    handlers/
      nf-email-handler.ts       (NOVO handler)
      docuseal-handler.ts       (NOVO handler)
      pdf-handler.ts            (NOVO handler)
      drive-copy-handler.ts     (NOVO handler)

supabase/migrations/
  20260225_fase9_1_nf_docuseal_infrastructure.sql

frontend/src/
  app/(dashboard)/
    financial/
      nf-validation/
        page.tsx
      nf-request/
        page.tsx
  components/
    nf/
      nf-validation-table.tsx
      nf-stats-cards.tsx
      nf-validation-dialog.tsx
      nf-reassign-dialog.tsx
      nf-request-picker.tsx
      nf-email-preview.tsx
    docuseal/
      contracts-tab.tsx
      contracts-list.tsx
      create-contracts-dialog.tsx
      contract-detail-drawer.tsx
    pdf/
      generate-approval-button.tsx
      approval-pdf-preview.tsx
  hooks/
    use-nf-documents.ts
    use-nf-validation.ts
    use-nf-request.ts
    use-docuseal-submissions.ts
    use-pdf-generator.ts

docs/decisions/
  ADR-018-nf-processing-pipeline.md
  ADR-019-docuseal-integration-pattern.md
  ADR-020-pdf-generation-approach.md
  ADR-021-ocr-nf-claude-vision.md
```

## Apendice B: Edge Functions Totais Apos Fase 9

| # | Edge Function | Status | Fase |
|---|--------------|--------|------|
| 1 | jobs | ACTIVE | Fase 2 |
| 2 | jobs-status | ACTIVE | Fase 2 |
| 3 | jobs-team | ACTIVE | Fase 2 |
| 4 | jobs-deliverables | ACTIVE | Fase 2 |
| 5 | jobs-shooting-dates | ACTIVE | Fase 2 |
| 6 | jobs-history | ACTIVE | Fase 2 |
| 7 | notifications | ACTIVE | Fase 5 |
| 8 | tenant-settings | ACTIVE (expandir) | Fase 5 |
| 9 | integration-processor | ACTIVE (expandir) | Fase 5 |
| 10 | drive-integration | ACTIVE (expandir) | Fase 5 |
| 11 | whatsapp | ACTIVE | Fase 5 |
| 12 | allocations | ACTIVE | Fase 6 |
| 13 | approvals | ACTIVE | Fase 6 |
| 14 | dashboard | ACTIVE | Fase 7 |
| 15 | reports | ACTIVE | Fase 7 |
| 16 | client-portal | ACTIVE | Fase 7 |
| 17 | ai-budget-estimate | ACTIVE | Fase 8 |
| 18 | ai-copilot | ACTIVE | Fase 8 |
| 19 | ai-dailies-analysis | ACTIVE | Fase 8 |
| 20 | ai-freelancer-match | ACTIVE | Fase 8 |
| 21 | **nf-processor** | NOVO | **Fase 9** |
| 22 | **docuseal-integration** | NOVO | **Fase 9** |
| 23 | **pdf-generator** | NOVO | **Fase 9** |

**Total: 23 Edge Functions** (20 existentes + 3 novas, 3 expandidas)

## Apendice C: Workflows n8n Totais Apos Fase 9

| # | Workflow | Status | Fase |
|---|---------|--------|------|
| 1 | JOB_FECHADO_CRIACAO | EXISTENTE (nao alterar) | Pre-ELLAHOS |
| 2 | WORKFLOW_PRINCIPAL | EXISTENTE (nao alterar) | Pre-ELLAHOS |
| 3 | TESTE2_JURIDICO_CONTRATO_ELENCO | EXISTENTE (inativo) | Pre-ELLAHOS |
| 4 | wf-job-approved | EXISTENTE (expandir) | Fase 5 |
| 5 | wf-margin-alert | EXISTENTE | Fase 5 |
| 6 | wf-status-change | EXISTENTE | Fase 5 |
| 7 | wf-budget-sent | EXISTENTE | Fase 5 |
| 8 | **wf-nf-processor** | NOVO | **Fase 9** |
| 9 | **wf-nf-request** | NOVO | **Fase 9** |
| 10 | **wf-docuseal-contracts** | NOVO | **Fase 9** |
| 11 | **wf-claquete** | NOVO (P2) | **Fase 9** |

**Total: 11 workflows** (7 existentes + 4 novos)

## Apendice D: Mapa de Dependencias entre Sub-fases

```
9.1 Foundation
 |
 |--- 9.2 NF Recebimento (P0)
 |       |
 |       '--- 9.9 OCR NFs (P2, depende de nf_documents existir)
 |
 |--- 9.3 Pedido NF (P0, independente de 9.2)
 |
 |--- 9.5 DocuSeal (P1)
 |
 |--- 9.6 Drive Templates (P1)
 |
 |--- 9.7 PDF Aprovacao (P1)
 |
 9.4 Job Approved + JOB_FECHADO (P0, independente de 9.1)
 |
 9.8 QA (depende de 9.2-9.7)
 |
 9.9 P2 Features (paralela com 9.8)
```

**Caminho critico P0:** 9.1 -> 9.2 -> 9.3 -> 9.8 (parcial) = ~13-18 dias
**Caminho critico P0+P1:** 9.1 -> [9.2 || 9.5 || 9.6 || 9.7] -> 9.8 = ~18-25 dias
