# ADR-027: Edge Function Separada para Pos-Producao

**Status:** Aceito
**Data:** 2026-03-09
**Autor:** Tech Lead

## Contexto

O modulo de Pos-Producao (Onda 1.2) adiciona funcionalidades de pipeline por entregavel, versoes de corte e aprovacoes. Ja existe a EF `jobs-deliverables` com 4 rotas CRUD simples (list, create, update, delete) que operam sob `/jobs-deliverables/:jobId`.

A questao e: extender `jobs-deliverables` com as novas rotas ou criar uma EF `pos-producao` separada.

## Decisao

Criar uma Edge Function separada `pos-producao` com 8 handlers dedicados.

## Motivos

1. **Dominio diferente.** CRUD generico de entregaveis vs. workflow de pos-producao (pipeline, versoes, aprovacoes). Misturar geraria roteamento complexo com rotas aninhadas profundas (`:deliverableId/cut-versions/:versionId`).

2. **Contexto de acesso diferente.** `jobs-deliverables` requer jobId na URL. Pos-producao tem rota cross-jobs (`/dashboard`) que nao pertence a nenhum job.

3. **Consistencia com o projeto.** Cada EF do ELLAHOS representa um dominio coeso (production-diary: 6 handlers, attendance: 10 handlers, crm: 17 handlers).

4. **Deploy independente.** Pos-producao vai iterar em 3 sprints; deploy separado evita regressao no CRUD existente.

## Consequencias

- Os campos `pos_stage`, `pos_assignee_id`, `pos_drive_url` e `pos_briefing` da tabela `job_deliverables` sao atualizados EXCLUSIVAMENTE pela EF `pos-producao`.
- O `UpdateDeliverableSchema` existente NAO aceita esses campos.
- Sao 2 EFs operando na mesma tabela `job_deliverables`, cada uma com seu dominio de colunas.

## Alternativas Consideradas

1. **Extender `jobs-deliverables`:** Descartada. Roteamento ficaria complexo (9+ rotas, 4 niveis de path), e a rota `/dashboard` nao se encaixa no padrao `/:jobId/...`.

2. **Criar sub-rotas em `jobs-deliverables` com prefixo `/pos/`:** Viavel, mas semanticamente incorreto -- pos-producao nao e um sub-recurso de deliverables, e um dominio que opera sobre deliverables.
