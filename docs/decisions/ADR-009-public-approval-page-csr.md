# ADR-009: Pagina publica de aprovacao sem SSR (Client-Side Rendering)

**Data:** 19/02/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 6 -- Pagina publica /approve/[token]

---

## Contexto

A pagina `/approve/[token]` e uma pagina publica acessada por clientes externos via link no WhatsApp. O cliente nao tem conta no ELLAHOS -- acessa apenas com o token UUID na URL.

No Next.js 16 (App Router), temos tres opcoes:
1. **SSR (Server Component):** fetch no servidor, renderiza HTML completo
2. **CSR (Client Component):** skeleton no servidor, fetch no browser via hook
3. **Hibrido:** Server Component faz fetch e passa dados para Client Component

A pagina precisa buscar dados da Edge Function `GET /approvals/public/:token` e permitir interacao (botoes Aprovar/Rejeitar com formulario).

---

## Decisao

Usar Client Component com fetch direto para a Edge Function. NAO usar SSR.

A pagina sera um Client Component que:
1. Renderiza skeleton imediatamente (HTML estatico do Next.js)
2. Faz fetch para `GET /approvals/public/:token` via `usePublicApproval` hook
3. Renderiza os dados quando o fetch completa
4. Formulario de resposta usa `useRespondApproval` mutation

---

## Consequencias

### Positivas
- Implementacao simples com hooks existentes do projeto (useQuery/useMutation)
- Loading states nativos via TanStack Query (isLoading, isError)
- Sem complexidade de Server Actions para o formulario de resposta
- Pagina carrega instantaneamente (skeleton) mesmo com cold start da Edge Function

### Negativas
- SEO inexistente (irrelevante -- pagina de uso unico, nao indexavel)
- Um roundtrip extra (browser -> Edge Function em vez de Next.js server -> Edge Function)
- Latencia ligeiramente maior para o primeiro render com dados (~200-500ms a mais)

### Justificativa tecnica
- O token esta na URL publica -- nao ha segredo a proteger no servidor
- A Edge Function ja expoe o endpoint publico -- fetch do servidor seria um proxy desnecessario
- O formulario de resposta (Aprovar/Rejeitar) e interativo e requer Client Component de qualquer forma
- Server Components com interatividade requerem pattern de composition que adiciona complexidade sem beneficio

---

## Alternativas Consideradas

### A1: Server Component com fetch no servidor
**Rejeitada.** A pagina precisa de interatividade (botoes, formulario). Teriamos que fazer fetch no servidor E ter Client Components para interacao -- complexidade adicional sem ganho real (SEO nao importa).

### A2: Server Component + Server Actions
**Rejeitada.** Server Actions para o formulario de aprovacao adicionam complexidade (revalidation, redirect). O padrao do projeto ja e fetch direto para Edge Functions via hooks, e mudar o padrao apenas para esta pagina criaria inconsistencia.

### A3: API Route do Next.js como proxy
**Rejeitada.** Criar `/api/approve/[token]` no Next.js como proxy para a Edge Function e redundante. A Edge Function ja e publica e nao requer auth. O proxy adicionaria latencia e ponto de falha sem beneficio.

---

## Referencias

- docs/architecture/fase-6-equipe-aprovacoes.md (secao 4.1.3)
- docs/specs/fase-6-equipe-aprovacoes.md (US-612, secao 10.3)
