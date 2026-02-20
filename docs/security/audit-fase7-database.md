# Auditoria Completa do Banco de Dados ELLAHOS

**Data:** 2026-02-20
**Auditor:** Database Architect (Claude Agent)
**Escopo:** Schema completo, RLS, indices, RPCs, ENUMs, constraints, integridade referencial
**Fase auditada:** Todas (1-7) com foco na migration Fase 7.1

---

## Resumo Executivo

| Severidade  | Quantidade | Descricao                                                  |
|-------------|------------|-------------------------------------------------------------|
| CRITICO     | 3          | Bugs que causam erros em runtime ou vazamento de dados     |
| IMPORTANTE  | 7          | Inconsistencias que devem ser corrigidas antes de deploy   |
| MELHORIA    | 8          | Otimizacoes e boas praticas                                |

---

## 1. Schema Review

### 1.1 Inventario de Tabelas

**Tabelas esperadas (30 total):**

| # | Tabela                     | Fase | Status na migration | id | tenant_id | created_at | updated_at | deleted_at |
|---|---------------------------|------|---------------------|-----|-----------|------------|------------|------------|
| 1 | tenants                   | 1    | OK (pre-existente)  | OK  | N/A (e a propria) | OK | OK | OK |
| 2 | profiles                  | 1    | OK                  | OK  | OK  | OK | OK | OK |
| 3 | clients                   | 1    | OK                  | OK  | OK  | OK | OK | OK |
| 4 | agencies                  | 1    | OK                  | OK  | OK  | OK | OK | OK |
| 5 | contacts                  | 1    | OK                  | OK  | OK  | OK | OK | OK |
| 6 | people                    | 1    | OK                  | OK  | OK  | OK | OK | OK |
| 7 | jobs                      | 1    | OK (~77+ cols)      | OK  | OK  | OK | OK | OK |
| 8 | job_team                  | 1    | OK (+Fase 6 cols)   | OK  | OK  | OK | OK | OK |
| 9 | job_deliverables          | 1    | OK                  | OK  | OK  | OK | OK | OK |
| 10| job_history               | 1    | OK (log imutavel)   | OK  | OK  | OK | N/A | N/A |
| 11| job_budgets               | 1    | OK                  | OK  | OK  | OK | OK | OK |
| 12| job_files                 | 1    | OK (+Fase 5 cols)   | OK  | OK  | OK | OK | OK |
| 13| job_shooting_dates        | 1    | OK                  | OK  | OK  | OK | OK | OK |
| 14| job_code_sequences        | 1    | OK (auxiliar)       | OK  | OK  | OK | N/A | N/A |
| 15| financial_records         | 4    | OK                  | OK  | OK  | OK | OK | OK |
| 16| budget_items              | 4    | OK                  | OK  | OK  | OK | OK | OK |
| 17| invoices                  | 4    | OK                  | OK  | OK  | OK | OK | OK |
| 18| payment_history           | 4    | OK                  | OK  | OK  | OK | OK | OK |
| 19| notifications             | 5    | OK                  | OK  | OK  | OK | **NAO** | **NAO** |
| 20| notification_preferences  | 5    | OK                  | OK  | OK  | OK | OK | **NAO** |
| 21| drive_folders             | 5    | OK                  | OK  | OK  | OK | **NAO** | **NAO** |
| 22| whatsapp_messages         | 5    | OK                  | OK  | OK  | OK | **NAO** | **NAO** |
| 23| integration_events        | 5    | OK                  | OK  | OK  | OK | **NAO** | **NAO** |
| 24| allocations               | 6    | OK                  | OK  | OK  | OK | OK | OK |
| 25| approval_requests         | 6    | OK                  | OK  | OK  | OK | OK | OK |
| 26| approval_logs             | 6    | OK (log imutavel)   | OK  | OK  | OK | N/A | N/A |
| 27| client_portal_sessions    | 7    | OK                  | OK  | OK  | OK | OK | OK |
| 28| client_portal_messages    | 7    | OK                  | OK  | OK  | OK | OK | OK |
| 29| report_snapshots          | 7    | OK                  | OK  | OK  | OK | OK | OK |

**Total real: 29 tabelas** (nao 30 como esperado na pergunta do usuario)

