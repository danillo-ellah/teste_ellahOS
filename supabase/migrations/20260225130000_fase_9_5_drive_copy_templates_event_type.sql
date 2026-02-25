-- =============================================================================
-- Migration 017: Fase 9.5 -- Adicionar drive_copy_templates ao chk de event_type
-- Data: 2026-02-25
-- Ref: docs/architecture/fase-9-automacoes-architecture.md secao 2.4
--
-- Alteracoes:
--   integration_events: ampliar chk_integration_events_type para incluir
--   'drive_copy_templates' (novo evento do handler copy-templates da
--   Edge Function drive-integration)
--
-- Por que DROP + recreate: CHECK constraints nao suportam ALTER.
-- A operacao e idempotente: se o constraint ja existir com o valor novo,
-- o DROP + CREATE mantém o comportamento correto.
-- =============================================================================

SET search_path TO public;

-- Remover constraint antigo (permite recriar com o novo valor)
ALTER TABLE integration_events
  DROP CONSTRAINT IF EXISTS chk_integration_events_type;

-- Recriar com 'drive_copy_templates' adicionado
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
      'docuseal_submission_created',
      'docuseal_submission_signed',
      'docuseal_submission_failed'
    )
  );

COMMENT ON CONSTRAINT chk_integration_events_type ON integration_events
  IS 'Tipos validos de evento de integracao. drive_copy_templates adicionado na Fase 9.5.';
