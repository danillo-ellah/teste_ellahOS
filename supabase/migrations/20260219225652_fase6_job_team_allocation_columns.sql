
-- ============================================================
-- Migration 016: Fase 6 -- ADD allocation_start/end ao job_team
-- ============================================================
SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_team' AND column_name = 'allocation_start'
  ) THEN
    ALTER TABLE job_team ADD COLUMN allocation_start DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_team' AND column_name = 'allocation_end'
  ) THEN
    ALTER TABLE job_team ADD COLUMN allocation_end DATE;
  END IF;
END $$;

-- Check: end >= start (somente quando ambas preenchidas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_job_team_allocation_dates'
      AND conrelid = 'job_team'::regclass
  ) THEN
    ALTER TABLE job_team
      ADD CONSTRAINT chk_job_team_allocation_dates
      CHECK (
        allocation_start IS NULL
        OR allocation_end IS NULL
        OR allocation_end >= allocation_start
      );
  END IF;
END $$;