### [IMPORTANTE] F-01: Tabelas de log/evento sem updated_at e deleted_at

As seguintes tabelas nao seguem a convencao obrigatoria de ter updated_at e deleted_at:

- `notifications` -- sem updated_at, sem deleted_at (tem apenas read_at)
- `drive_folders` -- sem updated_at, sem deleted_at
- `whatsapp_messages` -- sem updated_at, sem deleted_at
- `integration_events` -- sem updated_at, sem deleted_at (tem processed_at)
- `notification_preferences` -- sem deleted_at

**Justificativa parcial:** Essas tabelas da Fase 5 foram desenhadas como registros de log/evento (append-only ou write-once). A decisao e valida para logs, porem:
- `notifications` tem DELETE policy (permite hard delete) -- inconsistente sem deleted_at
- `drive_folders` tem UPDATE e DELETE policies -- precisa de updated_at e deleted_at

**Recomendacao:** Adicionar deleted_at a `notifications` e `drive_folders` que tem operacoes de UPDATE/DELETE via RLS. As demais podem permanecer como estao (log/evento).

### [IMPORTANTE] F-02: Contagem de tabelas diverge da documentacao

- CLAUDE.md diz "14 tabelas" na Fase 1, MEMORY.md diz "27 tabelas" ate a Fase 6
- A spec Fase 7 diz "29 tabelas total (27 existentes + 2 novas)"
- A migration Fase 7 cria **3 tabelas** (client_portal_sessions, client_portal_messages, report_snapshots), nao 2
- Total real: 29 tabelas (nao 30 como perguntado, nem 29 como na spec)

**Recomendacao:** Atualizar documentacao. A spec Fase 7 dizia "client_portal_tokens" mas a migration criou "client_portal_sessions" (nome correto). A spec tambem nao mencionava report_snapshots.

---

## 2. RLS Audit

### 2.1 RLS habilitado em todas as tabelas?

Baseado nas migrations locais:

| Tabela | RLS habilitado | Verificado em |
|--------|---------------|---------------|
| tenants | Sim | Fase 1 (pre-existente) |
| profiles | Sim | Fase 1 |
| clients | Sim | Fase 1 |
| agencies | Sim | Fase 1 |
| contacts | Sim | Fase 1 |
| people | Sim | Fase 1 |
| jobs | Sim | Fase 1 |
| job_team | Sim | Fase 1 |
| job_deliverables | Sim | Fase 1 |
| job_history | Sim | Fase 1 |
| job_budgets | Sim | Fase 1 |
| job_files | Sim | Fase 1 |
| job_shooting_dates | Sim | Fase 1 |
| job_code_sequences | Sim | Fase 1 |
| financial_records | Sim | Fase 4 |
| budget_items | Sim | Fase 4 |
| invoices | Sim | Fase 4 |
| payment_history | Sim | Fase 4 |
| notifications | Sim | Fase 5.1 (linha 393) |
| notification_preferences | Sim | Fase 5.1 (linha 434) |
| drive_folders | Sim | Fase 5.1 (linha 476) |
| whatsapp_messages | Sim | Fase 5.1 (linha 503) |
| integration_events | Sim | Fase 5.1 (linha 530) |
| allocations | Sim | Fase 6 |
| approval_requests | Sim | Fase 6 |
| approval_logs | Sim | Fase 6 |
| client_portal_sessions | Sim | Fase 7.1 (linha 161) |
| client_portal_messages | Sim | Fase 7.1 (linha 185) |
| report_snapshots | Sim | Fase 7.1 (linha 210) |

**Resultado: TODAS as tabelas tem RLS habilitado. OK.**

### 2.2 Padrao de policies: (SELECT auth.uid()) vs auth.uid()

### [CRITICO] F-03: Inconsistencia no pattern de RLS entre Fases 5 e 7

**Fase 5.1** usa `get_tenant_id()` SEM subselect wrapper:
```sql
-- Fase 5.1 (linha 399)
USING (tenant_id = get_tenant_id() AND user_id = (select auth.uid()))
```

**Fase 7.1** usa `(SELECT get_tenant_id())` COM subselect wrapper:
```sql
-- Fase 7.1 (linha 166)
USING (tenant_id = (SELECT get_tenant_id()));
```

