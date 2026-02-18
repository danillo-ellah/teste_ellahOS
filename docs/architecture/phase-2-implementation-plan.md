# Plano de Implementacao - Fase 2: Edge Functions CRUD do Modulo Jobs

**Data:** 2026-02-17
**Autor:** Tech Lead - ELLAHOS
**ADR:** docs/decisions/ADR-001-edge-functions-architecture.md
**Pre-requisito:** Fase 1 concluida (schema auditado, 7/7 testes passando)

---

## 1. PREREQUISITOS BLOQUEANTES

Antes de iniciar qualquer Edge Function, os seguintes BUGs criticos da Fase 1 DEVEM ser corrigidos. As Edge Functions serao escritas assumindo o banco correto.

### Fase 1.5 - Correcoes de Schema (estimativa: 1-2 dias)

| Ordem | BUG | Descricao | Tipo de correcao |
|-------|-----|-----------|-----------------|
| 1 | BUG-001 | Health Score max 90 em vez de 100 | Reescrever trigger calculate_health_score |
| 2 | BUG-002 | Campo `created_by` ausente em jobs | ALTER TABLE ADD COLUMN |
| 3 | BUG-003 | Campo `custom_fields` ausente em jobs | ALTER TABLE ADD COLUMN |
| 4 | BUG-004 | job_code sem lock atomico | Criar tabela job_code_sequences + reescrever trigger |
| 5 | BUG-005 | shooting_dates como array em vez de tabela | CREATE TABLE + migrar dados |
| 6 | BUG-006 | deliverable_status sem valor 'aprovado' | ALTER TYPE ADD VALUE |
| 7 | BUG-007 | job_files sem version e updated_at | ALTER TABLE ADD COLUMN (x2) |
| 8 | BUG-008 | approval_type ingles/portugues | **DECISAO: manter portugues (interna/externa_cliente). Atualizar spec.** |
| 9 | CRITICO-001 | RLS policy com bug de auto-referencia | Reescrever policy de profiles |
| 10 | FA-004 | Indice full-text search faltante | CREATE INDEX |
| 11 | FA-005 | Indice composto listagem ativa faltante | CREATE INDEX |
| 12 | FA-006 | Campos account_email e job_category faltantes | ALTER TABLE ADD COLUMN (x2) |

**IMPORTANTE:** A Fase 2 so comeca APOS todas estas correcoes serem aplicadas e validadas.

---

## 2. ESTRUTURA DE PASTAS

```
supabase/
  functions/
    _shared/
      cors.ts
      auth.ts
      response.ts
      validation.ts
      supabase-client.ts
      types.ts
      errors.ts
      history.ts
      column-map.ts
      pagination.ts
    jobs/
      index.ts
      handlers/
        create.ts
        list.ts
        get-by-id.ts
        update.ts
        delete.ts
    jobs-status/
      index.ts
      handlers/
        update-status.ts
        approve.ts
    jobs-team/
      index.ts
      handlers/
        list.ts
        add-member.ts
        update-member.ts
        remove-member.ts
    jobs-deliverables/
      index.ts
      handlers/
        list.ts
        create.ts
        update.ts
        delete.ts
    jobs-shooting-dates/
      index.ts
      handlers/
        list.ts
        create.ts
        update.ts
        delete.ts
    jobs-history/
      index.ts
      handlers/
        list.ts
```

---

## 3. ORDEM DE IMPLEMENTACAO

A implementacao segue uma ordem deliberada: shared code primeiro, depois CRUD principal, depois sub-recursos.

### Sprint 1: Fundacao (shared code + CRUD Jobs basico)

**Estimativa:** 3-4 dias

#### Passo 1: _shared/ modules (dia 1)

Implementar na seguinte ordem (cada um depende dos anteriores):

1. **`cors.ts`** - Headers CORS para permitir chamadas do frontend
   ```typescript
   // Exporta:
   // - corsHeaders: Record<string, string>
   // - handleCors(req): Response | null  (pre-flight OPTIONS)
   ```

