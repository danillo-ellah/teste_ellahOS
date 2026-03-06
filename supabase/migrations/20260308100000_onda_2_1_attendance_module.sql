-- =============================================
-- Onda 2.1: Modulo de Atendimento
-- 5 tabelas novas + 2 campos em jobs + notification types
-- Idempotente: IF NOT EXISTS em tudo
-- =============================================

-- =============================================
-- 1. client_communications
-- Registro de comunicacoes com o cliente
-- =============================================
CREATE TABLE IF NOT EXISTS public.client_communications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_type text NOT NULL
    CHECK (entry_type IN ('decisao','alteracao','informacao','aprovacao','satisfacao_automatica','outro')),
  channel text NOT NULL
    CHECK (channel IN ('whatsapp','email','reuniao','telefone','presencial','sistema')),
  description text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.client_communications IS 'Log de comunicacoes com o cliente por job (decisoes, alteracoes, informacoes)';
COMMENT ON COLUMN public.client_communications.entry_type IS 'Tipo do registro: decisao, alteracao, informacao, aprovacao, satisfacao_automatica, outro';
COMMENT ON COLUMN public.client_communications.channel IS 'Canal de comunicacao: whatsapp, email, reuniao, telefone, presencial, sistema';
COMMENT ON COLUMN public.client_communications.deleted_at IS 'Soft delete — preenchido no lugar de DELETE real';

CREATE INDEX IF NOT EXISTS idx_client_communications_tenant_job_date
  ON public.client_communications (tenant_id, job_id, entry_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_communications_tenant_job
  ON public.client_communications (tenant_id, job_id)
  WHERE deleted_at IS NULL;

-- FK indices (regra: indice em TODA foreign key)
CREATE INDEX IF NOT EXISTS idx_client_communications_tenant_id
  ON public.client_communications (tenant_id);

CREATE INDEX IF NOT EXISTS idx_client_communications_job_id
  ON public.client_communications (job_id);

CREATE INDEX IF NOT EXISTS idx_client_communications_created_by
  ON public.client_communications (created_by);

-- =============================================
-- 2. scope_items
-- Itens de escopo e extras de projeto
-- =============================================
CREATE TABLE IF NOT EXISTS public.scope_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  description text NOT NULL,
  is_extra boolean NOT NULL DEFAULT false,
  origin_channel text
    CHECK (origin_channel IS NULL OR origin_channel IN ('whatsapp','email','reuniao','telefone','presencial')),
  requested_at date,
  extra_status text
    CHECK (extra_status IS NULL OR extra_status IN ('pendente_ceo','aprovado_gratuito','cobrar_aditivo','recusado')),
  ceo_decision_by uuid REFERENCES public.profiles(id),
  ceo_decision_at timestamptz,
  ceo_notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  -- Quando is_extra=true, requested_at e obrigatorio
  CONSTRAINT chk_extra_requires_requested_at
    CHECK (NOT is_extra OR requested_at IS NOT NULL)
);

COMMENT ON TABLE public.scope_items IS 'Itens de escopo do job. Quando is_extra=true, requer decisao do CEO';
COMMENT ON COLUMN public.scope_items.is_extra IS 'Se true, item foi solicitado fora do escopo original e precisa aprovacao CEO';
COMMENT ON COLUMN public.scope_items.extra_status IS 'Status da decisao do CEO: pendente_ceo, aprovado_gratuito, cobrar_aditivo, recusado';
COMMENT ON COLUMN public.scope_items.origin_channel IS 'Canal pelo qual o extra foi solicitado (so para extras)';
COMMENT ON COLUMN public.scope_items.deleted_at IS 'Soft delete — preenchido no lugar de DELETE real';

