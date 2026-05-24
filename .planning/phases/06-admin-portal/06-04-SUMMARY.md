---
phase: 06-admin-portal
plan: "04"
subsystem: admin-portal
tags: [admin, classes, crud, transaction, scoped-delete]
dependency_graph:
  requires: [06-01, 06-03]
  provides: [admin-classes-endpoints, admin-classes-page, teacher-teacherId-write]
  affects: [frontend/app/admin/classes, backend/src/admin, backend/src/class]
tech_stack:
  added: []
  patterns:
    - "Interactive prisma.$transaction(async tx => ...) for multi-step deletes with intermediate reads"
    - "Scoped delete: capture studentIds before nulling classId, then delete sessions by (assignmentId IN ..., studentId IN ...) intersection"
    - "NaN guard: parseInt + isNaN check on teacherId query string before Prisma"
    - "Teacher class create: reads req.user.sub from JWT, not from request body"
key_files:
  created:
    - backend/src/admin/admin-classes.dto.ts
    - backend/src/admin/admin-classes.service.ts
    - backend/src/admin/admin-classes.controller.ts
    - backend/src/admin/admin-classes.service.spec.ts
    - frontend/app/admin/classes/page.tsx
  modified:
    - backend/src/admin/admin.module.ts
    - backend/src/class/class.repository.ts
    - backend/src/class/class.service.ts
    - backend/src/class/class.controller.ts
    - frontend/lib/admin-portal-api.ts
decisions:
  - "REVIEW M-01 resolved: delete scoped to class's own students' sessions; HomeworkAssignment rows are NEVER deleted — only HomeworkAssignmentClass join rows; orphan HomeworkAssignment rows (assignments that lost their only class link) are accepted residue per option 1 ('orphans sessions but safer')"
  - "REVIEW H-01 resolved: interactive $transaction(async tx => ...) form used — supports intermediate findMany reads between writes"
  - "REVIEW L-01 resolved: NaN guard on teacherId — parseInt + isNaN check, throws BadRequestException('teacherId must be a number')"
  - "D-11 respected: AdminUpdateClassDto has no teacherId field; teacher-class ownership only flows from JWT"
  - "teacher.POST /classes now writes teacherId from req.user.sub (JWT), not from request body"
  - "Delete confirm dismiss button uses 'Keep class' per UI-SPEC (never 'Cancel')"
metrics:
  duration: "~40 minutes"
  completed: "2026-05-23T14:28:40Z"
  tasks_completed: 2
  files_changed: 10
---

# Phase 06 Plan 04: Admin Classes Management Summary

**One-liner:** Admin classes vertical slice — browse/filter/edit/delete with scoped interactive-transaction delete (REVIEW H-01 + M-01) and teacher-authored class teacherId wiring (REVIEW L-01).

## What Was Built

### Backend: `/admin/classes` Endpoint Inventory (3 routes)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/admin/classes?teacherId=<id>` | AdminGuard | List all classes with teacher relation + student count; optional teacher filter |
| PUT | `/admin/classes/:id` | AdminGuard | Update class name/code/dates/status/schedule (no teacherId — D-11) |
| DELETE | `/admin/classes/:id` | AdminGuard | Scoped transactional delete (H-01 + M-01) |

### Scoped Delete Transaction Outline (REVIEW H-01 + M-01)

The delete uses `prisma.$transaction(async (tx) => { ... })` — the **interactive callback form** — because intermediate `findMany` reads are needed to compute ID sets before issuing scoped deletes:

1. **Capture students** currently in this class BEFORE nulling classId:
   `const students = await tx.student.findMany({ where: { classId: id } })`
   `const studentIds = students.map(s => s.id)`

2. **Find assignment IDs** linked to this class via join table:
   `const linkRows = await tx.homeworkAssignmentClass.findMany({ where: { classId: id } })`
   `const assignmentIds = linkRows.map(r => r.assignmentId)`

3. **Delete sessions scoped to THIS class's students** (M-01 — other-class students keep their sessions):
   `tx.homeworkSession.deleteMany({ where: { assignmentId: { in: assignmentIds }, studentId: { in: studentIds } } })`

4. **Remove HomeworkAssignmentClass join rows for THIS class** (NOT the HomeworkAssignment itself):
   `tx.homeworkAssignmentClass.deleteMany({ where: { classId: id } })`

5. **Detach students** (classId → null):
   `tx.student.updateMany({ where: { classId: id }, data: { classId: null } })`

6. **Delete the class row**:
   `tx.class.delete({ where: { id } })`

**REVIEW H-01 compliance:** Interactive callback form — the `tx` parameter is used for ALL writes. The array form `$transaction([...])` is NOT present anywhere.

