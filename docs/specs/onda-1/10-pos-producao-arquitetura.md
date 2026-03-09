# Onda 1.2 -- Pos-Producao: Documento de Arquitetura

**Data:** 2026-03-09
**Status:** APROVADO
**Autor:** Tech Lead (Claude Opus)
**Spec de referencia:** docs/specs/onda-1/08-pos-producao-spec.md
**ADR relacionado:** docs/decisions/ADR-027-pos-producao-ef-separada.md

---

## 1. Decisao Arquitetural: EF Separada `pos-producao`

### Analise do estado atual

A EF `jobs-deliverables` (index.ts) possui 4 rotas CRUD simples:

| Metodo | Rota | Handler |
|--------|------|---------|
| GET | /jobs-deliverables/:jobId | list.ts |
| POST | /jobs-deliverables/:jobId | create.ts |
| PATCH | /jobs-deliverables/:jobId/:deliverableId | update.ts |
| DELETE | /jobs-deliverables/:jobId/:deliverableId | delete.ts |

### Decisao: Criar EF `pos-producao` SEPARADA

**Motivos:**

1. **Dominio diferente.** `jobs-deliverables` e CRUD generico de entregaveis. Pos-producao e um dominio de workflow (pipeline, versoes de corte, aprovacoes). Misturar os dois em um index.ts geraria roteamento complexo com 9+ rotas e segmentos aninhados (`:deliverableId/cut-versions/:versionId`).

2. **Contexto de acesso diferente.** `jobs-deliverables` precisa de jobId na URL (e assim funciona hoje). Pos-producao tem rota cross-jobs (`/pos-producao/dashboard`) que nao pertence a nenhum job especifico.

3. **Principio do projeto.** Cada EF do ELLAHOS representa um dominio coeso (~4-8 handlers). Exemplos: `production-diary` (6 handlers), `attendance` (10 handlers), `crm` (17 handlers).

4. **Deploy independente.** Pos-producao vai iterar rapido em 3 sprints; deploy separado evita risco de regressao nos CRUD de entregaveis.

**Consequencia:** O campo `pos_stage` e atualizado EXCLUSIVAMENTE pela EF `pos-producao` (nao pelo PATCH generico de `jobs-deliverables`). O `UpdateDeliverableSchema` existente NAO aceita `pos_stage`, `pos_assignee_id`, `pos_drive_url` nem `pos_briefing` -- esses campos sao dominio da nova EF.

---

## 2. Migration SQL

**Arquivo:** `supabase/migrations/20260309100000_onda_1_2_pos_producao.sql`

```sql
-- =============================================================================
-- Onda 1.2: Pos-Producao -- Pipeline de Entregaveis, Versoes e Aprovacoes
-- Idempotente: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS em tudo
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 2.1. Novas colunas em job_deliverables
-- ---------------------------------------------------------------------------

ALTER TABLE job_deliverables
  ADD COLUMN IF NOT EXISTS pos_stage TEXT
    CHECK (pos_stage IN (
      'ingest', 'montagem', 'apresentacao_offline', 'revisao_offline',
      'aprovado_offline', 'finalizacao', 'apresentacao_online',
      'revisao_online', 'aprovado_online', 'copias', 'entregue'
    ));

ALTER TABLE job_deliverables
  ADD COLUMN IF NOT EXISTS pos_assignee_id UUID
    REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE job_deliverables
  ADD COLUMN IF NOT EXISTS pos_drive_url TEXT;

ALTER TABLE job_deliverables
  ADD COLUMN IF NOT EXISTS pos_briefing JSONB DEFAULT NULL;

-- Index para queries do dashboard cross-jobs (WHERE pos_stage IS NOT NULL)
CREATE INDEX IF NOT EXISTS idx_job_deliverables_pos_stage
  ON job_deliverables(pos_stage) WHERE pos_stage IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_deliverables_pos_assignee
  ON job_deliverables(pos_assignee_id) WHERE pos_assignee_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2.2. Nova tabela pos_cut_versions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pos_cut_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deliverable_id  UUID NOT NULL REFERENCES job_deliverables(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  version_type    TEXT NOT NULL
    CHECK (version_type IN ('offline', 'online')),
  review_url      TEXT,
  status          TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado')),
  revision_notes  TEXT,
  created_by      UUID REFERENCES profiles(id),
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deliverable_id, version_type, version_number)
);

-- RLS
ALTER TABLE pos_cut_versions ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: tenant isolation via JWT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pos_cut_versions' AND policyname = 'pos_cut_versions_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY pos_cut_versions_select ON pos_cut_versions
        FOR SELECT USING (
          tenant_id = ((current_setting('request.jwt.claims', true)::json) ->> 'tenant_id')::UUID
        )
    $policy$;
  END IF;
END $$;

-- Policy INSERT: tenant isolation + created_by = auth user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pos_cut_versions' AND policyname = 'pos_cut_versions_insert'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY pos_cut_versions_insert ON pos_cut_versions
        FOR INSERT WITH CHECK (
          tenant_id = ((current_setting('request.jwt.claims', true)::json) ->> 'tenant_id')::UUID
        )
    $policy$;
  END IF;
END $$;

-- Policy UPDATE: tenant isolation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pos_cut_versions' AND policyname = 'pos_cut_versions_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY pos_cut_versions_update ON pos_cut_versions
        FOR UPDATE USING (
          tenant_id = ((current_setting('request.jwt.claims', true)::json) ->> 'tenant_id')::UUID
        )
    $policy$;
  END IF;
END $$;

-- Policy DELETE: tenant isolation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pos_cut_versions' AND policyname = 'pos_cut_versions_delete'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY pos_cut_versions_delete ON pos_cut_versions
        FOR DELETE USING (
          tenant_id = ((current_setting('request.jwt.claims', true)::json) ->> 'tenant_id')::UUID
        )
    $policy$;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_deliverable
  ON pos_cut_versions(deliverable_id);

CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_job
  ON pos_cut_versions(job_id);

CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_status
  ON pos_cut_versions(status) WHERE status IN ('enviado', 'aprovado');

-- Trigger updated_at (reutiliza funcao existente set_updated_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_pos_cut_versions_updated_at'
  ) THEN
    CREATE TRIGGER trg_pos_cut_versions_updated_at
      BEFORE UPDATE ON pos_cut_versions
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2.3. Seguranca: set search_path
-- ---------------------------------------------------------------------------

ALTER TABLE pos_cut_versions SET (security_invoker = on);
```

---

## 3. Edge Function: `pos-producao`

### 3.1. Estrutura de arquivos

```
supabase/functions/pos-producao/
  index.ts
  handlers/
    update-stage.ts          PATCH  /:deliverableId/stage
    update-assignee.ts       PATCH  /:deliverableId/assignee
    update-briefing.ts       PATCH  /:deliverableId/briefing
    update-drive-url.ts      PATCH  /:deliverableId/drive-url
    list-cut-versions.ts     GET    /:deliverableId/cut-versions
    create-cut-version.ts    POST   /:deliverableId/cut-versions
    update-cut-version.ts    PATCH  /:deliverableId/cut-versions/:versionId
    dashboard.ts             GET    /dashboard
```

