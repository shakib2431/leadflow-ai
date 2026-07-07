# LeadFlow AI — Handoff Notes

_Last updated: 2026-07-07_

This file is a running handoff for any agent (Codex, Replit Agent, etc.) picking up
this project. The **code and git history are the source of truth**; this file adds the
_why_ and the _what's next_ that aren't obvious from the diffs alone.

## Project at a glance
- **What it is:** LeadFlow AI — a CRM + HRMS web app.
- **Stack:** React + Vite + Wouter (ported from a Next.js App Router app).
- **Monorepo:** Replit pnpm workspace. Artifacts:
  - `artifacts/leadflow-ai` — the web app (main UI).
  - `artifacts/api-server` — API server.
  - `artifacts/mockup-sandbox` — component preview server (design/canvas).
- **Data:** HRMS v2 pages are served from Supabase via a `window.fetch` monkeypatch
  (no dedicated backend for those). Supabase enum columns reject `ilike` (HTTP 400,
  silent 0 rows) — use `.eq` / `.in` / `.neq` instead.
- **Local dev:** User runs locally on Windows (Replit preview is blocked by their DNS).
  Repo lives in a OneDrive folder — OneDrive breaks Vite HMR/file-watching; use
  `CHOKIDAR_USEPOLLING=true` or move the repo out of OneDrive.
- **Git remote:** `shakib2431/leadflow-ai`, branch `master`.

## How to catch up on recent work
1. `git log --oneline -20` — sequence of changes.
2. `git show <commit>` or `git diff <a>..<b>` — exact edits.
3. Read `.agents/memory/` — durable lessons (migration quirks, Supabase gotchas,
   Windows dev setup, git push discipline). Read `replit.md` for project overview.

## Most recent work done (HRMS UI polish)
**Goal:** Apply the polished dashboard look (gradient hero, soft-shadowed rounded
indigo cards) across all HRMS section pages. A prior attempt that only swapped CSS
color tokens was too subtle — this pass made the change structural via shared surfaces
so it propagated widely with few edits.

**Files touched:**
- `artifacts/leadflow-ai/src/components/hrms/hrms-top-header.tsx` — rewritten into a
  gradient hero (icon chip, eyebrow default "HR Workspace", title, subtitle, actions;
  new optional `eyebrow`/`icon` props). Used by ~13 pages plus `LifecycleLaunchpad`
  (8 more). **Returns null when the title is empty/whitespace** — the 8 report pages
  pass `title=""` and render their own in-body title; without this guard they showed a
  broken empty hero.
- `artifacts/leadflow-ai/src/pages/components/report-layout.tsx` — header restyled to a
  matching gradient hero. Note: this component is currently **unused** by any page
  (only self-referenced), so the change is inert at runtime.
- `artifacts/leadflow-ai/src/index.css` — `.hrms-lifecycle-card` (+hover lift/soft
  shadow, radius 16), `.hrms-lifecycle-step`, `.hrms-lifecycle-link` shifted from blue
  to indigo.

**Verification:** typecheck passes; screenshots confirmed the hero/cards across
`/hrms/v2/organization`, `/hrms/v2/admin`, `/hrms/v2/reports/leave`,
`/hrms/v2/self-service`, `/team/payroll`; architect code review passed with no
functional regressions. Committed and pushed to `origin/master`.

## Known pre-existing issues (left untouched — out of scope of the UI work)
- `/hrms/v2/admin`: "Unknown entity" labels on departments, and duplicate React key
  warnings in the console.
- Harmless "unhandled endpoint" adapter warnings from the fetch monkeypatch.

## Open / next steps
- **Real AI features:** wire up Gemini/OpenAI, email, and WhatsApp (currently not
  connected).
- **TypeScript cleanup:** ~27 errors left over from the Next.js → Vite migration.
- **Mobile app:** an Expo companion app for on-the-go CRM was proposed.
- **Deeper card polish:** operational page card bodies (HRMSAdmin, HRMSSetup,
  HRMSTemplates, Team*) are consistent clean white panels now but weren't individually
  redesigned — that's the next lever if more polish is wanted.
- Fix the two pre-existing `/hrms/v2/admin` bugs listed above.

## Git push discipline (important)
`gitPush` ships the committed HEAD only. Workflow: `git add -A <paths>` → explicit
commit → push → verify origin advanced (`git fetch origin` then
`git rev-list --count origin/master..HEAD` should be `0`).
