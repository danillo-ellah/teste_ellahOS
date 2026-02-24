
-- Fase 7: Adicionar novos tipos de notificacao para portal e aprovacoes
-- portal_message_received: quando cliente envia mensagem pelo portal
-- approval_responded: quando aprovador responde (aprova/rejeita)

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type CHECK (
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
    'approval_responded'
  )
);
