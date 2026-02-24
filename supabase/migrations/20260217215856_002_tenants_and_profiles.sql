-- ============================================================
-- Migration 002: Tenants e Profiles
-- Fase 1 - Schema Base
-- ============================================================

-- ============================================================
-- Helper functions para RLS
-- ============================================================

-- Funcao para extrair tenant_id do JWT (evita recursao em RLS)
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_tenant_id() IS 'Extrai tenant_id do JWT. SECURITY DEFINER para evitar recursao em RLS policies.';

-- Funcao para extrair role do usuario (evita query em profiles)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'member'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_user_role() IS 'Extrai role do JWT. SECURITY DEFINER para evitar query em profiles dentro de RLS.';

-- Funcao generica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- Tabela: tenants (produtoras)
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  custom_statuses JSONB,
  custom_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON COLUMN tenants.slug IS 'Identificador unico para URL (ex: ellah-filmes)';
COMMENT ON COLUMN tenants.settings IS 'Configuracoes gerais do tenant (integracoes, preferencias)';
COMMENT ON COLUMN tenants.custom_statuses IS 'Status customizados por produtora';
COMMENT ON COLUMN tenants.custom_fields IS 'Campos customizados por produtora';

-- Trigger updated_at
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Tabela: profiles (usuarios do sistema, FK para auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'coordenador',
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

COMMENT ON COLUMN profiles.id IS 'Mesmo UUID do auth.users (1:1)';
COMMENT ON COLUMN profiles.role IS 'Papel RBAC: admin, ceo, produtor_executivo, coordenador, diretor, financeiro, atendimento, comercial, freelancer';

-- Trigger updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: tenants
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

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
-- RLS: profiles
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_tenant ON profiles
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