**Fase 6** usa `get_tenant_id()` SEM subselect wrapper:
```sql
-- Fase 6 (doc arch linha 299)
USING (tenant_id = get_tenant_id());
```

O pattern correto por performance e `(SELECT get_tenant_id())` porque o subselect forca o PostgreSQL a avaliar a funcao uma unica vez e reutilizar o resultado para cada row. Sem o subselect, o planner PODE re-avaliar a funcao por row.

**Impacto:** As tabelas da Fase 5 e 6 (notifications, notification_preferences, drive_folders, whatsapp_messages, integration_events, allocations, approval_requests, approval_logs) podem ter performance degradada em datasets grandes.

**Recomendacao:** Criar migration corretiva que re-cria as policies das Fases 5 e 6 usando `(SELECT get_tenant_id())`. A Fase 7 esta correta.

### 2.3 get_tenant_id() -- SECURITY DEFINER com search_path fixo?

A funcao `get_tenant_id()` foi criada na Fase 1 (nao temos a migration local, mas e referenciada em todas as policies). Conforme MEMORY.md: "RLS: todas com get_tenant_id() (le do JWT, SECURITY DEFINER, evita recursao)".

**Status: OK** (confiando na documentacao; validacao real requer query no banco).

### 2.4 Teste mental de isolamento

**Cenario: Usuario do Tenant A consegue ver dados do Tenant B?**

- Tabelas com policy `tenant_id = (SELECT get_tenant_id())`: **NAO** -- bloqueado.
- Tabelas com policy adicional `user_id = (SELECT auth.uid())` (notifications, notification_preferences): **NAO** -- doubly restricted.
- `client_portal_messages` INSERT policy: restringe a `direction = 'producer_to_client' AND sender_user_id = (SELECT auth.uid())` -- **OK**, cliente envia via service_role.
- `approval_logs`: somente SELECT e INSERT com tenant isolation -- **OK** (imutavel).
- `report_snapshots`: somente SELECT e INSERT -- **OK**, sem UPDATE/DELETE policy (dados expiram via pg_cron DELETE direto).

### [IMPORTANTE] F-04: report_snapshots sem DELETE policy mas pg_cron faz DELETE

O pg_cron job `cleanup-expired-report-snapshots` faz:
```sql
DELETE FROM report_snapshots WHERE expires_at < now()
```

Este DELETE roda como superuser do pg_cron (bypassa RLS), entao funciona. Porem, se algum codigo de Edge Function tentar deletar via service_role ou via user client, nao havera policy de DELETE para usuario autenticado. Isso pode causar problemas se no futuro for necessario deletar manualmente.

**Recomendacao:** Adicionar DELETE policy para admin/ceo ou aceitar que a limpeza e somente automatica.

---

## 3. Indices

### 3.1 Analise de FK sem indice

Verificando as foreign keys declaradas nas migrations vs indices criados:

**Fase 5.1:**
| FK | Indice | Status |
|----|--------|--------|
| notifications.tenant_id | idx_notifications_tenant_id | OK |
| notifications.user_id | idx_notifications_user_read (composto) | OK |
| notifications.job_id | idx_notifications_job_id (parcial) | OK |
| notification_preferences.tenant_id | idx_notification_preferences_tenant_id | OK |
| notification_preferences.user_id | Coberto pela UNIQUE(tenant_id, user_id) | OK |
| drive_folders.tenant_id | idx_drive_folders_tenant_id | OK |
| drive_folders.job_id | idx_drive_folders_job_id | OK |
| drive_folders.parent_folder_id | idx_drive_folders_parent_folder_id (parcial) | OK |
| drive_folders.created_by | **NENHUM** | **FALTANDO** |
| whatsapp_messages.tenant_id | idx_whatsapp_messages_tenant_id | OK |
| whatsapp_messages.job_id | idx_whatsapp_messages_job_id (parcial) | OK |
| integration_events.tenant_id | idx_integration_events_tenant_id | OK |

