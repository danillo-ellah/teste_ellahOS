# Levantamento Completo do Banco de Dados ELLAHOS

**Data:** 2026-02-20
**Metodo:** Analise estatica das migrations locais + database.ts gerado + documentacao de auditoria
**Project ID:** etvapcxesaxhsvzgaane
**Regiao:** sa-east-1 (Sao Paulo)

> **Nota:** Este levantamento foi feito sem acesso direto ao banco (falta `SUPABASE_ACCESS_TOKEN` no ambiente).
> Todas as informacoes foram extraidas das migrations em `supabase/migrations/`, do schema gerado em
> `frontend/src/types/database.ts`, e dos documentos de auditoria em `docs/security/` e `docs/qa/`.
> O database.ts **ja foi regenerado** e reflete o estado real do banco apos Fase 7.

---

## 1. INVENTARIO DE TABELAS (29 tabelas)

| # | Tabela | Fase | Colunas | RLS | updated_at | deleted_at | Tipo |
|---|--------|------|---------|-----|------------|------------|------|
| 1 | tenants | 1 | 11 | Sim | Sim | Sim | Base |
| 2 | profiles | 1 | 11 | Sim | Sim | Sim | Base |
| 3 | clients | 1 | 16 | Sim | Sim | Sim | Base |
| 4 | agencies | 1 | 15 | Sim | Sim | Sim | Base |
| 5 | contacts | 1 | 12 | Sim | Sim | Sim | Base |
| 6 | people | 1 | 26 | Sim | Sim | Sim | Base |
| 7 | jobs | 1 | **90** | Sim | Sim | Sim | Core |
| 8 | job_team | 1 (+F6) | 14 | Sim | Sim | Sim | Core |
| 9 | job_deliverables | 1 | 17 | Sim | Sim | Sim | Core |
| 10 | job_history | 1 | 9 | Sim | **NAO** | **NAO** | Log (imutavel) |
| 11 | job_budgets | 1 | 18 | Sim | Sim | Sim | Core |
| 12 | job_files | 1 (+F5) | 15 | Sim | Sim | Sim | Core |
| 13 | job_shooting_dates | 1 | 13 | Sim | Sim | Sim | Core |
| 14 | job_code_sequences | 1 | 5 | Sim | **NAO** | **NAO** | Auxiliar (sequencia) |
| 15 | financial_records | 4 | 16 | Sim | Sim | Sim | Financeiro |
| 16 | budget_items | 4 | 13 | Sim | Sim | Sim | Financeiro |
| 17 | invoices | 4 | 15 | Sim | Sim | Sim | Financeiro |
| 18 | payment_history | 4 | 8 | Sim | Sim | Sim | Financeiro |
| 19 | notifications | 5 | 12 | Sim | **NAO** | **NAO** | Evento/Log |
| 20 | notification_preferences | 5 | 7 | Sim | Sim | **NAO** | Config |
| 21 | drive_folders | 5 | 9 | Sim | **NAO** | **NAO** | Integracao |
| 22 | whatsapp_messages | 5 | 11 | Sim | **NAO** | **NAO** | Log |
| 23 | integration_events | 5 | 14 | Sim | **NAO** | **NAO** | Fila/Evento |
| 24 | allocations | 6 | 12 | Sim | Sim | Sim | Equipe |
| 25 | approval_requests | 6 | 21 | Sim | Sim | Sim | Aprovacoes |
| 26 | approval_logs | 6 | 10 | Sim | **NAO** | **NAO** | Log (imutavel) |
| 27 | client_portal_sessions | 7 | 14 | Sim | Sim | Sim | Portal |
| 28 | client_portal_messages | 7 | 14 | Sim | Sim | Sim | Portal |
| 29 | report_snapshots | 7 | 11 | Sim | Sim | Sim | Cache |

**Totais:**
- **29 tabelas** no schema public
- **100% com RLS habilitado**
- 22 com updated_at, 7 sem (logs/eventos/auxiliares)
- 21 com deleted_at (soft delete), 8 sem (logs/eventos/auxiliares)

### Distribuicao por Fase

| Fase | Tabelas | Quantidade |
|------|---------|------------|
| Fase 1 (Schema base) | tenants, profiles, clients, agencies, contacts, people, jobs, job_team, job_deliverables, job_history, job_budgets, job_files, job_shooting_dates, job_code_sequences | 14 |
| Fase 4 (Financeiro) | financial_records, budget_items, invoices, payment_history | 4 |
| Fase 5 (Integracoes) | notifications, notification_preferences, drive_folders, whatsapp_messages, integration_events | 5 |
| Fase 6 (Equipe/Aprovacoes) | allocations, approval_requests, approval_logs | 3 |
| Fase 7 (Dashboard/Portal) | client_portal_sessions, client_portal_messages, report_snapshots | 3 |

