# HRMS Phase 12 Deployment Checklist

Date: 2026-06-26
Owner: Engineering
Status: In Progress

## 1) Pre-Deploy Hardening

- [x] Security headers configured at framework level (`next.config.ts`).
- [x] Liveness endpoint added: `/api/health`.
- [x] HRMS module liveness endpoint added: `/api/hrms/v2/health`.
- [x] Deployment verification script added: `scripts/verify_phase12_deployment.js`.
- [x] Deployment verification command added: `npm run verify:phase12-deployment`.

## 2) Runtime Configuration Requirements

Critical environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended operational environment variables:
- `ATTENDANCE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `GEMINI_API_KEY`
- `EMAIL_FROM_ADDRESS`

## 3) Verification Procedure

Run in deployment target (or pre-prod environment):

```bash
npm run verify:phase12-deployment
```

Verifier checks:
- Security headers available on `/`
- `GET /api/health`
- `GET /api/hrms/v2/health`
- `GET /api/hrms/v2/admin/settings` (dev-mode header for local QA)
- `GET /api/hrms/v2/reports/summary`

## 4) Release Gate

Deploy can proceed only if:
- verifier exits with code `0`
- no regression in Phase 11 admin smoke test (`npm run test:phase11-admin`)
- migrations up to `015_phase11_admin_console.sql` are applied

## 5) Post-Deploy Tasks

- Confirm HTTPS and domain-level HSTS behavior at edge/load-balancer.
- Wire platform monitoring/alerts (to be finalized in Phase 14).
- Capture deployment evidence (timestamp, environment, verifier output) in release notes.
