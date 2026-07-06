BEGIN;

CREATE TABLE IF NOT EXISTS hr_letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  name text NOT NULL,
  letter_type text NOT NULL CHECK (letter_type IN ('offer', 'appointment', 'contract')),
  subject_template text NOT NULL,
  body_template text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_letter_templates_key_version
  ON hr_letter_templates (template_key, version);

CREATE INDEX IF NOT EXISTS idx_hr_letter_templates_active
  ON hr_letter_templates (template_key, is_active);

CREATE TABLE IF NOT EXISTS employee_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_id uuid REFERENCES hr_letter_templates(id) ON DELETE SET NULL,
  template_key text,
  template_version integer,
  letter_type text NOT NULL CHECK (letter_type IN ('offer', 'appointment', 'contract')),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  rendered_subject text NOT NULL,
  rendered_body text NOT NULL,
  merge_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  regenerated_from uuid REFERENCES employee_letters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS idx_employee_letters_employee_id_created
  ON employee_letters (employee_id, created_at DESC);

INSERT INTO hr_letter_templates (
  template_key,
  name,
  letter_type,
  subject_template,
  body_template,
  version,
  is_active,
  created_by
)
VALUES
(
  'offer_letter',
  'Offer Letter v1',
  'offer',
  'Offer Letter | {{employee_name}} | {{designation}}',
  'Dear {{employee_name}},\n\nWe are pleased to offer you the position of {{designation}} at {{company_name}} in the {{department}} team.\n\nYour expected date of joining is {{joining_date}} and your annual compensation will be {{salary}}.\n\nPlease review this offer and connect with HR for acceptance formalities.\n\nRegards,\nHR Team\n{{company_name}}',
  1,
  true,
  'migration_008'
),
(
  'appointment_letter',
  'Appointment Letter v1',
  'appointment',
  'Appointment Letter | {{employee_name}}',
  'Dear {{employee_name}},\n\nThis letter confirms your appointment as {{designation}} with {{company_name}}.\n\nDepartment: {{department}}\nEmployee Code: {{employee_code}}\nDate of Joining: {{joining_date}}\n\nYou are required to comply with all company policies and complete onboarding formalities.\n\nWe welcome you to the team.\n\nRegards,\nHR Team\n{{company_name}}',
  1,
  true,
  'migration_008'
)
ON CONFLICT (template_key, version) DO NOTHING;

COMMIT;