2. **`errors.ts`** - Codigos de erro padronizados
   ```typescript
   // Exporta:
   // - ErrorCode enum: VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN,
   //                    CONFLICT, BUSINESS_RULE_VIOLATION, INTERNAL_ERROR
   // - AppError class extends Error { code, statusCode, details }
   ```

3. **`response.ts`** - Helpers de response
   ```typescript
   // Exporta:
   // - success(data, status?): Response
   // - created(data): Response
   // - paginated(data, meta): Response
   // - error(appError): Response
   // - error(code, message, status, details?): Response
   ```

4. **`auth.ts`** - Autenticacao e extracao de tenant
   ```typescript
   // Exporta:
   // - interface AuthContext { userId: string, tenantId: string, email: string, role: string }
   // - async getAuthContext(req: Request): Promise<AuthContext>
   //   - Extrai Bearer token do header Authorization
   //   - Verifica via supabase.auth.getUser()
   //   - Extrai tenant_id de app_metadata
   //   - Lanca AppError(UNAUTHORIZED) se invalido
   ```

5. **`supabase-client.ts`** - Clientes Supabase
   ```typescript
   // Exporta:
   // - getSupabaseClient(token: string): SupabaseClient  // com RLS do usuario
   // - getServiceClient(): SupabaseClient                 // service_role, bypass RLS
   ```

6. **`types.ts`** - Tipos TypeScript
   ```typescript
   // Exporta interfaces:
   // - Job, JobCreate, JobUpdate, JobListFilters
   // - TeamMember, TeamMemberCreate, TeamMemberUpdate
   // - Deliverable, DeliverableCreate, DeliverableUpdate
   // - ShootingDate, ShootingDateCreate, ShootingDateUpdate
   // - HistoryEvent, HistoryFilters
   // - PaginationMeta, PaginatedResponse
   // - ApiResponse<T>, ApiError
   //
   // Exporta enums como arrays de string:
   // - JOB_STATUSES, JOB_TYPES, PRIORITIES, SEGMENTS, etc.
   // (valores reais do banco, nao da spec)
   ```

7. **`column-map.ts`** - Traducao spec <-> banco
   ```typescript
   // Exporta:
   // - mapApiToDb(apiPayload: Record<string,any>): Record<string,any>
   // - mapDbToApi(dbRow: Record<string,any>): Record<string,any>
   // - mapApiToDbEnum(enumName: string, apiValue: string): string
   // - mapDbToApiEnum(enumName: string, dbValue: string): string
   //
   // Mapeamentos:
   //   API fee -> DB rate
   //   API is_lead_producer -> DB is_responsible_producer
   //   API previous_data -> DB data_before
   //   API new_data -> DB data_after
   //   API approval_type:internal -> DB approval_type:interna
   //   API approval_type:external -> DB approval_type:externa_cliente
   //   etc.
   ```

8. **`validation.ts`** - Schemas Zod
   ```typescript
   // Importa Zod via: import { z } from "https://esm.sh/zod@3.22.4";
   //
   // Exporta:
   // - CreateJobSchema
   // - UpdateJobSchema
   // - UpdateStatusSchema
   // - ApproveJobSchema
   // - CreateTeamMemberSchema
   // - UpdateTeamMemberSchema
   // - CreateDeliverableSchema
   // - UpdateDeliverableSchema
   // - CreateShootingDateSchema
   // - UpdateShootingDateSchema
   // - ListJobsFiltersSchema
   // - ListHistoryFiltersSchema
   //
   // Helper:
   // - validate<T>(schema: ZodSchema<T>, data: unknown): T  (lanca AppError se invalido)
   ```

