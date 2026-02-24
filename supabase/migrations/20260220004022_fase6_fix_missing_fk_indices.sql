-- Indices para FKs sem cobertura detectados pelo advisor
CREATE INDEX IF NOT EXISTS idx_allocations_created_by
  ON public.allocations (created_by);

CREATE INDEX IF NOT EXISTS idx_approval_logs_actor_id
  ON public.approval_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_approver_people_id
  ON public.approval_requests (approver_people_id);