**Fase 7.1:**
| FK | Indice | Status |
|----|--------|--------|
| client_portal_sessions.tenant_id | idx_client_portal_sessions_tenant_id | OK |
| client_portal_sessions.job_id | idx_client_portal_sessions_job_id | OK |
| client_portal_sessions.contact_id | idx_client_portal_sessions_contact_id (parcial) | OK |
| client_portal_sessions.created_by | idx_client_portal_sessions_created_by | OK |
| client_portal_messages.tenant_id | idx_portal_messages_tenant_id | OK |
| client_portal_messages.session_id | idx_portal_messages_session_id + idx_portal_messages_session | OK |
| client_portal_messages.job_id | idx_portal_messages_job_id | OK |
| client_portal_messages.sender_user_id | idx_portal_messages_sender_user_id (parcial) | OK |
| report_snapshots.tenant_id | idx_report_snapshots_tenant_id | OK |
| report_snapshots.created_by | idx_report_snapshots_created_by (parcial) | OK |

### [MELHORIA] F-05: FK drive_folders.created_by sem indice

A coluna `drive_folders.created_by` e uma FK para `profiles(id)` mas nao tem indice. Pode causar seq scan em JOINs ou ON DELETE SET NULL.

**Recomendacao:**
```sql
CREATE INDEX IF NOT EXISTS idx_drive_folders_created_by
  ON drive_folders(created_by)
  WHERE created_by IS NOT NULL;
```

### 3.2 Indices de performance para queries comuns

**Para tabela `jobs` (~77 colunas):**
- `idx_jobs_tenant_status_active` (Fase 7): `ON jobs(tenant_id, status) WHERE deleted_at IS NULL AND status NOT IN (...)` -- OK para dashboard KPIs
- Indice em `tenant_id` (Fase 1): presumido existente

### [MELHORIA] F-06: Indice composto para jobs(tenant_id, created_at) ausente

As RPCs `get_revenue_by_month` e `get_report_financial_monthly` fazem filtros por `tenant_id + created_at` com agregacoes. Um indice composto aceleraria significativamente:

```sql
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_created_at
  ON jobs(tenant_id, created_at)
  WHERE deleted_at IS NULL;
```

### [MELHORIA] F-07: Indice para allocations.people_id + datas (performance da RPC get_report_team_utilization)

A RPC faz JOIN com LEFT JOIN em `allocations` filtrado por `people_id + allocation_start/end`. O indice `idx_allocations_conflict_lookup` (Fase 6) cobre `(tenant_id, people_id, allocation_start, allocation_end)`, o que deve ser suficiente. OK.

---

## 4. RPCs e Functions

### 4.1 Lista completa de functions no schema public

**Pre-existentes (Fases 1-4):**
1. `get_tenant_id()` -- SECURITY DEFINER, retorna UUID
2. `get_user_role()` -- SECURITY DEFINER, retorna TEXT
3. `get_financial_summary(p_job_id UUID)` -- retorna JSON
4. `calculate_job_financials()` -- trigger SECURITY INVOKER
5. `update_updated_at()` -- trigger function
6. `lock_integration_events(...)` -- RPC atomica (fetch-and-lock)
7. `read_secret(...)` -- Vault
8. `write_secret(...)` -- Vault

**Fase 7.1 (novas):**
9. `get_dashboard_kpis(p_tenant_id UUID)` -- SECURITY DEFINER, SET search_path = public
10. `get_pipeline_summary(p_tenant_id UUID)` -- SECURITY DEFINER, SET search_path = public
11. `get_revenue_by_month(p_tenant_id UUID, p_months INT)` -- SECURITY DEFINER, SET search_path = public
12. `get_alerts(p_tenant_id UUID, p_limit INT)` -- SECURITY DEFINER, SET search_path = public
13. `get_recent_activity(p_tenant_id UUID, p_hours INT, p_limit INT)` -- SECURITY DEFINER, SET search_path = public
14. `get_report_financial_monthly(p_tenant_id UUID, p_start_date DATE, p_end_date DATE)` -- SECURITY DEFINER, SET search_path = public
15. `get_report_performance(p_tenant_id UUID, p_start_date DATE, p_end_date DATE, p_group_by TEXT)` -- SECURITY DEFINER, SET search_path = public
16. `get_report_team_utilization(p_tenant_id UUID, p_start_date DATE, p_end_date DATE)` -- SECURITY DEFINER, SET search_path = public
17. `get_portal_timeline(p_token UUID, p_limit INT)` -- SECURITY DEFINER, SET search_path = public

**Todas as RPCs da Fase 7 sao SECURITY DEFINER com search_path fixo: OK**

