# Arquitetura: Fase 6 -- Gestao de Equipe + Aprovacoes

**Data:** 19/02/2026
**Status:** Em revisao
**Autor:** Tech Lead -- ELLAHOS
**Spec de referencia:** docs/specs/fase-6-equipe-aprovacoes.md

---

## 1. Visao Geral

A Fase 6 entrega dois sistemas complementares:

**Alocacoes e Calendario de Equipe:** Adiciona dimensao temporal a tabela `job_team` existente via tabela `allocations`. Permite registrar periodos de alocacao, detectar conflitos de agenda entre jobs, e visualizar um calendario Gantt simplificado. A deteccao de conflitos e um WARNING, nunca um bloqueio.

**Aprovacoes Formais de Conteudo:** Sistema paralelo e independente da aprovacao comercial existente (campo `approval_type` em `jobs`). Permite criar solicitacoes de aprovacao com 5 tipos (briefing, orcamento detalhado, corte, finalizacao, entrega), aprovar internamente ou via link publico (token UUID com validade de 30 dias), e manter audit trail imutavel.

### Posicao na Arquitetura

```
[Jobs Module] (existente)
    |
    +--- [job_team] (existente)
    |        |
    |        +--- [allocations] (NOVO) --- deteccao de conflito
    |
    +--- [approval_requests] (NOVO) --- aprovacoes de conteudo
    |        |
    |        +--- [approval_logs] (NOVO) --- audit trail imutavel
    |
    +--- [approval_type/approved_at] --- aprovacao comercial (NAO alterado)
```

### Principios

- Conflito ALERTA, nunca bloqueia (decisao do CEO -- RN-601)
- Aprovacoes de conteudo sao INDEPENDENTES da aprovacao comercial
- Tabela `approval_logs` e IMUTAVEL (somente INSERT)
- Endpoint publico `/approve/[token]` NAO requer autenticacao
- Deteccao de conflito SOMENTE dentro do mesmo tenant (RN-606)
- Datas de alocacao sao OPCIONAIS para compatibilidade retroativa (RN-603)

### Decisoes sobre Perguntas Abertas da Spec

As perguntas P1--P8 da spec serao tratadas com pragmatismo:

| Pergunta | Decisao | Justificativa |
|----------|---------|---------------|
| P1 (email vs WhatsApp) | Somente WhatsApp na v1 | 100% dos clientes da Ellah usam WhatsApp. Email fica para v2 se necessario. |
| P2 (branding pagina publica) | Logo neutro ELLAHOS | Evita campo de upload de logo no tenant. Simples e suficiente para v1. |
| P3 (permissoes por role) | Qualquer usuario autenticado do tenant | RBAC granular nao esta implementado ainda. Revisitar quando existir modulo de permissoes. |
| P4 (limite de aprovacoes) | Ilimitado | Sem necessidade de limite. Se precisar, adicionar CHECK constraint depois. |
| P5 (aprovacao orcamento vs financeiro) | Puramente documental | NAO altera status no modulo financeiro. Registro para auditoria apenas. |
| P6 (versoes de corte) | Nova solicitacao | Cada rodada de aprovacao de corte e uma nova solicitacao. Simples e rastreavel. |
| P7 (notificacao de conflito confirmado) | Sem notificacao automatica v1 | Conflito fica visivel no calendario e no banner. Notificacao push seria over-engineering. |
| P8 (shooting dates no calendario) | Exibir como marcadores visuais | Shooting dates aparecem como marcadores (pontos/linhas) no calendario, mas NAO entram no algoritmo de conflito. |

---

## 2. Schema do Banco de Dados

### 2.1 Migration 015: Tabelas Novas

Tres tabelas novas seguindo convencoes do projeto.

```sql
-- ============================================================
-- Migration 015: Fase 6 -- allocations, approval_requests, approval_logs
-- Idempotente: sim (IF NOT EXISTS, DROP IF EXISTS, CREATE OR REPLACE)
-- ============================================================
SET search_path = public;

-- ----------------------------------------------------------
-- 2.1.1 allocations
-- Periodos de alocacao de pessoas em jobs. Complementa job_team
-- com dimensao temporal para deteccao de conflitos.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id           UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  people_id        UUID        NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  job_team_id      UUID        REFERENCES job_team(id) ON DELETE SET NULL,
  allocation_start DATE        NOT NULL,
  allocation_end   DATE        NOT NULL,
  notes            TEXT,
  created_by       UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,

  CONSTRAINT chk_allocations_dates CHECK (allocation_end >= allocation_start)
);

COMMENT ON TABLE allocations IS 'Periodos de alocacao de membros de equipe em jobs. Fonte de verdade para deteccao de conflitos.';

-- ----------------------------------------------------------
-- 2.1.2 approval_requests
-- Solicitacoes de aprovacao de conteudo. Sistema paralelo a
-- aprovacao comercial existente (campo approval_type em jobs).
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_requests (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id               UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  approval_type        TEXT        NOT NULL,
  title                TEXT        NOT NULL,
  description          TEXT,
  file_url             TEXT,
  status               TEXT        NOT NULL DEFAULT 'pending',
  token                UUID        NOT NULL DEFAULT gen_random_uuid(),
  expires_at           TIMESTAMPTZ NOT NULL,
  approver_type        TEXT        NOT NULL,
  approver_email       TEXT,
  approver_people_id   UUID        REFERENCES people(id) ON DELETE SET NULL,
  approver_phone       TEXT,
  approved_at          TIMESTAMPTZ,
  rejection_reason     TEXT,
  approved_ip          TEXT,
  created_by           UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ,

  -- Tipo de aprovacao: 5 valores validos
  CONSTRAINT chk_approval_requests_type CHECK (
    approval_type IN ('briefing', 'orcamento_detalhado', 'corte', 'finalizacao', 'entrega')
  ),

  -- Status: 4 valores validos
  CONSTRAINT chk_approval_requests_status CHECK (
    status IN ('pending', 'approved', 'rejected', 'expired')
  ),

  -- Tipo de aprovador: externo ou interno
  CONSTRAINT chk_approval_requests_approver_type CHECK (
    approver_type IN ('external', 'internal')
  ),

  -- Aprovador externo DEVE ter email
  CONSTRAINT chk_approval_requests_external_email CHECK (
    approver_type != 'external' OR approver_email IS NOT NULL
  ),

  -- Aprovador interno DEVE ter people_id
  CONSTRAINT chk_approval_requests_internal_people CHECK (
    approver_type != 'internal' OR approver_people_id IS NOT NULL
  ),

  -- Token unico (para lookup por token na pagina publica)
  CONSTRAINT uq_approval_requests_token UNIQUE (token)
);

COMMENT ON TABLE approval_requests IS 'Solicitacoes de aprovacao de conteudo. Paralelo a aprovacao comercial. Token UUID para acesso publico sem auth.';

-- ----------------------------------------------------------
-- 2.1.3 approval_logs
-- Audit trail IMUTAVEL. Somente INSERT permitido.
-- Sem updated_at, sem deleted_at.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  approval_request_id  UUID        NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  action               TEXT        NOT NULL,
  actor_type           TEXT        NOT NULL,
  actor_id             UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  actor_ip             TEXT,
  comment              TEXT,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_approval_logs_action CHECK (
    action IN ('created', 'sent', 'resent', 'approved', 'rejected', 'expired')
  ),

  CONSTRAINT chk_approval_logs_actor_type CHECK (
    actor_type IN ('user', 'external', 'system')
  )
);

COMMENT ON TABLE approval_logs IS 'Audit trail imutavel de acoes em solicitacoes de aprovacao. Somente INSERT permitido.';
```

