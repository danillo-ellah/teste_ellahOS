# Onda 2.1 — Atendimento v2: Arquitetura de Implementacao

**Data:** 2026-03-07
**Status:** APROVADO
**Autor:** Tech Lead (Claude Opus 4.6)
**Spec de referencia:** 01-atendimento-v2-spec.md
**Esforco estimado:** 5 sprints (7-8 dias uteis)

---

## 0. Estado Atual — O que ja existe

Antes de definir o plano, e essencial mapear o que ja esta implementado para evitar retrabalho.

### Frontend existente

| Arquivo | O que faz | Reutilizavel? |
|---------|-----------|---------------|
| `/atendimento/page.tsx` | Dashboard com 3 abas: Meus Jobs (tabela), Aprovacoes Pendentes (portal sessions), Comunicacoes (placeholder) | SIM — evoluir, nao reescrever |
| `/atendimento/layout.tsx` | Route guard com `useRouteGuard` + `SIDEBAR_ACCESS['/atendimento']` | SIM — manter como esta |
| `/atendimento/aprovacao-interna/[jobId]/page.tsx` | Documento read-only gerado a partir de dados do job (equipe, entregaveis, financeiro, datas). Sem persistencia propria — le tudo de `useJob()` | PARCIALMENTE — servira de referencia visual, mas a nova Aprovacao Interna (US-2.1.05) e uma entidade persistida com status rascunho/aprovado |
| `useAtendimentoJobs.ts` | Hook que filtra jobs por role (leadership ve tudo, atendimento filtra por job_team). Calcula KPIs locais | SIM — estender com contadores das novas entidades |

### Backend existente

- **Nenhuma tabela de atendimento** existe no banco (GAP-001 confirmado)
- **Nenhuma Edge Function** `attendance` existe
- Pattern de EF consolidado: `receivables/` como referencia (index.ts router + handlers/)
- n8n webhook dispatch via `enqueueEvent` + `integration-processor` ja funciona (workflow `wf-job-approved`, `wf-status-changed`)
- Z-API client funcional para envio de WA
- Notification helper funcional (in-app)

### Job Detail Tabs

A aba de Atendimento sera adicionada ao sistema de tabs existente em `JobDetailTabs.tsx`:
- Nivel 1: grupos (Info, Producao, Gestao, Registro)
- Nivel 2: abas dentro do grupo
- Controle de acesso via `access-control-map.ts` (USER_ROLE_TO_GROUP + TEAM_ROLE_TO_GROUP + ACCESS_MAP)
- Tab ID definido em `constants.ts` (tipo `JobDetailTabId`)

---

## 1. Respostas as Perguntas Abertas

### PA-01: O que existe no MVP de Aprovacao Interna?

**Resposta:** O MVP atual (`/atendimento/aprovacao-interna/[jobId]/page.tsx`) e um **documento read-only gerado em tempo real** a partir dos dados ja existentes na tabela `jobs` (equipe, entregaveis, datas de filmagem, financeiro). Nao ha tabela dedicada. O campo `approved_at` de `jobs` e usado como proxy.

**Decisao:** Criar a tabela `job_internal_approvals` conforme a spec. O documento existente sera descontinuado e substituido pelo novo formulario persistido. A rota `/atendimento/aprovacao-interna/[jobId]` sera removida — a Aprovacao Interna passa a viver exclusivamente dentro da aba Atendimento no job detail. Isso evita duplicidade de rotas e dados.

### PA-02: Quem pode registrar itens de logistica?

**Decisao:** Qualquer membro do job com role `atendimento`, `produtor_executivo`, `coordenador_producao`, `diretor_producao`, `admin`, ou `ceo` pode criar itens em `client_logistics`. O campo `sent_to_client` e gerenciado exclusivamente pelo Atendimento (flag de repasse). Na pratica, a Edge Function valida o role do auth context; o frontend exibe o formulario para quem tem acesso a aba Atendimento.

**Justificativa:** O organograma diz que PE + Dir. Producao + Produtor organizam logistica, e o Atendimento repassa ao cliente. Bloquear INSERT para apenas Atendimento criaria gargalo desnecessario.

### PA-03: Intervalo do lembrete de satisfacao e por tenant ou por job?

**Decisao:** **Ambos.** O campo `satisfaction_reminder_days` na tabela `jobs` tem prioridade. Se NULL, usa o valor do tenant settings. Isso permite um padrao global (ex: 7 dias) com override por job quando necessario (ex: evento = 30 dias).

**Implementacao:** A spec ja define `satisfaction_reminder_days` em `jobs`. Adicionaremos `default_satisfaction_reminder_days` em tenant settings (via UI de configuracoes existente). A EF de lembrete verifica: `job.satisfaction_reminder_days ?? tenant.settings.default_satisfaction_reminder_days ?? 0`.

