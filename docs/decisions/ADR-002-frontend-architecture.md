# ADR-002: Arquitetura do Frontend (Fase 3)

**Data:** 2026-02-18
**Status:** Aceito
**Autor:** Tech Lead - ELLAHOS
**Contexto:** Fase 3 - Frontend Next.js para modulo Jobs

---

## Contexto

A Fase 1 (banco) e Fase 2 (API) estao concluidas e testadas. Precisamos definir a arquitetura do frontend que consumira as 6 Edge Functions existentes e entregara o modulo Jobs completo para os usuarios da produtora. Decisoes chave:

1. Client Components vs Server Components
2. Global state manager vs TanStack Query
3. Estrategia de chamada das Edge Functions (invoke vs fetch)
4. CRUD inline de entidades auxiliares (clientes, agencias, pessoas) sem Edge Functions dedicadas
5. Auto-save com debounce vs botao Salvar explicito
6. Types gerados do banco vs types manuais da API

---

## Decisao

### 1. Client Components para paginas do dashboard

Todas as paginas sob `/(dashboard)/` sao Client Components (`"use client"`). O data fetching e feito inteiramente no cliente via TanStack Query.

**Justificativa:** As paginas do dashboard tem interatividade pesada (filtros em URL, auto-save, optimistic updates, modais, formularios complexos). SSR dessas paginas criaria complexidade de hidratacao e waterfall de dados sem beneficio de SEO (paginas sao protegidas por auth). O staleTime do React Query (10s) garante que navegacoes subsequentes sao instantaneas.

### 2. TanStack Query como unico state manager para dados de servidor

Nenhum Redux, Zustand ou similar. Server state gerenciado por TanStack Query, form state por React Hook Form, UI state por useState, preferencias por localStorage.

**Justificativa:** Na Fase 3 nao existe estado global complexo que justifique uma lib extra. Com React Query para server cache, RHF para forms e URL params para filtros, todo estado e naturalmente co-localizado.

### 3. fetch() direto com Bearer token manual (nao supabase.functions.invoke)

Apos analise, `supabase.functions.invoke()` nao suporta de forma confiavel path segments (`jobs/uuid`). Usamos `fetch()` direto para `${SUPABASE_URL}/functions/v1/${path}` com injecao manual do token do session.

**Justificativa:** As Edge Functions usam roteamento por path segments (ex: `GET /jobs/:id`, `PATCH /jobs/:id`). O invoke() do Supabase JS nao suporta essa convencao de forma nativa. O fetch direto e simples, tipado pelo nosso wrapper `lib/api.ts`, e injeta o Bearer token via `supabase.auth.getSession()`.

### 4. CRUD inline via supabase.from().insert() para clientes, agencias e pessoas

Para criacao inline em dropdowns (ex: "Criar novo cliente" no modal de criacao de job), usamos o Supabase JS client direto (`supabase.from('clients').insert()`), sem Edge Function.

**Justificativa:** Essas entidades nao tem Edge Functions dedicadas na Fase 2, e o CRUD e simples (nome, email). O RLS garante isolamento por tenant. Quando as Edge Functions de Clientes/Agencias/Pessoas forem criadas em fases futuras, trocaremos a chamada.

### 5. Auto-save com debounce de 1.5s

Formularios do detalhe do job nao tem botao "Salvar". Todas as alteracoes sao salvas automaticamente apos 1.5s de inatividade via PATCH parcial (apenas campos alterados).

**Justificativa:** A spec define auto-save como requisito (US-F3-019). O debounce de 1.5s equilibra entre responsividade (nao esperar demais) e eficiencia (nao enviar request a cada tecla). Rascunho em sessionStorage como fallback para falhas de rede.

### 6. Types manuais da API nos componentes (nao types gerados do banco)

Os componentes importam tipos de `src/types/jobs.ts` (que refletem o contrato da API com nomes da spec), nao de `src/types/database.ts` (que reflete colunas reais do banco).

**Justificativa:** A Edge Function ja traduz nomes via column-map.ts. O frontend so conhece o contrato publico da API. Se o banco renomear colunas, o frontend nao precisa mudar (apenas o column-map.ts na Edge Function).

---

## Consequencias

### Positivas
- Simplicidade: um unico pattern de data fetching (Client Component + React Query)
- Performance percebida: staleTime + optimistic updates + skeletons
- Tipagem forte: tipos da API alinhados com o que o frontend recebe/envia
- Auto-save elimina "perdi meu trabalho porque esqueci de salvar"
- Nenhuma dependencia desnecessaria (sem Redux, sem Zustand)
- CRUD inline desbloqueou criacao de jobs sem depender de telas de cadastro

### Negativas
- Sem SSR: primeira carga da pagina de jobs mostra skeleton (nao dados pre-renderizados)
- fetch() manual: perdemos o auto-retry e type inference do invoke() do Supabase JS
- CRUD inline sem validacao centralizada: email duplicado de cliente nao sera detectado no frontend
- Auto-save gera mais requests que save manual (mitigado: debounce + PATCH parcial)

### Riscos
- Se invoke() for corrigido futuramente para suportar paths, teremos um fetch() custom que poderia ser simplificado (baixo impacto)
- Se a quantidade de requests de auto-save for excessiva, aumentar debounce ou implementar batching

---

## Alternativas Consideradas

### A1: Server Components + RSC data fetching
**Rejeitada.** Complexidade de hidratacao + waterfall + impossibilidade de optimistic updates e auto-save. Nao ha beneficio de SEO (paginas protegidas).

### A2: Zustand para global state
**Rejeitada neste momento.** Sem caso de uso que justifique. Pode ser adicionado em fase futura se necessario (ex: presenca real-time, notificacoes).

### A3: Gerar types do banco e usar diretamente nos componentes
**Rejeitada.** Os nomes das colunas do banco diferem dos nomes da API (column-map.ts). Usar types do banco nos componentes causaria confusao e bugs de mapeamento.

### A4: Botao Salvar explicito em vez de auto-save
**Rejeitada.** A spec define auto-save como requisito. Formularios com ~75 campos seriam frustrantes com save manual (esquecer de clicar, perder dados). Auto-save e padrao em ferramentas modernas (Notion, Google Docs, Linear).

### A5: Usar PostgREST direto (supabase.from()) em vez de Edge Functions
**Rejeitada.** As Edge Functions implementam logica de negocio critica (geracao de job_code, validacao de status, audit trail, conflito de agenda). PostgREST nao suporta essas regras.

---

## Referencias

- docs/architecture/fase-3-frontend.md (arquitetura completa)
- docs/specs/fase-3-frontend.md (spec da Fase 3)
- docs/design/design-system.md (design system)
- ADR-001 (arquitetura das Edge Functions)
