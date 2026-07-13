---
phase: 18-multi-language-support-across-all-pages
plan: 05
subsystem: ui
tags: [next-intl, i18n, react, nextjs, mui, teacher-portal, tuition]

# Dependency graph
requires:
  - phase: 18-multi-language-support-across-all-pages
    provides: "manual-extraction pattern established across 18-01 through 18-04"
provides:
  - "teacher.json extended with tuition namespace (page/configForm/generateModal/report sub-keys, both locales)"
  - "frontend/app/teacher/tuition/page.tsx and its 3 shared admin/tuition/_components fully translation-driven"
  - "Fixed the CONTEXT.md-flagged EN/VI inconsistency: tuition module was 100% Vietnamese-only, now fully bilingual"
affects: [18-06, 18-07, 18-08, 18-09, 18-10, 18-11, 18-12, "future Admin portal i18n migration phase"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Currency/date formatting calls (toLocaleString('vi-VN'), toLocaleDateString('vi-VN')) and the literal 'VNĐ' suffix left completely untouched per D-12/D-13 — only the label text surrounding them is wrapped in t()"
    - "Module-level COLUMNS array (TuitionReportTable) moved inside the component body once it needed t() for header labels — same pattern as classes/schedule FILTERS in earlier plans"

key-files:
  modified:
    - frontend/app/teacher/tuition/page.tsx
    - frontend/app/admin/tuition/_components/TuitionConfigForm.tsx
    - frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx
    - frontend/app/admin/tuition/_components/TuitionReportTable.tsx
    - frontend/messages/en/teacher.json
    - frontend/messages/vi/teacher.json

key-decisions:
  - "StatusBadge's status labels resolved via t(\\`status.${status}\\`) dynamic lookup; the same report.status.PENDING/PAID/OVERDUE keys are reused for the status-filter Select's MenuItem labels (identical wording in the original code)"
  - "PaymentRecordDialog.tsx and ZaloSendModal.tsx (admin-only, unreachable from Teacher portal per grep verification) were correctly excluded from scope, matching the plan's explicit scope note"

patterns-established: []

requirements-completed: [i18n-04, i18n-05]

# Metrics
duration: ~30min
completed: 2026-07-13
---

# Phase 18 Plan 05: Tuition Extraction Summary

**Teacher-portal tuition module (page + 3 shared config/generate/report components, previously 100% hardcoded Vietnamese) fully translation-driven via next-intl, with currency/date formatting preserved byte-identical**

## ⚠ Known Regression — Admin Portal (accepted risk, plan threat model T-18-10)

`TuitionConfigForm.tsx`, `GenerateRecordsModal.tsx`, and `TuitionReportTable.tsx` are shared components also rendered directly by **`frontend/app/admin/tuition/page.tsx`** (confirmed via `grep -n "TuitionConfigForm\|GenerateRecordsModal\|TuitionReportTable" app/admin/tuition/page.tsx`). They now call `useTranslations('teacher.tuition.*')`, but **`frontend/app/admin/layout.tsx` is not wrapped in `NextIntlClientProvider`** (confirmed via `grep -rn "NextIntlClientProvider" app/admin/` — zero matches; admin layout is a plain `'use client'` component with its own hardcoded English `TITLES` map, no i18n wiring at all).

**Practical impact:** an admin visiting `/admin/tuition` and opening the Config, Generate, or Report tab will hit `useTranslations()` throwing "No intl context found" at runtime — this is a new runtime break introduced by this plan, not present before.

This was explicitly identified, discussed, and **accepted** in `18-05-PLAN.md`'s threat model (T-18-10) before execution — the alternative (deferring the whole tuition module's extraction, or duplicating the 3 components) was rejected in favor of shipping the Teacher-portal fix now and resolving the Admin-side gap in that portal's own future i18n migration phase (D-10 scope boundary). Flagging prominently here per the plan's own requirement so it isn't silently rediscovered later.