### 3.2. Router (index.ts)

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleUpdateStage } from './handlers/update-stage.ts';
import { handleUpdateAssignee } from './handlers/update-assignee.ts';
import { handleUpdateBriefing } from './handlers/update-briefing.ts';
import { handleUpdateDriveUrl } from './handlers/update-drive-url.ts';
import { handleListCutVersions } from './handlers/list-cut-versions.ts';
import { handleCreateCutVersion } from './handlers/create-cut-version.ts';
import { handleUpdateCutVersion } from './handlers/update-cut-version.ts';
import { handleDashboard } from './handlers/dashboard.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos apos /pos-producao
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'pos-producao');
    const seg1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1] : null;
    const seg2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2] : null;
    const seg3 = fnIndex >= 0 && pathSegments.length > fnIndex + 3
      ? pathSegments[fnIndex + 3] : null;
    const seg4 = fnIndex >= 0 && pathSegments.length > fnIndex + 4
      ? pathSegments[fnIndex + 4] : null;

    // GET /pos-producao/dashboard
    if (seg1 === 'dashboard' && !seg2 && method === 'GET') {
      return await handleDashboard(req, auth);
    }

    // Rotas com :deliverableId (seg1 = UUID)
    if (seg1 && seg1 !== 'dashboard') {
      const deliverableId = seg1;

      // PATCH /pos-producao/:deliverableId/stage
      if (seg2 === 'stage' && !seg3 && method === 'PATCH') {
        return await handleUpdateStage(req, auth, deliverableId);
      }

      // PATCH /pos-producao/:deliverableId/assignee
      if (seg2 === 'assignee' && !seg3 && method === 'PATCH') {
        return await handleUpdateAssignee(req, auth, deliverableId);
      }

      // PATCH /pos-producao/:deliverableId/briefing
      if (seg2 === 'briefing' && !seg3 && method === 'PATCH') {
        return await handleUpdateBriefing(req, auth, deliverableId);
      }

      // PATCH /pos-producao/:deliverableId/drive-url
      if (seg2 === 'drive-url' && !seg3 && method === 'PATCH') {
        return await handleUpdateDriveUrl(req, auth, deliverableId);
      }

      // GET /pos-producao/:deliverableId/cut-versions
      if (seg2 === 'cut-versions' && !seg3 && method === 'GET') {
        return await handleListCutVersions(req, auth, deliverableId);
      }

      // POST /pos-producao/:deliverableId/cut-versions
      if (seg2 === 'cut-versions' && !seg3 && method === 'POST') {
        return await handleCreateCutVersion(req, auth, deliverableId);
      }

      // PATCH /pos-producao/:deliverableId/cut-versions/:versionId
      if (seg2 === 'cut-versions' && seg3 && !seg4 && method === 'PATCH') {
        return await handleUpdateCutVersion(req, auth, deliverableId, seg3);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[pos-producao] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
```

### 3.3. Constantes e Schemas de Validacao

Adicionar em `_shared/types.ts`:

```typescript
// === Onda 1.2: Pos-Producao ===

export const POS_STAGES = [
  'ingest', 'montagem', 'apresentacao_offline', 'revisao_offline',
  'aprovado_offline', 'finalizacao', 'apresentacao_online',
  'revisao_online', 'aprovado_online', 'copias', 'entregue',
] as const;

export type PosStage = (typeof POS_STAGES)[number];

export const CUT_VERSION_TYPES = ['offline', 'online'] as const;
export type CutVersionType = (typeof CUT_VERSION_TYPES)[number];

export const CUT_VERSION_STATUSES = ['rascunho', 'enviado', 'aprovado', 'rejeitado'] as const;
export type CutVersionStatus = (typeof CUT_VERSION_STATUSES)[number];

export interface PosCutVersionRow {
  id: string;
  tenant_id: string;
  deliverable_id: string;
  job_id: string;
  version_number: number;
  version_type: CutVersionType;
  review_url: string | null;
  status: CutVersionStatus;
  revision_notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}
```

Adicionar em `_shared/validation.ts`:

```typescript
import {
  POS_STAGES,
  CUT_VERSION_TYPES,
  CUT_VERSION_STATUSES,
} from './types.ts';

// ===== Schemas de Pos-Producao =====

export const UpdatePosStageSchema = z.object({
  pos_stage: z.enum(POS_STAGES, {
    errorMap: () => ({ message: 'Etapa de pos-producao invalida' }),
  }),
});

export const UpdatePosAssigneeSchema = z.object({
  pos_assignee_id: z.string().uuid('pos_assignee_id deve ser UUID valido').nullable(),
});

export const UpdatePosDriveUrlSchema = z.object({
  pos_drive_url: z.string().url('URL invalida').max(2000).nullable(),
});

export const PosBriefingSchema = z.object({
  codec_master: z.string().max(100).optional().nullable(),
  codec_entrega: z.string().max(100).optional().nullable(),
  resolucao: z.string().max(50).optional().nullable(),
  fps: z.string().max(20).optional().nullable(),
  aspect_ratio: z.string().max(20).optional().nullable(),
  lut_name: z.string().max(200).optional().nullable(),
  audio_specs: z.string().max(500).optional().nullable(),
  notas_tecnicas: z.string().max(5000).optional().nullable(),
}).strict();

export const UpdatePosBriefingSchema = z.object({
  pos_briefing: PosBriefingSchema.nullable(),
});

export const CreateCutVersionSchema = z.object({
  version_type: z.enum(CUT_VERSION_TYPES, {
    errorMap: () => ({ message: 'Tipo de versao deve ser offline ou online' }),
  }),
  review_url: z.string().url('URL de review invalida').max(2000).optional().nullable(),
  revision_notes: z.string().max(5000).optional().nullable(),
});

export const UpdateCutVersionSchema = z.object({
  status: z.enum(CUT_VERSION_STATUSES, {
    errorMap: () => ({ message: 'Status da versao invalido' }),
  }).optional(),
  review_url: z.string().url('URL de review invalida').max(2000).optional().nullable(),
  revision_notes: z.string().max(5000).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser enviado',
});
```

---

## 4. Handlers -- Detalhamento Completo

### 4.1. PATCH `/:deliverableId/stage` -- Atualizar etapa

**Handler:** `handlers/update-stage.ts`

| Campo | Valor |
|-------|-------|
| Auth | Obrigatorio |
| RBAC | admin, ceo, produtor_executivo, coordenador (PA-05: coord tambem pode retroceder) |
| Body Zod | `UpdatePosStageSchema` |
| Response | `{ data: DeliverableRow }` |

**Logica:**

1. Buscar deliverable pelo id (validar que existe e pertence ao tenant via RLS).
2. Validar body com `UpdatePosStageSchema`.
3. Sincronizar `deliverable_status` automaticamente:
   - `ingest`, `montagem`, `finalizacao` -> `em_producao`
   - `apresentacao_offline`, `revisao_offline`, `apresentacao_online`, `revisao_online` -> `aguardando_aprovacao`
   - `aprovado_offline`, `aprovado_online` -> `aprovado`
   - `copias` -> `aprovado`
   - `entregue` -> `entregue`
4. UPDATE `job_deliverables` SET `pos_stage`, `status` (sincronizado).
5. Registrar `job_history` com `event_type: 'status_change'`, `data_before: { pos_stage: old }`, `data_after: { pos_stage: new }`.
6. Retornar deliverable atualizado.

```typescript
// handlers/update-stage.ts
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdatePosStageSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';
import type { PosStage, DeliverableStatus } from '../../_shared/types.ts';

const STAGE_TO_STATUS: Record<PosStage, DeliverableStatus> = {
  ingest: 'em_producao',
  montagem: 'em_producao',
  apresentacao_offline: 'aguardando_aprovacao',
  revisao_offline: 'aguardando_aprovacao',
  aprovado_offline: 'aprovado',
  finalizacao: 'em_producao',
  apresentacao_online: 'aguardando_aprovacao',
  revisao_online: 'aguardando_aprovacao',
  aprovado_online: 'aprovado',
  copias: 'aprovado',
  entregue: 'entregue',
};

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador'];

export async function handleUpdateStage(
  req: Request,
  auth: AuthContext,
  deliverableId: string,
): Promise<Response> {
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Sem permissao para alterar etapa de pos-producao', 403);
  }

  const supabase = getSupabaseClient(auth.token);

  const { data: current, error: fetchErr } = await supabase
    .from('job_deliverables')
    .select('id, job_id, description, pos_stage, status')
    .eq('id', deliverableId)
    .is('deleted_at', null)
    .single();

  if (fetchErr || !current) {
    throw new AppError('NOT_FOUND', 'Entregavel nao encontrado', 404);
  }

  const body = await req.json();
  const { pos_stage } = validate(UpdatePosStageSchema, body);
  const syncedStatus = STAGE_TO_STATUS[pos_stage];

  const { data: updated, error: updateErr } = await supabase
    .from('job_deliverables')
    .update({ pos_stage, status: syncedStatus })
    .eq('id', deliverableId)
    .select()
    .single();

  if (updateErr) throw new AppError('INTERNAL_ERROR', updateErr.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId: current.job_id,
    eventType: 'status_change',
    userId: auth.userId,
    dataBefore: { pos_stage: current.pos_stage, status: current.status },
    dataAfter: { pos_stage, status: syncedStatus },
    description: `Etapa de pos do entregavel "${current.description}" alterada de "${current.pos_stage ?? 'nenhuma'}" para "${pos_stage}"`,
  });

  return success(updated, 200, req);
}
```

### 4.2. PATCH `/:deliverableId/assignee` -- Atribuir responsavel

| Campo | Valor |
|-------|-------|
| Auth | Obrigatorio |
| RBAC | admin, ceo, produtor_executivo, coordenador |
| Body Zod | `UpdatePosAssigneeSchema` |
| Response | `{ data: DeliverableRow }` |

**Logica:** Buscar deliverable, validar body, UPDATE `pos_assignee_id`, registrar history.

### 4.3. PATCH `/:deliverableId/briefing` -- Atualizar briefing tecnico

| Campo | Valor |
|-------|-------|
| Auth | Obrigatorio |
| RBAC | admin, ceo, produtor_executivo, coordenador |
| Body Zod | `UpdatePosBriefingSchema` |
| Response | `{ data: DeliverableRow }` |

**Logica:** Buscar deliverable, validar body (Zod strict impede campos desconhecidos), UPDATE `pos_briefing`, registrar history.

### 4.4. PATCH `/:deliverableId/drive-url` -- Atualizar link Drive

| Campo | Valor |
|-------|-------|
| Auth | Obrigatorio |
| RBAC | admin, ceo, produtor_executivo, coordenador |
| Body Zod | `UpdatePosDriveUrlSchema` |
| Response | `{ data: DeliverableRow }` |

### 4.5. GET `/:deliverableId/cut-versions` -- Listar versoes de corte

| Campo | Valor |
|-------|-------|
| Auth | Obrigatorio |
| RBAC | Qualquer usuario com acesso ao job (RLS resolve) |
| Query params | Nenhum |
| Response | `{ data: PosCutVersionRow[] }` |

**Logica:**

```typescript
export async function handleListCutVersions(
  req: Request,
  auth: AuthContext,
  deliverableId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Validar que o deliverable existe (RLS garante tenant)
  const { data: del, error: delErr } = await supabase
    .from('job_deliverables')
    .select('id')
    .eq('id', deliverableId)
    .is('deleted_at', null)
    .single();

  if (delErr || !del) {
    throw new AppError('NOT_FOUND', 'Entregavel nao encontrado', 404);
  }

  const { data, error: listErr } = await supabase
    .from('pos_cut_versions')
    .select('*, created_by_profile:profiles!created_by(id, full_name), approved_by_profile:profiles!approved_by(id, full_name)')
    .eq('deliverable_id', deliverableId)
    .order('version_type', { ascending: true })
    .order('version_number', { ascending: true });

  if (listErr) throw new AppError('INTERNAL_ERROR', listErr.message, 500);

  return success(data ?? [], 200, req);
}
```

### 4.6. POST `/:deliverableId/cut-versions` -- Criar versao de corte

| Campo | Valor |
|-------|-------|
| Auth | Obrigatorio |
| RBAC | admin, ceo, produtor_executivo, coordenador, editor (quem esta na equipe de pos) |
| Body Zod | `CreateCutVersionSchema` |
| Response | `{ data: PosCutVersionRow }` (201) |

**Logica:**

1. Buscar deliverable (pegar `job_id` e `tenant_id`).
2. Validar body.
3. Calcular `version_number` = MAX(version_number WHERE deliverable_id AND version_type) + 1 (ou 1 se nenhuma).
4. INSERT em `pos_cut_versions`.
5. Registrar history: `"Versao V{n} ({version_type}) criada para entregavel X"`.
6. Retornar 201.

```typescript
export async function handleCreateCutVersion(
  req: Request,
  auth: AuthContext,
  deliverableId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data: del, error: delErr } = await supabase
    .from('job_deliverables')
    .select('id, job_id, tenant_id, description')
    .eq('id', deliverableId)
    .is('deleted_at', null)
    .single();

  if (delErr || !del) {
    throw new AppError('NOT_FOUND', 'Entregavel nao encontrado', 404);
  }

  const body = await req.json();
  const validated = validate(CreateCutVersionSchema, body);

  // Calcular proximo version_number
  const { data: maxRow } = await supabase
    .from('pos_cut_versions')
    .select('version_number')
    .eq('deliverable_id', deliverableId)
    .eq('version_type', validated.version_type)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (maxRow?.version_number ?? 0) + 1;

  const { data: version, error: insertErr } = await supabase
    .from('pos_cut_versions')
    .insert({
      tenant_id: auth.tenantId,
      deliverable_id: deliverableId,
      job_id: del.job_id,
      version_number: nextVersion,
      version_type: validated.version_type,
      review_url: validated.review_url ?? null,
      revision_notes: validated.revision_notes ?? null,
      status: 'rascunho',
      created_by: auth.userId,
    })
    .select()
    .single();

  if (insertErr) throw new AppError('INTERNAL_ERROR', insertErr.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId: del.job_id,
    eventType: 'field_update',
    userId: auth.userId,
    dataAfter: {
      deliverable_id: deliverableId,
      version_id: version.id,
      version_number: nextVersion,
      version_type: validated.version_type,
    },
    description: `Versao V${nextVersion} (${validated.version_type}) criada para entregavel "${del.description}"`,
  });

  return created(version, req);
}
```

### 4.7. PATCH `/:deliverableId/cut-versions/:versionId` -- Aprovar/Rejeitar/Editar versao

| Campo | Valor |
|-------|-------|
| Auth | Obrigatorio |
| RBAC (aprovar/rejeitar) | admin, ceo, produtor_executivo, atendimento (CA-02.8) |
| RBAC (editar review_url/notes) | Qualquer usuario com acesso ao job |
| Body Zod | `UpdateCutVersionSchema` |
| Response | `{ data: PosCutVersionRow }` |

**Logica principal de aprovacao/rejeicao:**

1. Buscar versao e deliverable.
2. Validar body.
3. Se `status === 'rejeitado'` e `revision_notes` ausente ou vazio: rejeitar com VALIDATION_ERROR ("Notas de revisao sao obrigatorias ao rejeitar").
4. Se `status === 'aprovado'`:
   - Setar `approved_by = auth.userId`, `approved_at = NOW()`.
   - Atualizar `pos_stage` do deliverable: se `version_type === 'offline'` -> `aprovado_offline`; se `online` -> `aprovado_online`.
   - Sincronizar `deliverable_status` -> `aprovado`.
5. Se `status === 'rejeitado'`:
   - Atualizar `pos_stage` do deliverable: se `version_type === 'offline'` -> `revisao_offline`; se `online` -> `revisao_online`.
   - Sincronizar `deliverable_status` -> `aguardando_aprovacao`.
6. Registrar history.

```typescript
export async function handleUpdateCutVersion(
  req: Request,
  auth: AuthContext,
  deliverableId: string,
  versionId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data: version, error: vErr } = await supabase
    .from('pos_cut_versions')
    .select('*, deliverable:job_deliverables!deliverable_id(id, job_id, description, pos_stage)')
    .eq('id', versionId)
    .eq('deliverable_id', deliverableId)
    .single();

  if (vErr || !version) {
    throw new AppError('NOT_FOUND', 'Versao de corte nao encontrada', 404);
  }

  const body = await req.json();
  const validated = validate(UpdateCutVersionSchema, body);

  // RBAC: aprovar/rejeitar so para roles especificos
  const APPROVAL_ROLES = ['admin', 'ceo', 'produtor_executivo', 'atendimento'];
  if (validated.status && ['aprovado', 'rejeitado'].includes(validated.status)) {
    if (!APPROVAL_ROLES.includes(auth.role)) {
      throw new AppError('FORBIDDEN', 'Sem permissao para aprovar/rejeitar versoes', 403);
    }
  }

  // Rejeicao exige notas
  if (validated.status === 'rejeitado') {
    const notes = validated.revision_notes ?? version.revision_notes;
    if (!notes || notes.trim().length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Notas de revisao sao obrigatorias ao rejeitar uma versao', 400);
    }
  }

  // Montar payload de update
  const updatePayload: Record<string, unknown> = {};
  if (validated.status !== undefined) updatePayload.status = validated.status;
  if (validated.review_url !== undefined) updatePayload.review_url = validated.review_url;
  if (validated.revision_notes !== undefined) updatePayload.revision_notes = validated.revision_notes;

  // Aprovacao: setar approved_by e approved_at
  if (validated.status === 'aprovado') {
    updatePayload.approved_by = auth.userId;
    updatePayload.approved_at = new Date().toISOString();
  }

  const { data: updated, error: updateErr } = await supabase
    .from('pos_cut_versions')
    .update(updatePayload)
    .eq('id', versionId)
    .select()
    .single();

  if (updateErr) throw new AppError('INTERNAL_ERROR', updateErr.message, 500);

  // Side-effect: atualizar pos_stage do deliverable ao aprovar/rejeitar
  if (validated.status === 'aprovado' || validated.status === 'rejeitado') {
    const STAGE_TO_STATUS: Record<string, string> = {
      aprovado_offline: 'aprovado',
      aprovado_online: 'aprovado',
      revisao_offline: 'aguardando_aprovacao',
      revisao_online: 'aguardando_aprovacao',
    };

    let newStage: string;
    if (validated.status === 'aprovado') {
      newStage = version.version_type === 'offline' ? 'aprovado_offline' : 'aprovado_online';
    } else {
      newStage = version.version_type === 'offline' ? 'revisao_offline' : 'revisao_online';
    }

    await supabase
      .from('job_deliverables')
      .update({
        pos_stage: newStage,
        status: STAGE_TO_STATUS[newStage],
      })
      .eq('id', deliverableId);

    await insertHistory(supabase, {
      tenantId: auth.tenantId,
      jobId: version.deliverable.job_id,
      eventType: 'approval',
      userId: auth.userId,
      dataBefore: { version_status: version.status, pos_stage: version.deliverable.pos_stage },
      dataAfter: { version_status: validated.status, pos_stage: newStage },
      description: `Versao V${version.version_number} (${version.version_type}) do entregavel "${version.deliverable.description}" ${validated.status === 'aprovado' ? 'aprovada' : 'rejeitada'}`,
    });
  }

  return success(updated, 200, req);
}
```

### 4.8. GET `/dashboard` -- Dashboard cross-jobs

| Campo | Valor |
|-------|-------|
| Auth | Obrigatorio |
| RBAC | admin, ceo, produtor_executivo, coordenador, editor, freelancer (filtrado por acesso) |
| Query params | `stage` (opcional), `assignee_id` (opcional), `job_id` (opcional), `deadline` (`today` / `week` / `overdue`, opcional) |
| Response | `{ data: DashboardDeliverable[] }` |

**Logica:**

```typescript
export async function handleDashboard(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);
  const url = new URL(req.url);

  // Query base: todos os deliverables em pos-producao (pos_stage NOT NULL, status != entregue)
  let query = supabase
    .from('job_deliverables')
    .select(`
      id, job_id, description, format, resolution, duration_seconds,
      status, delivery_date, pos_stage, pos_assignee_id, pos_drive_url,
      display_order, created_at,
      job:jobs!job_id(id, title, code, client_id, client:clients!client_id(id, name)),
      assignee:profiles!pos_assignee_id(id, full_name, avatar_url)
    `)
    .not('pos_stage', 'is', null)
    .neq('status', 'entregue')
    .is('deleted_at', null);

  // Filtros opcionais
  const stage = url.searchParams.get('stage');
  if (stage) query = query.eq('pos_stage', stage);

  const assigneeId = url.searchParams.get('assignee_id');
  if (assigneeId) query = query.eq('pos_assignee_id', assigneeId);

  const jobId = url.searchParams.get('job_id');
  if (jobId) query = query.eq('job_id', jobId);

  const deadline = url.searchParams.get('deadline');
  const now = new Date();
  if (deadline === 'overdue') {
    query = query.lt('delivery_date', now.toISOString().slice(0, 10));
  } else if (deadline === 'today') {
    query = query.eq('delivery_date', now.toISOString().slice(0, 10));
  } else if (deadline === 'week') {
    const weekLater = new Date(now.getTime() + 7 * 86400000);
    query = query.lte('delivery_date', weekLater.toISOString().slice(0, 10));
  }

  query = query.order('delivery_date', { ascending: true, nullsFirst: false });

  const { data, error: dbErr } = await query;
  if (dbErr) throw new AppError('INTERNAL_ERROR', dbErr.message, 500);

  return success(data ?? [], 200, req);
}
```

---

## 5. Tipos TypeScript (Frontend)

**Arquivo:** `frontend/src/types/pos-producao.ts`

```typescript
// =============================================================================
// Onda 1.2: Pos-Producao -- Tipos do frontend
// =============================================================================