### 2.2 Migration 016: Alterar job_team

Adicionar colunas opcionais de periodo ao `job_team` para conveniencia na UI (exibir periodo direto na linha do membro sem JOIN).

```sql
-- ============================================================
-- Migration 016: Fase 6 -- ADD allocation_start/end ao job_team
-- ============================================================
SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_team' AND column_name = 'allocation_start'
  ) THEN
    ALTER TABLE job_team ADD COLUMN allocation_start DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_team' AND column_name = 'allocation_end'
  ) THEN
    ALTER TABLE job_team ADD COLUMN allocation_end DATE;
  END IF;
END $$;

-- Check: end >= start (somente quando ambas preenchidas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_job_team_allocation_dates'
      AND conrelid = 'job_team'::regclass
  ) THEN
    ALTER TABLE job_team
      ADD CONSTRAINT chk_job_team_allocation_dates
      CHECK (
        allocation_start IS NULL
        OR allocation_end IS NULL
        OR allocation_end >= allocation_start
      );
  END IF;
END $$;
```

**Decisao arquitetural sobre duplicacao job_team vs allocations:** Os campos `allocation_start`/`allocation_end` em `job_team` sao COPIAS de conveniencia. A tabela `allocations` e a fonte de verdade para deteccao de conflitos. A Edge Function `jobs-team` (ao criar/atualizar membro) cria/atualiza o registro correspondente em `allocations` automaticamente quando datas sao fornecidas. Ver ADR-007 para detalhes.

### 2.3 Indices

```sql
-- allocations: busca de conflito (query principal do sistema)
CREATE INDEX IF NOT EXISTS idx_allocations_conflict_lookup
  ON allocations(tenant_id, people_id, allocation_start, allocation_end)
  WHERE deleted_at IS NULL;

-- allocations: FKs
CREATE INDEX IF NOT EXISTS idx_allocations_tenant_id
  ON allocations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_allocations_job_id
  ON allocations(job_id);

CREATE INDEX IF NOT EXISTS idx_allocations_people_id
  ON allocations(people_id);

CREATE INDEX IF NOT EXISTS idx_allocations_job_team_id
  ON allocations(job_team_id)
  WHERE job_team_id IS NOT NULL;

-- approval_requests: busca por job e status (listagem na aba)
CREATE INDEX IF NOT EXISTS idx_approval_requests_job_status
  ON approval_requests(tenant_id, job_id, status)
  WHERE deleted_at IS NULL;

-- approval_requests: busca por token (pagina publica -- indice parcial)
CREATE INDEX IF NOT EXISTS idx_approval_requests_token
  ON approval_requests(token)
  WHERE deleted_at IS NULL;

-- approval_requests: FKs
CREATE INDEX IF NOT EXISTS idx_approval_requests_tenant_id
  ON approval_requests(tenant_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_job_id
  ON approval_requests(job_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_created_by
  ON approval_requests(created_by);

-- approval_requests: busca de pendentes por tenant (pagina /approvals)
CREATE INDEX IF NOT EXISTS idx_approval_requests_pending
  ON approval_requests(tenant_id, created_at)
  WHERE status = 'pending' AND deleted_at IS NULL;

-- approval_logs: busca por request + ordem cronologica
CREATE INDEX IF NOT EXISTS idx_approval_logs_request_id
  ON approval_logs(approval_request_id, created_at);

-- approval_logs: FK tenant
CREATE INDEX IF NOT EXISTS idx_approval_logs_tenant_id
  ON approval_logs(tenant_id);
```

### 2.4 RLS Policies

```sql
-- ============================================================
-- allocations: isolamento por tenant_id
-- ============================================================
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allocations_select_tenant" ON allocations;
CREATE POLICY "allocations_select_tenant" ON allocations
  FOR SELECT USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allocations_insert_tenant" ON allocations;
CREATE POLICY "allocations_insert_tenant" ON allocations
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allocations_update_tenant" ON allocations;
CREATE POLICY "allocations_update_tenant" ON allocations
  FOR UPDATE
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- Sem DELETE policy (soft delete via UPDATE de deleted_at)

-- ============================================================
-- approval_requests: isolamento por tenant_id
-- NOTA: endpoint publico usa service_role para bypass RLS
-- ============================================================
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_requests_select_tenant" ON approval_requests;
CREATE POLICY "approval_requests_select_tenant" ON approval_requests
  FOR SELECT USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "approval_requests_insert_tenant" ON approval_requests;
CREATE POLICY "approval_requests_insert_tenant" ON approval_requests
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "approval_requests_update_tenant" ON approval_requests;
CREATE POLICY "approval_requests_update_tenant" ON approval_requests
  FOR UPDATE
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- ============================================================
-- approval_logs: isolamento por tenant_id, somente SELECT e INSERT
-- ============================================================
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_logs_select_tenant" ON approval_logs;
CREATE POLICY "approval_logs_select_tenant" ON approval_logs
  FOR SELECT USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "approval_logs_insert_tenant" ON approval_logs;
CREATE POLICY "approval_logs_insert_tenant" ON approval_logs
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

-- SEM policy de UPDATE ou DELETE (tabela imutavel -- RN-617)
```

### 2.5 Triggers

