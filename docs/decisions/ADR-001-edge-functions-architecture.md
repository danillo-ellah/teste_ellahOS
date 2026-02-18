# ADR-001: Arquitetura das Edge Functions do Modulo Jobs

**Data:** 2026-02-17
**Status:** Aceito
**Autor:** Tech Lead - ELLAHOS
**Contexto:** Fase 2 - Edge Functions CRUD para modulo Jobs

---

## Contexto

A Fase 1 (Schema do banco) foi concluida e auditada com 7/7 testes passando. Agora precisamos expor o modulo Jobs via API REST usando Supabase Edge Functions. A arquitetura original (docs/architecture/jobs-module.md secoes 5.1-5.14) define 14 endpoints agrupados em 13 categorias.

Supabase Edge Functions tem as seguintes restricoes:
- Cada Edge Function e um endpoint unico (ex: `/functions/v1/jobs`)
- Roteamento interno por metodo HTTP (GET/POST/PATCH/DELETE) dentro da funcao
- Runtime Deno (TypeScript nativo, sem node_modules)
- Compartilhamento de codigo via pasta `_shared/` (convencao Supabase)
- Deploy individual por funcao via CLI ou MCP
- Cada funcao recebe o Request completo e retorna um Response

Decisoes chave a tomar:
1. Quantas Edge Functions criar (1 mega vs N separadas)
2. Como compartilhar codigo entre funcoes
3. Padrao de error handling, validacao e response
4. Estrategia de autenticacao e extracao de tenant_id
5. Como lidar com o mapa de nomes divergentes (spec vs banco real)

---

## Decisao

### 1. Organizacao: 6 Edge Functions com roteamento interno

Nem 1 mega funcao nem 14 funcoes atomicas. Agrupamos por **dominio logico e frequencia de mudanca**:

| # | Edge Function | Rotas internas | Fase |
|---|--------------|----------------|------|
| 1 | `jobs` | POST, GET (list), GET/:id, PATCH/:id, DELETE/:id | Fase 2 |
| 2 | `jobs-status` | PATCH /:id/status, POST /:id/approve | Fase 2 |
| 3 | `jobs-team` | GET, POST, PATCH/:member_id, DELETE/:member_id | Fase 2 |
| 4 | `jobs-deliverables` | GET, POST, PATCH/:id, DELETE/:id | Fase 2 |
| 5 | `jobs-shooting-dates` | GET, POST, PATCH/:id, DELETE/:id | Fase 2 |
| 6 | `jobs-history` | GET (list com filtros) | Fase 2 |
| 7 | `jobs-attachments` | POST (multipart), GET, DELETE | Fase 5 |
| 8 | `jobs-export` | POST (gera arquivo) | Fase 5 |
| 9 | `jobs-duplicate` | POST | Fase 5 |
| 10 | `jobs-health-score` | POST (force recalc + breakdown) | Fase 5 |
| 11 | `jobs-drive` | POST create-drive-structure | Fase 5 |
| 12 | `jobs-budget-letter` | POST generate-budget-letter | Fase 5 |
| 13 | `jobs-cast-contract` | POST generate-cast-contract | Fase 5 |

**Justificativa do agrupamento:**
- `jobs`: CRUD principal e o mais acessado. Manter junto evita latencia de cold start duplicado.
- `jobs-status` + `approve`: ambos alteram status e disparam webhooks. Logica compartilhada de validacao de transicao de status.
- `jobs-team`, `jobs-deliverables`, `jobs-shooting-dates`: sub-recursos CRUD identicos em padrao. Separados porque tem regras de negocio distintas.
- `jobs-history`: somente leitura, padrao diferente (append-only, sem write).
- Funcoes 7-13: features avancadas que dependem de integracao externa (Storage, Google Drive, n8n) e podem ter deploy independente.

### 2. Shared Code via `_shared/`

Estrutura de pastas:

