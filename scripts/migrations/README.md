Migrations
-----------

Place SQL migration files here. These are intended as suggestions — review and run against a staging database before applying to production.

Example:

```bash
psql <your_database_connection_string> -f scripts/migrations/001_normalize_employees.sql
```

Recommended order for HRMS schema alignment:

```bash
psql <your_database_connection_string> -f scripts/migrations/002_phase2_core_platform.sql
psql <your_database_connection_string> -f scripts/migrations/003_phase3_employee_master.sql
psql <your_database_connection_string> -f scripts/migrations/004_normalize_reporting_manager_column.sql
psql <your_database_connection_string> -f scripts/migrations/005_normalize_archive_filters.sql
psql <your_database_connection_string> -f scripts/migrations/006_stage_onboarding_and_secure_documents.sql
psql <your_database_connection_string> -f scripts/migrations/007_lock_hr_docs_bucket.sql
psql <your_database_connection_string> -f scripts/migrations/008_phase4_letters_templates.sql
psql <your_database_connection_string> -f scripts/migrations/009_phase5_attendance_corrections.sql
psql <your_database_connection_string> -f scripts/migrations/010_phase6_attendance_sources.sql
psql <your_database_connection_string> -f scripts/migrations/011_phase7_attendance_exceptions.sql
psql <your_database_connection_string> -f scripts/migrations/012_phase8_payroll_lifecycle_reporting.sql
psql <your_database_connection_string> -f scripts/migrations/013_phase9_pf_management.sql
psql <your_database_connection_string> -f scripts/migrations/014_phase10_reporting_center.sql
psql <your_database_connection_string> -f scripts/migrations/015_phase11_admin_console.sql
```