// --- Etapas de pos-producao ---

export const POS_STAGES = [
  'ingest', 'montagem', 'apresentacao_offline', 'revisao_offline',
  'aprovado_offline', 'finalizacao', 'apresentacao_online',
  'revisao_online', 'aprovado_online', 'copias', 'entregue',
] as const;

export type PosStage = (typeof POS_STAGES)[number];

export type PosStageBlock = 'pre' | 'offline' | 'online' | 'entrega';

export interface PosStageInfo {
  value: PosStage;
  label: string;
  block: PosStageBlock;
}

export const POS_STAGE_MAP: PosStageInfo[] = [
  { value: 'ingest', label: 'Ingest', block: 'pre' },
  { value: 'montagem', label: 'Montagem', block: 'offline' },
  { value: 'apresentacao_offline', label: 'Apresentacao Offline', block: 'offline' },
  { value: 'revisao_offline', label: 'Revisao Offline', block: 'offline' },
  { value: 'aprovado_offline', label: 'Aprovado Offline', block: 'offline' },
  { value: 'finalizacao', label: 'Finalizacao', block: 'online' },
  { value: 'apresentacao_online', label: 'Apresentacao Online', block: 'online' },
  { value: 'revisao_online', label: 'Revisao Online', block: 'online' },
  { value: 'aprovado_online', label: 'Aprovado Online', block: 'online' },
  { value: 'copias', label: 'Copias', block: 'entrega' },
  { value: 'entregue', label: 'Entregue', block: 'entrega' },
];

