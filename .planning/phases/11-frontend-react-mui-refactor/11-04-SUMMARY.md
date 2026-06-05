---
phase: 11-frontend-react-mui-refactor
plan: "04"
subsystem: frontend/teacher
tags: [mui, design-system, teacher-portal, refactor]
dependency_graph:
  requires: [11-01, 11-02]
  provides: [teacher-portal-design-kit]
  affects: [frontend/app/teacher, frontend/components/TeacherShell.tsx]
tech_stack:
  added: []
  patterns: [TableShell, HwTypeChip, StatCard, teacherTheme, ThemeProvider]
key_files:
  created:
    - frontend/app/teacher/homework/create/page.tsx
  modified:
    - frontend/components/TeacherShell.tsx
    - frontend/app/teacher/layout.tsx
    - frontend/app/teacher/page.tsx
    - frontend/app/teacher/classes/page.tsx
    - frontend/app/teacher/students/page.tsx
    - frontend/app/teacher/homework/page.tsx
    - frontend/app/teacher/login/page.tsx
decisions:
  - "Kept all existing modal CRUD functionality intact; only replaced display layer with TableShell"
  - "Skipped audio player in session detail (Task 8) — SpeakingResult type has no audioUrl field; adding it requires backend schema change (Rule 4)"
  - "Homework create page routes VOCABULARY/LISTEN types to their existing dedicated sub-pages; PHONICS/SPEAKING fall back to list-page modal flow"
metrics:
  duration: "~90 minutes (active execution across two sessions)"
  completed: "2026-06-05"
  tasks_completed: 9
  tasks_skipped: 1
  files_changed: 8
---

# Phase 11 Plan 04: Teacher Portal Design System Refactor Summary

Refactored the Teacher portal to match the Katie English Design System kit. All screens now use the shared `TableShell`/`TableRow` primitives, `HwTypeChip`, `StatCard`, and `teacherTheme` from the design kit.

## Tasks Completed

| Task | File | Commit | Description |
|------|------|--------|-------------|
| 1 | TeacherShell.tsx | b1d9671 | Tighten sidebar styling: logo block padding, nav item active state with left-rail, footer border |
| 2 | teacher/layout.tsx | 4c14611 | Wrap layout in teacherTheme ThemeProvider + CssBaseline |
| 3 | teacher/page.tsx | 610bdb1 | Dashboard: StatCard components, 3-col grid, upcoming classes + quick links cards |
| 4 | teacher/classes/page.tsx | b0250b2 | Replace card grid with TableShell (Class/Code/Students/Schedule/Status) |
| 5 | teacher/students/page.tsx | afcbb90 | Replace MUI Table with TableShell (Student/Class/Parent/Status) |
| 6 | teacher/homework/page.tsx | d04731e | Replace 3-col card grid with TableShell (Homework/Type/Class/Due/Submitted) + HwTypeChip |
| 7 | homework/create/page.tsx | bfad32d | Create new page: 4-type selector grid + word-list builder + footer actions |
| 8 | (session detail) | — | Skipped — audio player requires backend schema change |
| 9 | teacher/login/page.tsx | 3ae4465 | Wrap login page in teacherTheme ThemeProvider |

## Deviations from Plan

### Skipped Tasks

**Task 8 — Session detail audio player (Rule 4 — Architectural)**
- **Found during:** Task 8 review
- **Issue:** `SpeakingResult` interface has no `audioUrl` field. Adding it requires a backend schema migration and API change.
- **Decision:** Skipped. Session detail page already satisfies the plan's core requirements (student name + timestamp in header, score badge, per-result breakdowns). Audio player blocked on backend.
- **Action required:** Add `audioUrl` to `SpeakingResult` in backend, expose via session API, then add `<audio>` player to session detail page.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused import cleanup in homework/page.tsx**
- **Found during:** Task 6
- **Issue:** After replacing card grid, `cardGradients`, `Card`, `CardActions`, `AlignLeft` became unused. `colors` still needed for modal code.
- **Fix:** Removed `cardGradients`, `Card`, `CardActions` from imports; kept `colors` and `Chip` for HomeworkModal.
- **Files modified:** `frontend/app/teacher/homework/page.tsx`

**2. [Rule 2 - Missing constant] Added ACCENT constant to homework/page.tsx**
- **Found during:** Task 6
- **Issue:** New TableShell action row referenced `ACCENT` constant that was not defined in the file (was previously using `colors.teacherAccent`).
- **Fix:** Added `const ACCENT = '#F0623A'` at module scope.
- **Files modified:** `frontend/app/teacher/homework/page.tsx`

## Design Tokens Applied

| Token | Value | Usage |
|-------|-------|-------|
| ACCENT | `#F0623A` | Buttons, active nav, status colors, overdue dates |
| ACCENT_BG | `rgba(240,98,58,0.12)` | Nav active item background |
| ACCENT_TEXT | `#FDA087` | Nav active item text |
| sidebar | `#0C1220` | TeacherShell sidebar background |
| bg | `#F7F9FC` | Main content area background |

## Known Stubs

- `homework/create/page.tsx`: Title and "Assign to" fields are local state only — not wired to any API call. The "Publish homework" button navigates to sub-pages for VOCABULARY/LISTEN or back to the list for PHONICS/SPEAKING (which use the existing HomeworkModal). A future plan should wire the PHONICS/SPEAKING create flow directly to `createHomework()` from this page.

## Self-Check: PASSED

All 8 implementation files confirmed present on disk. All 8 task commits confirmed in git log.

| Check | Result |
|-------|--------|
| frontend/components/TeacherShell.tsx | FOUND |
| frontend/app/teacher/layout.tsx | FOUND |
| frontend/app/teacher/page.tsx | FOUND |
| frontend/app/teacher/classes/page.tsx | FOUND |
| frontend/app/teacher/students/page.tsx | FOUND |
| frontend/app/teacher/homework/page.tsx | FOUND |
| frontend/app/teacher/homework/create/page.tsx | FOUND |
| frontend/app/teacher/login/page.tsx | FOUND |
| Commit b1d9671 (Task 1) | FOUND |
| Commit 4c14611 (Task 2) | FOUND |
| Commit 610bdb1 (Task 3) | FOUND |
| Commit b0250b2 (Task 4) | FOUND |
| Commit afcbb90 (Task 5) | FOUND |
| Commit d04731e (Task 6) | FOUND |
| Commit bfad32d (Task 7) | FOUND |
| Commit 3ae4465 (Task 9) | FOUND |