CREATE INDEX IF NOT EXISTS idx_scope_items_tenant_job_extra
  ON public.scope_items (tenant_id, job_id, is_extra, extra_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_scope_items_pending_ceo
  ON public.scope_items (tenant_id, extra_status)
  WHERE is_extra = true AND extra_status = 'pendente_ceo' AND deleted_at IS NULL;

-- FK indices
CREATE INDEX IF NOT EXISTS idx_scope_items_tenant_id
  ON public.scope_items (tenant_id);

CREATE INDEX IF NOT EXISTS idx_scope_items_job_id
  ON public.scope_items (job_id);

CREATE INDEX IF NOT EXISTS idx_scope_items_created_by
  ON public.scope_items (created_by);

CREATE INDEX IF NOT EXISTS idx_scope_items_ceo_decision_by
  ON public.scope_items (ceo_decision_by)
  WHERE ceo_decision_by IS NOT NULL;

-- =============================================
-- 3. client_logistics
-- Itens de logistica do cliente (passagens, hospedagem, etc)
-- =============================================
CREATE TABLE IF NOT EXISTS public.client_logistics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  item_type text NOT NULL
    CHECK (item_type IN ('passagem_aerea','hospedagem','transfer','alimentacao','outro')),
  description text NOT NULL,
  scheduled_date date,
  responsible_name text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','confirmado','cancelado')),
  sent_to_client boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.client_logistics IS 'Itens de logistica do cliente por job (passagens, hospedagem, transfer)';
COMMENT ON COLUMN public.client_logistics.item_type IS 'Tipo: passagem_aerea, hospedagem, transfer, alimentacao, outro';
COMMENT ON COLUMN public.client_logistics.sent_to_client IS 'Flag indicando se o Atendimento ja repassou este item ao cliente';
COMMENT ON COLUMN public.client_logistics.deleted_at IS 'Soft delete — preenchido no lugar de DELETE real';

CREATE INDEX IF NOT EXISTS idx_client_logistics_tenant_job_status
  ON public.client_logistics (tenant_id, job_id, status, scheduled_date)
  WHERE deleted_at IS NULL;

-- FK indices
CREATE INDEX IF NOT EXISTS idx_client_logistics_tenant_id
  ON public.client_logistics (tenant_id);

CREATE INDEX IF NOT EXISTS idx_client_logistics_job_id
  ON public.client_logistics (job_id);

CREATE INDEX IF NOT EXISTS idx_client_logistics_created_by
  ON public.client_logistics (created_by);

-- =============================================
-- 4. job_internal_approvals (UNIQUE por job_id, sem soft delete)
-- Aprovacao interna do job antes de iniciar producao
-- =============================================
CREATE TABLE IF NOT EXISTS public.job_internal_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','aprovado')),
  scope_description text,
  team_description text,
  shooting_dates_confirmed boolean NOT NULL DEFAULT false,
  approved_budget numeric(15,2),
  deliverables_description text,
  notes text,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_internal_approval_job UNIQUE (job_id)
);

COMMENT ON TABLE public.job_internal_approvals IS 'Aprovacao interna do job (1 por job). Status rascunho → aprovado. Sem soft delete.';
COMMENT ON COLUMN public.job_internal_approvals.scope_description IS 'Descricao do escopo aprovado internamente';
COMMENT ON COLUMN public.job_internal_approvals.shooting_dates_confirmed IS 'Se as datas de filmagem foram confirmadas antes da aprovacao';
COMMENT ON COLUMN public.job_internal_approvals.approved_budget IS 'Orcamento aprovado internamente (em reais)';

-- FK indices
CREATE INDEX IF NOT EXISTS idx_job_internal_approvals_tenant_id
  ON public.job_internal_approvals (tenant_id);

CREATE INDEX IF NOT EXISTS idx_job_internal_approvals_job_id
  ON public.job_internal_approvals (job_id);

CREATE INDEX IF NOT EXISTS idx_job_internal_approvals_created_by
  ON public.job_internal_approvals (created_by);

CREATE INDEX IF NOT EXISTS idx_job_internal_approvals_approved_by
  ON public.job_internal_approvals (approved_by)
  WHERE approved_by IS NOT NULL;

-- =============================================
-- 5. client_milestones
-- Marcos/acoes pendentes com o cliente
-- =============================================
CREATE TABLE IF NOT EXISTS public.client_milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  description text NOT NULL,
  due_date date NOT NULL,
  responsible_name text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','concluido','atrasado','cancelado')),
  notes text,
  completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.client_milestones IS 'Marcos e acoes pendentes com o cliente por job';
COMMENT ON COLUMN public.client_milestones.due_date IS 'Data limite para conclusao do marco';
COMMENT ON COLUMN public.client_milestones.completed_at IS 'Timestamp de quando foi marcado como concluido';
COMMENT ON COLUMN public.client_milestones.deleted_at IS 'Soft delete — preenchido no lugar de DELETE real';

CREATE INDEX IF NOT EXISTS idx_client_milestones_tenant_job_status
  ON public.client_milestones (tenant_id, job_id, status, due_date)
  WHERE deleted_at IS NULL;

-- FK indices
CREATE INDEX IF NOT EXISTS idx_client_milestones_tenant_id
  ON public.client_milestones (tenant_id);

CREATE INDEX IF NOT EXISTS idx_client_milestones_job_id
  ON public.client_milestones (job_id);

CREATE INDEX IF NOT EXISTS idx_client_milestones_created_by
  ON public.client_milestones (created_by);

-- =============================================
-- 6. Campos novos em jobs (satisfaction reminder)
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
      AND column_name = 'satisfaction_reminder_days'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN satisfaction_reminder_days integer;
    COMMENT ON COLUMN public.jobs.satisfaction_reminder_days IS 'Dias apos encerramento para enviar lembrete de satisfacao. NULL = usa default do tenant.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs'
      AND column_name = 'satisfaction_sent_at'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN satisfaction_sent_at timestamptz;
    COMMENT ON COLUMN public.jobs.satisfaction_sent_at IS 'Timestamp de quando o lembrete de satisfacao foi enviado ao cliente';
  END IF;
END
$$;