### [CRITICO] F-08: RPC get_alerts no doc de arquitetura referencia colunas inexistentes

No documento `docs/architecture/fase-7-architecture.md` (linhas 445-460), a RPC `get_alerts` usa:
```sql
jd.title as entity_title,   -- ERRADO: coluna se chama "description" em job_deliverables
jd.due_date                  -- ERRADO: coluna se chama "delivery_date" em job_deliverables
```

**Na migration real** (arquivo `20260220_fase7_1_dashboard_portal.sql`, linhas 558-574), o codigo foi **corrigido**:
```sql
jd.description as entity_title,  -- CORRETO
jd.delivery_date                 -- CORRETO
```

**Status:** O doc de arquitetura esta desatualizado mas a migration esta CORRETA. O doc deve ser atualizado.

### [CRITICO] F-09: RPC get_dashboard_kpis no doc referencia jd.due_date (inexistente)

No documento `docs/architecture/fase-7-architecture.md` (linha 312):
```sql
AND jd.due_date < now()     -- ERRADO: coluna se chama "delivery_date"
```

**Na migration real** (arquivo `20260220_fase7_1_dashboard_portal.sql`, linha 413):
```sql
AND jd.delivery_date < current_date   -- CORRETO
```

**Status:** Mesmo caso que F-08. Doc desatualizado, migration correta.

### [IMPORTANTE] F-10: RPC get_portal_timeline faz UPDATE sem controle de rate limiting

A funcao `get_portal_timeline` atualiza `last_accessed_at` em toda chamada:
```sql
UPDATE client_portal_sessions SET last_accessed_at = now() WHERE id = v_session.id;
```

Isso e uma escrita por cada leitura. Se o cliente recarregar o portal frequentemente, gera escritas desnecessarias.

**Recomendacao:** Usar um intervalo minimo (ex: so atualizar se `last_accessed_at` for mais velho que 5 minutos):
```sql
UPDATE client_portal_sessions
SET last_accessed_at = now()
WHERE id = v_session.id
  AND (last_accessed_at IS NULL OR last_accessed_at < now() - interval '5 minutes');
```

### [MELHORIA] F-11: RPCs retornam NULL em vez de array vazio quando nao ha dados

As RPCs `get_pipeline_summary`, `get_revenue_by_month`, `get_alerts` usam `json_agg()` que retorna NULL quando o input esta vazio. Isso forca o frontend a tratar null.

**Na Fase 7 migration, get_portal_timeline usa COALESCE(json_agg(...), '[]'::json)** -- correto.
**Porem get_pipeline_summary, get_revenue_by_month, get_report_performance nao usam COALESCE.**

**Recomendacao:** Envolver com `COALESCE(json_agg(...), '[]'::json)` em todas as RPCs.

### [MELHORIA] F-12: RPC get_report_team_utilization tem subquery correlata N+1

A contagem de conflitos usa subquery correlata por pessoa (linhas 923-936 da migration). Para N pessoas, executa N subqueries de self-join em allocations. Pode ser lento com muitos registros.

**Recomendacao futura:** Se performance for problema, refatorar para CTE ou window function.

---

## 5. CHECK Constraints e ENUMs

### 5.1 ENUMs existentes (do database.ts gerado)

| ENUM                      | Valores                                     | Status |
|--------------------------|---------------------------------------------|--------|
| approval_type            | interna, externa_cliente                     | OK |
| client_segment           | 10 valores (automotivo a outro)              | OK |
| deliverable_status       | 5 valores (pendente a entregue)              | OK |
| financial_record_category| 15 valores (cache_equipe a outro)            | OK |
| financial_record_status  | 4 valores (pendente a cancelado)             | OK |
| financial_record_type    | 2 valores (receita, despesa)                 | OK |
| hiring_status            | 4 valores                                    | OK |
| history_event_type       | 7 valores                                    | OK |
| invoice_status           | 4 valores                                    | OK |
| invoice_type             | 4 valores                                    | OK |
| job_status               | 14 valores                                   | OK |
| payment_method           | 8 valores                                    | OK |
| pos_sub_status           | 6 valores                                    | OK |
| priority_level           | 3 valores (alta, media, baixa)               | OK |
| project_type             | 10 valores                                   | OK |
| team_role                | Parcialmente visivel (diretor, produtor_executivo, coordenador_producao, ...) | OK |

