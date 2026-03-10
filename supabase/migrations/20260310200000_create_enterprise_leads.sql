-- =============================================
-- Onda Enterprise: Leads da pagina Enterprise
-- Pre-tenant — sem tenant_id (leads antes do cadastro)
-- =============================================

CREATE TABLE IF NOT EXISTS public.enterprise_leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL,
  company       text NOT NULL,
  phone         text,
  message       text,
  source        text NOT NULL DEFAULT 'enterprise_page',
  ip_address    inet,
  user_agent    text,
  status        text NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'discarded')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Indice para busca por status
CREATE INDEX IF NOT EXISTS idx_enterprise_leads_status
  ON public.enterprise_leads (status);

-- Indice para rate limiting: IP + created_at
CREATE INDEX IF NOT EXISTS idx_enterprise_leads_ip_created
  ON public.enterprise_leads (ip_address, created_at DESC);

-- Trigger updated_at
CREATE TRIGGER set_enterprise_leads_updated_at
  BEFORE UPDATE ON public.enterprise_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS habilitado mas sem policies — acesso exclusivo via service_role na EF
ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.enterprise_leads IS
  'Leads de contato da pagina Enterprise. Pre-cadastro, sem tenant_id.';
