# HRMS v2 — Scaffold

This folder contains an initial scaffold for the HRMS v2 effort.

Files added:

- `app/hrms/v2/page.tsx` — simple employee list UI.
- `app/api/hrms/v2/employees/route.ts` — minimal API (GET / POST) backed by Supabase.
- `scripts/restore_hrms_backup.js` — node script to restore files from a backup folder (supports `--dry`).

Quick steps

1. Inspect the new UI: `http://localhost:3000/hrms/v2`
2. API endpoints:
   - `GET /api/hrms/v2/employees` — list employees
   - `POST /api/hrms/v2/employees` — create employee (JSON body)
3. To restore files from a backup (dry run):

```bash
node scripts/restore_hrms_backup.js backups/hrms-backup-2026-06-24 --dry
```

Then run without `--dry` to perform the copy.

4. Run smoke tests (dev server must be running):

```bash
BASE_URL=http://localhost:3000 node scripts/test_hrms_v2_smoke.js
```

Next steps: wire detailed employee profile pages, migrations, and automated tests.
