---
description: Review completo. Security audita, QA testa, Tech Lead valida.
argument-hint: <o que revisar>
---

## Workflow de Review

### Passo 1 â€” Seguranca
Use o agente **security-engineer** para auditar as mudancas recentes.
Foco em RLS policies, Edge Functions e dados sensiveis.

### Passo 2 â€” Testes
Use o agente **qa-engineer** para escrever e rodar testes.
Verificar criterios de aceite da spec.

### Passo 3 â€” Arquitetura
Use o agente **tech-lead** para review geral.
Verificar se segue os padroes e principios do projeto.

### Passo 4 â€” Relatorio
Apresente ao humano:
- Problemas de seguranca (se houver)
- Resultado dos testes
- Aprovacao do Tech Lead
- Lista de ajustes necessarios (se houver)
