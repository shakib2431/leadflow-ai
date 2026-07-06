# HRMS Client Scope - Architecture Review Document

Date: 2026-06-28
Mode: Client Scope Only
Rule: No features outside approved roadmap phases.

## 1. Objective
This document is the Phase 1 deliverable requested in the roadmap:
- Analyze current structure.
- Review auth, DB, APIs, and reusable UI.
- Produce gap analysis against Phases 2-14.
- Define implementation plan before further feature work.

## 2. Current System Analysis

### 2.1 Tech and Structure
- Frontend/Backend framework: Next.js App Router.
- Language: TypeScript.
- Data platform: Supabase.
- APIs: Route handlers under app/api/hrms/v2.
- Primary HRMS pages under app/hrms/v2 and app/team.

### 2.2 Current HRMS UI Surfaces
- Employee hub/list: app/hrms/v2/page.tsx.
- Employee profile: app/hrms/v2/employees/[id]/page.tsx.
- Self-service shell: app/hrms/v2/self-service/page.tsx.
- Self-service tab route: app/hrms/v2/self-service/[tab]/page.tsx.
- Organization/admin console: app/hrms/v2/admin/page.tsx.
- Reporting center: app/hrms/v2/reports/page.tsx.
- Shared HR sidebar: app/hrms/v2/components/hrms-sidebar-nav.tsx.

### 2.3 Current HRMS API Footprint (Observed)
- User roles: /api/hrms/v2/user-roles, /me.
- Organization setup: /business-entities, /departments, /designations.
- Employees: /employees and nested routes.
- Letters/templates: /letter-templates and /preview.
- Attendance: corrections, source metrics, sync logs, exceptions.
- Leave: requests and balance.
- Payroll/PF: payroll endpoints and PF summary/ledger/returns.
- Reporting: /reports/summary and /reports/export.
- Admin: /admin/settings, /admin/role-permissions, /admin/audit-logs, /admin/backup-config.

### 2.4 Reusable Components/Patterns
- Shared nav shell: app/hrms/v2/components/hrms-sidebar-nav.tsx.
- Existing panel/button/chip style system: app/globals.css (.hrms-* classes).
- Reusable employee edit form: app/hrms/v2/components/edit-employee-form.tsx.
- Existing notification/context plumbing: app/layout.tsx + lib/notification-context.tsx.

## 3. Authentication and Authorization Review

### 3.1 Current State
- Login exists in workspace.
- Role checking is implemented in HRMS APIs and admin/report pages.
- Dev-mode bypass headers are used for local development.

### 3.2 Gaps vs Roadmap
- Password reset flow must be verified end-to-end in client UX.
- Role permissions must be consistently enforced at all UI entry points and APIs.
- Centralized guard policy should be documented and test-covered.

## 4. Database and Schema Review

### 4.1 Current State
- Employees and related HR tables are active.
- Organization structure (entities/departments/designations) exists.
- Attendance, payroll, PF, reporting, and admin operational tables/endpoints are present.

### 4.2 Gaps vs Roadmap
- Final schema docs need to be consolidated and versioned clearly by phase.
- Data validation constraints must be cross-checked against all API payload contracts.
- Backup/recovery schema-level verification needs formal checklists.

## 5. API Architecture Review

### 5.1 Current State
- Broad roadmap coverage is present under /api/hrms/v2.
- APIs already support many required phase capabilities.

### 5.2 Gaps vs Roadmap
- Endpoint contract standardization needs a single reference source of truth.
- Consistent response/error envelope across all HRMS APIs should be confirmed.
- Phase-level regression tests are needed for all critical routes.

## 6. UI Architecture and Layout Review

### 6.1 Current Issues Observed
- Naming ambiguity confused users (example: generic HRMS labels).
- Reporting hero readability previously looked low-contrast/blurred.
- Admin page information density was too high and hard to scan.
- Employee list metadata presentation had placeholder-like visual noise.

### 6.2 Target Layout Direction (Based on Provided Reference)
Adopt a clean enterprise shell with:
- Left persistent sidebar grouped by function.
- Top utility row (search/actions/profile).
- Distinct metric cards with strong hierarchy.
- Sectioned content blocks using compact, readable cards.
- Collapsible operational sections for dense admin workflows.
- Clear role/context labels and explicit action language.

