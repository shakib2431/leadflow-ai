# HRMS Phase 11 API Contracts

Date: 2026-06-26
Base path: `/api/hrms/v2/admin`
Auth: bearer token in production, `x-dev-mode: true` supported for local development.

## 1) Settings

### GET `/settings`
Role access: `HR Admin`, `HR Executive`

Response 200
```json
{
  "data": {
    "default_currency": "INR",
    "timezone": "Asia/Kolkata",
    "attendance_cutoff_day": 25,
    "leave_auto_approval": false,
    "payroll_approval_required": true
  }
}
```

### PUT `/settings`
Role access: `HR Admin`

Request
```json
{
  "default_currency": "INR",
  "timezone": "Asia/Kolkata",
  "attendance_cutoff_day": 24,
  "leave_auto_approval": true,
  "payroll_approval_required": true
}
```

Response 200
```json
{
  "data": {
    "default_currency": "INR",
    "timezone": "Asia/Kolkata",
    "attendance_cutoff_day": 24,
    "leave_auto_approval": true,
    "payroll_approval_required": true
  }
}
```

## 2) Role Permissions

### GET `/role-permissions`
Role access: `HR Admin`, `HR Executive`

Response 200
```json
{
  "data": [
    {
      "role": "HR Admin",
      "permission_key": "manage_entities",
      "is_allowed": true
    }
  ],
  "permission_keys": [
    "manage_entities",
    "manage_departments",
    "manage_designations",
    "manage_user_roles",
    "manage_payroll",
    "manage_pf",
    "view_reports",
    "export_reports",
    "manage_attendance_sources",
    "manage_attendance_exceptions",
    "manage_settings",
    "view_audit_logs",
    "manage_backup_config"
  ]
}
```

### PUT `/role-permissions`
Role access: `HR Admin`

Request
```json
{
  "rows": [
    {
      "role": "HR Executive",
      "permission_key": "view_reports",
      "is_allowed": true
    }
  ]
}
```

Response 200
```json
{
  "data": [
    {
      "role": "HR Executive",
      "permission_key": "view_reports",
      "is_allowed": true
    }
  ],
  "permission_keys": [
    "manage_entities",
    "manage_departments",
    "manage_designations",
    "manage_user_roles",
    "manage_payroll",
    "manage_pf",
    "view_reports",
    "export_reports",
    "manage_attendance_sources",
    "manage_attendance_exceptions",
    "manage_settings",
    "view_audit_logs",
    "manage_backup_config"
  ]
}
```

Notes:
- Unknown `permission_key` values are ignored.
- Matrix reads return the full baseline matrix with stored overrides.

## 3) Audit Logs

### GET `/audit-logs?page=1&pageSize=25&action=&actor_role=&q=`
Role access: `HR Admin`, `HR Executive`

Query params:
- `page` integer >= 1
- `pageSize` integer 1..200
- `action` optional exact action filter
- `actor_role` optional exact role filter
- `q` optional text search over `action`, `entity_type`, `actor_email`

Response 200
```json
{
  "data": [
    {
      "action": "backup_run_triggered",
      "entity_type": "admin_console",
      "entity_id": "dbf13d9a-3764-4cb3-81de-9b5b63b206fa",
      "actor_id": "dev-user",
      "actor_email": "dev@example.com",
      "actor_role": "HR Admin",
      "request_id": null,
      "metadata": {
        "snapshot_path": "tmp/hrms-backups/dbf13d9a-3764-4cb3-81de-9b5b63b206fa.json"
      },
      "created_at": "2026-06-26T06:26:36.268Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 16,
    "totalPages": 1
  }
}
```

## 4) Backup Config

### GET `/backup-config`
Role access: `HR Admin`, `HR Executive`

Response 200
```json
{
  "data": {
    "config": {
      "enabled": true,
      "frequency": "daily",
      "retention_days": 90,
      "storage_target": "local_tmp",
      "notes": "",
      "last_backup_at": null
    },
    "runs": [
      {
        "id": "dbf13d9a-3764-4cb3-81de-9b5b63b206fa",
        "config_name": "primary",
        "status": "completed",
        "snapshot_path": "tmp/hrms-backups/dbf13d9a-3764-4cb3-81de-9b5b63b206fa.json",
        "summary": {
          "employees": 8,
          "attendance_records": 9,
          "leave_requests": 2,
          "payroll_runs": 2,
          "payroll_line_items": 5
        },
        "triggered_by": "dev-user",
        "created_at": "2026-06-26T06:26:36.268Z"
      }
    ]
  }
}
```

### PUT `/backup-config`
Role access: `HR Admin`

Request
```json
{
  "enabled": true,
  "frequency": "weekly",
  "retention_days": 120,
  "storage_target": "local_tmp",
  "notes": "phase11 smoke"
}
```

Response 200
```json
{
  "data": {
    "enabled": true,
    "frequency": "weekly",
    "retention_days": 120,
    "storage_target": "local_tmp",
    "notes": "phase11 smoke",
    "last_backup_at": null
  }
}
```

### POST `/backup-config`
Role access: `HR Admin`

Request
```json
{}
```

Response 200
```json
{
  "data": {
    "id": "dbf13d9a-3764-4cb3-81de-9b5b63b206fa",
    "config_name": "primary",
    "status": "completed",
    "snapshot_path": "tmp/hrms-backups/dbf13d9a-3764-4cb3-81de-9b5b63b206fa.json",
    "summary": {
      "employees": 8,
      "attendance_records": 9,
      "leave_requests": 2,
      "payroll_runs": 2,
      "payroll_line_items": 5
    },
    "triggered_by": "dev-user",
    "created_at": "2026-06-26T06:26:36.268Z"
  }
}
```

## Error Model (all endpoints)

Example error response
```json
{
  "error": "Failed to fetch audit logs"
}
```

Typical statuses:
- `400` invalid payload or processing failure
- `401` unauthenticated
- `403` role not permitted
- `500` server failure
