-- =============================================================================
-- Migration: Adicionar onboarding_completed = false no app_metadata do trigger
-- Quando: 2026-03-10
-- Motivo: O middleware precisa saber se o usuario completou o onboarding
--         para redirecionar automaticamente para /onboarding
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_company_name text;
  v_full_name text;
  v_tenant_id uuid;
  v_slug text;
BEGIN
  -- Extrair dados do user_metadata (enviados no signUp)
  v_company_name := left(trim(COALESCE(
    NEW.raw_user_meta_data ->> 'company_name',
    ''
  )), 100);

  v_full_name := trim(COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    ''
  ));

  -- Se nao tem company_name, nao criar tenant (ex: login social sem metadata)
  IF v_company_name = '' THEN
    RAISE LOG '[handle_new_user] Sem company_name no metadata, pulando criacao de tenant para user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Gerar slug unico a partir do nome + hash do UUID
  v_slug := lower(regexp_replace(v_company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  IF v_slug = '' THEN
    v_slug := 'org';
  END IF;
  -- Adicionar hash curto para unicidade
  v_slug := v_slug || '-' || left(md5(gen_random_uuid()::text), 6);

  -- Criar tenant
  INSERT INTO public.tenants (id, name, slug, onboarding_completed)
  VALUES (gen_random_uuid(), v_company_name, v_slug, false)
  RETURNING id INTO v_tenant_id;

  -- Criar profile do usuario como admin do novo tenant
  INSERT INTO public.profiles (id, tenant_id, email, full_name, role)
  VALUES (
    NEW.id,
    v_tenant_id,
    COALESCE(NEW.email, ''),
    COALESCE(v_full_name, split_part(COALESCE(NEW.email, ''), '@', 1)),
    'admin'::user_role
  );

  -- Setar tenant_id, role e onboarding_completed no app_metadata do usuario
  -- Isso e necessario para que get_tenant_id() funcione no proximo login
  -- e para que o middleware redirecione para /onboarding
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'tenant_id', v_tenant_id::text,
      'role', 'admin',
      'onboarding_completed', false
    )
  WHERE id = NEW.id;

  RAISE LOG '[handle_new_user] Tenant "%" e profile criados para usuario % (tenant: %)',
    v_company_name, NEW.id, v_tenant_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function: cria tenant + profile automaticamente quando um novo usuario faz signup com company_name nos metadados. SECURITY DEFINER para bypass de RLS. Seta onboarding_completed=false no app_metadata.';