```sql
-- updated_at automatico para allocations
DROP TRIGGER IF EXISTS trg_allocations_updated_at ON allocations;
CREATE TRIGGER trg_allocations_updated_at
  BEFORE UPDATE ON allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- updated_at automatico para approval_requests
DROP TRIGGER IF EXISTS trg_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER trg_approval_requests_updated_at
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- approval_logs NAO tem trigger de updated_at (tabela imutavel)
```

### 2.6 Grants

```sql
GRANT ALL ON allocations TO service_role;
GRANT ALL ON approval_requests TO service_role;
GRANT ALL ON approval_logs TO service_role;

GRANT SELECT, INSERT, UPDATE ON allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON approval_requests TO authenticated;
GRANT SELECT, INSERT ON approval_logs TO authenticated;
-- Nota: sem DELETE e sem UPDATE em approval_logs para authenticated
```

### 2.7 pg_cron: Expiracao automatica

```sql
-- Job diario (00:01 BRT = 03:01 UTC) para expirar aprovacoes pendentes
SELECT cron.schedule(
  'expire-pending-approvals',
  '1 3 * * *',
  $$
  UPDATE approval_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now()
    AND deleted_at IS NULL;

  -- Log de expiracao (para auditoria)
  INSERT INTO approval_logs (tenant_id, approval_request_id, action, actor_type, metadata)
  SELECT
    ar.tenant_id,
    ar.id,
    'expired',
    'system',
    jsonb_build_object('reason', 'Token expirado automaticamente', 'expired_at', now())
  FROM approval_requests ar
  WHERE ar.status = 'expired'
    AND ar.updated_at >= now() - interval '2 minutes'
    AND ar.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM approval_logs al
      WHERE al.approval_request_id = ar.id
        AND al.action = 'expired'
    );
  $$
);
```

### 2.8 Realtime

```sql
-- Adicionar approval_requests ao Realtime (para atualizar status no frontend em tempo real)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'approval_requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE approval_requests;
    END IF;
  END IF;
END $$;
```

---

## 3. Edge Functions

### 3.1 Edge Function: allocations (NOVA)

**Diretorio:** `supabase/functions/allocations/`

**Estrutura de arquivos:**
```
allocations/
  index.ts                  -- roteamento
  handlers/
    list-by-job.ts          -- GET ?job_id=X
    list-by-person.ts       -- GET ?people_id=X&from=Y&to=Z
    create.ts               -- POST
    update.ts               -- PUT /:id
    soft-delete.ts           -- DELETE /:id
    get-conflicts.ts        -- GET /conflicts?from=Y&to=Z
```

**Roteamento no index.ts:**

```typescript
// GET /allocations?job_id=X          -> list-by-job
// GET /allocations?people_id=X       -> list-by-person
// GET /allocations/conflicts?from=&to= -> get-conflicts
// POST /allocations                  -> create
// PUT /allocations/:id               -> update
// DELETE /allocations/:id            -> soft-delete
```

Todos os handlers requerem autenticacao via `getAuthContext()`. Padrao identico as demais Edge Functions do projeto.

**Algoritmo de deteccao de conflito (usado por create e update):**

```typescript
// Query executada APOS o save (gravar primeiro, detectar conflito depois)
async function detectConflicts(
  client: SupabaseClient,
  tenantId: string,
  peopleId: string,
  allocationStart: string,
  allocationEnd: string,
  excludeAllocationId?: string, // para update: excluir a propria alocacao
): Promise<ConflictWarning[]> {
  // SQL conceitual:
  // SELECT a.id, a.job_id, j.code, j.title,
  //        a.allocation_start, a.allocation_end
  // FROM allocations a
  // JOIN jobs j ON j.id = a.job_id
  // WHERE a.tenant_id = :tenantId
  //   AND a.people_id = :peopleId
  //   AND a.deleted_at IS NULL
  //   AND j.deleted_at IS NULL
  //   AND j.status NOT IN ('cancelado', 'pausado')
  //   AND a.allocation_start <= :allocationEnd
  //   AND a.allocation_end >= :allocationStart
  //   AND a.id != :excludeAllocationId (se fornecido)
}
```

**Formato de warning retornado:**

```json
{
  "data": { "id": "...", "job_id": "...", "..." : "..." },
  "warnings": [
    {
      "code": "ALLOCATION_CONFLICT",
      "message": "Joao Silva esta alocado no job ELH-2026-042 (Filme Natura) de 15/03 a 20/03",
      "details": {
        "person_name": "Joao Silva",
        "conflicting_job_code": "ELH-2026-042",
        "conflicting_job_title": "Filme Natura",
        "overlap_start": "2026-03-15",
        "overlap_end": "2026-03-20"
      }
    }
  ]
}
```

**Validacao Zod (create):**

```typescript
const CreateAllocationSchema = z.object({
  job_id: z.string().uuid(),
  people_id: z.string().uuid(),
  job_team_id: z.string().uuid().optional(),
  allocation_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  allocation_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional(),
});
```

### 3.2 Edge Function: approvals (NOVA)

**Diretorio:** `supabase/functions/approvals/`

**Estrutura de arquivos:**
```
approvals/
  index.ts                  -- roteamento (split auth vs public)
  handlers/
    list-by-job.ts          -- GET ?job_id=X (auth)
    list-pending.ts         -- GET /pending (auth)
    create.ts               -- POST (auth)
    resend.ts               -- POST /:id/resend (auth)
    approve-internal.ts     -- POST /:id/approve (auth)
    reject-internal.ts      -- POST /:id/reject (auth)
    get-logs.ts             -- GET /:id/logs (auth)
    get-by-token.ts         -- GET /public/:token (SEM auth)
    respond.ts              -- POST /public/:token/respond (SEM auth)
```

**Roteamento no index.ts:**

```typescript
Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex(s => s === 'approvals');

    const segment1 = pathSegments[fnIndex + 1] ?? null;
    const segment2 = pathSegments[fnIndex + 2] ?? null;
    const segment3 = pathSegments[fnIndex + 3] ?? null;

    // --- ROTAS PUBLICAS (sem auth) ---
    if (segment1 === 'public' && segment2) {
      const token = segment2;
      if (req.method === 'GET' && !segment3) {
        return await getByToken(req, token);
      }
      if (req.method === 'POST' && segment3 === 'respond') {
        return await respond(req, token);
      }
      return error('NOT_FOUND', 'Rota publica nao encontrada', 404);
    }

    // --- ROTAS AUTENTICADAS ---
    const auth = await getAuthContext(req);

    if (req.method === 'GET' && segment1 === 'pending') {
      return await listPending(req, auth);
    }
    if (req.method === 'GET' && !segment1) {
      return await listByJob(req, auth);
    }
    if (req.method === 'POST' && !segment1) {
      return await create(req, auth);
    }
    if (req.method === 'GET' && segment1 && segment2 === 'logs') {
      return await getLogs(req, auth, segment1);
    }
    if (req.method === 'POST' && segment1 && segment2 === 'resend') {
      return await resend(req, auth, segment1);
    }
    if (req.method === 'POST' && segment1 && segment2 === 'approve') {
      return await approveInternal(req, auth, segment1);
    }
    if (req.method === 'POST' && segment1 && segment2 === 'reject') {
      return await rejectInternal(req, auth, segment1);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado em approvals:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
```

