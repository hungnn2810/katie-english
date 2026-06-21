---
phase: "16-teacher-admin-ui-redesign"
plan: 1
subsystem: "frontend/ui"
tags: ["ui", "redesign", "colors", "sidebar", "teacher", "admin"]
dependency_graph:
  requires: []
  provides:
    - "color-system-foundation (teacherAccent=#3B82F6, adminAccent=#6366F1)"
    - "TeacherShell light sidebar"
    - "AdminShell light sidebar"
  affects:
    - "frontend/lib/colors.ts"
    - "frontend/lib/theme.ts"
    - "frontend/components/TeacherShell.tsx"
    - "frontend/components/AdminShell.tsx"
    - "frontend/app/teacher/homework/_components/ListenCreationPage.tsx"
    - "frontend/app/teacher/homework/_components/ReadingCreationPage.tsx"
    - "frontend/app/teacher/homework/create/page.tsx"
    - "frontend/app/teacher/homework/page.tsx"
tech_stack:
  added: []
  patterns:
    - "Centralized color constants (colors.ts) drive shell ACCENT variables"
    - "ThemeProvider cascade: teacherTheme/adminTheme primary.main auto-applies to all MUI contained buttons"
key_files:
  created: []
  modified:
    - "frontend/lib/colors.ts"
    - "frontend/lib/theme.ts"
    - "frontend/components/TeacherShell.tsx"
    - "frontend/components/AdminShell.tsx"
    - "frontend/app/teacher/homework/_components/ListenCreationPage.tsx"
    - "frontend/app/teacher/homework/_components/ReadingCreationPage.tsx"
    - "frontend/app/teacher/homework/create/page.tsx"
    - "frontend/app/teacher/homework/page.tsx"
decisions:
  - "Used hex literals (#EFF6FF, #EEF2FF) for ACCENT_BG rather than rgba() for consistency with light-mode design"
  - "adminAccent = indigo #6366F1 (not blue) to visually distinguish admin vs teacher portals"
  - "gradients.sidebar left unchanged — unused by TeacherShell per research Pitfall 6"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-21T09:11:07Z"
  tasks_completed: 3
  files_modified: 8
---

# Phase 16 Plan 1: Color System Foundation + Shell Sidebar Redesign Summary

**One-liner:** Replaced dark (#0C1220) sidebars and orange (#F0623A) accent with white sidebars + blue (#3B82F6 teacher) / indigo (#6366F1 admin) accent across colors.ts, theme.ts, TeacherShell, AdminShell, and teacher homework sub-files.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update colors.ts and theme.ts — color system foundation | a0b8318 | frontend/lib/colors.ts, frontend/lib/theme.ts |
| 2 | Redesign TeacherShell sidebar dark to light + blue accent | 3165b8b | frontend/components/TeacherShell.tsx |
| 3 | Redesign AdminShell sidebar + fix raw #F0623A in teacher homework sub-files | d41fc91 | frontend/components/AdminShell.tsx, ListenCreationPage.tsx, ReadingCreationPage.tsx, create/page.tsx, homework/page.tsx |

## Verification Results

- Build gate: `npm run build` exits 0 — PASS
- Orange-free gate: `grep -r "F0623A" frontend/app/teacher frontend/components/TeacherShell.tsx frontend/components/AdminShell.tsx` — 0 matches — PASS
- colors.ts: teacherAccent=#3B82F6, adminAccent=#6366F1, teacherAccentBg=#EFF6FF, adminAccentBg=#EEF2FF — PASS
- theme.ts: teacherTheme primary.main=#3B82F6, adminTheme primary.main=#6366F1 — PASS
- TeacherShell sidebar bgcolor=#FFFFFF — PASS
- AdminShell sidebar bgcolor=#FFFFFF — PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing accent sync] Fixed orange literal in frontend/app/teacher/homework/page.tsx**
- **Found during:** Task 3 verification — orange grep check
- **Issue:** `frontend/app/teacher/homework/page.tsx` contained `const ACCENT = '#F0623A'` which was not in the plan's explicit file list but falls within the plan's acceptance criteria (zero `#F0623A` in `frontend/app/teacher/**`)
- **Fix:** Changed `const ACCENT = '#F0623A'` to `const ACCENT = '#3B82F6'`
- **Files modified:** `frontend/app/teacher/homework/page.tsx`
- **Commit:** d41fc91

## Known Stubs

None — all color constants are live values, no placeholders.

## Threat Flags

None — this plan modifies only CSS constants and inline sx style values. No auth, data, or API surface introduced.

## Self-Check: PASSED

- frontend/lib/colors.ts — contains teacherAccent: '#3B82F6', adminAccent, teacherAccentBg, adminAccentBg: FOUND
- frontend/lib/theme.ts — contains '#3B82F6' and '#6366F1': FOUND
- frontend/components/TeacherShell.tsx — contains bgcolor: '#FFFFFF': FOUND
- frontend/components/AdminShell.tsx — contains bgcolor: '#FFFFFF': FOUND
- Commit a0b8318: FOUND
- Commit 3165b8b: FOUND
- Commit d41fc91: FOUND
