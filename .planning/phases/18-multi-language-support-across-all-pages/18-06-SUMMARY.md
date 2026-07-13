---
phase: 18-multi-language-support-across-all-pages
plan: 06
subsystem: ui
tags: [next-intl, i18n, react, nextjs, mui, teacher-portal, homework]

# Dependency graph
requires:
  - phase: 18-multi-language-support-across-all-pages
    provides: "manual-extraction pattern established across 18-01 through 18-05"
provides:
  - "teacher.json extended with homework (typeMeta/homeworkModal/assignModal/card/page) and homeworkCreate namespaces, both locales"
  - "frontend/app/teacher/homework/page.tsx (985 lines, largest file in phase) and homework/create/page.tsx fully translation-driven"
  - "All 12 showToast call sites in homework/page.tsx catalog-sourced — highest single-file toast count in the phase"
affects: [18-07, 18-08, 18-09, 18-10, 18-11, 18-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared enum-label lookup (homework.typeMeta.{PHONICS,SPEAKING,READING,VOCABULARY,LISTEN}) referenced from 4 different components (HomeworkModal, AssignModal, HwCard, HomeworkPage) each via their own second useTranslations('teacher.homework.typeMeta') call, alongside their primary sub-namespace-scoped t"
    - "ICU plural combined with two independent counts in one message: partsCount = '({count, plural, one {# part} other {# parts}}, {words, plural, one {# word} other {# words}})'"

key-files:
  modified:
    - frontend/app/teacher/homework/page.tsx
    - frontend/app/teacher/homework/create/page.tsx
    - frontend/messages/en/teacher.json
    - frontend/messages/vi/teacher.json

key-decisions:
  - "TYPE_META (module-level, used by 4 components) stripped of its 'label' field (kept icon/color/bg only, plain-object lookup, no hook needed); the label text is resolved separately via a per-component tType('teacher.homework.typeMeta') call since hooks can't be called at module scope"
  - "Local (non-toast) upload-error state in HomeworkModal ('Upload failed', shown via Typography, not showToast) was translated too even though the plan's explicit toast list didn't mention it — consistent with the phase's established 'extract everything visible' pattern"

patterns-established:
  - "Pattern: when a module-level Record<Enum, {label, ...style}> needs translated labels across multiple unrelated components, strip label from the const and give each component its own scoped translation call for the shared enum namespace"

requirements-completed: [i18n-04, i18n-05]

# Metrics
duration: ~50min
completed: 2026-07-14
---

# Phase 18 Plan 06: Homework List/Create Extraction Summary

**Teacher homework list page (985 lines — the largest file in the phase, covering the PHONICS/SPEAKING creation modal, class-assignment modal, card grid, and table view) and the homework-type picker page fully translation-driven, with all 12 showToast call sites catalog-sourced**

## Performance

- **Tasks:** 3/3 completed
- **Files modified:** 4

## Accomplishments
- `homework/create/page.tsx`: `HW_TYPES` labels resolved via dynamic `t()` lookup, back-link, step labels, title/assign-to fields, word-chip add form, footer buttons all catalog-sourced
- `HomeworkModal`: type selector grid, READING/VOCABULARY/LISTEN dedicated-editor redirect cards, PHONICS parts editor (add/remove part & word, ICU-pluralized counts), SPEAKING mode toggle + image upload + target-text/keywords fields, and all 4 toast call sites (5 message keys) catalog-sourced
- `AssignModal`: classes checklist, end-date picker, and all 3 toast call sites catalog-sourced
- `HwCard`: overdue badge, submitted/due row, delete-confirm flow, and icon-button tooltips catalog-sourced
- `HomeworkPage`: search/filter bar, view-mode toggle area, create button, empty/no-match states, table columns, and the remaining 5 toast call sites (homework created/updated/assigned, deleted ×2, delete-failed ×2 — sharing message keys across grid and table delete flows) all catalog-sourced

## Task Commits

All three tasks landed in a single commit since the shared `teacher.json` edits and the large single-file scope of Tasks 2/3 could not be cleanly split:

1. **Tasks 1-3: Extract homework/create + homework/page.tsx** - `ab7a90b` (feat)

## Files Created/Modified
- `frontend/app/teacher/homework/create/page.tsx` - `useTranslations('teacher.homeworkCreate')`
- `frontend/app/teacher/homework/page.tsx` - `useTranslations('teacher.homework.{homeworkModal,assignModal,card,page}')` (one call per component) + `useTranslations('teacher.homework.typeMeta')` in the 4 components that need the shared type-label lookup
- `frontend/messages/{en,vi}/teacher.json` - added `homeworkCreate` and `homework` (with 5 sub-namespaces) top-level keys

## Decisions Made
- `TYPE_META`'s `label` field removed from the module-level const (kept `icon`/`color`/`bg` only, since hooks can't run at module scope); each of the 4 components that needs the human-readable type name calls its own `tType = useTranslations('teacher.homework.typeMeta')` alongside its primary sub-namespace `t`.
- Translated the local (non-toast) "Upload failed" error state in `HomeworkModal` (shown inline via `Typography`, set via `setUploadError`, not `showToast`) even though it wasn't in the plan's explicit toast enumeration — consistent with prior plans' "extract every visible string" standard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in existing code, surfaced during refactor] Two more `.map((t) => ...)` shadowing bugs**
- **Found during:** Task 1 (`homework/create/page.tsx`) and Tasks 2-3 (`homework/page.tsx`)
- **Issue:** Same class of bug as 18-03's `filterTabs.map((t) => ...)` fix — `homework/create/page.tsx` had both `HW_TYPES.find((t) => t.type === picked)` and `HW_TYPES.map((t) => { ... t.label ... })`; `homework/page.tsx`'s `HomeworkModal` had `(Object.keys(TYPE_META) as HomeworkType[]).map((t) => { const m = TYPE_META[t]; ... })` and `HomeworkPage`'s filter-tabs array used `.map((t) => (...))`. All would have shadowed the newly-introduced `t`/`tType` translation functions.
- **Fix:** Renamed callback parameters to `hw`/`hwType`/`tab` respectively throughout.
- **Files modified:** `frontend/app/teacher/homework/create/page.tsx`, `frontend/app/teacher/homework/page.tsx`
- **Verification:** `tsc --noEmit` clean; visually confirmed no other `t`/`tType` usage inside affected closures was shadowed.
- **Committed in:** `ab7a90b` (Task commit)

