---
phase: 18
slug: multi-language-support-across-all-pages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-12
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.4+ (existing) + React Testing Library (needs install) |
| **Config file** | `frontend/jest.config.ts` (existing; add moduleNameMapper for `@/lib/i18n` if needed) |
| **Quick run command** | `npm test -- LanguageSwitcher.test.tsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- <touched test file>`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + manual EN/VI check on 3 sample Teacher pages
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-XX | TBD | 0 | i18n-01 | — | LanguageSwitcher calls setLocale server action and triggers re-render | integration | `npm test -- LanguageSwitcher.test.tsx -t "locale_change"` | ❌ W0 | ⬜ pending |
| 18-01-XX | TBD | 0 | i18n-02 | — | useTranslations hook loads correct locale's message keys | unit | `npm test -- request.test.ts -t "loads_locale"` | ❌ W0 | ⬜ pending |
| 18-01-XX | TBD | 0 | i18n-03 | — | Default locale is VI when no NEXT_LOCALE cookie exists (D-07) | integration | `npm test -- request.test.ts -t "default_locale_vi"` | ❌ W0 | ⬜ pending |
| 18-01-XX | TBD | 0 | i18n-04 | — | Toast messages interpolate dynamic variables (student name, count) | unit | `npm test -- toast.test.tsx -t "interpolation"` | ❌ W0 | ⬜ pending |
| 18-01-XX | TBD | 0 | i18n-05 | — | Teacher portal dashboard + 2-3 critical pages render correctly in both EN and VI | e2e (manual) | Browser: switch locale, verify UI text changes | — Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Exact Task IDs/Plan IDs to be filled in by the planner once PLAN.md files exist.*

---

## Wave 0 Requirements

- [ ] `frontend/components/__tests__/LanguageSwitcher.test.tsx` — test locale switching, server action invocation, re-render
- [ ] `frontend/lib/i18n/__tests__/request.test.ts` — test getRequestConfig reads cookie, defaults to VI (D-07)
- [ ] `frontend/lib/i18n/__tests__/actions.test.ts` — test setLocale server action sets cookie correctly
- [ ] `frontend/__tests__/toast-with-translations.test.tsx` — test toast messages correctly interpolate variables
- [ ] `npm install --save-dev @testing-library/react` — if not already present in `frontend/package.json`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full Teacher portal (19 pages) renders correctly in both EN and VI with no untranslated/leftover hardcoded strings | i18n-05 (extension) | Visual/textual correctness across 19 pages is not economical to assert per-string in automated tests | Switch language via LanguageSwitcher on each of the 19 Teacher pages; confirm no English text remains when VI is selected and vice versa, and no raw translation keys (e.g. `teacher.pages.classes.title`) leak into the UI |
| First-visit default locale (incognito, no cookie) is Vietnamese | D-07 | Requires a clean browser session with no cookies, not practical to automate reliably | Open Teacher portal in an incognito/private window, confirm VI renders before any language switch |
| Toast/error message catalog has no leftover EN/VI inconsistency across the 40+ call sites | D-11 | Requires cross-referencing all `showToast()` call sites against the catalog, not a single assertable behavior | Grep `frontend/app/teacher/**/*` for `showToast(` after extraction; confirm every match sources its message from the translation catalog, not an inline string |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
