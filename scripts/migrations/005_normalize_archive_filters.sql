-- Phase 5: Normalize archive/status behavior for HRMS filters and bulk actions

BEGIN;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employment_status text;

DO $$
DECLARE
  status_udt text;
BEGIN
  SELECT udt_name
  INTO status_udt
  FROM information_schema.columns
  WHERE table_name = 'employees'
    AND column_name = 'status'
  LIMIT 1;

  -- If status is enum, ensure archived value exists.
  IF status_udt IS NOT NULL AND EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = status_udt
      AND t.typtype = 'e'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = status_udt
        AND e.enumlabel = 'archived'
    ) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE ''archived''', status_udt);
    END IF;
  END IF;
END$$;

-- Sync derived employment_status from status when missing.
UPDATE employees
SET employment_status = COALESCE(employment_status, status::text)
WHERE employment_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_archived_at ON employees (archived_at);

COMMIT;
