---
phase: 11
plan: "01"
subsystem: frontend
tags: [mui, theme, tailwind-removal, emotion, next-app-router]
dependency_graph:
  requires: []
  provides: [MUI-theme-foundation, student-theme-override, root-layout-providers, game-layout-providers]
  affects: [frontend/app/layout.tsx, frontend/app/game/layout.tsx, frontend/components/AuthGate.tsx]
tech_stack:
  added:
    - "@mui/material@9.0.1"
    - "@emotion/react@11.14.0"
    - "@emotion/styled@11.14.1"
    - "@mui/icons-material@9.0.1"
    - "@mui/x-date-pickers@9.3.0"
    - "@mui/material-nextjs@9.0.1"
    - "@emotion/cache@11.14.0"
  patterns:
    - AppRouterCacheProvider outermost in root layout (MUI SSR style injection)
    - createTheme() at module scope (not inside component — Pitfall 2 avoided)
    - createTheme(baseTheme, overrides) two-arg form for nested student override (extends, not replaces)
    - keyframes from @mui/system for shake/fadeIn/slideUp animations
    - MuiCssBaseline.styleOverrides for global body + scrollbar styles (replaces globals.css)
key_files:
  created:
    - frontend/lib/theme.ts
    - frontend/lib/student-theme.ts
    - frontend/app/game/layout.tsx
  modified:
    - frontend/app/layout.tsx
    - frontend/components/AuthGate.tsx
    - frontend/package.json
    - frontend/postcss.config.js
    - frontend/app/globals.css
    - frontend/lib/utils.ts
  deleted:
    - frontend/tailwind.config.js
    - frontend/components/ui/ (13 files: avatar, badge, button, calendar, card, date-picker, dialog, input, label, popover, select, separator, table)
decisions:
  - "AppRouterCacheProvider is outermost wrapper in body (before ThemeProvider) — required for MUI SSR style injection in Next.js App Router"
  - "Root layout.tsx stays Server Component (no 'use client') — ThemeProvider works server-side with AppRouterCacheProvider"
  - "game/layout.tsx is new 'use client' file — nested ThemeProvider requires client context (D-05)"
  - "cn() removed from utils.ts with export {} to preserve module path until layout.tsx rewrite removes import"
  - "postcss.config.js emptied (plugins: {}) not deleted — Next.js may use PostCSS for other transforms"
  - "globals.css emptied to comment — all styles migrated to MuiCssBaseline.styleOverrides in theme.ts"
metrics:
  duration_minutes: 12
  completed_date: "2026-05-31"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 6
  files_deleted: 14
---

# Phase 11 Plan 01: MUI Foundation — Theme Setup + Tailwind Teardown Summary

**One-liner:** MUI v9 + Emotion installed; Tailwind/shadcn removed; baseTheme with project design tokens, studentTheme D-05 override, AppRouterCacheProvider + nested ThemeProvider wired at root and /game/** layouts.

## What Was Built

### Task 1: Install MUI stack, remove Tailwind/shadcn (commit b685379)
- Installed 7 packages: `@mui/material@9.0.1`, `@emotion/react@11.14.0`, `@emotion/styled@11.14.1`, `@mui/icons-material@9.0.1`, `@mui/x-date-pickers@9.3.0`, `@mui/material-nextjs@9.0.1`, `@emotion/cache@11.14.0`
- Uninstalled 9 packages: `tailwindcss`, `autoprefixer`, `tw-animate-css`, `shadcn`, `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `react-day-picker`
- Deleted `frontend/components/ui/` (all 13 shadcn components)
- Deleted `frontend/tailwind.config.js`
- Emptied `frontend/postcss.config.js` to `plugins: {}`
- Cleared `frontend/app/globals.css` of all `@tailwind` directives and `@layer` blocks
- Removed `cn()` from `frontend/lib/utils.ts` (left `export {}` as stub for import-path safety)

### Task 2: Create lib/theme.ts + lib/student-theme.ts (commit 1881aac)
- `frontend/lib/theme.ts`: `baseTheme` with full project palette (primary `#4F9DFF`, secondary `#6ED6C1`, error `#FF7B7B`, warning `#FFD166`, text.primary `#0F172A`, divider `#E2E8F0`), Inter font, `shape.borderRadius: 12`, `MuiCssBaseline` scrollbar + body overrides, `MuiButton` textTransform/fontWeight overrides
- `frontend/lib/theme.ts`: exports named keyframes `shake`, `fadeIn`, `slideUp` via `@mui/system`
- `frontend/lib/student-theme.ts`: `studentTheme = createTheme(baseTheme, {...})` with `#A78BFA` primary, `fontSize: 16`, `borderRadius: 16` (D-05)
- `frontend/lib/colors.ts` unchanged (gradient values stay there)

### Task 3: Wire layouts + migrate AuthGate (commit e86e0a8)
- `frontend/app/layout.tsx`: removed `cn`/`@/lib/utils` import and `./globals.css` import; added `AppRouterCacheProvider` (outermost) + `ThemeProvider(baseTheme)` + `CssBaseline`; kept as Server Component (no `'use client'`)
- `frontend/app/game/layout.tsx`: new `'use client'` file wrapping `/game/**` in `ThemeProvider(studentTheme)` — no auth logic
- `frontend/components/AuthGate.tsx`: loading div replaced with `Box` + `CircularProgress size={32}`; all auth logic (`getUser`, `router.replace`, role checks) unchanged

## Verification Results

All plan-level checks passed:
- `test ! -d components/ui && test ! -f tailwind.config.js` — PASS
- `grep -q 'export const baseTheme' lib/theme.ts && grep -q 'createTheme(baseTheme' lib/student-theme.ts` — PASS
- `grep -q 'AppRouterCacheProvider' app/layout.tsx && test -f app/game/layout.tsx` — PASS
- `npx tsc --noEmit` — zero errors in foundation files (layout.tsx, theme.ts, student-theme.ts, game/layout.tsx, AuthGate.tsx); 106 errors in un-migrated area pages (expected until plans 02-04)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `frontend/lib/utils.ts`: exports `{}` only — the `cn()` function is removed; import sites in un-migrated pages will fail until plans 02-04 remove those imports. This is intentional scaffolding per the plan.
- `frontend/app/globals.css`: emptied to a comment — all styles are now in `MuiCssBaseline.styleOverrides` in `theme.ts`.

## Threat Flags

No new security-relevant surface introduced. AuthGate auth logic (T-11-01) is preserved byte-for-byte — only the loading spinner JSX changed. AppRouterCacheProvider (T-11-02) is the official MUI SSR mechanism, no data crosses trust boundaries.

## Self-Check: PASSED

- `frontend/lib/theme.ts` — FOUND
- `frontend/lib/student-theme.ts` — FOUND
- `frontend/app/game/layout.tsx` — FOUND
- `frontend/app/layout.tsx` — FOUND (modified)
- `frontend/components/AuthGate.tsx` — FOUND (modified)
- Commits b685379, 1881aac, e86e0a8 — verified in git log