9. **`pagination.ts`** - Helpers de paginacao
   ```typescript
   // Exporta:
   // - interface PaginationParams { page: number, perPage: number, sortBy: string, sortOrder: 'asc'|'desc' }
   // - parsePagination(url: URL): PaginationParams
   // - applyPagination(query: PostgrestFilterBuilder, params: PaginationParams): PostgrestFilterBuilder
   // - buildMeta(total: number, params: PaginationParams): PaginationMeta
   ```

10. **`history.ts`** - Helper de audit trail
    ```typescript
    // Exporta:
    // - async insertHistory(client: SupabaseClient, params: {
    //     tenantId: string,
    //     jobId: string,
    //     eventType: HistoryEventType,
    //     userId: string,
    //     dataBefore?: Record<string,any>,
    //     dataAfter?: Record<string,any>,
    //     description: string
    //   }): Promise<void>
    //
    // Usa nomes reais do banco: data_before, data_after (NAO previous_data, new_data)
    ```

#### Passo 2: Edge Function `jobs` - CRUD principal (dias 2-3)

**`supabase/functions/jobs/index.ts`** - Roteador principal

```typescript
// Roteamento:
// OPTIONS *           -> handleCors
// POST /              -> createJob
// GET /               -> listJobs
// GET /:id            -> getJobById
// PATCH /:id          -> updateJob
// DELETE /:id         -> deleteJob
// *                   -> 405 Method Not Allowed
```

**Handlers em ordem de implementacao:**

1. **`create.ts`** - POST /jobs
   - Validar payload com CreateJobSchema
   - Mapear campos API -> banco via column-map
   - INSERT na tabela jobs (trigger gera code + job_aba automaticamente)
   - INSERT em job_history (event_type: 'created')
   - Retornar job criado mapeado banco -> API
   - Status: 201

2. **`get-by-id.ts`** - GET /jobs/:id
   - Extrair id da URL
   - SELECT com JOINs opcionais baseado em ?include=team,deliverables,shooting_dates,history
   - JOIN com clients e agencies para popular nomes
   - WHERE deleted_at IS NULL
   - Mapear banco -> API
   - 404 se nao encontrado

3. **`list.ts`** - GET /jobs
   - Parsear query params (filtros, paginacao, ordenacao)
   - Validar filtros com ListJobsFiltersSchema
   - Construir query dinamica com filtros condicionais:
     - status (multi-valor, separado por virgula)
     - client_id, agency_id
     - search (full-text search com to_tsquery)
     - date_from/date_to (expected_delivery_date)
     - margin_min/margin_max
     - health_score_min/health_score_max
     - tags (array overlap)
     - is_archived (default: false)
     - parent_job_id
   - COUNT total para paginacao
   - SELECT com LIMIT/OFFSET
   - Mapear resultados banco -> API
   - Retornar com meta de paginacao

4. **`update.ts`** - PATCH /jobs/:id
   - Validar payload com UpdateJobSchema
   - Verificar que job existe e nao esta deletado
   - Buscar estado atual (para job_history)
   - Mapear campos API -> banco
   - Filtrar campos imutaveis (id, tenant_id, index_number, code, job_aba, created_at)
   - UPDATE
   - INSERT em job_history para cada campo alterado (event_type: 'field_update')
   - Retornar job atualizado mapeado banco -> API

5. **`delete.ts`** - DELETE /jobs/:id
   - Verificar que job existe
   - Verificar que nao tem sub-jobs ativos (WHERE parent_job_id = id AND deleted_at IS NULL)
   - UPDATE SET deleted_at = now()
   - INSERT em job_history (event_type: 'archived')
   - Retornar { id, deleted_at }

#### Passo 3: Primeiro deploy e teste (dia 3-4)

- Deploy da funcao `jobs` via MCP `deploy_edge_function`
- Testes manuais com curl/Postman:
  - Criar job (POST)
  - Listar jobs (GET)
  - Buscar por ID (GET/:id)
  - Atualizar (PATCH/:id)
  - Soft delete (DELETE/:id)
