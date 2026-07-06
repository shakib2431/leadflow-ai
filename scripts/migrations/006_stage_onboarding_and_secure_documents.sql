BEGIN;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarding_checklist jsonb;

ALTER TABLE employees ALTER COLUMN date_of_birth DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN gender DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN pan_number DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN aadhaar_number_masked DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN bank_account_number DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN bank_ifsc DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN emergency_contact_name DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN emergency_contact_phone DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN date_of_joining DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN employment_type DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN work_state DROP NOT NULL;
ALTER TABLE employees ALTER COLUMN work_location DROP NOT NULL;

ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS storage_path text;

UPDATE employee_documents
SET storage_path = regexp_replace(file_path, '^.*?/storage/v1/object/public/hr-docs/', '')
WHERE storage_path IS NULL
  AND file_path ILIKE '%/storage/v1/object/public/hr-docs/%';

UPDATE employees
SET onboarding_checklist = CASE
  WHEN status = 'active' THEN jsonb_build_array(
    jsonb_build_object('id', 'contract', 'title', 'Sign Employment Contract', 'status', 'completed', 'type', 'send_doc'),
    jsonb_build_object('id', 'id', 'title', 'Upload Government ID', 'status', 'completed', 'type', 'upload'),
    jsonb_build_object('id', 'handbook', 'title', 'Review Employee Handbook', 'status', 'completed', 'type', 'review')
  )
  ELSE jsonb_build_array(
    jsonb_build_object('id', 'contract', 'title', 'Sign Employment Contract', 'status', 'action_required', 'type', 'send_doc'),
    jsonb_build_object('id', 'id', 'title', 'Upload Government ID', 'status', 'pending_employee', 'type', 'upload'),
    jsonb_build_object('id', 'handbook', 'title', 'Review Employee Handbook', 'status', 'pending_employee', 'type', 'review')
  )
END
WHERE onboarding_checklist IS NULL;

COMMIT;