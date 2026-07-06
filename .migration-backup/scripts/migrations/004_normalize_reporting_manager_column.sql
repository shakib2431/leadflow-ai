-- Phase 4: Normalize manager relationship column to reporting_manager_id
-- Ensures all environments use a single canonical column for manager filters.

BEGIN;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS reporting_manager_id uuid;

-- Backfill canonical column from legacy reporting_manager when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'reporting_manager'
  ) THEN
    EXECUTE '
      UPDATE employees
      SET reporting_manager_id = COALESCE(reporting_manager_id, reporting_manager)
      WHERE reporting_manager IS NOT NULL
    ';
  END IF;
END$$;

-- Ensure canonical FK exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'employees'
      AND c.conname = 'employees_reporting_manager_id_fkey'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_reporting_manager_id_fkey
      FOREIGN KEY (reporting_manager_id) REFERENCES employees(id);
  END IF;
END$$;

-- Drop legacy reporting_manager FK constraints if they exist.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'employees'
      AND a.attname = 'reporting_manager'
      AND c.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE employees DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END$$;

-- Remove legacy column after successful backfill.
ALTER TABLE employees
  DROP COLUMN IF EXISTS reporting_manager;

CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager_id
  ON employees (reporting_manager_id);

COMMIT;
