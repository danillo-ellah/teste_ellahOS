---
description: Implementa uma feature ja planejada. Segue a spec e o plano tecnico.
argument-hint: <nome da feature>
---

## Workflow de Implementacao

### Passo 1 â€” Ler o plano
Leia a spec em docs/specs/ e a arquitetura em docs/architecture/ ou docs/decisions/
relacionadas a: $ARGUMENTS

### Passo 2 â€” Banco de dados
Se a feature precisa de tabelas novas ou alteracoes no schema:
Use o agente **db-architect** para criar as migrations.

### Passo 3 â€” Backend
Use o agente **backend-dev** para implementar Edge Functions e logica de negocio.
Se houver integracoes externas, use o agente **integrations-engineer**.
Se houver workflows n8n, use o agente **n8n-architect**.
Se houver features de IA, use o agente **ai-engineer**.

### Passo 4 â€” Frontend
Use o agente **frontend-dev** para implementar a interface.

### Passo 5 â€” Resumo
Liste pro humano:
- Arquivos criados/modificados
- O que ficou pendente
- Sugestao: rodar /review
