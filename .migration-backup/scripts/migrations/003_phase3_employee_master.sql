-- Phase 3: Employee Master fields required by client scope

BEGIN;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_date date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS business_entity text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id uuid REFERENCES employees(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_details jsonb;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pf_number text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS aadhaar text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS service_history jsonb;

CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_employee_code ON employees(employee_code);

COMMIT;
