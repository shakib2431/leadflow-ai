---
name: OneDrive breaks Vite HMR on Windows
description: A project inside a OneDrive-synced folder breaks Vite/chokidar file-watching, so git pull changes never hot-reload
---

# OneDrive breaks Vite's file-watcher

When a Windows user runs the dev server from a project inside a **OneDrive-synced folder** (e.g. `C:\Users\<u>\OneDrive\Desktop\...`), Vite's native file-watching (chokidar) misses file changes. Symptom: after `git pull`, the running page keeps showing the old build until the dev server is manually restarted; HMR appears dead.

**Why:** OneDrive continuously syncs/locks files and the OS file-change events chokidar relies on don't fire reliably inside synced folders.

**How to apply:**
- Quick fix: start dev with `set CHOKIDAR_USEPOLLING=true` (chokidar/Vite respect this env var) so it polls files on a timer instead of relying on OS events.
- Permanent fix: move the project out of OneDrive (e.g. `C:\dev\<project>`) — HMR then works with no flag.
- For a hands-free "auto-reflect from Replit" loop on Windows: a second terminal polling `git pull` every ~10s + `CHOKIDAR_USEPOLLING=true` makes pushed changes appear automatically.

Related friction: `strictPort` in the vite config means the dev server errors out (doesn't fall back to another port) when its port is taken by a leftover process — kill the port (`npx kill-port <n>`) or run on a fresh `PORT`.
