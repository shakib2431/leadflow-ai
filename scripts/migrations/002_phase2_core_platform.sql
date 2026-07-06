-- Phase 2: Core Platform foundation
-- Client scope: roles + organization setup

BEGIN;

CREATE TABLE IF NOT EXISTS business_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_entity_id uuid NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_entity_id, name)
);

CREATE TABLE IF NOT EXISTS designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_entity_id uuid NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_entity_id, name)
);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('HR Admin','HR Executive','Employee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS business_entity_id uuid REFERENCES business_entities(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation_id uuid REFERENCES designations(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id uuid REFERENCES employees(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_departments_entity ON departments (business_entity_id);
CREATE INDEX IF NOT EXISTS idx_designations_entity ON designations (business_entity_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_employees_entity ON employees (business_entity_id);

COMMIT;
