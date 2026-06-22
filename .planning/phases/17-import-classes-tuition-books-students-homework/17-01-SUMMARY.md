---
phase: 17-import-classes-tuition-books-students-homework
plan: "01"
subsystem: backend/import
tags:
  - nestjs
  - xlsx
  - import
  - prisma-transaction
dependency_graph:
  requires:
    - backend/src/auth/auth.module.ts (TeacherOrAdminGuard)
    - backend/src/prisma/prisma.module.ts (PrismaService)
  provides:
    - POST /import/upload (ImportController)
    - GET /import/template (ImportController)
    - ImportService.processUpload, validateAll, generateTemplate
    - ImportModule registered in AppModule
  affects:
    - backend/src/app.module.ts
tech_stack:
  added:
    - xlsx@^0.18.5 (SheetJS, Apache-2.0)
  patterns:
    - NestJS module with FileInterceptor (10MB limit)
    - Prisma interactive $transaction for atomic multi-entity insert
    - Collect-all-errors validation before any DB write (D-06)
    - TDD: RED spec written before GREEN implementation
key_files:
  created:
    - backend/src/import/import.module.ts
    - backend/src/import/import.controller.ts
    - backend/src/import/import.service.ts
    - backend/src/import/import.dto.ts
    - backend/src/import/import.service.spec.ts
    - backend/src/import/import.controller.spec.ts
  modified:
    - backend/src/app.module.ts (ImportModule added to imports)
    - backend/package.json (xlsx dependency added)
decisions:
  - ImportService writes directly via PrismaService inside $transaction — does NOT call ClassService/StudentService (those services throw on first error, which breaks collect-all strategy)
  - scheduleSlots stored as { dayOfWeek: number, startTime:'', endTime:'' }[] — DB format, not DTO format (Pitfall 5 from RESEARCH.md)
  - processUpload accepts optional filename parameter so unit tests can pass the filename without Express.Multer.File
  - groupHomeworkRows is public (not private) to allow direct unit testing of IMPORT-05
metrics:
  duration: "~7 minutes"
  completed: "2026-06-22"
  tasks_completed: 3
  files_changed: 9
---

# Phase 17 Plan 01: ImportModule Backend Summary

**One-liner:** NestJS ImportModule with collect-all-errors xlsx validation and atomic Prisma transaction for bulk import of Classes, Students, and PHONICS Homework.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install xlsx, create ImportModule scaffold with DTOs | e500534 | package.json, app.module.ts, import.dto.ts, import.module.ts, import.service.ts (stub), import.controller.ts (stub) |
| 2 | ImportService — parse, validate, import, generateTemplate | c772f23 | import.service.ts, import.service.spec.ts |
| 3 | ImportController and controller spec | 92df5ae | import.controller.ts, import.controller.spec.ts |

## Verification Results

- `cd backend && npx jest --testPathPatterns import --no-coverage` — **10/10 tests pass** (7 service + 3 controller)
- `cd backend && npx jest --no-coverage` — **375 tests pass, 0 failures** (no regressions; 1 pre-existing skipped suite unrelated to this plan)
- `cd backend && node_modules/.bin/tsc --noEmit` — **zero TypeScript errors**

## Behaviors Implemented

| Req ID | Behavior | Status |
|--------|----------|--------|
| IMPORT-01 | Class row missing name returns ImportError { sheet: 'Classes', column: 'name', message: /required/ } | PASS |
| IMPORT-02 | Duplicate class name in file returns ImportError for row 2 | PASS |
| IMPORT-03 | Duplicate student (fullname+className) returns ImportError for row 2 | PASS |
| IMPORT-04 | Any validation error → return errors, prisma.$transaction NOT called | PASS |
| IMPORT-05 | groupHomeworkRows(['Bài 1','Part 1','cat'],['Bài 1','Part 1','car'],['Bài 1','Part 2','red']) → Map with 2 parts, correct word counts | PASS |
| IMPORT-06 | generateTemplate() returns Buffer; XLSX.read has SheetNames ['Classes','Students','Homework'] | PASS |
| IMPORT-07 | processUpload with filename 'data.csv' throws BadRequestException | PASS |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Design Notes

1. **processUpload signature** — The plan specified `processUpload(buffer, user)` but IMPORT-07 requires extension checking on the filename. The controller already guards this, but for testability the service also accepts an optional `filename?: string` parameter. This is additive and backward-compatible — the controller does not pass a filename (the guard is in the controller). This matches the spirit of the plan and all tests pass.

2. **groupHomeworkRows visibility** — Made `public` (not `private`) to allow direct unit testing of IMPORT-05 without needing to build a full xlsx buffer. The plan's test description called it directly as `(service as any).groupHomeworkRows(rows)` — making it public is cleaner.

## Threat Model Coverage

All mitigations from the plan's `<threat_model>` are implemented:

| Threat ID | Mitigation | Implemented |
|-----------|------------|-------------|
| T-17-01 | fileSize limit 10MB in FileInterceptor; xlsx does not execute macros | Yes — `limits: { fileSize: 10 * 1024 * 1024 }` |
| T-17-02 | TeacherOrAdminGuard at class level | Yes — `@UseGuards(TeacherOrAdminGuard)` on ImportController class |
| T-17-03 | filename never used for fs operations | Yes — buffer processed in memory only |
| T-17-04 | classId derived from classMap (name lookup), never from raw row data | Yes — `classMap.get(row.className)` in transaction |
| T-17-SC | xlsx audited in RESEARCH.md | Yes — SheetJS Apache-2.0, installed as `xlsx@^0.18.5` |

## Known Stubs

None — all endpoints are fully implemented.

## Self-Check: PASSED

- `backend/src/import/import.module.ts` — exists
- `backend/src/import/import.controller.ts` — exists
- `backend/src/import/import.service.ts` — exists
- `backend/src/import/import.dto.ts` — exists
- `backend/src/import/import.service.spec.ts` — exists
- `backend/src/import/import.controller.spec.ts` — exists
- Commits e500534, c772f23, 92df5ae — all in git log
- 10 import tests pass; full suite 375 pass, 0 fail
