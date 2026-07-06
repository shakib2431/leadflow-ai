# HRMS Phase 6 Progress (Biometric & Online Attendance)

Date: 2026-06-26

## Scope started
Phase 6 - provider-agnostic attendance source integration and sync operations.

## Implemented in this step

### Attendance source integration backend
- Added source management helper:
  - `lib/hrms/attendanceSources.ts`
  - DB-first with file fallback for rollout safety:
    - Source fallback file: `tmp/attendance-sources.json`
    - Sync log fallback file: `tmp/attendance-sync-logs.json`
- Added source lifecycle APIs:
  - `GET /api/hrms/v2/attendance/sources`
    - Role-aware access (`HR Admin`, `HR Executive`).
  - `POST /api/hrms/v2/attendance/sources`
    - Role-aware access (`HR Admin`).
    - Supports providers: `manual`, `biometric_csv`, `biometric_api`.
- Added source sync API:
  - `POST /api/hrms/v2/attendance/sources/[id]/sync`
    - Role-aware access (`HR Admin`, `HR Executive`).
    - Validates source and statuses.
    - Upserts to `attendance_records` with created/updated counting.
    - Writes sync logs with success/failure details.
- Added sync logs API:
  - `GET /api/hrms/v2/attendance/sync-logs`
    - Supports source filter and limit controls.

### CSV ingestion with validation and error artifacts
- Added CSV upload API:
  - `POST /api/hrms/v2/attendance/sources/[id]/upload`
  - Supports both multipart file upload (`file`) and JSON ingestion (`csv_text`) for integration flexibility.
  - Validates status/date and employee resolution (`employee_id` or `employee_code`).
  - Writes invalid-row artifact report under `tmp/attendance-sync-artifacts/*.json`.
  - Executes sync for valid rows and returns combined upload+sync summary.

### Biometric webhook contract (signed ingestion)
- Added provider webhook API:
  - `POST /api/hrms/v2/attendance/webhooks/[provider]`
  - Current supported provider contract: `biometric_api`.
  - Verifies HMAC SHA256 signature (`x-attendance-signature` or `x-signature`) using `ATTENDANCE_WEBHOOK_SECRET`.
  - Validates payload and source-provider compatibility before syncing attendance records.
  - Added provider-specific adapter scaffold path with audit metadata support:
    - `lib/hrms/biometric-adapters/index.ts`
    - `lib/hrms/biometric-adapters/zkteco.ts`
  - Source config can now drive vendor mapping (for example `config.vendor = "zkteco"`).

### Sync artifact download and retry controls
- Added artifact download API:
  - `GET /api/hrms/v2/attendance/sync-artifacts/[id]`
  - Returns artifact JSON as downloadable attachment for operations/audit review.
- Added retry/replay API for failed sync logs:
  - `POST /api/hrms/v2/attendance/sync-logs/[id]/retry`
  - Replays original sync using stored entry snapshot in log details.
- Enhanced sync log detail metadata:
  - Stores entry snapshots (`details.entries`) for replay support.
  - Stores artifact references (`artifact_id`, `artifact_file`) when CSV upload produces invalid-row reports.
  - Stores webhook adapter audit fields for forensic traceability.

### Source health metrics for admin operations
- Added metrics API:
  - `GET /api/hrms/v2/attendance/sources/metrics`
  - Computes per-source totals, success/failure counts, failure rate, average sync latency, and latest success/failure timestamps.
- Updated admin UI:
  - `app/hrms/v2/admin/page.tsx` now includes "Attendance Source Health (Phase 6)" panel.
  - Added "Failed Attendance Sync Logs" panel with:
    - Retry action
    - Artifact download action (when artifact id is available)

### Attendance integration frontend (team attendance)
- Updated `app/team/attendance/page.tsx` with Phase 6 control center:
  - Create attendance source form.
  - Run source sync panel with sync date + default status controls.
  - CSV upload and sync form.
  - Latest sync log panel with status and record counts.
  - Refresh action and loading/error/success state handling.

### Migration added
- Added `scripts/migrations/010_phase6_attendance_sources.sql` containing:
  - `attendance_sources`
  - `attendance_sync_logs`
  - constraints and indexes for operational queries.

## Validation completed
- Type/diagnostic checks show no errors in:
  - `lib/hrms/attendanceSources.ts`
  - `app/api/hrms/v2/attendance/sources/route.ts`
  - `app/api/hrms/v2/attendance/sources/[id]/sync/route.ts`
  - `app/api/hrms/v2/attendance/sources/[id]/upload/route.ts`
  - `app/api/hrms/v2/attendance/sources/metrics/route.ts`
  - `app/api/hrms/v2/attendance/webhooks/[provider]/route.ts`
  - `app/api/hrms/v2/attendance/sync-artifacts/[id]/route.ts`
  - `app/api/hrms/v2/attendance/sync-logs/[id]/retry/route.ts`
  - `app/api/hrms/v2/attendance/sync-logs/route.ts`
  - `lib/hrms/biometric-adapters/index.ts`
  - `lib/hrms/biometric-adapters/zkteco.ts`
- API smoke tests:
  - Source create + sync + logs retrieval: success.
  - JSON CSV upload flow: success with mixed valid/invalid rows and artifact generation.
  - Artifact download endpoint: success.
  - Source metrics endpoint: success.
  - Webhook route returns expected deployment prerequisite error (`ATTENDANCE_WEBHOOK_SECRET` missing) in current dev runtime.

## Notes
- Current sync endpoint accepts normalized source entries payload for deterministic ingestion.
- This establishes the Phase 6 integration contract while allowing provider-specific adapter implementation without API breaking changes.
- For production rollout, apply migration `010_phase6_attendance_sources.sql` before enabling DB-backed source/log persistence.