- Validar que RLS esta funcionando (tenant isolation)
- Validar que job_code e gerado automaticamente
- Validar que job_history e populado

---

### Sprint 2: Status + Equipe (dependem do CRUD Jobs)

**Estimativa:** 2-3 dias

#### Passo 4: Edge Function `jobs-status` (dia 4-5)

**`update-status.ts`** - PATCH /jobs/:id/status

Regras de validacao de transicao:
```
- Para "selecao_diretor": requer approval_date E closed_value preenchidos
- Para "entregue": requer pelo menos 1 entregavel com status "entregue" em job_deliverables
- Para "cancelado": requer cancellation_reason no payload
- Para "finalizado": requer actual_delivery_date preenchida
- Para "pausado": nao pode vir de "finalizado" ou "cancelado"
```

Apos mudanca de status:
- INSERT em job_history (event_type: 'status_change', data_before: {status: old}, data_after: {status: new})
- Se novo status = "selecao_diretor": disparar webhook para n8n (notificacao WhatsApp para todos)

**`approve.ts`** - POST /jobs/:id/approve

Fluxo:
1. Validar payload (approval_type, approval_date, closed_value obrigatorios)
2. Mapear approval_type: internal -> interna, external -> externa_cliente
3. UPDATE job: status = 'selecao_diretor', approval_type, approved_by_user_id, approval_date, closed_value
4. INSERT em job_history
5. Disparar webhook n8n

#### Passo 5: Edge Function `jobs-team` (dia 5-6)

**`list.ts`** - GET /jobs/:id/team
- SELECT de job_team WHERE job_id AND deleted_at IS NULL
- JOIN com people para popular person_name
- Mapear: rate -> fee, is_responsible_producer -> is_lead_producer

**`add-member.ts`** - POST /jobs/:id/team
- Validar payload
- Verificar que job existe
- INSERT em job_team (mapeando fee -> rate, is_lead_producer -> is_responsible_producer)
- Verificar conflito de agenda (SELECT shooting_dates de outros jobs do mesmo person_id) - retornar como WARNING, nao bloquear
- INSERT em job_history (event_type: 'team_change')
- Trigger do banco recalcula health_score automaticamente

**`update-member.ts`** - PATCH /jobs/:id/team/:member_id
- Validar que member_id pertence ao job_id
- UPDATE parcial
- INSERT em job_history

**`remove-member.ts`** - DELETE /jobs/:id/team/:member_id
- Soft delete (SET deleted_at)
- INSERT em job_history
- Trigger recalcula health_score

---

### Sprint 3: Deliverables + Shooting Dates + History

**Estimativa:** 2-3 dias

#### Passo 6: Edge Function `jobs-deliverables` (dia 7)

CRUD padrao identico ao team, mas sem logica de conflito de agenda.
- Validar que status esta no enum correto (incluindo 'aprovado' que foi adicionado na Fase 1.5)
- INSERT em job_history para cada mudanca (event_type: 'deliverable_change')

#### Passo 7: Edge Function `jobs-shooting-dates` (dia 7-8)

CRUD padrao na tabela job_shooting_dates (criada na Fase 1.5).
- Validar: shooting_date obrigatoria, start_time < end_time se ambos fornecidos
- INSERT em job_history para cada mudanca

#### Passo 8: Edge Function `jobs-history` (dia 8)

Somente leitura (GET).
- Filtros por event_type (multi-valor)
- Paginacao
- JOIN com profiles para popular user_name
- Mapear: data_before -> previous_data, data_after -> new_data (na resposta da API)
- Ordenacao: created_at DESC (mais recente primeiro)

---

### Sprint 4: Testes integrais e hardening

**Estimativa:** 2 dias

#### Passo 9: Suite de testes (dia 9-10)

Script de teste automatizado (Deno test ou script Python/Node):

**Cenarios de teste obrigatorios:**

