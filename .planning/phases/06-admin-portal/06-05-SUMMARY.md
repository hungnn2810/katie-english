---
phase: 06-admin-portal
plan: "05"
subsystem: admin-portal
tags: [admin, students, backend, frontend, read-only, drill-down]
dependency_graph:
  requires: [06-01, 06-02]
  provides: [admin-students-endpoints, admin-students-page]
  affects: [admin.module.ts, admin-portal-api.ts]
tech_stack:
  added: []
  patterns: [two-view-local-state, tdd-green, AdminGuard, Prisma-select-with-_count]
key_files:
  created:
    - backend/src/admin/admin-students.dto.ts
    - backend/src/admin/admin-students.service.ts
    - backend/src/admin/admin-students.controller.ts
    - backend/src/admin/admin-students.service.spec.ts
    - frontend/app/admin/students/page.tsx
  modified:
    - backend/src/admin/admin.module.ts
    - frontend/lib/admin-portal-api.ts
decisions:
  - Two-view local state (not a separate route) for list→drill-in per 06-PATTERNS.md
  - AdminStudentsService.findById uses select:{id:true} (minimal fetch) then throws NotFoundException before results query
  - ScoreBadge copied from teacher/sessions/page.tsx (identical thresholds ≥80 green, ≥50 yellow, else red)
  - Skeleton rows used for loading state (consistent with classes page pattern)
metrics:
  duration: "5m"
  completed: "2026-05-24T07:32:12Z"
  tasks_completed: 2
  files_changed: 7
---

# Phase 06 Plan 05: Admin Students — Read-Only List + Drill-In Results

**One-liner:** Two read-only admin-students endpoints (GET /admin/students + GET /admin/students/:id/results) behind AdminGuard wired to a two-view /admin/students page with ScoreBadge and exact UI-SPEC copy.

## What Was Built

### Backend (Task 1)

**Endpoint inventory:**

| Route | Guard | Returns |
|-------|-------|---------|
| GET /admin/students | AdminGuard | AdminStudentListItem[] ordered by fullname asc |
| GET /admin/students/:id/results | AdminGuard | AdminStudentResultItem[] ordered by startedAt desc |

**Cross-table include outline:**
- `Student.findMany` → select: `{ id, fullname, sex, classId, createdAt, class: { id, name, code, teacher: { id, name, upn } }, _count: { sessions } }`
- Students with `classId=null` return `class: null` (not excluded)
- Classes with `teacherId=null` return `class.teacher: null` (no crash)
- `HomeworkSession.findMany` → select: `{ id, startedAt, completedAt, score, assignment: { id, endDate, homework: { id, name, type } } }`
- In-progress sessions (`completedAt=null`) are included in results
- `findById` throws `NotFoundException('Student ${id} not found')` before results query

**TDD:** 7 tests written (RED → GREEN) covering all 6 behavior specs in the plan.

### Frontend (Task 2)

**admin-portal-api.ts additions:**
- `AdminStudentItem` interface (matches AdminStudentListItem backend shape)
- `AdminStudentResultItem` interface (matches backend HomeworkSession shape)
- `getAdminStudents()` → GET /admin/students
- `getStudentResults(id)` → GET /admin/students/:id/results

**Two-view structure (local state, not a route):**
```
StudentsPage
  selectedStudent === null → <StudentsTable onViewResults={setSelectedStudent} />
  selectedStudent !== null → <StudentResults student={s} onBack={() => setSelectedStudent(null)} />
```

**StudentsTable columns (exact UI-SPEC):** Student Name | Class | Teacher | Homeworks | Actions
- Class cell: `s.class ? s.class.name : '—'`
- Teacher cell: `s.class?.teacher ? (name ?? upn) : '—'`
- Homeworks cell: `s._count.sessions`
- Actions: ghost Button "View Results"
- Empty state: "No students yet" + "Students are added to classes by teachers."
- Loading: skeleton rows

**StudentResults:**
- Heading: `{student.fullname} — Homework Results` (26px bold leading-none)
- Back link: `← Back to Students` (button, state transition not Link)
- Columns: Homework | Score | Started | Completed
- ScoreBadge: ≥80 green, ≥50 yellow, <50 red; null → "—"
- Empty state: "No homework submissions yet."

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1 — Backend endpoints (TDD GREEN) | 34d85ec | admin-students.{dto,service,controller,service.spec}.ts + admin.module.ts |
| Task 2 — Frontend page + API | 060e249 | admin-portal-api.ts + app/admin/students/page.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-06-05-02 IDOR | AdminGuard + ParseIntPipe + findById throws 404 on missing ids |
| T-06-05-03 Auth Bypass | @UseGuards(AdminGuard) at controller class level; both routes inherit |
| T-06-05-04 Tampering | GET-only endpoints; no request body surface; dto contains response interfaces only |

## Known Stubs

None — all data fields are wired to live API calls.

## Threat Flags

None — no new network surface beyond the two planned GET endpoints.

## Self-Check

- [x] backend/src/admin/admin-students.controller.ts exists
- [x] backend/src/admin/admin-students.service.ts exists
- [x] backend/src/admin/admin-students.dto.ts exists
- [x] backend/src/admin/admin-students.service.spec.ts exists
- [x] frontend/app/admin/students/page.tsx exists
- [x] frontend/lib/admin-portal-api.ts extended with student fns
- [x] backend/src/admin/admin.module.ts updated with AdminStudentsService + AdminStudentsController
- [x] Commit 34d85ec exists (Task 1)
- [x] Commit 060e249 exists (Task 2)
- [x] frontend tsc --noEmit exits 0
- [x] backend tsc --noEmit exits 0
- [x] All 7 service unit tests pass

## Self-Check: PASSED
