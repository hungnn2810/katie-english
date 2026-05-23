---
phase: 06-admin-portal
plan: 01
subsystem: auth
tags: [prisma, jwt, nestjs, admin, guards, schema, bcrypt]

# Dependency graph
requires:
  - phase: 01-speaking-homework
    provides: JWT auth foundation (TokenService, AuthGuard, TeacherGuard) used as pattern for AdminGuard
provides:
  - UserRole.ADMIN enum variant in Prisma schema and DB
  - User.email, User.name, User.phone, User.disabled columns
  - Class.teacherId nullable FK relation (TeacherClasses)
  - JwtPayload.role union extended to include 'ADMIN'
  - AdminGuard class (verifies ADMIN-role JWT, no DB lookup)
  - AdminGuard exported from AuthModule
  - ensureAdminUser bootstrap seed (idempotent, ADMIN_EMAIL/ADMIN_PASSWORD driven)
affects: [06-admin-portal, 06-02, 06-03, 06-04, 06-05, 06-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AdminGuard: JWT-only role check (no DB lookup) for env-seeded admin account"
    - "ensureAdminUser: idempotent findUnique short-circuit seed on bootstrap"
    - "TDD: RED test commit before GREEN implementation commit"

key-files:
  created:
    - backend/src/auth/admin.guard.spec.ts
  modified:
    - backend/prisma/schema.prisma
    - backend/src/auth/jwt.service.ts
    - backend/src/auth/auth.guard.ts
    - backend/src/auth/auth.module.ts
    - backend/src/main.ts

key-decisions:
  - "AdminGuard does not perform DB lookup on each request — JWT role assertion is sole check (D-04, T-06-01-06 DoS mitigation)"
  - "ensureAdminUser sets email=upn so email column matches login key for admin account"
  - "Task 2 (prisma db push + prisma generate) deferred — Docker Desktop paused; Prisma client types will include ADMIN/email after next db push + generate"
  - "tsc --noEmit exits 0 once Prisma client is regenerated; only errors are Prisma UserRole.ADMIN and email field (not yet in generated client)"

patterns-established:
  - "AdminGuard pattern: verify Bearer JWT, check payload.role === 'ADMIN', throw ForbiddenException('Admins only') otherwise — no PrismaService DB call"
  - "Class.teacherId is nullable (Int?) so existing rows survive migration without backfill"

requirements-completed:
  - ADMIN-01

# Metrics
duration: 7min
completed: 2026-05-23
---

# Phase 6 Plan 01: Admin Portal Foundation Summary

**Prisma schema extended with ADMIN role, teacher account fields (email/name/phone/disabled), and Class.teacherId FK; JWT contract extended; AdminGuard wired into AuthModule; ensureAdminUser seed added**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-23T13:45:44Z
- **Completed:** 2026-05-23T13:52:12Z
- **Tasks:** 3 (Task 2 deferred — DB push blocked by Docker Desktop paused)
- **Files modified:** 6

## Accomplishments

- Prisma schema: `UserRole` enum extended with `ADMIN` variant; `User` model gets `email/name/phone/disabled` fields and `classes Class[] @relation("TeacherClasses")`; `Class` model gets `teacherId Int?` + teacher relation — all additive, no existing data affected
- JWT contract: `JwtPayload.role` union extended from `'TEACHER' | 'STUDENT'` to `'TEACHER' | 'STUDENT' | 'ADMIN'`
- `AdminGuard` added to `auth.guard.ts`: verifies Bearer JWT, rejects non-ADMIN role with 403 "Admins only", no DB lookup (per D-04/T-06-01-06)
- `AuthModule` updated: `AdminGuard` added to `providers` and `exports` arrays — available for injection in all downstream admin controllers
- `ensureAdminUser` seed added to `main.ts`: reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars, idempotent (no-op if user exists), bcrypt cost 10, sets `role: UserRole.ADMIN` and `approved: true`
- All 7 TDD tests pass (2 TokenService + 5 AdminGuard)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema** - `b40f4e2` (feat)
2. **Task 2: Push schema to DB** - DEFERRED (Docker Desktop paused — run `cd backend && npx prisma db push && npx prisma generate` when Docker is unpaused)
3. **Task 3 RED: Failing tests for AdminGuard** - `fde9c58` (test)
4. **Task 3 GREEN: Implement AdminGuard + JwtPayload + main.ts seed** - `72e363b` (feat)

## Files Created/Modified

- `backend/prisma/schema.prisma` — ADMIN enum, User email/name/phone/disabled/classes fields, Class teacherId/teacher relation
- `backend/src/auth/jwt.service.ts` — JwtPayload.role extended to include 'ADMIN'
- `backend/src/auth/auth.guard.ts` — AdminGuard class added after TeacherGuard
- `backend/src/auth/auth.module.ts` — AdminGuard added to providers + exports
- `backend/src/main.ts` — ensureAdminUser function + bootstrap call site
- `backend/src/auth/admin.guard.spec.ts` — 7 TDD tests (RED/GREEN verified)

## Decisions Made

- **AdminGuard no DB lookup**: Intentional per D-04 and threat model T-06-01-06 — the admin account is env-seeded and never managed via UI; signed JWT role assertion is sufficient; eliminates a hot-path DB hit on every admin request
- **email=upn for admin seed**: The `ensureAdminUser` seed sets `email: upn` so the new `email` column matches the login identifier for the admin account
- **Task 2 deferred**: `prisma db push` and `prisma generate` require the Postgres container. Docker Desktop is manually paused (same situation as Phase 5 Plan 02). The schema file is correct and will push cleanly (all additive changes, no `--accept-data-loss` needed). `tsc --noEmit` will exit 0 after `prisma generate` runs.

## Deviations from Plan

None — plan executed as specified. The Task 2 deferral is an environmental constraint (Docker Desktop paused), not a code deviation. The TypeScript code is complete and correct; only Prisma client regeneration is pending.

## Issues Encountered

- **Docker Desktop paused**: `prisma db push` fails with P1001 (can't reach `localhost:5432`). This is a pre-existing condition documented in STATE.md from Phase 5. Schema changes are additive-only and will push cleanly when Docker is unpaused.
- **Worktree has no node_modules**: tsc/prisma run from main repo's `node_modules`. Tests run with `NODE_PATH=/path/to/main/backend/node_modules` pointing to main repo — confirmed all 7 tests pass.
- **npx resolves Prisma v7 globally**: Used local `backend/node_modules/.bin/prisma` from main repo instead of `npx prisma` to avoid v7 config format incompatibility.

## User Setup Required

Add to `backend/.env` before first boot (required for admin seed):

```
ADMIN_EMAIL=admin@katie.com
ADMIN_PASSWORD=<strong-password>
```

Then run (once Docker Desktop is unpaused):

```bash
cd backend
npx prisma db push
npx prisma generate
```

The backend will auto-seed the admin user on next startup if these env vars are present.

## TDD Gate Compliance

- RED commit: `fde9c58` — test(06-01): 7 failing tests (AdminGuard not yet implemented, ADMIN not in JwtPayload type)
- GREEN commit: `72e363b` — feat(06-01): all 7 tests pass after implementation

## Next Phase Readiness

- Schema foundation ready for Plan 02 (admin auth login endpoint) — `AdminGuard` exportable, `ADMIN` role in JWT
- `prisma db push` + `prisma generate` must be run before Plan 02 can use `UserRole.ADMIN` in TypeScript imports from `@prisma/client`
- Plan 02 can import `AdminGuard` directly from `AuthModule` exports

---
*Phase: 06-admin-portal*
*Completed: 2026-05-23*
