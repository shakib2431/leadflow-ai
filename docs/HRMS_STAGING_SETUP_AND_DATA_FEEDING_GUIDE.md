# HRMS Staging Setup and Data Feeding Guide

Date: 2026-06-26
Audience: QA engineer, implementation engineer

## Purpose

Set up a staging environment that mirrors production and feed realistic HRMS data for end-to-end testing.

## 1) Staging setup checklist

- Deploy same build artifact type as production.
- Use same environment variable names and secure injection method.
- Apply all migrations through latest phase.
- Validate health endpoints:
  - `/api/health`
  - `/api/hrms/v2/health`

## 2) Required variables for seeding

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Optional `STAGING_DEFAULT_PASSWORD`

## 3) Seed command

Run from repository root:

```bash
node scripts/seed_hrms_staging_data.js
```

Alternative SQL-first seed (Supabase SQL Editor):

```sql
-- Run the full script from:
-- scripts/migrations/900_seed_hrms_staging_full.sql
```

## 4) What data gets created

- Org structure:
  - 2 business entities
  - 5 departments
  - 7 designations
- Users and roles:
  - HR Admin, HR Executive, Employee users
  - manager users and employee users with role assignments
- Employee hierarchy:
  - managers with direct reports
- Operational sample data:
  - attendance records for prior 14 days
  - pending leave requests

## 5) Seed validation checks

After seeding:
1. `GET /api/hrms/v2/business-entities`
2. `GET /api/hrms/v2/departments`
3. `GET /api/hrms/v2/designations`
4. `GET /api/hrms/v2/employees?page=1&pageSize=100`
5. `GET /api/hrms/v2/user-roles` (as HR Admin)
6. `GET /api/hrms/v2/attendance?date=YYYY-MM-DD`
7. `GET /api/hrms/v2/leave/requests?page=1&pageSize=50`

## 6) Role login test accounts

Seed script creates auth users with predictable emails:
- staging.hradmin@leadflow.test
- staging.hrexec@leadflow.test
- staging.employee@leadflow.test
- manager and employee test users with similar naming

Password:
- from `STAGING_DEFAULT_PASSWORD`
- fallback default defined in script for local staging

Note for SQL-first seeding:
- `user_roles` mapping requires real auth user UUIDs from `auth.users`.
- The SQL file includes a clearly marked section for this mapping.

## 7) Safety notes

- Do not run this seeder against production.
- Use dedicated staging project credentials.
- Rotate seeded test passwords before UAT with external users.

## 8) Recommended next step

Immediately run:
- `npm run test:phase11-admin`
- `npm run verify:phase12-deployment`
Then execute the full role-based program in:
- `docs/HRMS_END_TO_END_PRODUCTION_LIKE_TEST_PROGRAM.md`
