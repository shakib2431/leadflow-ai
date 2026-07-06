# HRMS Admin Operations Guide

Date: 2026-06-26
Audience: HR Admin, HR Executive

## 1) Admin landing and purpose

Primary admin page:
- `/hrms/v2/admin`

This page is the operations center for:
- Org masters and role setup
- Attendance review operations
- PF controls
- Admin hardening controls (Phase 11)

## 2) Phase 11 admin tabs (inside HRMS Admin)

### Settings tab
Use for:
- Default currency
- Timezone
- Attendance cutoff day
- Leave auto approval toggle
- Payroll approval required toggle

Action:
- Save Settings

### Permissions tab
Use for:
- Role-permission matrix by permission key
- HR Admin, HR Executive, Employee policy toggles

Action:
- Save Matrix

### Audit Logs tab
Use for:
- Governance visibility
- Actor/action/entity timeline review

Action:
- Refresh data and inspect recent changes

### Backup tab
Use for:
- Backup frequency/retention/storage configuration
- Triggering backup runs
- Reviewing recent run status

Actions:
- Save Backup Config
- Run Backup Now

## 3) Master data management

Maintain these in admin workflows:
- Business entities
- Departments
- Designations
- User roles
- Letter templates and versions

Best practice:
- Keep naming conventions stable.
- Avoid deleting reference data used in active employee records.

## 4) Attendance operations

Primary page:
- `/team/attendance`

Key tasks:
- Review pending correction requests.
- Monitor source metrics and failed sync logs.
- Detect and resolve attendance exceptions.

## 5) Payroll and PF operations

Payroll operations:
- `/team/payroll`
- Payroll APIs for runs, previews, reports, payslips

PF operations:
- PF summary, ledger, returns export
- Registration updates per employee

## 6) Reporting center

Primary page:
- `/hrms/v2/reports`

Outputs:
- Consolidated KPIs
- Department and employee trends
- Export: CSV and JSON
- PDF generation in client UI

## 7) Admin controls and security

- All sensitive APIs are role-gated.
- Mutating admin endpoints emit audit entries.
- Backup controls should be restricted to HR Admin policy.

## 8) Operational checklist (weekly)

- Review audit logs.
- Review backup runs.
- Validate attendance exception queue is not stale.
- Validate payroll and PF reports export correctly.
- Validate no unauthorized role expansions in permissions matrix.
