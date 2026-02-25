-- =============================================================================
-- Migration 018: Fase 9 -- Adicionar event types faltantes ao CHECK constraint
-- Data: 2026-02-25
--
-- Corrige o chk_integration_events_type para incluir TODOS os event types
-- usados na Fase 9: nf_email_send, docuseal_create_batch, pdf_generate
-- (que estavam no TypeScript mas faltavam no banco).
-- =============================================================================

SET search_path TO public;

-- Remover constraint existente
ALTER TABLE integration_events
  DROP CONSTRAINT IF EXISTS chk_integration_events_type;

-- Recriar com TODOS os event types (incluindo nf_email_send, docuseal_create_batch, pdf_generate)
ALTER TABLE integration_events
  ADD CONSTRAINT chk_integration_events_type CHECK (
    event_type IN (
      'drive_create_structure',
      'drive_copy_templates',
      'whatsapp_send',
      'n8n_webhook',
      'nf_request_sent',
      'nf_received',
      'nf_validated',
      'nf_email_send',
      'docuseal_submission_created',
      'docuseal_submission_signed',
      'docuseal_submission_failed',
      'docuseal_create_batch',
      'pdf_generate'
    )
  );

COMMENT ON CONSTRAINT chk_integration_events_type ON integration_events
  IS 'Tipos validos de evento de integracao. Fase 9: nf_email_send, docuseal_create_batch, pdf_generate adicionados.';
