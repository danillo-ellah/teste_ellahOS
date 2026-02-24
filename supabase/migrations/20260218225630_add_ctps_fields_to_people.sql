-- Adiciona campos CTPS (Carteira de Trabalho) na tabela people
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS ctps_number text,
  ADD COLUMN IF NOT EXISTS ctps_series text;

COMMENT ON COLUMN public.people.ctps_number IS 'Numero da Carteira de Trabalho (CTPS)';
COMMENT ON COLUMN public.people.ctps_series IS 'Serie da Carteira de Trabalho (CTPS)';