**Endpoint publico -- seguranca:**

Os handlers `get-by-token.ts` e `respond.ts` NAO chamam `getAuthContext()`. Em vez disso:

1. Recebem o token como parametro de URL
2. Usam `createServiceClient()` (service_role) para buscar o `approval_request` por token, contornando RLS
3. Validam `expires_at > now()` e `status = 'pending'`
4. `respond.ts` registra IP do request via `req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip')`
5. Apos resposta, inserem log em `approval_logs` com `actor_type = 'external'`

**Rate limiting no endpoint publico:**

A spec sugere 10 requests por token por hora. Na v1, implementar via contagem de logs recentes:

```typescript
const { count } = await client
  .from('approval_logs')
  .select('id', { count: 'exact', head: true })
  .eq('approval_request_id', requestId)
  .gte('created_at', new Date(Date.now() - 3600000).toISOString());

if (count && count >= 10) {
  return error('RATE_LIMITED', 'Muitas tentativas. Tente novamente em 1 hora.', 429);
}
```

Simples e funcional. Se precisar de rate limiting mais robusto, migrar para Redis/Upstash no futuro.

**Validacao Zod (create):**

```typescript
const CreateApprovalSchema = z.object({
  job_id: z.string().uuid(),
  approval_type: z.enum(['briefing', 'orcamento_detalhado', 'corte', 'finalizacao', 'entrega']),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  file_url: z.string().url().max(2000).optional(),
  approver_type: z.enum(['external', 'internal']),
  approver_email: z.string().email().optional(),
  approver_phone: z.string().min(10).max(20).optional(),
  approver_people_id: z.string().uuid().optional(),
}).refine(
  (data) => {
    if (data.approver_type === 'external') return !!data.approver_email;
    if (data.approver_type === 'internal') return !!data.approver_people_id;
    return false;
  },
  { message: 'Aprovador externo requer email, interno requer people_id' }
);
```

**Validacao Zod (respond -- publico):**

```typescript
const RespondSchema = z.object({
  action: z.enum(['approved', 'rejected']),
  comment: z.string().max(5000).optional(),
}).refine(
  (data) => data.action !== 'rejected' || (data.comment && data.comment.length > 0),
  { message: 'Comentario obrigatorio para rejeicao' }
);
```

### 3.3 Modificacao: Edge Function jobs-team (EXISTENTE)

Adicionar suporte aos campos `allocation_start` e `allocation_end` no `add-member.ts` e `update-member.ts`.

**Alteracao em add-member.ts:**
1. Aceitar campos opcionais `allocation_start` e `allocation_end` no payload
2. Gravar em `job_team`
3. Se datas fornecidas, criar registro correspondente em `allocations`
4. Executar `detectConflicts()` (importada de `_shared/conflict-detection.ts`)
5. Retornar com `warnings` se conflitos detectados

**Alteracao em update-member.ts:**
1. Aceitar campos opcionais `allocation_start` e `allocation_end`
2. Atualizar em `job_team`
3. Se datas fornecidas, criar/atualizar registro em `allocations`
4. Re-executar deteccao de conflito
5. Retornar com `warnings`

**Novo _shared module:** `conflict-detection.ts`
- Funcao `detectConflicts()` reutilizavel por `allocations` e `jobs-team`
- Evita duplicacao de logica

### 3.4 Resumo de Edge Functions

| Edge Function | Status | Handlers | Auth |
|---------------|--------|----------|------|
| `allocations` | NOVA | 6 handlers | Todos autenticados |
| `approvals` | NOVA | 7 auth + 2 publicos | Misto |
| `jobs-team` | MODIFICADA | 4 handlers (existentes, ampliados) | Todos autenticados |

**Novo modulo _shared:** `conflict-detection.ts` (16o modulo compartilhado)

### 3.5 Notificacoes

Reutilizar infraestrutura existente da Fase 5:

| Evento | Canal | Mecanismo |
|--------|-------|-----------|
| Aprovacao criada (externo) | WhatsApp | `integration_events` com `event_type = 'whatsapp_send'` + n8n |
| Aprovacao criada (interno) | In-app | `createNotification()` do notification-helper existente |
| Aprovacao respondida | In-app | Notificar criador da solicitacao |
| Aprovacao reenviada | WhatsApp | Mesmo mecanismo de criacao |

**Tipos de notificacao novos a adicionar ao CHECK constraint:**

```sql
-- Atualizar CHECK constraint de notifications.type para incluir novos tipos
-- Novo valor: 'approval_requested', 'approval_responded'
```

Nota: Como usamos TEXT com CHECK (nao ENUM), basta um ALTER TABLE ... DROP CONSTRAINT + ADD CONSTRAINT.

---

## 4. Frontend

### 4.1 Novas Paginas

#### 4.1.1 /team/calendar -- Calendario de Alocacoes

**Rota:** `frontend/src/app/(dashboard)/team/calendar/page.tsx`

**Componentes:**

```
TeamCalendarPage
  +-- MonthSwitcher          -- alternancia mensal/semanal com setas
  +-- CalendarFilters        -- filtros: pessoa, role, status do job
  +-- AllocationGantt        -- vista Gantt simplificada
  |     +-- GanttRow         -- uma linha por pessoa
  |     +-- GanttBar         -- barra de alocacao (cor do job)
  |     +-- ShootingMarker   -- marcador visual de diaria de filmagem
  +-- ConflictList           -- painel lateral com conflitos ativos
        +-- ConflictCard     -- card de conflito com links para jobs
```

**Implementacao do AllocationGantt:**

NAO usar lib externa de Gantt (pesadas, dificeis de customizar com Tailwind). Implementar com CSS Grid:

