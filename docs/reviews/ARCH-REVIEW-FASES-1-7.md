# Review Arquitetural Completo: ELLAHOS Fases 1-7

**Data:** 20/02/2026
**Autor:** Tech Lead / Arquiteto
**Escopo:** Revisao de todas as camadas (Banco, Edge Functions, Frontend, Documentacao)
**Objetivo:** Garantir solidez arquitetural antes de prosseguir para Fase 8

---

## SUMARIO EXECUTIVO

| Area | Veredicto | Itens criticos |
|------|-----------|----------------|
| 1. Edge Functions - Roteamento | APROVADO | Consistente em 16 functions |
| 2. Edge Functions - Shared modules | APROVADO | 16 modules, DRY suficiente |
| 3. Edge Functions - Error handling | APROVADO | Padrao AppError uniforme |
| 4. Edge Functions - Service vs User client | PRECISA ATENCAO | 2 handlers usam client errado |
| 5. Frontend - Layout structure | APROVADO | Separacao clara auth/dashboard/public |
| 6. Frontend - Hooks | APROVADO | Padrao consistente com TanStack Query |
| 7. Frontend - State management | APROVADO | TanStack Query e suficiente |
| 8. Frontend - Componentes | APROVADO | Organizacao por dominio coerente |
| 9. Banco - Migration Fase 7 | APROVADO | Idempotente, RLS, indices adequados |
| 10. Banco - RPCs | PRECISA ATENCAO | 1 RPC com performance O(n^2) |
| 11. Banco - Balance RPCs vs queries | APROVADO | RPCs para agregacao, queries para CRUD |
| 12. `as any` casts | PRECISA ATENCAO | 19 ocorrencias, maioria justificavel |
| 13. CORS - PUT ausente | BLOQUEANTE | Allocations usa PUT mas CORS nao lista |
| 14. report_snapshots nao utilizado | PRECISA ATENCAO | Cache definido mas nao implementado |
| 15. Dependencias esm.sh | PRECISA ATENCAO | Risco de indisponibilidade |
| 16. ADRs e documentacao | APROVADO | Bem documentados e seguidos |

**Veredicto geral: APROVADO COM RESSALVAS -- 1 bloqueante, 4 itens que precisam atencao.**

---

## 1. ARQUITETURA DE EDGE FUNCTIONS

### 1.1 Padrao de Roteamento -- APROVADO

Todas as 16 Edge Functions seguem o mesmo padrao de roteamento:

```typescript
const pathSegments = url.pathname.split('/').filter(Boolean);
const fnIndex = pathSegments.findIndex(s => s === 'FUNCTION_NAME');
const segment1 = pathSegments[fnIndex + 1] ?? null;
// ... routing por method + segments
```

**Consistencia verificada em:**
- `jobs` (fnIndex via indexOf)
- `jobs-status`, `jobs-team`, `jobs-deliverables`, `jobs-shooting-dates`, `jobs-history` (fnIndex via findIndex)
- `notifications`, `tenant-settings`, `allocations`, `approvals` (fnIndex via findIndex)
- `dashboard`, `reports`, `client-portal` (fnIndex via findIndex)
- `drive-integration`, `whatsapp` (fnIndex via findIndex)
- `integration-processor` (sem roteamento, apenas POST)

**Observacao menor:** `jobs/index.ts` usa `indexOf` enquanto os demais usam `findIndex`. Funcionalmente equivalente mas `findIndex` e o padrao dominante. Nao e bloqueante.

### 1.2 Shared Modules -- APROVADO

16 modulos em `_shared/`:
- `cors.ts`, `errors.ts`, `response.ts` -- infra basica
- `auth.ts`, `supabase-client.ts` -- autenticacao
- `validation.ts` (Zod schemas), `types.ts` (ENUMs) -- validacao
- `pagination.ts`, `history.ts`, `column-map.ts` -- helpers de dominio
- `vault.ts`, `integration-client.ts`, `notification-helper.ts` -- integracao
- `google-drive-client.ts`, `whatsapp-client.ts`, `conflict-detection.ts` -- clientes externos

