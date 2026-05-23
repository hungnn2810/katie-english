---
phase: 06-admin-portal
plan: 03
subsystem: admin-teachers
tags: [nestjs, prisma, nextjs, crud, bcrypt, tdd, h-02]

# Dependency graph
requires:
  - phase: 06-admin-portal
    plan: 01
    provides: AdminGuard, User.disabled column, UserRole.ADMIN
  - phase: 06-admin-portal
    plan: 02
    provides: AdminModule skeleton, admin-portal-api req() helper
provides:
  - GET/POST/PUT/PATCH /admin/teachers endpoints (5 routes, AdminGuard)
  - OR(upn,email) duplicate-account pre-check + Prisma P2002 backstop (REVIEW H-02 resolved)
  - auth.service.login disabled gate: ForbiddenException('Account disabled') after approved check
  - /admin/teachers frontend page: table + create/edit modal + disable/enable confirm dialog
affects: [admin-portal, 06-04, 06-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "H-02 pattern: OR(upn,email) findFirst pre-check + Prisma P2002 try/catch backstop"
    - "TDD: RED (dd8db9b) → GREEN (f369dd6) with 19 passing tests"
    - "Explicit select omits password from all teacher query responses (T-06-03-02)"
    - "IDOR protection: findById filters by role: TEACHER — non-teacher IDs receive 404"

key-files:
  created:
    - backend/src/admin/admin-teachers.dto.ts
    - backend/src/admin/admin-teachers.service.ts
    - backend/src/admin/admin-teachers.controller.ts
    - backend/src/admin/admin-teachers.service.spec.ts
    - backend/src/auth/auth.service.spec.ts
    - frontend/app/admin/teachers/page.tsx
  modified:
    - backend/src/admin/admin.module.ts
    - backend/src/auth/auth.service.ts
    - frontend/lib/admin-portal-api.ts

key-decisions:
  - "OR(upn,email) pre-check uses findFirst not findUnique — covers both unique constraints per REVIEW H-02"
  - "P2002 backstop wraps prisma.user.create to handle race conditions — never surfaces unhandled 500"
  - "disabled check placed AFTER approved check in auth.service.login — preserves student approval semantics"
  - "email field immutable in UpdateTeacherDto and UI edit mode — T-06-03-08"
  - "No DELETE route per D-07 soft-delete semantics; only PATCH /disable and PATCH /enable"
  - "Keep teacher as dismiss label in both create modal and confirm dialog per UI-SPEC dismiss label rule"

# Metrics
duration: 8min
completed: 2026-05-23
---

# Phase 6 Plan 03: Admin Teacher Management Summary

**Teacher CRUD endpoints + disabled login gate + /admin/teachers page with table, modal, and confirm dialog — REVIEW H-02 resolved with OR(upn,email) pre-check and P2002 backstop**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-23T14:08:04Z
- **Completed:** 2026-05-23T14:16:50Z
- **Tasks:** 2 (Task 1 = TDD backend, Task 2 = frontend)
- **Files:** 9 (6 created, 3 modified)

## Accomplishments

### Backend (Task 1 — TDD RED + GREEN)

**Admin-teachers endpoint inventory (5 routes):**

| Method | Route | Handler | Guard |
|--------|-------|---------|-------|
| GET | /admin/teachers | findAll() | AdminGuard |
| POST | /admin/teachers | create(dto) | AdminGuard |
| PUT | /admin/teachers/:id | update(id, dto) | AdminGuard |
| PATCH | /admin/teachers/:id/disable | setDisabled(id, true) | AdminGuard |
| PATCH | /admin/teachers/:id/enable | setDisabled(id, false) | AdminGuard |

**REVIEW H-02 resolution:**
- Pre-check: `prisma.user.findFirst({ where: { OR: [{ upn: dto.email }, { email: dto.email }] } })` — covers BOTH unique constraints (upn + email)
- P2002 backstop: `prisma.user.create(...)` wrapped in try/catch — if `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'` escapes (race condition), rethrown as `ConflictException('An account with this email already exists.')`. Endpoint can never surface an unhandled 500.
- Smoke: POST /admin/teachers twice with same email → second returns 409. A user with `upn='A', email='B'` followed by POST with `email:'B'` also returns 409 (OR-branch on email field).

**Multi-teacher migration note (auth.service disabled gate):**
- Added `if (user.disabled) throw new ForbiddenException('Account disabled')` after the approved check in `login()`
- Order: credentials → approved check → disabled check → sign JWT
- Disabled teachers cannot receive new tokens; existing JWTs outlive the disable action (per D-07/T-06-03-03 — acceptable trade-off, session revocation deferred)

**TDD gate:**
- RED commit: `dd8db9b` — 19 tests failing (AdminTeachersService not yet implemented)
- GREEN commit: `f369dd6` — 19 tests passing, 2 intentional todos

### Frontend (Task 2)

**admin-portal-api.ts extensions:**
- `TeacherItem`, `CreateTeacherInput`, `UpdateTeacherInput` interfaces
- `getTeachers`, `createTeacher`, `updateTeacher`, `disableTeacher`, `enableTeacher` functions

**teachers/page.tsx structure:**
- `TeacherModal` — Dialog for create ("Create Teacher") and edit ("Edit Teacher"); email field disabled in edit mode (immutable per D-02); password optional in edit with "Leave blank to keep current" placeholder; dismiss label "Keep teacher" (not "Cancel")
- `ConfirmDialog` — Dialog for disable/enable confirm; dismiss: "Keep teacher"; confirm: "Disable account" (bg-destructive) or "Enable account" (bg-[#4F9DFF])
- Table with shadcn primitives: columns Name / Email / Phone / Status / Actions; Active badge (bg-emerald-50 text-emerald-700) / Disabled badge (bg-slate-100 text-slate-500); disabled row text: text-slate-400
- Empty state: "No teachers yet" heading + "Create the first teacher account to get started."
- Toast: fixed bottom-right, 3s auto-dismiss, bg-textPrimary text-white
- No "Cancel" word anywhere on the page (verified by grep)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 RED | Failing tests (AdminTeachersService + disabled gate) | dd8db9b | admin-teachers.service.spec.ts, auth.service.spec.ts |
| 1 GREEN | Backend CRUD implementation | f369dd6 | admin-teachers.dto/service/controller.ts, admin.module.ts, auth.service.ts |
| 2 | Frontend API + teachers page | 98dc7e1 | admin-portal-api.ts, teachers/page.tsx |

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria verified.

## Known Stubs

None. All data flows are wired to live endpoints. Teacher table loads from `GET /admin/teachers` on mount and after every mutation.

## Threat Flags

No new threat surface beyond what is documented in the plan's `<threat_model>`. All 5 routes are under `@UseGuards(AdminGuard)`. The disabled-gate addition to `auth.service.login` is within the plan's T-06-03-03 threat register entry.

## Requirements Closed

- **ADMIN-02**: Admin can create teacher account from `/admin/teachers` with name, email, phone, password — created teacher can immediately log in at `/login`
- **ADMIN-03**: Admin can edit teacher (name/phone/password) and disable/enable — disabled teachers cannot log in until re-enabled
- **REVIEW H-02**: OR(upn,email) duplicate pre-check + P2002 backstop. Endpoint never surfaces an unhandled 500 from a unique-constraint collision.

## Self-Check

Files created/modified:
- `backend/src/admin/admin-teachers.dto.ts` ✓
- `backend/src/admin/admin-teachers.service.ts` ✓
- `backend/src/admin/admin-teachers.controller.ts` ✓
- `backend/src/admin/admin-teachers.service.spec.ts` ✓
- `backend/src/auth/auth.service.spec.ts` ✓
- `backend/src/admin/admin.module.ts` (modified) ✓
- `backend/src/auth/auth.service.ts` (modified) ✓
- `frontend/lib/admin-portal-api.ts` (modified) ✓
- `frontend/app/admin/teachers/page.tsx` ✓

Commits: dd8db9b, f369dd6, 98dc7e1 — all verified in git log.

## Self-Check: PASSED

---
*Phase: 06-admin-portal*
*Completed: 2026-05-23*
