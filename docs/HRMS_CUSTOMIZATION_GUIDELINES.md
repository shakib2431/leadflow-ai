# HRMS Customization Guidelines

Date: 2026-06-26
Phase: 14 (Support Readiness)
Audience: Implementation partners and internal engineering

## 1) Purpose

Define safe customization boundaries so client-specific changes do not break core HRMS workflows.

## 2) Safe customization areas

- UI labels and text copy
- Optional report filters and visual widgets
- Default values for settings (currency, timezone, retention)
- Permission policy tuning within supported permission keys

## 3) Controlled customization areas

Require design review and testing before rollout:
- Role model changes
- Attendance source integrations
- Payroll component logic
- Report export schema changes

## 4) High-risk customization areas

Avoid direct changes without architecture sign-off:
- Authentication and role guard logic
- Audit logging pathways
- Backup run behavior
- Migration history rewrite

## 5) Configuration-first approach

Prefer configuration over code changes:
- Use admin settings APIs where possible
- Use role-permission matrix instead of hardcoded role checks in UI
- Keep environment variable management outside source code

## 6) API compatibility rules

- Do not remove or rename response keys used by client apps.
- Version breaking API changes under a new route namespace.
- Keep `data` and `error` response conventions stable.

## 7) Release policy for custom changes

For each customization release:
1. Document requirement and impacted modules.
2. Run Phase 11 and Phase 12 verification scripts.
3. Validate role-based access behavior.
4. Capture rollback steps.

## 8) Documentation requirement

Every client customization must include:
- reason and business owner
- technical change summary
- impacted routes/APIs
- test evidence
- rollback procedure
