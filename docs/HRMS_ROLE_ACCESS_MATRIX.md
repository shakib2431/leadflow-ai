HRMS Role Access Matrix
=======================

Goal
----

Define a client-ready role model for HRMS where employees only see self-service modules and HR teams manage organization-wide workflows.

Roles
-----

- Employee: Self-service only (own records and requests).
- HR Executive: Operational HR management across all employees.
- HR Admin: Full control including masters, roles, templates, and audits.

Module Access (Target State)
----------------------------

1) Employee Self-Service
- Employee: Allowed
- HR Executive: Allowed
- HR Admin: Allowed
- Features:
  - My profile
  - My attendance
  - My leave balance and applications
  - My payslips, salary and tax documents
  - My documents and onboarding tasks
  - Work mode selection (office/remote/wfh)

2) Time and Attendance
- Employee: Own attendance, own corrections, own WFH/remote updates
- HR Executive: All employees attendance, correction approvals, attendance controls
- HR Admin: Same as HR Executive + policy controls

3) Leave and Holidays
- Employee: Apply leave, track approvals, calendar and holiday list
- HR Executive: Team leave approvals and planning
- HR Admin: Full leave policy and holiday calendar management

4) Payroll and Payslips
- Employee: Own salary slips, tax statements and payroll history
- HR Executive: Payroll processing and payroll reports
- HR Admin: Payroll controls, lock periods, salary structure governance

5) Recruitment and Onboarding
- Employee: Limited to assigned onboarding tasks and submitted docs
- HR Executive: Hiring pipeline and onboarding operations
- HR Admin: Full access and policy controls

6) HRMS Admin
- Employee: Not allowed
- HR Executive: Allowed
- HR Admin: Allowed
- Features:
  - Business entities, departments, designations
  - Role assignments
  - Letter templates and versioning
  - System-level HR controls

Navigation Rules (Client Build)
-------------------------------

Employee sidebar should show:
- My HRMS
- Time and PTO
- Leave and Holidays
- Payroll and Payslips
- Documents

Employee sidebar must hide:
- HRMS Admin
- Hiring Pipeline
- Organization master setup modules

HR sidebar should show:
- HRMS v2
- HRMS Admin
- Hiring Pipeline
- Onboarding
- Directory
- Time and PTO
- Payroll Prep

Security Requirements
---------------------

Every role restriction must be enforced in two layers:

1) UI visibility
- Hide menu links and restricted actions for unauthorized roles.

2) API authorization
- Validate role on every protected endpoint.
- Return 403 for unauthorized role access even if URL is known.

Phase Plan Aligned to Client Requirement
----------------------------------------

Phase A: Navigation and Role Guard Rails
- Role-based sidebar visibility
- Restricted page guard for HRMS Admin
- Employee-only self-service navigation shell

Phase B: Employee Self-Service Expansion
- My profile page
- My attendance and leave history
- My documents and onboarding checklist
- Work mode preferences (office/remote/wfh)

Phase C: Payroll and Tax Self-Service
- Employee payslip center
- Salary and tax summary
- Downloadable payroll documents

Phase D: HR Operations Completion
- Attendance report suite
- Leave dashboards
- Payroll operations hardening
- Audit and reporting controls
