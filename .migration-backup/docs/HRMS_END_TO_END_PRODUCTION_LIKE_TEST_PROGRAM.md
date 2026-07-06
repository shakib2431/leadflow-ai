# HRMS End-to-End Production-Like Test Program

Date: 2026-06-26
Audience: QA, HR operations owner, delivery lead, implementation team

## Objective

Run HRMS testing as a real-world production simulation, not ad-hoc manual clicks.

## Layer 1: Production-like staging foundation

### Environment parity rules
- Same application build mode as production.
- Same database engine and schema version.
- Same storage and file rules.
- Same auth flow and role guard behavior.
- Same environment variable structure.

### Required staging checks
- Run deployment verifier:
  - `npm run verify:phase12-deployment`
- Run admin smoke:
  - `npm run test:phase11-admin`

## Layer 2: Structured data feeding (people + hierarchy + transactions)

### Seed production-like people and org data
Use script:
- `node scripts/seed_hrms_staging_data.js`

This seeds:
- business entities, departments, designations
- HR Admin, HR Executive, Employee auth users + user roles
- manager profiles and employee hierarchy
- attendance sample data
- leave request sample data

### Seed execution preconditions
- `NEXT_PUBLIC_SUPABASE_URL` set
- `SUPABASE_SERVICE_ROLE_KEY` set
- Optional: `STAGING_DEFAULT_PASSWORD`

## Layer 3: Role-based end-to-end journeys

### A) HR Admin journey
1. Open `/hrms/v2/admin`.
2. Validate settings tab save/update.
3. Validate role permissions matrix update.
4. Validate audit logs visibility.
5. Validate backup config update and backup trigger.
6. Validate report center export from `/hrms/v2/reports`.

### B) HR Executive journey
1. Open `/team/attendance`.
2. Review pending corrections and exceptions.
3. Validate attendance source/sync monitoring sections.
4. Open `/team/payroll` for payroll operations.
5. Validate PF summary and ledger routes.
6. Validate reporting access as HR Executive.

### C) Employee journey
1. Login with seeded employee credentials.
2. Open `/hrms/v2/self-service`.
3. Validate profile, attendance, leave, calendar, payroll, work mode tabs.
4. Apply leave and verify request status flow.
5. Validate employee cannot access admin-only modules.

### D) Security and authorization journey
1. Employee attempts `/hrms/v2/admin` actions: must deny writes.
2. HR Executive attempts HR Admin-only action: must deny.
3. Invalid/expired token calls return authorization errors.
4. API-level restrictions validated independent of UI hiding.

## Layer 4: Reliability, performance, and recovery drills

### Performance checks
- Run concurrent request tests on:
  - `/api/hrms/v2/reports/summary`
  - `/api/hrms/v2/admin/settings`
  - `/api/hrms/v2/attendance`
- Track p95 and error rates.

### Failure simulation
- Simulate one dependent service degradation.
- Confirm graceful error handling and user messaging.

### Recovery drill
1. Trigger backup from admin.
2. Execute recovery workflow in runbook.
3. Re-run smoke verifications.

## Test execution schedule (recommended)

### Day 1: Environment and seed readiness
- Deploy staging artifact.
- Apply migrations.
- Run seed script.
- Run baseline smoke verifiers.

### Day 2: Admin and HR Executive E2E
- Complete all HR Admin journey cases.
- Complete all HR Executive journey cases.

### Day 3: Employee and security E2E
- Complete employee self-service cases.
- Complete authorization hardening cases.

### Day 4: Reliability and sign-off
- Performance and recovery drill.
- Capture evidence and close open defects.
- Client walkthrough and UAT sign-off.

## Evidence pack for client sign-off

Capture and archive:
- staging URL and build version
- migration logs
- seed execution output
- smoke verifier output
- role-based screenshots/video evidence
- defect list and closure status
- final sign-off checklist completion

## Exit criteria

Testing is complete only if:
- all critical role journeys pass
- no Sev-1 or Sev-2 unresolved defects
- deployment and admin smoke scripts pass
- recovery drill completed with documented evidence
