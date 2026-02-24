-- ============================================================
-- Migration 007b: Fix security policies (cross-tenant)
-- Otimizar todas as policies para prevenir vazamento cross-tenant
-- Fase 1 - Fix pos-auditoria de seguranca
-- ============================================================
-- NOTA: este arquivo tem timestamp 222216 mas nome 007_ para
-- manter compatibilidade com a ordem de execucao original.
-- O Supabase executa migrations pela COLUNA version na tabela
-- schema_migrations, nao pelo nome do arquivo.
-- ============================================================

-- ============================================================
-- 1. Verificar que TODAS as policies usam (SELECT get_tenant_id())
-- e nao get_tenant_id() diretamente (evita re-eval por row)
-- ============================================================

-- Recriar policies de tenants para usar pattern correto
DROP POLICY IF EXISTS tenants_select_own ON tenants;
DROP POLICY IF EXISTS tenants_insert_admin ON tenants;
DROP POLICY IF EXISTS tenants_update_own ON tenants;
DROP POLICY IF EXISTS tenant_isolation ON tenants;

CREATE POLICY tenants_select_own ON tenants
  FOR SELECT TO authenticated
  USING (id = (SELECT get_tenant_id()));

CREATE POLICY tenants_insert_admin ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY tenants_update_own ON tenants
  FOR UPDATE TO authenticated
  USING (id = (SELECT get_tenant_id()))
  WITH CHECK (id = (SELECT get_tenant_id()));

-- ============================================================
-- 2. Garantir que INSERT policies validam tenant_id
-- Previne que usuario insira dados em outro tenant
-- ============================================================

-- clients INSERT deve validar
DROP POLICY IF EXISTS clients_insert_tenant ON clients;
CREATE POLICY clients_insert_tenant ON clients
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- agencies INSERT deve validar
DROP POLICY IF EXISTS agencies_insert_tenant ON agencies;
CREATE POLICY agencies_insert_tenant ON agencies
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- contacts INSERT deve validar
DROP POLICY IF EXISTS contacts_insert_tenant ON contacts;
CREATE POLICY contacts_insert_tenant ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- people INSERT deve validar
DROP POLICY IF EXISTS people_insert_tenant ON people;
CREATE POLICY people_insert_tenant ON people
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- jobs INSERT deve validar
DROP POLICY IF EXISTS jobs_insert_tenant ON jobs;
CREATE POLICY jobs_insert_tenant ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- job_team INSERT deve validar
DROP POLICY IF EXISTS job_team_insert_tenant ON job_team;
CREATE POLICY job_team_insert_tenant ON job_team
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- job_deliverables INSERT deve validar
DROP POLICY IF EXISTS job_deliverables_insert_tenant ON job_deliverables;
CREATE POLICY job_deliverables_insert_tenant ON job_deliverables
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- job_history INSERT deve validar
DROP POLICY IF EXISTS job_history_insert_tenant ON job_history;
CREATE POLICY job_history_insert_tenant ON job_history
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- job_budgets INSERT deve validar
DROP POLICY IF EXISTS job_budgets_insert_tenant ON job_budgets;
CREATE POLICY job_budgets_insert_tenant ON job_budgets
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- job_files INSERT deve validar
DROP POLICY IF EXISTS job_files_insert_tenant ON job_files;
CREATE POLICY job_files_insert_tenant ON job_files
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- job_shooting_dates INSERT deve validar
DROP POLICY IF EXISTS job_shooting_dates_insert_tenant ON job_shooting_dates;
CREATE POLICY job_shooting_dates_insert_tenant ON job_shooting_dates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- job_code_sequences INSERT deve validar
DROP POLICY IF EXISTS job_code_sequences_insert_tenant ON job_code_sequences;
CREATE POLICY job_code_sequences_insert_tenant ON job_code_sequences
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
