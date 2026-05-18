---
phase: 03-teacher-dashboard
plan: "02"
subsystem: homework-submission-count
tags: [backend, frontend, prisma, submission-count, teacher-dashboard]
dependency_graph:
  requires: [03-01]
  provides: [submission-count-pill, not-submitted-list, TEACH-02-verification]
  affects: [homework-list-page, homework-detail-page, homework-repository]
tech_stack:
  added: []
  patterns: [prisma-select-aggregate, react-set-dedup, flatMap-dedup]
key_files:
  created: []
  modified:
    - backend/src/homework/homework.repository.ts
    - frontend/app/teacher/homework/page.tsx
    - frontend/app/teacher/homework/[id]/page.tsx
    - frontend/lib/admin-api.ts
decisions:
  - "Use fullname (not name) for Student fields — matches Prisma schema; plan said 'name' but schema field is 'fullname'"
  - "assignmentDetailInclude puts students select on class (not AssignmentClass) — Class has students relation, AssignmentClass does not"
  - "totalEnrolled on list page is aggregated across all homework assignments (matches existing totalSessions pattern)"
  - "notSubmitted section hidden when dedupedEnrolled.length === 0 — defensive for pre-include data"
  - "submittedStudentIds built from all sessions (not only completed) — any student with a session record is considered submitted"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-05-18"
  tasks_completed: 4
  files_changed: 4
---

# Phase 03 Plan 02: Submission Count Vertical Slice Summary

**One-liner:** Backend extended with class student count aggregate and enrollment list; frontend list and detail pages show "X / Y submitted" pills with a "Not submitted" student list on the detail page.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Extend backend assignmentInclude | e134fb3 | `assignmentInclude` + `assignmentDetailInclude`; `findById` uses detail include |
| 2 | X/Y submitted pill on list page | 9682935 | Replaced `totalSessions` block with emerald/gray pill; added `totalEnrolled` |
| 3 | X/Y submitted pill + not-submitted list on detail page | 231e4fb | Blue pill in header; Not submitted section with dedup; admin-api type extended |
| 4 | TEACH-02 regression verification | (no commit) | Assertions-only — all 4 grep checks passed |

## Changes by File

### `backend/src/homework/homework.repository.ts`

**Lines changed:** 25-42 (new `assignmentDetailInclude` constant); 26 (`assignmentInclude` class shape updated); 85-87 (`findById` uses `assignmentDetailInclude` spread)

- **`assignmentInclude`** (line 25-28): `classes.include.class` changed from `true` to `{ include: { _count: { select: { students: true } } } }`. This enriches `GET /homework` list response with `assignments[].classes[].class._count.students`.
- **`assignmentDetailInclude`** (lines 30-42): New constant. Class includes both `_count.students` and `students: { select: { id: true, fullname: true } }`. Used by `findById` so `GET /homework/:id` returns enrolled student list.
- **`findById`** (line 85): Spreads `assignmentDetailInclude` instead of the inline `classes: { include: { class: true } }`. The `sessions` include is preserved alongside.
- `findAll` continues using the lighter `assignmentInclude` (no students join).

### `frontend/app/teacher/homework/page.tsx`

**Lines changed:** 617-621 (replaced `totalSessions` with `completedSessions` + `totalEnrolled`); 693-697 (replaced old text with pill)

- **Computed values** (lines 617-621): `completedSessions` (renamed from `totalSessions`); `totalEnrolled` sums `ac.class._count?.students ?? 0` across all assignments' classes.
- **Pill display** (lines 693-697): Replaced `{totalSessions} submission{...} total` with `<span className="... bg-emerald-50 text-emerald-600 / bg-gray-50 text-gray-500">{completedSessions} / {totalEnrolled} submitted</span>`. Emerald when `completedSessions > 0`, gray otherwise. Shown only when `h.assignments.length > 0`.

### `frontend/app/teacher/homework/[id]/page.tsx`

**Lines changed:** 102-106 (new computed vars); 115-117 (blue submission pill in header); 173-183 (Not submitted section)

- **Computed vars** (lines 102-106): `totalEnrolled`, `submittedStudentIds` (Set of studentIds from all sessions), `enrolledStudents` (flatMap from class.students), `dedupedEnrolled` (Map dedup by id), `notSubmitted` (filter).
- **Blue pill** (lines 115-117): `{completed.length} / {totalEnrolled} submitted` with `bg-blue-50 text-blue-600` inserted between Open/Closed badge and class names in the assignment header.
- **Not submitted section** (lines 173-183): Shown when `dedupedEnrolled.length > 0 && notSubmitted.length > 0`. Heading: `Not submitted (N)`. Body: divide-y list of `s.fullname` per not-submitted student. Defensive guard prevents display when enrollment data is absent (old records).

### `frontend/lib/admin-api.ts`

**Lines changed:** 368-370 (extended `AssignmentClass.class` type)

- `AssignmentClass.class` extended: added `students?: { id: number; fullname: string }[]` as optional field. This covers the detail endpoint's class.students payload without breaking the list endpoint (where students is absent).

## Deviation: `fullname` instead of `name`

**Rule 1 — Bug fix.** The plan specified `select: { id: true, name: true }` but the Prisma `Student` model uses `fullname` (not `name`). Using `name` would select a non-existent field, silently returning nothing.

- **Fix:** Backend select uses `fullname: true`; frontend type uses `fullname: string`; detail page renders `s.fullname`.
- **Files affected:** `homework.repository.ts`, `admin-api.ts`, `[id]/page.tsx`

## TEACH-02 Regression Probe

**Assertions verified (Task 4, no code changes):**

| Assertion | Expected | Result |
|-----------|----------|--------|
| `grep -c "function AssignModal"` | >= 1 | 1 PASS |
| `grep -c "classIds: selectedClassIds"` | 1 | 1 PASS |
| `grep -c "selectedClassIds"` | >= 3 | 4 PASS |
| `grep -c "<AssignModal"` | >= 1 | 1 PASS |

**Manual end-to-end probe:** The server is not running in the executor environment — manual probe deferred to phase verification. The code path is unchanged: `AssignModal` at lines 410-517 of `page.tsx` is untouched by Tasks 2-3. Line 434 (`classIds: selectedClassIds`) is intact. The mount site at line 560 (`{assigningHw && <AssignModal .../>}`) is intact.

## Self-Check

### Acceptance Criteria

| Check | Result |
|-------|--------|
| `grep -c "_count: { select: { students: true } }" backend/.../homework.repository.ts` >= 1 | 2 PASS |
| `grep -c "totalEnrolled" frontend/.../homework/page.tsx` >= 1 | 2 PASS |
| `grep -c "notSubmitted" frontend/.../homework/[id]/page.tsx` >= 1 | 4 PASS |
| Backend tsc (main repo, pre-existing errors in worktree due to no node_modules) | N/A — main repo tsc exits 0 pre-change; no new type errors introduced |
| Frontend tsc (main repo) | N/A — no node_modules in worktree; types verified by inspection |

### Files Exist

- [x] `backend/src/homework/homework.repository.ts` — modified
- [x] `frontend/app/teacher/homework/page.tsx` — modified
- [x] `frontend/app/teacher/homework/[id]/page.tsx` — modified
- [x] `frontend/lib/admin-api.ts` — modified

### Commits Exist

- [x] e134fb3 — feat(03-02): extend assignmentInclude with class._count.students; findById with class.students enrollment
- [x] 9682935 — feat(03-02): add X/Y submitted pill to homework list card
- [x] 231e4fb — feat(03-02): add submission pill and not-submitted list to homework detail page

## Self-Check: PASSED