export const POS_BLOCK_COLORS: Record<PosStageBlock, { bg: string; text: string; border: string }> = {
  pre: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600' },
  offline: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  online: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  entrega: { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
};

// --- Briefing tecnico ---

export interface PosBriefing {
  codec_master?: string | null;
  codec_entrega?: string | null;
  resolucao?: string | null;
  fps?: string | null;
  aspect_ratio?: string | null;
  lut_name?: string | null;
  audio_specs?: string | null;
  notas_tecnicas?: string | null;
}

export const POS_BRIEFING_FIELDS: Array<{ key: keyof PosBriefing; label: string; placeholder: string }> = [
  { key: 'codec_master', label: 'Codec Master', placeholder: 'Ex: ProRes 4444' },
  { key: 'codec_entrega', label: 'Codec Entrega', placeholder: 'Ex: H.264' },
  { key: 'resolucao', label: 'Resolucao', placeholder: 'Ex: 1920x1080' },
  { key: 'fps', label: 'FPS', placeholder: 'Ex: 23.976' },
  { key: 'aspect_ratio', label: 'Aspect Ratio', placeholder: 'Ex: 16:9' },
  { key: 'lut_name', label: 'LUT', placeholder: 'Ex: Ellah_REC709_v2.cube' },
  { key: 'audio_specs', label: 'Audio', placeholder: 'Ex: 48kHz, 24bit, stereo, -23 LUFS' },
  { key: 'notas_tecnicas', label: 'Notas Tecnicas', placeholder: 'Instrucoes adicionais...' },
];

// --- Versao de corte ---

export type CutVersionType = 'offline' | 'online';
export type CutVersionStatus = 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado';

export interface CutVersion {
  id: string;
  tenant_id: string;
  deliverable_id: string;
  job_id: string;
  version_number: number;
  version_type: CutVersionType;
  review_url: string | null;
  status: CutVersionStatus;
  revision_notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionais
  created_by_profile?: { id: string; full_name: string } | null;
  approved_by_profile?: { id: string; full_name: string } | null;
}

export const CUT_VERSION_STATUS_LABELS: Record<CutVersionStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

export const CUT_VERSION_STATUS_COLORS: Record<CutVersionStatus, { bg: string; text: string }> = {
  rascunho: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  enviado: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300' },
  aprovado: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  rejeitado: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
};

// --- Entregavel estendido para pos-producao (join do dashboard) ---

export interface PosDeliverable {
  id: string;
  job_id: string;
  description: string;
  format: string | null;
  resolution: string | null;
  duration_seconds: number | null;
  status: string;
  delivery_date: string | null;
  pos_stage: PosStage | null;
  pos_assignee_id: string | null;
  pos_drive_url: string | null;
  pos_briefing: PosBriefing | null;
  display_order: number;
  created_at: string;
  // Joins do dashboard
  job?: {
    id: string;
    title: string;
    code: string;
    client_id: string;
    client?: { id: string; name: string } | null;
  };
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

// --- Formularios ---

export interface CutVersionFormData {
  version_type: CutVersionType;
  review_url: string;
  revision_notes: string;
}

export interface ApproveRejectFormData {
  status: 'aprovado' | 'rejeitado';
  revision_notes: string;
}

export interface PosBriefingFormData extends PosBriefing {}

// --- Filtros do dashboard ---

export interface PosDashboardFilters {
  stage?: PosStage;
  assignee_id?: string;
  job_id?: string;
  deadline?: 'today' | 'week' | 'overdue';
}
```

---

## 6. Query Keys e Hooks React Query

### 6.1. Query Keys

Adicionar em `frontend/src/lib/query-keys.ts`:

```typescript
export const posProducaoKeys = {
  all: ['pos-producao'] as const,
  dashboard: (filters: Record<string, string>) =>
    [...posProducaoKeys.all, 'dashboard', filters] as const,
  cutVersions: (deliverableId: string) =>
    [...posProducaoKeys.all, 'cut-versions', deliverableId] as const,
};
```

### 6.2. Hook: `usePosProducao.ts`

**Arquivo:** `frontend/src/hooks/usePosProducao.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { posProducaoKeys, jobKeys } from '@/lib/query-keys'
import type {
  CutVersion,
  CutVersionFormData,
  ApproveRejectFormData,
  PosDeliverable,
  PosBriefing,
  PosStage,
  PosDashboardFilters,
} from '@/types/pos-producao'

// ---------------------------------------------------------------------------
// usePosDashboard — Lista cross-jobs para pagina /pos-producao
// ---------------------------------------------------------------------------

export function usePosDashboard(filters: PosDashboardFilters) {
  const params: Record<string, string> = {}
  if (filters.stage) params.stage = filters.stage
  if (filters.assignee_id) params.assignee_id = filters.assignee_id
  if (filters.job_id) params.job_id = filters.job_id
  if (filters.deadline) params.deadline = filters.deadline

  const query = useQuery({
    queryKey: posProducaoKeys.dashboard(params),
    queryFn: () => apiGet<PosDeliverable[]>('pos-producao', params, 'dashboard'),
    staleTime: 30_000,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useCutVersions — Lista versoes de corte de um entregavel
// ---------------------------------------------------------------------------

export function useCutVersions(deliverableId: string) {
  const query = useQuery({
    queryKey: posProducaoKeys.cutVersions(deliverableId),
    queryFn: () =>
      apiGet<CutVersion[]>('pos-producao', undefined, `${deliverableId}/cut-versions`),
    staleTime: 60_000,
    enabled: !!deliverableId,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useUpdatePosStage — Atualizar etapa de pos
// ---------------------------------------------------------------------------

export function useUpdatePosStage(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ deliverableId, posStage }: { deliverableId: string; posStage: PosStage }) =>
      apiMutate('pos-producao', 'PATCH', { pos_stage: posStage }, `${deliverableId}/stage`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
      queryClient.invalidateQueries({ queryKey: posProducaoKeys.all })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useUpdatePosAssignee — Atribuir responsavel
// ---------------------------------------------------------------------------

export function useUpdatePosAssignee(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ deliverableId, assigneeId }: { deliverableId: string; assigneeId: string | null }) =>
      apiMutate('pos-producao', 'PATCH', { pos_assignee_id: assigneeId }, `${deliverableId}/assignee`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
      queryClient.invalidateQueries({ queryKey: posProducaoKeys.all })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useUpdatePosBriefing — Atualizar briefing tecnico
// ---------------------------------------------------------------------------

export function useUpdatePosBriefing(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ deliverableId, briefing }: { deliverableId: string; briefing: PosBriefing | null }) =>
      apiMutate('pos-producao', 'PATCH', { pos_briefing: briefing }, `${deliverableId}/briefing`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useUpdatePosDriveUrl — Atualizar link Drive
// ---------------------------------------------------------------------------

export function useUpdatePosDriveUrl(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ deliverableId, driveUrl }: { deliverableId: string; driveUrl: string | null }) =>
      apiMutate('pos-producao', 'PATCH', { pos_drive_url: driveUrl }, `${deliverableId}/drive-url`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useCreateCutVersion — Criar nova versao de corte
// ---------------------------------------------------------------------------

export function useCreateCutVersion(jobId: string, deliverableId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (form: CutVersionFormData) =>
      apiMutate<CutVersion>(
        'pos-producao',
        'POST',
        {
          version_type: form.version_type,
          review_url: form.review_url || null,
          revision_notes: form.revision_notes || null,
        },
        `${deliverableId}/cut-versions`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posProducaoKeys.cutVersions(deliverableId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useUpdateCutVersion — Aprovar, rejeitar ou editar versao de corte
// ---------------------------------------------------------------------------

export function useUpdateCutVersion(jobId: string, deliverableId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ versionId, ...payload }: { versionId: string } & Partial<ApproveRejectFormData & { review_url: string | null }>) =>
      apiMutate<CutVersion>(
        'pos-producao',
        'PATCH',
        payload as Record<string, unknown>,
        `${deliverableId}/cut-versions/${versionId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posProducaoKeys.cutVersions(deliverableId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
      queryClient.invalidateQueries({ queryKey: posProducaoKeys.all })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
```

---

## 7. Componentes Frontend -- Arvore e Especificacoes

### 7.1. Estrutura de arquivos

```
frontend/src/
  components/job-detail/tabs/
    TabPosProducao.tsx                        NEW
    pos-producao/
      DeliverableStageCard.tsx                NEW
      CutVersionHistory.tsx                   NEW
      AddCutVersionDialog.tsx                 NEW
      ApproveRejectDialog.tsx                 NEW
      PosBriefingPanel.tsx                    NEW
      PosDriveLink.tsx                        NEW
      PosStageSelect.tsx                      NEW
      PosAssigneeSelect.tsx                   NEW
  app/(dashboard)/
    pos-producao/
      page.tsx                                NEW
      layout.tsx                              NEW (route guard)
      _components/
        PosKanbanView.tsx                     NEW
        PosListView.tsx                       NEW
        PosDashboardFilters.tsx               NEW
  types/
    pos-producao.ts                           NEW
  hooks/
    usePosProducao.ts                         NEW
```

### 7.2. Componentes -- Props e Responsabilidades

#### `TabPosProducao`

```typescript
interface TabPosProducaoProps {
  job: JobDetail;
}
```

**Responsabilidades:**
- Layout principal: lista de entregaveis a esquerda, painel de detalhe a direita (desktop). Em mobile, lista colapsavel com detalhe abaixo.
- Busca entregaveis via `useJobDeliverables(job.id)` (hook existente) e filtra os que tem `pos_stage` nao nulo OU permite iniciar pos para qualquer entregavel.
- State local: `selectedDeliverableId`.
- Botao "Iniciar Pos-Producao" em cada entregavel que ainda nao tem `pos_stage` (seta para `ingest` ao clicar).
- Renderiza `DeliverableStageCard` para cada entregavel, e o painel de detalhe com `CutVersionHistory`, `PosBriefingPanel`, `PosDriveLink`.

#### `DeliverableStageCard`

```typescript
interface DeliverableStageCardProps {
  deliverable: JobDeliverable; // tipo existente estendido com pos_*
  isSelected: boolean;
  onSelect: () => void;
  onStageChange: (stage: PosStage) => void;
  canEdit: boolean;
}
```

**Responsabilidades:**
- Card clicavel com: nome do entregavel, `PosStageSelect`, nome do responsavel, prazo, badge de atencao (CA-01.5).
- Badge vermelho se `delivery_date` vencido, amarelo se faltam <= 3 dias.
- Badge "Aguarda Aprovacao" se `pos_stage` e `apresentacao_offline` ou `apresentacao_online`.
- Cor de fundo/borda conforme bloco (offline=azul, online=roxo, entrega=verde).

#### `PosStageSelect`

```typescript
interface PosStageSelectProps {
  value: PosStage | null;
  onChange: (stage: PosStage) => void;
  disabled: boolean;
}
```

**Responsabilidades:**
- Select usando shadcn Select com opcoes agrupadas por bloco (Pre, Offline, Online, Entrega).
- Label em portugues, cor por bloco.

#### `PosAssigneeSelect`

```typescript
interface PosAssigneeSelectProps {
  jobId: string;
  value: string | null;
  onChange: (assigneeId: string | null) => void;
  disabled: boolean;
}
```

**Responsabilidades:**
- Combobox que lista membros da equipe do job (busca via `useJobTeam`).
- Mostra avatar + nome. Opcao "Sem responsavel" para limpar.

#### `CutVersionHistory`

```typescript
interface CutVersionHistoryProps {
  deliverableId: string;
  jobId: string;
  canApprove: boolean;  // RBAC: PE, CEO, admin, atendimento
  canCreate: boolean;   // RBAC: PE, CEO, admin, coord, editor
}
```

**Responsabilidades:**
- Lista versoes de corte via `useCutVersions(deliverableId)`.
- Agrupa por `version_type` (Offline / Online), ordenada por `version_number`.
- Cada versao mostra: numero (V1, V2...), status badge, link de review (botao externo), notas, quem criou, data.
- Versao aprovada mais recente fica destacada com borda verde.
- Botao "Nova Versao" abre `AddCutVersionDialog`.
- Botao "Aprovar" / "Rejeitar" em versoes com status `enviado` abre `ApproveRejectDialog`.

#### `AddCutVersionDialog`

```typescript
interface AddCutVersionDialogProps {
  deliverableId: string;
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Responsabilidades:**
- Dialog com form: Select `version_type` (Offline/Online), Input `review_url` (qualquer URL), Textarea `revision_notes` (opcional).
- `version_number` e calculado automaticamente pelo backend.
- Ao submeter: `useCreateCutVersion`.

#### `ApproveRejectDialog`

```typescript
interface ApproveRejectDialogProps {
  version: CutVersion;
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Responsabilidades:**
- Dialog com 2 tabs: "Aprovar" e "Rejeitar".
- Tab Rejeitar: Textarea `revision_notes` OBRIGATORIO. Se vazio, botao Rejeitar fica desabilitado.
- Tab Aprovar: Texto confirmando que a versao sera aprovada e a etapa sera automaticamente atualizada.
- Ao submeter: `useUpdateCutVersion`.

#### `PosBriefingPanel`

```typescript
interface PosBriefingPanelProps {
  deliverableId: string;
  jobId: string;
  briefing: PosBriefing | null;
  canEdit: boolean;
}
```

**Responsabilidades:**
- Collapsible panel com 8 campos do briefing (ver `POS_BRIEFING_FIELDS`).
- Modo leitura: exibe campos preenchidos com label. Badge "N/8 campos" no header.
- Modo edicao (para roles com permissao): inline edit com save/cancel.
- Campo `notas_tecnicas` e textarea, demais sao inputs simples.

#### `PosDriveLink`

```typescript
interface PosDriveLinkProps {
  deliverableId: string;
  jobId: string;
  driveUrl: string | null;
  jobDriveFolderUrl: string | null; // do job.drive_folder_url
  canEdit: boolean;
}
```

**Responsabilidades:**
- Se preenchido: botao com icone Drive linkando para a URL.
- Se vazio e canEdit: input com botao "Sugerir" que preenche com `{jobDriveFolderUrl}/08_POS_PRODUCAO/` (se disponivel).
- Save inline.

#### `PosKanbanView` (Dashboard)

```typescript
interface PosKanbanViewProps {
  deliverables: PosDeliverable[];
  isLoading: boolean;
}
```

**Responsabilidades:**
- 11 colunas (uma por etapa), cada uma com cards de entregaveis.
- Card: nome do entregavel, nome do job (link), responsavel, prazo.
- Borda vermelha se prazo vencido, amarela se <= 3 dias.
- NAO tem drag-and-drop na v1 (mudanca de etapa e via painel de detalhe).

#### `PosListView` (Dashboard)

```typescript
interface PosListViewProps {
  deliverables: PosDeliverable[];
  isLoading: boolean;
}
```

**Responsabilidades:**
- Tabela agrupada por job (linhas expandiveis).
- Colunas: Entregavel, Etapa, Responsavel, Prazo, Versao Atual, Status.
- Click no entregavel navega para `/jobs/{jobId}?tab=pos_producao`.

#### `PosDashboardFilters`

```typescript
interface PosDashboardFiltersProps {
  filters: PosDashboardFilters;
  onChange: (filters: PosDashboardFilters) => void;
}
```

**Responsabilidades:**
- Select de etapa (todas as 11 + "Todas").
- Select de responsavel (carregado do backend).
- Select de prazo (Todos / Hoje / Esta semana / Atrasados).
- Input de busca por job (autocomplete ou select).
- Toggle Kanban / Lista.

---

## 8. RBAC -- Mapa Completo

### 8.1. Tab `pos_producao` no Job Detail

Adicionar ao `JobDetailTabId` em `constants.ts`:

```typescript
// Adicionar 'pos_producao' ao union type
export type JobDetailTabId =
  | 'geral' | 'equipe' | 'entregaveis' | 'financeiro'
  | 'diarias' | 'locacoes' | 'aprovacoes' | 'contratos'
  | 'ppm' | 'cronograma' | 'claquete' | 'storyboard'
  | 'elenco' | 'ordem-do-dia' | 'diario' | 'figurino'
  | 'atendimento' | 'horas-extras' | 'historico' | 'portal'
  | 'pos_producao'  // NOVO

// Adicionar ao array JOB_DETAIL_TABS:
{ id: 'pos_producao', label: 'Pos-Producao', icon: 'Scissors' },
```

### 8.2. Mapa de acesso na tab

Adicionar ao `ACCESS_MAP` em `access-control-map.ts`:

| Grupo | Acesso a `pos_producao` |
|-------|------------------------|
| admin | view_edit |
| pe | view_edit |
| dp | view |
| coord | view_edit |
| fin | hidden |
| jur | hidden |
| atd | view (pode aprovar versoes, mas nao edita pipeline) |
| cco | hidden |
| dc | view |
| dop | hidden |
| pos | view_edit |
| da | hidden |
| fig | hidden |
| cas | hidden |
| tec | hidden |

**Regra especial para aprovacao de versoes:** O RBAC de aprovacao e checado no BACKEND (handler update-cut-version.ts), nao depende do nivel de acesso da tab. Atendimento tem `view` na tab mas pode aprovar/rejeitar versoes via dialog.

### 8.3. Mapa de acesso por funcionalidade

| Funcionalidade | Roles permitidos (user_role) |
|----------------|------------------------------|
| Ver tab pos-producao | admin, ceo, PE, coord, editor*, colorista*, finalizador*, cco*, DC, atendimento |
| Alterar etapa (pos_stage) | admin, ceo, PE, coordenador |
| Atribuir responsavel | admin, ceo, PE, coordenador |
| Editar briefing tecnico | admin, ceo, PE, coordenador |
| Editar link Drive | admin, ceo, PE, coordenador |
| Criar versao de corte | admin, ceo, PE, coordenador + editor* (equipe do job) |
| Aprovar/rejeitar versao | admin, ceo, PE, atendimento |
| Ver dashboard /pos-producao | admin, ceo, PE, coordenador, editor, freelancer (pos) |

(*) Via team_role -> grupo `pos` no access-control-map

### 8.4. Sidebar

Adicionar em `SIDEBAR_ACCESS`:

```typescript
'/pos-producao': [...FULL_ACCESS, 'coordenador'],
```

Nota: editores e freelancers de pos veem a tab dentro do job, mas nao a pagina global `/pos-producao` (apenas lideranca e coordenador). Decisao conservadora; pode ser ampliada.

### 8.5. Route Guard

Criar `frontend/src/app/(dashboard)/pos-producao/layout.tsx`:

```typescript
'use client'

import { useRouteGuard } from '@/hooks/useRouteGuard'

export default function PosProducaoLayout({ children }: { children: React.ReactNode }) {
  useRouteGuard(['admin', 'ceo', 'produtor_executivo', 'coordenador'])
  return <>{children}</>
}
```

---

## 9. Integracao com Componentes Existentes

### 9.1. Registro da tab no Job Detail

**Arquivo:** `frontend/src/lib/constants.ts`

1. Adicionar `'pos_producao'` ao type union `JobDetailTabId`.
2. Adicionar ao array `JOB_DETAIL_TABS`:
   ```typescript
   { id: 'pos_producao', label: 'Pos-Producao', icon: 'Scissors' },
   ```
3. Posicionar APOS 'entregaveis' na ordem visual.

**Arquivo:** `frontend/src/lib/access-control-map.ts`

1. Adicionar `'pos_producao'` ao `ALL_TABS_VE`.
2. Adicionar entradas em cada grupo do `ACCESS_MAP` conforme secao 8.2.
3. Adicionar `'pos_producao'` ao array `allTabs` em `getVisibleTabs()`.

### 9.2. Badge de entregaveis atrasados no JobHeader

**Arquivo:** `frontend/src/components/job-detail/JobHeader.tsx`

Adicionar badge ao lado do `PreProductionBadge` existente:

```typescript
import { PosProductionBadge } from '@/components/job-detail/tabs/pos-producao/PosProductionBadge'

// Dentro do header, ao lado de PreProductionBadge:
<PosProductionBadge jobId={job.id} deliverables={job.deliverables} />
```

**Componente `PosProductionBadge`:**
- Conta entregaveis com `delivery_date` vencido que tenham `pos_stage` nao nulo.
- Se count > 0: badge vermelho com texto "N atrasado(s)".
- Se count === 0 e existem entregaveis em pos: badge neutro com contagem de etapas em andamento.

### 9.3. Badges de atraso na TabEntregaveis existente

**Arquivo:** `frontend/src/components/job-detail/tabs/TabEntregaveis.tsx`

Na coluna de status de cada entregavel, exibir:
- Badge com label da `pos_stage` (quando preenchida) ao lado do `deliverable_status`.
- Cor do badge segue bloco (azul/roxo/verde).
- Icone de alerta se prazo vencido.

### 9.4. Link na Sidebar

**Arquivo:** `frontend/src/components/layout/Sidebar.tsx`

Adicionar item:
```typescript
{
  label: 'Pos-Producao',
  href: '/pos-producao',
  icon: Scissors,
}
```

Posicionar abaixo de "Pre-Producao" no grupo de producao.

---

## 10. Plano de Sprints (Detalhado)

### Sprint 1 -- Backend + Types + Hooks (1.5 dias)

| # | Tarefa | Tipo | Arquivos |
|---|--------|------|----------|
| 1 | Migration SQL (colunas + tabela + RLS + indexes + trigger) | NEW | `supabase/migrations/20260309100000_onda_1_2_pos_producao.sql` |
| 2 | Constantes + tipos backend (POS_STAGES, PosCutVersionRow, etc.) | EDIT | `_shared/types.ts` |
| 3 | Schemas Zod (6 schemas) | EDIT | `_shared/validation.ts` |
| 4 | EF pos-producao: index.ts + 8 handlers | NEW | `supabase/functions/pos-producao/` |
| 5 | Deploy EF | DEPLOY | |
| 6 | Tipos frontend | NEW | `frontend/src/types/pos-producao.ts` |
| 7 | Query keys | EDIT | `frontend/src/lib/query-keys.ts` |
| 8 | Hooks React Query (8 hooks) | NEW | `frontend/src/hooks/usePosProducao.ts` |

### Sprint 2 -- Frontend Tab Pos-Producao (1.5 dias)

| # | Tarefa | Tipo | Arquivos |
|---|--------|------|----------|
| 1 | TabPosProducao (layout + lista + detalhe) | NEW | `components/job-detail/tabs/TabPosProducao.tsx` |
| 2 | DeliverableStageCard | NEW | `components/job-detail/tabs/pos-producao/DeliverableStageCard.tsx` |
| 3 | PosStageSelect | NEW | `components/job-detail/tabs/pos-producao/PosStageSelect.tsx` |
| 4 | PosAssigneeSelect | NEW | `components/job-detail/tabs/pos-producao/PosAssigneeSelect.tsx` |
| 5 | CutVersionHistory | NEW | `components/job-detail/tabs/pos-producao/CutVersionHistory.tsx` |
| 6 | AddCutVersionDialog | NEW | `components/job-detail/tabs/pos-producao/AddCutVersionDialog.tsx` |
| 7 | ApproveRejectDialog | NEW | `components/job-detail/tabs/pos-producao/ApproveRejectDialog.tsx` |
| 8 | PosBriefingPanel | NEW | `components/job-detail/tabs/pos-producao/PosBriefingPanel.tsx` |
| 9 | PosDriveLink | NEW | `components/job-detail/tabs/pos-producao/PosDriveLink.tsx` |
| 10 | Registrar tab em constants + access-control-map + getVisibleTabs | EDIT | `constants.ts`, `access-control-map.ts` |

### Sprint 3 -- Dashboard + Alertas + Polish (1.5 dias)

| # | Tarefa | Tipo | Arquivos |
|---|--------|------|----------|
| 1 | Pagina /pos-producao + layout guard | NEW | `app/(dashboard)/pos-producao/page.tsx`, `layout.tsx` |
| 2 | PosDashboardFilters | NEW | `app/(dashboard)/pos-producao/_components/PosDashboardFilters.tsx` |
| 3 | PosKanbanView | NEW | `app/(dashboard)/pos-producao/_components/PosKanbanView.tsx` |
| 4 | PosListView | NEW | `app/(dashboard)/pos-producao/_components/PosListView.tsx` |
| 5 | PosProductionBadge no JobHeader | NEW + EDIT | `pos-producao/PosProductionBadge.tsx`, `JobHeader.tsx` |
| 6 | Badges de pos_stage na TabEntregaveis | EDIT | `TabEntregaveis.tsx` |
| 7 | Link na Sidebar + SIDEBAR_ACCESS | EDIT | `Sidebar.tsx`, `access-control-map.ts` |
| 8 | Dark mode + mobile responsivo em todos os componentes | EDIT | Todos os componentes novos |

---

## 11. Perguntas Abertas Resolvidas e Pendentes

| ID | Pergunta | Resolucao |
|----|----------|-----------|
| PA-01 | Jobs de fotografia e motion graphics usam o mesmo pipeline? | **PENDENTE.** Implementar com 11 etapas. Se simplificacao for necessaria, e uma UI change (esconder etapas irrelevantes), nao uma mudanca de schema. |
| PA-02 | Envio externo de link de review? | **FORA DE ESCOPO (Onda 3).** Links sao registrados manualmente por agora. |
| PA-03 | Sincronizar `pos_sub_status` do job automaticamente? | **NAO nesta onda.** `pos_sub_status` e campo legado atualizado manualmente. Em onda futura pode ser derivado da etapa do entregavel com mais atraso. |
| PA-04 | Avancar sem versao de corte? | **RESOLVIDO: SIM.** Workflow flexivel. |
| PA-05 | Quem pode retroceder etapa? | **RESOLVIDO: Coordenador tambem pode.** Roles = admin, ceo, PE, coordenador. |

---

## 12. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Conflito de concurrent UPDATE no version_number | Baixa | Medio | UNIQUE constraint no banco + retry no frontend |
| Performance do dashboard com muitos entregaveis | Baixa | Medio | Indexes em pos_stage e delivery_date + paginacao se necessario |
| UI poluida com muitas etapas no Select | Media | Baixo | Agrupar etapas por bloco no Select |
| Confusao entre `deliverable_status` (generico) e `pos_stage` (pos) | Media | Alto | `pos_stage` e a fonte de verdade durante pos; `deliverable_status` e sincronizado automaticamente. Documentar claramente. |