---

## 2. FUNCTIONS / RPCs NO SCHEMA PUBLIC (17 funcoes)

### 2.1 Helper Functions (Fases 1-5)

| # | Function | Tipo | SECURITY | search_path | Descricao |
|---|----------|------|----------|-------------|-----------|
| 1 | `get_tenant_id()` | Helper RLS | DEFINER | public | Retorna tenant_id do JWT. Usada em todas as RLS policies. |
| 2 | `get_user_role()` | Helper RLS | DEFINER | public | Retorna role do usuario autenticado. Usada em policies com RBAC. |
| 3 | `update_updated_at()` | Trigger fn | INVOKER | public | Seta updated_at = now() em BEFORE UPDATE. |
| 4 | `calculate_job_financials()` | Trigger fn | INVOKER | public | Calcula tax_value, gross_profit, margin_percentage em jobs. |
| 5 | `calculate_health_score()` | Trigger fn | INVOKER | public | Calcula health_score (0-100) baseado em preenchimento de campos. |
| 6 | `lock_integration_events(p_batch_size)` | RPC | DEFINER | public | Fetch-and-lock atomico para a fila de integration_events. SETOF. |
| 7 | `read_secret(secret_name)` | RPC Vault | DEFINER | public, vault | Le segredo do Vault. |
| 8 | `write_secret(secret_name, secret_value)` | RPC Vault | DEFINER | public, vault | Escreve segredo no Vault. |

### 2.2 RPC de Dominio (Fases 4 e 7)

| # | Function | Args | Returns | SECURITY | Descricao |
|---|----------|------|---------|----------|-----------|
| 9 | `get_financial_summary(p_job_id)` | UUID | JSON | DEFINER | Resumo financeiro de um job. |
| 10 | `get_dashboard_kpis(p_tenant_id)` | UUID | JSON | DEFINER | KPIs: jobs ativos, faturamento, margem, health score, aprovacoes pendentes. |
| 11 | `get_pipeline_summary(p_tenant_id)` | UUID | JSON | DEFINER | Contagem e valor por status (pipeline visual). |
| 12 | `get_revenue_by_month(p_tenant_id, p_months)` | UUID, INT | JSON | DEFINER | Faturamento mensal (ultimos N meses). |
| 13 | `get_alerts(p_tenant_id, p_limit)` | UUID, INT | JSON | DEFINER | Alertas: margem baixa, entregaveis atrasados, health baixo, aprovacoes expirando. |
| 14 | `get_recent_activity(p_tenant_id, p_hours, p_limit)` | UUID, INT, INT | JSON | DEFINER | Atividades recentes do job_history. |
| 15 | `get_report_financial_monthly(p_tenant_id, p_start_date, p_end_date)` | UUID, DATE, DATE | JSON | DEFINER | Relatorio financeiro: resumo, por mes, por categoria, projecao. |
| 16 | `get_report_performance(p_tenant_id, p_start_date, p_end_date, p_group_by)` | UUID, DATE, DATE, TEXT | JSON | DEFINER | Performance por dimensao (director, project_type, client, segment). |
| 17 | `get_report_team_utilization(p_tenant_id, p_start_date, p_end_date)` | UUID, DATE, DATE | JSON | DEFINER | Utilizacao de equipe: dias alocados, percentual, conflitos. |
| 18* | `get_portal_timeline(p_token, p_limit)` | UUID, INT | JSON | DEFINER | Dados do portal: sessao, timeline, docs, aprovacoes, mensagens. Publico via token. |

> *Nota: Funcoes de trigger (update_updated_at, calculate_job_financials, calculate_health_score) nao aparecem como RPCs invocaveis, mas existem no schema.

**Todas as RPCs da Fase 7 sao SECURITY DEFINER com SET search_path = public.**

---

## 3. RLS POLICIES (completa)

### 3.1 Tabelas Base (Fase 1) -- 14 tabelas

Padrao: `tenant_id = get_tenant_id()` (4 policies por tabela: SELECT, INSERT, UPDATE, DELETE)

