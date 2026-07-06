# HRMS UX Architecture Restructure Plan

## Scope and Guardrails

This plan is frontend-only.

Do not change:
- Backend APIs
- Database schema
- Auth and authorization
- Business logic
- Existing route contracts
- State logic behavior

Primary objective:
- Remove UX duplication
- Enforce Overview -> Workspace -> Detail architecture across HRMS
- Standardize information placement so each page has one job

## Three-Level Architecture Standard

### 1) Overview (Command Center)
Overview pages must contain only:
- Welcome / context
- Today status
- KPI strip
- Pending tasks
- Upcoming events
- Recent activity
- Quick actions

Overview pages must NOT contain:
- Large detailed tables
- Full forms
- Full history logs
- Full payroll/leave/attendance/profile workspaces

### 2) Workspace (Module Focus)
Each workspace holds complete module workflows:
- Attendance workspace: check-in/out, exceptions, trends, history
- Leave workspace: apply, balances, requests, policies, approvals
- Payroll workspace: salary summary, payslips, tax, declarations, downloads
- Profile workspace: all personal and employment records
- Recruitment workspace: pipeline board, interview details, offer actions
- Onboarding workspace: checklist execution and progress

### 3) Detail View
Record-focused view via drawer/page:
- Employee
- Candidate
- Leave request
- Attendance record/exception
- Payslip/run
- Offer/document

## Current Audit Findings

### Global navigation and shell
- Shared shell exists and is reusable:
  - app/hrms/v2/components/hrms-sidebar-nav.tsx
  - app/hrms/v2/components/hrms-top-header.tsx
  - app/globals.css
- Header/filter implementation exists but is not applied consistently across modules:
  - app/hrms/v2/components/hrms-header-with-filters.tsx

### Self-Service
- Current structure: one page contains profile + attendance + leave + calendar + payroll blocks in overview.
- Duplicate issue: overview includes detailed leave history, holiday list, payroll table, tax declaration.
- Files:
  - app/hrms/v2/self-service/self-service-client.tsx
  - app/hrms/v2/self-service/[tab]/page.tsx
  - app/hrms/v2/self-service/page.tsx

### HR Admin Dashboard
- Mostly command-center aligned already, but still carries broad lifecycle detail widgets.
- Should remain summary-first and route to module workspaces.
- File:
  - app/hrms/v2/admin-dashboard/page.tsx

### Employees
- Modern workspace exists at team/employees.
- Legacy duplicate directory still exists at team root pages.
- Duplicates/legacy:
  - app/team/page.tsx
  - app/team/[id]/page.tsx
- Primary workspace:
  - app/team/employees/page.tsx
  - app/team/employees/[id]/page.tsx

### Recruitment
- Dedicated workspace exists and is rich.
- Ensure no duplicate candidate detail blocks appear in overview pages.
- File:
  - app/team/recruitment/page.tsx

### Offer Management
- Dedicated workspace exists.
- Keep all offer progression operations here; overview pages should only show counts/alerts.
- File:
  - app/team/offer-management/page.tsx

### Pre-Onboarding and Onboarding
- Both module workspaces exist and already separate lifecycle stages.
- Ensure command centers only summarize and deep actions remain here.
- Files:
  - app/team/pre-onboarding/page.tsx
  - app/team/onboarding/page.tsx
  - app/team/onboarding/[employeeId]/page.tsx

### Attendance
- Dedicated workspace exists and includes exceptions, source sync, correction handling.
- Avoid repeating detailed attendance list/history on overview pages.
- Files:
  - app/team/attendance/page.tsx
  - app/team/attendance-exceptions/page.tsx

### Leave
- Dedicated leave workspace exists and includes requests + balances.
- Overview pages should not embed full leave history and approvals table.
- File:
  - app/team/leave/page.tsx

### Payroll
- Dedicated payroll workspace exists and includes preview/run/report controls.
- Overview pages should not repeat full payroll tables and declarations.
- File:
  - app/team/payroll/page.tsx

### Reports
- Dedicated reports workspace exists.
- Keep chart/report details here only.
- File:
  - app/hrms/v2/reports/page.tsx

### Administration and Organization Setup
- Admin is currently multi-domain and heavy.
- Organization setup launchpad exists and should stay summary/action oriented.
- Files:
  - app/hrms/v2/admin/page.tsx
  - app/hrms/v2/organization/page.tsx

## Duplication Map (High Priority)

1. Self-Service overview duplicates multiple full workspaces
- Keep overview as summary + quick links only
- Move complete details to tabs:
  - attendance, leave, payroll, profile, calendar

2. Legacy team pages duplicate employee directory behavior
- Treat app/team/page.tsx and app/team/[id]/page.tsx as legacy
- Direct primary usage to team/employees routes

3. Dashboard-to-workspace boundaries inconsistent in some modules
- Ensure dashboards show only:
  - KPI count
  - pending tasks
  - latest activity
  - CTA into module workspace

## Target Information Ownership

- Attendance history ownership: Attendance workspace only
- Leave history ownership: Leave workspace only
- Payroll history ownership: Payroll workspace only
- Profile full details ownership: Profile workspace only
- Document vault ownership: Employee detail/Profile workspace only
- Offer progression ownership: Offer Management workspace only

## Implementation Plan (Frontend Only)

### Phase 1: Foundation (shared UX system)
- Finalize reusable primitives in global system:
  - page shell
  - section cards
  - KPI strip
  - toolbar row
  - compact table shell
  - empty/skeleton states
- Use existing shared shell components as source of truth.

### Phase 2: Self-Service architecture correction
- Overview tab becomes command center only.
- Remove full-detail blocks from overview.
- Keep each tab as full dedicated workspace.

### Phase 3: Workforce modules consistency
- Apply same toolbar/table/card grammar to:
  - team/employees
  - team/recruitment
  - team/offer-management
  - team/pre-onboarding
  - team/onboarding
  - team/attendance
  - team/attendance-exceptions
  - team/leave
  - team/payroll

### Phase 4: Admin and Reports consistency
- Normalize reports/admin surfaces to same page hierarchy:
  - title/subtitle
  - KPI strip
  - filter toolbar
  - workspace panel
  - pagination/actions

### Phase 5: Legacy cleanup routing UX
- Keep existing route behavior, but de-emphasize or redirect legacy duplicate UI surfaces where safe from frontend.

## Quality Gates

A module is complete only if:
- No duplicated full-detail data appears on its overview
- Workspace contains complete task execution for that module
- Detail views are focused and not duplicated elsewhere
- Shared toolbar/card/table primitives are reused
- Above-the-fold density improves
- Mobile and keyboard navigation remain usable

## Execution Order

1. Self-Service architecture split (overview summaries only)
2. Employees and Attendance consistency
3. Leave and Payroll consistency
4. Recruitment and Offer Management consistency
5. Pre-Onboarding and Onboarding consistency
6. Reports and Administration consistency