---

## 2. Sprints

### Sprint 1: Migration + Edge Function CRUD (2 dias)

**Objetivo:** Backend completo — 5 tabelas, 2 campos novos em jobs, EF `attendance` com CRUD para todas as entidades.

| # | Tarefa | Estimativa |
|---|--------|------------|
| 1.1 | Migration: 5 tabelas + 2 campos em jobs + RLS + indices + triggers updated_at | 3h |
| 1.2 | Adicionar `extra_registered` e `extra_decided` ao ENUM `notification_type` (migration) | 30min |
| 1.3 | Edge Function `attendance/` — router index.ts | 1h |
| 1.4 | Handler: `communications/` (list, create, update, delete) | 2h |
| 1.5 | Handler: `scope-items/` (list, create, update, decide) | 2h |
| 1.6 | Handler: `logistics/` (list, create, update) | 1.5h |
| 1.7 | Handler: `internal-approval/` (get, upsert, approve) | 1.5h |
| 1.8 | Handler: `milestones/` (list, create, update) | 1.5h |
| 1.9 | Handler: `dashboard-counts/` (contagens agregadas por job) | 1h |
| 1.10 | Deploy EF + testar com curl | 30min |

**Entregavel:** EF `attendance` deployada, todas as rotas testadas via curl.

### Sprint 2: Frontend — Aba Atendimento no Job Detail (2 dias)

**Objetivo:** Aba funcional dentro do job detail com as 5 sub-secoes.

| # | Tarefa | Estimativa |
|---|--------|------------|
| 2.1 | Tipos TypeScript: `attendance.ts` (interfaces para as 5 entidades) | 30min |
| 2.2 | Query keys: `attendanceKeys` no `query-keys.ts` | 15min |
| 2.3 | Hook: `useAttendance.ts` (queries + mutations para as 5 entidades) | 1.5h |
| 2.4 | Registrar nova tab `atendimento` em constants + access-control-map + JobDetailTabs | 1h |
| 2.5 | Componente: `TabAtendimento` (container com 5 sub-secoes) | 30min |
| 2.6 | Sub-secao: `InternalApprovalSection` (formulario + status + approve) | 2h |
| 2.7 | Sub-secao: `CommunicationLogSection` (lista + form + busca) | 2h |
| 2.8 | Sub-secao: `ScopeExtrasSection` (lista + form + decisao CEO) | 2h |
| 2.9 | Sub-secao: `ClientLogisticsSection` (lista + form + semaforo) | 1.5h |
| 2.10 | Sub-secao: `ClientMilestonesSection` (lista + form + alertas) | 1.5h |

**Entregavel:** Aba Atendimento funcional em /jobs/[id]?tab=atendimento.

### Sprint 3: Dashboard Atendimento v2 + Extras Pendentes CEO (1.5 dias)

**Objetivo:** Evoluir o dashboard /atendimento com contadores reais e criar a secao de extras pendentes para o CEO.

| # | Tarefa | Estimativa |
|---|--------|------------|
| 3.1 | Evoluir `useAtendimentoJobs` para buscar contadores reais via `attendance/dashboard-counts` | 1.5h |
| 3.2 | Redesenhar KPI cards com novos contadores: extras pendentes, logistica pendente, acoes atrasadas | 1h |
| 3.3 | Card de job com badges de pendencias por categoria + link direto para aba atendimento | 1.5h |
| 3.4 | Filtros: status do job, cliente, toggle historico | 1h |
| 3.5 | Secao Extras Pendentes CEO no dashboard principal (`/`) — `CeoPendingExtras` | 2h |
| 3.6 | Acoes inline na lista do CEO (aprovar/cobrar/recusar) com invalidacao de queries | 1.5h |
| 3.7 | Remover rota `/atendimento/aprovacao-interna/[jobId]` (substituida pela aba) | 15min |

**Entregavel:** Dashboard funcional com metricas reais, CEO decide extras sem sair do dashboard.

### Sprint 4: Integracao n8n + Notificacoes (1 dia)

**Objetivo:** Notificacao WA ao CEO quando extra e registrado, notificacao in-app quando CEO decide.

| # | Tarefa | Estimativa |
|---|--------|------------|
| 4.1 | No handler `scope-items/create`: enfileirar `n8n_webhook` com workflow `wf-extra-registered` + criar notificacao in-app para CEO | 1h |
| 4.2 | No handler `scope-items/decide`: criar notificacao in-app para o Atendimento que registrou o extra | 1h |
| 4.3 | Configurar webhook key `extra_registered` em tenant settings (n8n) | 15min |
| 4.4 | Criar workflow n8n: recebe webhook → envia WA ao CEO via Z-API | 2h |
| 4.5 | Testes E2E: registrar extra → verificar WA + notificacao | 1h |

