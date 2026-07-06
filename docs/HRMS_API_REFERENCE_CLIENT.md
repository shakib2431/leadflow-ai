# HRMS API Reference (Client Handover)

Date: 2026-06-26
Base namespace: `/api/hrms/v2`

## 1) Authentication and authorization

- Production: bearer token required for protected endpoints.
- Local development: `x-dev-mode: true` can be used for controlled testing.
- Role enforcement applies on sensitive endpoints.

## 2) Core module endpoint map

### User and role context
- `GET /user-roles/me`
- `GET /me`

### Organization masters
- `GET/POST /business-entities`
- `PUT/DELETE /business-entities/[id]`
- `GET/POST /departments`
- `PUT/DELETE /departments/[id]`
- `GET/POST /designations`
- `PUT/DELETE /designations/[id]`

### Employee management
- `GET/POST /employees`
- `GET/PUT/DELETE /employees/[id]`
- `PATCH /employees/bulk`
- Service history and documents under employee child routes

### Leave and attendance
- `GET/POST /leave/requests`
- `PATCH/DELETE /leave/requests/[id]`
- `GET /leave/balance`
- `GET/POST /attendance`
- Corrections, sources, sync logs, exceptions under attendance child routes

### Payroll
- `GET/POST /payroll/runs`
- `POST /payroll/runs/preview`
- `POST /payroll/runs/[id]/checkpoint`
- `GET /payroll/payslips`
- `GET /payroll/payslips/[id]`
- `GET /payroll/payslips/[id]/download`
- `GET /payroll/dashboard`
- `GET /payroll/reports`
- `GET /payroll/reports/export`
- `GET/POST /payroll/salary-structures`
- `PUT/DELETE /payroll/salary-structures/[id]`
- `GET/PUT /payroll/config`
- `GET/PUT /payroll/tax-declaration`

### PF management
- `GET /pf/summary`
- `GET /pf/ledger`
- `GET /pf/returns/export`
- `GET/PUT /pf/registrations/[employeeId]`

### Reporting center
- `GET /reports/summary`
- `GET /reports/export`

### Phase 11 admin console
- `GET/PUT /admin/settings`
- `GET/PUT /admin/role-permissions`
- `GET /admin/audit-logs`
- `GET/PUT/POST /admin/backup-config`
- `GET/PUT /admin/permissions` (compat route)

### Health
- `GET /health`

## 3) Request/response behavior

- Success responses typically include `data`.
- List endpoints usually include pagination metadata when applicable.
- Error responses include `error` message and HTTP status.

## 4) Related contract docs

- Phase 11 contracts: `docs/HRMS_PHASE11_API_CONTRACTS.md`
- Deployment checks: `docs/HRMS_PHASE12_DEPLOYMENT_CHECKLIST.md`

## 5) Client integration recommendations

- Use role-aware API clients.
- Centralize bearer token attachment and refresh handling.
- Treat all admin mutations as audited operations.
- Prefer stable exports (`reports/export`, payroll and PF export routes) for external reporting pipelines.
