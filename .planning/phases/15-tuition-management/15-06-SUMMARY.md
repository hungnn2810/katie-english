---
phase: 15-tuition-management
plan: "06"
subsystem: ui
tags: [react, mui, checkbox, dialog, zns]

requires:
  - phase: 15-tuition-management plan 05
    provides: TuitionGuard + teacher-tuition-api

provides:
  - TuitionReportTable row checkboxes (non-PAID rows) with select-all control
  - TuitionReportTable "Ghi nhận đóng" button per non-PAID row
  - onSelectionChange and onPaymentRecord callbacks on TuitionReportTable
  - PaymentRecordDialog mounted and wired in admin/tuition/page.tsx
  - ZaloSendModal receives real selectedRecordIds (was hardcoded [])

affects: [admin-portal, tuition-management]

tech-stack:
  added: []
  patterns: [callback-prop pattern for child table to surface selection state to parent page]

key-files:
  created: []
  modified:
    - frontend/app/admin/tuition/_components/TuitionReportTable.tsx
    - frontend/app/admin/tuition/page.tsx

key-decisions:
  - "Select-all checkbox placed in filter toolbar (above table) rather than in TableShell header — TableShell renders column labels as plain Typography with no JSX support"

requirements-completed:
  - TUITION-05
  - TUITION-06

duration: 15min
completed: 2026-06-21
---

# Phase 15 Plan 06: PaymentRecordDialog + ZaloSendModal Wiring Summary

**TuitionReportTable gains row checkboxes and Mark Paid buttons; PaymentRecordDialog mounted in admin page; ZaloSendModal receives real record IDs — Gap 2 and Gap 3 closed**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-21T00:15:00Z
- **Completed:** 2026-06-21T00:30:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `TuitionReportTable` extended with `onSelectionChange` and `onPaymentRecord` optional callback props, `selectedIds` state, per-row `Checkbox` (non-PAID) and `Ghi nhận đóng` `Button` (non-PAID), select-all/deselect-all control in filter toolbar
- `admin/tuition/page.tsx` imports and mounts `PaymentRecordDialog` with `selectedRecord` state wired; `ZaloSendModal` now receives `recordIds={selectedRecordIds}` instead of hardcoded `[]`
- Frontend `npm run build` passes clean

## Task Commits

1. **Task 1 + 2: TuitionReportTable + admin page wiring** — `a64cd75` (feat(15-06))

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified
- `frontend/app/admin/tuition/_components/TuitionReportTable.tsx` — 9-column layout with checkbox + action columns; select-all in filter toolbar; callbacks
- `frontend/app/admin/tuition/page.tsx` — PaymentRecordDialog import + mount; selectedRecordIds state; ZaloSendModal wired; TuitionReportTable receives callbacks

## Decisions Made
- Select-all checkbox rendered in filter toolbar area (not TableShell header) because `TableShell` renders column labels as plain `Typography` — no JSX hook for custom header cell content

## Deviations from Plan

None — plan executed exactly as written. Select-all placement is a minor presentation deviation (toolbar vs. header) with identical functionality.

## Issues Encountered
None.

## Next Phase Readiness
- **Human verify checkpoint required** — see plan 15-06 verification steps
- All three gaps from VERIFICATION.md are now code-complete:
  - Gap 1: TuitionGuard accepts TEACHER role (plan 05)
  - Gap 2: ZaloSendModal receives real selectedRecordIds
  - Gap 3: PaymentRecordDialog mounted and reachable via "Ghi nhận đóng" button
- Note: child components (TuitionConfigForm, GenerateRecordsModal, TuitionReportTable) still use `admin-portal-api` which uses `adminAuthHeaders()` — teachers will get 401 from these components until they are updated to use `teacher-tuition-api`

---
*Phase: 15-tuition-management*
*Completed: 2026-06-21*