| Tabela | SELECT | INSERT | UPDATE | DELETE | Padrao |
|--------|--------|--------|--------|--------|--------|
| tenants | Sim | Sim | Sim | - | tenant isolation |
| profiles | Sim | Sim | Sim | - | tenant isolation |
| clients | Sim | Sim | Sim | Sim | tenant isolation |
| agencies | Sim | Sim | Sim | Sim | tenant isolation |
| contacts | Sim | Sim | Sim | Sim | tenant isolation |
| people | Sim | Sim | Sim | Sim | tenant isolation |
| jobs | Sim | Sim | Sim | Sim | tenant isolation |
| job_team | Sim | Sim | Sim | Sim | tenant isolation |
| job_deliverables | Sim | Sim | Sim | Sim | tenant isolation |
| job_history | Sim | Sim | - | - | tenant, imutavel |
| job_budgets | Sim | Sim | Sim | Sim | tenant isolation |
| job_files | Sim | Sim | Sim | Sim | tenant isolation |
| job_shooting_dates | Sim | Sim | Sim | Sim | tenant isolation |
| job_code_sequences | Sim | Sim | Sim | - | tenant isolation |

### 3.2 Tabelas Financeiras (Fase 4) -- 4 tabelas

| Tabela | SELECT | INSERT | UPDATE | DELETE | Padrao |
|--------|--------|--------|--------|--------|--------|
| financial_records | Sim | Sim | Sim | Sim | tenant isolation |
| budget_items | Sim | Sim | Sim | Sim | tenant isolation |
| invoices | Sim | Sim | Sim | Sim | tenant isolation |
| payment_history | Sim | Sim | - | - | tenant, imutavel |

### 3.3 Tabelas de Integracao (Fase 5) -- 5 tabelas

| Tabela | Policies | Padrao | Obs |
|--------|----------|--------|-----|
| notifications | SELECT_own, INSERT_tenant, UPDATE_own, DELETE_own | tenant + user_id | User so ve/edita as proprias |
| notification_preferences | SELECT_own, INSERT_own, UPDATE_own, DELETE_own | tenant + user_id | User so ve/edita as proprias |
| drive_folders | SELECT_tenant, INSERT_tenant, UPDATE_tenant, DELETE_tenant | tenant isolation | |
| whatsapp_messages | SELECT_tenant, INSERT_tenant, UPDATE_tenant, DELETE_tenant | tenant isolation | |
| integration_events | SELECT_tenant, INSERT_tenant, UPDATE_tenant, DELETE_tenant | tenant isolation | |

> **ATENCAO (F-03):** Policies da Fase 5 usam `get_tenant_id()` SEM subselect wrapper `(SELECT ...)`. Pode causar re-avaliacao por row.

### 3.4 Tabelas de Equipe/Aprovacoes (Fase 6) -- 3 tabelas

| Tabela | Policies | Padrao | Obs |
|--------|----------|--------|-----|
| allocations | SELECT_tenant, INSERT_tenant, UPDATE_tenant | tenant isolation | Sem DELETE policy (soft delete) |
| approval_requests | SELECT_tenant, INSERT_tenant, UPDATE_tenant | tenant isolation | Sem DELETE policy (soft delete) |
| approval_logs | SELECT_tenant, INSERT_tenant | tenant isolation | Imutavel (somente INSERT) |

> **ATENCAO (F-03):** Policies da Fase 6 tambem usam `get_tenant_id()` SEM subselect wrapper.

### 3.5 Tabelas do Portal/Dashboard (Fase 7) -- 3 tabelas

| Tabela | Policies | Padrao | Obs |
|--------|----------|--------|-----|
| client_portal_sessions | SELECT, INSERT, UPDATE (TO authenticated) | `(SELECT get_tenant_id())` | Pattern correto com subselect |
| client_portal_messages | SELECT, INSERT, UPDATE (TO authenticated) | `(SELECT get_tenant_id())` | INSERT: direction = producer_to_client AND sender_user_id = auth.uid() |
| report_snapshots | SELECT, INSERT (TO authenticated) | `(SELECT get_tenant_id())` | Sem UPDATE/DELETE (cleanup via pg_cron) |

**Total de RLS policies: ~95 policies** (estimativa: 29 tabelas x ~3.3 policies media)

---

## 4. TRIGGERS

