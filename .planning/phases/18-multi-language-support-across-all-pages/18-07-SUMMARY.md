---
phase: 18-multi-language-support-across-all-pages
plan: 07
subsystem: ui
tags: [next-intl, i18n, react, nextjs, mui, teacher-portal, homework]

# Dependency graph
requires:
  - phase: 18-multi-language-support-across-all-pages
    provides: "manual-extraction pattern established across 18-01 through 18-06"
provides:
  - "teacher.json extended with homeworkDetail and sessionDetail namespaces, both locales"
  - "frontend/app/teacher/homework/[id]/page.tsx and homework/[id]/session/[sessionId]/page.tsx fully translation-driven"
  - "Confirmed via full-file read: neither file has any showToast call sites (matches plan's prediction from the 38-call-site inventory)"
affects: [18-08, 18-09, 18-10, 18-11, 18-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain (non-component) helper function needing translated text: scoreLabel(score, t) now accepts the translation function as a parameter, since hooks can only run inside components"

key-files:
  modified:
    - "frontend/app/teacher/homework/[id]/page.tsx"
    - "frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx"
    - frontend/messages/en/teacher.json
    - frontend/messages/vi/teacher.json

key-decisions:
  - "homeworkDetail.typeMeta duplicates homework.typeMeta's PHONICS/SPEAKING/READING/VOCABULARY/LISTEN labels (separate namespace, same values) — kept per-page namespaces self-contained rather than cross-referencing homework.typeMeta from a different page's translation scope"
  - "scoreLabel(score) → scoreLabel(score, t): the plain helper function (not a component) needed translated 'Great'/'OK'/'Needs work' labels; parameterizing with t was simpler than duplicating the bucketing logic at each of its 2 call sites"

patterns-established: []

requirements-completed: [i18n-04, i18n-05]

# Metrics
duration: ~30min
completed: 2026-07-14
---

# Phase 18 Plan 07: Homework/Session Detail Extraction Summary

**Teacher homework detail page (assignment list, per-student progress, delete-assignment flow) and session result detail page (per-activity result rows across 4 result-row components) fully translation-driven**

## Performance

- **Tasks:** 2/2 completed
- **Files modified:** 4

## Accomplishments
- `homework/[id]/page.tsx`: breadcrumb, Try button, homework info card (type chip, created date), stats bar (Assignments/Active/Enrolled/Submitted), assignments list (Open/Closed chip, submitted count, due date, remove-confirm flow), session rows (completed/in-progress text), and not-submitted count all catalog-sourced; confirmed via full read that this file has zero `showToast` calls
- `session/[sessionId]/page.tsx`: all 5 components (`MatchingResultRow`, `FillInBlankResultRow`, `ActivityResultCard`, `VocabResultRow`, `TeacherSessionDetailPage`) — breadcrumb, score hero (started/completed/in-progress, score-bucket label), Phonics/Speaking/Reading/Vocabulary section headings, Free Speak/Script Match badge, per-item correctness/no-answer text, and empty states all catalog-sourced; confirmed via full read that this file also has zero `showToast` calls
- `scoreLabel()` (a plain bucketing function, not a component) converted to accept `t` as a parameter since it can't call `useTranslations()` itself

## Task Commits

Both tasks landed in a single commit since the shared `teacher.json` edits could not be cleanly split per-task:

1. **Tasks 1-2: Extract homework/session detail pages** - `e114ba5` (feat)

## Files Created/Modified
- `frontend/app/teacher/homework/[id]/page.tsx` - `useTranslations('teacher.homeworkDetail')` + a second `tType = useTranslations('teacher.homeworkDetail.typeMeta')` call for the shared type-label lookup
- `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx` - `useTranslations('teacher.sessionDetail')` in each of the 5 components
- `frontend/messages/{en,vi}/teacher.json` - added `homeworkDetail`/`sessionDetail` top-level keys

## Decisions Made
- `homeworkDetail.typeMeta` intentionally duplicates the same PHONICS/SPEAKING/READING/VOCABULARY/LISTEN labels already present in `homework.typeMeta` (from 18-06) — kept each page's translation namespace self-contained per the plan's explicit `homeworkDetail`-scoped acceptance criteria, rather than reaching across to a sibling page's namespace.
- `scoreLabel(score)` → `scoreLabel(score, t)`: simplest fix for a plain helper function needing translated text at 2 call sites (`VocabResultRow`'s aria-label, `TeacherSessionDetailPage`'s score-hero badge).

## Deviations from Plan
None - plan executed exactly as written. Both files were confirmed via full read to have zero `showToast` call sites, matching the plan's prediction (neither file appears in the 38-call-site inventory).

## Issues Encountered
Same environment limitation as prior plans in this phase: no headless browser available, so the plan's manual verification step (open a homework detail page, drill into READING and PHONICS/VOCABULARY session results, in both languages) could not be visually confirmed. Verified instead via `tsc --noEmit`, full `npm test`, and `npm run build`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Verified: `npx tsc --noEmit` clean, `npm test` (4 suites / 12 tests) passing, `npm run build` succeeds.
- **Outstanding:** real-browser manual verification of homework/session detail pages in both languages (cumulative outstanding item since 18-02).
- `teacher.json`'s `homeworkDetail`/`sessionDetail` namespaces are populated; Wave 8+ plans continue appending new top-level namespaces to the same file.

---
*Phase: 18-multi-language-support-across-all-pages*
*Completed: 2026-07-14*