| # | Cenario | Metodo | Endpoint | Validacao |
|---|---------|--------|----------|-----------|
| T01 | Criar job minimo | POST | /jobs | 201, code gerado, status = briefing_recebido |
| T02 | Criar job completo | POST | /jobs | 201, todos campos retornados |
| T03 | Criar job sem title | POST | /jobs | 400, VALIDATION_ERROR |
| T04 | Criar job sem client_id | POST | /jobs | 400, VALIDATION_ERROR |
| T05 | Listar jobs (vazio) | GET | /jobs | 200, data=[], meta.total=0 |
| T06 | Listar jobs com filtro status | GET | /jobs?status=briefing_recebido | 200, filtro aplicado |
| T07 | Listar jobs com paginacao | GET | /jobs?page=1&per_page=2 | 200, meta correta |
| T08 | Listar jobs com busca textual | GET | /jobs?search=campanha | 200, match por titulo |
| T09 | Buscar job por ID | GET | /jobs/:id | 200, job completo |
| T10 | Buscar job com includes | GET | /jobs/:id?include=team,deliverables | 200, sub-recursos populados |
| T11 | Buscar job inexistente | GET | /jobs/:id_fake | 404, NOT_FOUND |
| T12 | Atualizar job (titulo) | PATCH | /jobs/:id | 200, titulo atualizado, history criado |
| T13 | Atualizar job (financeiro) | PATCH | /jobs/:id | 200, tax_value recalculado |
| T14 | Atualizar campo imutavel | PATCH | /jobs/:id | Campo ignorado (nao erro) |
| T15 | Soft delete job | DELETE | /jobs/:id | 200, deleted_at preenchido |
| T16 | Delete job com sub-jobs | DELETE | /jobs/:id | 409, CONFLICT |
| T17 | Atualizar status valido | PATCH | /jobs/:id/status | 200, status atualizado, history |
| T18 | Status cancelado sem motivo | PATCH | /jobs/:id/status | 422, BUSINESS_RULE_VIOLATION |
| T19 | Status entregue sem deliverable | PATCH | /jobs/:id/status | 422, BUSINESS_RULE_VIOLATION |
| T20 | Aprovar job | POST | /jobs/:id/approve | 200, status = selecao_diretor |
| T21 | Adicionar membro equipe | POST | /jobs/:id/team | 201, health_score atualizado |
| T22 | Conflito de agenda (warning) | POST | /jobs/:id/team | 201, warnings[] populado |
| T23 | Remover membro equipe | DELETE | /jobs/:id/team/:mid | 200, soft delete |
| T24 | CRUD deliverable completo | POST+PATCH+DELETE | /jobs/:id/deliverables | Ciclo completo |
| T25 | CRUD shooting date completo | POST+PATCH+DELETE | /jobs/:id/shooting-dates | Ciclo completo |
| T26 | Listar historico | GET | /jobs/:id/history | 200, eventos ordenados desc |
| T27 | Historico com filtro tipo | GET | /jobs/:id/history?event_type=status_change | 200, filtrado |
| T28 | Token invalido | GET | /jobs | 401, UNAUTHORIZED |
| T29 | Tenant isolation | GET | /jobs | 200, somente jobs do tenant |
| T30 | Idempotencia: criar 2x | POST | /jobs | Sem duplicata de code |

---

## 4. DEFINICAO FASE 2 vs FASE 5

### FASE 2 - "CRUD Basico" (este plano) - Total: 6 Edge Functions

| Funcao | Endpoints | Justificativa |
|--------|-----------|---------------|
| `jobs` | POST, GET, GET/:id, PATCH, DELETE | Core: sem isso nao existe modulo |
| `jobs-status` | PATCH status, POST approve | Core: lifecycle e o valor principal |
| `jobs-team` | CRUD equipe | Core: equipe impacta health score, alertas |
| `jobs-deliverables` | CRUD entregaveis | Core: entregaveis impactam status "entregue" |
| `jobs-shooting-dates` | CRUD diarias | Core: calendario de producao |
| `jobs-history` | GET historico | Core: auditoria obrigatoria (requisito spec) |