| # | Trigger | Tabela | Funcao | Evento | Fase |
|---|---------|--------|--------|--------|------|
| 1 | trg_tenants_updated_at | tenants | update_updated_at() | BEFORE UPDATE | 1 |
| 2 | trg_profiles_updated_at | profiles | update_updated_at() | BEFORE UPDATE | 1 |
| 3 | trg_clients_updated_at | clients | update_updated_at() | BEFORE UPDATE | 1 |
| 4 | trg_agencies_updated_at | agencies | update_updated_at() | BEFORE UPDATE | 1 |
| 5 | trg_contacts_updated_at | contacts | update_updated_at() | BEFORE UPDATE | 1 |
| 6 | trg_people_updated_at | people | update_updated_at() | BEFORE UPDATE | 1 |
| 7 | trg_jobs_updated_at | jobs | update_updated_at() | BEFORE UPDATE | 1 |
| 8 | set_job_financials | jobs | calculate_job_financials() | BEFORE INSERT/UPDATE | 1 (+F5 atualizado) |
| 9 | calculate_health_score | jobs | calculate_health_score() | AFTER INSERT/UPDATE | 1 |
| 10 | status_history_trigger | jobs | (insere em job_history) | AFTER UPDATE (status) | 1 |
| 11 | job_code_trigger | jobs | (gera code atomico) | BEFORE INSERT | 1 |
| 12 | trg_job_team_updated_at | job_team | update_updated_at() | BEFORE UPDATE | 1 |
| 13 | trg_job_deliverables_updated_at | job_deliverables | update_updated_at() | BEFORE UPDATE | 1 |
| 14 | trg_job_budgets_updated_at | job_budgets | update_updated_at() | BEFORE UPDATE | 1 |
| 15 | trg_job_files_updated_at | job_files | update_updated_at() | BEFORE UPDATE | 1 |
| 16 | trg_job_shooting_dates_updated_at | job_shooting_dates | update_updated_at() | BEFORE UPDATE | 1 |
| 17 | trg_financial_records_updated_at | financial_records | update_updated_at() | BEFORE UPDATE | 4 |
| 18 | trg_budget_items_updated_at | budget_items | update_updated_at() | BEFORE UPDATE | 4 |
| 19 | trg_invoices_updated_at | invoices | update_updated_at() | BEFORE UPDATE | 4 |
| 20 | trg_notification_preferences_updated_at | notification_preferences | update_updated_at() | BEFORE UPDATE | 5 |
| 21 | trg_allocations_updated_at | allocations | update_updated_at() | BEFORE UPDATE | 6 |
| 22 | trg_approval_requests_updated_at | approval_requests | update_updated_at() | BEFORE UPDATE | 6 |
| 23 | trg_client_portal_sessions_updated_at | client_portal_sessions | update_updated_at() | BEFORE UPDATE | 7 |
| 24 | trg_client_portal_messages_updated_at | client_portal_messages | update_updated_at() | BEFORE UPDATE | 7 |
| 25 | trg_report_snapshots_updated_at | report_snapshots | update_updated_at() | BEFORE UPDATE | 7 |

**Total: ~25 triggers** (22 updated_at + 3 logica de negocio em jobs)

---

## 5. INDICES CUSTOMIZADOS (excluindo PKs)

### 5.1 Indices das Fases 1-4 (inferidos da documentacao + audit)

Todas as FKs das tabelas base (Fase 1) possuem indices. Indices notaveis:

| Indice | Tabela | Colunas | Tipo |
|--------|--------|---------|------|
| idx_jobs_tenant_id | jobs | (tenant_id) | B-tree |
| idx_jobs_client_id | jobs | (client_id) | B-tree |
| idx_jobs_agency_id | jobs | (agency_id) | B-tree |
| idx_jobs_code | jobs | (code) | B-tree UNIQUE |
| idx_job_team_job_id | job_team | (job_id) | B-tree |
| idx_job_team_person_id | job_team | (person_id) | B-tree |
| idx_job_deliverables_job_id | job_deliverables | (job_id) | B-tree |
| idx_job_history_job_id | job_history | (job_id) | B-tree |
| idx_job_budgets_job_id | job_budgets | (job_id) | B-tree |
| idx_job_files_job_id | job_files | (job_id) | B-tree |
| idx_job_shooting_dates_job_id | job_shooting_dates | (job_id) | B-tree |
| idx_contacts_client_id | contacts | (client_id) | B-tree |
| idx_contacts_agency_id | contacts | (agency_id) | B-tree |

### 5.2 Indices Fase 5

