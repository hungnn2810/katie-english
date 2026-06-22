---
phase: 17-import-classes-tuition-books-students-homework
plan: "02"
subsystem: frontend/import
tags:
  - nextjs
  - mui
  - import
  - jest
  - tdd
dependency_graph:
  requires:
    - backend POST /import/upload (ImportController — built in 17-01)
    - backend GET /import/template (ImportController — built in 17-01)
    - frontend/lib/admin-auth.ts (getAdminToken — synchronous)
    - frontend/lib/auth.ts (getToken — synchronous)
    - frontend/components/AdminShell.tsx (NAV_GROUPS)
    - frontend/components/TeacherShell.tsx (NAV_GROUPS)
  provides:
    - uploadImportFile(file, role): POST /import/upload with FormData
    - downloadTemplate(role): GET /import/template blob download
    - isImportError(response): type guard for ImportErrorResult vs ImportResult
    - GET /admin/import — AdminImportPage
    - GET /teacher/import — TeacherImportPage
    - Import nav item in AdminShell sidebar
    - Import nav item in TeacherShell sidebar
  affects:
    - frontend/components/AdminShell.tsx
    - frontend/components/TeacherShell.tsx
    - frontend/app/admin/layout.tsx
    - frontend/app/teacher/layout.tsx
tech_stack:
  added:
    - jest@^30.4.1 (devDependency — frontend unit tests)
    - ts-jest (devDependency — TypeScript Jest transform)
    - "@types/jest" (devDependency — Jest type declarations)
    - jest-environment-jsdom (devDependency — browser-like test environment)
    - frontend/jest.config.ts (new — configures ts-jest + jsdom + @/* path alias)
  patterns:
    - TDD RED/GREEN cycle for import-api helpers
    - FormData upload without Content-Type (browser sets multipart boundary)
    - Synchronous localStorage token reads (getAdminToken, getToken — no await)
    - Programmatic anchor click for blob download
    - MUI Box/Paper/Table/Alert for import UI
key_files:
  created:
    - frontend/lib/import-api.ts
    - frontend/lib/import-api.test.ts
    - frontend/jest.config.ts
    - frontend/app/admin/import/page.tsx
    - frontend/app/teacher/import/page.tsx
  modified:
    - frontend/components/AdminShell.tsx (Upload icon + Import nav item)
    - frontend/components/TeacherShell.tsx (Upload icon + Import nav item)
    - frontend/app/admin/layout.tsx (Import TITLES entry)
    - frontend/app/teacher/layout.tsx (Import TITLES entry)
    - frontend/package.json (jest devDependencies added)
decisions:
  - Jest + ts-jest + jest-environment-jsdom installed as devDependencies — frontend had no test infrastructure before this plan; the plan explicitly requires npx jest tests
  - jest.config.ts uses moduleResolution:node (not bundler) so ts-jest can resolve imports; @/* path alias mapped via moduleNameMapper
  - Both import pages are self-contained 'use client' components with no server actions
  - Upload button color: adminAccent #6366F1 for admin page, teacherAccent #3B82F6 for teacher page (matches colors.ts)
metrics:
  duration: "~12 minutes"
  completed: "2026-06-22"
  tasks_completed: 2
  files_changed: 10
---

# Phase 17 Plan 02: Frontend Import Pages Summary

**One-liner:** React import pages for admin and teacher portals with MUI UI, shared import-api.ts helpers (uploadImportFile/downloadTemplate), Jest TDD tests, and Import nav items wired into both shell sidebars.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | import-api.ts helpers + Jest test suite | e191f95 | frontend/lib/import-api.ts, frontend/lib/import-api.test.ts, frontend/jest.config.ts, frontend/package.json |
| 2 | Import pages + nav/layout wiring | e256ed7 | frontend/app/admin/import/page.tsx, frontend/app/teacher/import/page.tsx, frontend/components/AdminShell.tsx, frontend/components/TeacherShell.tsx, frontend/app/admin/layout.tsx, frontend/app/teacher/layout.tsx |

## Checkpoint

Task 3 is a `checkpoint:human-verify` — manual verification required. See checkpoint section below.

## Verification Results

- `cd frontend && npx jest --testPathPatterns import-api --no-coverage` — **6/6 tests pass** (upload happy, upload error, download happy, download error, isImportError true, isImportError false)
- `cd frontend && npx tsc --noEmit` — **zero TypeScript errors**
- `cd backend && npx jest --no-coverage` — **397 tests pass, 0 failures** (no regressions; run from main repo where node_modules exist)
- TDD gate: RED phase confirmed (test suite failed before implementation existed); GREEN phase confirmed (all tests pass after implementation)

## Behaviors Implemented

| Req ID | Behavior | Status |
|--------|----------|--------|
| IMPORT-08 | Admin navigates to /admin/import via sidebar Import item | DONE |
| IMPORT-08 | Admin import page shows title 'Import' with subtitle in AdminShell header | DONE |
| IMPORT-08 | Admin clicks 'Download Template' — browser downloads import-template.xlsx using admin JWT | DONE |
| IMPORT-08 | Admin uploads .xlsx file — POST to /import/upload with admin JWT; success shows counts, errors show table | DONE |
| IMPORT-09 | Teacher navigates to /teacher/import via sidebar Import item | DONE |
| IMPORT-09 | Teacher import page shows title 'Import' in TeacherShell header | DONE |
| IMPORT-09 | Teacher upload button uses #3B82F6 (teacher accent) | DONE |
| IMPORT-09 | Teacher uploadImportFile calls getToken() (teacher JWT) | DONE |

## TDD Gate Compliance

- RED phase: test suite written before import-api.ts existed; suite failed with "Cannot find module './import-api'"
- GREEN phase: implementation written; all 6 tests pass
- Commits: e191f95 contains both test + impl (single task commit per plan spec)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Frontend had no Jest test infrastructure**

- **Found during:** Task 1 (TDD RED phase)
- **Issue:** frontend/package.json had no jest, ts-jest, @types/jest, or jest-environment-jsdom. The plan requires `npx jest --testPathPattern import-api --no-coverage` to run tests. Without Jest installed, this command cannot execute.
- **Fix:** Installed jest, ts-jest, @types/jest, jest-environment-jsdom as devDependencies; created frontend/jest.config.ts with ts-jest transform, jsdom environment, and `@/*` moduleNameMapper.
- **Files modified:** frontend/package.json, frontend/package-lock.json, frontend/jest.config.ts
- **Commit:** e191f95

**2. [Rule 3 - Blocking] Backend node_modules absent in worktree**

- **Found during:** Task 2 verification (backend regression check)
- **Issue:** The worktree does not have backend/node_modules. `cd backend && npx jest` failed inside the worktree.
- **Fix:** Ran backend tests from the main repo at J:/sources/katie-english/backend — 397 tests pass, no regressions.
- **Impact:** None on code; backend tests verified from correct location.

## Threat Model Coverage

| Threat ID | Mitigation | Implemented |
|-----------|------------|-------------|
| T-17-06 | JWT in Authorization header from synchronous getAdminToken()/getToken() | Yes — no await, direct call |
| T-17-07 | Error data rendered into MUI TableCell, no dangerouslySetInnerHTML | Yes — standard TableCell text |
| T-17-05 | Template is public-schema data only | Accepted — no sensitive data in template |

## Known Stubs

None — all functionality is wired. Pages call real import-api.ts functions which hit real backend endpoints. No mock data flows to UI.

## Self-Check: PASSED

- `frontend/lib/import-api.ts` — exists
- `frontend/lib/import-api.test.ts` — exists
- `frontend/jest.config.ts` — exists
- `frontend/app/admin/import/page.tsx` — exists
- `frontend/app/teacher/import/page.tsx` — exists
- Commits e191f95, e256ed7 — both in git log
- 6 import-api tests pass; tsc --noEmit exits 0; backend 397 tests pass
