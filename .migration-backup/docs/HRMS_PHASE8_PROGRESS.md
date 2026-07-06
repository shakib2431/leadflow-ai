# HRMS Phase 8 Progress (Payroll Lifecycle and Reporting)

Date: 2026-06-26

## Scope started
Phase 8 - salary structure lifecycle completion, payroll dashboard/report endpoints, and operations UI integration.

## Implemented in this step

### Salary structure lifecycle APIs (HRMS v2)
- Added `GET/POST /api/hrms/v2/payroll/salary-structures`
  - Role-gated access (`HR Admin`, `HR Executive`, read for `Employee`)
  - Active/archive listing with `includeArchived`
  - Versioned create flow with active-structure auto-closure (`effective_to` set to previous day)
  - Compliance validation using statutory wage-floor engine before insert
- Added `PUT/DELETE /api/hrms/v2/payroll/salary-structures/[id]`
  - Update CTC/effective date/components with compliance re-validation
  - Soft archive by setting `effective_to`

### Payroll reporting/dashboard APIs
- Added `GET /api/hrms/v2/payroll/dashboard`
  - Period-level totals (gross/net/deductions)
  - Deduction buckets (PF/ESI/PT/TDS/LWF)
  - Employee count, run status counts, and recent trend payload
- Added `GET /api/hrms/v2/payroll/reports`
  - Period-filtered payroll run list
  - Monthly summary aggregates
  - Employee payout summary for export/ops consumption

### Payroll operations UI integration
- Updated `app/team/payroll/page.tsx`
  - Added dashboard snapshot card bound to new dashboard API
  - Added report insight card bound to new reports API
  - Added refresh action for insights
  - Added salary-structure seed action (ops bootstrap utility)

### Migration added
- Added `scripts/migrations/012_phase8_payroll_lifecycle_reporting.sql`
  - Active salary-structure uniqueness index (`effective_to is null`)
  - Salary structure/component performance indexes
  - Payroll runs/line-items reporting indexes

## Validation
- Type and diagnostics check clean for all newly created/updated Phase 8 files.
- Existing payroll flows retained; new APIs and UI are additive.

## Hardening Addendum (Completed)
- Added strict Phase 8 schema helpers in `lib/hrms/payrollPhase8Schemas.ts`:
  - CTC bounds validation
  - component uniqueness/limits checks
  - shared month/year/date parsers
- Added HRMS audit + telemetry utility in `lib/hrms/audit.ts`:
  - DB-first insert into `hrms_audit_logs` (if present)
  - file fallback to `tmp/hrms-audit-log.jsonl`
- Added role/action telemetry events on:
  - salary structure list/create/update/archive
  - payroll dashboard view
  - payroll reports view
  - payroll CSV export
- Added `GET /api/hrms/v2/payroll/reports/export`:
  - CSV attachment response for payroll line-item report
  - month/year filters compatible with existing report endpoint

## Notes
- Salary structure versioning is DB-backed and lifecycle-safe for one-active-version semantics.
- Reporting contracts are JSON-first and ready for CSV/export adapters in the next increment.
