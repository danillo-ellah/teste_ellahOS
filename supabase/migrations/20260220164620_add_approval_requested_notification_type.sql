
-- Adicionar tipo 'approval_requested' para notificacao quando aprovacao e criada
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
    'approval_responded',
    'approval_requested'
  )
);
