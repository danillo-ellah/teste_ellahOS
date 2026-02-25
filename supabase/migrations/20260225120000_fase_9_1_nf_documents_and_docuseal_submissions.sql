-- =============================================================================
-- Migration 016: Fase 9.1 -- nf_documents + docuseal_submissions + ALTER tables
-- Data: 2026-02-25
-- Ref: docs/architecture/fase-9-automacoes-architecture.md secao 3
--
-- Novas tabelas:
--   nf_documents            -- Notas fiscais recebidas por email ou upload manual
--   docuseal_submissions    -- Contratos enviados via DocuSeal para assinatura
--
-- Tabelas alteradas:
--   financial_records       -- Campos de fluxo de pedido de NF
--   invoices                -- Vinculo com nf_documents + dados do emissor
--
-- Total de tabelas apos migration: 36 (34 + 2 novas)
-- =============================================================================

-- -------------------------------------------------------
-- 1. nf_documents -- Notas fiscais recebidas/processadas
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS nf_documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id          UUID        REFERENCES jobs(id) ON DELETE SET NULL,

  -- Origem
  source          TEXT        NOT NULL DEFAULT 'email',
  gmail_message_id TEXT,
  sender_email    TEXT,
  sender_name     TEXT,
  subject         TEXT,
  received_at     TIMESTAMPTZ,

  -- Arquivo
  file_hash       TEXT        NOT NULL,
  file_name       TEXT        NOT NULL,
  file_size_bytes INT,
  drive_file_id   TEXT,
  drive_url       TEXT,
  storage_path    TEXT,

  -- Dados extraidos (manual ou OCR)
  nf_number       TEXT,
  nf_value        NUMERIC(15,2),
  nf_issuer_name  TEXT,
  nf_issuer_cnpj  TEXT,
  nf_issue_date   DATE,
  extracted_data  JSONB       DEFAULT '{}',

  -- Matching
  status          TEXT        NOT NULL DEFAULT 'pending_review',
  matched_financial_record_id UUID REFERENCES financial_records(id) ON DELETE SET NULL,
  matched_invoice_id          UUID REFERENCES invoices(id) ON DELETE SET NULL,
  match_confidence  NUMERIC(3,2),
  match_method      TEXT,
  validated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  validated_at      TIMESTAMPTZ,
  rejection_reason  TEXT,

  -- Metadata
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_nf_documents_source CHECK (
    source IN ('email', 'manual_upload', 'ocr')
  ),
  CONSTRAINT chk_nf_documents_status CHECK (
    status IN ('pending_review', 'auto_matched', 'confirmed', 'rejected', 'processing')
  ),
  CONSTRAINT chk_nf_documents_match_confidence CHECK (
    match_confidence IS NULL OR (match_confidence >= 0.00 AND match_confidence <= 1.00)
  ),
  CONSTRAINT chk_nf_documents_match_method CHECK (
    match_method IS NULL OR match_method IN ('auto_value_supplier', 'auto_nf_number', 'manual', 'ocr_ai')
  )
);

COMMENT ON TABLE nf_documents IS 'Notas fiscais recebidas por email ou upload manual. Central do fluxo de NF.';
COMMENT ON COLUMN nf_documents.source IS 'Origem da NF: email (via n8n), manual_upload (frontend) ou ocr (IA).';
COMMENT ON COLUMN nf_documents.gmail_message_id IS 'ID do email no Gmail para deduplicacao e tracking.';
COMMENT ON COLUMN nf_documents.file_hash IS 'SHA-256 do PDF para deduplicacao.';
COMMENT ON COLUMN nf_documents.storage_path IS 'Path no Supabase Storage (fallback quando Drive indisponivel).';
COMMENT ON COLUMN nf_documents.extracted_data IS 'Dados adicionais extraidos por OCR/IA em formato livre.';
COMMENT ON COLUMN nf_documents.match_confidence IS 'Confianca do match automatico (0.00-1.00). > 0.90 = auto_matched.';
COMMENT ON COLUMN nf_documents.match_method IS 'Metodo usado para match: auto_value_supplier, auto_nf_number, manual, ocr_ai.';

