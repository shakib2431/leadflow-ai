---
name: VITE_ secrets in Replit Vite projects
description: How to expose Replit Secrets with VITE_ prefix to import.meta.env in a Vite dev server
---

# Problem
Replit Secrets (VITE_SUPABASE_URL etc.) are in process.env but Vite's import.meta.env doesn't auto-pick them all.

# Fix (vite.config.ts)
Add a define block that copies VITE_* vars from process.env:

```typescript
const envDefines: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith('VITE_') && value !== undefined) {
    envDefines[`import.meta.env.${key}`] = JSON.stringify(value);
  }
}
export default defineConfig({ define: envDefines, ... });
```

**Why:** Vite reads VITE_* from .env files by default. Replit secrets are available in process.env but need the define block to appear in import.meta.env at dev time.

**How to apply:** Add this to any Vite artifact that uses Replit Secrets with VITE_ prefix.
