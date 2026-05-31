# Phase 11: Frontend React MUI Refactor - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor the entire frontend UI layer to Material UI — install MUI, remove Tailwind CSS and shadcn/ui, define a global theme with per-area overrides, and migrate every page (teacher, student, game, admin) to MUI components while preserving the current visual appearance.

**Visual parity constraint (D-00):** The migration should produce pages that look identical (or as close as possible) to the current UI. This is a library swap, not a redesign.

</domain>

<decisions>
## Implementation Decisions

### CSS Strategy
- **D-01:** Remove Tailwind CSS entirely. Delete `tailwind.config.js`, `postcss.config.js` Tailwind entries, and all `className="..."` Tailwind utility strings. All styling moves to MUI's emotion CSS-in-JS (`sx` prop and `styled()`).

### Component Library
- **D-02:** Delete `frontend/components/ui/` entirely (all 11 shadcn components: button, input, dialog, table, badge, card, avatar, calendar, date-picker, label, popover, select, separator). Update all ~20 import sites to MUI equivalents: `Button`, `TextField`, `Dialog`, `Table`, `Chip`, `Card`, `Avatar`, `DatePicker` (MUI x-date-pickers), etc.
- **D-03:** Remove `@base-ui/react` (used internally by shadcn components — no longer needed once shadcn is gone). Remove `class-variance-authority`, `clsx`, `tailwind-merge` (shadcn utilities — all become dead code).

### Theme Architecture
- **D-04:** Single `createTheme()` at the app root (`frontend/app/layout.tsx`) as the global theme with base tokens (palette, typography, spacing, border radius, component variants).
- **D-05:** Student area (`frontend/app/game/` layout) wraps children in a nested `ThemeProvider` with a playful override: larger `typography.fontSize`, rounder `shape.borderRadius`, kid-friendly primary color palette. This satisfies STUDENT-03 without duplicating all tokens.
- **D-06:** Teacher and admin areas use the base theme directly — no override needed.

### Migration Scope
- **D-07:** Full page-by-page migration — every element on every page in teacher, student/game, and admin areas becomes an MUI component. This includes game screens (`/game/session`, `/game/reading`, `/game/homework`), `PhonemeButton`, `PhonemeChips`, `ResultBanner`, `SelectedPhonemes`.
- **D-08:** dnd-kit stays unchanged for drag-and-drop reordering (Reading creation page, `@dnd-kit/sortable`). Only the visual wrapper around draggable items (currently a `Card`-like div) becomes an MUI `Paper`/`Card`. dnd-kit is not replaced.
- **D-09:** `TeacherShell` and `AdminShell` layout components migrate to MUI (`AppBar`, `Drawer`/`Box`, `Toolbar` pattern). `AuthGate` migrates to MUI form elements.

### Page Coverage
- **Wave 1:** Theme foundation — `createTheme()`, design tokens, MUI install, remove Tailwind/shadcn, establish base shared components (replaces `components/ui/`)
- **Wave 2:** Teacher area — `/teacher/**` pages + `TeacherShell`
- **Wave 3:** Student/game area — `/game/**` + `/app/game/**` + student-facing components
- **Wave 4:** Admin area — `/admin/**` pages + `AdminShell`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 11 — requirements FE-01 through FE-05, success criteria, plan breakdown
- `.planning/REQUIREMENTS.md` §STUDENT-03 — kid-friendly visuals spec (ages 6–12, larger type, gentle colors, playful icons)

### Prior Phase Context (constraints that survive into Phase 11)
- `.planning/phases/04-student-page-ui-ux/04-CONTEXT.md` — D-01: student device target is laptop/PC only; `minWidth: 1024` constraint on student page must be preserved in MUI migration
- `.planning/phases/10-azure-pa/10-CONTEXT.md` — D-10: NestJS BfaService zero changes; frontend DTO shapes are fixed — no frontend API contract changes in this phase

### Frontend Codebase
- `frontend/package.json` — current deps (shadcn, @base-ui/react, tailwind, dnd-kit, lucide-react)
- `frontend/components/ui/` — 11 shadcn components to be deleted and replaced
- `frontend/components/TeacherShell.tsx` — shell to migrate
- `frontend/components/AdminShell.tsx` — shell to migrate
- `frontend/app/game/session/[id]/_components/PhonemeChips.tsx` — game component to migrate
- `frontend/components/PhonemeButton.tsx` — game component to migrate

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/components/ui/` — 11 shadcn components: these are the DELETE targets; document their API signatures before deleting so MUI replacements match call sites
- `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx` — uses @dnd-kit and a card-like container for activities; dnd-kit stays, only the visual container becomes MUI `Paper`
- `frontend/app/game/session/[id]/_components/PhonemeChips.tsx` — custom chip row with 4 color states (correct/similar/substituted/missing); MUI `Chip` with `color` or `sx` overrides can replace

### Established Patterns
- All pages import from `@/components/ui` — bulk import-rewrite needed across ~20 files after shadcn deletion
- `TeacherShell` and `AdminShell` use custom flex layout with nav links — map to MUI `AppBar` + `Box` sidebar pattern
- `lucide-react` icons: MUI has `@mui/icons-material` but lucide icons can also be used directly as MUI `SvgIcon` — either works, decide per plan
- `@dnd-kit` keyboard/mouse sensors wired in `ReadingCreationPage` — wrapper visual only needs to change, not sensor logic

### Integration Points
- `frontend/app/layout.tsx` — root layout; add MUI `ThemeProvider` + `CssBaseline` here
- `frontend/app/game/layout.tsx` (if it exists, else `frontend/app/game/homework/page.tsx`) — add student `ThemeProvider` override here
- All `className` Tailwind props across pages → `sx` prop or `styled()` components

</code_context>

<specifics>
## Specific Ideas

- User stated "keep current UI, change library to MUI components" — visual output should match current pages as closely as possible. Migration does not redesign any flows or change layout logic; it only swaps the component implementation.
- Student game screens are in scope for migration (user confirmed), so PhonemeChips, PhonemeButton, ResultBanner all get MUI treatment — but preserve the game feel (colors, sizing) via the student ThemeProvider override.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-frontend-refactor-with-react-mui*
*Context gathered: 2026-05-31*