**DRY suficiente:** Nenhuma duplicacao significativa detectada. Cada modulo tem responsabilidade unica.

**Import paths:** Duas convencoes coexistem:
- Fase 2 functions (jobs, jobs-team, etc): `from '../_shared/xxx.ts'` nos handlers
- Fase 5+ functions (drive, whatsapp, etc): `from './_shared/xxx.ts'` no index.ts

Isso se deve ao pattern de deploy do Supabase que copia `_shared/` como subdiretorio de cada function. Ambos os patterns funcionam. Nao e um problema.

### 1.3 Error Handling -- APROVADO

Todas as 16 Edge Functions seguem o padrao:
```typescript
try {
  // ... logica
} catch (err) {
  if (err instanceof AppError) return fromAppError(err);
  console.error('Erro nao tratado:', err);
  return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
}
```

Nenhuma function tem catch vazio ou catch que engole erros. O `console.error` garante observabilidade em Supabase Logs.

### 1.4 Service Client vs User Client -- PRECISA ATENCAO

**Padrao correto:**
- `getSupabaseClient(auth.token)` -- para operacoes com RLS do usuario
- `getServiceClient()` -- para operacoes administrativas (bypass RLS)

**Handlers que usam service client corretamente:**
- `integration-processor` (sem JWT, roda via pg_cron)
- `client-portal/get-by-token.ts` (endpoint publico sem auth)
- `client-portal/send-message.ts` (endpoint publico sem auth)
- `reports/export-csv.ts` (RPCs SECURITY DEFINER precisam de service_role)
- `reports/financial.ts` (RPCs SECURITY DEFINER)

**Problema detectado:** `dashboard/handlers/kpis.ts` e os outros 4 handlers de dashboard usam `getSupabaseClient(auth.token)` para chamar RPCs que sao `SECURITY DEFINER`. Isso funciona porque o usuario autenticado tem permissao de EXECUTE na RPC, mas e inconsistente com `reports/` que usa `getServiceClient()` para o mesmo tipo de operacao.

**Impacto:** Funcional (nao quebra), mas semanticamente inconsistente. Se no futuro as RPCs forem restritas via GRANT, os handlers de dashboard deixariam de funcionar.

**Recomendacao:** Padronizar. Ou todos os handlers de RPC usam `getServiceClient()` (como reports) ou todos usam user client. Recomendo `getServiceClient()` para RPCs SECURITY DEFINER, pois o tenant_id ja e parametro explicito (nao depende do RLS).

---

## 2. ARQUITETURA DO FRONTEND

### 2.1 Layout Structure -- APROVADO

```
app/
  (auth)/          -- login, forgot-password, reset-password (sem sidebar)
  (dashboard)/     -- todas as paginas autenticadas (com sidebar)
    layout.tsx     -- sidebar + topbar + realtime notifications
    page.tsx       -- dashboard home (era redirect, agora e a pagina real)
    jobs/          -- listagem e detalhes
    clients/       -- cadastro de clientes
    agencies/      -- cadastro de agencias
    people/        -- cadastro de pessoas
    financial/     -- registros financeiros
    approvals/     -- aprovacoes pendentes
    team/          -- calendario de alocacoes
    reports/       -- relatorios com graficos
    notifications/ -- lista de notificacoes
    settings/      -- integracoes, notificacoes, portal
    portal/        -- gestao de sessoes do portal (dentro do dashboard)
  approve/[token]/ -- pagina publica de aprovacao (sem auth)
  portal/[token]/  -- pagina publica do portal do cliente (sem auth)
```

**Separacao clara entre:**
- Paginas autenticadas: `(dashboard)/*` com layout compartilhado
- Paginas publicas: `approve/` e `portal/` sem sidebar nem auth
- Paginas de auth: `(auth)/*` com layout minimalista

### 2.2 Hooks Customizados -- APROVADO

