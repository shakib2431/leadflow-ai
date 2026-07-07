---
name: Next.js App Router → Vite+Wouter migration patterns
description: Durable checklist for porting Next.js App Router code to React+Vite+Wouter
---

# Key transforms

**Why:** Needed when migrating a Next.js project to Replit's pnpm monorepo scaffold.

## How to apply:
- `"use client"` → remove entirely
- `next/link` → `import { Link } from "wouter"`, `href=` → `to=`, remove `prefetch={false}`
- `next/navigation` → `import { useLocation, useParams } from "wouter"`, `useRouter()` → `const [, navigate] = useLocation()`, `usePathname()` → `const [pathname] = useLocation()`
- Async server component with `params: Promise<{...}>` → `export default function Foo() { const { id } = useParams(); }`
- `redirect()` from next/navigation → `useEffect(() => navigate("/target"), [])` in a component
- `router.push(x)` → `navigate(x)`, `router.refresh()` → `window.location.reload()`, `router.back()` → `window.history.back()`
- `process.env.NEXT_PUBLIC_*` → `import.meta.env.VITE_*`
- `next/image` → `<img>`, `next/dynamic` → remove dynamic wrapper, `next/font` → remove
- `useSearchParams()` from next/navigation → `new URLSearchParams(window.location.search)`
- Pages that import from App Router relative paths (e.g. `../components`) → copy components to new location, use `@/` alias