**Recommended follow-up:** either (a) prioritize the Admin portal i18n migration phase, or (b) as a minimal stopgap, wrap `admin/tuition/page.tsx` specifically (or all of `admin/layout.tsx`) in a `NextIntlClientProvider` sourcing the same `teacher.json` catalog, ahead of the full Admin migration.

## Performance

- **Tasks:** 3/3 completed
- **Files modified:** 6

## Accomplishments
- `teacher/tuition/page.tsx`: heading, empty-classes state, class selector, 3 tab labels, generate-tab intro/button, report-tab month/year labels, and the load-classes-error toast all catalog-sourced
- `TuitionConfigForm.tsx`: heading, all 3 field labels, cancel/save buttons, 2 toasts catalog-sourced; the 2 currency `helperText` `toLocaleString('vi-VN')` calls left byte-identical
- `GenerateRecordsModal.tsx`: title, warning text, month/year field labels, generate button, 2 toasts catalog-sourced
- `TuitionReportTable.tsx`: `StatusBadge`'s 3 status labels, table column headers (moved from module scope into the component body), status filter, select-all/deselect-all, totals summary labels, empty state, record-payment button, and the load-error toast all catalog-sourced; all 6 `toLocaleString('vi-VN')` calls and 2 `toLocaleDateString('vi-VN')` calls left byte-identical, plus the literal `VNĐ` suffix stays hardcoded regardless of locale (D-12)

## Task Commits

All three tasks landed in a single commit since the shared `teacher.json` edits could not be cleanly split per-task:

1. **Tasks 1-3: Extract tuition page + 3 shared components** - `0725ba7` (feat)

## Files Created/Modified
- `frontend/app/teacher/tuition/page.tsx` - `useTranslations('teacher.tuition.page')`
- `frontend/app/admin/tuition/_components/TuitionConfigForm.tsx` - `useTranslations('teacher.tuition.configForm')`
- `frontend/app/admin/tuition/_components/GenerateRecordsModal.tsx` - `useTranslations('teacher.tuition.generateModal')`
- `frontend/app/admin/tuition/_components/TuitionReportTable.tsx` - `useTranslations('teacher.tuition.report')` in both `StatusBadge` and `TuitionReportTable`
- `frontend/messages/{en,vi}/teacher.json` - added `tuition` namespace with `page`/`configForm`/`generateModal`/`report` sub-keys

## Decisions Made
- Reused `report.status.{PAID,PENDING,OVERDUE}` keys for both the `StatusBadge` labels and the status-filter `Select`'s `MenuItem` labels, since the original Vietnamese source already used identical wording in both places.
- Verified via `grep` before editing that `PaymentRecordDialog.tsx`/`ZaloSendModal.tsx` are admin-only and unreachable from the Teacher portal — left untouched, matching the plan's explicit scope note.

## Deviations from Plan
None - plan executed exactly as written, including the explicitly-accepted Admin-portal regression documented above (T-18-10 in the plan's own threat model).

## Issues Encountered
Same environment limitation as prior plans in this phase: no headless browser available, so the plan's manual verification step (exercise all 3 tuition tabs in both languages, confirm currency amounts stay identical) could not be visually confirmed. Verified instead via `tsc --noEmit`, full `npm test`, `npm run build`, and `grep`-based diff confirmation that all `toLocaleString('vi-VN')`/`toLocaleDateString('vi-VN')` call counts are unchanged from before this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Verified: `npx tsc --noEmit` clean, `npm test` (4 suites / 12 tests) passing, `npm run build` succeeds.
- **Outstanding:** real-browser manual verification of the tuition module in both languages (cumulative outstanding item since 18-02).
- **Outstanding/flagged:** Admin portal's `/admin/tuition` page will throw at runtime until it gets its own `NextIntlClientProvider` wiring (see regression note above) — surface this to the project owner before the Admin portal is next touched.
- `teacher.json`'s `tuition` namespace is populated; Wave 6+ plans continue appending new top-level namespaces to the same file.

---
*Phase: 18-multi-language-support-across-all-pages*
*Completed: 2026-07-13*
