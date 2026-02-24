
-- Fix get_financial_summary: usar auth.jwt() -> 'app_metadata' (mesmo que get_tenant_id())
-- ao inves de current_setting('request.jwt.claims') que nao tem tenant_id no top-level
CREATE OR REPLACE FUNCTION public.get_financial_summary(p_job_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_result jsonb;
BEGIN
  -- Usar mesma abordagem de get_tenant_id(): ler de app_metadata
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id not found in JWT app_metadata';
  END IF;

  SELECT jsonb_build_object(
    'total_receitas', COALESCE(SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0),
    'total_despesas', COALESCE(SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0),
    'saldo', COALESCE(SUM(CASE WHEN type = 'receita' THEN amount ELSE -amount END), 0),
    'count', COUNT(*)
  )
  INTO v_result
  FROM financial_records
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND status != 'cancelado'
    AND (p_job_id IS NULL OR job_id = p_job_id);

  RETURN v_result;
END;
$function$;
