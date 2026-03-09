-- =============================================================================
-- Migration: Multi-tenant signup trigger
-- Data: 2026-03-09
--
-- Contexto:
--   Cria funcao e trigger em auth.users para automatizar a criacao de tenant +
--   profile quando um novo usuario faz signup com company_name nos metadados.
--   Usuarios convidados (sem company_name) nao sao afetados.
--
-- Operacoes:
--   1. Garantir colunas company_name e onboarding_completed em tenants
--   2. CREATE FUNCTION handle_new_user() — SECURITY DEFINER
--   3. CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
--
-- Idempotencia:
--   - ALTER TABLE ... IF NOT EXISTS para colunas
--   - CREATE OR REPLACE FUNCTION
--   - DROP TRIGGER IF EXISTS antes de CREATE TRIGGER
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- 0. Garantir que as colunas necessarias existem em tenants
--    (podem ter sido criadas via dashboard ou migration remota)
-- =============================================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
-- 1. Funcao SECURITY DEFINER para bypass de RLS durante criacao automatica
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
  v_full_name TEXT;
  v_tenant_id UUID;
  v_slug TEXT;
BEGIN
  -- Extrair metadados do signup
  v_company_name := NEW.raw_user_meta_data->>'company_name';
  v_full_name := NEW.raw_user_meta_data->>'full_name';

  -- Se nao tem company_name, e um usuario convidado ou manual — nao criar tenant
  IF v_company_name IS NULL OR v_company_name = '' THEN
    RETURN NEW;
  END IF;

  -- Gerar slug unico a partir do nome da empresa
  -- Remove caracteres especiais, converte para minusculo, substitui espacos por hifens
  v_slug := lower(regexp_replace(v_company_name, '[^a-zA-Z0-9]', '-', 'g'));
  -- Remover hifens duplicados e trailing
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(BOTH '-' FROM v_slug);
  -- Adicionar hash curto para garantir unicidade
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Criar tenant
  INSERT INTO public.tenants (name, slug, company_name, onboarding_completed, settings)
  VALUES (
    v_company_name,
    v_slug,
    v_company_name,
    false,
    '{"onboarding_completed": false}'::jsonb
  )
  RETURNING id INTO v_tenant_id;

  -- Criar profile com role admin (dono da empresa)
  INSERT INTO public.profiles (id, tenant_id, email, full_name, role)
  VALUES (
    NEW.id,
    v_tenant_id,
    COALESCE(NEW.email, ''),
    COALESCE(v_full_name, split_part(COALESCE(NEW.email, ''), '@', 1)),
    'admin'::user_role
  );

  -- Setar tenant_id e role no app_metadata do usuario para que o JWT inclua
  -- Isso e necessario para que get_tenant_id() funcione no proximo login
  -- Nota: raw_app_meta_data e o campo interno que o Supabase usa para app_metadata
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('tenant_id', v_tenant_id::text, 'role', 'admin')
  WHERE id = NEW.id;

  RAISE LOG '[handle_new_user] Tenant "%" e profile criados para usuario % (tenant: %)',
    v_company_name, NEW.id, v_tenant_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function: cria tenant + profile automaticamente quando um novo usuario faz signup com company_name nos metadados. SECURITY DEFINER para bypass de RLS.';

-- =============================================================================
-- 2. Trigger: disparar apos INSERT em auth.users
--    Idempotente: DROP IF EXISTS antes de criar
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'Dispara apos criacao de usuario no Supabase Auth. Cria tenant + profile se company_name estiver nos metadados.';