**Entregavel:** Fluxo extra → WA ao CEO funcional.

### Sprint 5: Polish + Could Haves + QA (1 dia)

**Objetivo:** Responsividade mobile, lembrete de satisfacao, QA.

| # | Tarefa | Estimativa |
|---|--------|------------|
| 5.1 | Responsividade mobile em todas as telas novas | 1.5h |
| 5.2 | Dark mode review | 30min |
| 5.3 | US-2.1.07: campo satisfaction_reminder_days na UI de settings do tenant | 1h |
| 5.4 | US-2.1.07: logica no handler de status change (job encerrado → enfileirar n8n com delay) | 1h |
| 5.5 | QA cruzado: verificar criterios de done da spec | 2h |
| 5.6 | Fix de issues encontrados no QA | 2h |

**Entregavel:** Modulo completo, testado, pronto para deploy.

---

## 3. Migration

Uma unica migration idempotente: `20260308100000_onda_2_1_attendance_module.sql`

### 3.1 ENUMs (como CHECK constraints, nao tipos ENUM do Postgres)

Decisao: usar CHECK constraints com texto ao inves de criar tipos ENUM. Motivo: ENUMs do Postgres sao dificeis de alterar (ADD VALUE em transaction); CHECK constraints sao simples de evoluir.

### 3.2 Tabelas

```sql
-- =============================================
-- Onda 2.1: Modulo de Atendimento
-- 5 tabelas novas + 2 campos em jobs
-- Idempotente: IF NOT EXISTS em tudo
-- =============================================

-- 1. client_communications
CREATE TABLE IF NOT EXISTS public.client_communications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_type text NOT NULL
    CHECK (entry_type IN ('decisao','alteracao','informacao','aprovacao','satisfacao_automatica','outro')),
  channel text NOT NULL
    CHECK (channel IN ('whatsapp','email','reuniao','telefone','presencial','sistema')),
  description text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_client_communications_tenant_job_date
  ON public.client_communications (tenant_id, job_id, entry_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_communications_tenant_job
  ON public.client_communications (tenant_id, job_id)
  WHERE deleted_at IS NULL;

-- 2. scope_items
CREATE TABLE IF NOT EXISTS public.scope_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  description text NOT NULL,
  is_extra boolean NOT NULL DEFAULT false,
  origin_channel text
    CHECK (origin_channel IS NULL OR origin_channel IN ('whatsapp','email','reuniao','telefone','presencial')),
  requested_at date,
  extra_status text
    CHECK (extra_status IS NULL OR extra_status IN ('pendente_ceo','aprovado_gratuito','cobrar_aditivo','recusado')),
  ceo_decision_by uuid REFERENCES public.profiles(id),
  ceo_decision_at timestamptz,
  ceo_notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  -- Quando is_extra=true, requested_at e obrigatorio
  CONSTRAINT chk_extra_requires_requested_at
    CHECK (NOT is_extra OR requested_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_scope_items_tenant_job_extra
  ON public.scope_items (tenant_id, job_id, is_extra, extra_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_scope_items_pending_ceo
  ON public.scope_items (tenant_id, extra_status)
  WHERE is_extra = true AND extra_status = 'pendente_ceo' AND deleted_at IS NULL;

-- 3. client_logistics
CREATE TABLE IF NOT EXISTS public.client_logistics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  item_type text NOT NULL
    CHECK (item_type IN ('passagem_aerea','hospedagem','transfer','alimentacao','outro')),
  description text NOT NULL,
  scheduled_date date,
  responsible_name text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','confirmado','cancelado')),
  sent_to_client boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_client_logistics_tenant_job_status
  ON public.client_logistics (tenant_id, job_id, status, scheduled_date)
  WHERE deleted_at IS NULL;

-- 4. job_internal_approvals (UNIQUE por job_id, sem soft delete)
CREATE TABLE IF NOT EXISTS public.job_internal_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','aprovado')),
  scope_description text,
  team_description text,
  shooting_dates_confirmed boolean NOT NULL DEFAULT false,
  approved_budget numeric(15,2),
  deliverables_description text,
  notes text,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_internal_approval_job UNIQUE (job_id)
);

-- 5. client_milestones
CREATE TABLE IF NOT EXISTS public.client_milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  description text NOT NULL,
  due_date date NOT NULL,
  responsible_name text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','concluido','atrasado','cancelado')),
  notes text,
  completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_client_milestones_tenant_job_status
  ON public.client_milestones (tenant_id, job_id, status, due_date)
  WHERE deleted_at IS NULL;

-- 6. Campos novos em jobs (US-2.1.07)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
      AND column_name = 'satisfaction_reminder_days'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN satisfaction_reminder_days integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
      AND column_name = 'satisfaction_sent_at'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN satisfaction_sent_at timestamptz;
  END IF;
END
$$;

-- 7. Triggers updated_at (reutiliza funcao existente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_client_communications'
  ) THEN
    CREATE TRIGGER set_updated_at_client_communications
      BEFORE UPDATE ON public.client_communications
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_scope_items'
  ) THEN
    CREATE TRIGGER set_updated_at_scope_items
      BEFORE UPDATE ON public.scope_items
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_client_logistics'
  ) THEN
    CREATE TRIGGER set_updated_at_client_logistics
      BEFORE UPDATE ON public.client_logistics
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_job_internal_approvals'
  ) THEN
    CREATE TRIGGER set_updated_at_job_internal_approvals
      BEFORE UPDATE ON public.job_internal_approvals
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_client_milestones'
  ) THEN
    CREATE TRIGGER set_updated_at_client_milestones
      BEFORE UPDATE ON public.client_milestones
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;
```

