# ADR-008: Historico de jobs de pessoa via Supabase client direto

**Data:** 19/02/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 6 -- PersonDetail aba Jobs

---

## Contexto

A aba Jobs no PersonDetail precisa exibir:
1. Lista de todos os jobs em que a pessoa participou (via `job_team`)
2. Metricas simples (total jobs, ativos, role mais frequente)
3. Mini-calendario de disponibilidade (via `allocations`)

A disponibilidade (item 3) ja e coberta pela Edge Function `allocations` (`GET /allocations?people_id=X&from=Y&to=Z`).

Para os itens 1 e 2, precisamos decidir: criar um novo endpoint na Edge Function ou usar query direta via Supabase client no frontend?

O padrao do projeto e API-first (Edge Functions para logica de negocio). Porem, esta query e puramente read-only, sem logica de negocio, sem validacao, sem side-effects.

---

## Decisao

Usar query direta via Supabase client no frontend para o historico de jobs e metricas de pessoa. A RLS existente garante isolamento por tenant.

Query no frontend:
```typescript
const { data } = await supabase
  .from('job_team')
  .select('role, jobs(id, code, title, status, created_at)')
  .eq('person_id', personId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

As metricas (total, ativos, role mais frequente) sao calculadas no frontend a partir dos dados retornados.

---

## Consequencias

### Positivas
- Zero Edge Functions adicionais para criar, deployar e manter
- Implementacao rapida (~30 minutos)
- RLS ja garante isolamento por tenant (sem risco de seguranca)
- Menos complexidade no projeto

### Negativas
- Inconsistencia com o padrao API-first do projeto (outras listagens usam Edge Functions)
- Query PostgREST no frontend e acoplada ao schema do banco
- Se precisar de paginacao avancada ou filtros complexos no futuro, tera que migrar

### Mitigacoes
- Documentar esta excecao no codigo (comentario explicando a decisao)
- Se o volume de dados crescer ou precisar de logica adicional, migrar para Edge Function
- O hook `usePersonJobHistory` abstrai a implementacao -- trocar de Supabase client para fetch e transparente para os componentes

---

## Alternativas Consideradas

### A1: Novo endpoint em jobs-team
**Rejeitada.** A Edge Function `jobs-team` opera no contexto de um job (`/jobs-team/:jobId`). Adicionar query por pessoa quebraria a semantica da funcao.

### A2: Nova Edge Function people-jobs
**Rejeitada.** Criar Edge Function inteira para uma unica query read-only sem logica de negocio e over-engineering. Cold start adicional, deploy adicional, manutencao adicional -- tudo isso para substituir uma query que o Supabase client ja resolve com RLS.

### A3: Adicionar query param em allocations
**Rejeitada.** A Edge Function `allocations` retorna alocacoes (periodos). O historico de jobs e outra coisa -- sao registros de `job_team` com dados do job. Misturar semanticas na mesma funcao.

---

## Referencias

- docs/architecture/fase-6-equipe-aprovacoes.md (secao 4.2.3)
- docs/specs/fase-6-equipe-aprovacoes.md (US-620, US-622)
