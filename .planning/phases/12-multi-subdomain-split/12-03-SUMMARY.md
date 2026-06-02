---
phase: 12-multi-subdomain-split
plan: "03"
subsystem: frontend/auth, frontend/ui
tags: [nextjs, auth, ui, subdomain, login, 403, 404]
dependency_graph:
  requires: [12-02]
  provides: [teacher-login-page, student-login-page, game-auth-guard, 403-page, 404-page, wrong-role-guards]
  affects:
    - frontend/app/teacher/login/page.tsx
    - frontend/app/game/login/page.tsx
    - frontend/app/game/layout.tsx
    - frontend/app/admin/layout.tsx
    - frontend/app/teacher/layout.tsx
    - frontend/app/403/page.tsx
    - frontend/app/not-found.tsx
tech_stack:
  added: []
  patterns:
    - Split-panel login page pattern (navy left panel + white right panel) — teacher and student variants
    - Student auth guard in layout.tsx — cookie-only JWT decode, redirect to /game/login, login-page bypass
    - D-04 wrong-role detection — getAnyRoleCookie + decodeJwtRole before falling back to login redirect
    - Next.js not-found.tsx global 404 handler — Globe icon, three subdomain login links
    - 403 Access Denied page — ShieldOff icon, subdomain-aware accent via NEXT_PUBLIC_SUBDOMAIN
key_files:
  created:
    - frontend/app/teacher/login/page.tsx
    - frontend/app/game/login/page.tsx
    - frontend/app/403/page.tsx
    - frontend/app/not-found.tsx
  modified:
    - frontend/app/game/layout.tsx
    - frontend/app/admin/layout.tsx
    - frontend/app/teacher/layout.tsx
decisions:
  - "game/layout.tsx login-page bypass uses pathname === '/game/login' check inside useEffect (not a pathname guard before useEffect) — avoids rendering spinner on the login page itself"
  - "Wrong-role helpers (getAnyRoleCookie, decodeJwtRole) defined inline inside useEffect callback in both admin and teacher layouts — avoids closure issues and keeps helpers co-located with the guard logic"
  - "403 page uses process.env.NEXT_PUBLIC_SUBDOMAIN to pick accent color — env var set at build/start time, not user-controlled (T-12-03-02 accepted)"
  - "not-found.tsx uses env var references with hardcoded fallbacks (admin.katie.vn, app.katie.vn, student.katie.vn) — static links, no XSS vector"
metrics:
  duration_seconds: 313
  completed_date: "2026-06-02"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 7
---

# Phase 12 Plan 03: UI Surfaces — Teacher Login, Student Login, 403, 404, Game Auth Guard Summary