### 6.3 UI System Rules
- Keep one shared HR style token system in app/globals.css.
- Reuse panel/button/chip primitives; avoid page-specific ad hoc styles.
- Every page must include: loading, empty, success, and error states.
- Preserve responsive behavior from desktop down to tablet/mobile.

## 7. Gap Analysis by Roadmap Phase

### Phase 2 - Core Platform
Status: Mostly implemented, needs hardening.
- Auth/login present.
- Roles/org setup present.
- Remaining: strict auth-path consistency, reset/logout UX validation, full RBAC test coverage.

### Phase 3 - Employee Management
Status: Implemented with UX refinements ongoing.
- Employee CRUD/list/profile/archive/search/filter present.
- Remaining: final profile completeness and UX polish for data-rich rows.

### Phase 4 - Offer and Appointment Letters
Status: Implemented baseline.
- Templates, preview/merge, and generation flows exist.
- Remaining: final PDF lifecycle validation and edge-case handling.

### Phase 5 - Attendance Management
Status: Implemented baseline.
- Core attendance/corrections and monitoring features exist.
- Remaining: final report UX consistency and exception follow-up polish.

### Phase 6 - Biometric and Online Attendance
Status: Implemented baseline.
- Provider/source metrics and sync logs are present.
- Remaining: integration docs and operational fallback playbooks.

### Phase 7 - Attendance Exceptions
Status: Implemented baseline.
- Exception queue, status transitions, and resolution notes present.
- Remaining: dashboard-level surfacing consistency and follow-up UX refinement.

### Phase 8 - Payroll
Status: Implemented baseline.
- Payroll workflows and summary/reporting APIs exist.
- Remaining: payslip UX consistency and regression coverage.

### Phase 9 - PF Management
Status: Implemented baseline.
- PF summary/ledger/returns flow present.
- Remaining: UX compression for admin productivity and edge-case tests.

### Phase 10 - Reporting
Status: Implemented baseline with readability issues being corrected.
- Reporting center and export APIs exist.
- Remaining: high-clarity visual language and filter UX consistency.

### Phase 11 - Administration
Status: Implemented, now under structural UX cleanup.
- Settings, permissions, audit, backup, and operations exist.
- Remaining: fully polished collapsible-card architecture and workflow discoverability.

### Phase 12 - Deployment
Status: Documentation/checklists present; requires final validation pass.

### Phase 13 - Documentation
Status: Broad docs exist; needs final alignment with latest UI/labels/routes.

### Phase 14 - Support Readiness
Status: Artifacts exist; requires verification against current build and handover checklist freeze.

## 8. Implementation Plan (Next Execution Sequence)

### Step 1 - UI/Terminology Normalization (Immediate)
- Standardize naming in sidebar and page headers:
  - Employee Hub
  - Organization Setup
  - Reporting Center
- Remove ambiguous labels and ensure CTA language matches user intent.

### Step 2 - Admin Console Layout Refactor
- Convert dense admin sections into clear collapsible cards.
- Keep all existing functionality unchanged.
- Improve scanability and reduce cognitive load.

### Step 3 - Reporting Readability Pass
- Improve typography contrast, reduce blur effect, increase visual clarity.
- Keep export/filter behavior unchanged.

### Step 4 - Consistency Pass Across HRMS Pages
- Apply shared spacing, card, button, and chip standards.
- Verify responsive behavior on major breakpoints.

### Step 5 - Validation and Documentation Sync
- Verify no TS/errors on touched files.
- Update docs with final label map and navigation conventions.
- Produce phase checklist status update.

## 9. Definition of Done Enforcement
No phase is marked complete without:
- Schema
- APIs
- Validation
- Error handling
- Responsive UI
- Loading/empty/success/error states
- Required reports/PDF outputs
- Security checks
- Documentation updates

## 10. Decision Log for Current Iteration
- Continue with client roadmap only.
- Prioritize UX clarity and structure over adding new modules.
- Use clean enterprise layout direction from supplied reference image.
- Keep existing backend and business logic intact while improving IA and presentation.
