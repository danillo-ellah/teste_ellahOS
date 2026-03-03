-- Migration: adiciona tabela de convites para o portal do fornecedor (T1.5)
-- Fornecedores recebem um link unico por token para preencher seus dados cadastrais

-- Tabela de tokens de convite
CREATE TABLE IF NOT EXISTS vendor_invite_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Se nulo, cria um vendor novo ao salvar o formulario
  vendor_id   UUID REFERENCES vendors(id) ON DELETE SET NULL,

  -- Contexto opcional do job que originou o convite
  job_id      UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Token unico enviado no link publico
  token       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- Dados pre-preenchidos enviados pelo admin (opcionais)
  email       VARCHAR(300),
  name        VARCHAR(300),

  -- Validade padrao: 30 dias
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),

  -- Preenchido quando o fornecedor envia o formulario
  used_at     TIMESTAMPTZ,

  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Indices para lookup por token (rota publica) e por tenant/vendor
CREATE UNIQUE INDEX IF NOT EXISTS vendor_invite_tokens_token_idx
  ON vendor_invite_tokens(token);

CREATE INDEX IF NOT EXISTS vendor_invite_tokens_tenant_idx
  ON vendor_invite_tokens(tenant_id);

CREATE INDEX IF NOT EXISTS vendor_invite_tokens_vendor_idx
  ON vendor_invite_tokens(vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vendor_invite_tokens_job_idx
  ON vendor_invite_tokens(job_id)
  WHERE job_id IS NOT NULL;

-- RLS
ALTER TABLE vendor_invite_tokens ENABLE ROW LEVEL SECURITY;

-- Leitura: apenas usuarios do tenant
DROP POLICY IF EXISTS "vendor_invite_tokens_select" ON vendor_invite_tokens;
CREATE POLICY "vendor_invite_tokens_select"
  ON vendor_invite_tokens FOR SELECT
  USING (tenant_id = (SELECT get_tenant_id()));

-- Criacao: apenas usuarios autenticados do tenant
DROP POLICY IF EXISTS "vendor_invite_tokens_insert" ON vendor_invite_tokens;
CREATE POLICY "vendor_invite_tokens_insert"
  ON vendor_invite_tokens FOR INSERT
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- Atualizacao (marcar como usado via service role via Edge Function)
DROP POLICY IF EXISTS "vendor_invite_tokens_update" ON vendor_invite_tokens;
CREATE POLICY "vendor_invite_tokens_update"
  ON vendor_invite_tokens FOR UPDATE
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger para updated_at automatico
DROP TRIGGER IF EXISTS trg_vendor_invite_tokens_updated_at ON vendor_invite_tokens;
CREATE TRIGGER trg_vendor_invite_tokens_updated_at
  BEFORE UPDATE ON vendor_invite_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Adicionar campos de endereco ao vendor, se ainda nao existirem
-- (campos usados pelo portal de auto-cadastro)
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS rg                VARCHAR(30),
  ADD COLUMN IF NOT EXISTS birth_date        DATE,
  ADD COLUMN IF NOT EXISTS zip_code          VARCHAR(10),
  ADD COLUMN IF NOT EXISTS address_street    VARCHAR(300),
  ADD COLUMN IF NOT EXISTS address_number    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address_district  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS address_city      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS address_state     CHAR(2);