```
- Container: CSS Grid com colunas = dias do mes (28-31 colunas)
- Linhas: uma por pessoa (agrupadas, ordenadas por nome)
- Barras: div com position relativa, width calculada via colSpan
- Cor da barra: cor fixa por job (baseada no index, reutilizar paleta de cores de status)
- Conflito: barra vermelha semi-transparente sobreposta
```

**Dados necessarios:**
- `GET /allocations?from=2026-03-01&to=2026-03-31` (todas do periodo)
- `GET /allocations/conflicts?from=2026-03-01&to=2026-03-31` (para painel lateral)
- `GET /jobs-shooting-dates?from=2026-03-01&to=2026-03-31` (marcadores visuais -- requer novo query param na EF existente)

#### 4.1.2 /approvals -- Aprovacoes Pendentes (Visao Global)

**Rota:** `frontend/src/app/(dashboard)/approvals/page.tsx`

**Componentes:**

```
ApprovalsPage
  +-- ApprovalsFilters       -- filtro por tipo e por job
  +-- ApprovalsPendingList   -- tabela com aprovacoes pendentes
        +-- ApprovalRow      -- linha com: job, tipo, titulo, aprovador, dias pendente
        +-- ApprovalStatusBadge  -- badge colorido por status
```

**Dados necessarios:**
- `GET /approvals/pending` (lista todas pendentes do tenant)

**Comportamento:**
- Ordenacao padrao: mais antigas primeiro
- Aprovacoes com 7+ dias pendentes: fundo vermelho claro
- Click na linha: navega para `/jobs/[id]?tab=aprovacoes`

#### 4.1.3 /approve/[token] -- Pagina Publica

**Rota:** `frontend/src/app/approve/[token]/page.tsx`

NOTA: Fora do grupo `(dashboard)` -- sem layout de sidebar/topbar. Fora do grupo `(auth)` -- sem redirect de login.

**Componentes:**

```
PublicApprovalPage
  +-- ApprovalReviewContent      -- titulo, descricao, link para arquivo
  +-- ApprovalResponseForm       -- botoes Aprovar/Rejeitar + campo de comentario
  +-- ApprovalExpiredView        -- tela de token expirado
  +-- ApprovalAlreadyRespondedView  -- tela de ja respondido
```

**Design:**
- Layout minimalista: card centralizado, fundo cinza claro
- Logo ELLAHOS no topo (neutro, sem branding da producao)
- Mobile-first (clientes acessam por WhatsApp no celular)
- Tema claro SEMPRE (sem dark mode toggle -- publico)
- Sem sidebar, sem topbar, sem navegacao

**Dados necessarios:**
- `GET /approvals/public/[token]` (busca dados sem auth)
- `POST /approvals/public/[token]/respond` (envia resposta sem auth)

**IMPORTANTE:** Essa pagina faz fetch DIRETAMENTE para a Edge Function, SEM usar `getToken()` do `api.ts`. Criar helper separado `apiPublicFetch()` que nao envia Authorization header.

### 4.2 Modificacoes em Componentes Existentes

#### 4.2.1 Job Detail -- Nova Aba "Aprovacoes" (7a aba)

**Alterar:** `frontend/src/lib/constants.ts`
```typescript
export type JobDetailTabId =
  | 'geral' | 'equipe' | 'entregaveis'
  | 'financeiro' | 'diarias' | 'aprovacoes' | 'historico'

// Adicionar ao array JOB_DETAIL_TABS:
{ id: 'aprovacoes', label: 'Aprovacoes', icon: 'CheckSquare' }
```

**Criar:** `frontend/src/components/job-detail/tabs/TabAprovacoes.tsx`

```
TabAprovacoes
  +-- ApprovalCreateDialog   -- modal para criar nova aprovacao
  +-- ApprovalList           -- lista de aprovacoes do job
  |     +-- ApprovalRow      -- linha expandivel
  |     +-- ApprovalStatusBadge
  |     +-- ApprovalTimeline -- historico ao expandir (logs)
  +-- ApprovalResendButton   -- botao de reenvio
```

**Alterar:** `frontend/src/components/job-detail/JobDetailTabs.tsx`
- Importar TabAprovacoes
- Adicionar CheckSquare ao ICON_MAP
- Adicionar TabsContent para `aprovacoes`
- Adicionar contagem no getTabCount

#### 4.2.2 TabEquipe -- Campos de Alocacao + Warning

**Alterar:** `frontend/src/components/job-detail/tabs/TeamMemberDialog.tsx`
- Adicionar campos `allocation_start` e `allocation_end` (DatePicker)
- Ao salvar com datas: exibir mini-calendario de disponibilidade da pessoa
- Se API retornar warnings: mostrar toast amarelo com detalhes do conflito
- Botoes: "Salvar mesmo assim" e "Cancelar"

**Alterar:** `frontend/src/components/job-detail/tabs/TabEquipe.tsx`
- Banner de alerta no topo quando ha conflitos ativos
- Exibir periodo de alocacao na linha de cada membro
- Link para o calendario de equipe

#### 4.2.3 PersonDetailTabs -- Aba Jobs (conteudo real)

**Alterar:** `frontend/src/components/people/PersonDetailTabs.tsx`

Substituir o placeholder da aba Jobs por:

```
TabJobs (novo conteudo da aba 'jobs')
  +-- PersonMetricsCards     -- total jobs, ativos, role mais frequente
  +-- PersonAvailability     -- mini-calendario 30 dias
  +-- PersonJobHistory       -- lista paginada de jobs (com link)
```

**Dados necessarios:**
- `GET /allocations?people_id=X&from=today&to=today+30` (disponibilidade)
- `GET /jobs-team?people_id=X` (historico de jobs -- requer novo endpoint ou query param)

Decisao: Nao criar novo endpoint para historico de jobs de pessoa. Usar query direta via Supabase client no frontend (SELECT jobs via job_team WHERE person_id = X). Motivo: e uma query read-only simples, sem logica de negocio. Ver ADR-008.

### 4.3 Navegacao (Sidebar)

**Alterar:** `frontend/src/components/layout/Sidebar.tsx`

```typescript
const NAV_ITEMS: NavItem[] = [
  { label: 'Jobs', href: '/jobs', icon: Clapperboard },
  { label: 'Clientes', href: '/clients', icon: Building2 },
  { label: 'Agencias', href: '/agencies', icon: Briefcase },
  { label: 'Equipe', href: '/people', icon: Users },
  { label: 'Calendario', href: '/team/calendar', icon: CalendarDays }, // <-- ATIVAR (era disabled)
  { label: 'Aprovacoes', href: '/approvals', icon: ClipboardCheck },  // <-- NOVO
  { label: 'Financeiro', href: '/financial', icon: DollarSign },
  { label: 'Arquivos', href: '/files', icon: FolderOpen, disabled: true },
]
```

