# Phase 11: Frontend React MUI Refactor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 11-frontend-refactor-with-react-mui
**Areas discussed:** Tailwind fate, shadcn/ui fate, Theme scope, Migration depth

---

## Tailwind Fate

| Option | Description | Selected |
|--------|-------------|----------|
| Remove Tailwind | Full swap: delete tailwind.config.js, migrate all className to MUI sx prop or styled(). Cleanest result, no conflicts. | ✓ |
| Keep Tailwind for layout only | Tailwind stays for flex/grid/spacing utilities; MUI handles components. Preflight conflicts need manual override. | |
| Keep both, no changes | Tailwind and MUI coexist unchanged. Fastest start, visual inconsistencies accumulate. | |

**User's choice:** Remove Tailwind (Recommended)
**Notes:** Full CSS-in-JS migration — all Tailwind utilities replaced by MUI sx prop.

---

## shadcn/ui Fate

| Option | Description | Selected |
|--------|-------------|----------|
| Full replace with MUI | Delete components/ui/ entirely. Update all imports to MUI equivalents. ~20 import sites. | ✓ |
| Wrap: shadcn stays, MUI under the hood | Keep import paths, rewrite internals to use MUI. Extra indirection. | |
| Keep shadcn, add MUI for new components | shadcn stays for existing; new pages use MUI. Creates permanent two-system codebase. | |

**User's choice:** Full replace with MUI (Recommended)
**Notes:** All 11 shadcn components deleted. @base-ui/react, class-variance-authority, clsx, tailwind-merge also removed as dead code.

---

## Theme Scope

| Option | Description | Selected |
|--------|-------------|----------|
| One global theme + per-area overrides | Single createTheme() + student layout wraps in nested ThemeProvider with playful override. | ✓ |
| Completely separate themes | Three independent themes: teacher, student, admin. No shared tokens. | |
| One global theme, no overrides | Single theme everywhere. Student kid-friendly via one-off sx props. | |

**User's choice:** One global theme + per-area overrides (Recommended)
**Notes:** Student ThemeProvider override at game layout level — larger typography, rounder shapes, kid-friendly palette.

---

## Migration Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Core primitives only | Migrate buttons, inputs, dialogs, tables, chips, cards. Leave game-specific components as-is. | |
| Full page-by-page migration | Every element on every migrated page becomes MUI, including game screens. | ✓ |
| Shells/layouts only | Migrate shells and navigation only. Leave form fields and content areas as-is. | |

**User's choice:** Full page-by-page migration
**Notes:** Game screens (/game/session, /game/reading, /game/homework) confirmed in scope. PhonemeChips, PhonemeButton, ResultBanner all migrate.

### dnd-kit follow-up

| Option | Description | Selected |
|--------|-------------|----------|
| Keep dnd-kit | dnd-kit stays; only visual wrapper becomes MUI Paper/Card. | ✓ |
| Replace with MUI approach | Remove dnd-kit; MUI doesn't ship native sortable. | |

**User's choice:** Keep dnd-kit (Recommended)
**Notes:** Drag-and-drop logic unchanged; only the visual container becomes MUI.

---

## Claude's Discretion

None — all key decisions were made by user.

## Deferred Ideas

None — discussion stayed within phase scope.