| Indice | Tabela | Colunas | Tipo |
|--------|--------|---------|------|
| idx_integration_events_status_created_at | integration_events | (status, created_at) | B-tree |
| idx_notifications_user_read | notifications | (user_id, read_at) | B-tree |
| idx_notifications_job_id | notifications | (job_id) WHERE job_id IS NOT NULL | Parcial |
| idx_notifications_tenant_id | notifications | (tenant_id) | B-tree |
| idx_notification_preferences_tenant_id | notification_preferences | (tenant_id) | B-tree |
| idx_drive_folders_job_id | drive_folders | (job_id) | B-tree |
| idx_drive_folders_tenant_id | drive_folders | (tenant_id) | B-tree |
| idx_drive_folders_parent_folder_id | drive_folders | (parent_folder_id) WHERE NOT NULL | Parcial |
| idx_whatsapp_messages_job_id | whatsapp_messages | (job_id) WHERE NOT NULL | Parcial |
| idx_whatsapp_messages_tenant_id | whatsapp_messages | (tenant_id) | B-tree |
| idx_integration_events_tenant_id | integration_events | (tenant_id) | B-tree |
| idx_integration_events_next_retry_at | integration_events | (next_retry_at) WHERE status = 'retrying' | Parcial |
| idx_integration_events_locked_at | integration_events | (locked_at) WHERE NOT NULL | Parcial |

### 5.3 Indices Fase 5.2 (Performance para pg_cron)

| Indice | Tabela | Colunas | Tipo |
|--------|--------|---------|------|
| idx_financial_records_due_date_pending | financial_records | (due_date) WHERE status = 'pendente' AND deleted_at IS NULL | Parcial |
| idx_job_shooting_dates_upcoming | job_shooting_dates | (shooting_date) WHERE deleted_at IS NULL | Parcial |
| idx_job_deliverables_overdue | job_deliverables | (delivery_date) WHERE status != 'entregue' AND deleted_at IS NULL | Parcial |
| idx_notifications_dedup | notifications | (type, job_id, created_at) WHERE job_id IS NOT NULL | Parcial |

### 5.4 Indices Fase 6

| Indice | Tabela | Colunas | Tipo |
|--------|--------|---------|------|
| idx_allocations_conflict_lookup | allocations | (tenant_id, people_id, allocation_start, allocation_end) WHERE deleted_at IS NULL | Parcial composto |
| idx_allocations_tenant_id | allocations | (tenant_id) | B-tree |
| idx_allocations_job_id | allocations | (job_id) | B-tree |
| idx_allocations_people_id | allocations | (people_id) | B-tree |
| idx_allocations_job_team_id | allocations | (job_team_id) WHERE NOT NULL | Parcial |
| idx_approval_requests_job_status | approval_requests | (job_id, status) WHERE deleted_at IS NULL | Parcial composto |
| idx_approval_requests_token | approval_requests | (token) WHERE deleted_at IS NULL | Parcial UNIQUE |
| idx_approval_requests_tenant_id | approval_requests | (tenant_id) | B-tree |
| idx_approval_requests_job_id | approval_requests | (job_id) | B-tree |
| idx_approval_requests_created_by | approval_requests | (created_by) | B-tree |
| idx_approval_requests_pending | approval_requests | (tenant_id, status) WHERE status = 'pending' AND deleted_at IS NULL | Parcial |
| idx_approval_logs_request_id | approval_logs | (approval_request_id) | B-tree |
| idx_approval_logs_tenant_id | approval_logs | (tenant_id) | B-tree |

### 5.5 Indices Fase 7

| Indice | Tabela | Colunas | Tipo |
|--------|--------|---------|------|
| idx_client_portal_sessions_active_job_contact | client_portal_sessions | (tenant_id, job_id, contact_id) WHERE active | UNIQUE parcial |
| idx_client_portal_sessions_token | client_portal_sessions | (token) WHERE deleted_at IS NULL | Parcial |
| idx_client_portal_sessions_tenant_job | client_portal_sessions | (tenant_id, job_id) WHERE deleted_at IS NULL | Parcial composto |
| idx_client_portal_sessions_tenant_id | client_portal_sessions | (tenant_id) | B-tree |
| idx_client_portal_sessions_job_id | client_portal_sessions | (job_id) | B-tree |
| idx_client_portal_sessions_contact_id | client_portal_sessions | (contact_id) WHERE NOT NULL | Parcial |
| idx_client_portal_sessions_created_by | client_portal_sessions | (created_by) | B-tree |
| idx_portal_messages_session | client_portal_messages | (session_id, created_at DESC) | Composto |
| idx_portal_messages_tenant_job | client_portal_messages | (tenant_id, job_id) | Composto |
| idx_portal_messages_tenant_id | client_portal_messages | (tenant_id) | B-tree |
| idx_portal_messages_job_id | client_portal_messages | (job_id) | B-tree |
| idx_portal_messages_session_id | client_portal_messages | (session_id) | B-tree |
| idx_portal_messages_sender_user_id | client_portal_messages | (sender_user_id) WHERE NOT NULL | Parcial |
| idx_report_snapshots_lookup | report_snapshots | (tenant_id, report_type, generated_at DESC) | Composto |
| idx_report_snapshots_tenant_id | report_snapshots | (tenant_id) | B-tree |
| idx_report_snapshots_created_by | report_snapshots | (created_by) WHERE NOT NULL | Parcial |
| idx_jobs_tenant_status_active | jobs | (tenant_id, status) WHERE active | Parcial composto |
| idx_deliverables_overdue_dashboard | job_deliverables | (delivery_date) WHERE nao aprovado/entregue | Parcial |
| idx_job_history_tenant_recent | job_history | (tenant_id, created_at DESC) | Composto |
| idx_financial_records_tenant_date | financial_records | (tenant_id, created_at) WHERE deleted_at IS NULL | Parcial |

