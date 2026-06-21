---
phase: 12-multi-subdomain-split
plan: "02"
subsystem: frontend/auth, backend/game
tags: [nextjs, auth, cookies, nestjs, subdomain, route-handlers]
dependency_graph:
  requires: [12-01]
  provides: [cookie-auth-layer, game-auth-endpoint, dual-write-auth]
  affects:
    - frontend/app/api/auth/teacher-login/route.ts
    - frontend/app/api/auth/admin-login/route.ts
    - frontend/app/api/auth/student-login/route.ts
    - frontend/app/api/auth/logout/route.ts
    - frontend/lib/auth.ts
    - frontend/lib/admin-auth.ts
    - frontend/app/login/page.tsx
    - frontend/app/admin/login/page.tsx
    - backend/src/game/game.dto.ts
    - backend/src/game/game.service.ts
    - backend/src/game/game-auth.controller.ts
    - backend/src/game/game.module.ts
tech_stack:
  added: []
  patterns:
    - Next.js Route Handler cookie proxy (next/headers cookies() API)
    - HttpOnly cookie auth with per-subdomain domain scoping (D-05)
    - Dual-write auth (localStorage + client cookie) for zero-regression transition
    - NestJS separate controller for public endpoint (GameAuthController without @UseGuards)
    - window.location.href cross-subdomain redirect (PATTERNS.md)
key_files:
  created:
    - frontend/app/api/auth/teacher-login/route.ts
    - frontend/app/api/auth/admin-login/route.ts
    - frontend/app/api/auth/student-login/route.ts
    - frontend/app/api/auth/logout/route.ts
    - backend/src/game/game-auth.controller.ts
  modified:
    - frontend/lib/auth.ts
    - frontend/lib/admin-auth.ts
    - frontend/app/login/page.tsx
    - frontend/app/admin/login/page.tsx
    - backend/src/game/game.dto.ts
    - backend/src/game/game.service.ts
    - backend/src/game/game.module.ts
decisions:
  - "Used GameAuthController (separate @Controller('game') class without @UseGuards) instead of method-level override — NestJS does not support method-level @UseGuards() to bypass class-level guard; no @Public() decorator existed in codebase"
  - "Route handlers return generic error messages (not raw backend body) per T-12-02-02 — teacher login returns 'Invalid credentials', admin returns 'Invalid email or password', student returns 'Invalid class code or name'"
  - "GameService.gameLogin() takes primitive string args (classCode, name) — GameLoginDto is only used at the controller layer; service does not import DTO (plan verification check 10 expects 2 matches in service but DTO lives in dto.ts not service)"
  - "Student login page.tsx still calls login() for student password auth — plan notes this will be replaced by class-code login in plan 12-03; window.location.href redirect added"
metrics:
  duration_seconds: 442
  completed_date: "2026-06-02"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 11
---

# Phase 12 Plan 02: Cookie Auth Layer + Game Auth Endpoint Summary

HttpOnly cookie auth layer bridging localStorage-only auth with the middleware cookie-reads introduced in plan 12-01, plus a new public NestJS game login endpoint for class-code + name student auth.

## What Was Built

### Task 1: Backend — POST /game/auth/login (GameAuthController)

**backend/src/game/game.dto.ts** — Added `GameLoginDto` class with `classCode: string` and `name: string` fields (plain class, matching existing DTO style with no validation decorators).

**backend/src/game/game.service.ts** — Added `gameLogin(classCode, name)` method:
1. Looks up `Class` by `code` field via Prisma (throws `NotFoundException` if not found)
2. Finds `Student` by case-insensitive `fullname` match (throws `UnauthorizedException` if not found)
3. Finds `User` row where `studentId = student.id` and `role = 'STUDENT'` (throws `UnauthorizedException` if not found)
4. Checks `user.approved` (throws `ForbiddenException` if pending)
5. Signs JWT via `TokenService.sign({ sub, upn, role: 'STUDENT', studentId })` (7d expiry)
6. Returns `{ token, user: { id, upn, role, studentId } }`

Added `UnauthorizedException` to `@nestjs/common` imports and `TokenService` injection from `../auth/jwt.service` (already exported by `AuthModule` which `GameModule` imports).

**backend/src/game/game-auth.controller.ts** — New `@Controller('game')` controller WITHOUT class-level `@UseGuards`. Contains single `@Post('auth/login') @HttpCode(200)` method that delegates to `GameService.gameLogin()`. No `@Public()` decorator needed — the controller simply has no guard.

**backend/src/game/game.module.ts** — Registered `GameAuthController` alongside existing `GameController` in the `controllers` array.

**Why GameAuthController (not method override):** NestJS does not support an empty `@UseGuards()` to bypass a class-level guard. No `@Public()` decorator existed in the codebase. Creating a separate controller is the cleanest approach per the plan's guidance.

### Task 2: Frontend — Route Handlers, Auth Libs, Login Pages

**Four Route Handlers created** (`frontend/app/api/auth/*/route.ts`):

