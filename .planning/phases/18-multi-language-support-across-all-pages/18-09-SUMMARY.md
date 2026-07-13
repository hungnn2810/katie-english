---
phase: 18-multi-language-support-across-all-pages
plan: 09
subsystem: ui
tags: [next-intl, i18n, react, nextjs, teacher-portal, reading, dnd-kit]

requires:
  - phase: 18-multi-language-support-across-all-pages
    provides: "manual-extraction pattern established across 18-01 through 18-08"
provides:
  - "teacher.json extended with readingCreate namespace (matchingEditor/fillBlankEditor/sortableCard/page), both locales"
  - "ReadingCreationPage.tsx (758 lines) fully translation-driven, including aria-labels and dynamic validation messages"
affects: [18-10, 18-11, 18-12]

tech-stack:
  added: []
  patterns:
    - "aria-label attributes translated alongside visible text (drag handle, remove buttons, blank-toggle chips) — not just visible copy"
    - "validate()'s per-activity-index error messages use ICU interpolation ({index}) instead of template-literal string building"

key-files:
  modified:
    - frontend/app/teacher/homework/_components/ReadingCreationPage.tsx
    - frontend/messages/en/teacher.json
    - frontend/messages/vi/teacher.json

key-decisions: []
patterns-established: []
requirements-completed: [i18n-04, i18n-05]

duration: ~35min
completed: 2026-07-14
---

# Phase 18 Plan 09: Reading Creation Editor Extraction Summary

**Reading homework creation/edit page (drag-and-drop matching + fill-in-blank activity editors) fully translation-driven, including aria-label accessibility attributes and dynamic per-activity validation error messages**

## Performance
- **Tasks:** 2/2 completed
- **Files modified:** 3

## Accomplishments
- `MatchingActivityEditor`: pair count, empty state, word-label placeholder, remove-pair aria-label, add-pair button, max-reached/min-required warnings, image-upload-failed fallback catalog-sourced
- `FillInBlankActivityEditor`: sentence label/placeholder, blank-clearing warning, word-chip toggle aria-labels (dynamic word interpolation), distractor section labels/placeholder catalog-sourced
- `SortableActivityCard`: drag-handle aria-label, activity-type chip labels, activity number, remove-activity button catalog-sourced
- `ReadingCreationPage`: header (back/heading/Try/Save), homework-name field, activities section (empty state, add buttons), all 7 dynamic `validate()` error messages (ICU-interpolated activity index), and both `showToast` fallbacks catalog-sourced

## Task Commits
1. **Tasks 1-2: Extract all 4 components** - `7874101` (feat)

## Files Created/Modified
- `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx`
- `frontend/messages/{en,vi}/teacher.json` - added `readingCreate` namespace

## Decisions Made
None beyond standard pattern application — no deviations, no ambiguous cases.

## Deviations from Plan
None - plan executed exactly as written. Both toast acceptance-criteria greps return 0.

## Issues Encountered
Same environment limitation as prior plans: no headless browser, so the plan's manual drag-and-drop verification step couldn't be run. Verified via `tsc --noEmit`, full `npm test`, `npm run build`.

## User Setup Required
None.

## Next Phase Readiness
- Verified: `tsc --noEmit` clean, tests pass (4/4 suites), build succeeds.
- **Outstanding:** real-browser verification of reading creation flow (cumulative since 18-02).
- `teacher.json`'s `readingCreate` namespace populated for Wave 10+.

---
*Phase: 18-multi-language-support-across-all-pages*
*Completed: 2026-07-14*