### 3.3 RLS Policies

```sql
-- RLS em todas as 5 tabelas
ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_internal_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_milestones ENABLE ROW LEVEL SECURITY;

-- Padrao do projeto: SELECT/INSERT/UPDATE com tenant_id do JWT
-- Usando get_tenant_id() helper existente (extraido via auth.uid() → profiles → tenant_id)
-- DELETE bloqueado via RLS (soft delete para 4 tabelas; job_internal_approvals nao tem delete)

-- client_communications
CREATE POLICY "cc_select" ON public.client_communications
  FOR SELECT USING (tenant_id = public.get_tenant_id());
CREATE POLICY "cc_insert" ON public.client_communications
  FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "cc_update" ON public.client_communications
  FOR UPDATE USING (tenant_id = public.get_tenant_id());

-- scope_items
CREATE POLICY "si_select" ON public.scope_items
  FOR SELECT USING (tenant_id = public.get_tenant_id());
CREATE POLICY "si_insert" ON public.scope_items
  FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "si_update" ON public.scope_items
  FOR UPDATE USING (tenant_id = public.get_tenant_id());

-- client_logistics
CREATE POLICY "cl_select" ON public.client_logistics
  FOR SELECT USING (tenant_id = public.get_tenant_id());
CREATE POLICY "cl_insert" ON public.client_logistics
  FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "cl_update" ON public.client_logistics
  FOR UPDATE USING (tenant_id = public.get_tenant_id());

-- job_internal_approvals
CREATE POLICY "jia_select" ON public.job_internal_approvals
  FOR SELECT USING (tenant_id = public.get_tenant_id());
CREATE POLICY "jia_insert" ON public.job_internal_approvals
  FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "jia_update" ON public.job_internal_approvals
  FOR UPDATE USING (tenant_id = public.get_tenant_id());

-- client_milestones
CREATE POLICY "cm_select" ON public.client_milestones
  FOR SELECT USING (tenant_id = public.get_tenant_id());
CREATE POLICY "cm_insert" ON public.client_milestones
  FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "cm_update" ON public.client_milestones
  FOR UPDATE USING (tenant_id = public.get_tenant_id());
```

### 3.4 Notification types (migration separada ou no mesmo arquivo)

```sql
-- Adicionar novos tipos de notificacao se nao existirem
DO $$
BEGIN
  -- Verificar se o ENUM ja tem os valores
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'extra_registered'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'extra_registered';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'extra_decided'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'extra_decided';
  END IF;
END
$$;
```

---

## 4. Edge Function: `attendance`

### 4.1 Estrutura de arquivos

```
supabase/functions/attendance/
  index.ts                          -- Router principal
  handlers/
    communications-list.ts          -- GET /?job_id=X
    communications-create.ts        -- POST /communications
    communications-update.ts        -- PATCH /communications/:id
    communications-delete.ts        -- DELETE /communications/:id
    scope-items-list.ts             -- GET /scope-items?job_id=X
    scope-items-create.ts           -- POST /scope-items
    scope-items-decide.ts           -- PATCH /scope-items/:id/decide
    logistics-list.ts               -- GET /logistics?job_id=X
    logistics-create.ts             -- POST /logistics
    logistics-update.ts             -- PATCH /logistics/:id
    internal-approval-get.ts        -- GET /internal-approval?job_id=X
    internal-approval-upsert.ts     -- PUT /internal-approval
    internal-approval-approve.ts    -- POST /internal-approval/:id/approve
    milestones-list.ts              -- GET /milestones?job_id=X
    milestones-create.ts            -- POST /milestones
    milestones-update.ts            -- PATCH /milestones/:id
    dashboard-counts.ts             -- GET /dashboard-counts?job_ids=X,Y,Z
    pending-extras.ts               -- GET /pending-extras (cross-job, para CEO)
```

