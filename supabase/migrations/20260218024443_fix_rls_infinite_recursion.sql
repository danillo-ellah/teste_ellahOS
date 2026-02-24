
-- Migration 013: Corrigir recursao infinita nas RLS policies
-- Problema: policies consultam profiles -> profiles tem policy que consulta profiles -> recursao
-- Solucao: extrair tenant_id direto do JWT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')

-- Helper function para extrair tenant_id do JWT de forma segura
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;

-- === PROFILES ===
DROP POLICY IF EXISTS "Users see profiles in own tenant" ON profiles;
CREATE POLICY "Users see profiles in own tenant" ON profiles
  FOR SELECT USING (tenant_id = public.get_tenant_id());

DROP POLICY IF EXISTS "Admins manage profiles" ON profiles;
CREATE POLICY "Admins manage profiles" ON profiles
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND (
      id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'ceo')
        AND p.tenant_id = public.get_tenant_id()
      )
    )
  );

-- A policy "Users update own profile" esta OK (usa id = auth.uid())

-- === TENANTS ===
DROP POLICY IF EXISTS "Users see own tenant" ON tenants;
CREATE POLICY "Users see own tenant" ON tenants
  FOR SELECT USING (id = public.get_tenant_id());

-- === Tabelas com padrao tenant_id ===
-- jobs
DROP POLICY IF EXISTS "Tenant isolation" ON jobs;
CREATE POLICY "Tenant isolation" ON jobs
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- clients
DROP POLICY IF EXISTS "Tenant isolation" ON clients;
CREATE POLICY "Tenant isolation" ON clients
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- agencies
DROP POLICY IF EXISTS "Tenant isolation" ON agencies;
CREATE POLICY "Tenant isolation" ON agencies
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- contacts
DROP POLICY IF EXISTS "Tenant isolation" ON contacts;
CREATE POLICY "Tenant isolation" ON contacts
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- people
DROP POLICY IF EXISTS "Tenant isolation" ON people;
CREATE POLICY "Tenant isolation" ON people
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- job_team
DROP POLICY IF EXISTS "Tenant isolation" ON job_team;
CREATE POLICY "Tenant isolation" ON job_team
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- job_deliverables
DROP POLICY IF EXISTS "Tenant isolation" ON job_deliverables;
CREATE POLICY "Tenant isolation" ON job_deliverables
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- job_shooting_dates
DROP POLICY IF EXISTS "Tenant isolation" ON job_shooting_dates;
CREATE POLICY "Tenant isolation" ON job_shooting_dates
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- job_history
DROP POLICY IF EXISTS "Tenant isolation" ON job_history;
CREATE POLICY "Tenant isolation" ON job_history
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- job_budgets
DROP POLICY IF EXISTS "Tenant isolation" ON job_budgets;
CREATE POLICY "Tenant isolation" ON job_budgets
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- job_files
DROP POLICY IF EXISTS "Tenant isolation" ON job_files;
CREATE POLICY "Tenant isolation" ON job_files
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- job_code_sequences
DROP POLICY IF EXISTS "Tenant isolation" ON job_code_sequences;
CREATE POLICY "Tenant isolation" ON job_code_sequences
  FOR ALL USING (tenant_id = public.get_tenant_id());