**2. [Rule 4 - Minor, opportunistic] Fixed a pre-existing mojibake em-dash**
- **Found during:** Task 2 (add-word placeholder in `HomeworkModal`)
- **Issue:** `placeholder={\`Add word (e.g. paper) â€" Enter to add\`}` contained a corrupted em-dash byte sequence (likely a historical encoding mismatch), rendering as garbled text.
- **Fix:** Replaced with the catalog string `t('addWordPlaceholder')` containing a correct em-dash character.
- **Files modified:** `frontend/app/teacher/homework/page.tsx`
- **Verification:** Visual read of the JSON source confirms correct `—` character; no functional test covers placeholder text.
- **Committed in:** `ab7a90b` (Task commit)

---

**Total deviations:** 2 auto-fixed (1 recurring shadowing-bug class, 1 minor encoding fix)
**Impact on plan:** No scope creep; both fixes necessary for correctness, neither changes behavior beyond what the plan already required.

## Issues Encountered
Same environment limitation as prior plans in this phase: no headless browser available, so the plan's manual verification step (exercise homework create for PHONICS + SPEAKING, assign, delete flows, and the type picker, in both languages) could not be visually confirmed. Verified instead via `tsc --noEmit`, full `npm test`, `npm run build`, and grep-based confirmation that all 12 `showToast` call sites in `homework/page.tsx` now source from `t(...)`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Verified: `npx tsc --noEmit` clean, `npm test` (4 suites / 12 tests) passing, `npm run build` succeeds.
- **Outstanding:** real-browser manual verification of homework create/assign/delete flows and the type picker in both languages (cumulative outstanding item since 18-02).
- `teacher.json`'s `homework`/`homeworkCreate` namespaces are populated; Wave 7+ plans continue appending new top-level namespaces to the same file.
- D-11 toast normalization: 31/38 total call sites now catalog-sourced (19 through 18-05 + 12 from this plan).

---
*Phase: 18-multi-language-support-across-all-pages*
*Completed: 2026-07-14*
