---
description: Planeja uma feature nova. PM escreve spec, Tech Lead define arquitetura.
argument-hint: <descricao da feature>
---

## Workflow de Planejamento

Siga estes passos em ordem:

### Passo 1 â€” PM escreve a spec
Use o agente **pm** para analisar o requisito: $ARGUMENTS
O PM deve criar um arquivo em docs/specs/ com user stories e criterios de aceite.

### Passo 2 â€” Tech Lead define arquitetura
Use o agente **tech-lead** para ler a spec que o PM criou e definir:
- Quais tabelas serao necessarias
- Quais Edge Functions
- Quais componentes de frontend
- Qual a ordem de implementacao
Salvar em docs/architecture/ ou docs/decisions/

### Passo 3 â€” Resumo pro humano
Apresente ao humano:
- Resumo da feature em 3 linhas
- Link pro arquivo de spec
- Link pro arquivo de arquitetura
- Lista de perguntas abertas (se houver)
- Estimativa de complexidade (Pequeno / Medio / Grande)
