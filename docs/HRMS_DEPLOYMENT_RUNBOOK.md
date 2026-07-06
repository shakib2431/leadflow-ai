# HRMS Deployment Runbook

Date: 2026-06-26
Audience: DevOps and implementation team

## 1) Objective

Deploy CRM with HRMS module enabled and validate production readiness for HR workflows.

## 2) Deployment scope

HRMS routes:
- `/hrms/v2`
- `/hrms/v2/admin`
- `/hrms/v2/reports`
- `/hrms/v2/self-service`

HRMS APIs:
- `/api/hrms/v2/*`
- Health endpoints: `/api/health`, `/api/hrms/v2/health`

## 3) Pre-deploy checklist

- Environment variables configured in target runtime.
- Database migrations applied in sequence.
- Build succeeds.
- Smoke scripts available and executable.

## 4) Deploy procedure

1. Build and deploy application artifact.
2. Run migration set against target database.
3. Verify platform health endpoint response.
4. Verify HRMS health endpoint response.
5. Run Phase 11 and Phase 12 verification scripts.

Verification commands:
```bash
npm run test:phase11-admin
npm run verify:phase12-deployment
```

## 5) Post-deploy validation by role

### HR Admin
- Open `/hrms/v2/admin`
- Validate settings, permissions, audit, backup tabs
- Validate report center and export actions

### HR Executive
- Validate attendance operations and payroll pages
- Validate PF summary/ledger/export availability

### Employee
- Validate self-service routes and own-data access only

## 6) Incident handling

If high-severity production issue occurs:
1. Disable problematic workflow path (if feature-flagged).
2. Roll back application artifact to previous release.
3. Restore database snapshot only when data corruption is confirmed.
4. Re-run verification scripts.

## 7) Handover package

Deliver to client:
- deployment timestamp and release ID
- migration logs
- smoke test outputs
- role-based validation screenshots
- known limitations and next-phase plan
