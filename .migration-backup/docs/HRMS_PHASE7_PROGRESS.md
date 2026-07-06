# HRMS Phase 7 Progress (Attendance Exceptions)

Date: 2026-06-26

## Scope started
Phase 7 - attendance exception detection, follow-up workflow, and exception dashboard queue.

## Implemented in this step

### Exception engine and persistence layer
- Added `lib/hrms/attendanceExceptions.ts` with:
  - Exception types:
    - `missing_attendance`
    - `unplanned_absence`
    - `pending_correction`
    - `repeated_absence`
  - Detection logic for a target date using attendance, leave, and correction datasets.
  - Status workflow support:
    - `open`, `in_review`, `resolved`, `dismissed`
  - Summary aggregation by severity and type.
  - DB-first with file fallback (`tmp/attendance-exceptions.json`) for rollout safety.

### Exception APIs
- Added `GET /api/hrms/v2/attendance/exceptions`
  - Role-aware list retrieval with filters and pagination.
  - Employee scope enforcement for Employee role.
  - Includes exception summary payload.
- Added `POST /api/hrms/v2/attendance/exceptions`
  - Role-aware trigger (`HR Admin`, `HR Executive`) to run exception detection.
- Added `PATCH /api/hrms/v2/attendance/exceptions/[id]`
  - Follow-up workflow updates (`in_review`, `resolved`, `dismissed`).
  - Requires resolution note for resolved/dismissed actions.

### Admin dashboard integration
- Updated `app/hrms/v2/admin/page.tsx`:
  - Added "Attendance Exceptions Queue (Phase 7)" panel.
  - Added "Run Detection" action.
  - Added queue actions:
    - Mark In Review
    - Resolve
    - Dismiss
  - Added summary cards for open/high-risk indicators.

### Migration added
- Added `scripts/migrations/011_phase7_attendance_exceptions.sql` with:
  - `attendance_exceptions` table
  - uniqueness constraint on `(employee_id, date, exception_type)`
  - status/severity/type checks
  - operational indexes for queue/filter retrieval

## Notes
- Exception detection is deterministic for a selected date and idempotent via unique upsert key.
- The Phase 7 queue is now actionable and integrated in admin workflow.