**REVIEW M-01 compliance:** `homeworkAssignment.deleteMany` is NEVER called. The parent HomeworkAssignment row survives even if it loses all class links — it becomes an orphan (no remaining HomeworkAssignmentClass rows), which is accepted as benign residue per option 1. Students in OTHER classes that share an assignment via HomeworkAssignmentClass retain their HomeworkSession rows.

### Teacher Class Create Flow — `teacherId` Wiring

`ClassController.POST /classes` now reads `(req as any).user?.sub` from the JWT payload (set by AuthGuard) and passes it as `teacherId` to `ClassService.create()` → `ClassRepository.create()`. The `CreateClassDto` is unchanged — `teacherId` flows from auth context only (T-06-04-02).

### NaN Guard on `teacherId` Query (REVIEW L-01)

```typescript
const tid = teacherId && teacherId !== 'ALL' ? parseInt(teacherId, 10) : undefined;
if (tid !== undefined && isNaN(tid)) throw new BadRequestException('teacherId must be a number');
```

- Missing → `undefined` (returns all classes)
- `'ALL'` → `undefined` (returns all classes)
- `'42'` → `42` (filters by teacher 42)
- `'abc'` → HTTP 400 `{ message: 'teacherId must be a number' }` (never reaches Prisma)

### Frontend: `/admin/classes` Page Structure

- **Filter row:** `Label` "Filter by teacher" + shadcn `Select` with "All teachers" default + one option per teacher
- **Table:** shadcn `Table` with columns: Class Name, Teacher, Students, Status, Actions
  - Teacher cell: `teacher.name ?? teacher.upn` or `—` if no teacher
  - Status cell: inline badge map (amber/emerald/slate per status)
  - Actions: "Edit" ghost button + "Delete" ghost button
- **Edit modal:** `Dialog` with name/code/startDate(DatePicker)/endDate(DatePicker)/status toggles/schedule day+time+duration inputs. Submit: `updateAdminClass` → reload → toast "Class updated."
- **Delete confirm Dialog:** Title "Delete class?"; body "Delete class? All homework and sessions in this class will be permanently deleted."; buttons "Delete class" (bg-destructive text-white) + "Keep class" (outline). No "Cancel" anywhere.
- **Empty states:**
  - `teacherFilter === 'ALL'` + no classes: "No classes yet" / "Classes are created by teachers from their dashboard."
  - `teacherFilter !== 'ALL'` + no classes: "No classes for this teacher" / "This teacher has not created any classes yet."
- **Toast:** fixed bottom-right, 3s, CheckCircle2 icon

## TDD Gate Compliance

- RED commit: `f9b1db9` — `test(06-04)` — 15 failing tests
- GREEN commit: `ee6a92c` — `feat(06-04)` — all 15 tests passing
- REFACTOR: not required (no structural cleanup needed)

## Deviations from Plan

### Auto-fixed Issues

None beyond what was specified.

### Test Refinements (Rule 1 — auto-fix)

**Controller test guard override:** The plan's test spec called `createTestingModule` for `AdminClassesController` without overriding `AdminGuard`. `AdminGuard` injects `TokenService` and `PrismaService` which aren't in the test module, causing a NestJS DI error. Fixed by adding `.overrideGuard(AdminGuard).useValue({ canActivate: () => true })`.

**ClassService test structure:** Inline `require()` and `await import()` mixing caused duplicate module initialization. Refactored both describe blocks to use `beforeEach` with `await import()` for clean module compilation per test suite.

**BadRequestException sync throw:** `controller.findAll('abc')` throws synchronously (not a rejected Promise) because the NaN check runs before any `await`. Changed from `await expect(...).rejects.toThrow()` to `expect(() => ...).toThrow()`.

## Known Stubs

None. All data flows from the backend API.

## Threat Flags

None beyond the plan's threat model. No new trust boundaries introduced.

## Self-Check

Files created/modified:
- [x] `backend/src/admin/admin-classes.dto.ts` — exists
- [x] `backend/src/admin/admin-classes.service.ts` — exists
- [x] `backend/src/admin/admin-classes.controller.ts` — exists
- [x] `backend/src/admin/admin.module.ts` — updated
- [x] `backend/src/class/class.repository.ts` — updated (teacherId param)
- [x] `backend/src/class/class.service.ts` — updated (teacherId param)
- [x] `backend/src/class/class.controller.ts` — updated (req.user.sub)
- [x] `frontend/lib/admin-portal-api.ts` — extended with teacher + class fns
- [x] `frontend/app/admin/classes/page.tsx` — created

Commits:
- [x] `f9b1db9` — test(06-04) RED phase
- [x] `ee6a92c` — feat(06-04) GREEN phase backend
- [x] `c9453f6` — feat(06-04) frontend page + api extension

## Self-Check: PASSED