Three new login pages, two error surfaces, and student auth guard — split-panel teacher (#F0623A) and student (#A78BFA) logins, game/layout.tsx cookie guard, D-04 wrong-role 403 detection in admin/teacher layouts.

## What Was Built

### Task 1: Teacher login page, student login page, game/layout.tsx auth guard

**frontend/app/teacher/login/page.tsx** (new) — Teacher-only split-panel login page:
- Left panel: navy `#0C1220`, K monogram in `#F0623A`, "Teacher Portal / the smart way" headline, feature list with `GraduationCap` + `Mic` icons
- Right panel: email (`upn`) + password form, Sign In button in `#F0623A`
- `handleSubmit`: POSTs `{ upn, password }` to `/api/auth/teacher-login`, on success `window.location.href = NEXT_PUBLIC_APP_ORIGIN + '/teacher'`
- No role picker, no registration link — teacher-only

**frontend/app/game/login/page.tsx** (new) — Student class code+name login page (UI-SPEC Surface 1):
- Wrapped in `<ThemeProvider theme={studentTheme}>`
- Left panel: navy `#0C1220`, K monogram in `#A78BFA`, "Play & Learn / English" headline, feature list with `BookOpen` + `Star` + `Gamepad2` icons
- Right panel: Class Code + Your Name text fields, "Enter Class" button in `#A78BFA`
- `handleSubmit`: POSTs `{ classCode, name }` to `/api/auth/student-login`, on success `window.location.href = NEXT_PUBLIC_STUDENT_ORIGIN + '/game/homework'`

**frontend/app/game/layout.tsx** (rewritten) — Student auth guard:
- Reads `student-token` from `document.cookie`, decodes JWT role via `atob`
- Redirects to `/game/login` (relative URL, stays on student subdomain) if role !== 'STUDENT'
- Bypasses guard when `pathname === '/game/login'` to prevent redirect loop
- Loading: centered `CircularProgress`; redirect-in-flight: `null`; authed: `ThemeProvider(studentTheme)` wrapper

### Task 2: 403/404 error pages + wrong-role layout guards

**frontend/app/403/page.tsx** (new — UI-SPEC Surface 2):
- `ShieldOff` icon (40px) in 80x80 circle, background uses accent at 15% opacity
- Accent: admin=`#4F9DFF`, student=`#A78BFA`, default/teacher=`#F0623A` — read from `NEXT_PUBLIC_SUBDOMAIN`
- "Access Denied" h5, "You don't have access to this area" body
- "Go to Login" outlined button → `window.location.href = '/login'` (stays on current subdomain)

**frontend/app/not-found.tsx** (new — UI-SPEC Surface 3 / Next.js global 404):
- `Globe` icon (40px) in 80x80 circle, background `rgba(79,157,255,0.15)`
- "Page not found" h5, "This subdomain is not recognized." body
- Three MUI Button links: admin.katie.vn/admin/login, app.katie.vn/teacher/login, student.katie.vn/login
- Uses `NEXT_PUBLIC_ADMIN_ORIGIN`, `NEXT_PUBLIC_APP_ORIGIN`, `NEXT_PUBLIC_STUDENT_ORIGIN` with hardcoded fallbacks

**frontend/app/admin/layout.tsx** (modified — D-04 wrong-role detection):
- In `useEffect`, before redirecting to `/admin/login`: checks `teacher-token` and `student-token` cookies
- If a non-ADMIN role token exists → `router.replace('/403')`; otherwise → `/admin/login` (existing)

**frontend/app/teacher/layout.tsx** (modified — D-04 wrong-role detection):
- In `useEffect`, before redirecting to `/login`: checks `admin-token` and `student-token` cookies
- If a non-TEACHER role token exists → `router.replace('/403')`; otherwise → `/login` (existing)

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (frontend) | PASS (0 errors — run from main repo with node_modules) |
| `A78BFA` count in game/login/page.tsx | PASS (2 — definition + comment) |
| `F0623A` count in teacher/login/page.tsx | PASS (1) |
| `student-token` count in game/layout.tsx | PASS (1) |
| `ShieldOff` in 403/page.tsx | PASS (2 — import + usage) |
| `Globe` in not-found.tsx | PASS (2 — import + usage) |
| `teacher-login\|/api/auth` in teacher/login | PASS (1) |
| `student-login\|/api/auth` in game/login | PASS (1) |
| `admin.katie.vn\|app.katie.vn\|student.katie.vn` in not-found.tsx | PASS (6) |

**TypeScript note:** tsc was run from `J:/sources/katie-english/frontend/` (main repo with `node_modules`) against the shared source tree. The worktree does not have its own `node_modules` — it shares the main repo's installation. This is correct behavior for a git worktree setup. Output: empty (0 errors).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All pages submit to real Route Handler endpoints created in plan 12-02. The 403 and 404 pages are complete error surfaces with no pending data wiring.

## Threat Flags

No new security surface beyond the plan's threat model. T-12-03-03 (403 page does not clear wrong-role cookie) is accepted per plan: the login form's successful submission will overwrite the cookie; the `/api/auth/logout` route handler from plan 12-02 clears all three tokens.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Teacher login, student login, game layout auth guard | `dbe0e28` | frontend/app/teacher/login/page.tsx (created), frontend/app/game/login/page.tsx (created), frontend/app/game/layout.tsx (rewritten) |
| Task 2: 403/404 pages + wrong-role layout guards | `6761009` | frontend/app/403/page.tsx (created), frontend/app/not-found.tsx (created), frontend/app/admin/layout.tsx (modified), frontend/app/teacher/layout.tsx (modified) |

## Self-Check: PASSED
