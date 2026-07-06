# HRMS Phase 4 Progress (Leave Management)

Date: 2026-06-26

## Scope started
Phase 4 - Leave management foundation for employee self-service and admin workflows.

## Implemented in this step

### Leave request APIs
- `GET /api/hrms/v2/leave/requests`
  - Role-aware list retrieval.
  - Employee: returns only own leave requests via scoped employee resolution.
  - HR Admin / HR Executive: supports global listing with optional filters (`status`, `employee_id`) and pagination (`page`, `pageSize`).
- `POST /api/hrms/v2/leave/requests`
  - Employee: creates own leave request.
  - HR Admin / HR Executive: can create for a target employee (`employee_id`).
  - Includes date validation and automatic `days_count` computation.
- `PATCH /api/hrms/v2/leave/requests/[id]`
  - HR Admin / HR Executive: status update flow (`pending`, `approved`, `rejected`).
- `DELETE /api/hrms/v2/leave/requests/[id]`
  - Employee: withdraw own pending leave request.
  - HR Admin / HR Executive: delete any leave request.

### Employee self-service leave UX
- Updated `app/hrms/v2/self-service/self-service-client.tsx`:
  - Added "Request Leave" form with leave type and date range fields.
  - Added submit action wired to `POST /api/hrms/v2/leave/requests`.
  - Added withdraw action for pending requests wired to `DELETE /api/hrms/v2/leave/requests/[id]`.
  - Existing leave history list now supports in-place withdraw for pending entries.
  - Added leave balance/accrual cards in leave tab.

### Leave balance and accrual API
- Added `GET /api/hrms/v2/leave/balance`
  - Employee-scoped retrieval for self-service users.
  - Admin query support using `employee_id`.
  - Policy-driven accrual calculation for `casual`, `sick`, `earned`, `unpaid`.
  - Returns accrued, used, pending, and available per leave type.

### Admin approvals: Leave + Attendance Corrections
- Updated `app/hrms/v2/admin/page.tsx`:
  - Added pending leave approvals panel with Approve/Reject actions.
  - Added pending attendance corrections panel with review notes and Approve/Reject actions.
- Leave approval action wiring:
  - `PATCH /api/hrms/v2/leave/requests/[id]` for admin review status updates.
- Attendance correction review action wiring:
  - `PUT /api/hrms/v2/attendance/corrections/[id]` for approve/reject processing.

### Attendance correction workflow hardening
- Updated `GET /api/hrms/v2/attendance/corrections`
  - Added pagination metadata and optional `employee_id` filter.
- Updated `POST /api/hrms/v2/attendance/corrections`
  - Added minimum reason validation.
  - Prevents no-op correction requests (same as current status).
  - Prevents duplicate pending correction for same employee/date.
- Updated `PUT /api/hrms/v2/attendance/corrections/[id]`
  - Enforces rejection note requirement.
  - Blocks review for future-dated correction requests.

## Validation completed
- Type/diagnostic checks: no errors in modified files.
- API smoke tests completed:
  - Create leave request: success.
  - List leave requests: success.
  - Withdraw request: success.
  - Leave balance endpoint: success.
  - Admin leave approval: success.
  - Attendance correction create + admin approval: success.
- UI verification completed:
  - Self-service Leave page renders request form and pending request with "Withdraw Request" action.
  - Self-service Leave page renders leave balance/accrual cards.
  - Admin page renders pending leave approvals and pending attendance correction review panels.

## Notes
- `leave_requests.status` is backed by enum values that include `pending`, `approved`, `rejected`.
- Employee "cancel" behavior is implemented as request withdrawal (DELETE) to stay enum-safe.