-- Indices nf_documents
CREATE INDEX IF NOT EXISTS idx_nf_documents_tenant
  ON nf_documents(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nf_documents_status
  ON nf_documents(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nf_documents_job
  ON nf_documents(job_id) WHERE job_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nf_documents_hash
  ON nf_documents(tenant_id, file_hash);
CREATE INDEX IF NOT EXISTS idx_nf_documents_gmail
  ON nf_documents(gmail_message_id) WHERE gmail_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nf_documents_matched_financial_record
  ON nf_documents(matched_financial_record_id) WHERE matched_financial_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nf_documents_matched_invoice
  ON nf_documents(matched_invoice_id) WHERE matched_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nf_documents_validated_by
  ON nf_documents(validated_by) WHERE validated_by IS NOT NULL;

-- RLS nf_documents
ALTER TABLE nf_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nf_documents_select ON nf_documents;
CREATE POLICY nf_documents_select ON nf_documents
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS nf_documents_insert ON nf_documents;
CREATE POLICY nf_documents_insert ON nf_documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS nf_documents_update ON nf_documents;
CREATE POLICY nf_documents_update ON nf_documents
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger updated_at nf_documents
DROP TRIGGER IF EXISTS trg_nf_documents_updated_at ON nf_documents;
CREATE TRIGGER trg_nf_documents_updated_at
  BEFORE UPDATE ON nf_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- -------------------------------------------------------
-- 2. docuseal_submissions -- Contratos DocuSeal
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS docuseal_submissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id          UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Partes do contrato
  person_id       UUID        REFERENCES people(id) ON DELETE SET NULL,
  person_name     TEXT        NOT NULL,
  person_email    TEXT        NOT NULL,
  person_cpf      TEXT,

  -- DocuSeal
  docuseal_submission_id  INT,
  docuseal_template_id    INT         NOT NULL DEFAULT 3,
  docuseal_status         TEXT        NOT NULL DEFAULT 'pending',

  -- Dados do contrato
  contract_data   JSONB       NOT NULL DEFAULT '{}',

  -- Arquivos
  signed_pdf_url  TEXT,
  signed_pdf_drive_id TEXT,

  -- Tracking
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  signed_at       TIMESTAMPTZ,
  created_by      UUID        NOT NULL REFERENCES profiles(id),
  error_message   TEXT,

  -- Metadata
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_docuseal_status CHECK (
    docuseal_status IN ('pending', 'sent', 'opened', 'partially_signed', 'signed', 'declined', 'expired', 'error')
  )
);

COMMENT ON TABLE docuseal_submissions IS 'Contratos enviados via DocuSeal para assinatura digital.';
COMMENT ON COLUMN docuseal_submissions.docuseal_submission_id IS 'ID retornado pela API do DocuSeal apos criacao.';
COMMENT ON COLUMN docuseal_submissions.docuseal_template_id IS 'ID do template no DocuSeal. Default 3 = contrato de elenco.';
COMMENT ON COLUMN docuseal_submissions.contract_data IS 'Dados preenchidos no template: valores, clausulas, periodo de veiculacao.';
COMMENT ON COLUMN docuseal_submissions.docuseal_status IS 'Status do contrato no DocuSeal: pending -> sent -> opened -> signed/declined/expired.';

-- Indices docuseal_submissions
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_tenant
  ON docuseal_submissions(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_job
  ON docuseal_submissions(job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_person
  ON docuseal_submissions(person_id) WHERE person_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_status
  ON docuseal_submissions(tenant_id, docuseal_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_external
  ON docuseal_submissions(docuseal_submission_id) WHERE docuseal_submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_docuseal_submissions_created_by
  ON docuseal_submissions(created_by);

-- RLS docuseal_submissions
ALTER TABLE docuseal_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS docuseal_submissions_select ON docuseal_submissions;
CREATE POLICY docuseal_submissions_select ON docuseal_submissions
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS docuseal_submissions_insert ON docuseal_submissions;
CREATE POLICY docuseal_submissions_insert ON docuseal_submissions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS docuseal_submissions_update ON docuseal_submissions;
CREATE POLICY docuseal_submissions_update ON docuseal_submissions
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger updated_at docuseal_submissions
DROP TRIGGER IF EXISTS trg_docuseal_submissions_updated_at ON docuseal_submissions;
CREATE TRIGGER trg_docuseal_submissions_updated_at
  BEFORE UPDATE ON docuseal_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- -------------------------------------------------------
-- 3. ALTER financial_records -- Campos de fluxo de NF
-- -------------------------------------------------------

ALTER TABLE financial_records
  ADD COLUMN IF NOT EXISTS nf_request_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nf_request_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nf_request_gmail_id TEXT,
  ADD COLUMN IF NOT EXISTS supplier_email TEXT,
  ADD COLUMN IF NOT EXISTS supplier_cnpj TEXT;

COMMENT ON COLUMN financial_records.nf_request_status IS 'Status do pedido de NF ao fornecedor: NULL, pendente, enviado, enviado_confirmado, recebido, validado.';
COMMENT ON COLUMN financial_records.supplier_email IS 'Email do fornecedor para envio de pedido de NF.';
COMMENT ON COLUMN financial_records.supplier_cnpj IS 'CNPJ do fornecedor para matching automatico de NFs.';

-- CHECK para nf_request_status (so aceita valores validos ou NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_financial_records_nf_request_status'
  ) THEN
    ALTER TABLE financial_records
      ADD CONSTRAINT chk_financial_records_nf_request_status CHECK (
        nf_request_status IS NULL
        OR nf_request_status IN ('pendente', 'enviado', 'enviado_confirmado', 'recebido', 'validado')
      );
  END IF;
END $$;

-- Indice para busca por status de pedido de NF
CREATE INDEX IF NOT EXISTS idx_financial_records_nf_request_status
  ON financial_records(nf_request_status) WHERE nf_request_status IS NOT NULL;


-- -------------------------------------------------------
-- 4. ALTER invoices -- Vinculo com nf_documents
-- -------------------------------------------------------

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS nf_document_id UUID REFERENCES nf_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS issuer_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS issuer_name TEXT;

COMMENT ON COLUMN invoices.nf_document_id IS 'Referencia ao registro de NF em nf_documents (vinculo apos validacao).';
COMMENT ON COLUMN invoices.drive_file_id IS 'ID do arquivo PDF da invoice no Google Drive.';
COMMENT ON COLUMN invoices.issuer_cnpj IS 'CNPJ do emissor da invoice.';
COMMENT ON COLUMN invoices.issuer_name IS 'Razao social do emissor da invoice.';

-- Indice na FK nf_document_id
CREATE INDEX IF NOT EXISTS idx_invoices_nf_document
  ON invoices(nf_document_id) WHERE nf_document_id IS NOT NULL;


-- =============================================================================
-- FIM da migration 016 - Fase 9.1
-- Novas tabelas: nf_documents, docuseal_submissions (total: 36)
-- Tabelas alteradas: financial_records, invoices
-- =============================================================================