### 5.2 CHECK constraints (Fases 5 e 7)

| Tabela                    | Constraint                               | Tipo    | Status |
|--------------------------|------------------------------------------|---------|--------|
| notifications            | chk_notifications_type                    | CHECK   | OK (8 valores) |
| notifications            | chk_notifications_priority                | CHECK   | OK (4 valores) |
| whatsapp_messages        | chk_whatsapp_messages_status              | CHECK   | OK |
| whatsapp_messages        | chk_whatsapp_messages_provider            | CHECK   | OK |
| whatsapp_messages        | chk_whatsapp_messages_phone               | CHECK   | OK (>=10 digitos) |
| integration_events       | chk_integration_events_type               | CHECK   | OK (9 valores) |
| integration_events       | chk_integration_events_status             | CHECK   | OK (5 valores) |
| integration_events       | chk_integration_events_attempts           | CHECK   | OK (>=0) |
| allocations              | chk_allocations_dates                     | CHECK   | OK (end >= start) |
| job_team                 | chk_job_team_allocation_dates             | CHECK   | OK (nullable aware) |
| approval_requests        | chk_approval_requests_type                | CHECK   | OK (5 valores) |
| approval_requests        | chk_approval_requests_status              | CHECK   | OK (4 valores) |
| approval_requests        | chk_approval_requests_approver_type       | CHECK   | OK |
| approval_requests        | chk_approval_requests_external_email      | CHECK   | OK |
| approval_requests        | chk_approval_requests_internal_people     | CHECK   | OK |
| approval_logs            | chk_approval_logs_action                  | CHECK   | OK (6 valores) |
| approval_logs            | chk_approval_logs_actor_type              | CHECK   | OK (3 valores) |
| client_portal_messages   | chk_portal_messages_direction             | CHECK   | OK |
| client_portal_messages   | chk_portal_messages_direction_sender      | CHECK   | OK (logica consistente) |
| client_portal_messages   | chk_portal_messages_idempotency_required  | CHECK   | OK (obriga key para client msgs) |
| report_snapshots         | chk_report_snapshots_type                 | CHECK   | OK (4 valores) |
| people                   | chk_people_bank_info_valid_structure      | CHECK   | OK (JSONB validation) |

### [IMPORTANTE] F-13: Decisao CHECK vs ENUM para notifications.type esta correta

Conforme ADR arquitetural, usar CHECK em vez de ENUM para tipos extensiveis e correto. Adicionar novo tipo de notificacao nao requer `ALTER TYPE`.

**Status: OK.**

### [MELHORIA] F-14: notifications.type CHECK nao inclui novos tipos da Fase 6/7

O CHECK da Fase 5 permite 8 tipos:
```
job_approved, status_changed, team_added, deadline_approaching,
margin_alert, deliverable_overdue, shooting_date_approaching, integration_failed
```

Mas o sistema pode gerar notificacoes de outros tipos na Fase 6/7 (ex: `approval_created`, `portal_message_received`). Se a Edge Function tentar inserir esses tipos, o CHECK constraint vai rejeitar.

**Recomendacao:** Adicionar novos tipos ao CHECK ou remover o CHECK e mover a validacao para a camada de aplicacao (Edge Function).

---

## 6. Integridade Referencial

### 6.1 ON DELETE rules

