-- ============================================================
-- Migration: Audit Trail Admin
-- ADR-030: Trigger generico em tabelas principais
-- Tabela append-only para rastrear "quem fez o que, quando"
-- ============================================================

-- 1. Tabela audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],  -- lista de campos alterados (so UPDATE)
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nota: usamos BIGINT identity em vez de UUID para performance em tabela de alto volume
-- Nota: record_id e UUID nullable para cobrir DELETE onde o registro ja nao existe
-- Nota: tenant_id sem FK para evitar problemas se tenant for deletado (o log persiste)

COMMENT ON TABLE audit_log IS 'Audit trail append-only: rastreia INSERT/UPDATE/DELETE nas tabelas principais';
COMMENT ON COLUMN audit_log.changed_fields IS 'Lista de campos alterados (apenas para UPDATE)';

-- 2. Indices para consultas da tela admin
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created
  ON audit_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_name
  ON audit_log (tenant_id, table_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON audit_log (tenant_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_record_id
  ON audit_log (tenant_id, record_id)
  WHERE record_id IS NOT NULL;

-- 3. RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Somente leitura para usuarios do tenant (admin/ceo filtrado no frontend/EF)
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (tenant_id = (
    SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID
  ));

-- Insert via trigger (service_role) — nao precisa de policy INSERT para usuarios
-- Nenhuma policy UPDATE ou DELETE — tabela append-only

-- 4. Funcao trigger generico
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_record_id UUID;
  v_user_id UUID;
  v_old JSONB;
  v_new JSONB;
  v_changed TEXT[];
  v_key TEXT;
BEGIN
  -- Extrair tenant_id do NEW ou OLD (dependendo da operacao)
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_tenant_id := (v_old ->> 'tenant_id')::UUID;
    v_record_id := (v_old ->> 'id')::UUID;
  ELSE
    v_new := to_jsonb(NEW);
    v_tenant_id := (v_new ->> 'tenant_id')::UUID;
    v_record_id := (v_new ->> 'id')::UUID;
  END IF;

  -- Se nao tem tenant_id, nao auditar (tabela sem multi-tenant — nao deveria acontecer)
  IF v_tenant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Tentar extrair user_id da sessao (auth.uid())
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;  -- CRON/service_role sem sessao
  END;

  -- Para UPDATE, identificar quais campos mudaram
  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_changed := ARRAY[]::TEXT[];
    FOR v_key IN SELECT jsonb_object_keys(v_new)
    LOOP
      -- Ignorar campos de metadata que mudam sempre
      IF v_key IN ('updated_at', 'health_score') THEN
        CONTINUE;
      END IF;
      -- Comparar valores (JSONB comparacao nativa)
      IF (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
        v_changed := v_changed || v_key;
      END IF;
    END LOOP;
    -- Se nenhum campo relevante mudou, nao logar
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Inserir no audit_log
  INSERT INTO audit_log (tenant_id, table_name, record_id, action, user_id, old_data, new_data, changed_fields)
  VALUES (
    v_tenant_id,
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_user_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN v_changed ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Aplicar trigger nas 17 tabelas principais
-- Usando AFTER para nao bloquear a operacao

DO $$
DECLARE
  tbl TEXT;
  trigger_name TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'tenants',
      'profiles',
      'clients',
      'agencies',
      'contacts',
      'people',
      'jobs',
      'job_team',
      'job_deliverables',
      'job_budgets',
      'financial_records',
      'cost_items',
      'job_receivables',
      'opportunities',
      'job_files',
      'tenant_invitations',
      'payment_approval_rules'
    ])
  LOOP
    trigger_name := 'audit_log_' || tbl;
    -- Remover se existir (idempotencia)
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, tbl);
    -- Criar trigger AFTER INSERT/UPDATE/DELETE
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_audit_log()',
      trigger_name,
      tbl
    );
  END LOOP;
END;
$$;

-- 6. Comentarios para documentacao
COMMENT ON FUNCTION fn_audit_log() IS 'Trigger generico de audit trail — captura INSERT/UPDATE/DELETE com OLD/NEW como JSONB';
