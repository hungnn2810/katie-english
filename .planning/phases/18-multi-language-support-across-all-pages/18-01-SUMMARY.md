---
phase: 18-multi-language-support-across-all-pages
plan: 01
subsystem: ui
tags: [next-intl, i18n, react, nextjs, mui, teacher-portal]

# Dependency graph
requires: []
provides:
  - "next-intl installed and wired via next.config.js plugin pointing at lib/i18n/request.ts"
  - "frontend/lib/i18n/request.ts: resolveLocale() + getRequestConfig default export, cookie-validated against SUPPORTED_LOCALES enum"
  - "frontend/lib/i18n/actions.ts: setLocale server action writing NEXT_LOCALE cookie (1yr maxAge)"
  - "frontend/messages/{en,vi}/teacher.json skeleton (nav/shell/common namespaces) for Waves 2-12 to extend"
  - "frontend/app/teacher/layout.tsx split into server component (NextIntlClientProvider) + TeacherLayoutClient.tsx (auth guard, unchanged logic)"
  - "LanguageSwitcher client component rendered in TeacherShell header on every Teacher page"
  - "TeacherShell nav/greeting/menu strings sourced from teacher.shell/teacher.nav translation keys"
affects: [18-02, 18-03, 18-04, 18-05, 18-06, 18-07, 18-08, 18-09, 18-10, 18-11, 18-12]

# Tech tracking
tech-stack:
  added: [next-intl@^4.13.2]
  patterns:
    - "Cookie-based locale (NEXT_LOCALE), no URL prefix routing"
    - "Enum-validated locale resolution (SUPPORTED_LOCALES) — cookie tampering falls back to DEFAULT_LOCALE ('vi'), never used directly in dynamic import path"
    - "Single teacher.json per locale, top-level namespaced keys (nav/shell/common/...) — extraction plans append keys, never create per-page files"
    - "next-intl single-brace ICU interpolation ({name}), not i18next {{name}}"
    - "Component tests use react-dom/test-utils (act, Simulate) + react-dom/client (createRoot) — no @testing-library/react in this repo"

key-files:
  created:
    - frontend/lib/i18n/request.ts
    - frontend/lib/i18n/request.test.ts
    - frontend/lib/i18n/actions.ts
    - frontend/lib/i18n/actions.test.ts
    - frontend/messages/en/teacher.json
    - frontend/messages/vi/teacher.json
    - frontend/app/teacher/TeacherLayoutClient.tsx
    - frontend/components/LanguageSwitcher.tsx
    - frontend/components/LanguageSwitcher.test.tsx
    - frontend/jest.setup.ts
  modified:
    - frontend/app/teacher/layout.tsx
    - frontend/components/TeacherShell.tsx
    - frontend/next.config.js
    - frontend/jest.config.ts
    - frontend/package.json

key-decisions:
  - "jest.config.ts jsx transform changed from 'react' to 'react-jsx' + added jest.setup.ts (IS_REACT_ACT_ENVIRONMENT=true) — required for React 18 act() semantics with createRoot-based component tests; not in original plan file list but necessary for Task 3's tests to run cleanly"

patterns-established:
  - "Pattern: i18n message keys namespaced by page/section under a single per-locale teacher.json (not per-file) — see 18-CONTEXT.md D-05/D-06/D-07 for locale-persistence rationale"

requirements-completed: [i18n-01, i18n-02, i18n-03]

# Metrics
duration: ~15min (Task 3 portion; Tasks 1-2 completed in a prior session)
completed: 2026-07-13
---

# Phase 18 Plan 01: i18n Foundation + Teacher Shell Wiring Summary

**next-intl cookie-based i18n foundation (EN/VI, no URL routing) wired into the Teacher portal shell with a persistent LanguageSwitcher and fully translated nav/greeting/menu strings**

## Performance

- **Tasks:** 3/3 completed
- **Files modified:** 15 (10 created, 5 modified)

