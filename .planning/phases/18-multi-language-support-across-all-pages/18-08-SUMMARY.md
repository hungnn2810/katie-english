---
phase: 18-multi-language-support-across-all-pages
plan: 08
subsystem: ui
tags: [next-intl, i18n, react, nextjs, teacher-portal, homework, preview]

# Dependency graph
requires:
  - phase: 18-multi-language-support-across-all-pages
    provides: "manual-extraction pattern established across 18-01 through 18-07"
provides:
  - "teacher.json extended with homeworkTry namespace (previewBanner/matching/fillBlank/phonemeTag/page sub-keys), both locales"
  - "frontend/app/teacher/homework/[id]/try/page.tsx (1034 lines, the largest Teacher-portal file) fully translation-driven"
  - "Confirmed via full-file read: zero showToast call sites (matches plan's prediction)"
affects: [18-09, 18-10, 18-11, 18-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic status-key lookup guarded against unmapped values: PhonemeTag's t(\\`status.${op.status}\\`) only fires for a known status list, falling back to the raw string otherwise — avoids a next-intl MISSING_MESSAGE error for any future/unexpected status value"
    - "A component with genuinely zero static strings (FillBlankRenderer) still gets its required useTranslations() call wired to real content by adding a defensible accessibility improvement (aria-label on the blank placeholder) rather than a dead/unused hook call"

key-files:
  modified:
    - "frontend/app/teacher/homework/[id]/try/page.tsx"
    - frontend/messages/en/teacher.json
    - frontend/messages/vi/teacher.json

key-decisions:
  - "FillBlankRenderer had zero hardcoded strings (verified via grep of the component's line range) but the plan required it to call useTranslations independently; rather than leaving an unused hook call, added aria-label={t('blank')} to the blank placeholder — a real, defensible accessibility improvement"
  - "PhonemeTag's op.status is looked up against a known-status allowlist before calling t() — op.status is typed as PhonemeOp's status field but the colorMap already has a defensive ?? colorMap.error fallback for unmapped values, so the translation lookup needed the same defensiveness to avoid a runtime MISSING_MESSAGE error"

patterns-established: []

requirements-completed: [i18n-04, i18n-05]

# Metrics
duration: ~45min
completed: 2026-07-14
---

# Phase 18 Plan 08: Homework Try/Preview Extraction Summary

**Teacher's interactive homework-preview page (1034 lines, the single largest file in the Teacher portal) fully translation-driven across all 5 homework-type branches — PHONICS, SPEAKING, READING, VOCABULARY, LISTEN**

## Performance

- **Tasks:** 2/2 completed
- **Files modified:** 3

## Accomplishments
- `PreviewBanner`, `MatchingRenderer`, `FillBlankRenderer`, `PhonemeTag`: preview-mode banner, matching-activity instructions, phoneme status labels all catalog-sourced (`FillBlankRenderer` had no static strings to translate but gained a translated accessibility `aria-label`)
- `TeacherTryHomeworkPage`'s full state-machine flow (loading/error/speak_upload/speak_uploading/speak_results/phonics_word_select/phonics_upload/phonics_uploading/phonics_results/reading_playing/reading_done) — every heading, instruction, button label, and recording-state message across all 11 page states now catalog-sourced, including two near-duplicate recording-control blocks (speaking and phonics record flows share nearly identical UI)
- Confirmed via full-file read that this file has zero `showToast` calls, matching the plan's prediction

## Task Commits

Both tasks landed in a single commit since the shared `teacher.json` edits and the single-file scope could not be cleanly split:

1. **Tasks 1-2: Extract homeworkTry components + main flow** - `83e1c68` (feat)

## Files Created/Modified
- `frontend/app/teacher/homework/[id]/try/page.tsx` - `useTranslations('teacher.homeworkTry.{previewBanner,matching,fillBlank,phonemeTag}')` (one per component) + `useTranslations('teacher.homeworkTry.page')` in `TeacherTryHomeworkPage`
- `frontend/messages/{en,vi}/teacher.json` - added `homeworkTry` top-level key with 5 sub-namespaces

## Decisions Made
- `FillBlankRenderer` had no hardcoded strings anywhere in its render output (verified by grepping the component's line range for string literals) — rather than adding a dead/unused `useTranslations()` call to satisfy the plan's per-component hook requirement, wired it to a real (if minor) accessibility improvement: `aria-label={t('blank')}` on the visual blank-placeholder box.
- `PhonemeTag`'s dynamic `t(\`status.${op.status}\`)` lookup is guarded by an allowlist check (`['correct','similar','substituted','missing','extra','error'].includes(op.status)`) before calling `t()`, falling back to the raw status string otherwise — mirrors the existing `colorMap[op.status] ?? colorMap.error` defensive fallback already in the code, preventing a next-intl `MISSING_MESSAGE` error if the backend ever returns an unrecognized status value.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4 - Minor clarification] Task 2's exact-count acceptance criterion undercounts by 1**
- **Found during:** Task 2 verification
- **Issue:** The plan's acceptance criterion `grep -c "useTranslations" ... returns 5` doesn't account for the `import { useTranslations } from 'next-intl';` line itself also matching the grep pattern — the actual correct count is 6 (1 import + 5 functional hook calls, exactly matching "4 from Task 1 + 1 from this task" as intended).
- **Fix:** None needed — implementation is correct (5 hook calls, one per component); documenting the plan's grep-count phrasing as imprecise rather than treating it as a defect to "fix."
- **Files modified:** none
- **Verification:** Manually confirmed 5 distinct `useTranslations(...)` call sites (`PreviewBanner`, `MatchingRenderer`, `FillBlankRenderer`, `PhonemeTag`, `TeacherTryHomeworkPage`) plus the 1 import line = 6 total grep matches.
- **Committed in:** n/a (documentation-only clarification, no code change required)

---

**Total deviations:** 1 documented clarification (no code change), 0 auto-fixes requiring code changes
**Impact on plan:** None — implementation matches the plan's intent exactly.

## Issues Encountered
Same environment limitation as prior plans in this phase: no headless browser available, so the plan's manual verification step (open `/teacher/homework/[id]/try` for PHONICS, SPEAKING, and READING homeworks in both languages) could not be visually confirmed. Verified instead via `tsc --noEmit`, full `npm test`, and `npm run build`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Verified: `npx tsc --noEmit` clean, `npm test` (4 suites / 12 tests) passing, `npm run build` succeeds.
- **Outstanding:** real-browser manual verification of the try/preview flow across all 5 homework types in both languages (cumulative outstanding item since 18-02).
- `teacher.json`'s `homeworkTry` namespace is populated; Wave 9+ plans continue appending new top-level namespaces to the same file.

---
*Phase: 18-multi-language-support-across-all-pages*
*Completed: 2026-07-14*