30 hooks identificados em `frontend/src/hooks/`. Todos seguem padroes consistentes:

**Hooks de leitura (useQuery):**
```typescript
export function useXxx(filters) {
  const query = useQuery({
    queryKey: xxxKeys.list(filters),
    queryFn: () => apiGet<Type>('function-name', params),
    staleTime: 30_000,
  })
  return { data: query.data?.data, isLoading, isError, error, refetch }
}
```

**Hooks de mutacao (useMutation):**
```typescript
export function useCreateXxx() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => apiMutate('function-name', 'POST', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: xxxKeys.all }),
  })
}
```

**Nomenclatura:**
- Fase 2-6: `useXxx.ts` (camelCase)
- Fase 7: `use-xxx.ts` (kebab-case)

Inconsistencia menor de nomenclatura de arquivo, nao afeta funcionalidade. Para Fase 8, recomendo padronizar em `use-xxx.ts` (kebab-case) que e a convencao mais recente do Next.js.

### 2.3 State Management -- APROVADO

- **Server state:** TanStack Query v5 (unica fonte de verdade para dados do servidor)
- **Form state:** React state / controlled components
- **UI state:** useState + useLocalStorage (collapsed sidebar)
- **URL state:** query params para filtros
- **Auth state:** Supabase Auth + proxy.ts (Next.js 16)
- **Realtime:** useRealtimeNotifications (subscribe em INSERT de notifications)

Nenhuma necessidade de Zustand/Redux identificada. O sistema funciona bem com co-localizacao de estado.

### 2.4 Componentes -- APROVADO

Organizacao por dominio (nao atomico):
```
components/
  ui/          -- shadcn/ui primitivos (button, input, card, dialog, etc)
  layout/      -- Sidebar, Topbar, BottomNav
  shared/      -- componentes reutilizaveis entre dominios
  jobs/        -- componentes da listagem de jobs
  job-detail/  -- header, tabs, pipelines do detalhe
  clients/     -- tabela, filtros, modal de criacao
  agencies/    -- tabela, filtros, modal
  people/      -- tabela, filtros
  financial/   -- tabela, cards de resumo
  dashboard/   -- KPI cards, pipeline, alerts, charts
  reports/     -- tabelas, graficos, filtros
  portal/      -- sessoes, mensagens
  team/        -- calendario
  notifications/ -- lista, badges
  providers/   -- ThemeProvider, QueryProvider
```

Boa granularidade. Cada dominio tem seus componentes encapsulados. Os componentes do `dashboard/` e `reports/` sao compostos (usam `ui/` primitivos internamente).

---

## 3. BANCO DE DADOS

### 3.1 Migration Fase 7 -- APROVADO

Arquivo: `supabase/migrations/20260220_fase7_1_dashboard_portal.sql`

**Checklist:**
- [x] `SET search_path = public, extensions` -- seguranca
- [x] `CREATE TABLE IF NOT EXISTS` -- idempotente
- [x] `DROP TRIGGER IF EXISTS` antes de `CREATE TRIGGER` -- idempotente
- [x] `CREATE OR REPLACE FUNCTION` -- idempotente
- [x] RLS habilitado em todas as 3 tabelas novas
- [x] Policies usam `(SELECT get_tenant_id())` -- evita re-eval por row
- [x] Triggers `updated_at` em todas as tabelas novas
- [x] Indices em todas as FKs
- [x] Indices parciais para queries frequentes
- [x] GRANTS para service_role e authenticated
- [x] pg_cron para cleanup de report_snapshots
- [x] Comentarios em todas as tabelas e colunas chave

**Tabelas novas (3):**
1. `client_portal_sessions` -- 14 colunas, RLS, unique index parcial
2. `client_portal_messages` -- 12 colunas, RLS, constraints de direcao + idempotencia
3. `report_snapshots` -- 10 colunas, RLS, CHECK constraint de tipo