Nota: O item "Calendario" ja existia como disabled. Ativamos e mudamos href de `/calendar` para `/team/calendar`. "Aprovacoes" e item novo.

### 4.4 Hooks e Query Keys

**Novos hooks:**

| Hook | Arquivo | Edge Function | Descricao |
|------|---------|---------------|-----------|
| `useAllocations` | `useAllocations.ts` | allocations | Lista alocacoes por job ou por pessoa+periodo |
| `useCreateAllocation` | `useAllocations.ts` | allocations | Mutation: criar alocacao |
| `useUpdateAllocation` | `useAllocations.ts` | allocations | Mutation: atualizar alocacao |
| `useDeleteAllocation` | `useAllocations.ts` | allocations | Mutation: soft delete |
| `useConflicts` | `useAllocations.ts` | allocations/conflicts | Lista conflitos ativos no periodo |
| `useJobApprovals` | `useApprovals.ts` | approvals?job_id=X | Lista aprovacoes do job |
| `usePendingApprovals` | `useApprovals.ts` | approvals/pending | Lista pendentes do tenant |
| `useCreateApproval` | `useApprovals.ts` | approvals | Mutation: criar aprovacao |
| `useResendApproval` | `useApprovals.ts` | approvals/:id/resend | Mutation: reenviar link |
| `useApprovalLogs` | `useApprovals.ts` | approvals/:id/logs | Lista logs de uma aprovacao |
| `usePublicApproval` | `usePublicApproval.ts` | approvals/public/:token | GET dados publicos |
| `useRespondApproval` | `usePublicApproval.ts` | approvals/public/:token/respond | Mutation: responder |
| `usePersonJobHistory` | `usePersonJobs.ts` | Supabase client direto | Historico de jobs de pessoa |
| `usePersonAvailability` | `usePersonJobs.ts` | allocations?people_id=X | Alocacoes proximos 30 dias |

**Novos query keys em `query-keys.ts`:**

```typescript
export const allocationKeys = {
  all: ['allocations'] as const,
  lists: () => [...allocationKeys.all, 'list'] as const,
  listByJob: (jobId: string) => [...allocationKeys.lists(), 'job', jobId] as const,
  listByPerson: (personId: string, from: string, to: string) =>
    [...allocationKeys.lists(), 'person', personId, from, to] as const,
  conflicts: (from: string, to: string) =>
    [...allocationKeys.all, 'conflicts', from, to] as const,
}

export const approvalKeys = {
  all: ['approvals'] as const,
  lists: () => [...approvalKeys.all, 'list'] as const,
  listByJob: (jobId: string) => [...approvalKeys.lists(), 'job', jobId] as const,
  pending: () => [...approvalKeys.all, 'pending'] as const,
  detail: (id: string) => [...approvalKeys.all, 'detail', id] as const,
  logs: (id: string) => [...approvalKeys.detail(id), 'logs'] as const,
  public: (token: string) => ['approval-public', token] as const,
}
```

### 4.5 Tipos TypeScript

**Novo arquivo:** `frontend/src/types/allocations.ts`

```typescript
export interface Allocation {
  id: string
  tenant_id: string
  job_id: string
  people_id: string
  job_team_id: string | null
  allocation_start: string // date ISO
  allocation_end: string   // date ISO
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // joins
  job?: { id: string; code: string; title: string; status: string }
  person?: { id: string; full_name: string }
}

export interface AllocationConflict {
  person_id: string
  person_name: string
  allocations: Array<{
    allocation_id: string
    job_id: string
    job_code: string
    job_title: string
    allocation_start: string
    allocation_end: string
  }>
  overlap_start: string
  overlap_end: string
}

export interface ConflictWarning {
  code: 'ALLOCATION_CONFLICT'
  message: string
  details: {
    person_name: string
    conflicting_job_code: string
    conflicting_job_title: string
    overlap_start: string
    overlap_end: string
  }
}
```

**Novo arquivo:** `frontend/src/types/approvals.ts`

```typescript
export type ApprovalType = 'briefing' | 'orcamento_detalhado' | 'corte' | 'finalizacao' | 'entrega'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type ApproverType = 'external' | 'internal'

export interface ApprovalRequest {
  id: string
  tenant_id: string
  job_id: string
  approval_type: ApprovalType
  title: string
  description: string | null
  file_url: string | null
  status: ApprovalStatus
  token: string
  expires_at: string
  approver_type: ApproverType
  approver_email: string | null
  approver_people_id: string | null
  approver_phone: string | null
  approved_at: string | null
  rejection_reason: string | null
  approved_ip: string | null
  created_by: string
  created_at: string
  updated_at: string
  // joins
  job?: { id: string; code: string; title: string }
  approver_person?: { id: string; full_name: string }
  creator?: { id: string; full_name: string }
}

export interface ApprovalLog {
  id: string
  approval_request_id: string
  action: 'created' | 'sent' | 'resent' | 'approved' | 'rejected' | 'expired'
  actor_type: 'user' | 'external' | 'system'
  actor_id: string | null
  actor_ip: string | null
  comment: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// Dados retornados pela pagina publica (subset seguro)
export interface PublicApprovalData {
  id: string
  approval_type: ApprovalType
  title: string
  description: string | null
  file_url: string | null
  status: ApprovalStatus
  expires_at: string
  job_title: string // apenas titulo, sem dados sensiveis
}

export interface CreateApprovalPayload {
  job_id: string
  approval_type: ApprovalType
  title: string
  description?: string
  file_url?: string
  approver_type: ApproverType
  approver_email?: string
  approver_phone?: string
  approver_people_id?: string
}

export interface RespondPayload {
  action: 'approved' | 'rejected'
  comment?: string
}
```

---

## 5. ADRs (Architecture Decision Records)

### ADR-007: Dualidade allocations vs job_team para periodos de alocacao

**Status:** Aceito
**Contexto:** A spec pede que `job_team` ganhe campos de periodo E que exista tabela `allocations` como fonte de verdade para conflitos. Isso cria dualidade de dados.

**Decisao:** Manter ambos. `job_team.allocation_start/end` sao copias de conveniencia para exibicao rapida na UI (evita JOIN). `allocations` e a fonte de verdade para o algoritmo de conflito. A Edge Function `jobs-team` sincroniza automaticamente: ao criar/atualizar membro com datas, cria/atualiza o registro em `allocations` na mesma transacao.

