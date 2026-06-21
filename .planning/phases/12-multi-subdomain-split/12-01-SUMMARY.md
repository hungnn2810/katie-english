---
phase: 12-multi-subdomain-split
plan: "01"
subsystem: frontend/middleware
tags: [nextjs, middleware, subdomain, docker, auth]
dependency_graph:
  requires: []
  provides: [subdomain-routing, route-containment, auth-redirect, dev-scripts]
  affects: [frontend/middleware.ts, frontend/package.json, docker-compose.yml]
tech_stack:
  added: []
  patterns: [Next.js Edge middleware, subdomain detection via Host header, cookie-based auth redirect]
key_files:
  created:
    - frontend/middleware.ts
  modified:
    - frontend/package.json
    - docker-compose.yml
decisions:
  - "Middleware only redirects unauthenticated users to login; wrong-role cookie defers to client-side layout guard (D-04) — avoids Edge crypto dependency"
  - "NEXT_PUBLIC_SUBDOMAIN env var checked before Host header — enables local dev on single machine without DNS changes"
  - "POSIX-style env var prefix in dev scripts (no cross-env) — existing scripts have no cross-env and CI/Docker runs Linux"
  - "Student loginPath is /login (not /game/login) — /login is in student allowedPrefixes so no redirect loop"
  - "/game/login used as loginPath per plan spec; but student config loginPath set to /login to match allowedPrefixes"
metrics:
  duration_seconds: 157
  completed_date: "2026-06-02"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 12 Plan 01: Subdomain Middleware + Dev Infrastructure Summary

Edge middleware that isolates admin/teacher/student subdomains with route containment, auth redirect, and per-role local dev scripts.

## What Was Built

### Task 1: frontend/middleware.ts (135 lines)

New Next.js Edge middleware implementing all subdomain routing decisions:

**Subdomain detection (`detectSubdomain`):**
- Reads `NEXT_PUBLIC_SUBDOMAIN` env var first (D-02: local dev bypass)
- Falls back to `Host` header: `admin.*` → admin, `app.*` → app, `student.*` → student
- `katie-english.com.vn` / `www.katie-english.com.vn` → root, anything else → unknown

**Route containment (D-10):**
- admin subdomain: allows only `/admin/**`
- app subdomain: allows only `/teacher/**` (plus special `/login` → redirect to `/teacher/login`)
- student subdomain: allows `/game/**` and `/login/**`
- Any path outside allowed prefixes rewrites to `/not-found`

**Auth redirect:**
- Cookie absent + not on login path → redirect to subdomain login
- Cookie present → `NextResponse.next()` (wrong-role deferred to layout guard per D-04)
- JWT role decoded via `decodeJwtRole` using `atob()` — no signature verification (Edge-safe)

**Root redirect (D-08):** `katie-english.com.vn` / `www.katie-english.com.vn` → 301 to `https://app.katie-english.com.vn{path}`

**Unknown subdomain (D-09):** rewrites to `/not-found`

**Root path `/`:** redirects to subdomain default (`/admin`, `/teacher`, `/game/homework`)

**Matcher string:**
```
['/((?!_next/static|_next/image|favicon\\.ico).*)']
```
Excludes static assets and favicon from middleware processing.

### Task 2: Dev scripts + Docker env vars

**frontend/package.json** — 3 new scripts added after `"dev"`:
- `dev:admin`: `NEXT_PUBLIC_SUBDOMAIN=admin next dev -p 3000`
- `dev:teacher`: `NEXT_PUBLIC_SUBDOMAIN=app next dev -p 3010`
- `dev:student`: `NEXT_PUBLIC_SUBDOMAIN=student next dev -p 3011`

**docker-compose.yml** — 4 new env vars in frontend service with `${VAR:-default}` syntax:
- `NEXT_PUBLIC_ADMIN_ORIGIN: ${NEXT_PUBLIC_ADMIN_ORIGIN:-http://admin.katie-english.com.vn}`
- `NEXT_PUBLIC_APP_ORIGIN: ${NEXT_PUBLIC_APP_ORIGIN:-http://app.katie-english.com.vn}`
- `NEXT_PUBLIC_STUDENT_ORIGIN: ${NEXT_PUBLIC_STUDENT_ORIGIN:-http://student.katie-english.com.vn}`
- `NEXT_PUBLIC_LOGIN_URL: ${NEXT_PUBLIC_LOGIN_URL:-http://app.katie-english.com.vn/login}`

## Verification Results

| Check | Result |
|-------|--------|
| `middleware.ts` exists | PASS |
| `NEXT_PUBLIC_SUBDOMAIN\|admin-token\|teacher-token\|student-token` count ≥ 4 | PASS (4) |
| Matcher string correct | PASS |
| `docker-compose.yml` has 4 NEXT_PUBLIC_* origin vars | PASS (4) |
| `package.json` has dev:admin/dev:teacher/dev:student | PASS |
| TypeScript compiles without errors | PASS (full project `tsc --noEmit` exits 0) |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model (T-12-01-01 through T-12-01-04). All mitigations are implemented as designed.

## Known Stubs

None.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Create middleware.ts | `af90b7c` | frontend/middleware.ts (created, 135 lines) |
| Task 2: Dev scripts + docker env | `d9bae33` | frontend/package.json, docker-compose.yml |

## Self-Check: PASSED

- `frontend/middleware.ts` exists at worktree path
- `af90b7c` confirmed in `git log --oneline`
- `d9bae33` confirmed in `git log --oneline`
- All 5 verification checks PASS