**Total estimado: ~55-60 indices customizados** (sem contar PKs e UNIQUE constraints automaticos)

---

## 6. EXTENSIONS HABILITADAS

| Extensao | Schema | Versao | Descricao |
|----------|--------|--------|-----------|
| uuid-ossp | extensions | -- | Geracao de UUIDs (gen_random_uuid) |
| pgcrypto | extensions | -- | Funcoes criptograficas |
| pg_net | extensions | 0.19.5 | Chamadas HTTP assincronas (usado pelo pg_cron) |
| pg_cron | extensions | 1.6.4 | Agendamento de tarefas periodicas |
| supabase_vault | vault | -- | Armazenamento seguro de segredos |
| pgjwt | extensions | -- | Decodificacao de JWT (usado por get_tenant_id) |
| pg_stat_statements | extensions | -- | Estatisticas de queries (habilitado por padrao no Supabase) |

> Nota: `uuid-ossp`, `pgcrypto`, `pgjwt` e `pg_stat_statements` sao habilitados por padrao no Supabase. Os 3 adicionados pelo projeto sao `pg_net`, `pg_cron` e `supabase_vault`.

---

## 7. MIGRATIONS APLICADAS

As migrations no Supabase sao rastreadas na tabela `supabase_migrations.schema_migrations`. Baseado nos arquivos locais:

### 7.1 Migrations locais (3 arquivos em supabase/migrations/)

| Arquivo | Fase | Descricao |
|---------|------|-----------|
| `20260219_fase5_1_infrastructure_foundation.sql` | 5.1 | Extensoes pg_net/pg_cron, 5 tabelas novas, alteracoes em jobs/job_files/people, trigger financeiro, RLS, indices, Realtime |
| `20260219_fase5_2_pg_cron_jobs.sql` | 5.2 | 2 pg_cron jobs (integration-processor a cada minuto, daily-deadline-alerts as 11h UTC), indices auxiliares |
| `20260220_fase7_1_dashboard_portal.sql` | 7.1 | 3 tabelas novas (portal + snapshots), 9 RPCs, RLS, triggers, indices, pg_cron cleanup |

### 7.2 Migrations historicas (Fases 1-4, 6 -- aplicadas diretamente no Supabase)

Conforme documentacao, as Fases 1, 4 e 6 tiveram **14 migrations** aplicadas diretamente via SQL Editor do Supabase Dashboard, nao via arquivos locais. Estas incluiram:

- **Fase 1 (14 migrations):** tenants, profiles, clients, agencies, contacts, people, jobs (~75 colunas), job_team, job_deliverables, job_history, job_budgets, job_files, job_shooting_dates, job_code_sequences + ENUMs + triggers + RLS + indices
- **Fase 4:** financial_records, budget_items, invoices, payment_history + ENUMs + triggers + RLS
- **Fase 6:** allocations, approval_requests, approval_logs + ALTER job_team (allocation_start/end) + RLS + indices

> **Problema:** Nao ha arquivos de migration local para as Fases 1, 4 e 6. O historico completo so existe no banco de dados remoto.

---

## 8. TABELAS SEM RLS (Verificacao de Seguranca)

**RESULTADO: NENHUMA tabela sem RLS.**