```
supabase/functions/
  _shared/
    cors.ts              -- Headers CORS padrao
    auth.ts              -- Extrair user_id e tenant_id do JWT
    response.ts          -- Helpers de response padrao (success, error, paginated)
    validation.ts        -- Schema validation com Zod (importado via esm.sh)
    supabase-client.ts   -- Criar client Supabase com service_role para bypass RLS quando necessario
    types.ts             -- Tipos TypeScript (Job, TeamMember, Deliverable, etc.)
    errors.ts            -- Codigos e mensagens de erro padronizados
    history.ts           -- Helper para inserir registro em job_history
    column-map.ts        -- Mapa de nomes spec->banco e banco->spec (resolve divergencias)
    pagination.ts        -- Helper de paginacao (parse query params, montar meta)
  jobs/
    index.ts             -- Entry point com roteamento por metodo + path
    handlers/
      create.ts          -- POST /jobs
      list.ts            -- GET /jobs
      get-by-id.ts       -- GET /jobs/:id
      update.ts          -- PATCH /jobs/:id
      delete.ts          -- DELETE /jobs/:id
  jobs-status/
    index.ts
    handlers/
      update-status.ts   -- PATCH /jobs/:id/status
      approve.ts         -- POST /jobs/:id/approve
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

### 3. Padrao de Response

Toda resposta segue este formato:

```typescript
// Sucesso
{
  "data": T | T[],
  "meta"?: {
    "total": number,
    "page": number,
    "per_page": number,
    "total_pages": number
  },
  "warnings"?: Array<{ code: string, message: string }>
}

// Erro
{
  "error": {
    "code": string,        // ex: "VALIDATION_ERROR", "NOT_FOUND", "FORBIDDEN"
    "message": string,     // mensagem legivel em portugues
    "details"?: object     // detalhes adicionais (campo invalido, etc.)
  }
}
```

HTTP Status Codes:
- 200: Sucesso (GET, PATCH, DELETE)
- 201: Criado (POST)
- 400: Validacao falhou
- 401: Token ausente ou invalido
- 403: Sem permissao (tenant errado, role insuficiente)
- 404: Recurso nao encontrado
- 409: Conflito (ex: job_code duplicado, race condition)
- 422: Regra de negocio violada (ex: status "cancelado" sem motivo)
- 500: Erro interno

### 4. Autenticacao e Multi-tenancy

Fluxo em toda Edge Function:

```typescript
// 1. Extrair token do header Authorization
// 2. Verificar JWT via supabase.auth.getUser(token)
// 3. Extrair tenant_id do JWT claims (app_metadata.tenant_id)
// 4. Extrair user_id do JWT (sub claim)
// 5. Criar supabase client com RLS ativo (usa token do usuario)
// 6. Todas as queries sao filtradas automaticamente por RLS
// 7. Para operacoes administrativas, usar service_role client + filtro manual por tenant_id
```

O tenant_id NUNCA vem do payload da request. Sempre do JWT.

### 5. Mapa de Nomes (Camada de Traducao)

Para resolver as divergencias entre spec/arquitetura e banco real, criamos um modulo `column-map.ts` que traduz em ambas as direcoes:

**API aceita e retorna nomes da SPEC (contratos de API estabilizados).**
**Banco usa nomes REAIS (como implementados na Fase 1).**

A Edge Function traduz na entrada (request -> banco) e na saida (banco -> response).

Mapa principal:
```
API (spec)              -> Banco (real)
---                     ---
job_code                -> code + job_aba (separados)
fee                     -> rate
is_lead_producer        -> is_responsible_producer
previous_data           -> data_before
new_data                -> data_after
approval_type: internal -> approval_type: interna
approval_type: external -> approval_type: externa_cliente
job_type (enum name)    -> project_type (enum name)
job_priority (enum)     -> priority_level (enum)
segment_type (enum)     -> client_segment (enum)
sub_status              -> pos_sub_status
job_team_members (tbl)  -> job_team (tbl)
job_attachments (tbl)   -> job_files (tbl)
```

### 6. Validacao com Zod

Cada handler define seu schema de validacao com Zod (importado via esm.sh):

```typescript
import { z } from "https://esm.sh/zod@3.22.4";