-- =============================================
-- 7. Triggers updated_at
-- Reutiliza funcao existente: public.update_updated_at()
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_client_communications'
  ) THEN
    CREATE TRIGGER set_updated_at_client_communications
      BEFORE UPDATE ON public.client_communications
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_scope_items'
  ) THEN
    CREATE TRIGGER set_updated_at_scope_items
      BEFORE UPDATE ON public.scope_items
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_client_logistics'
  ) THEN
    CREATE TRIGGER set_updated_at_client_logistics
      BEFORE UPDATE ON public.client_logistics
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_job_internal_approvals'
  ) THEN
    CREATE TRIGGER set_updated_at_job_internal_approvals
      BEFORE UPDATE ON public.job_internal_approvals
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_client_milestones'
  ) THEN
    CREATE TRIGGER set_updated_at_client_milestones
      BEFORE UPDATE ON public.client_milestones
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;

-- =============================================
-- 8. RLS — Row Level Security
-- Padrao do projeto: SELECT/INSERT/UPDATE com tenant_id do JWT
-- DELETE bloqueado via RLS (soft delete para 4 tabelas; job_internal_approvals nao tem delete)
-- =============================================

-- 8.1 client_communications
ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cc_select' AND tablename = 'client_communications') THEN
    CREATE POLICY "cc_select" ON public.client_communications
      FOR SELECT USING (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cc_insert' AND tablename = 'client_communications') THEN
    CREATE POLICY "cc_insert" ON public.client_communications
      FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cc_update' AND tablename = 'client_communications') THEN
    CREATE POLICY "cc_update" ON public.client_communications
      FOR UPDATE USING (tenant_id = public.get_tenant_id());
  END IF;
END $$;

-- 8.2 scope_items
ALTER TABLE public.scope_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'si_select' AND tablename = 'scope_items') THEN
    CREATE POLICY "si_select" ON public.scope_items
      FOR SELECT USING (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'si_insert' AND tablename = 'scope_items') THEN
    CREATE POLICY "si_insert" ON public.scope_items
      FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'si_update' AND tablename = 'scope_items') THEN
    CREATE POLICY "si_update" ON public.scope_items
      FOR UPDATE USING (tenant_id = public.get_tenant_id());
  END IF;
END $$;

-- 8.3 client_logistics
ALTER TABLE public.client_logistics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cl_select' AND tablename = 'client_logistics') THEN
    CREATE POLICY "cl_select" ON public.client_logistics
      FOR SELECT USING (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cl_insert' AND tablename = 'client_logistics') THEN
    CREATE POLICY "cl_insert" ON public.client_logistics
      FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cl_update' AND tablename = 'client_logistics') THEN
    CREATE POLICY "cl_update" ON public.client_logistics
      FOR UPDATE USING (tenant_id = public.get_tenant_id());
  END IF;
END $$;

-- 8.4 job_internal_approvals
ALTER TABLE public.job_internal_approvals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jia_select' AND tablename = 'job_internal_approvals') THEN
    CREATE POLICY "jia_select" ON public.job_internal_approvals
      FOR SELECT USING (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jia_insert' AND tablename = 'job_internal_approvals') THEN
    CREATE POLICY "jia_insert" ON public.job_internal_approvals
      FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jia_update' AND tablename = 'job_internal_approvals') THEN
    CREATE POLICY "jia_update" ON public.job_internal_approvals
      FOR UPDATE USING (tenant_id = public.get_tenant_id());
  END IF;
END $$;

-- 8.5 client_milestones
ALTER TABLE public.client_milestones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cm_select' AND tablename = 'client_milestones') THEN
    CREATE POLICY "cm_select" ON public.client_milestones
      FOR SELECT USING (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cm_insert' AND tablename = 'client_milestones') THEN
    CREATE POLICY "cm_insert" ON public.client_milestones
      FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cm_update' AND tablename = 'client_milestones') THEN
    CREATE POLICY "cm_update" ON public.client_milestones
      FOR UPDATE USING (tenant_id = public.get_tenant_id());
  END IF;
END $$;

-- =============================================
-- 9. Notification types
-- A tabela notifications usa CHECK constraint (nao ENUM).
-- Adicionar 'extra_registered' e 'extra_decided' a lista existente.
-- =============================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;
ALTER TABLE public.notifications ADD CONSTRAINT chk_notifications_type CHECK (
  type IN (
    'job_approved',
    'status_changed',
    'team_added',
    'deadline_approaching',
    'margin_alert',
    'deliverable_overdue',
    'shooting_date_approaching',
    'integration_failed',
    'portal_message_received',
    'approval_responded',
    'approval_requested',
    'extra_registered',
    'extra_decided'
  )
);

-- =============================================
-- 10. GRANTS para roles (padrao do projeto)
-- =============================================
GRANT ALL ON public.client_communications TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.client_communications TO authenticated;

GRANT ALL ON public.scope_items TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.scope_items TO authenticated;

GRANT ALL ON public.client_logistics TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.client_logistics TO authenticated;

GRANT ALL ON public.job_internal_approvals TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.job_internal_approvals TO authenticated;

GRANT ALL ON public.client_milestones TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.client_milestones TO authenticated;