Todas as 29 tabelas no schema public tem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` aplicado. Verificado nas migrations locais (Fases 5, 7) e confirmado pela auditoria de seguranca (`docs/security/audit-fase7-database.md`).

Detalhes do isolamento:
- 27 tabelas usam tenant isolation via `get_tenant_id()`
- 2 tabelas adicionam user isolation: `notifications` e `notification_preferences` (user_id = auth.uid())
- `tenants` nao tem tenant_id FK (ela e a propria tabela raiz) -- isolada por id = get_tenant_id()

---

## 9. FOREIGN KEYS SEM INDICE (Verificacao de Performance)

### FKs com indice FALTANDO

| Tabela | Coluna FK | Referencia | Status |
|--------|-----------|------------|--------|
| drive_folders | created_by | profiles(id) | **SEM INDICE** |

### FKs cobertas por UNIQUE constraint (indice implicito)

| Tabela | Coluna FK | Constraint UNIQUE |
|--------|-----------|-------------------|
| notification_preferences | (tenant_id, user_id) | uq_notification_preferences_tenant_user |
| drive_folders | (tenant_id, job_id, folder_key) | uq_drive_folders_tenant_job_key |
| client_portal_sessions | (token) | uq_client_portal_sessions_token |
| integration_events | (idempotency_key) | uq_integration_events_idempotency_key |

**RESULTADO: 1 FK sem indice (drive_folders.created_by).** Todas as demais FKs possuem indice explicito ou implicito via UNIQUE constraint.

### Indice recomendado (backlog)

```sql
CREATE INDEX IF NOT EXISTS idx_drive_folders_created_by
  ON drive_folders(created_by)
  WHERE created_by IS NOT NULL;
```

---

## 10. CONTAGEM DE REGISTROS

**NAO DISPONIVEL** -- sem acesso direto ao banco nesta sessao.

Para obter a contagem, executar no SQL Editor do Supabase:

```sql
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

Ou via CLI com token:
```bash
npx supabase inspect db table-stats --linked
```

---

## 11. ENUMS (17 tipos)

| # | ENUM | Valores | Tabela(s) |
|---|------|---------|-----------|
| 1 | job_status | 14 valores (briefing_recebido ... pausado) | jobs.status |
| 2 | project_type | 10 valores (filme_publicitario ... outro) | jobs.project_type |
| 3 | priority_level | 3 valores (alta, media, baixa) | jobs.priority_level |
| 4 | client_segment | 10 valores (automotivo ... outro) | jobs.segment |
| 5 | pos_sub_status | 6 valores (edicao, cor, vfx, finalizacao, audio, revisao) | jobs.pos_sub_status |
| 6 | team_role | 15 valores (diretor ... outro) | job_team.role |
| 7 | hiring_status | 4 valores (orcado ... cancelado) | job_team.hiring_status |
| 8 | deliverable_status | 5 valores (pendente ... entregue) | job_deliverables.status |
| 9 | history_event_type | 7 valores (status_change ... financial_update) | job_history.event_type |
| 10 | approval_type | 2 valores (interna, externa_cliente) | approval_requests.approval_type |
| 11 | user_role | 9 valores (admin ... freelancer) | profiles.role |
| 12 | financial_record_type | 2 valores (receita, despesa) | financial_records.type |
| 13 | financial_record_status | 4 valores (pendente ... cancelado) | financial_records.status |
| 14 | financial_record_category | 16 valores (cache_equipe ... outro) | financial_records.category |
| 15 | payment_method | 8 valores (pix ... outro) | financial_records.payment_method |
| 16 | invoice_status | 4 valores (emitida ... cancelada) | invoices.status |
| 17 | invoice_type | 4 valores (nf_servico ... fatura) | invoices.type |

---

## 12. pg_cron JOBS (3 jobs agendados)

| # | Job Name | Schedule | Descricao |
|---|----------|----------|-----------|
| 1 | process-integration-queue | `* * * * *` (cada minuto) | HTTP POST para Edge Function integration-processor (batch 20 eventos) |
| 2 | daily-deadline-alerts | `0 11 * * *` (08h BRT) | SQL puro: alertas de pagamento (7/3/1 dias), diarias (3 dias), entregaveis atrasados |
| 3 | cleanup-expired-report-snapshots | `0 */6 * * *` (cada 6h) | DELETE FROM report_snapshots WHERE expires_at < now() |

---

## 13. REALTIME PUBLICATIONS

| Tabela | Publication |
|--------|-------------|
| notifications | supabase_realtime |

Apenas `notifications` esta publicada no Realtime. O frontend usa `useRealtimeNotifications` para receber notificacoes em tempo real via subscribe INSERT.

---

