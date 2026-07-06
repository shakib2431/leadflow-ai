# HRMS Phase 5 Progress (Payroll Foundation)

Date: 2026-06-26

## Scope started
Phase 5 - payroll policy configuration, run preview, and approval checkpoint workflow.

## Implemented in this step

### Indian compliance coverage check + enhancement
- Existing compliance engines verified in use:
  - Wage floor validation
  - PF contribution
  - ESI contribution
  - Professional Tax slab deduction
- Gap found and fixed:
  - TDS was previously hardcoded to `0` in payroll run generation.
  - Integrated `calculateTDS` into:
    - `POST /api/hr/process-payroll`
    - `POST /api/hrms/v2/payroll/runs/preview`
  - Current default behavior:
    - New tax regime (`NEW`)
    - No additional deduction declarations (`0`) until declaration capture is introduced.
  - Further enhancement completed:
    - Added employee tax declaration capture (`regime`, `declared_80c`, `declared_80d`) and now TDS is computed per-employee using declaration data.

### Payroll policy configuration API
- Added `GET /api/hrms/v2/payroll/config`
  - Role-aware retrieval (`HR Admin`, `HR Executive`).
  - Returns normalized defaults when rules are not present.
- Added `PUT /api/hrms/v2/payroll/config`
  - Restricted to `HR Admin`.
  - Validates and persists:
    - `cycleStartDay` (1-28)
    - `cutoffDay` (1-31)
    - `approvalRequired` (boolean)

### Payroll preview API
- Added `POST /api/hrms/v2/payroll/runs/preview`
  - Role-aware access (`HR Admin`, `HR Executive`).
  - Computes deterministic preview totals using active employees, salary structures, attendance LOP, and compliance deduction rules.
  - Returns:
    - period summary
    - employee count
    - total gross/deductions/net
    - top preview line items

### Payroll approval checkpoint API
- Added `POST /api/hrms/v2/payroll/runs/[id]/checkpoint`
  - Role-aware access (`HR Admin`, `HR Executive`).
  - Supports explicit transition actions:
    - `approve` (draft -> finalized)
    - `mark_paid` (finalized -> paid)
    - `reopen_draft` (finalized -> draft, HR Admin only)

### Payroll run listing API
- Added `GET /api/hrms/v2/payroll/runs`
  - Role-aware access (`HR Admin`, `HR Executive`).
  - Supports period/status filters and pagination.

### Employee payslip center APIs
- Added `GET /api/hrms/v2/payroll/payslips`
  - Employee: own payslips only (scoped).
  - HR roles: can filter by `employee_id`.
  - Returns payroll period, deduction heads, and net pay.
- Added `GET /api/hrms/v2/payroll/payslips/[id]`
  - Payslip detail endpoint with ownership guard for Employee role.
- Added `GET /api/hrms/v2/payroll/payslips/[id]/download`
  - Downloadable PDF payslip with gross, PF, ESI, PT, TDS, LWF, and net pay.

### Employee tax declaration APIs and payroll automation
- Added `GET /api/hrms/v2/payroll/tax-declaration`
  - Returns employee declaration plus TDS simulation.
- Added `PUT /api/hrms/v2/payroll/tax-declaration`
  - Saves employee declaration (`OLD/NEW`, 80C, 80D).
- Payroll generation and preview now consume declaration data:
  - `POST /api/hr/process-payroll`
  - `POST /api/hrms/v2/payroll/runs/preview`
- Added tax declaration store helper:
  - `lib/hrms/taxDeclarations.ts`
  - DB-first (`hr_tax_declarations`), file fallback (`tmp/tax-declarations.json`) when table is not yet present.

### Payroll UI enhancements
- Updated `app/team/payroll/page.tsx`:
  - Added Payroll Cycle Config panel.
  - Added Run Preview panel with computed totals.
  - Replaced direct client-side payroll run status update with secure checkpoint API action calls.
- Updated `app/hrms/v2/self-service/self-service-client.tsx`:
  - Added My Payroll payslip center list.
  - Added deduction-aware payroll rows (PF/ESI/PT/TDS).
  - Added authenticated Download Payslip action (PDF).
  - Added employee tax declaration form (regime + 80C + 80D) with save flow and TDS simulation.
- Updated `GET /api/hrms/v2/me`:
  - Payroll module now reports latest finalized/paid payslip summary for self-service dashboard use.

### Hire-to-payroll automation improvement
- Updated employee flows to initialize/use tax declarations:
  - `POST /api/hrms/v2/employees` seeds default declaration (`NEW`, 0, 0).
  - `PUT /api/hrms/v2/employees/[id]` supports tax fields (`tax_regime`, `declared_80c`, `declared_80d`) and persists declaration.
  - `app/hrms/v2/components/edit-employee-form.tsx` includes tax declaration inputs for HR users.

## Notes
- Existing payroll generation endpoint (`POST /api/hr/process-payroll`) remains the source for draft line item creation.
- New HRMS v2 payroll endpoints add policy controls and approval guardrails without changing existing payroll line item schema.
- Payroll config persistence is file-backed in `tmp/payroll-config.json` due enum constraints on `compliance_rules.rule_type`.