**RPCs novas (9):**
1. `get_dashboard_kpis` -- 9 sub-queries em jobs, approvals, deliverables, allocations
2. `get_pipeline_summary` -- GROUP BY status com ordenacao fixa
3. `get_revenue_by_month` -- Faturamento/custo/lucro por mes
4. `get_alerts` -- 4 UNION ALL com LIMIT por tipo
5. `get_recent_activity` -- job_history com JOINs
6. `get_report_financial_monthly` -- 4 sub-queries (summary, by_month, by_category, projection)
7. `get_report_performance` -- 4 branches por group_by
8. `get_report_team_utilization` -- Calculo de dias alocados + conflitos
9. `get_portal_timeline` -- Busca completa do portal (sessao + timeline + docs + approvals + messages)

### 3.2 RPCs - Performance -- PRECISA ATENCAO

**RPCs OK (performance adequada):**
- `get_dashboard_kpis`: 9 sub-queries independentes, cada uma usa indice `tenant_id`. Para <10k jobs, executa em <50ms.
- `get_pipeline_summary`: GROUP BY com indice `idx_jobs_tenant_status_active`. Rapida.
- `get_revenue_by_month`: GROUP BY com filtro temporal. Indice `idx_financial_records_tenant_date` cobre.
- `get_alerts`: 4 sub-queries com LIMIT 5 cada. O UNION ALL com ORDER BY no final e eficiente.
- `get_recent_activity`: Indice `idx_job_history_tenant_recent` cobre perfeitamente.
- `get_report_financial_monthly`: Filtra por tenant + periodo. Indice cobre.
- `get_report_performance`: Cada branch usa indices existentes. OK.
- `get_portal_timeline`: Busca por token (indice), depois sub-queries por job_id. Eficiente.

**RPC PROBLEMATICA -- `get_report_team_utilization`:**

```sql
-- Conflitos no periodo (CORRELATED SUBQUERY para cada pessoa)
(
  SELECT count(*)
  FROM allocations a1
  JOIN allocations a2 ON a1.people_id = a2.people_id
    AND a1.id < a2.id
    AND a1.deleted_at IS NULL
    AND a2.deleted_at IS NULL
    AND a2.tenant_id = p_tenant_id
    AND a1.allocation_start <= a2.allocation_end
    AND a1.allocation_end >= a2.allocation_start
  WHERE a1.people_id = p.id
    AND a1.tenant_id = p_tenant_id
    AND a1.allocation_start <= p_end_date
    AND a1.allocation_end >= p_start_date
) as conflict_count
```

**Problema:** Self-join cartesiano em `allocations` para cada pessoa. Se uma pessoa tem N alocacoes no periodo, a subquery faz N*(N-1)/2 comparacoes. Para 50 pessoas com 10 alocacoes cada, sao ~2500 comparacoes POR PESSOA, totalizando ~125.000. Isso e O(P * A^2) onde P = pessoas e A = alocacoes por pessoa.

**Impacto:** Para volumes pequenos (ano 1, <100 pessoas, <500 alocacoes) funciona bem (<200ms). Para volumes maiores, pode degradar significativamente.

**Recomendacao para Fase 8:** Extrair o calculo de conflitos para uma CTE ou pre-calcular em tabela auxiliar. Alternativa: mover a deteccao de conflitos para a Edge Function `conflict-detection.ts` que ja existe no `_shared/`.

### 3.3 Balance RPCs vs Queries Diretas -- APROVADO

**Regra seguida corretamente:**
- **RPCs:** Agregacoes (COUNT, SUM, AVG, GROUP BY) -- dashboard, reports, portal timeline
- **Queries diretas (via Supabase client):** CRUD simples (SELECT, INSERT, UPDATE, DELETE) -- jobs, team, deliverables, allocations, etc.

Isso segue a recomendacao do ADR-001 e da arquitetura da Fase 7: "queries agregadas DEVEM ser RPCs no PostgreSQL, nunca N+1 no frontend".

### 3.4 Indices -- APROVADO

