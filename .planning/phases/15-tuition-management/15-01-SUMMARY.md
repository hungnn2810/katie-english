---
phase: "15"
plan: "01"
subsystem: "backend/database"
tags: [prisma, schema, tuition, database, documentation]
dependency_graph:
  requires: []
  provides:
    - TuitionStatus enum in schema.prisma
    - TuitionConfig model (tuition_configs table)
    - TuitionRecord model (tuition_records table)
    - TuitionNotificationLog model (tuition_notification_logs table)
    - docs/db/tuition.md
  affects:
    - backend/prisma/schema.prisma
    - docs/db/README.md
tech_stack:
  added: []
  patterns:
    - Prisma additive schema extension (new enum + 3 models, no existing model modification)
    - Back-reference relation fields on existing Class and Student models
key_files:
  created:
    - docs/db/tuition.md
  modified:
    - backend/prisma/schema.prisma
    - docs/db/README.md
decisions:
  - "Int type for all VNĐ amounts (no decimals needed for Vietnamese dong)"
  - "@@unique([studentId, classId, month, year]) prevents duplicate tuition records at DB level"
  - "OVERDUE status computed at query time — status column stores PENDING/PAID only"
  - "TuitionNotificationLog.tuitionRecord uses onDelete: Cascade — logs are deleted with record"
  - "TuitionConfig.class uses onDelete: Cascade — config deleted when class is deleted"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-19"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
---

# Phase 15 Plan 01: Tuition Schema Foundation Summary

Prisma schema extended with TuitionStatus enum + three tuition models (TuitionConfig, TuitionRecord, TuitionNotificationLog), pushed to PostgreSQL, and fully documented in docs/db/tuition.md per CLAUDE.md rules.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend schema.prisma with TuitionStatus enum and three tuition models | b724d26 | backend/prisma/schema.prisma |
| 2 | Push schema to database | (no files changed — DB operation) | — |
| 3 | Create docs/db/tuition.md and update docs/db/README.md | 2a3160e | docs/db/tuition.md (new), docs/db/README.md |

## What Was Built

### New Schema Additions

- `enum TuitionStatus` — PENDING | PAID | OVERDUE
- `model TuitionConfig` — maps to `tuition_configs` (classId UNIQUE, pricePerSession Int, bookFee Int?, dueDayOfMonth Int)
- `model TuitionRecord` — maps to `tuition_records` (studentId/classId/month/year @@unique, status TuitionStatus, paidAt/paidBy nullable)
- `model TuitionNotificationLog` — maps to `tuition_notification_logs` (zaloResponse String JSON, success Boolean)

### Schema Relation Extensions

- `Class.tuitionConfig` — back-reference (1:1) to TuitionConfig
- `Class.tuitionRecords` — back-reference (1:N) to TuitionRecord[]
- `Student.tuitionRecords` — back-reference (1:N) to TuitionRecord[]

### Database

- `npx prisma db push` completed successfully (exit 0)
- Tables created: `tuition_configs`, `tuition_records`, `tuition_notification_logs`
- Prisma Client regenerated (v5.22.0)

### Documentation

- `docs/db/tuition.md` — full documentation for all 3 models + TuitionStatus enum + computation rules + relationships diagram
- `docs/db/README.md` — TuitionStatus added to Enums table; 3 table rows added; tuition.md added to Domain Files; tuition relationships added to Key Relationships diagram

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints or auth paths introduced. Schema-only plan — all changes are additive to the database layer. T-15-01 (schema tampering) and T-15-02 (duplicate record prevention via @@unique) mitigated as planned.

## Self-Check

- [x] `backend/prisma/schema.prisma` — contains `enum TuitionStatus`, `model TuitionConfig`, `model TuitionRecord`, `model TuitionNotificationLog`
- [x] `npx prisma validate` — exits 0
- [x] `npx prisma db push` — exits 0, "Your database is now in sync with your Prisma schema"
- [x] `docs/db/tuition.md` — exists, 14 references to TuitionConfig/TuitionRecord/TuitionNotificationLog
- [x] `docs/db/README.md` — TuitionStatus in Enums, 3 tuition table rows, tuition.md in Domain Files, tuition lines in Key Relationships
- [x] Commit b724d26 — schema changes
- [x] Commit 2a3160e — documentation changes

## Self-Check: PASSED