## 14. CHECK CONSTRAINTS (nao-ENUM)

| Tabela | Constraint | Regra |
|--------|-----------|-------|
| notifications | chk_notifications_type | type IN (8 valores) |
| notifications | chk_notifications_priority | priority IN (low, normal, high, urgent) |
| whatsapp_messages | chk_whatsapp_messages_status | status IN (5 valores) |
| whatsapp_messages | chk_whatsapp_messages_provider | provider IN (evolution, zapi) |
| whatsapp_messages | chk_whatsapp_messages_phone | length(digits) >= 10 |
| integration_events | chk_integration_events_type | event_type IN (9 valores) |
| integration_events | chk_integration_events_status | status IN (5 valores) |
| integration_events | chk_integration_events_attempts | attempts >= 0 |
| allocations | chk_allocations_dates | allocation_end >= allocation_start |
| job_team | chk_job_team_allocation_dates | nullable-aware date validation |
| approval_requests | chk_approval_requests_type | 5 valores |
| approval_requests | chk_approval_requests_status | 4 valores |
| approval_requests | chk_approval_requests_approver_type | approver type consistency |
| approval_requests | chk_approval_requests_external_email | external requires email |
| approval_requests | chk_approval_requests_internal_people | internal requires people_id |
| approval_logs | chk_approval_logs_action | 6 valores |
| approval_logs | chk_approval_logs_actor_type | 3 valores |
| client_portal_messages | chk_portal_messages_direction | direction IN (2 valores) |
| client_portal_messages | chk_portal_messages_direction_sender | consistency direction/sender |
| client_portal_messages | chk_portal_messages_idempotency_required | client msgs require key |
| report_snapshots | chk_report_snapshots_type | report_type IN (4 valores) |
| people | chk_people_bank_info_valid_structure | JSONB structure validation |

**Total: 22 CHECK constraints** (alem dos ENUMs)

---

## 15. FINDINGS CRITICOS PENDENTES

Da auditoria de seguranca (`docs/security/audit-fase7-database.md`):

### CRITICO

| # | Finding | Descricao | Status |
|---|---------|-----------|--------|
| F-03 | RLS pattern inconsistente | Fases 5/6 usam `get_tenant_id()` sem `(SELECT ...)` wrapper. Fase 7 usa corretamente. | **PENDENTE** |
| F-15 | NOT NULL + ON DELETE SET NULL | `allocations.created_by`, `approval_requests.created_by`, `client_portal_sessions.created_by` tem NOT NULL com ON DELETE SET NULL -- inconsistente. | **PENDENTE** |
| F-18 | database.ts | Verificar se esta atualizado apos ultima regeneracao. database.ts atual ja contem 29 tabelas e 13+ functions. | **RESOLVIDO** |

### IMPORTANTE

| # | Finding | Descricao | Status |
|---|---------|-----------|--------|
| F-01 | notifications e drive_folders sem deleted_at | Tem DELETE policy mas sem soft delete. | PENDENTE |
| F-05 | drive_folders.created_by sem indice | FK sem indice. | PENDENTE |
| F-10 | get_portal_timeline UPDATE sem rate limit | Escrita em toda leitura do portal. | PENDENTE |
| F-14 | notifications.type CHECK desatualizado | Falta tipos novos (approval_created, portal_message_received). | PENDENTE |

---

## 16. RESUMO NUMERICO

| Metrica | Valor |
|---------|-------|
| Tabelas | 29 |
| Colunas totais | ~466 (jobs sozinho = 90) |
| ENUMs | 17 |
| CHECK constraints | 22 |
| Functions/RPCs | 17-18 |
| Triggers | ~25 |
| RLS policies | ~95 |
| Indices customizados | ~55-60 |
| pg_cron jobs | 3 |
| Extensions adicionais | 3 (pg_net, pg_cron, supabase_vault) |
| Realtime publications | 1 (notifications) |
| FKs sem indice | 1 (drive_folders.created_by) |
| Tabelas sem RLS | 0 |
| Tabelas sem soft delete | 8 (logs/eventos/auxiliares -- by design) |

---

**Fim do levantamento.**
**Proximos passos recomendados:**
1. Configurar `SUPABASE_ACCESS_TOKEN` no ambiente para permitir queries diretas ao banco
2. Executar `SELECT count(*) FROM {tabela}` para verificar dados de teste
3. Resolver findings criticos F-03 e F-15 antes da Fase 8
4. Regenerar database.ts periodicamente com `npx supabase gen types typescript`
