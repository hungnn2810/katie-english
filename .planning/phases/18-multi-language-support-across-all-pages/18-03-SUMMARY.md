---
phase: 18-multi-language-support-across-all-pages
plan: 03
subsystem: ui
tags: [next-intl, i18n, react, nextjs, mui, teacher-portal]

# Dependency graph
requires:
  - phase: 18-multi-language-support-across-all-pages
    provides: "i18n foundation (18-01) and manual-extraction pattern established on smaller pages (18-02)"
provides:
  - "teacher.json extended with classes/students namespaces (both locales, matching key sets)"
  - "frontend/app/teacher/classes/page.tsx and students/page.tsx fully translation-driven"
  - "All 16 showToast call sites across both files catalog-sourced (D-11 progress: 18/38 total)"
affects: [18-04, 18-05, 18-06, 18-07, 18-08, 18-09, 18-10, 18-11, 18-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level lookup tables (STATUS_CONFIG, DAY_LABELS) that need translated labels: strip the label from the const, keep only style data (color/bg/dot), and look up the label via a dynamic key t(`namespace.${key}`) inside the component"
    - "Multi-component files (5 separate function components in students/page.tsx) each call their own useTranslations('teacher.students') — no shared parent scope to hoist a single t into"

key-files:
  modified:
    - frontend/app/teacher/classes/page.tsx
    - frontend/app/teacher/students/page.tsx
    - frontend/messages/en/teacher.json
    - frontend/messages/vi/teacher.json

key-decisions:
  - "STATUS_CONFIG's `label` field removed entirely (kept color/bg/dot only); labels now resolved via t(`classStatus.${status}`) at render time since t is unavailable at module scope"
  - "Table column headers, empty states, delete-confirm micro-copy, and IconButton tooltips were not explicitly listed in the plan's interfaces block but were extracted anyway to satisfy the must-have truth of fully-localized pages — same pattern established in 18-02"
  - "Table row status chip on classes page uses distinct wording (statusChip.active='Active') from the STATUS_CONFIG/filter-tab label (classStatus.INPROGRESS='In Progress') — preserved as two separate key namespaces since the original code already used different English words for the same status in different contexts"

patterns-established:
  - "Pattern: dynamic-key t() lookups (t(\\`namespace.${variable}\\`)) for status/day/enum labels driven by a TS union type, replacing module-level Record<Type, {label}> constants"

requirements-completed: [i18n-04, i18n-05]

# Metrics
duration: ~35min
completed: 2026-07-13
---

# Phase 18 Plan 03: Classes/Students Extraction Summary

**Teacher classes and students pages (900+ lines, 7 modal/component functions, 16 toast call sites) fully translation-driven via next-intl, including status/day lookup tables and sex/parent-type labels**

## Performance

- **Tasks:** 2/2 completed
- **Files modified:** 4

## Accomplishments
- `classes/page.tsx`: `STATUS_CONFIG`/`DAY_LABELS` labels resolved dynamically via `t()`; `ClassModal` (create/edit form, status buttons, schedule day/time pickers) and `ClassesPage` (toolbar, filter tabs, table, delete-confirm flow) fully catalog-sourced; fixed a `filterTabs.map((t) => ...)` variable-shadowing bug that would have broken once the outer `t` translation function was introduced
- `students/page.tsx`: all 5 modal/section components (`SexToggle`, `ParentFields`, `CreateModal`, `EditModal`, `ApproveModal`, `ResetModal`) plus `StudentsPage` itself now call their own `useTranslations('teacher.students')`; all 13 toast call sites, pending-approvals/password-reset-request sections, and the main table are catalog-sourced
- `teacher.json` extended with `classes` (classStatus/dayLabels/statusChip/modal/toolbar/filterTabs/table/toasts) and `students` (sexToggle/parentFields/form/createModal/editModal/approveModal/resetModal/toolbar/pendingSection/resetSection/table/toasts) namespaces in both locales

## Task Commits

Both tasks landed in a single commit since the shared `teacher.json` edits could not be cleanly split per-task:

1. **Tasks 1-2: Extract classes/students page.tsx** - `b2375df` (feat)

## Files Created/Modified
- `frontend/app/teacher/classes/page.tsx` - `useTranslations('teacher.classes')` in `ClassModal` and `ClassesPage`; `STATUS_CONFIG`/`DAY_LABELS` labels now dynamic lookups
- `frontend/app/teacher/students/page.tsx` - `useTranslations('teacher.students')` in 7 separate function-scoped calls; all form labels, modal titles, toasts catalog-sourced
- `frontend/messages/{en,vi}/teacher.json` - added `classes`/`students` namespaces

## Decisions Made
- Removed `label` from `STATUS_CONFIG`'s type/values entirely (kept `color`/`bg`/`dot`), resolving labels via `t(\`classStatus.${status}\`)` inside components since `t` isn't available at module scope.
- Extracted several strings beyond the plan's explicit interfaces list (table column headers, empty states, delete-confirm copy, icon-button tooltips) to fully satisfy the must-have truth that both pages "render fully in Vietnamese/English" — consistent with the extraction pattern established in 18-02.
- Preserved the classes table's status chip wording ("Active"/`statusChip.active`) as distinct from the status-config/filter-tab wording ("In Progress"/`classStatus.INPROGRESS`) since the original English copy already used different words for the same status in different UI contexts — translating this pre-existing distinction rather than collapsing it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in existing code, surfaced during refactor] `filterTabs.map((t) => ...)` shadowed the translation function**
- **Found during:** Task 1 (classes/page.tsx toolbar extraction)
- **Issue:** `ClassesPage`'s filter-tabs render used `t` as the map callback's parameter name, which would silently shadow the newly-introduced `const t = useTranslations(...)` for the rest of that closure.
- **Fix:** Renamed the map parameter to `tab` throughout that block.
- **Files modified:** `frontend/app/teacher/classes/page.tsx`
- **Verification:** `tsc --noEmit` clean; visually confirmed no other `t` usage inside that closure was affected.
- **Committed in:** `b2375df` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (pre-existing naming collision surfaced by this refactor)
**Impact on plan:** No scope creep; necessary fix to avoid a subtle runtime bug once translations were introduced.

## Issues Encountered
Same environment limitation as 18-02: no headless browser available, so the plan's manual `<verification>` step (exercise create/edit/delete flows in both languages) could not be visually confirmed. Verified instead via `tsc --noEmit`, full `npm test`, `npm run build`, and a curl smoke-check confirming `/teacher/classes` and `/teacher/students` don't 500 (they correctly 307-redirect unauthenticated requests to `/teacher/login` via existing middleware — expected, unrelated to these changes). Full interactive/visual verification of these two pages is still outstanding.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Verified: `npx tsc --noEmit` clean, `npm test` (4 suites / 12 tests) passing, `npm run build` succeeds, both routes return expected (redirect, not 500) responses.
- **Outstanding:** real-browser manual verification of classes/students create/edit/delete/approve/reset flows in both languages (no browser tooling available this session).
- D-11 toast normalization progress: 18/38 total call sites now catalog-sourced (2 from 18-02 + 16 from this plan).
- `teacher.json`'s `classes`/`students` namespaces are populated; Wave 4+ plans continue appending new top-level namespaces to the same file.

---
*Phase: 18-multi-language-support-across-all-pages*
*Completed: 2026-07-13*
