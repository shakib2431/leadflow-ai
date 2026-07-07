---
name: HRMS client-side fetch adapter
description: How LeadFlow HRMS v2 pages get live data without a real backend, and the Supabase-enum gotcha behind it
---

# HRMS v2 data wiring

The HRMS v2 pages call `fetch('/api/hrms/v2/*')` against a backend that does not exist
(api-server has no such routes; `@workspace/db` schema is empty; `DATABASE_URL` points at
an empty Replit Postgres). The real data lives in **Supabase**, anon-readable via RLS.

**Approach:** `src/lib/hrms-api-adapter.ts` monkeypatches `window.fetch`. Requests whose
**pathname** contains `/api/hrms/v2` are served from the existing Supabase client in the exact
shapes pages expect; everything else passes through to the saved original fetch. Installed once
via `installHrmsApiAdapter()` in `main.tsx`.

**Why this works safely:** supabase-js's own fetches go to absolute `*.supabase.co` URLs, so
they never re-match the marker → no recursion. Match on `pathname` (not the full URL string) so
the marker in a query/hash can't trigger interception. Vite HMR uses WebSocket, unaffected.

## Response-shape contract is per-consumer — verify before guessing
Callers unwrap `body.data`, so every endpoint returns `{ data: ... }`. Field names must match the
consuming page exactly (e.g. TeamPayroll expects `totals.{gross,net,deductions,pf,esi,pt,tds,lwf}`,
plus `run`, `statusCounts`, `trend`, and a separate `/payroll/reports` with `runs`+`monthlySummary`).
Grep the page's TypeScript interface before implementing a handler; don't invent shapes.

## Supabase enum-column gotcha (caused 400s)
Several columns are Postgres **enum** types: `employees.status` (active|onboarding|archived),
`attendance_records.status` (present|absent|half_day), `payroll_runs.status` (draft|paid),
`leave_requests.status` (approved|pending|rejected).
**`ilike` does not exist for enum columns → PostgREST returns 400.** Use `.eq` / `.in` / `.neq`
on enums. Also, callers ask for values that aren't enum members (e.g. payroll `status=pending`
when the enum is draft|paid) — map aliases (`pending` → `neq('status','paid')`).

**Why:** silent — the 400 makes the query return no rows, so KPIs render 0 instead of erroring.

## Writes under anon RLS can false-succeed
A Supabase `.update()` that matches no row (RLS blocked, or bad id) returns `{data:null, error:null}`.
Return a non-2xx (403) when `data` is null so the UI's `res.ok` check doesn't show a fake success.

## Role gating is client-only here
`/user-roles/me` returns `{data:{role:'HR Admin'}}` to unlock gated pages. This defeats client-side
role gating by design — acceptable only because Supabase RLS is the real boundary (anon key).
