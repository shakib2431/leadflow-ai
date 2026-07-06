-- Migration: normalize employees schema (safe, idempotent where possible)
-- NOTE: Review before applying to production Supabase.

BEGIN;

-- Add `current_title` if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='current_title') THEN
    ALTER TABLE employees ADD COLUMN current_title text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='phone') THEN
    ALTER TABLE employees ADD COLUMN phone text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='salary') THEN
    ALTER TABLE employees ADD COLUMN salary numeric;
  END IF;
END$$;

COMMIT;
