# ADR-007: Dualidade allocations vs job_team para periodos de alocacao

**Data:** 19/02/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 6 -- Gestao de Equipe + Aprovacoes

---

## Contexto

A spec da Fase 6 define que:
1. A tabela `job_team` deve ganhar campos opcionais `allocation_start` e `allocation_end`
2. Uma nova tabela `allocations` deve ser a fonte de verdade para deteccao de conflitos

Isso cria uma dualidade: o mesmo dado (periodo de alocacao de uma pessoa em um job) existe em dois lugares.

A tabela `job_team` ja existe com CRUD completo (Edge Function `jobs-team`). A tabela `allocations` e nova e tem seu proprio CRUD (Edge Function `allocations`).

O frontend exibe membros da equipe na TabEquipe (dados de `job_team`) e precisa mostrar o periodo de alocacao sem fazer JOIN adicional.

---

## Decisao

Manter ambas as tabelas com dados parcialmente duplicados:

- `job_team.allocation_start/end` -- campos de conveniencia para exibicao rapida na UI
- `allocations` -- tabela normalizada, fonte de verdade para o algoritmo de deteccao de conflitos

A sincronizacao e feita na camada da Edge Function:
- Ao criar/atualizar um membro em `jobs-team` com datas de alocacao, a Edge Function TAMBEM cria/atualiza o registro correspondente em `allocations`
- Ao criar/atualizar diretamente em `allocations`, a Edge Function TAMBEM atualiza `job_team.allocation_start/end` se `job_team_id` for fornecido

A deteccao de conflitos SEMPRE consulta `allocations`, nunca `job_team`.

---

## Consequencias

### Positivas
- UI rapida: a listagem de equipe (`GET /jobs-team/:jobId`) retorna periodo sem JOIN
- Algoritmo de conflito e uma query simples em uma unica tabela (`allocations`)
- `allocations` pode conter alocacoes SEM membro de equipe (ex: reservas futuras)
- Cada tabela tem sua responsabilidade clara: `job_team` = quem, `allocations` = quando

### Negativas
- Dado duplicado que pode dessincronizar se alguem alterar direto no banco
- Dois pontos de entrada para o mesmo dado (dois CRUDs)
- Complexidade adicional na Edge Function para manter sincronia

### Mitigacoes
- Sincronizacao feita na Edge Function (visivel, testavel, nao em trigger oculto)
- Testes manuais validam que ambas tabelas estao consistentes apos operacoes
- Se dessincronizar, `allocations` e a fonte de verdade -- job_team e apenas cache

---

## Alternativas Consideradas

### A1: Somente allocations (sem campos em job_team)
**Rejeitada.** Toda exibicao de equipe precisaria de JOIN com allocations. Como a TabEquipe e a tela mais acessada do job detail, o JOIN adicional em toda listagem e desnecessario.

### A2: Somente job_team (sem tabela allocations)
**Rejeitada.** A deteccao de conflito precisa de indice otimizado e query especializada. Misturar com job_team (que tem outros propositos e colunas) tornaria a query mais complexa. Alem disso, `allocations` pode existir sem `job_team_id` (reservas futuras).

### A3: Sincronizacao via trigger no banco
**Rejeitada.** Triggers sao invisiveis e dificeis de debugar. A sincronizacao na Edge Function e explicita e segue o principio do projeto de manter logica de negocio nas Edge Functions.

---

## Referencias

- docs/specs/fase-6-equipe-aprovacoes.md (secao 8.1, 8.4)
- docs/architecture/fase-6-equipe-aprovacoes.md (secao 2)
