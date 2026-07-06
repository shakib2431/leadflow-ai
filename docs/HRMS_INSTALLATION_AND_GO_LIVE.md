# HRMS Installation and Go-Live Guide

Date: 2026-06-26
Audience: Implementation team, DevOps, client IT admin

## 1) Prerequisites

- Node.js LTS installed.
- Access to the CRM repository and deployment environment.
- Supabase project with required schema/migrations.
- Environment variables provisioned for runtime.

## 2) Installation

1. Clone repository.
2. Install dependencies.
3. Configure environment variables.
4. Run migrations in order.
5. Start application.

Example commands:
```bash
npm install
npm run dev
```

## 3) Database migration order

Run migration scripts sequentially from the migrations folder. Ensure latest includes:
- `012_phase8_payroll_lifecycle_reporting.sql`
- `013_phase9_pf_management.sql`
- `014_phase10_reporting_center.sql`
- `015_phase11_admin_console.sql`

## 4) Critical environment variables

Minimum required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Operationally recommended:
- `ATTENDANCE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `GEMINI_API_KEY`
- `EMAIL_FROM_ADDRESS`

## 5) Initial access and role setup

1. Open `/hrms/v2/admin` as HR Admin.
2. Validate role assignment from `/api/hrms/v2/user-roles/me`.
3. Set up entities, departments, designations, user roles.

## 6) Go-live smoke sequence

Run these checks before client handoff:

1. Phase 11 admin smoke:
```bash
npm run test:phase11-admin
```

2. Phase 12 deployment verification:
```bash
npm run verify:phase12-deployment
```

3. Manual UI checks:
- `/hrms/v2`
- `/hrms/v2/admin`
- `/team/attendance`
- `/team/payroll`
- `/hrms/v2/reports`
- `/hrms/v2/self-service`

## 7) Go-live validation output to capture

- Date/time of deployment
- Git commit hash
- Migration completion logs
- Smoke test output logs
- Screenshots of key pages for each role

## 8) Rollback strategy

- Keep database backup before migration run.
- Keep previous release artifact for immediate rollback.
- If production incident occurs:
  1. Switch to previous stable release.
  2. Restore DB snapshot only if data integrity issue is confirmed.
  3. Re-run smoke checks.
