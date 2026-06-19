---
phase: "15"
plan: "02"
subsystem: "backend/tuition"
tags: [nestjs, tuition, zalo-zns, prisma, unit-tests, tdd]
dependency_graph:
  requires:
    - "15-01"  # TuitionConfig/TuitionRecord/TuitionNotificationLog Prisma models
  provides:
    - TuitionModule with all providers registered
    - GET /admin/tuition/config/:classId
    - PUT /admin/tuition/config/:classId
    - POST /admin/tuition/records/generate
    - PATCH /admin/tuition/records/:id
    - POST /admin/tuition/notify
    - GET /admin/tuition/report
    - countSessionsInMonth utility (tested)
    - formatPhoneForZalo utility (tested)
  affects:
    - backend/src/app.module.ts
    - backend/.env.example
tech_stack:
  added: []
  patterns:
    - NestJS service/repository/controller pattern (admin module style)
    - Prisma JSON field cast via unknown intermediate type
    - Zalo ZNS axios HTTP client with Bearer token (never logged)
    - On-the-fly OVERDUE status computation at query time (no cron)
    - TDD RED/GREEN for utility functions + service spec
key_files:
  created:
    - backend/src/tuition/session-counter.util.ts
    - backend/src/tuition/session-counter.util.spec.ts
    - backend/src/tuition/phone-formatter.util.ts
    - backend/src/tuition/phone-formatter.util.spec.ts
    - backend/src/tuition/tuition.dto.ts
    - backend/src/tuition/tuition.repository.ts
    - backend/src/tuition/zalo-zns.service.ts
    - backend/src/tuition/tuition.service.ts
    - backend/src/tuition/tuition.service.spec.ts
    - backend/src/tuition/tuition.controller.ts
    - backend/src/tuition/tuition.module.ts
  modified:
    - backend/src/app.module.ts
    - backend/.env.example
decisions:
  - "countSessionsInMonth uses Set(scheduleSlots.map(s => s.dayOfWeek)) for deduplication — two Monday slots count once per day"
  - "scheduleSlots Json field cast via (rawSlots as unknown as ScheduleSlot[]) — direct cast fails TS strict type check"
  - "ZaloZnsService reads ZALO_OA_ACCESS_TOKEN from process.env per instance — never logged, never returned to client"
  - "sendNotifications uses partial-send pattern — catches per-parent errors and continues, logs all attempts"
  - "OVERDUE status computed at query time in getReport — no DB write, no cron job (simplest approach)"
  - "AdminGuard (ADMIN-only) used per existing auth.guard.ts — TEACHER role support requires AdminGuard update (D-06 deviation documented)"
metrics:
  duration: "~30 minutes"
  completed: "2026-06-19"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 13
---

# Phase 15 Plan 02: TuitionModule Backend Summary

NestJS TuitionModule built with service, repository, controller, DTOs, ZaloZnsService, and two utility functions. All 6 REST endpoints under `/admin/tuition` registered, 30 unit tests green, and Zalo env vars documented.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | session-counter + phone-formatter utilities with TDD | 7f1e3bf | 4 files (2 utils + 2 specs) |
| 2 | TuitionRepository, DTOs, ZaloZnsService, TuitionService, TuitionController, TuitionModule, app.module.ts, .env.example | 725ba8d | 8 source files |
| 3 | TuitionService unit tests (tuition.service.spec.ts) | 87d7ee5 | 1 spec file |

## What Was Built

### Utility Functions

- `session-counter.util.ts` — `countSessionsInMonth(scheduleSlots, month, year): number`
  - Deduplicates dayOfWeek via Set; iterates month days via Date loop
  - Returns 0 for null/empty scheduleSlots
- `phone-formatter.util.ts` — `formatPhoneForZalo(phoneNumber): string`
  - Strips spaces, hyphens, parentheses; 0xxx → 84xxx; idempotent on 84xxx

### TuitionModule (backend/src/tuition/)