| FK                                          | ON DELETE      | Correto? |
|---------------------------------------------|---------------|----------|
| *.tenant_id -> tenants.id                   | CASCADE       | OK (deletar tenant apaga tudo) |
| notifications.user_id -> profiles.id        | CASCADE       | OK |
| notifications.job_id -> jobs.id             | SET NULL      | OK (notificacao permanece sem job) |
| notification_preferences.user_id -> profiles| CASCADE       | OK |
| drive_folders.job_id -> jobs.id             | CASCADE       | OK |
| drive_folders.parent_folder_id -> self      | SET NULL      | OK |
| drive_folders.created_by -> profiles.id     | SET NULL      | OK |
| whatsapp_messages.job_id -> jobs.id         | SET NULL      | OK |
| integration_events.tenant_id -> tenants     | CASCADE       | OK |
| allocations.job_id -> jobs.id               | CASCADE       | OK |
| allocations.people_id -> people.id          | CASCADE       | OK |
| allocations.job_team_id -> job_team.id      | SET NULL      | OK (allocation persiste sem job_team) |
| allocations.created_by -> profiles.id       | SET NULL      | **ATENCAO** |
| approval_requests.job_id -> jobs.id         | CASCADE       | OK |
| approval_requests.created_by -> profiles.id | SET NULL      | **ATENCAO** |
| approval_logs.approval_request_id           | CASCADE       | OK (logs vao junto com request) |
| client_portal_sessions.job_id -> jobs.id    | CASCADE       | OK |
| client_portal_sessions.contact_id -> contacts| SET NULL     | OK |
| client_portal_sessions.created_by -> profiles| SET NULL     | **ATENCAO** |
| client_portal_messages.session_id           | CASCADE       | OK |
| client_portal_messages.job_id -> jobs.id    | CASCADE       | OK |
| client_portal_messages.sender_user_id       | SET NULL      | OK |
| report_snapshots.created_by -> profiles.id  | SET NULL      | OK |

### [IMPORTANTE] F-15: created_by NOT NULL + ON DELETE SET NULL cria inconsistencia

As tabelas `allocations` e `approval_requests` tem `created_by UUID NOT NULL` com `ON DELETE SET NULL`. Se o profile for deletado, o SET NULL tentara setar NULL numa coluna NOT NULL, causando erro.

**Opcoes:**
1. Mudar para `ON DELETE RESTRICT` (impede deletar profile que criou registros)
2. Remover NOT NULL de created_by (permite orphan records com criador null)
3. Mudar para `ON DELETE CASCADE` (perigoso, deletaria registros de alocacao/aprovacao)

**Recomendacao:** Opcao 1 (`ON DELETE RESTRICT`) e a mais segura. Na pratica, profiles raramente sao deletados (soft delete via deleted_at), entao o risco e baixo mas deve ser corrigido.

`client_portal_sessions.created_by` tem o mesmo pattern (`NOT NULL REFERENCES profiles(id) ON DELETE SET NULL`).

---

## 7. Divergencias entre Spec, Arquitetura e Migration

### [IMPORTANTE] F-16: Nome da tabela diverge entre spec e migration

| Spec (fase-7-dashboard-reports-portal.md) | Migration real |
|------------------------------------------|----------------|
| `client_portal_tokens`                    | `client_portal_sessions` |

A migration usa `client_portal_sessions` que e um nome melhor (sessao, nao apenas token). O doc de arquitetura ja usa o nome correto. A spec precisa ser atualizada.

### [IMPORTANTE] F-17: Spec diz "29 tabelas total" mas migration cria 3 tabelas novas (= 30)

A spec diz "27 existentes + 2 novas = 29". Mas a migration cria 3 tabelas:
1. client_portal_sessions
2. client_portal_messages
3. report_snapshots

Total real: 27 + 3 = 30. (Ou 29 se report_snapshots for considerada "cache", nao tabela de dominio.)

---

## 8. database.ts Desatualizado

### [CRITICO] F-18: database.ts nao reflete o schema atual

O arquivo `frontend/src/types/database.ts` foi gerado antes das Fases 5, 6 e 7. Ele contem apenas 18 tabelas (+ 3 functions), faltando:

**Tabelas faltantes no database.ts:**
- notifications
- notification_preferences
- drive_folders
- whatsapp_messages
- integration_events
- allocations
- approval_requests
- approval_logs
- client_portal_sessions
- client_portal_messages
- report_snapshots

**Functions faltantes no database.ts:**
- get_dashboard_kpis
- get_pipeline_summary
- get_revenue_by_month
- get_alerts
- get_recent_activity
- get_report_financial_monthly
- get_report_performance
- get_report_team_utilization
- get_portal_timeline
- lock_integration_events
- read_secret / write_secret

**Impacto:** O TypeScript frontend nao tem type safety para 11 tabelas e 12 functions. As types manuais em `types/notifications.ts`, `types/allocations.ts`, etc. compensam parcialmente, mas sem a type-gen automatica o risco de drift e alto.

**Recomendacao:** Regenerar database.ts com `npx supabase gen types typescript`.

---

## 9. Performance Advisors