### 4.2 Router (index.ts)

Pattern identico ao `receivables/index.ts`:

```typescript
// Segmentos apos /attendance:
// /communications              → list (GET), create (POST)
// /communications/:id          → update (PATCH), delete (DELETE)
// /scope-items                 → list (GET), create (POST)
// /scope-items/:id/decide      → decide (PATCH)
// /logistics                   → list (GET), create (POST)
// /logistics/:id               → update (PATCH)
// /internal-approval           → get (GET), upsert (PUT)
// /internal-approval/:id/approve → approve (POST)
// /milestones                  → list (GET), create (POST)
// /milestones/:id              → update (PATCH)
// /dashboard-counts            → counts (GET)
// /pending-extras              → pending extras cross-job (GET)

const NAMED_ROUTES = new Set([
  'communications', 'scope-items', 'logistics',
  'internal-approval', 'milestones',
  'dashboard-counts', 'pending-extras',
]);
```

### 4.3 Contratos de API

#### GET /attendance/communications?job_id=X&search=texto&entry_type=decisao&page=1&per_page=20

**Roles:** atendimento, ceo, produtor_executivo, admin, coordenador
**Response:**
```json
{
  "data": [{
    "id": "uuid",
    "job_id": "uuid",
    "entry_date": "2026-03-07",
    "entry_type": "decisao",
    "channel": "whatsapp",
    "description": "Cliente confirmou locacao X",
    "created_by": "uuid",
    "created_by_name": "Maria Silva",
    "created_at": "2026-03-07T10:00:00Z"
  }],
  "meta": { "total": 42, "page": 1, "per_page": 20, "total_pages": 3 }
}
```

#### POST /attendance/communications

**Body:**
```json
{
  "job_id": "uuid",
  "entry_date": "2026-03-07",
  "entry_type": "decisao",
  "channel": "whatsapp",
  "description": "Texto obrigatorio"
}
```

#### POST /attendance/scope-items

**Body (extra):**
```json
{
  "job_id": "uuid",
  "description": "Cliente pediu mais 2 filmes de 30s",
  "is_extra": true,
  "origin_channel": "whatsapp",
  "requested_at": "2026-03-07"
}
```
**Side effects quando is_extra=true:**
1. `extra_status` setado para `pendente_ceo` automaticamente
2. `enqueueEvent` com `event_type: 'n8n_webhook'`, `payload: { workflow: 'wf-extra-registered', job_id, job_code, description }`
3. `createNotification` para CEO com `type: 'extra_registered'`

#### PATCH /attendance/scope-items/:id/decide

**Roles:** ceo, produtor_executivo, admin
**Body:**
```json
{
  "extra_status": "aprovado_gratuito",
  "ceo_notes": "Absorvemos como cortesia"
}
```
**Side effects:**
1. Seta `ceo_decision_by`, `ceo_decision_at`
2. `createNotification` para o `created_by` do scope_item com `type: 'extra_decided'`

#### GET /attendance/dashboard-counts?job_ids=uuid1,uuid2,uuid3

**Response:**
```json
{
  "data": {
    "uuid1": {
      "pending_extras": 2,
      "pending_logistics": 1,
      "overdue_milestones": 0,
      "missing_internal_approval": true
    },
    "uuid2": {
      "pending_extras": 0,
      "pending_logistics": 0,
      "overdue_milestones": 3,
      "missing_internal_approval": false
    }
  }
}
```

**Implementacao:** Uma unica query SQL com subqueries correlacionadas (sem N+1):

```sql
SELECT
  j.id AS job_id,
  COALESCE(si.cnt, 0) AS pending_extras,
  COALESCE(cl.cnt, 0) AS pending_logistics,
  COALESCE(cm.cnt, 0) AS overdue_milestones,
  (ia.id IS NULL OR ia.status = 'rascunho') AS missing_internal_approval
FROM unnest($1::uuid[]) AS j(id)
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM scope_items
  WHERE job_id = j.id AND is_extra = true AND extra_status = 'pendente_ceo'
    AND deleted_at IS NULL AND tenant_id = $2
) si ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM client_logistics
  WHERE job_id = j.id AND status = 'pendente'
    AND scheduled_date <= CURRENT_DATE + 7
    AND deleted_at IS NULL AND tenant_id = $2
) cl ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS cnt FROM client_milestones
  WHERE job_id = j.id AND status = 'pendente' AND due_date < CURRENT_DATE
    AND deleted_at IS NULL AND tenant_id = $2
) cm ON true
LEFT JOIN job_internal_approvals ia
  ON ia.job_id = j.id AND ia.tenant_id = $2
```

