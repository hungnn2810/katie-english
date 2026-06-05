---
phase: 11-frontend-react-mui-refactor
plan: "01"
subsystem: frontend/theme
tags: [mui, theme, design-system, tokens]
dependency_graph:
  requires: []
  provides: [baseTheme, teacherTheme, adminTheme, studentTheme]
  affects: [frontend/lib/theme.ts, frontend/lib/student-theme.ts]
tech_stack:
  added: []
  patterns: [MUI createTheme composition, portal-specific theme variants]
key_files:
  created: []
  modified:
    - frontend/lib/theme.ts
decisions:
  - textTransform uses `as const` cast on the 'uppercase' literal to satisfy TypeScript's CSSProperties type
metrics:
  duration: "3 minutes"
  completed: "2026-06-05"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 1
---

# Phase 11 Plan 01: MUI Theme Tokens Summary

MUI theme tokens tightened to match design system — MuiCard/MuiChip/MuiTableCell overrides added; teacherTheme (#F0623A) and adminTheme (#4F9DFF) exported from theme.ts.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Update frontend/lib/theme.ts with MuiCard, MuiChip, MuiTableCell overrides + teacherTheme/adminTheme exports | 6c70acc |
| 2 | Verify frontend/lib/student-theme.ts (already correct — no changes needed) | — |
| 3 | Commit | 6c70acc |

## What Was Built

### frontend/lib/theme.ts
- Added `MuiCard` component override: `borderRadius: 16`, `border: '1px solid #E2E8F0'`, `boxShadow: shadow-1` (0 1px 3px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.06))
- Added `MuiChip` component override: `borderRadius: 999` (pill shape), `fontWeight: 700`, `fontSize: 12`
- Added `MuiTableCell` head override: `fontSize: 11`, `fontWeight: 700`, `textTransform: uppercase`, `letterSpacing: 0.06em`, `color: #94A3B8`
- Exported `teacherTheme` extending baseTheme with `primary.main: #F0623A`
- Exported `adminTheme` extending baseTheme with `primary.main: #4F9DFF`

### frontend/lib/student-theme.ts
Verified correct — already exports `studentTheme` with `palette.primary.main: #A78BFA` and `shape.borderRadius: 6`. No changes made.

## Must-Have Truths Verified

| Truth | Status |
|-------|--------|
| baseTheme shape.borderRadius = 4 | PASS (line 36) |
| baseTheme palette.primary #4F9DFF | PASS (line 25) |
| baseTheme palette.secondary #6ED6C1 | PASS (line 26) |
| baseTheme palette.error #FF7B7B | PASS (line 27) |
| baseTheme palette.warning #FFD166 | PASS (line 28) |
| baseTheme palette.background.default #F7F9FC | PASS (line 29) |
| baseTheme typography fontFamily Inter | PASS (line 34) |
| baseTheme MuiButton textTransform none, fontWeight 600 | PASS (lines 52-54) |
| baseTheme MuiCard borderRadius 16, border, shadow-1 | PASS (lines 56-64) |
| baseTheme MuiChip borderRadius 999, fontWeight 700, fontSize 12 | PASS (lines 65-73) |
| baseTheme MuiTableCell header 11px/700/uppercase/0.06em/#94A3B8 | PASS (lines 74-84) |
| studentTheme palette.primary.main #A78BFA | PASS (student-theme.ts line 8) |
| studentTheme shape.borderRadius = 6 | PASS (student-theme.ts line 12) |
| teacherTheme primary.main #F0623A | PASS (theme.ts line 89) |
| adminTheme primary.main #4F9DFF | PASS (theme.ts line 95) |

## Deviations from Plan

**1. [Rule 2 - Minor] Added `as const` cast for textTransform**
- **Found during:** Task 1
- **Issue:** TypeScript CSSProperties requires `textTransform` to be typed as a CSS literal union, not `string`. Plain `'uppercase'` in a nested object without explicit typing causes TS type errors.
- **Fix:** Used `textTransform: 'uppercase' as const` to satisfy the type constraint.
- **Files modified:** frontend/lib/theme.ts
- **Commit:** 6c70acc

## Known Stubs

None — no stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- [x] frontend/lib/theme.ts modified and committed (6c70acc)
- [x] frontend/lib/student-theme.ts verified correct (no changes)
- [x] teacherTheme exported with #F0623A (line 88-92)
- [x] adminTheme exported with #4F9DFF (line 94-98)
- [x] Commit 6c70acc exists in git log