### FASE 5 - "Features Avancadas" (plano futuro)

| Funcao | Endpoints | Justificativa do adiamento |
|--------|-----------|---------------------------|
| `jobs-attachments` | POST multipart, GET, DELETE | Depende de Supabase Storage configurado + upload strategy |
| `jobs-export` | POST (gera XLSX/CSV/PDF) | Depende de lib de geracao de planilha/PDF no Deno |
| `jobs-duplicate` | POST | Feature secundaria, Ellah nao usa duplicacao real |
| `jobs-health-score` | POST recalc + breakdown | Health score ja funciona via trigger. Endpoint de breakdown e nice-to-have |
| `jobs-drive` | POST create structure | Depende de Google Drive API + credenciais + n8n |
| `jobs-budget-letter` | POST generate | Depende de Google Docs API + template |
| `jobs-cast-contract` | POST generate | Depende de Google Docs API + DocuSeal |

---

## 5. PADROES DE CODIGO

### 5.1 Entry point padrao (index.ts de cada funcao)

```typescript
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleCors, corsHeaders } from "../_shared/cors.ts";
import { getAuthContext } from "../_shared/auth.ts";
import { error } from "../_shared/response.ts";
import { AppError } from "../_shared/errors.ts";

// Importar handlers
import { createJob } from "./handlers/create.ts";
import { listJobs } from "./handlers/list.ts";
import { getJobById } from "./handlers/get-by-id.ts";
import { updateJob } from "./handlers/update.ts";
import { deleteJob } from "./handlers/delete.ts";

serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Autenticacao
    const auth = await getAuthContext(req);

    // Parsear URL para roteamento
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // pathParts apos /functions/v1/jobs: [] ou [":id"]

    const method = req.method;
    const jobId = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;

    // Roteamento
    if (method === "POST" && !jobId) {
      return await createJob(req, auth);
    }
    if (method === "GET" && !jobId) {
      return await listJobs(req, auth);
    }
    if (method === "GET" && jobId) {
      return await getJobById(req, auth, jobId);
    }
    if (method === "PATCH" && jobId) {
      return await updateJob(req, auth, jobId);
    }
    if (method === "DELETE" && jobId) {
      return await deleteJob(req, auth, jobId);
    }

    return error("METHOD_NOT_ALLOWED", "Metodo nao permitido", 405);

  } catch (err) {
    if (err instanceof AppError) {
      return error(err.code, err.message, err.statusCode, err.details);
    }
    console.error("Unhandled error:", err);
    return error("INTERNAL_ERROR", "Erro interno do servidor", 500);
  }
});
```

### 5.2 Handler padrao (exemplo create.ts)

```typescript
import { getSupabaseClient } from "../../_shared/supabase-client.ts";
import { created } from "../../_shared/response.ts";
import { AppError } from "../../_shared/errors.ts";
import { validate, CreateJobSchema } from "../../_shared/validation.ts";
import { mapApiToDb, mapDbToApi } from "../../_shared/column-map.ts";
import { insertHistory } from "../../_shared/history.ts";
import type { AuthContext } from "../../_shared/auth.ts";

export async function createJob(req: Request, auth: AuthContext) {
  // 1. Parsear e validar body
  const body = await req.json();
  const validated = validate(CreateJobSchema, body);

  // 2. Mapear campos API -> banco
  const dbPayload = mapApiToDb({
    ...validated,
    tenant_id: auth.tenantId,
    created_by: auth.userId,
  });

  // 3. Inserir no banco
  const supabase = getSupabaseClient(auth.token);
  const { data: job, error: dbError } = await supabase
    .from("jobs")
    .insert(dbPayload)
    .select()
    .single();

  if (dbError) {
    if (dbError.code === "23505") {
      throw new AppError("CONFLICT", "Job com este codigo ja existe", 409);
    }
    throw new AppError("INTERNAL_ERROR", dbError.message, 500);
  }

  // 4. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId: job.id,
    eventType: "created",
    userId: auth.userId,
    dataAfter: job,
    description: `Job "${job.title}" criado`,
  });

  // 5. Retornar mapeado banco -> API
  return created({ data: mapDbToApi(job) });
}
```

