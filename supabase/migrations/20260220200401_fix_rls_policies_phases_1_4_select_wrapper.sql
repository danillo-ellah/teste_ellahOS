
-- Migration corretiva: Uniformizar (SELECT get_tenant_id()) em policies Fases 1/4
SET search_path = public, extensions;

-- ---- TENANTS ----
DROP POLICY IF EXISTS "Users see own tenant" ON tenants;
CREATE POLICY "Users see own tenant" ON tenants FOR SELECT TO public
  USING (id = (SELECT get_tenant_id()));

-- ---- PROFILES ----
DROP POLICY IF EXISTS "Users see profiles in own tenant" ON profiles;
CREATE POLICY "Users see profiles in own tenant" ON profiles FOR SELECT TO public
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "Admins manage profiles" ON profiles;
CREATE POLICY "Admins manage profiles" ON profiles FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()) AND (id = (SELECT auth.uid()) OR (SELECT get_user_role()) = ANY(ARRAY['admin','ceo'])));

-- ---- JOBS ----
DROP POLICY IF EXISTS "Tenant isolation" ON jobs;
CREATE POLICY "Tenant isolation" ON jobs FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- CLIENTS ----
DROP POLICY IF EXISTS "Tenant isolation" ON clients;
CREATE POLICY "Tenant isolation" ON clients FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- AGENCIES ----
DROP POLICY IF EXISTS "Tenant isolation" ON agencies;
CREATE POLICY "Tenant isolation" ON agencies FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- CONTACTS ----
DROP POLICY IF EXISTS "Tenant isolation" ON contacts;
CREATE POLICY "Tenant isolation" ON contacts FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- PEOPLE ----
DROP POLICY IF EXISTS "Tenant isolation" ON people;
CREATE POLICY "Tenant isolation" ON people FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- JOB_TEAM ----
DROP POLICY IF EXISTS "Tenant isolation" ON job_team;
CREATE POLICY "Tenant isolation" ON job_team FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- JOB_DELIVERABLES ----
DROP POLICY IF EXISTS "Tenant isolation" ON job_deliverables;
CREATE POLICY "Tenant isolation" ON job_deliverables FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- JOB_SHOOTING_DATES ----
DROP POLICY IF EXISTS "Tenant isolation" ON job_shooting_dates;
CREATE POLICY "Tenant isolation" ON job_shooting_dates FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- JOB_HISTORY ----
DROP POLICY IF EXISTS "Tenant isolation" ON job_history;
CREATE POLICY "Tenant isolation" ON job_history FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- JOB_BUDGETS ----
DROP POLICY IF EXISTS "Tenant isolation" ON job_budgets;
CREATE POLICY "Tenant isolation" ON job_budgets FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- JOB_FILES ----
DROP POLICY IF EXISTS "Tenant isolation" ON job_files;
CREATE POLICY "Tenant isolation" ON job_files FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- JOB_CODE_SEQUENCES ----
DROP POLICY IF EXISTS "Tenant isolation" ON job_code_sequences;
CREATE POLICY "Tenant isolation" ON job_code_sequences FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- FINANCIAL_RECORDS ----
DROP POLICY IF EXISTS financial_records_tenant_isolation ON financial_records;
CREATE POLICY financial_records_tenant_isolation ON financial_records FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- BUDGET_ITEMS ----
DROP POLICY IF EXISTS budget_items_tenant_isolation ON budget_items;
CREATE POLICY budget_items_tenant_isolation ON budget_items FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- INVOICES ----
DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
CREATE POLICY invoices_tenant_isolation ON invoices FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- PAYMENT_HISTORY ----
DROP POLICY IF EXISTS payment_history_tenant_isolation ON payment_history;
CREATE POLICY payment_history_tenant_isolation ON payment_history FOR ALL TO public
  USING (tenant_id = (SELECT get_tenant_id()));
