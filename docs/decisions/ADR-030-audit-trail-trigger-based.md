# ADR-030: Audit Trail Admin via Triggers PostgreSQL

## Status
Aceito (2026-03-10)

## Contexto
Consultores (produtora e investidor) pediram audit trail para responder "quem fez o que, quando" no sistema. O ELLAHOS ja possui `job_history` para rastrear mudancas em jobs, mas nao existe rastreamento generico para outras entidades (clientes, equipe, financeiro, configuracoes).

Opcoes consideradas:
- A) Trigger generico PostgreSQL em tabelas principais
- B) Application-level logging explicitamente em cada Edge Function
- C) Expandir a tabela job_history existente

## Decisao
**Opcao A: Trigger generico PostgreSQL (AFTER INSERT/UPDATE/DELETE)**

Criamos uma nova tabela `audit_log` com trigger generico `fn_audit_log()` aplicado as 17 tabelas de maior impacto. O trigger captura automaticamente OLD/NEW como JSONB.

### Tabelas cobertas (17)
**Core:** tenants, profiles, clients, agencies, contacts, people
**Jobs:** jobs, job_team, job_deliverables, job_budgets
**Financeiro:** financial_records, cost_items, job_receivables
**CRM:** crm_opportunities
**Operacional:** job_files, tenant_invitations, payment_approval_rules

### Tabelas NAO cobertas (motivos)
- `job_history` — ja e o log em si, logar o log e circular
- `ai_conversations`, `ai_messages` — alto volume, baixo valor de auditoria
- `notifications` — efemeras, alto volume
- `nf_documents` — rastreado via NF pipeline proprio
- Tabelas append-only de producao (`production_diary_entries`, `pos_cut_versions`) — contexto proprio

## Consequencias

### Positivas
- Zero mudanca no codigo existente (EFs, frontend)
- Cobertura automatica — trigger nao esquece
- Performance controlavel — AFTER trigger nao bloqueia a operacao
- Multi-tenant nativo — tenant_id extraido do OLD ou NEW
- Tabela append-only com particao futura facil (por mes/ano)

### Negativas
- Crescimento da tabela pode ser significativo (mitigar com pg_cron cleanup > 90 dias)
- OLD/NEW como JSONB inclui todos os campos (nao apenas os alterados) — trade-off simplicidade vs tamanho
- Nao captura "quem" quando a acao vem de service_role (CRON jobs) — mitigar com campo especifico

### Otimizacoes futuras
- pg_cron para limpar registros > 90 dias (ou mover para cold storage)
- Particao por mes se volume justificar
- Filtro de colunas sensiveis (ex: remover hashes de senha do JSONB)

## Alternativas consideradas

### B) Application-level logging
Rejeitada: exigiria modificar ~54 Edge Functions existentes e toda nova EF precisaria lembrar de incluir o log. Alta chance de compliance gap.

### C) Expandir job_history
Rejeitada: job_history tem FK obrigatoria `job_id REFERENCES jobs(id) ON DELETE CASCADE`. Semanticamente diferente — job_history e lifecycle de um job, audit_log e acoes de usuarios no sistema.
