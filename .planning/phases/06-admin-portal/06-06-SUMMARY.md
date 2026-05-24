---
phase: 06-admin-portal
plan: "06"
subsystem: admin-portal
tags: [admin, homework, delete, destructive, transactional, frontend, backend]
dependency_graph:
  requires: [06-01, 06-02, 06-05]
  provides: [admin-homework-endpoints, admin-homework-page, admin-session-delete]
  affects: [admin.module.ts, admin-portal-api.ts, AdminShell.tsx, admin/layout.tsx]
tech_stack:
  added: []
  patterns: [interactive-transaction, destructive-confirm-dialog, dismiss-label-rule, route-ordering-guard]
key_files:
  created:
    - backend/src/admin/admin-homework.service.ts
    - backend/src/admin/admin-homework.controller.ts
    - frontend/app/admin/homework/page.tsx
  modified:
    - backend/src/admin/admin-students.controller.ts
    - backend/src/admin/admin-students.service.ts
    - backend/src/admin/admin.module.ts
    - frontend/components/AdminShell.tsx
    - frontend/app/admin/layout.tsx
    - frontend/lib/admin-portal-api.ts
    - frontend/app/admin/students/page.tsx
decisions:
  - Interactive $transaction(async tx => ...) form used for homework delete per REVIEW H-01 (array form forbidden — cannot contain intermediate findMany reads)
  - DELETE sessions/:sessionId route placed before GET :id/results in admin-students.controller.ts per REVIEW M-04 (static segment before dynamic to document intended resolution)
  - FileText lucide icon chosen for Homework nav entry (already available in the icon set, no new bundle cost vs other pages)
  - Session delete uses simple prisma.homeworkSession.delete (cascades speaking/phonics/reading results via FK onDelete Cascade)
  - AdminShell sidebar extended from 4 to 5 nav items per REVIEW M-03 discoverability requirement
metrics:
  duration: "~15m"
  completed: "2026-05-24T07:42:27Z"
  tasks_completed: 2
  files_changed: 9
---

# Phase 06 Plan 06: Delete Homework + Delete Session — ADMIN-05 Completion

**One-liner:** Transactional homework delete (interactive `$transaction` cascade) + per-session delete behind AdminGuard, with a new `/admin/homework` list page and sidebar nav entry resolving REVIEW M-03, REVIEW H-01, and REVIEW M-04.

## What Was Built

### Task 1 — Backend (commit 7f29324)

#### Endpoint Inventory

| Route | Guard | Returns |
|-------|-------|---------|
| GET /admin/homework | AdminGuard | AdminHomeworkItem[] ordered by createdAt desc |
| DELETE /admin/homework/:id | AdminGuard | `{ deleted: true }` |
| DELETE /admin/students/sessions/:sessionId | AdminGuard | `{ deleted: true }` |

#### Transaction Outline for Homework Delete (REVIEW H-01)

```
prisma.$transaction(async (tx) => {
  1. tx.homeworkAssignment.findMany({ where: { homeworkId: id }, select: { id } })
     → collect assignmentIds
  2. tx.homeworkSession.deleteMany({ where: { assignmentId: { in: assignmentIds } } })
     → cascades SpeakingResult / PhonicsItemResult / ReadingResult (FK onDelete Cascade)
  3. tx.homework.delete({ where: { id } })
     → cascades HomeworkAssignment → HomeworkAssignmentClass (CASCADE)
     → cascades HomeworkPart + ReadingActivity (CASCADE)
});
```

The interactive callback form is used (not the array form) because an intermediate `findMany` is required to compute `assignmentIds` before writing session deletes. All writes go through the `tx` parameter — never the outer `this.prisma`.

#### Route Ordering Diff in admin-students.controller.ts (REVIEW M-04)

Before (plan 06-05):
```
@Get()    findAll()
@Get(':id/results')  getResults()
```

After (plan 06-06):
```
@Get()    findAll()
@Delete('sessions/:sessionId')  deleteSession()   ← NEW (static segment — before dynamic)
@Get(':id/results')  getResults()
```

DELETE and GET never collide (different HTTP methods), but the static-segment route is placed first as a defensive convention and to satisfy REVIEW M-04.

### Task 2 — Frontend (commit 3d5f7f1)

#### AdminShell Nav Diff (REVIEW M-03 — 4 → 5 entries)

Before:
```
Dashboard | Teachers | Classes | Students
```

After:
```
Dashboard | Teachers | Classes | Students | Homework  ← NEW
```

Icon: `FileText` from lucide-react. Active-nav detection from plan 06-02 already handles `/admin/homework` paths correctly.

#### layout.tsx TITLES Map Diff

Added: `'/admin/homework': 'Homework'`

#### admin-portal-api.ts Additions

