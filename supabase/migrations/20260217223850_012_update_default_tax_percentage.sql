-- ============================================================
-- Migration 012: Atualizar tax_percentage default
-- De 12.00 para 13.40 (alinhamento com imposto real brasileiro)
-- Fase 1 - Ajuste fiscal
-- ============================================================

-- ============================================================
-- 1. Alterar o DEFAULT da coluna tax_percentage
-- Novos jobs criados terao 13.4% como padrao
-- Jobs existentes NAO sao alterados (mantêm o valor atual)
-- ============================================================

ALTER TABLE jobs ALTER COLUMN tax_percentage SET DEFAULT 13.40;

COMMENT ON COLUMN jobs.tax_percentage IS 'Percentual de imposto padrao. Default alterado de 12.00 para 13.40 na migration 012.';
