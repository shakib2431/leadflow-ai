---
name: Windows local dev for this pnpm monorepo
description: What must change so the Replit pnpm workspace installs and runs on a user's Windows machine
---

# Running this monorepo locally on Windows

Users sometimes clone the repo (via the connected GitHub remote) to run it on their own
Windows machine — often because their network blocks `*.replit.dev` / `*.repl.co`
(DNS_PROBE_FINISHED_NXDOMAIN across all browsers = OS/router-level block, not the app).

Four things break a plain Windows `pnpm install` + `run dev`, all now fixed in-repo:

1. **Platform binary exclusions** — `pnpm-workspace.yaml` `overrides:` set every non-linux
   native binary to `"-"` (esbuild/rollup/lightningcss/@tailwindcss/oxide `win32-*`).
   Windows install fails without them. Fix: removed all `win32` exclusion lines and
   regenerated the lockfile. Safe for Replit — win32 deps are os-gated and never install on linux.

2. **`preinstall` used `sh`** — root `package.json` preinstall was `sh -c '...'`, which
   Windows `cmd` can't run (`'sh' is not recognized`). Rewrote it as a cross-platform
   `node -e "..."` guard that still deletes stray lockfiles and enforces pnpm.

3. **pnpm 11 blocks build scripts** — `ERR_PNPM_IGNORED_BUILDS` (core-js, esbuild) makes
   the `run dev` deps-status-check exit 1. Fixes: added `core-js` to `onlyBuiltDependencies`,
   added `verify-deps-before-run=false` to `.npmrc`, and the user runs `pnpm approve-builds`
   once (press `a`, Enter, `y`).

4. **Node version** — pnpm 11 (via corepack) needs Node >= 22.13. Users on Node 20.x hit
   `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` / `styleText` import errors. Fix: `nvm install 22`.

**Why:** these were all discovered the hard way helping a user get localhost running; the
repo config is Replit-linux-optimized by default.
**How to apply:** if a user wants local Windows dev, ensure they `git pull` these fixes,
create `artifacts/leadflow-ai/.env` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
(from Replit Secrets — never paste values yourself), then `pnpm install` → `pnpm approve-builds`
→ `pnpm --filter @workspace/leadflow-ai run dev` → open localhost:3000.
