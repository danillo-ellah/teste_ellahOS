-- Corrigir policy "Admins manage profiles" que ainda faz subquery na propria tabela profiles
-- causando recursao infinita. Lemos o role direto do JWT app_metadata.

-- Funcao helper para ler role do JWT (evita consultar profiles)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'freelancer');
$$;

-- Dropar policy antiga com recursao
DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;

-- Recriar sem subquery em profiles: admins/ceos podem gerenciar todos do tenant
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL
  USING (
    tenant_id = public.get_tenant_id()
    AND (
      id = auth.uid()
      OR public.get_user_role() IN ('admin', 'ceo')
    )
  );