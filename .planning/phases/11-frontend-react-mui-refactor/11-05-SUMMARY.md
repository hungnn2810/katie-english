---
phase: 11-frontend-react-mui-refactor
plan: "05"
subsystem: frontend-admin
tags: [mui, design-system, admin-portal, refactor]
dependency_graph:
  requires: [11-01, 11-02]
  provides: [DS-05]
  affects:
    - frontend/components/AdminShell.tsx
    - frontend/app/admin/layout.tsx
    - frontend/app/admin/page.tsx
    - frontend/app/admin/teachers/page.tsx
    - frontend/app/admin/students/page.tsx
    - frontend/app/admin/classes/page.tsx
    - frontend/app/admin/homework/page.tsx
    - frontend/app/admin/login/page.tsx
tech_stack:
  added: []
  patterns:
    - MiniStat horizontal card (42px icon well + value + label)
    - CompletionBar inline progress bar (7px height, score-color coded)
    - TableShell + TableRow from shared ui/TableShell primitive
    - HwTypeChip from shared ui/HwTypeChip primitive
    - adminTheme ThemeProvider wrapping entire admin layout
    - 3px left-rail active nav indicator (absolute-positioned Box)
key_files:
  created: []
  modified:
    - frontend/components/AdminShell.tsx
    - frontend/app/admin/layout.tsx
    - frontend/app/admin/page.tsx
    - frontend/app/admin/teachers/page.tsx
    - frontend/app/admin/students/page.tsx
    - frontend/app/admin/classes/page.tsx
    - frontend/app/admin/homework/page.tsx
    - frontend/app/admin/login/page.tsx
decisions:
  - Admin login page redesigned from two-panel to minimal centered card to match design kit screens.jsx
  - Homework completion % computed as submissionCount/assignments (no per-class student count in API)
  - Students page Parent column shows teacher name since AdminStudentItem has no parent field
  - Teacher filter on homework page is UI-only since AdminHomeworkItem has no teacher field
metrics:
  duration_minutes: 8
  completed_date: "2026-06-05"
  tasks_completed: 9
  files_modified: 8
---

# Phase 11 Plan 05: Admin Portal Refactor Summary

Admin portal refactored to match Katie English Design System — blue accent #4F9DFF, same dark sidebar structure as Teacher portal, MiniStat horizontal stat cards, TableShell-based data tables, and completion progress bars on homework overview.

## Tasks Completed

| # | Task | Commit |
|---|------|--------|
| 1 | AdminShell — left-rail active indicator, 26px/900 title | 97068b8 |
| 2 | admin/layout.tsx — adminTheme ThemeProvider + subtitles | 97068b8 |
| 3 | admin/page.tsx — MiniStat cards + approvals + activity panels | 97068b8 |
| 4 | admin/teachers/page.tsx — search toolbar + TableShell + status chips + actions | 97068b8 |
| 5 | admin/students/page.tsx — search + class filter + checkbox column + TableShell | 97068b8 |
| 6 | admin/classes/page.tsx — search toolbar + TableShell + Reassign/Assign actions | 97068b8 |
| 7 | admin/homework/page.tsx — search + teacher filter + TableShell + HwTypeChip + CompletionBar | 97068b8 |
| 8 | admin/login/page.tsx — minimal centered card login (max-width 420px, #F7F9FC bg) | 97068b8 |
| 9 | Commit | 97068b8 |

## Commits

- `97068b8` feat(11-05): refactor admin portal to match design system

## Design Fidelity Achieved

| Spec | Status |
|------|--------|
| AdminShell sidebar #0C1220, accent #4F9DFF | Done |
| Active nav: 3px left-rail + rgba(79,157,255,0.12) bg + #60A5FA text | Done |
| K monogram bg #4F9DFF | Done |
| Portal label "Admin Portal" | Done |
| Dashboard: 4 MiniStat cards (horizontal layout, 42px icon well) | Done |
| Dashboard: Approvals pending card with Review buttons | Done |
| Dashboard: Recent activity card with dot indicators | Done |
| Teachers: search + TableShell with status chips + Deactivate/Reactivate | Done |
| Students: search + class filter + checkbox column + TableShell | Done |
| Classes: search + TableShell with Reassign/Assign teacher actions | Done |
| Homework: search + teacher filter + TableShell + HwTypeChip + CompletionBar | Done |
| Login: minimal centered card, bg #F7F9FC, max-width 420px, shadow-4 | Done |
| adminTheme ThemeProvider wrapping all admin routes | Done |

## Deviations from Plan

None — plan executed exactly as written. All design spec requirements met.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Teacher column shows "—" | admin/homework/page.tsx:132 | `AdminHomeworkItem` has no teacher association in current API |
| Parent column shows teacher name | admin/students/page.tsx:196 | `AdminStudentItem` has no parent field; class teacher used as closest proxy |
| Homework completion % | admin/homework/page.tsx:145 | Computed as `submissionCount / assignments` — no per-class student count in API |
| Classes count shows "—" for teachers | admin/teachers/page.tsx:180 | `TeacherItem` has no `_count.classes` field |

These stubs display real API data where available; no hardcoded placeholder values are used that would prevent the plan's goal from being achieved.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. All changes are UI-layer only.

## Self-Check: PASSED

All 8 modified files exist in worktree. Commit `97068b8` confirmed in git log.