### 5.3 Convencoes de codigo

- **Lingua do codigo:** ingles (variaveis, funcoes, tipos)
- **Lingua dos comentarios:** portugues brasileiro
- **Lingua das mensagens de erro para o usuario:** portugues brasileiro
- **Lingua dos codigos de erro (enums):** ingles (VALIDATION_ERROR, NOT_FOUND)
- **Imports:** sempre com URL completa (esm.sh para libs externas, caminho relativo para _shared)
- **Async/await:** sempre (nunca .then())
- **Error handling:** throw AppError, catch no index.ts
- **Logs:** console.error para erros, console.log para debug (remover antes de prod)
- **Nenhum any:** TypeScript strict

---

## 6. ESTIMATIVA TOTAL

| Sprint | Conteudo | Dias | Acumulado |
|--------|----------|------|-----------|
| 0 | Fase 1.5 - correcoes schema | 1-2 | 2 |
| 1 | _shared/ + CRUD jobs | 3-4 | 6 |
| 2 | jobs-status + jobs-team | 2-3 | 9 |
| 3 | jobs-deliverables + shooting-dates + history | 2-3 | 12 |
| 4 | Testes integrais + hardening | 2 | 14 |
| **TOTAL** | **Fase 2 completa** | **10-14 dias** | |

---

## 7. CRITERIOS DE DONE (Fase 2)

- [ ] 6 Edge Functions deployadas e funcionando
- [ ] 10 _shared/ modules implementados
- [ ] 30 cenarios de teste passando
- [ ] RLS tenant isolation validado
- [ ] Audit trail (job_history) funcionando para todas operacoes
- [ ] Health score recalculado automaticamente (equipe, URLs, datas)
- [ ] Validacao de transicao de status implementada
- [ ] Webhook para n8n disparando na aprovacao
- [ ] Mapa de nomes spec<->banco funcionando sem leaks
- [ ] Zero erros 500 em cenarios de teste
- [ ] Documentacao da API atualizada

---

## 8. DECISOES TECNICAS

### D1: Por que Zod via esm.sh e nao validacao manual?
Zod oferece inferencia de tipos, mensagens de erro claras e composicao de schemas. O overhead de import via esm.sh e desprezivel apos cold start (cached pelo Deno).

### D2: Por que nao usar PostgREST diretamente para CRUD simples?
Precisamos de logica de negocio (validacao de status, audit trail, webhook, mapa de nomes) em todas as operacoes. Expor PostgREST direto nao permitiria isso e criaria dois caminhos de acesso ao dado.

### D3: Por que manter nomes da spec na API e nao do banco?
A API e o contrato externo. Se renomearmos colunas no banco no futuro (ex: unificar code+job_aba em job_code), a API nao muda. Protege o frontend de mudancas de schema.

### D4: Por que 6 funcoes e nao 1?
Separacao de concerns: cada funcao tem 1 responsabilidade. Deploy independente: posso atualizar `jobs-status` sem redeploy de `jobs`. Cold start aceitavel: cada funcao carrega apenas seus handlers.

### D5: Estrategia de roteamento interno
Usamos URL path parsing simples (split por "/"). Nao precisamos de framework de routing (Hono, Oak) na Fase 2 porque a arvore de rotas e pequena (max 5 rotas por funcao). Se crescer, migrar para Hono.

---

**Fim do Plano de Implementacao - Fase 2**