- `AdminHomeworkItem` interface (id, name, type, speakingMode, createdAt, updatedAt, `_count.assignments`, `submissionCount`)
- `getAdminHomework()` → GET /admin/homework
- `deleteAdminHomework(id)` → DELETE /admin/homework/:id
- `deleteAdminSession(sessionId)` → DELETE /admin/students/sessions/:sessionId

#### /admin/homework Page Structure

- On mount: `getAdminHomework()` → state; inline error on load failure
- Table columns: Name | Type | Assignments | Submissions | Actions
- Type cell: neutral badge (`bg-slate-100 text-slate-700`)
- Name cell: `h.name ?? '—'`
- Actions cell: ghost Delete button → sets `confirmDelete`
- Empty state: "No homework yet" + "Homework templates are created by teachers from their dashboard."
- Destructive confirm dialog: "Delete homework?" heading + permanent-removal body + "Delete homework" confirm button (`bg-destructive text-white`) + "Keep homework" dismiss (NOT "Cancel")
- Toast: fixed bottom-right, 3s auto-dismiss

#### /admin/students Drill-In Extension

`StudentResults` subcomponent extended with:
- `confirmDelete: AdminStudentResultItem | null` + `deleting` + `toast` state
- Actions column appended to results table
- Per-row ghost Delete button → `setConfirmDelete(r)`
- Confirm dialog: "Delete session?" / UI-SPEC exact body: "Delete session? This will permanently remove the student's submission and score." / "Delete session" confirm (`bg-destructive text-white`) / "Keep session" dismiss
- `handleConfirmDelete`: calls `deleteAdminSession(id)` → filters from local state → toast "Session deleted."

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1 — Backend | 7f29324 | admin-homework.{service,controller}.ts + admin-students.{controller,service}.ts + admin.module.ts |
| Task 2 — Frontend | 3d5f7f1 | AdminShell.tsx + layout.tsx + admin-portal-api.ts + app/admin/homework/page.tsx + app/admin/students/page.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Human Verification Status

**PENDING** — Task 3 (checkpoint:human-verify) has NOT yet been completed.

Manual smoke results (psql/Prisma Studio orphan checks from the human-verify task) will be recorded here after the human verifier completes steps 1-12.

Human-verify outcome: **awaiting approval**

ADMIN-05 demonstrable: **pending human sign-off**

## REVIEW Resolution Status

| Review | Status |
|--------|--------|
| H-01: interactive `$transaction(async tx => ...)` form | Resolved — grep confirms `$transaction(async (tx)` present, array form absent |
| M-03: AdminShell Homework nav entry + layout TITLES | Resolved — 5 nav items, TITLES updated |
| M-04: `@Delete('sessions/:sessionId')` before `@Get(':id/results')` | Resolved — awk gate passes |

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-06-06-01 Tampering (cross-tenant) | AdminGuard on all routes; admin is global super-user by design |
| T-06-06-02 Integrity / H-01 orphans | Interactive `$transaction` — atomic or no-op; sessions deleted before homework to handle missing FK cascade |
| T-06-06-03 Tampering / mass-assignment | DELETE routes have no body; no DTO surface |
| T-06-06-04 IDOR | AdminGuard + ParseIntPipe + findById/findSessionById throw 404 before delete |
| T-06-06-09 Dismiss-label spoofing | grep confirms zero "Cancel" strings on both pages |
| T-06-06-10 Route shadowing (M-04) | Static segment route placed before dynamic; awk gate enforces source order |

## Known Stubs

None — all data fields wired to live API calls.

## Threat Flags

None — no new network surface beyond the three planned endpoints (GET /admin/homework + DELETE /admin/homework/:id + DELETE /admin/students/sessions/:sessionId), all covered by the plan's threat model.

## Self-Check

- [x] backend/src/admin/admin-homework.service.ts exists
- [x] backend/src/admin/admin-homework.controller.ts exists
- [x] backend/src/admin/admin-students.controller.ts has DELETE sessions/:sessionId BEFORE GET :id/results
- [x] backend/src/admin/admin-students.service.ts has findSessionById + deleteSession
- [x] backend/src/admin/admin.module.ts has AdminHomeworkService + AdminHomeworkController
- [x] frontend/components/AdminShell.tsx has Homework nav entry
- [x] frontend/app/admin/layout.tsx has /admin/homework → 'Homework'
- [x] frontend/lib/admin-portal-api.ts has all 3 new fns
- [x] frontend/app/admin/homework/page.tsx exists with Delete homework / Keep homework copy
- [x] frontend/app/admin/students/page.tsx extended with Delete session / Keep session copy
- [x] Commit 7f29324 exists (Task 1)
- [x] Commit 3d5f7f1 exists (Task 2)
- [x] No "Cancel" strings on either new page
- [x] UI-SPEC exact body copy present in students page
- [x] REVIEW M-04 awk gate passes
- [x] REVIEW H-01: interactive transaction form present, array form absent
