---
phase: 18-multi-language-support-across-all-pages
plan: 02
subsystem: ui
tags: [next-intl, i18n, react, nextjs, mui, teacher-portal]

# Dependency graph
requires:
  - phase: 18-multi-language-support-across-all-pages
    provides: "i18n foundation (resolveLocale/setLocale/LanguageSwitcher/NextIntlClientProvider) from Plan 18-01"
provides:
  - "teacher.json extended with dashboard/login/schedule namespaces (both locales, matching key sets)"
  - "frontend/app/teacher/page.tsx, login/page.tsx, schedule/page.tsx fully translation-driven"
  - "Bilingual inconsistency fixed: schedule was VI-only, login/dashboard were EN-only — now both render correctly in either locale"
affects: [18-03, 18-04, 18-05, 18-06, 18-07, 18-08, 18-09, 18-10, 18-11, 18-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ICU plural syntax for count-dependent strings needing EN pluralization: '{count, plural, one {...} other {...}}' (Vietnamese messages skip the plural block since VI has no plural forms, just interpolate {count} directly)"
    - "Module-level constant arrays that need translated labels (STAT_CARDS, QUICK_LINKS, FILTERS) moved inside the component body so they can call t() — established in 18-01 for TeacherLayoutClient's TITLES, now the pattern for wave 2+"

key-files:
  modified:
    - frontend/app/teacher/page.tsx
    - frontend/app/teacher/login/page.tsx
    - frontend/app/teacher/schedule/page.tsx
    - frontend/messages/en/teacher.json
    - frontend/messages/vi/teacher.json

key-decisions:
  - "d.error ?? t('toasts.invalid_credentials') in login page.tsx: backend-originated error text (d.error) stays untranslated per D-11 scope, only the client-side fallback string is catalog-sourced"

patterns-established:
  - "Pattern: component-scoped label arrays (STAT_CARDS/QUICK_LINKS/FILTERS) built inside the function body via t(), not module scope"

requirements-completed: [i18n-04, i18n-05]

# Metrics
duration: ~20min
completed: 2026-07-13
---

# Phase 18 Plan 02: Dashboard/Login/Schedule Extraction Summary

**Teacher dashboard, login, and schedule pages fully translation-driven via next-intl, fixing a pre-existing EN/VI inconsistency where schedule was Vietnamese-only and login/dashboard were English-only**

## Performance

- **Tasks:** 3/3 completed
- **Files modified:** 5

## Accomplishments
- `teacher.json` (both locales) extended with `dashboard`, `login`, `schedule` top-level namespaces, matching key structure
- Dashboard: stat cards, quick-action tiles, pending-approval/password-reset banner (ICU plural), "Upcoming Classes"/"Quick Actions" section headers, relative-time widget (`in_minutes`/`tomorrow`/`in_hours`/`in_days`), "Xem tất cả" view-all link (previously hardcoded Vietnamese regardless of locale), empty state, and the dashboard load-error toast all now catalog-sourced
- Login: heading/subtitle/feature list/form copy/button states/invalid-credentials toast all catalog-sourced
- Schedule: `FILTERS` labels, scheduled-count text, and empty-state copy — previously hardcoded Vietnamese-only — now render correctly in both EN and VI

## Task Commits

All three tasks landed in a single commit since the shared `teacher.json` edits could not be cleanly split per-task:

1. **Tasks 1-3: Extract dashboard/login/schedule page.tsx** - `ecf0e0f` (feat)

## Files Created/Modified
- `frontend/app/teacher/page.tsx` - `useTranslations('teacher.dashboard')`; `formatRelativeTime`, `STAT_CARDS`, `QUICK_LINKS` moved inside the component to access `t`
- `frontend/app/teacher/login/page.tsx` - `useTranslations('teacher.login')`; heading/subtitle/feature-list/form copy/toast catalog-sourced
- `frontend/app/teacher/schedule/page.tsx` - `useTranslations('teacher.schedule')`; `FILTERS` moved inside the component
- `frontend/messages/{en,vi}/teacher.json` - added `dashboard`/`login`/`schedule` namespaces

## Decisions Made
- Login page's thrown error keeps `d.error ?? t('toasts.invalid_credentials')` — `d.error` is backend-originated text and stays untranslated (out of scope per D-11), only the client-default fallback is catalog-sourced.
- Dashboard's "pending registration approval(s)" / "password reset request(s)" counts use ICU plural syntax (`{count, plural, one {...} other {...}}`) in English to preserve the original conditional-`s` pluralization; Vietnamese versions skip the plural block entirely since Vietnamese has no plural forms.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical, carried over from Plan 18-01] LanguageSwitcher was unreachable on the login page**
- **Found during:** manual server-rendered verification of this plan's pages (curl with `NEXT_LOCALE` cookie variants)
- **Issue:** `TeacherLayoutClient` only renders `TeacherShell` (which hosts `LanguageSwitcher`) once a user is authenticated; the unauthenticated `/teacher/login` route renders bare `{children}` with no switcher, contradicting 18-01's must-have truth that language is togglable "from any Teacher-portal page, including the login page."
- **Fix:** Rendered `<LanguageSwitcher />` directly in `frontend/app/teacher/login/page.tsx`, absolutely positioned top-right.
- **Files modified:** `frontend/app/teacher/login/page.tsx`
- **Verification:** `tsc --noEmit` clean; curl with `NEXT_LOCALE=en` vs no cookie confirms correct catalog selection server-side.
- **Committed in:** `7dd6346` (separate fix commit, not bundled into the 18-02 task commit)

---

**Total deviations:** 1 auto-fixed (missing critical, technically a gap in Plan 18-01's delivery, surfaced and fixed while verifying Plan 18-02)
**Impact on plan:** No scope creep on 18-02's own three tasks; fixes a real must-have gap from the prior plan.

## Issues Encountered
No headless browser (Chrome/Playwright/Puppeteer) is available in this environment, so the plan's manual `<verification>` step ("switch locale via LanguageSwitcher... confirm all visible text switches language") could not be visually confirmed in an actual browser. Verified instead via: `tsc --noEmit`, full `npm test` suite, `npm run build`, and curl-based confirmation that `resolveLocale()`/message-catalog selection is correct for both `en` and no-cookie (default `vi`) requests against `/teacher/login`. The LanguageSwitcher's click-and-call-setLocale behavior is covered by `LanguageSwitcher.test.tsx` (18-01) in isolation. A real-browser check is still recommended before considering this phase fully sign-off-ready.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Verified: `npx tsc --noEmit` clean, `npm test` (4 suites / 12 tests) passing, `npm run build` succeeds, server-side locale resolution confirmed correct via curl.
- **Outstanding:** real-browser manual verification of locale switching across `/teacher`, `/teacher/login`, `/teacher/schedule` (no browser tooling available this session — see Issues Encountered).
- `teacher.json`'s `dashboard`/`login`/`schedule` namespaces are now populated; Wave 3+ plans continue appending new top-level namespaces to the same file.

---
*Phase: 18-multi-language-support-across-all-pages*
*Completed: 2026-07-13*
