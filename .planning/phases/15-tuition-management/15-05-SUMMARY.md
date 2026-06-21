---
phase: 15-tuition-management
plan: "05"
subsystem: auth
tags: [nestjs, guard, jwt, teacher-role]

requires:
  - phase: 15-tuition-management plan 04
    provides: Phase 15 base implementation with TuitionReportTable and admin page

provides:
  - TuitionGuard class in auth.guard.ts accepting ADMIN and TEACHER roles
  - teacher-tuition-api.ts with all 6 tuition API functions using teacher JWT (authHeaders)
  - tuition.controller.ts uses TuitionGuard instead of AdminGuard

affects: [teacher-dashboard, admin-portal, tuition-management]

tech-stack:
  added: []
  patterns: [role-union guard pattern for endpoints shared between admin and teacher roles]

key-files:
  created:
    - frontend/lib/teacher-tuition-api.ts
  modified:
    - backend/src/auth/auth.guard.ts
    - backend/src/auth/auth.module.ts
    - backend/src/tuition/tuition.controller.ts
    - frontend/app/teacher/tuition/page.tsx

key-decisions:
  - "Created TuitionGuard as a new guard (rather than modifying AdminGuard) to avoid breaking admin-only endpoints"
  - "teacher-tuition-api.ts re-exports types from admin-portal-api.ts to avoid duplication while using teacher JWT"

requirements-completed:
  - TUITION-01
  - TUITION-03
  - TUITION-04
  - TUITION-05
  - TUITION-06

duration: 15min
completed: 2026-06-21
---

# Phase 15 Plan 05: TuitionGuard + Teacher Tuition API Summary

**TuitionGuard accepting ADMIN | TEACHER roles wired into TuitionController; teacher-tuition-api.ts using authHeaders() closes the D-06 LOCKED teacher access gap**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-21T00:00:00Z
- **Completed:** 2026-06-21T00:15:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `TuitionGuard` to `auth.guard.ts` — accepts `ADMIN` or `TEACHER` role; rejects all others with `ForbiddenException('Admins and teachers only')`
- Registered `TuitionGuard` in `AuthModule` providers and exports; `TuitionController` now uses `@UseGuards(TuitionGuard)` instead of `AdminGuard`
- Created `frontend/lib/teacher-tuition-api.ts` with all 6 tuition API functions using `authHeaders()` (teacher JWT from localStorage `token`)
- Teacher tuition page confirmed free of any `adminAuthHeaders` dependency

## Task Commits

1. **Task 1: Add TuitionGuard to auth.guard.ts and wire into tuition.controller.ts** — combined with Task 2 in `322a587`
2. **Task 2: Create teacher-tuition-api.ts and update teacher tuition page** — `322a587` (feat(15-05))

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified
- `backend/src/auth/auth.guard.ts` — TuitionGuard class appended (mirrors AdminGuard, combined role check)
- `backend/src/auth/auth.module.ts` — TuitionGuard added to providers and exports
- `backend/src/tuition/tuition.controller.ts` — @UseGuards switched from AdminGuard to TuitionGuard
- `frontend/lib/teacher-tuition-api.ts` — New: 6 tuition API functions using authHeaders() + re-exported types
- `frontend/app/teacher/tuition/page.tsx` — Comment added confirming teacher JWT usage

## Decisions Made
- Created a new `TuitionGuard` rather than widening `AdminGuard` to preserve the strict admin-only guarantee on other admin endpoints
- `teacher-tuition-api.ts` uses `import type + export type` pattern (re-exports from admin-portal-api) to avoid type duplication while keeping auth logic separate

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `tuition.repository.ts` (Prisma client not generated for tuition models) — not caused by this plan, not fixed here (unrelated to auth guard scope)

## Next Phase Readiness
- Backend: TuitionGuard deployed — teacher JWT will be accepted on all `/admin/tuition/*` endpoints
- Frontend: `teacher-tuition-api.ts` ready for direct page use; note that shared child components (TuitionConfigForm, GenerateRecordsModal, TuitionReportTable) still import from `admin-portal-api` — these components use `adminAuthHeaders()` which returns no auth header for teacher users. Full teacher-side functionality requires those components to be updated or replaced with teacher-auth-aware equivalents (deferred)
- Ready for Plan 15-06: TuitionReportTable checkbox selection + PaymentRecordDialog wire-up

---
*Phase: 15-tuition-management*
*Completed: 2026-06-21*