Nota: como o Supabase client nao suporta queries SQL raw facilmente, isso sera implementado como uma RPC (funcao Postgres) ou decomposto em queries paralelas por tabela com `Promise.all`. Decisao: **usar queries paralelas** (4x `Promise.all`) para manter compatibilidade com RLS e evitar criar RPCs.

#### GET /attendance/pending-extras

**Roles:** ceo, produtor_executivo, admin
**Response:** Lista global de extras com status `pendente_ceo` de jobs ativos.
```json
{
  "data": [{
    "id": "uuid",
    "job_id": "uuid",
    "job_code": "041",
    "job_title": "Campanha Verao",
    "description": "2 filmes extras de 30s",
    "origin_channel": "whatsapp",
    "requested_at": "2026-03-05",
    "days_pending": 2,
    "created_by_name": "Ana Costa"
  }]
}
```

#### PUT /attendance/internal-approval

**Semantica:** Upsert — cria se nao existe, atualiza se existe (ja que e 1 por job).
**Body:**
```json
{
  "job_id": "uuid",
  "scope_description": "Campanha digital com 3 filmes...",
  "team_description": "Diretor: X, DOP: Y...",
  "shooting_dates_confirmed": true,
  "approved_budget": 150000.00,
  "deliverables_description": "3x filme 30s, 6x still",
  "notes": "Observacoes"
}
```
**Nota:** Usa `ON CONFLICT (job_id) DO UPDATE` no INSERT para garantir idempotencia.

#### POST /attendance/internal-approval/:id/approve

**Roles:** ceo, produtor_executivo, admin
**Validacao:** `scope_description` e `approved_budget` devem estar preenchidos.
**Side effect:** Seta `status = 'aprovado'`, `approved_by = auth.userId`, `approved_at = now()`.

---

## 5. Frontend — Componentes e Organizacao

### 5.1 Arquivos novos

```
frontend/src/
  types/
    attendance.ts                           -- Interfaces das 5 entidades
  lib/
    query-keys.ts                           -- Adicionar attendanceKeys
  hooks/
    useAttendance.ts                        -- Queries + mutations (TanStack Query v5)
  components/
    job-detail/tabs/
      TabAtendimento.tsx                    -- Container da aba com 5 secoes
      attendance/
        InternalApprovalSection.tsx          -- Card de aprovacao interna
        InternalApprovalForm.tsx             -- Dialog de edicao
        CommunicationLogSection.tsx          -- Lista + busca
        CommunicationEntryDialog.tsx         -- Dialog de criacao/edicao
        ScopeExtrasSection.tsx               -- Lista + botao registrar extra
        ScopeExtraDialog.tsx                 -- Dialog para novo extra
        ScopeExtraDecisionDialog.tsx         -- Dialog para CEO decidir
        ClientLogisticsSection.tsx           -- Lista com semaforo
        ClientLogisticsDialog.tsx            -- Dialog de criacao/edicao
        ClientMilestonesSection.tsx          -- Lista com alertas
        ClientMilestoneDialog.tsx            -- Dialog de criacao/edicao
    dashboard/
      CeoPendingExtras.tsx                  -- Bloco de extras pendentes no dashboard CEO
```

### 5.2 Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `frontend/src/lib/constants.ts` | Adicionar `'atendimento'` ao tipo `JobDetailTabId`. Adicionar tab no grupo `Gestao` (ou criar grupo `Atendimento`). Adicionar icone `Headset` ao ICON_MAP. |
| `frontend/src/lib/access-control-map.ts` | Adicionar `'atendimento'` ao mapa de acesso. Grupos `admin`, `pe`, `atd` = `view_edit`. Grupos `coord` = `view`. Demais = `hidden`. |
| `frontend/src/lib/query-keys.ts` | Adicionar `attendanceKeys` |
| `frontend/src/components/job-detail/JobDetailTabs.tsx` | Importar `TabAtendimento`, adicionar `TabsContent` e icone `Headset` |
| `frontend/src/app/(dashboard)/atendimento/page.tsx` | Evoluir dashboard com contadores reais |
| `frontend/src/hooks/useAtendimentoJobs.ts` | Integrar com `attendance/dashboard-counts` |
| `frontend/src/app/(dashboard)/page.tsx` (dashboard principal) | Adicionar `CeoPendingExtras` para roles ceo/pe/admin |

### 5.3 Decisao: Grupo de tab para Atendimento

Criar um novo grupo `Atendimento` com area propria ao inves de inserir no grupo Gestao. Motivo: a aba Atendimento agrupa funcionalidades distintas (comunicacao, escopo, logistica) que nao sao "gestao financeira". Visualmente, o grupo tera cor distinta (amber/laranja).

