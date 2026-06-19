---
phase: "15"
plan: "04"
subsystem: frontend
tags: [tuition, report-table, admin, teacher]
dependency_graph:
  requires: ["15-02", "15-03"]
  provides: ["TuitionReportTable", "admin-tuition-report-tab", "teacher-tuition-report-tab"]
  affects: ["frontend/app/admin/tuition/page.tsx", "frontend/app/teacher/tuition/page.tsx"]
tech_stack:
  added: []
  patterns: ["TableShell+TableRow cells[] API", "MUI Select filter", "useEffect multi-dep fetch"]
key_files:
  created:
    - frontend/app/admin/tuition/_components/TuitionReportTable.tsx
  modified:
    - frontend/app/admin/tuition/page.tsx
    - frontend/app/teacher/tuition/page.tsx
decisions:
  - "Used project TableShell+TableRow with cells[] prop API (not children pattern from PATTERNS.md)"
  - "Removed inputProps from TextField (deprecated/removed in MUI v6 — causes TS error)"
  - "StatusBadge as inline component with inline styles — no Tailwind per plan requirement"
metrics:
  duration: "2m 14s"
  completed: "2026-06-19"
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 15 Plan 04: TuitionReportTable Summary

**One-liner:** Filterable per-student tuition report table with PAID/PENDING/OVERDUE status badges and VNĐ totals, wired into admin tab 3 and teacher tab 2 with month/year selectors.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build TuitionReportTable component | a0b8f41 | `frontend/app/admin/tuition/_components/TuitionReportTable.tsx` (new) |
| 2 | Wire TuitionReportTable into admin and teacher pages | 79e1f76 | `frontend/app/admin/tuition/page.tsx`, `frontend/app/teacher/tuition/page.tsx` |

## What Was Built

### TuitionReportTable component
- `'use client'` component accepting `classId`, `month`, `year` props
- Internal `statusFilter` state: ALL / PENDING / PAID / OVERDUE (Vietnamese labels: Tất cả / Chưa đóng / Đã đóng / Quá hạn)
- Calls `getTuitionReport({ classId, month, year, statuses })` on mount and whenever any prop or filter changes
- Totals summary row: Đã thu (green chip), Chưa thu (amber chip), Quá hạn (red chip) — VNĐ amounts with `toLocaleString('vi-VN')`
- Status badges with inline styles: PAID=#dcfce7/#15803d, PENDING=#fef3c7/#92400e, OVERDUE=#fee2e2/#b91c1c
- Uses project `TableShell` + `TableRow` (cells[] API) for consistent table styling
- Empty state: 'Không có dữ liệu học phí cho tháng này.'
- Loading state: centered CircularProgress

### Admin page (tab 3 — Báo cáo)
- Replaced placeholder Typography with month/year TextFields + TuitionReportTable
- `reportMonth` defaults to `new Date().getMonth() + 1`, `reportYear` to `new Date().getFullYear()`
- Guard: only renders TuitionReportTable when `classId !== 0`

### Teacher page (tab 2 — Báo cáo)
- Same month/year selector + TuitionReportTable pattern
- Import path: `../../admin/tuition/_components/TuitionReportTable`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TableRow API mismatch**
- **Found during:** Task 1
- **Issue:** PATTERNS.md showed `<TableRow key={row.id}><div>...</div></TableRow>` (children pattern), but actual `TableShell.tsx` `TableRow` component requires `columns` + `cells[]` props
- **Fix:** Used correct API: `<TableRow columns={COLUMNS} cells={[...]} last={idx===rows.length-1} />`
- **Files modified:** `TuitionReportTable.tsx`
- **Commit:** a0b8f41

**2. [Rule 1 - Bug] MUI TextField inputProps deprecated**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `inputProps` prop removed in MUI v6; caused 4 TypeScript errors across admin and teacher pages
- **Fix:** Removed `inputProps={{ min, max }}` — not needed for functionality (just HTML hints)
- **Files modified:** `frontend/app/admin/tuition/page.tsx`, `frontend/app/teacher/tuition/page.tsx`
- **Commit:** 79e1f76

## Checkpoint Pending

Task 3 is a `checkpoint:human-verify` — human verification of the full Phase 15 tuition management system UI is required before marking this plan complete.

## Known Stubs

None — TuitionReportTable is fully wired to `getTuitionReport` API. Data will be empty if no tuition records exist in DB yet.

## Threat Flags

No new threat surface introduced. T-15-12 (parent phone numbers never fetched/displayed) — confirmed: TuitionReportTable only renders studentName, amounts, dates, status from TuitionReportItem interface.

## Self-Check: PASSED

- [x] `frontend/app/admin/tuition/_components/TuitionReportTable.tsx` exists
- [x] Commit a0b8f41 exists (feat(15-04): build TuitionReportTable component)
- [x] Commit 79e1f76 exists (feat(15-04): wire TuitionReportTable into admin and teacher tuition pages)
- [x] TypeScript: `npx tsc --noEmit` — no errors