**Consequencias:**
- Positiva: UI rapida (sem JOIN extra na listagem de equipe)
- Positiva: Algoritmo de conflito e uma query simples em `allocations`
- Negativa: Dado duplicado que pode dessincronizar
- Mitigacao: Sincronizacao feita na camada de Edge Function, nao em trigger (mais visivel e testavel)

### ADR-008: Historico de jobs de pessoa via Supabase client direto

**Status:** Aceito
**Contexto:** A aba Jobs no PersonDetail precisa listar todos os jobs em que a pessoa participou. Isso poderia ser um novo endpoint na Edge Function ou uma query direta via Supabase client.

**Decisao:** Query direta via Supabase client no frontend. Usar `supabase.from('job_team').select('*, jobs(*)').eq('person_id', X)`. RLS garante isolamento por tenant.

**Justificativa:** E uma query read-only sem logica de negocio. Criar Edge Function so para isso seria over-engineering. O Supabase client ja esta disponivel no frontend e a RLS protege os dados.

**Consequencias:**
- Positiva: Zero Edge Functions adicionais
- Positiva: Implementacao em 30 minutos
- Negativa: Query PostgREST no frontend em vez de API propria (inconsistencia com padrao)
- Mitigacao: Se precisar de logica futura (filtros, paginacao avancada), migrar para Edge Function

### ADR-009: Pagina publica de aprovacao sem SSR

**Status:** Aceito
**Contexto:** A pagina `/approve/[token]` e publica e acessada por clientes via WhatsApp. Poderia usar SSR (Server Components) para buscar dados no servidor, ou CSR (Client Components) com fetch no browser.

**Decisao:** Usar Client Component com fetch direto para a Edge Function. NAO usar SSR.

**Justificativa:**
1. A Edge Function ja expoe o endpoint publico -- nao ha vantagem em fazer fetch no servidor Next.js para depois passar para o cliente
2. O token esta na URL -- nao ha segredo a proteger no servidor
3. CSR permite loading states nativos com TanStack Query
4. Evita complexidade de Server Actions para formulario de resposta

**Consequencias:**
- Positiva: Implementacao simples com hooks existentes
- Negativa: SEO nao importa (pagina de uso unico, nao indexavel)
- Negativa: Um request a mais (browser -> Edge Function em vez de Next.js server -> Edge Function)

### ADR-010: Rate limiting no endpoint publico via contagem de logs

**Status:** Aceito
**Contexto:** O endpoint publico `/approvals/public/:token/respond` precisa de rate limiting para evitar abuse.

**Decisao:** Contar registros em `approval_logs` na ultima hora para o token. Se >= 10, retornar 429.

**Justificativa:** Solucao simples que reutiliza tabela existente. Nao requer Redis, Upstash ou mecanismo externo. Para o volume esperado (poucos clientes por tenant), e mais que suficiente.

**Alternativas rejeitadas:**
- Redis/Upstash: over-engineering para o volume esperado
- Cloudflare rate limiting: nao temos Cloudflare na frente das Edge Functions
- In-memory counter: nao persiste entre cold starts do Deno

---

## 6. Ordem de Implementacao (Sub-fases)

### Sub-fase 6.1: Migrations (Banco) -- ~2h

**Escopo:**
- Migration 015: CREATE TABLE allocations, approval_requests, approval_logs
- Migration 015 (mesmo arquivo): indices, RLS policies, triggers, grants
- Migration 016: ALTER TABLE job_team ADD allocation_start/end
- pg_cron job de expiracao
- Atualizar CHECK constraint de notifications.type

**Entregaveis:** 2 migrations aplicadas, schema verificado

**Dependencias:** Nenhuma (ponto de partida)

### Sub-fase 6.2: _shared/conflict-detection.ts + Edge Function allocations -- ~4h

**Escopo:**
- Criar `_shared/conflict-detection.ts` com funcao `detectConflicts()`
- Criar Edge Function `allocations` com 6 handlers
- Deploy e teste manual dos endpoints

**Entregaveis:** Edge Function deployed e funcional

**Dependencias:** Sub-fase 6.1

### Sub-fase 6.3: Edge Function approvals (handlers autenticados) -- ~4h

**Escopo:**
- Criar Edge Function `approvals` com 7 handlers autenticados
- create, list-by-job, list-pending, resend, approve-internal, reject-internal, get-logs
- Integrar com notification-helper para notificacoes in-app
- Integrar com integration_events para WhatsApp via n8n
- Deploy e teste manual

**Entregaveis:** Edge Function deployed (handlers auth)

**Dependencias:** Sub-fase 6.1

### Sub-fase 6.4: Edge Function approvals (handlers publicos) -- ~2h

**Escopo:**
- Adicionar handlers get-by-token e respond ao Edge Function approvals
- Rate limiting via contagem de logs
- Testes manuais com token valido, expirado e invalido

**Entregaveis:** Endpoint publico funcional

**Dependencias:** Sub-fase 6.3

### Sub-fase 6.5: Modificar jobs-team + tipos frontend -- ~2h

**Escopo:**
- Alterar `jobs-team` handlers para suportar allocation_start/end
- Sincronizacao automatica com tabela allocations
- Criar tipos TypeScript (allocations.ts, approvals.ts)
- Criar query keys em query-keys.ts
- Criar hooks basicos (useAllocations, useApprovals, usePublicApproval)

**Entregaveis:** API completa, hooks prontos

**Dependencias:** Sub-fases 6.2, 6.3, 6.4

### Sub-fase 6.6: Frontend -- TabEquipe modificada + TabAprovacoes -- ~4h

**Escopo:**
- TeamMemberDialog: campos de alocacao + warning de conflito
- TabEquipe: banner de conflito + periodo na linha do membro
- TabAprovacoes: lista de aprovacoes + ApprovalCreateDialog
- JobDetailTabs: adicionar 7a aba
- Sidebar: ativar Calendario, adicionar Aprovacoes

**Entregaveis:** Job detail com abas funcionais

**Dependencias:** Sub-fase 6.5

### Sub-fase 6.7: Frontend -- Pagina /approvals + Pagina publica -- ~3h

**Escopo:**
- ApprovalsPage (/approvals) com lista global de pendentes
- PublicApprovalPage (/approve/[token]) com fluxo completo
- apiPublicFetch helper (sem auth)
- Testes manuais end-to-end: criar aprovacao -> enviar -> aprovar como cliente

**Entregaveis:** Fluxo de aprovacao completo funcional

