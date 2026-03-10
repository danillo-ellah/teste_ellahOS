-- Migration: cria tabela import_logs para rastrear historico de importacoes em massa
-- Cada registro representa uma operacao de importacao (clients, contacts ou jobs)

CREATE TABLE IF NOT EXISTS public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('clients', 'contacts', 'jobs')),
  file_name text,
  total_rows integer NOT NULL DEFAULT 0,
  inserted_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Isolamento por tenant: usuario so ve seus proprios logs
CREATE POLICY "import_logs_tenant_isolation" ON public.import_logs
  FOR ALL USING (
    tenant_id = (SELECT (auth.jwt()->'app_metadata'->>'tenant_id')::uuid)
  );

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_import_logs_tenant
  ON public.import_logs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_import_logs_idempotency
  ON public.import_logs(tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