```typescript
// Novo grupo em JOB_TAB_GROUPS:
{
  group: 'Atendimento',
  area: 'atendimento',  // nova area
  tabs: [
    { id: 'atendimento', label: 'Atendimento', icon: 'Headset' },
  ],
},

// Novo AREA_CONFIG:
atendimento: {
  bgClass: 'bg-amber-500/10',
  textClass: 'text-amber-700 dark:text-amber-400',
  dotClass: 'bg-amber-500',
},
```

### 5.4 Tipo attendanceKeys

```typescript
export const attendanceKeys = {
  all: ['attendance'] as const,
  communications: (jobId: string) => [...attendanceKeys.all, 'communications', jobId] as const,
  communicationList: (jobId: string, filters: Record<string, string>) =>
    [...attendanceKeys.communications(jobId), filters] as const,
  scopeItems: (jobId: string) => [...attendanceKeys.all, 'scope-items', jobId] as const,
  logistics: (jobId: string) => [...attendanceKeys.all, 'logistics', jobId] as const,
  internalApproval: (jobId: string) => [...attendanceKeys.all, 'internal-approval', jobId] as const,
  milestones: (jobId: string) => [...attendanceKeys.all, 'milestones', jobId] as const,
  dashboardCounts: (jobIds: string[]) => [...attendanceKeys.all, 'dashboard-counts', jobIds] as const,
  pendingExtras: () => [...attendanceKeys.all, 'pending-extras'] as const,
}
```

### 5.5 Hook useAttendance

Pattern identico ao `useReceivables.ts`: hooks separados por entidade, cada um com query + mutation.

```typescript
// useCommunications(jobId) → { data, isLoading, ... }
// useCreateCommunication() → mutation
// useScopeItems(jobId) → { data, isLoading, ... }
// useCreateScopeItem() → mutation (invalida pendingExtras tambem)
// useDecideScopeItem() → mutation
// useClientLogistics(jobId) → { data, isLoading, ... }
// useCreateLogistics() → mutation
// useUpdateLogistics() → mutation
// useInternalApproval(jobId) → { data, isLoading, ... }
// useUpsertInternalApproval() → mutation
// useApproveInternalApproval() → mutation
// useClientMilestones(jobId) → { data, isLoading, ... }
// useCreateMilestone() → mutation
// useUpdateMilestone() → mutation
// useAttendanceDashboardCounts(jobIds) → { data, isLoading, ... }
// usePendingExtras() → { data, isLoading, ... } (CEO)
```

---

## 6. Integracao n8n — Notificacao de Extras

### 6.1 Fluxo

```
[Atendimento registra extra no EllaOS]
  → POST /attendance/scope-items { is_extra: true }
    → Handler cria row com extra_status = 'pendente_ceo'
    → Handler chama enqueueEvent({
        event_type: 'n8n_webhook',
        payload: {
          workflow: 'wf-extra-registered',
          job_id, job_code, job_title,
          extra_description, origin_channel,
          requested_at, registered_by_name
        }
      })
    → Handler cria notificacao in-app para CEO
  → integration-processor pega evento da fila
    → n8n-handler.ts resolve webhook key: 'extra_registered'
    → POST para n8n URL configurada em tenant.settings.integrations.n8n.webhooks.extra_registered
  → [n8n workflow]
    → Recebe payload
    → Monta mensagem WA
    → Envia via Z-API para numero do CEO (configurado no n8n ou no payload)
  → [CEO recebe WA em < 1 minuto]
```

### 6.2 Configuracao necessaria em tenant settings

Adicionar nova chave no JSON `settings.integrations.n8n.webhooks`:

```json
{
  "integrations": {
    "n8n": {
      "enabled": true,
      "webhooks": {
        "job_approved": "https://ia.ellahfilmes.com/webhook/...",
        "status_changed": "https://ia.ellahfilmes.com/webhook/...",
        "extra_registered": "https://ia.ellahfilmes.com/webhook/NEW_WEBHOOK_URL"
      }
    }
  }
}
```

### 6.3 Workflow n8n (a ser criado na VPS)

Trigger: Webhook → Node 1: Set message template → Node 2: Z-API send text.

Mensagem template:
```
*[{job_code}] Extra de Escopo Registrado*

Job: {job_title}
Extra: {extra_description}
Canal de origem: {origin_channel}
Registrado por: {registered_by_name}
Data: {requested_at}

Acesse o EllaOS para decidir:
https://teste-ellah-os.vercel.app/jobs/{job_id}?tab=atendimento
```

### 6.4 Lembrete de satisfacao (Could Have)

Fluxo similar mas com delay:

```
[Job muda para status 'encerrado']
  → Handler de status change verifica satisfaction_reminder_days
  → Se > 0, enqueueEvent com workflow: 'wf-satisfaction-reminder'
    payload inclui: delay_days, contact_phone, contact_name, job_code
  → n8n workflow:
    → Webhook recebe
    → Wait node (delay_days dias)
    → Z-API envia mensagem de satisfacao
    → Callback POST /attendance/communications (satisfacao_automatica)
```