**Dependencias:** Sub-fase 6.6

### Sub-fase 6.8: Frontend -- Calendario de Equipe -- ~5h

**Escopo:**
- TeamCalendarPage com AllocationGantt (CSS Grid)
- MonthSwitcher (mensal/semanal)
- CalendarFilters (pessoa, role, status)
- ConflictList (painel lateral)
- ShootingMarker (marcadores de diarias)
- Responsivo mobile

**Entregaveis:** Calendario funcional com conflitos

**Dependencias:** Sub-fase 6.5

### Sub-fase 6.9: Frontend -- PersonDetail aba Jobs -- ~2h

**Escopo:**
- PersonMetricsCards (total jobs, ativos, role mais frequente)
- PersonAvailability (mini-calendario 30 dias)
- PersonJobHistory (lista paginada com links)
- usePersonJobHistory e usePersonAvailability hooks

**Entregaveis:** PersonDetail com conteudo real

**Dependencias:** Sub-fase 6.5

### Sub-fase 6.10: QA, Responsivo e Polish -- ~2h

**Escopo:**
- TypeScript strict: zero errors
- Dark mode em todas telas novas
- Responsivo mobile em todas telas novas
- Teste mobile real da pagina publica
- Teste end-to-end completo
- Verificar pg_cron de expiracao

**Entregaveis:** Fase 6 CONCLUIDA

**Dependencias:** Todas as sub-fases anteriores

### Diagrama de Dependencias

```
6.1 (Migrations)
  |
  +--- 6.2 (allocations EF)
  |        |
  +--- 6.3 (approvals EF auth)
  |        |
  |        +--- 6.4 (approvals EF public)
  |
  +--- 6.5 (jobs-team mod + tipos + hooks)  <-- depende de 6.2, 6.3, 6.4
          |
          +--- 6.6 (TabEquipe + TabAprovacoes)
          |        |
          |        +--- 6.7 (/approvals + pagina publica)
          |
          +--- 6.8 (Calendario de equipe)
          |
          +--- 6.9 (PersonDetail aba Jobs)
          |
          +--- 6.10 (QA + Polish)  <-- depende de 6.6, 6.7, 6.8, 6.9
```

**Estimativa total:** ~30 horas de implementacao

**Caminho critico:** 6.1 -> 6.3 -> 6.4 -> 6.5 -> 6.6 -> 6.7 -> 6.10

---

## 7. Riscos e Mitigacoes

### R1: Performance do algoritmo de conflito

**Risco:** A query de deteccao de conflito faz range overlap em `allocations`. Com muitos registros, pode ficar lenta.

**Probabilidade:** Baixa. Uma producao de video tem dezenas de pessoas, nao milhares.

**Mitigacao:** Indice composto `idx_allocations_conflict_lookup` em `(tenant_id, people_id, allocation_start, allocation_end)` com filtro `WHERE deleted_at IS NULL`. Para o volume esperado (<1000 allocations por tenant), nenhuma otimizacao adicional e necessaria.

### R2: Dessincronizacao entre job_team e allocations

**Risco:** Se a Edge Function falhar no meio da operacao (apos gravar job_team mas antes de gravar allocations), os dados ficam dessincronizados.

**Probabilidade:** Baixa. Supabase usa conexao unica por request.

**Mitigacao:** Usar `supabase.rpc()` para executar ambas as operacoes em uma unica chamada SQL (function PL/pgSQL), garantindo atomicidade. Alternativa mais simples: gravar allocations primeiro, job_team depois. Se falhar no meio, a alocacao existe sem membro (menos grave que membro sem alocacao). Na pratica, a probabilidade de falha parcial e muito baixa para justificar a complexidade extra. Manter a abordagem simples (dois INSERTs sequenciais) e monitorar.

### R3: Abuso do endpoint publico

**Risco:** Bot pode fazer muitas requests ao endpoint `/approvals/public/:token/respond`.

**Probabilidade:** Baixa (URL com UUID dificil de adivinhar).

**Mitigacao:** Rate limiting via contagem de logs (10 req/h por token). Token UUID v4 e praticamente impossivel de adivinhar por brute force. Se necessario no futuro, adicionar CAPTCHA na pagina publica.

### R4: Token de aprovacao expira e cliente nao recebe novo link

**Risco:** Token expira apos 30 dias, cliente tenta acessar e ve erro. Se ninguem reenviar, a aprovacao fica em limbo.

**Probabilidade:** Media. Depende do coordenador monitorar pendencias.

**Mitigacao:** Pagina de token expirado exibe mensagem clara com instrucao. Pagina `/approvals` destaca aprovacoes expiradas. Futuro: workflow n8n que envia lembrete automatico 3 dias antes da expiracao.

### R5: Calendario Gantt com muitas pessoas

**Risco:** Se o tenant tiver 50+ pessoas alocadas no mesmo mes, o Gantt fica ilegivel.

**Probabilidade:** Baixa para v1 (producoes tipicas tem 10-20 pessoas).

**Mitigacao:** Filtros por pessoa, role e status. Paginacao virtual se necessario no futuro. Para v1, scroll vertical e suficiente.

### R6: Cold start da Edge Function approvals no endpoint publico

**Risco:** Cliente clica no link do WhatsApp e espera 1-2s de cold start. Pode pensar que o link esta quebrado.

**Probabilidade:** Media. Cold starts de Supabase Edge Functions variam de 200ms a 2s.

**Mitigacao:** Pagina Next.js com skeleton/loading state imediato enquanto o fetch acontece. O cliente ve a pagina carregando instantaneamente (HTML estatico do Next.js) e os dados aparecem apos o fetch.

---

## 8. Checklist de Verificacao Pre-Implementacao

Antes de iniciar a implementacao, confirmar:

- [ ] Migration 015 e 016 revisadas e idempotentes
- [ ] Convencoes de nomes consistentes com projeto (snake_case, plural)
- [ ] Todos os indices documentados
- [ ] RLS policies para as 3 tabelas novas
- [ ] Trigger updated_at para allocations e approval_requests
- [ ] Grants para service_role e authenticated
- [ ] pg_cron job de expiracao testado
- [ ] Edge Functions seguem padrao existente (cors, auth, response)
- [ ] Tipos TypeScript definidos para frontend
- [ ] Query keys definidos
- [ ] Hooks planejados com invalidacao de cache correta
- [ ] Pagina publica sem dependencia de auth
- [ ] Sidebar atualizada com novos itens
- [ ] ADRs criados para decisoes importantes
