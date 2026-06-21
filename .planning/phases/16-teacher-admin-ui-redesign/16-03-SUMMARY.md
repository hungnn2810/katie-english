---
phase: "16-teacher-admin-ui-redesign"
plan: 3
subsystem: "frontend/ui"
tags: ["ui", "redesign", "homework", "card-grid", "teacher"]
dependency_graph:
  requires:
    - "16-01 (color-system-foundation, teacherAccent=#3B82F6)"
  provides:
    - "homework-card-grid (HwCard component, 3-col desktop grid)"
    - "pill-filter-tabs (borderRadius 999px, blue-50 active)"
    - "view-toggle (grid/table switch)"
  affects:
    - "frontend/app/teacher/homework/page.tsx"
    - "frontend/app/teacher/classes/page.tsx"
tech_stack:
  added: []
  patterns:
    - "Inline HwCard sub-component for grid view (co-located with page)"
    - "CSS grid with responsive gridTemplateColumns breakpoints (xs/sm/lg)"
    - "Conditional view render: viewMode state drives grid vs TableShell"
key_files:
  created: []
  modified:
    - "frontend/app/teacher/homework/page.tsx"
    - "frontend/app/teacher/classes/page.tsx"
decisions:
  - "HwCard is inline in page.tsx (not extracted to separate file) — consistent with HomeworkModal/AssignModal pattern in same file"
  - "Table view preserved unchanged as fallback under viewMode='table' branch"
  - "students/page.tsx and sessions/page.tsx had no #FFF2EF — only classes/page.tsx needed replacement"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-21T10:26:00Z"
  tasks_completed: 3
  files_modified: 2
---

# Phase 16 Plan 3: Homework Card Grid + Pill Tabs + Orange Tint Removal Summary

**One-liner:** Replaced homework TableShell render with HwCard CSS grid (3-col desktop) behind a grid/table toggle, updated filter tabs to pill style with count badges, and replaced #FFF2EF orange-50 tints with #EFF6FF blue-50 in teacher/classes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix ACCENT constant, add imports, pill filter tabs, view toggle | a926d67 | frontend/app/teacher/homework/page.tsx |
| 2 | Implement HwCard grid component + conditional grid/table render | b67501a | frontend/app/teacher/homework/page.tsx |
| 3 | Replace #FFF2EF orange-50 tint with #EFF6FF blue-50 in teacher pages | 503cba1 | frontend/app/teacher/classes/page.tsx |

## Verification Results

- Build gate: `npm run build` exits 0 (compiled successfully, 33/33 static pages) — PASS
- Orange-free: `grep -n "F0623A" frontend/app/teacher/homework/page.tsx` — 0 matches — PASS
- Grid structure: `grep -n "display: 'grid'" homework/page.tsx` — match at line 889 — PASS
- LinearProgress: import at line 28, usage at line 702 with `'& .MuiLinearProgress-bar': { bgcolor: '#3B82F6' }` — PASS
- viewMode state: declared at line 757 with default 'grid', used in toggle buttons and conditional render — PASS
- HwCard: function component at line 647 — PASS
- FFF2EF in classes/page.tsx: 0 matches (3 replaced with #EFF6FF) — PASS
- FFF2EF in students/page.tsx: 0 matches (none existed) — PASS
- FFF2EF in sessions/page.tsx: 0 matches (none existed) — PASS

## Deviations from Plan

### Auto-fixed Issues

None.

### Scope Observations

**Task 3 scope was narrower than plan implied:** The plan mentioned replacing `#FFF2EF` in all three pages (classes, students, sessions). Static analysis confirmed only `classes/page.tsx` had `#FFF2EF` occurrences (3 lines). The `students/page.tsx` and `sessions/page.tsx` files had no such occurrences — they had already been updated or never contained the orange-50 tint. Only `classes/page.tsx` was modified.

## Known Stubs

None — all data is sourced from the existing homework list API; the HwCard derives its values from live `HomeworkItem` data.

## Threat Flags

None — this plan modifies only client-side layout and CSS constants. No auth, data mutation, or API surface changed.

## Self-Check: PASSED

- frontend/app/teacher/homework/page.tsx — contains `function HwCard`, `display: 'grid'`, `LinearProgress`, `viewMode`, no `#F0623A`: CONFIRMED
- frontend/app/teacher/classes/page.tsx — contains `#EFF6FF`, no `#FFF2EF`: CONFIRMED
- Commit a926d67: FOUND (feat(16-03): fix ACCENT, add imports, pill filter tabs, view toggle)
- Commit b67501a: FOUND (feat(16-03): add HwCard grid component + conditional grid/table render)
- Commit 503cba1: FOUND (feat(16-03): replace #FFF2EF orange-50 tint with #EFF6FF blue-50 in teacher/classes)
