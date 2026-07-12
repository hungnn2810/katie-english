# Phase 18: Multi-language support across all pages - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Add EN/VI bilingual support with a persistent language switcher across all four surfaces of the platform: Teacher portal, Admin portal, Student game, and the Marketing site. Today the app is bilingual **by area, not switchable** — teacher/admin is hardcoded English, student game + marketing are hardcoded Vietnamese. This phase makes every area a real two-way toggle.

Given the volume of work (~39 route pages across two separate Next.js codebases, hundreds of scattered inline strings, no i18n library installed), **this phase delivers the i18n foundation + one fully-migrated area (Teacher portal)**, not full coverage everywhere. Admin, Student, and Marketing migrations are follow-up phases that reuse the pattern proven here.

**In scope (this phase):**
- i18n library install + locale provider wiring (cookie-based, no URL prefix)
- Persistent language switcher UI component (used across all areas as they migrate)
- Full string extraction + EN+VI translation for the Teacher portal (19 pages)
- Toast/error message catalog — normalized as part of extraction (fixes existing EN/VI inconsistency, e.g. tuition module is VI-only while classes/homework are EN-only)

**Not in scope (follow-up phases):**
- Admin portal, Student game, Marketing site full migration (foundation + switcher will be reusable, but their string extraction is separate phases)
- Per-account locale persistence (no Prisma schema change — cookie-only for this phase)
- Locale-aware currency/date formatting (explicitly rejected — see decisions below)

</domain>

<decisions>
## Implementation Decisions

### Scope & Direction
- **D-01:** Teacher + Admin portals get a Vietnamese option added (currently English-only).
- **D-02:** Student game gets an English option added (currently Vietnamese-only).
- **D-03:** Marketing site gets an English version added (currently Vietnamese-only, has existing VI-specific SEO/JSON-LD from Phase 13 — that VI content and SEO setup must be preserved, EN is additive).
- **D-04:** Language switcher is a **persistent control visible on every page** in each migrated area (header/sidebar), not a one-time account/login setting.

