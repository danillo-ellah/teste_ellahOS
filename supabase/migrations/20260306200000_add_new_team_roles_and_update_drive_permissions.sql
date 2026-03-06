-- Migration: Adicionar novos papeis ao enum team_role
-- Contexto: Conversa detalhada com CEO definiu 6 novos papeis necessarios
-- para o sistema de permissoes granulares do Drive e do frontend.

-- Adicionar novos valores ao enum team_role
DO $$ BEGIN
  ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'cco';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'diretor_producao';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'atendimento';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'financeiro';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'juridico';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'finalizador';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