const CreateJobSchema = z.object({
  title: z.string().min(1).max(500),
  client_id: z.string().uuid(),
  job_type: z.enum([...JOB_TYPES]),
  // ... campos opcionais com .optional()
});
```

Validacao acontece ANTES de qualquer query ao banco.

### 7. Audit Trail (job_history)

Toda operacao de escrita (CREATE, UPDATE, DELETE, STATUS_CHANGE) registra em `job_history` via helper compartilhado:

```typescript
await insertHistory({
  tenant_id,
  job_id,
  event_type: 'field_update',
  user_id,
  data_before: { title: 'Antigo' },
  data_after: { title: 'Novo' },
  description: 'Titulo alterado de "Antigo" para "Novo"'
});
```

O helper:
- Usa nomes reais do banco (data_before/data_after, nao previous_data/new_data)
- Gera `description` legivel automaticamente
- E idempotente (INSERT simples em tabela append-only)

---

## Consequencias

### Positivas
- 6 funcoes na Fase 2 e gerenciavel (nem muito granular, nem monolitico)
- Shared code evita duplicacao e garante consistencia
- Mapa de nomes isola divergencias spec/banco em um unico lugar
- Padrao de response uniforme facilita consumo pelo frontend
- Validacao com Zod antes do banco previne dados invalidos
- Audit trail automatico em toda operacao

### Negativas
- Cold start: cada funcao tem seu proprio cold start (~200-500ms na primeira chamada)
- Mapa de nomes adiciona uma camada de traducao que precisa ser mantida sincronizada
- Zod via esm.sh adiciona dependencia externa (mitigado: pinned version)
- 6 funcoes para deployar na Fase 2 (mitigado: script de deploy batch)

### Riscos
- Se o mapa de nomes ficar dessincronizado com o banco, erros sutis podem surgir
- Performance de cold start pode ser perceptivel para funcoes pouco usadas
- Zod pode ter breaking changes entre versoes (mitigado: version pin)

---

## Alternativas Consideradas

### A1: Uma unica mega Edge Function "jobs"
**Rejeitada.** Uma funcao com 14+ rotas e dezenas de handlers seria dificil de manter, testar e deployar. Qualquer mudanca em qualquer endpoint exigiria redeploy de tudo. O roteamento interno ficaria complexo demais.

### A2: 14 Edge Functions atomicas (uma por endpoint)
**Rejeitada.** Overhead de gerenciamento (14 deploys, 14 diretorioss, 14 cold starts). Funcoes muito pequenas como `jobs-health-score` (um unico POST) nao justificam funcao propria na Fase 2.

### A3: Usar Supabase PostgREST direto (sem Edge Functions)
**Rejeitada.** PostgREST expoe CRUD basico, mas nao suporta logica de negocio complexa (validacoes de transicao de status, geracao de job_code, audit trail, webhooks). Precisamos da camada de Edge Functions para regras de negocio.

### A4: Validacao com io-ts ou typebox em vez de Zod
**Rejeitada.** Zod tem melhor DX, documentacao mais extensa e e o padrao de facto em projetos TypeScript. Import via esm.sh funciona bem no Deno.

### A5: Nao usar mapa de nomes (renomear colunas no banco)
**Rejeitada neste momento.** Renomear colunas no banco exigiria nova migration e risco de quebrar triggers, generated columns e RLS policies ja existentes. O mapa de nomes na Edge Function e menos invasivo e pode ser removido quando/se fizermos a migration de renomeacao.

---

## Referencias

- docs/architecture/jobs-module.md (secoes 5.1-5.14)
- docs/specs/jobs-master-table.md
- docs/qa/schema-validation-report.md (mapa de nomes spec vs real)
- docs/security/findings.md (bugs criticos de RLS)
- Supabase Edge Functions docs: https://supabase.com/docs/guides/functions
