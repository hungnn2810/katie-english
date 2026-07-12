# Phase 18: Multi-language support across all pages - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-12
**Phase:** 18-multi-language-support-across-all-pages
**Areas discussed:** Scope & direction, Locale routing & persistence, Rollout order for this phase, Currency & date formatting

---

## Scope & Direction — who gets a switcher

| Question | Option | Selected |
|---|---|---|
| Teacher + Admin: add Vietnamese option? | Yes, add VI option (Recommended) | ✓ |
| | No, keep English-only | |
| Student game: add English option? | Yes, add EN option | ✓ |
| | No, keep Vietnamese-only (Recommended) | |
| Marketing site: add English version? | No, stay Vietnamese-only (Recommended) | |
| | Yes, add English version | ✓ |
| Switcher UI placement | Persistent switcher (Recommended) | ✓ |
| | Account-level setting only | |

**User's choice:** Full bilingual EN/VI everywhere (teacher, admin, student, marketing all get a real toggle), with a persistent per-page switcher — the broader-scope option in every case, including two picks that went against the "Recommended" default (student EN option, marketing EN version).
**Notes:** None provided beyond the selections.

---

## Locale Routing & Persistence

| Question | Option | Selected |
|---|---|---|
| Routing mechanism (given path-based middleware guard) | Cookie/session-based (Recommended) | ✓ |
| | URL-prefixed routes (/en/..., /vi/...) | |
| Persistence scope | Per-account (new Prisma field) | |
| | Per-browser cookie only (Recommended) | ✓ |
| Default locale on first visit | Always Vietnamese (Recommended) | ✓ |
| | Detect from browser Accept-Language | |
| Cross-app locale sharing (frontend/ vs marketing-site/) | Independent per app (Recommended) | ✓ |
| | Shared across both | |

**User's choice:** Cookie-based locale, no URL prefix, per-browser persistence (no schema change), default Vietnamese, independent per app — all "Recommended" options.
**Notes:** This avoids rewriting `frontend/middleware.ts`'s pathname-based auth guard and avoids a Prisma migration.

---

## Rollout Order for This Phase

| Question | Option | Selected |
|---|---|---|
| Full coverage vs foundation-first | Foundation + phased migration (Recommended) | ✓ |
| | Full coverage in one phase | |
| First area to fully migrate | Teacher portal (Recommended) | ✓ |
| | Admin portal | |
| | Student game | |
| Toast/error message normalization | Normalize as part of extraction (Recommended) | ✓ |
| | Out of scope — defer | |

**User's choice:** This phase = i18n foundation + full Teacher portal migration only; Admin/Student/Marketing deferred to follow-up phases. Existing EN/VI toast inconsistency gets fixed as part of extraction, not deferred.
**Notes:** Teacher portal chosen for highest page count (19) and because EN→VI there is a genuinely new capability rather than partial existing work.

---

## Currency & Date Formatting

| Question | Option | Selected |
|---|---|---|
| Currency display on locale switch | Keep VNĐ, translate label only (Recommended) | ✓ |
| | Localize number formatting per locale | |
| Date format on locale switch | One consistent format always (Recommended) | ✓ |
| | Locale-aware date formatting | |

**User's choice:** Currency and dates stay exactly as rendered today regardless of UI language — only surrounding labels translate.
**Notes:** Tuition amounts are real VNĐ values; reformatting them per UI language was judged unnecessary complexity for a currency that never actually changes.

---

## Claude's Discretion

- Exact i18n library choice (e.g. next-intl "without routing" mode vs react-i18next) — must support cookie-based locale without a `[locale]` route segment.
- Translation key naming/namespace structure for the Teacher portal catalog.
- Switcher component visual design (dropdown/toggle, icons vs text) and exact placement within TeacherShell.
- Whether translation files are per-page or a single consolidated catalog for the Teacher portal.

## Deferred Ideas

- Admin portal EN/VI migration — follow-up phase.
- Student game EN/VI migration — follow-up phase (kid-facing tone needs extra care).
- Marketing site EN version — follow-up phase (must preserve Phase 13's VI-specific SEO/JSON-LD).
- Per-account locale persistence (Prisma `locale` field) — rejected for this phase, could revisit later.
- Locale-aware currency/date formatting — rejected, revisit only if business expands beyond VNĐ/Vietnam-based operations.