| Route | Backend proxied | Cookie set | Prod domain |
|-------|----------------|------------|-------------|
| `/api/auth/teacher-login` | `POST /auth/login` | `teacher-token` | `app.katie-english.com.vn` |
| `/api/auth/admin-login` | `POST /admin/auth/login` | `admin-token` | `admin.katie-english.com.vn` |
| `/api/auth/student-login` | `POST /game/auth/login` | `student-token` | `student.katie-english.com.vn` |
| `/api/auth/logout` | — | clears all three (`maxAge: 0`) | — |

All cookies: `httpOnly: true`, `secure: true` in production, `sameSite: strict` in production / `lax` in dev, `path: /`, `maxAge: 604800` (7 days). Per-subdomain domain scoping (D-05) — NOT `.katie-english.com.vn` wildcard. Route handlers return generic error messages, not raw backend error bodies (T-12-02-02).

**frontend/lib/auth.ts** — Modified three functions:
- `setAuth`: dual-writes `teacher-token` cookie (`SameSite=Lax; max-age=604800`) alongside existing localStorage writes
- `getToken`: returns localStorage first, falls back to `teacher-token` cookie parse
- `clearAuth`: expires `teacher-token` cookie (`max-age=0`) alongside localStorage removal

**frontend/lib/admin-auth.ts** — Same pattern for `admin-token`:
- `setAdminAuth`: dual-writes `admin-token` cookie
- `getAdminToken`: falls back to `admin-token` cookie
- `clearAdminAuth`: expires `admin-token` cookie

**frontend/app/login/page.tsx** — Updated `handleSubmit`:
- Teacher branch: calls `fetch('/api/auth/teacher-login', ...)` → on success `window.location.href = NEXT_PUBLIC_APP_ORIGIN + '/teacher'`
- Student branch: still calls `login(upn, password)` from lib/auth → on success `window.location.href = NEXT_PUBLIC_STUDENT_ORIGIN + '/game/homework'`
- Removed `useRouter` import and `router` declaration (no longer used)
- Register flow unchanged

**frontend/app/admin/login/page.tsx** — Updated `handleSubmit`:
- Calls `fetch('/api/auth/admin-login', ...)` → on success `window.location.href = NEXT_PUBLIC_ADMIN_ORIGIN + '/admin'`
- Removed `adminLogin` import from `@/lib/admin-auth`
- Removed `useRouter` import and `router` declaration
- Generic error message preserved (D-14 + T-06-02-04 compliance maintained)

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (frontend) | PASS (0 errors) |
| `teacher-token` in teacher-login/route.ts | PASS (count: 1) |
| `admin-token` in admin-login/route.ts | PASS (count: 1) |
| `student-token` in student-login/route.ts | PASS (count: 1) |
| `document.cookie` count in auth.ts | PASS (count: 3 — setAuth, getToken fallback, clearAuth) |
| `document.cookie` count in admin-auth.ts | PASS (count: 3) |
| `window.location.href` in login/page.tsx | PASS (count: 2) |
| `window.location.href` in admin/login/page.tsx | PASS (count: 1) |
| `gameLogin` exists in game.service.ts | PASS |
| All four route files exist | PASS |
| Backend nest build (via tsc with worktree files) | PASS (only pre-existing bfa.service.ts error unrelated to game module) |

**Verification note on check 10 (plan says `grep -c "gameLogin\|GameLoginDto" game.service.ts >= 2`):** The service has `gameLogin` defined once (count: 1). `GameLoginDto` is only in `game.dto.ts` and `game-auth.controller.ts` — the service takes primitive string args, not the DTO. This is correct architecture; the plan verification criterion was over-specified. The done criteria (`gameLogin method exists on GameService`) is fully satisfied.

## Deviations from Plan

### Architecture Choice (expected)

**GameAuthController approach:** The plan explicitly anticipated this: "create a new file `backend/src/game/game-auth.controller.ts` with `@Controller('game')` ... WITHOUT the class-level `@UseGuards(AuthGuard)`". No `@Public()` decorator was found in the codebase, so the separate controller path was followed exactly as specified.

### Auto-fixed Issues

None.

## Threat Flags

No new security surface beyond the plan's threat model. T-12-02-02 (information disclosure via raw backend errors) was proactively mitigated: all three login route handlers return generic messages, not raw backend error bodies.

## Known Stubs

None. All route handlers proxy to real backend endpoints. The student login in `login/page.tsx` still uses password-based `login()` (noted in plan: "will be refactored in plan 12-03").

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Backend game auth endpoint | `1d54787` | backend/src/game/game.dto.ts, game.service.ts, game-auth.controller.ts (created), game.module.ts |
| Task 2: Frontend route handlers + auth libs + login pages | `6afcd14` | 4 route.ts files (created), frontend/lib/auth.ts, admin-auth.ts, app/login/page.tsx, app/admin/login/page.tsx |

## Self-Check: PASSED

- All 12 implementation files confirmed present in worktree
- `12-02-SUMMARY.md` confirmed present
- Commit `1d54787` confirmed in `git log`
- Commit `6afcd14` confirmed in `git log`
