---
phase: 18-multi-language-support-across-all-pages
plan: 04
subsystem: ui
tags: [next-intl, i18n, react, nextjs, mui, teacher-portal]

# Dependency graph
requires:
  - phase: 18-multi-language-support-across-all-pages
    provides: "manual-extraction pattern established across 18-01 through 18-03"
provides:
  - "teacher.json extended with sessions/import namespaces (both locales, matching key sets)"
  - "frontend/app/teacher/sessions/page.tsx and import/page.tsx fully translation-driven"
  - "Sessions load-error toast and import upload-failed fallback catalog-sourced"
affects: [18-05, 18-06, 18-07, 18-08, 18-09, 18-10, 18-11, 18-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ICU plural for the results-count line ('{count, plural, one {# session} other {# sessions}}'); Vietnamese skips the plural block (no plural forms), just interpolates {count}"
    - "Inline colored label + value pairs (e.g. 'Matched: {n} / {m} words') collapsed into a single ICU-interpolated message rather than split styled spans, since word order and phrasing structure differ across languages"

key-files:
  modified:
    - frontend/app/teacher/sessions/page.tsx
    - frontend/app/teacher/import/page.tsx
    - frontend/messages/en/teacher.json
    - frontend/messages/vi/teacher.json

key-decisions:
  - "formatDuration's 'm'/'s' unit suffixes and ScoreBadge's '—' em-dash left untranslated per the plan's explicit interfaces guidance — compact, language-neutral notation, not prose"
  - "The 'Matched: {n} / {m} words' line lost its separate gray-colored 'Matched:' span styling when merged into one ICU string — acceptable since translated sentence structure/word order isn't guaranteed to keep a fixed-position label prefix"

patterns-established: []

requirements-completed: [i18n-04, i18n-05]

# Metrics
duration: ~20min
completed: 2026-07-13
---

# Phase 18 Plan 04: Sessions/Import Extraction Summary

**Teacher sessions and bulk-import pages fully translation-driven via next-intl, including the phonics/speaking result detail views and the import results table**

## Performance

- **Tasks:** 2/2 completed
- **Files modified:** 4

## Accomplishments
- `sessions/page.tsx`: filter bar (student/assignment/date-range), results count (ICU plural), empty states, session row (unknown-student/homework fallbacks, in-progress chip, view link), and the expanded detail panel (word-results table, speaking-result card, loading/no-results states) all catalog-sourced; load-error toast normalized
- `import/page.tsx`: intro card, step-by-step upload flow, results table (error rows + success summary), and the local-state upload-failed fallback all catalog-sourced
- `teacher.json` extended with `sessions` (filters/resultsCount/table headers/detail-panel strings/toasts) and `import` (heading/steps/table headers/summary/errors) namespaces in both locales

## Task Commits

Both tasks landed in a single commit since the shared `teacher.json` edits could not be cleanly split per-task:

1. **Tasks 1-2: Extract sessions/import page.tsx** - `629b3f0` (feat)

## Files Created/Modified
- `frontend/app/teacher/sessions/page.tsx` - `useTranslations('teacher.sessions')`; filter controls, results table, session detail panel catalog-sourced
- `frontend/app/teacher/import/page.tsx` - `useTranslations('teacher.import')`; upload flow, results table, success/error alerts catalog-sourced
- `frontend/messages/{en,vi}/teacher.json` - added `sessions`/`import` namespaces

## Decisions Made
- `formatDuration`'s `m`/`s` unit suffixes and `ScoreBadge`'s `'—'` em-dash left untranslated, per the plan's explicit guidance — compact, language-neutral notation already used consistently across the codebase, not prose requiring translation.
- Collapsed the "Matched: {n} / {m} words" line (previously a separately-styled gray "Matched:" span plus plain-color values) into a single ICU-interpolated string. This drops the label's distinct gray color, but a fixed-position label prefix isn't guaranteed to hold across languages with different word order, so a single translatable sentence is more correct than a hardcoded-position split.

## Deviations from Plan
None - plan executed exactly as written. Both tasks' acceptance-criteria greps return 0 as specified.

## Issues Encountered
Same environment limitation as 18-02/18-03: no headless browser available, so the plan's manual verification step (switch locale, load sessions with filters applied, upload a test file on import) could not be visually confirmed. Verified instead via `tsc --noEmit`, full `npm test`, and `npm run build`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Verified: `npx tsc --noEmit` clean, `npm test` (4 suites / 12 tests) passing, `npm run build` succeeds.
- **Outstanding:** real-browser manual verification of sessions filtering/detail-expansion and import upload flow in both languages (no browser tooling available this session — cumulative outstanding item since 18-02).
- `teacher.json`'s `sessions`/`import` namespaces are populated; Wave 5+ plans continue appending new top-level namespaces to the same file.

---
*Phase: 18-multi-language-support-across-all-pages*
*Completed: 2026-07-13*
