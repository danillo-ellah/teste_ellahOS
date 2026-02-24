
-- RPC para agregacao financeira server-side (evita trazer todos registros para o client)
CREATE OR REPLACE FUNCTION public.get_financial_summary(p_job_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_result jsonb;
BEGIN
  -- Pegar tenant do JWT
  v_tenant_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id not found in JWT';
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
$$;
