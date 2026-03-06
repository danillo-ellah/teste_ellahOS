-- =============================================
-- Onda 2.1 Refinamentos: S-01, S-02, S-04
-- S-04: registro_set no entry_type
-- S-02: shared_with_team + team_note em client_communications
-- S-01: estimated_value em scope_items + resolvido_atendimento
-- =============================================

-- S-04 + S-02: Atualizar client_communications
ALTER TABLE public.client_communications
  DROP CONSTRAINT IF EXISTS client_communications_entry_type_check;

ALTER TABLE public.client_communications
  ADD CONSTRAINT client_communications_entry_type_check
  CHECK (entry_type IN ('decisao','alteracao','informacao','aprovacao','satisfacao_automatica','registro_set','outro'));

ALTER TABLE public.client_communications
  ADD COLUMN IF NOT EXISTS shared_with_team boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_note text;

COMMENT ON COLUMN public.client_communications.shared_with_team IS 'Se o Atendimento repassou esta informacao a equipe interna';
COMMENT ON COLUMN public.client_communications.team_note IS 'Nota sobre como/o que foi repassado a equipe';

-- S-01: Atualizar scope_items
ALTER TABLE public.scope_items
  DROP CONSTRAINT IF EXISTS scope_items_extra_status_check;

ALTER TABLE public.scope_items
  ADD CONSTRAINT scope_items_extra_status_check
  CHECK (extra_status IS NULL OR extra_status IN ('pendente_ceo','aprovado_gratuito','cobrar_aditivo','recusado','resolvido_atendimento'));

ALTER TABLE public.scope_items
  ADD COLUMN IF NOT EXISTS estimated_value numeric(15,2);

COMMENT ON COLUMN public.scope_items.estimated_value IS 'Valor estimado do extra em R$ (para escalada de autonomia do Atendimento)';
