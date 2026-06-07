---
plan: "13-04"
phase: "13"
status: complete
self_check: PASSED
key-files:
  created:
    - marketing-site/app/page.tsx
    - marketing-site/out/index.html
    - marketing-site/app/components/AnimatedSection.tsx
---

## What Was Built

Standalone `marketing-site/` Next.js project with static export.

**Structure:** Independent Next.js 14 app — no middleware, no subdomain routing, no auth. Serves all 6 landing page sections at `/`.

**Build output:** `npm run build` → `out/` directory with `index.html` and static assets. Deploy to any static host.

**Dev:** `npm run dev` starts on port 3004.

**Key fixes applied:**
- MUI v9 Grid `alignItems` → `sx={{ alignItems }}`
- `ListItemText.primaryTypographyProps` → `slotProps`
- `keyframes` from `@emotion/react` → plain CSS transition in AnimatedSection
- MUI ThemeProvider wrapped in `providers.tsx` client component (required for App Router)

## Self-Check

- [x] `npm run build` exits 0
- [x] `out/index.html` exists
- [x] No imports from main frontend app
- [x] All 6 sections wired in page.tsx