## Accomplishments
- next-intl installed and plugged into next.config.js, pointing at the non-default `lib/i18n/request.ts` location
- `resolveLocale()` + `setLocale()` server action implement cookie-based locale persistence, with cookie-tampering mitigated by enum validation (defaults to `'vi'` for any unsupported value)
- `frontend/app/teacher/layout.tsx` split cleanly into a server component (resolves locale, wraps `NextIntlClientProvider`) and `TeacherLayoutClient.tsx` (unchanged auth-guard/role-redirect logic, now translation-driven `TITLES`)
- `LanguageSwitcher` renders in `TeacherShell`'s header on every authenticated Teacher route; selecting a language calls `setLocale` + `router.refresh()` inside a transition
- All previously hardcoded strings in `TeacherShell` (greeting, "Change password", password form placeholders/success/submit text, "Teacher" role label, "Sign out") now resolve via `useTranslations('teacher.shell')`

## Task Commits

1. **Task 1: Install next-intl + wire next.config.js and jest.config.ts** - `450cd3b` (chore)
2. **Task 2: i18n request config + setLocale action + message skeleton + layout split** - `9ab09d9` (test) + `fd71990` (feat)
3. **Task 3: LanguageSwitcher component + TeacherShell wiring** - `0698afb` (test) + `9f501cb` (feat)

## Files Created/Modified
- `frontend/lib/i18n/request.ts` - `resolveLocale()` (cookie read + enum validation) and next-intl `getRequestConfig` default export
- `frontend/lib/i18n/actions.ts` - `setLocale` server action writing `NEXT_LOCALE` cookie
- `frontend/messages/{en,vi}/teacher.json` - translation catalog skeleton (`nav`/`shell`/`common`)
- `frontend/app/teacher/layout.tsx` - now an async server component wrapping `NextIntlClientProvider`
- `frontend/app/teacher/TeacherLayoutClient.tsx` - moved client auth-guard logic, translation-driven `TITLES`
- `frontend/components/LanguageSwitcher.tsx` - MUI button+menu EN/VI switcher
- `frontend/components/TeacherShell.tsx` - renders `LanguageSwitcher`, all hardcoded strings replaced with `t(...)` calls
- `frontend/jest.config.ts` / `frontend/jest.setup.ts` - `testRegex` extended to `.tsx`, `react-jsx` transform, `IS_REACT_ACT_ENVIRONMENT` shim

## Decisions Made
- Switched jest's ts-jest `jsx` compiler option from `'react'` to `'react-jsx'` and added `jest.setup.ts` setting `IS_REACT_ACT_ENVIRONMENT = true` — required for React 18's `act()` to work correctly with `createRoot`-based tests (LanguageSwitcher.test.tsx); not called out in the plan's file list but strictly necessary for Task 3's tests to pass without spurious act() warnings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Missing Critical] jest React 18 act() environment shim**
- **Found during:** Task 3 (LanguageSwitcher component test)
- **Issue:** `jest-environment-jsdom` doesn't set `IS_REACT_ACT_ENVIRONMENT`, causing spurious "not configured to support act(...)" warnings for `createRoot`-based component tests; ts-jest's default `jsx: 'react'` transform also doesn't match the JSX runtime used elsewhere in the app.
- **Fix:** Added `frontend/jest.setup.ts` (sets the global flag) wired via `setupFiles` in `jest.config.ts`; changed `jsx` transform option to `'react-jsx'`.
- **Files modified:** `frontend/jest.config.ts` (new), `frontend/jest.setup.ts` (new)
- **Verification:** `npm test` — all 4 suites / 12 tests pass with no act() warnings.
- **Committed in:** `9f501cb` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (missing critical — test infra correctness)
**Impact on plan:** Necessary for Task 3's tests to run correctly under React 18; no scope creep, no product-facing behavior change.

## Issues Encountered
None beyond the jest infra fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- i18n foundation (`resolveLocale`, `setLocale`, `NextIntlClientProvider` wiring, `LanguageSwitcher`) is in place and proven end-to-end for the Teacher portal shell.
- `frontend/messages/{en,vi}/teacher.json` skeleton (`nav`/`shell`/`common`) is ready for Waves 2–12 to append page-specific keys — do not create new per-page message files.
- Full verification suite passing: unit tests (12/12), `tsc --noEmit` clean, `npm run build` succeeds with next-intl plugin wired.
- Admin/Student/Marketing portal migrations remain out of scope for this phase (deferred per 18-CONTEXT.md).

---
*Phase: 18-multi-language-support-across-all-pages*
*Completed: 2026-07-13*