---

## 7. Riscos e Mitigacoes

### R1: Performance do dashboard-counts com muitos jobs

**Risco:** Se o tenant tem 50+ jobs ativos, a chamada `dashboard-counts` com 50 UUIDs pode ser lenta.

**Mitigacao:** Implementar com 4 queries paralelas (`Promise.all`), cada uma com filtro `job_id IN (...)`. Indices parciais ja cobrem os filtros (criados na migration). Se necessario no futuro, criar RPC materializada.

### R2: Conflito entre Aprovacao Interna antiga e nova

**Risco:** Duas rotas/UIs para o mesmo conceito durante a transicao.

**Mitigacao:** Sprint 3 remove a rota antiga (`/atendimento/aprovacao-interna/[jobId]`). O link que existia na tabela de jobs do dashboard sera redirecionado para a aba atendimento no job detail.

### R3: Notification type ENUM nao aceita ADD VALUE em transaction

**Risco:** Migration pode falhar se o ADD VALUE estiver dentro de uma transaction.

**Mitigacao:** Usar `ADD VALUE IF NOT EXISTS` que pode rodar fora de transaction. Se necessario, migration separada para o ALTER TYPE.

### R4: Webhook n8n nao configurado

**Risco:** Tenant nao configurou a URL `extra_registered` no settings.

**Mitigacao:** O `n8n-handler.ts` ja lanca erro quando webhook URL nao esta configurada. O evento vai para `failed` no integration_events com mensagem clara. A notificacao in-app para o CEO funciona independente do WA. Alem disso, o handler de `scope-items/create` faz o `enqueueEvent` em try/catch — falha no enqueue nao impede a criacao do scope_item.

### R5: Soft delete vs RLS DELETE

**Risco:** Alguem tenta DELETE real ao inves de soft delete.

**Mitigacao:** RLS nao inclui policy de DELETE para as 4 tabelas com soft delete. O handler de delete faz UPDATE com `deleted_at = now()`. Para `job_internal_approvals` nao ha delete de nenhum tipo (spec explicita).

---

## 8. Decisoes Arquiteturais (ADR resumido)

| # | Decisao | Justificativa |
|---|---------|---------------|
| D1 | CHECK constraints ao inves de ENUM types para os novos campos | ENUMs do Postgres sao dificeis de evoluir (ADD VALUE nao funciona em transaction). CHECK constraints sao alteraveis com ALTER TABLE trivial. |
| D2 | Uma Edge Function `attendance` com sub-rotas ao inves de 5 EFs separadas | Reduz cold starts (1 function vs 5). Pattern consistente com `receivables/`. Facilita deploy e cors. |
| D3 | Dashboard counts via 4 queries paralelas ao inves de RPC | Mantem compatibilidade com RLS (RPC precisaria de SECURITY DEFINER). Indices parciais garantem performance. |
| D4 | Upsert para internal-approval ao inves de create+update separados | Simplifica o frontend (nao precisa verificar se ja existe). `ON CONFLICT (job_id) DO UPDATE` e atomico e idempotente. |
| D5 | Novo grupo de tab "Atendimento" ao inves de inserir no grupo Gestao | Separacao semantica clara. Cor propria (amber) diferencia visualmente. Escalavel para futuras tabs de atendimento. |
| D6 | Remover rota /atendimento/aprovacao-interna/[jobId] | Evita duplicidade. A Aprovacao Interna vive exclusivamente dentro da aba do job detail, que e mais contextual. |
| D7 | satisfaction_reminder_days em jobs com fallback para tenant settings | Flexibilidade por job sem perder o padrao global. |
| D8 | Logistica pode ser criada por qualquer role com acesso a aba | Evita gargalo no Atendimento. O flag sent_to_client e o diferenciador de quem repassou. |

---

## 9. Checklist de Verificacao Pre-Implementacao

Antes de iniciar cada sprint, verificar:

- [ ] Migration: funcao `set_updated_at()` ja existe no banco (usada pelos triggers)
- [ ] Migration: funcao `get_tenant_id()` ja existe (usada pelas RLS policies)
- [ ] Migration: tipo `notification_type` existe como ENUM (para ADD VALUE)
- [ ] Frontend: `Headset` icon ja esta disponivel no lucide-react
- [ ] Frontend: `AreaType` em constants.ts aceita string literal customizado
- [ ] n8n: VPS acessivel e Z-API funcional para testes

---

*Documento gerado em 2026-03-07. Baseado na analise completa do codebase existente (60+ tabelas, 45+ Edge Functions, frontend Next.js 16) e nos patterns consolidados do projeto.*