- **TuitionRepository** (9 methods): findConfig, upsertConfig, findClassById, findStudentsByClass, countRecords, createRecord, findRecordsByReport, findRecordsByIds, updateRecord, logNotification
- **TuitionService** (6 methods): getConfig, createOrUpdateConfig, generateMonthlyRecords, recordPayment, sendNotifications, getReport
- **TuitionController** (6 endpoints under /admin/tuition): GET config/:classId, PUT config/:classId, POST records/generate, PATCH records/:id, POST notify, GET report
- **ZaloZnsService**: axios POST to `https://business.openapi.zalo.me/message/template`, Bearer token from `ZALO_OA_ACCESS_TOKEN` env, never logged
- **TuitionModule**: imports PrismaModule + AuthModule, registers all providers

### Tests

- `session-counter.util.spec.ts` — 7 tests (deduplication, empty, null, 30/31/28-day months, all 7 days)
- `phone-formatter.util.spec.ts` — 7 tests (0xxx, 84xxx idempotent, spaces, no prefix, hyphens)
- `tuition.service.spec.ts` — 16 tests covering createOrUpdateConfig, generateMonthlyRecords, recordPayment, getReport, sendNotifications

**Total: 30 tests, all passing**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected plan's wrong June 2026 session count**
- **Found during:** Task 1 RED phase
- **Issue:** Plan spec says `countSessionsInMonth([{dayOfWeek:1},{dayOfWeek:3}], 6, 2026) === 8 (4 Mon + 4 Wed)`. June 2026 actually starts on Monday — so there are 5 Mondays (1,8,15,22,29) and 4 Wednesdays (3,10,17,24) = 9 sessions total.
- **Fix:** Updated test expected values to 9 (Mon+Wed) and 5 (Mon dedup). Implementation is correct — the plan spec was arithmetically wrong.
- **Files modified:** `backend/src/tuition/session-counter.util.spec.ts`
- **Commit:** 7f1e3bf

### Known Constraint

**[D-06] TEACHER role access**
- **Issue:** The plan specifies D-06 (LOCKED): both ADMIN and TEACHER should access tuition endpoints. The existing `AdminGuard` in `auth.guard.ts` checks `payload.role !== 'ADMIN'` — it rejects TEACHER role.
- **Decision:** Used `AdminGuard` as-is (changing it would affect all admin endpoints — Rule 4 architectural change). TEACHER access will require either updating AdminGuard or adding a separate guard. Documented as a known constraint for the next plan or a follow-up task.
- **Impact:** Currently only ADMIN users can access `/admin/tuition/*`. TEACHER users will get 403.

### Pre-existing Issue (Out of Scope)

- `backend/src/main.ts` has a pre-existing `TS2307: Cannot find module 'dotenv'` error — confirmed present before this plan's changes. Logged to deferred-items.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth | tuition.controller.ts | AdminGuard applied at controller class level — all 6 endpoints protected. T-15-03 mitigated. |
| threat_flag: info-disclosure | zalo-zns.service.ts | ZALO_OA_ACCESS_TOKEN read from env, never logged or returned. T-15-05 mitigated. |
| threat_flag: input-validation | tuition.service.ts | ParseIntPipe on classId/month/year in controller. month 1-12 and pricePerSession > 0 validated in service. T-15-07 mitigated. |

## Self-Check

- [x] `backend/src/tuition/tuition.module.ts` — exists, contains TuitionModule
- [x] `backend/src/tuition/tuition.controller.ts` — exists, contains 6 endpoints + @UseGuards(AdminGuard)
- [x] `backend/src/tuition/tuition.service.ts` — exists, contains all 6 service methods
- [x] `backend/src/tuition/tuition.repository.ts` — exists, contains 9 Prisma query methods
- [x] `backend/src/tuition/zalo-zns.service.ts` — exists, axios POST to Zalo ZNS API
- [x] `backend/src/tuition/session-counter.util.ts` — exists, countSessionsInMonth exported
- [x] `backend/src/tuition/phone-formatter.util.ts` — exists, formatPhoneForZalo exported
- [x] `backend/src/tuition/tuition.service.spec.ts` — exists, 16 tests all green
- [x] `backend/src/app.module.ts` — TuitionModule in imports array
- [x] `backend/.env.example` — ZALO_OA_ACCESS_TOKEN and ZALO_ZNS_TEMPLATE_ID present
- [x] Commit 7f1e3bf — utility functions + specs
- [x] Commit 725ba8d — TuitionModule and all source files
- [x] Commit 87d7ee5 — TuitionService unit tests
- [x] All 30 unit tests pass

## Self-Check: PASSED