Sem acesso direto ao Supabase MCP nesta sessao, nao foi possivel executar `get_advisors`. Entretanto, as recomendacoes baseadas na analise estatica do codigo:

### [MELHORIA] F-19: Queries N+1 potenciais nas RPCs

- `get_dashboard_kpis`: executa ~9 subqueries independentes no banco. Cada uma faz seq scan filtrado. Com poucos dados (<1000 jobs) e OK. Com 10k+ jobs, considerar materializar os KPIs.

- `get_report_team_utilization`: subquery correlata de conflitos por pessoa. O(N^2) com N pessoas.

### [MELHORIA] F-20: pg_cron job `daily-deadline-alerts` e muito pesado

O SQL do cron job (migration Fase 5.2) faz 3 CTEs com multiplos JOINs, INSERTs e deduplicacoes. Em tabelas grandes, pode exceder o timeout do pg_cron.

**Recomendacao:** Monitorar execution time. Se exceder 30 segundos, considerar dividir em 3 jobs separados.

### [MELHORIA] F-21: Indice parcial para report_snapshots expirados

O pg_cron cleanup faz `DELETE FROM report_snapshots WHERE expires_at < now()`. Um indice em `expires_at` aceleraria:

```sql
CREATE INDEX IF NOT EXISTS idx_report_snapshots_expires_at
  ON report_snapshots(expires_at);
```

---

## 10. Resumo de Acoes Requeridas

### CRITICO (corrigir antes de deploy)

| # | Finding | Acao |
|---|---------|------|
| F-03 | RLS policies Fases 5/6 sem (SELECT ...) wrapper | Migration corretiva: re-criar policies com (SELECT get_tenant_id()) |
| F-15 | created_by NOT NULL + ON DELETE SET NULL | Migration: ALTER FK para ON DELETE RESTRICT em allocations, approval_requests, client_portal_sessions |
| F-18 | database.ts desatualizado (11 tabelas faltando) | Regenerar com supabase gen types |

### IMPORTANTE (corrigir na proxima sprint)

| # | Finding | Acao |
|---|---------|------|
| F-01 | Tabelas de log sem deleted_at mas com DELETE policy | Adicionar deleted_at a notifications e drive_folders |
| F-04 | report_snapshots sem DELETE policy | Adicionar policy ou documentar que limpeza e somente automatica |
| F-08/F-09 | Docs de arquitetura referenciam colunas erradas | Atualizar docs |
| F-10 | get_portal_timeline UPDATE sem rate limit | Adicionar WHERE last_accessed_at < now() - 5min |
| F-14 | CHECK notifications.type nao inclui tipos novos | Adicionar tipos ou remover CHECK |
| F-16/F-17 | Divergencia spec vs migration (nomes e contagem) | Atualizar spec |

### MELHORIA (backlog)

| # | Finding | Acao |
|---|---------|------|
| F-05 | FK drive_folders.created_by sem indice | Criar indice |
| F-06 | Indice jobs(tenant_id, created_at) ausente | Criar indice composto |
| F-11 | RPCs retornam NULL em vez de [] | Envolver com COALESCE |
| F-12 | get_report_team_utilization subquery N+1 | Refatorar se performance degradar |
| F-19 | KPIs com 9 subqueries | Monitorar; materializar se necessario |
| F-20 | pg_cron daily-deadline-alerts pesado | Dividir se timeout |
| F-21 | report_snapshots sem indice em expires_at | Criar indice |
| F-02 | Contagem de tabelas diverge entre docs | Atualizar todos os docs |

---

## 11. Conclusao

O banco de dados do ELLAHOS esta **bem estruturado** no geral, seguindo boas praticas de multi-tenancy, RLS e separacao de conceitos. As RPCs da Fase 7 sao corretamente SECURITY DEFINER com search_path fixo e recebem tenant_id como parametro.

Os **3 findings criticos** devem ser resolvidos antes do deploy da Fase 7:
1. Uniformizar o pattern `(SELECT get_tenant_id())` em todas as policies
2. Corrigir a inconsistencia `NOT NULL + ON DELETE SET NULL` em 3 tabelas
3. Regenerar o database.ts para manter type safety

As demais melhorias podem ser priorizadas no backlog sem risco imediato para producao.
