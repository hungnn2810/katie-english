---
phase: 06-admin-portal
plan: 02
subsystem: admin-auth
tags: [nestjs, throttler, jwt, admin, prisma, react, nextjs, tdd]

# Dependency graph
requires:
  - phase: 06-admin-portal
    plan: 01
    provides: AdminGuard exported from AuthModule, UserRole.ADMIN in schema, ensureAdminUser seed
provides:
  - POST /admin/auth/login (ThrottlerGuard 5/60s, AdminAuthService)
  - GET /admin/stats (AdminGuard, AdminStatsService)
  - AdminModule wired into AppModule with ThrottlerModule (named bucket admin-login)
  - frontend/lib/admin-auth.ts (adminLogin, getAdminUser, clearAdminAuth, adminAuthHeaders, AdminUser)
  - frontend/lib/admin-portal-api.ts (getAdminStats, AdminStats, req<T> helper)
  - frontend/components/AdminShell.tsx (blue accent, 4 nav items, sign-out only)
  - frontend/app/admin/layout.tsx (auth-gated, bypasses login route)
  - frontend/app/admin/login/page.tsx (admin login form, blue accent)
  - frontend/app/admin/page.tsx (4 stat cards: Teachers/Classes/Students/Submissions)
affects: [06-03, 06-04, 06-05, 06-06]

# Tech tracking
tech-stack:
  added:
    - "@nestjs/throttler@^6.5.0 (rate limiting for admin login endpoint)"
  patterns:
    - "ThrottlerModule.forRoot with named bucket: { name: 'admin-login', ttl: 60_000, limit: 5 }"
    - "@Throttle({ 'admin-login': { limit: 5, ttl: 60_000 } }) on specific route method"
    - "@UseGuards(ThrottlerGuard) at class level on AdminAuthController"
    - "Separate localStorage keys (admin_token, admin_user) isolate admin session from teacher session"
    - "Layout auth bypass: pathname === '/admin/login' check prevents redirect loop"
    - "Catch-all error handler in login form forces 'Invalid email or password' regardless of HTTP status"

key-files:
  created:
    - backend/src/admin/admin-auth.dto.ts
    - backend/src/admin/admin-auth.service.ts
    - backend/src/admin/admin-auth.controller.ts
    - backend/src/admin/admin-stats.service.ts
    - backend/src/admin/admin-stats.controller.ts
    - backend/src/admin/admin.module.ts
    - backend/src/admin/admin-auth.service.spec.ts
    - backend/src/admin/admin-stats.service.spec.ts
    - frontend/lib/admin-auth.ts
    - frontend/lib/admin-portal-api.ts
    - frontend/components/AdminShell.tsx
    - frontend/app/admin/layout.tsx
    - frontend/app/admin/login/page.tsx
    - frontend/app/admin/page.tsx
  modified:
    - backend/package.json (@nestjs/throttler installed)
    - backend/src/app.module.ts (ThrottlerModule + AdminModule added)

key-decisions:
  - "ThrottlerModule registered globally in AppModule before AdminModule so named bucket exists at construction"
  - "Admin localStorage keys (admin_token, admin_user) kept separate from teacher keys (token, user) — no session collision"
  - "Login form catch-all masks HTTP 429 responses — rate-limit counter never exposed in UI (M-02 compliance)"
  - "AdminLayout bypasses AdminShell for /admin/login via pathname check — prevents auth redirect loop"
  - "AdminStats runs 4 parallel COUNT queries via Promise.all — no sequential DB round-trips"

# Metrics
duration: 7min
completed: 2026-05-23
---

# Phase 6 Plan 02: Admin Auth + Stats Vertical Slice Summary

**Admin login → dashboard end-to-end slice: POST /admin/auth/login (ThrottlerGuard 5/60s), GET /admin/stats (AdminGuard), AdminShell (blue accent), /admin/login page, /admin dashboard with 4 stat cards**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-23T13:57:34Z
- **Completed:** 2026-05-23T14:04:34Z
- **Tasks:** 4 (Task 1 TDD: 2 commits RED+GREEN; Tasks 2–4: 1 commit each)
- **Files created:** 14, **Files modified:** 2

## Accomplishments

### Backend AdminModule

- `admin-auth.dto.ts`: `AdminLoginDto` with `email` + `password` fields
- `admin-auth.service.ts`: `login()` — looks up user by `upn: dto.email`, rejects non-ADMIN role and wrong passwords with identical `'Invalid email or password'` message (T-06-02-01, T-06-02-04, T-06-02-06)
- `admin-auth.controller.ts`: `POST /admin/auth/login` — `@UseGuards(ThrottlerGuard)` at class level + `@Throttle({ 'admin-login': { limit: 5, ttl: 60_000 } })` on login method — resolves REVIEW M-02
- `admin-stats.service.ts`: `getStats()` — 4 parallel `COUNT` queries via `Promise.all`; submissions filtered `{ completedAt: { not: null } }`
- `admin-stats.controller.ts`: `GET /admin/stats` behind `AdminGuard`
- `admin.module.ts`: imports `[PrismaModule, AuthModule]`, provides both services, declares both controllers
- `app.module.ts`: `ThrottlerModule.forRoot([{ name: 'admin-login', ttl: 60_000, limit: 5 }])` registered before `AdminModule`

### TDD Gate Compliance

