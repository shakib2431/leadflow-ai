# HRMS Recovery Runbook

Date: 2026-06-26
Phase: 14 (Support Readiness)
Audience: Support, DevOps, Engineering

## 1) Purpose

Provide a clear incident response and service recovery procedure for HRMS production issues.

## 2) Trigger conditions

Use this runbook when:
- Health endpoints fail repeatedly
- Critical HRMS workflows are unavailable
- Payroll, attendance, or report exports fail broadly
- Data integrity concerns are raised

## 3) First 15-minute response

1. Confirm incident scope:
- affected routes
- affected roles
- failure time window

2. Check health quickly:
- `/api/health`
- `/api/hrms/v2/health`

3. Check latest deployment/change:
- release version
- migration execution status

4. Classify severity (Sev-1 to Sev-4).

## 4) Stabilization steps

### Application errors
1. Reproduce with one trusted endpoint call.
2. Check logs for high-frequency stack trace.
3. If newly introduced regression is confirmed, roll back app artifact.

### Database or migration issues
1. Verify migration completion order.
2. If schema mismatch is found, pause write-heavy operations.
3. Apply missing migration or rollback to prior release depending on risk.

### Authorization issues
1. Validate role endpoints and token flow.
2. Confirm no recent permission matrix misconfiguration.
3. Restore last known valid permissions baseline if needed.

## 5) Data protection and backup response

1. Check backup runs in `/hrms/v2/admin` backup tab.
2. Validate last successful backup time.
3. Restore from database-level backup only on confirmed corruption/loss.
4. Reconcile any post-backup delta with business sign-off.

## 6) Validation after recovery

Run:
```bash
npm run test:phase11-admin
npm run verify:phase12-deployment
```

Then validate manually:
- `/hrms/v2/admin`
- `/team/attendance`
- `/team/payroll`
- `/hrms/v2/reports`
- `/hrms/v2/self-service`

## 7) Communication template

During incident:
- what is failing
- current severity
- immediate workaround (if any)
- next update ETA

After recovery:
- root cause summary
- customer impact window
- corrective actions
- prevention plan

## 8) Post-incident tasks

- Create incident report with timeline.
- Add monitoring rule if detection lag occurred.
- Add test/verification coverage for missed failure mode.
- Update this runbook if process gaps were observed.