Indices adicionados na Fase 7:
1. `idx_client_portal_sessions_token` (parcial) -- lookup por token publico
2. `idx_client_portal_sessions_tenant_job` (parcial) -- listagem por job
3. `idx_portal_messages_session` (composto com DESC) -- mensagens ordenadas
4. `idx_report_snapshots_lookup` (composto) -- busca de cache
5. `idx_jobs_tenant_status_active` (parcial) -- KPIs e pipeline
6. `idx_deliverables_overdue_dashboard` (parcial) -- alertas
7. `idx_job_history_tenant_recent` (composto com DESC) -- atividades
8. `idx_financial_records_tenant_date` (parcial) -- relatorios financeiros
9. 6 indices de FK para as novas tabelas

**Cobertura adequada** para todas as queries usadas nas RPCs e handlers.

---

## 4. TRADE-OFFS E DEBT TECNICO

### 4.1 `as any` Casts -- PRECISA ATENCAO

**19 ocorrencias totais** (1 no frontend, 18 nas Edge Functions).

**Frontend (1):**
- `useSettings.ts:79`: `(res as any).meta` -- ApiResponse nao tem tipo generico que inclui meta. **Justificavel**, mas deveria usar um type assertion mais especifico.

**Edge Functions - Supabase client join results (15):**
Padroes como `(member as any).people?.full_name` ou `(approval as any).jobs?.code`. Esses ocorrem porque o Supabase client retorna tipos genéricos para JOINs (`.select('*, people(*), jobs(*)')`). O TypeScript nao consegue inferir os campos do join.

**Locais:**
- `jobs-team/handlers/add-member.ts` (2)
- `jobs-team/handlers/remove-member.ts` (2)
- `jobs-history/handlers/list.ts` (1)
- `approvals/handlers/get-by-token.ts` (1)
- `approvals/handlers/approve-internal.ts` (1)
- `approvals/handlers/reject-internal.ts` (1)
- `approvals/handlers/resend.ts` (2)
- `approvals/handlers/respond.ts` (1)
- `allocations/handlers/get-conflicts.ts` (1)
- `_shared/conflict-detection.ts` (1)
- `_shared/google-drive-client.ts` (1)

**Edge Functions - Fase 7 specific (3):**
- `client-portal/handlers/get-by-token.ts:45`: `(timeline as any)?.session?.id` -- log debug
- `client-portal/handlers/list-sessions.ts:62`: `(s as any).token` -- campo do select
- `client-portal/handlers/delete-session.ts:47`: `(existing as any).label` -- log debug

**Recomendacao:** Definir interfaces para os resultados de JOINs do Supabase em `_shared/types.ts`. Por exemplo:
```typescript
interface TeamMemberWithPerson {
  id: string;
  person_id: string;
  role: string;
  people: { full_name: string; email?: string } | null;
}
```
Isso eliminaria a maioria dos `as any`. Prioridade media -- nao bloqueia Fase 8 mas melhora maintainability.

### 4.2 CORS - PUT Ausente -- BLOQUEANTE

**Arquivo:** `supabase/functions/_shared/cors.ts` linha 6:
```typescript
'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
```

**Problema:** `PUT` nao esta listado, mas `allocations/index.ts` usa `PUT /allocations/:id` para update. Pre-flight CORS do browser vai bloquear requests PUT vindas do frontend.

**Impacto:** Browsers modernos enviam OPTIONS pre-flight para metodos nao-simples. PUT nao esta na lista de `Access-Control-Allow-Methods`, logo o browser vai rejeitar a request antes de envia-la.

**Correcao imediata necessaria:**
```typescript
'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
```

### 4.3 Patterns que nao escalam -- N/A

Nenhum pattern N+1 detectado no codebase. Todas as listagens usam queries unicas com JOINs ou RPCs. A paginacao e aplicada corretamente em todos os handlers de listagem.

A unica preocupacao de escala e a RPC `get_report_team_utilization` (item 3.2 acima).

### 4.4 Dependencias via esm.sh -- PRECISA ATENCAO