- **RED commit:** `e072332` — `test(06-02): add failing tests for AdminAuthService and AdminStatsService`
  - 4 tests for `AdminAuthService` (success, null user, wrong role, wrong password)
  - 4 tests for `AdminStatsService` (stats shape, submissions filter, teacher count, values)
  - Both suites failed with `Cannot find module` (correct RED state)
- **GREEN commit:** `c2ab068` — `feat(06-02): implement AdminModule` — all 8 tests pass

### Frontend Admin Auth Library

- `admin-auth.ts`: `AdminUser` interface, `getAdminToken/User`, `setAdminAuth`, `clearAdminAuth`, `adminAuthHeaders`, `adminLogin` — all using `admin_token`/`admin_user` localStorage keys
- `admin-portal-api.ts`: `parseApiError` + `req<T>` helper with `adminAuthHeaders`, `AdminStats` interface, `getAdminStats()` — ready for Plans 03–05 to extend with `getTeachers`, `getAdminClasses`, `getAdminStudents`

### AdminShell Component

Adapted from `TeacherShell.tsx` with:
- Accent constants: `#4F9DFF` / `rgba(79, 157, 255, 0.12)` / `#60A5FA` (no orange)
- GENERAL nav group: Dashboard `/admin`, Teachers `/admin/teachers`, Classes `/admin/classes`, Students `/admin/students`
- Active nav detection: exact match for `/admin` root, `startsWith` for sub-routes
- Page title weight: `font-bold` (700, down from 900) per UI-SPEC Typography
- User menu: sign-out only (no change-password form)
- `logout()` calls `clearAdminAuth()` + `router.push('/admin/login')`
- User avatar initial from `user.email[0]` (not `user.upn`)

### Admin Pages (Vertical Slice)

- `app/admin/layout.tsx`: auth-gated wrapper; bypasses AdminShell when `pathname === '/admin/login'`; spinner while checking auth; null during redirect
- `app/admin/login/page.tsx`: two-panel blue-accented form; `adminLogin()` call; catch-all error forces `'Invalid email or password'` regardless of HTTP status (HTTP 429 masked, M-02 compliant)
- `app/admin/page.tsx`: `grid-cols-4` stat card grid; 28px bold `#4F9DFF` numbers; skeleton pulse loading; error banner with retry; empty-state when all counts zero

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 RED | `e072332` | test(06-02): 8 failing tests + @nestjs/throttler install |
| Task 1 GREEN | `c2ab068` | feat(06-02): AdminModule — admin-auth + admin-stats + AppModule wiring |
| Task 2 | `74ce4aa` | feat(06-02): frontend admin-auth lib + admin-portal-api |
| Task 3 | `843b6eb` | feat(06-02): AdminShell component |
| Task 4 | `607c836` | feat(06-02): admin layout + login + dashboard vertical slice |

## Files Created / Modified

**Created (14):**
- `backend/src/admin/admin-auth.dto.ts`
- `backend/src/admin/admin-auth.service.ts`
- `backend/src/admin/admin-auth.controller.ts`
- `backend/src/admin/admin-stats.service.ts`
- `backend/src/admin/admin-stats.controller.ts`
- `backend/src/admin/admin.module.ts`
- `backend/src/admin/admin-auth.service.spec.ts`
- `backend/src/admin/admin-stats.service.spec.ts`
- `frontend/lib/admin-auth.ts`
- `frontend/lib/admin-portal-api.ts`
- `frontend/components/AdminShell.tsx`
- `frontend/app/admin/layout.tsx`
- `frontend/app/admin/login/page.tsx`
- `frontend/app/admin/page.tsx`

**Modified (2):**
- `backend/package.json` — `@nestjs/throttler@^6.5.0` added to dependencies
- `backend/src/app.module.ts` — `ThrottlerModule` + `AdminModule` added to imports

## M-02 Resolution Note

REVIEW M-02 (admin login brute-force gap) is resolved:
- `@nestjs/throttler@^6.5.0` installed
- Named throttler bucket `admin-login` registered in `ThrottlerModule.forRoot`
- `AdminAuthController` decorated with `@UseGuards(ThrottlerGuard)` (class level) + `@Throttle({ 'admin-login': { limit: 5, ttl: 60_000 } })` (method level)
- After 5 attempts per IP in 60s, `ThrottlerException` returns HTTP 429
- Frontend login form catch-all maps any error (including 429) to `'Invalid email or password'` — throttle counter is never exposed in UI

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria verified.

## Known Stubs

None. The `getAdminStats` call is wired end-to-end against the live `/admin/stats` endpoint. The stat counts start at 0 on a fresh DB and increment with real data.

## Self-Check

- `backend/src/admin/admin.module.ts` exists: FOUND
- `backend/src/admin/admin-auth.controller.ts` exists: FOUND
- `backend/src/admin/admin-stats.controller.ts` exists: FOUND
- `frontend/lib/admin-auth.ts` exists: FOUND
- `frontend/lib/admin-portal-api.ts` exists: FOUND
- `frontend/components/AdminShell.tsx` exists: FOUND
- `frontend/app/admin/layout.tsx` exists: FOUND
- `frontend/app/admin/login/page.tsx` exists: FOUND
- `frontend/app/admin/page.tsx` exists: FOUND
- Commits e072332, c2ab068, 74ce4aa, 843b6eb, 607c836: all present in git log

## Self-Check: PASSED

---
*Phase: 06-admin-portal*
*Completed: 2026-05-23*