### Locale Routing & Persistence
- **D-05 [LOCKED]:** Locale is tracked via **cookie/session-based state, not URL prefixes**. `frontend/middleware.ts` currently does pathname-based auth guards (checks for `/admin`, `/teacher`, `/student` prefixes) — this logic must NOT be rewritten to accommodate `/en/`, `/vi/` URL segments. The i18n library must support locale without a `[locale]` route segment (e.g. next-intl's "i18n without routing" mode, or an app-level React context + cookie).
- **D-06 [LOCKED]:** Locale persists **per-browser cookie only** — no `locale` field added to `User`/`Student` in `backend/prisma/schema.prisma`. No schema migration, no `docs/db/` update required for this phase (CLAUDE.md's Prisma-schema-change rule does not apply here since schema is untouched).
- **D-07 [LOCKED]:** Default locale on first visit (no cookie set yet) is **always Vietnamese** — no browser Accept-Language detection.
- **D-08:** `frontend/` (teacher/admin/student) and `marketing-site/` are two separate Next.js apps/deployments — locale is **independent per app**. No shared cookie domain, no cross-app propagation.

### Rollout Order
- **D-09 [LOCKED]:** This phase = i18n foundation (library, provider, switcher component) + full Teacher portal migration (highest page count at 19, and it's the area with a genuinely new capability — EN→VI — vs. areas that already partially exist in one language).
- **D-10:** Admin portal, Student game, and Marketing site migrations are deferred to follow-up phases that reuse the same library/pattern/switcher component established here.
- **D-11 [LOCKED]:** Toast/error message inconsistency (tuition module is Vietnamese-only while classes/homework modules are English-only, ~40+ `showToast()` call sites with no central catalog) is normalized **as part of this phase's extraction work** for every Teacher-portal toast touched — moved into the EN+VI translation catalog rather than left as scattered literals.

### Currency & Date Formatting
- **D-12 [LOCKED]:** Currency (tuition amounts, `VNĐ` suffix) does **NOT** change with UI language — it's real money in a fixed currency. Only surrounding labels (e.g. "Tuition Fee" vs "Học phí") get translated; the `toLocaleString('vi-VN')` number formatting and `VNĐ` suffix stay exactly as they are today.
- **D-13 [LOCKED]:** Dates render in **one consistent format regardless of UI language** — no per-locale date reformatting. `frontend/lib/datetime.ts`'s `formatDate()` is NOT changed to switch format by locale.

### Claude's Discretion
- Exact i18n library (e.g. `next-intl` in "without routing" mode vs `react-i18next`) — pick whichever cleanly supports cookie-based locale without a `[locale]` route segment, given the middleware constraint in D-05.
- Translation key naming/namespace structure (e.g. per-page namespaces vs a flat catalog) — `marketing-site/app/data/content.ts`'s typed-content-object pattern is a reasonable precedent to draw from, though marketing itself is out of scope for this phase.
- Switcher component visual design (dropdown, toggle, flag icons, text labels "EN/VI") — should fit the existing MUI theme (`frontend/lib/theme.ts`) and TeacherShell/AdminShell light-sidebar design from Phase 16.
- Exact placement of the switcher within TeacherShell (header vs sidebar).
- Whether translation JSON/catalog files live per-page or as a single consolidated file for the Teacher portal.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Routing / Middleware (constrains locale mechanism — D-05)
- `frontend/middleware.ts` — pathname-based auth guard (`/admin`, `/teacher`, `/student` cookie checks) that must remain untouched by locale routing
- `nginx/conf.d/katie.conf` — subdomain→app proxy mapping (admin.*, app.*, student.* all → frontend upstream); contains a stale comment claiming Host-header routing that does not match the actual middleware code

### Teacher Portal Pages (D-09 — this phase's migration target)
- `frontend/app/teacher/` — 19 page.tsx files to migrate (classes, homework incl. create/[id], import, login, schedule, sessions, students, tuition)
- `frontend/components/TeacherShell.tsx` — sidebar/header shell where the switcher will live (light-sidebar design from Phase 16, `16-CONTEXT.md` D-01/D-02)
- `frontend/lib/colors.ts` — teacherAccent `#3B82F6` / teacherAccentBg `#EFF6FF` — switcher styling should match

### Toast/Error Catalog (D-11)
- `frontend/lib/toast-context.tsx` — generic Snackbar wrapper, currently no message catalog; 40+ inline `showToast(...)` call sites across teacher pages need migrating into the new translation catalog
- `frontend/app/teacher/tuition/page.tsx`, `frontend/app/admin/tuition/_components/ZaloSendModal.tsx`, `frontend/app/admin/tuition/_components/PaymentRecordDialog.tsx` — examples of existing Vietnamese-only toast strings (tuition module) that are inconsistent with English-only toasts elsewhere (classes/homework) — Teacher-portal instances of this get normalized in this phase

### Currency/Date formatting (D-12, D-13 — explicitly NOT changed)
- `frontend/lib/datetime.ts` — shared `formatDate()`, stays locale-independent
- `frontend/app/admin/tuition/_components/TuitionReportTable.tsx`, `TuitionConfigForm.tsx`, `PaymentRecordDialog.tsx` — `toLocaleString('vi-VN')` currency formatting call sites, stay as-is

### Prisma Schema (D-06 — confirms NO changes needed)
- `backend/prisma/schema.prisma` — no `locale`/`language` field exists on `User`/`Student`; this phase does not add one, so no `docs/db/` update is triggered

### Not in scope this phase (reference only, for follow-up phase planning)
- `frontend/app/admin/` — 9 admin pages (follow-up phase)
- `frontend/app/student/` — 7 student pages (follow-up phase)
- `marketing-site/app/` — marketing landing page + `marketing-site/app/data/content.ts` typed-content pattern (follow-up phase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/components/ui/` (ModalShell, FormSection, TableShell, PageHeader, StatCard, HwTypeChip) — shared component library from the Phase 11 MUI refactor; the language switcher should live here as a new shared component (e.g. `LanguageSwitcher.tsx`) so it can be dropped into TeacherShell now and AdminShell/student layouts in follow-up phases.
- `marketing-site/app/data/content.ts` — typed content-object pattern already separates copy from JSX; worth reusing as a precedent for translation catalog shape even though marketing itself isn't migrated this phase.

### Established Patterns
- No i18n library currently installed in either `frontend/package.json` or `marketing-site/package.json` — this is a from-scratch install.
- All user-facing strings are inline JSX literals today — no existing `labels.ts`/`strings.ts` to build on for the Teacher portal.
- `frontend/app/teacher/layout.tsx` wires `ThemeProvider` — the locale provider should wrap at the same level.

### Integration Points
- Locale provider/context wraps at `frontend/app/teacher/layout.tsx` (and later, `admin/layout.tsx`, `student/layout.tsx`, marketing's own layout — but only teacher's for this phase).
- Switcher component reads/writes the locale cookie; no backend API calls needed (D-06 — no per-account persistence).

</code_context>

<specifics>
## Specific Ideas

No specific visual mockups or exact wording were given for the switcher — Claude has discretion on exact placement/style within the Phase 16 design system (see Claude's Discretion above).

</specifics>

<deferred>
## Deferred Ideas

- **Admin portal EN/VI migration** — follow-up phase, reuses this phase's library/pattern/switcher.
- **Student game EN/VI migration** — follow-up phase; kid-facing tone (ages 5-10) will need extra care on wording, not just direct translation.
- **Marketing site EN version** — follow-up phase; must preserve existing VI-specific SEO/JSON-LD (Phase 13) while adding an EN variant.
- **Per-account locale persistence** (Prisma `locale` field) — explicitly rejected for this phase (D-06); could be revisited later if cross-device persistence becomes a real user complaint.
- **Locale-aware currency/date formatting** — explicitly rejected (D-12, D-13); revisit only if the business expands beyond VNĐ-denominated, Vietnam-based operations.

</deferred>

---

*Phase: 18-multi-language-support-across-all-pages*
*Context gathered: 2026-07-12*