**Dependencias externas via esm.sh:**
1. `@supabase/supabase-js@2` -- pinned major version
2. `zod@3.22.4` -- pinned exact version

**Riscos:**
- **Indisponibilidade do CDN:** Se esm.sh ficar offline, deploys de Edge Functions falham e cold starts falham.
- **Cache:** Supabase Edge Runtime cacheia imports apos primeiro cold start. Impacto apenas em cold starts.
- **Seguranca:** Sem verificacao de integridade (no lockfile). Se esm.sh for comprometido, codigo malicioso seria executado.

**Mitigacao existente:** Version pinning evita breaking changes silenciosos.

**Recomendacao para Fase 8:**
- `@supabase/supabase-js` ja esta disponivel via `jsr:@supabase/supabase-js` (JSR registry, propriedade da Deno). Migrar este import eliminaria dependencia de esm.sh para o client.
- Para `zod`, considerar migrar para `jsr:@std/zod` ou manter esm.sh com version pin (risco aceitavel).

### 4.5 report_snapshots Nao Utilizado -- PRECISA ATENCAO

**Situacao:** A tabela `report_snapshots` foi criada na migration com RLS, indices, GRANTS e pg_cron para cleanup. Porem, nenhuma Edge Function faz leitura ou escrita nessa tabela.

A arquitetura doc (secao 8.2) define:
> Edge Function verifica cache antes de recalcular:
> 1. Buscar snapshot com mesmos parametros e expires_at > now()
> 2. Se encontrar, retornar dados cacheados
> 3. Se nao, executar RPC, salvar snapshot, retornar

**Impacto:** Nenhum impacto funcional negativo (as RPCs executam diretamente e retornam resultados corretos). Porem, para tenants com muitos dados, a falta de cache pode resultar em latencia maior nos relatorios.

**Recomendacao:** Implementar a logica de cache nos handlers de `reports/` antes da Fase 8, ou documentar como debt tecnico a resolver quando performance degradar.

---

## 5. ADRs E DOCUMENTACAO

### 5.1 ADRs Existentes -- APROVADO

9 ADRs documentados, cobrindo decisoes chave:

| ADR | Titulo | Status | Seguido? |
|-----|--------|--------|----------|
| 001 | Edge Functions Architecture | Aceito | SIM -- 16 functions seguem o padrao |
| 002 | Frontend Architecture | Aceito | SIM -- Client Components + TanStack Query |
| 007 | Allocations vs job_team duality | Aceito | SIM -- dual-data implementado |
| 008 | Person job history direct query | Aceito | SIM |
| 009 | Public approval page CSR | Aceito | SIM -- /approve e /portal sao CSR |
| 010 | Public endpoint rate limiting | Aceito | SIM -- send-message tem rate limit |
| 011 | CSV export server-side | Aceito | SIM -- export-csv.ts gera no server |
| 012 | Recharts chart library | Aceito | SIM -- dashboard usa Recharts |
| 013 | Portal separate from approvals | Aceito | SIM -- tabelas separadas |

**Todas as decisoes estao sendo seguidas na implementacao.**

### 5.2 Decisoes que deveriam ser revisadas

**Nenhuma decisao precisa ser revertida.** Porem, considerar dois novos ADRs para Fase 8:

1. **ADR-014: Migracao de esm.sh para JSR** -- Reduzir dependencia de CDN externo
2. **ADR-015: Cache pattern para relatorios** -- Quando/como usar report_snapshots

### 5.3 Documentacao de Arquitetura -- APROVADO

- `docs/architecture/fase-7-architecture.md` -- 1631 linhas, extremamente detalhado
- `docs/architecture/full-roadmap.md` -- Roadmap completo ate Fase 10
- `docs/architecture/jobs-module.md` -- Referencia do modulo principal
- `docs/architecture/fase-6-equipe-aprovacoes.md` -- Fase anterior documentada

