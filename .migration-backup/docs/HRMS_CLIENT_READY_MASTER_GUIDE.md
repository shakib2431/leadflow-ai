# HRMS Client Ready Master Guide

Date: 2026-06-26
Version: 1.0
Product: LeadFlow AI CRM with integrated HRMS module

## Purpose

This document is the client handover entry point for the HRMS section inside your CRM. It explains:
- where HRMS appears in navigation
- which users can access what
- the end-to-end operational flow
- where to find detailed setup, admin, user, API, and deployment guides

## 1) Where HRMS lives in the CRM

HRMS is delivered as an integrated module inside the same CRM deployment.

Primary route namespace:
- `/hrms/v2`

Core HRMS pages:
- HRMS Landing: `/hrms/v2`
- HRMS Admin: `/hrms/v2/admin`
- HRMS Reports: `/hrms/v2/reports`
- Employee Self-Service: `/hrms/v2/self-service`

Related operational pages still used by HR teams:
- Directory: `/team`
- Time and Attendance: `/team/attendance`
- Payroll Prep: `/team/payroll`
- Hiring Pipeline: `/team/recruitment`
- Onboarding: `/team/onboarding`

## 2) Sidebar structure for client usage

In the current product sidebar, HRMS appears under `HRMS Portal` with these entries:
- HRMS v2
- Employee Self-Service
- HRMS Admin
- Hiring Pipeline
- Onboarding
- Directory
- Time and PTO
- Payroll Prep

### Recommended client-facing interpretation

- Employee-facing navigation:
  - My Hub
  - My Profile
  - My Attendance
  - My Leave
  - My Calendar
  - My Payroll
  - Work Mode

- HR-facing navigation:
  - HRMS v2
  - HRMS Admin
  - Hiring Pipeline
  - Onboarding
  - Directory
  - Time and PTO
  - Payroll Prep
  - Reporting Center

## 3) Role access model

### Employee
- Access: self-service data and actions for own records only.
- Typical pages: `/hrms/v2/self-service` and child tabs.

### HR Executive
- Access: operational HR workflows across all employees.
- Typical pages: `/hrms/v2`, `/team/attendance`, `/team/payroll`, `/hrms/v2/reports`, `/hrms/v2/admin` (as allowed).

### HR Admin
- Access: full HR operations + administrative controls.
- Includes settings, role permissions, audit logs, and backup config in `/hrms/v2/admin`.

## 4) End-to-end operating flow

### Flow A: Organization and master setup
1. Open `/hrms/v2/admin`.
2. Configure business entities, departments, designations, and role assignments.
3. Verify letter templates for offer/appointment/contract lifecycle.

### Flow B: Recruitment and onboarding
1. Use `/team/recruitment` to progress candidates.
2. Trigger onboarding and employee activation.
3. Use `/team/onboarding` and employee profile routes for completion and document steps.

### Flow C: Time, leave, and attendance controls
1. Use `/team/attendance` for source health, sync logs, corrections, and exceptions.
2. Approve correction requests and close exceptions.
3. Employees use `/hrms/v2/self-service/attendance` and `/hrms/v2/self-service/leave`.

### Flow D: Payroll and PF cycle
1. Use `/team/payroll` and payroll APIs for preview and processing.
2. Validate salary structures and run-level outputs.
3. Use PF summary/ledger/returns exports.
4. Employees access payroll details from self-service payroll tab.

### Flow E: Reporting and compliance outputs
1. Open `/hrms/v2/reports` for consolidated reporting.
2. Export CSV/JSON/PDF as needed.
3. Use `/hrms/v2/admin` audit logs and backup panel for governance evidence.

## 5) What is complete up to this handover point

- Phase 8: payroll lifecycle + dashboard/reports + export and hardening
- Phase 9: PF management suite
- Phase 10: reporting center
- Phase 11: admin console hardening
- Phase 12: deployment hardening baseline and verification artifacts

## 6) Detailed guide pack

Use these documents for client onboarding and operations:
- Installation and go-live: `docs/HRMS_INSTALLATION_AND_GO_LIVE.md`
- Admin operations: `docs/HRMS_ADMIN_OPERATIONS_GUIDE.md`
- Employee user guide: `docs/HRMS_EMPLOYEE_USER_GUIDE.md`
- API reference: `docs/HRMS_API_REFERENCE_CLIENT.md`
- Deployment runbook: `docs/HRMS_DEPLOYMENT_RUNBOOK.md`
- Phase 12 deployment checklist: `docs/HRMS_PHASE12_DEPLOYMENT_CHECKLIST.md`
- End-to-end production-like test program: `docs/HRMS_END_TO_END_PRODUCTION_LIKE_TEST_PROGRAM.md`
- Staging setup and data feeding guide: `docs/HRMS_STAGING_SETUP_AND_DATA_FEEDING_GUIDE.md`
- Monitoring and alerting standard: `docs/HRMS_MONITORING_AND_ALERTING_STANDARD.md`
- Recovery runbook: `docs/HRMS_RECOVERY_RUNBOOK.md`
- Customization guidelines: `docs/HRMS_CUSTOMIZATION_GUIDELINES.md`
- Handover checklist: `docs/HRMS_HANDOVER_CHECKLIST.md`
- Phase 14 progress tracker: `docs/HRMS_PHASE14_PROGRESS.md`

## 7) Acceptance checklist for client sign-off

- HR Admin can open and use `/hrms/v2/admin` end-to-end.
- HR Executive can operate attendance, payroll, PF, and reporting workflows.
- Employee can access only self-service routes and own data views.
- Report exports and payroll/PF exports work in client environment.
- Deployment verifier passes in target environment.
