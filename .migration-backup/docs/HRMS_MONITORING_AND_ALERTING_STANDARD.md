# HRMS Monitoring and Alerting Standard

Date: 2026-06-26
Phase: 14 (Support Readiness)
Audience: Support, DevOps, Engineering

## 1) Objective

Define a practical monitoring and alerting baseline so HRMS incidents are detected early and routed to the right owner.

## 2) Monitoring scope

Application routes:
- `/hrms/v2`
- `/hrms/v2/admin`
- `/hrms/v2/reports`
- `/hrms/v2/self-service`

Service endpoints:
- `/api/health`
- `/api/hrms/v2/health`
- `/api/hrms/v2/admin/settings`
- `/api/hrms/v2/reports/summary`

Operational scripts:
- `npm run test:phase11-admin`
- `npm run verify:phase12-deployment`

## 3) Golden signals

### Availability
- Health endpoint success rate
- Admin and report API uptime

### Latency
- P95 and P99 latency for key HRMS APIs
- Page load timings for core HRMS pages

### Errors
- API 5xx error rate by endpoint
- API 4xx spikes for role/authorization failures

### Saturation
- Database connection or request saturation indicators
- Job queue pressure (where applicable)

## 4) Alert severity model

### Sev-1 (Critical)
- `/api/health` or `/api/hrms/v2/health` unavailable for > 5 minutes
- Payroll or attendance critical endpoints failing across all users
- Data loss or corruption risk confirmed

### Sev-2 (High)
- `5xx` error rate > 5% for any critical HRMS endpoint for > 10 minutes
- Reports/export endpoints degraded significantly

### Sev-3 (Medium)
- Intermittent failures affecting subset of users
- Elevated latency but service still functional

### Sev-4 (Low)
- Non-blocking UI regressions or cosmetic issues

## 5) Alert routing

- Primary on-call: application engineer
- Secondary: HRMS module owner
- Escalation: product owner / delivery owner

Escalation thresholds:
- Sev-1: immediate page + conference bridge
- Sev-2: page within 5 minutes
- Sev-3/4: ticket + asynchronous follow-up

## 6) Minimum dashboard widgets

- Health endpoint status timeline
- API success/error split by endpoint
- Top failing HRMS endpoints (24h)
- Audit log activity volume
- Backup run status trend

## 7) Logging standard

All production logs should include where possible:
- timestamp
- endpoint and method
- status code
- request id (if present)
- actor role and actor id/email for admin operations

Sensitive fields must be masked in logs.

## 8) Weekly monitoring review

- Review top error endpoints
- Review unresolved alerts and mean-time-to-recovery
- Review backup run health
- Review repeated authorization failures
- Review trends from Phase 11 admin audit data