A implementacao real diverge minimamente da arquitetura documentada:
- Migration corrige `jd.due_date` para `jd.delivery_date` (nome real da coluna)
- Migration corrige `jf.name/url` para `jf.file_name/file_url` (nome real)
- Migration corrige `p.type` para `p.is_internal` (boolean no schema real)
- Esses fixes sao positivos: indicam que a implementacao validou a spec contra o banco real

---

## 6. RECOMENDACOES PARA FASE 8

### 6.1 BLOQUEANTE -- Corrigir antes de iniciar Fase 8

1. **CORS PUT method** (`_shared/cors.ts`): Adicionar `PUT` ao `Access-Control-Allow-Methods`. Uma linha. Deploy de todas as functions que importam cors.ts.

### 6.2 ALTA PRIORIDADE -- Resolver durante primeiras sprints da Fase 8

2. **Padronizar service client vs user client** para RPCs SECURITY DEFINER. Escolher um padrao e aplicar consistentemente. Recomendacao: `getServiceClient()` para todas as chamadas de RPC.

3. **Tipar resultados de JOINs** do Supabase client em `_shared/types.ts` para eliminar os 15 `as any` nos handlers. Definir interfaces como `TeamMemberRow`, `ApprovalWithJob`, `AllocationWithPerson`.

### 6.3 MEDIA PRIORIDADE -- Resolver antes de produtora atingir >1000 jobs

4. **Otimizar `get_report_team_utilization`**: Reescrever a subquery de conflitos usando CTE ou pre-calculo. Atualmente O(P*A^2), aceitavel para volumes iniciais mas degrada com escala.

5. **Implementar cache `report_snapshots`** nos handlers de reports: check-then-fetch pattern com TTL de 1h, conforme descrito na arquitetura.

### 6.4 BAIXA PRIORIDADE -- Debt tecnico aceitavel

6. **Migrar `@supabase/supabase-js` de esm.sh para JSR**: Reduz risco de indisponibilidade do CDN externo.

7. **Padronizar nomenclatura de hooks**: Todos para `use-xxx.ts` (kebab-case, convencao Next.js moderna).

8. **Adicionar type assertion especifico** no `useSettings.ts` em vez de `as any` para o campo `meta`.

---

## 7. METRICAS DO SISTEMA

| Metrica | Valor |
|---------|-------|
| Tabelas no banco | 30 (27 pre-existentes + 3 novas) |
| Edge Functions | 16 (13 pre-existentes + 3 novas) |
| Handlers totais | ~70 |
| Shared modules | 16 |
| RPCs | ~12 (3 pre-existentes + 9 novas) |
| Frontend hooks | 30 |
| Frontend componentes | ~80+ |
| Frontend types files | 13 |
| Frontend routes | ~15 |
| ADRs | 9 |
| Migrations | 3 (Fase 5) + 1 (Fase 7) = 4 nos migrations/ |
| Query keys groups | 12 |
| `as any` casts | 19 (1 frontend + 18 edge functions) |
| Paginas publicas | 2 (/approve/[token], /portal/[token]) |

---

## 8. CONCLUSAO

A arquitetura do ELLAHOS e **solida e bem-estruturada** apos 7 fases. Os principios fundamentais estao sendo respeitados consistentemente:

- **Multi-tenant:** RLS em todas as tabelas, tenant_id do JWT nunca do payload
- **API-first:** Toda funcionalidade e API antes de ser UI
- **TypeScript strict:** Tipagem forte em todo o codebase (exceto os 19 `as any` documentados)
- **Idempotencia:** Idempotency keys no portal, migrations idempotentes, operacoes repetiveis
- **Separation of concerns:** Edge Functions para logica, RPCs para agregacao, Frontend para apresentacao

O unico item **bloqueante** e a ausencia de `PUT` nos CORS headers, que e uma correcao trivial de uma linha. Os demais itens sao melhorias incrementais que nao impedem o avanço para a Fase 8.

**Recomendacao final:** Corrigir o CORS, fazer deploy, e prosseguir com a Fase 8.
