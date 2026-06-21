# Phase 16: Teacher/Admin UI Redesign - Research

**Researched:** 2026-06-21
**Domain:** React / MUI v9 UI redesign — color system migration, sidebar light theme, card-grid layout
**Confidence:** HIGH (all findings verified from live codebase; MUI patterns from installed v9.0.1)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** TeacherShell sidebar dark (#0C1220) → white (#FFFFFF) / surface (#F8FAFC). Border `1px solid #E2E8F0`. Logo "K" bubble blue.
- **D-02:** Accent orange (#F0623A) → blue (#3B82F6). Full palette: primary #3B82F6, dark #2563EB, bg tint #EFF6FF, text #1D4ED8. All `#F0623A` occurrences in teacher area replaced.
- **D-03:** Homework page: card grid — 3 cols desktop (≥1280), 2 cols tablet, 1 col mobile. Each card: type chip, title, class/due meta, LinearProgress bar, action icons.
- **D-04:** Filter tabs: pill style, transparent inactive / blue-50 active, count badge inline.
- **D-05:** Teacher Dashboard: 3-zone layout. Zone 1: 3 stat cards. Zone 2: Upcoming Classes (2fr) + Quick Actions (1fr). Pending banner keeps logic, updates to blue.
- **D-06:** AdminShell: same light sidebar. Admin accent indigo (#6366F1), teacher accent blue (#3B82F6). Both light.
- **D-07:** colors.ts additions — `teacherAccent → #3B82F6`, `adminAccent → #6366F1`, new `teacherAccentBg → #EFF6FF`, `adminAccentBg → #EEF2FF`.
- **D-08:** Game/student pages (/game/*) unchanged — dark purple theme preserved.

### Claude's Discretion

- Specific borderRadius values in cards (keep trend: 12–16px)
- Skeleton loading states in card grid
- Light hover transitions on cards
- Exact shadow values for card elevation

### Deferred Ideas (OUT OF SCOPE)

- Responsive/mobile layout for teacher portal
- Dark mode toggle
- Per-user theme customization
- Notification bell in header
- Global header search
</user_constraints>

---

## Summary

Phase 16 is a **pure UI reskin** — no backend changes, no schema changes, no new routes. The work is: (1) rewrite color constants in TeacherShell, AdminShell, and all teacher/admin pages; (2) switch sidebar backgrounds from dark to light with corresponding text/hover state changes; (3) replace the homework page TableShell render with a CSS Grid card layout; (4) update colors.ts to export new named constants. All required MUI components (Card, LinearProgress, Grid, Chip, Box) are already installed via @mui/material v9.0.1.

The primary risk is **scattered hardcoded color literals**. Research found that `#F0623A` appears in 9 files beyond TeacherShell — some via `colors.teacherAccent` (safe, single-change-point), others as raw hex string literals (must each be individually patched). The admin portal already uses a different accent (`#4F9DFF`), not orange, so its color migration path is simpler.

**Primary recommendation:** Update `colors.ts` first (single source of truth), then update `teacherTheme` and `adminTheme` in `theme.ts`, then update all `const ACCENT` local constants file by file. Sidebar light-theme changes are confined to two files (TeacherShell.tsx, AdminShell.tsx). Card grid is confined to teacher/homework/page.tsx.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Color system | Frontend (lib/colors.ts, lib/theme.ts) | — | Single source of truth; all pages import from here |
| Sidebar redesign | Frontend (components/TeacherShell.tsx, AdminShell.tsx) | — | Shell components own all sidebar DOM/styles |
| Homework card grid | Frontend (app/teacher/homework/page.tsx) | components/ui/TableShell.tsx (preserved, not deleted) | Page-level layout change; TableShell kept for admin pages |
| Dashboard layout | Frontend (app/teacher/page.tsx) | components/ui/StatCard.tsx | StatCard props-driven, no change to component needed |
| Admin page accent sync | Frontend (app/admin/*.tsx) | — | Local ACCENT const update per file |

---

## Standard Stack

### Core (already installed — no new packages needed)
| Library | Installed Version | Purpose | Notes |
|---------|------------------|---------|-------|
| @mui/material | 9.0.1 [VERIFIED: package.json] | All UI components | Card, LinearProgress, Box, Chip, Grid |
| @emotion/react | 11.x [VERIFIED: package.json] | MUI styling engine | Already configured |
| lucide-react | 1.16.0 [VERIFIED: package.json] | Icons | No change needed |
| next | 14.x [VERIFIED: package.json] | App Router | No routing changes |

**No new packages required.** This phase installs zero external dependencies.

---

## Package Legitimacy Audit

No packages are installed in this phase. Section not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
colors.ts  ──► theme.ts (teacherTheme / adminTheme)
    │                │
    │         teacher/layout.tsx     admin/layout.tsx
    │              │                      │
    ▼              ▼                      ▼
TeacherShell   (wraps all          AdminShell
 (sidebar +    teacher pages)      (sidebar +
  header)                           header)
    │
    ├── app/teacher/page.tsx        (dashboard — zone layout)
    ├── app/teacher/homework/page.tsx   (card grid)
    ├── app/teacher/classes/page.tsx    (accent sync)
    ├── app/teacher/students/page.tsx   (accent sync)
    ├── app/teacher/sessions/page.tsx   (accent sync)
    └── app/teacher/tuition/page.tsx    (no ACCENT const — inherits theme)
```

Data flow: `colors.ts` → local `const ACCENT` in each page → `sx` props on MUI components.

### Recommended File Change Order (dependency-safe)

```
Wave 1 (foundation — no visual regressions until all done):
  1. frontend/lib/colors.ts          — add teacherAccentBg, adminAccent, adminAccentBg; update teacherAccent
  2. frontend/lib/theme.ts           — update teacherTheme.primary.main and adminTheme.primary.main
  3. frontend/components/TeacherShell.tsx   — light sidebar + blue accent
  4. frontend/components/AdminShell.tsx     — light sidebar + indigo accent

Wave 2 (page-level changes, depend on Wave 1 shell):
  5. frontend/app/teacher/page.tsx         — dashboard 3-zone (stat card colors update, pending banner color)
  6. frontend/app/teacher/homework/page.tsx — card grid + pill filter tabs
  7. frontend/app/teacher/classes/page.tsx  — ACCENT const update
  8. frontend/app/teacher/students/page.tsx — ACCENT const update
  9. frontend/app/teacher/sessions/page.tsx — uses colors.teacherAccent directly (1 change)

Wave 3 (admin pages):
  10. frontend/app/admin/page.tsx           — ACCENT const update
  11. frontend/app/admin/teachers/page.tsx  — ACCENT const update
  12. frontend/app/admin/classes/page.tsx   — ACCENT occurrences
  13. frontend/app/admin/students/page.tsx  — ACCENT occurrences
  14. frontend/app/admin/homework/page.tsx  — no local ACCENT, uses CompletionBar (no change)

Non-teacher files (IMPORTANT — OUT OF SCOPE per D-08):
  - frontend/app/login/page.tsx            — has #F0623A but is the student/unified login page. Confirm scope.
  - frontend/app/not-found.tsx             — has #F0623A. Out of scope (not teacher portal).
  - frontend/app/403/page.tsx              — has #F0623A conditional. Out of scope.
  - frontend/app/teacher/login/page.tsx    — teacher login page; uses colors.teacherAccent — WILL auto-update when colors.ts changes.
```

### Pattern 1: Light Sidebar (TeacherShell / AdminShell)

**What:** Replace dark `bgcolor: '#0C1220'` with white/light-gray. Adjust all text colors (white→dark, muted→medium-dark). Active nav item uses blue tinted background.

**Current dark pattern:**
```tsx
// TeacherShell.tsx (current)
const ACCENT = '#F0623A';
const ACCENT_BG = 'rgba(240, 98, 58, 0.12)';
const ACCENT_TEXT = '#FDA087';

bgcolor: '#0C1220'                      // sidebar bg
color: '#94A3B8'                        // inactive nav text
color: '#E2E8F0'                        // inactive hover text
bgcolor: 'rgba(255,255,255,0.05)'       // inactive hover bg
color: '#475569'                        // group label
borderColor: 'rgba(255,255,255,0.07)'  // footer divider
color: 'white'                          // logo text
color: '#64748B'                        // subtitle text
```

**Target light pattern (D-01, D-02):**
```tsx
// TeacherShell.tsx (new)
const TEACHER_ACCENT = '#3B82F6';
const TEACHER_ACCENT_BG = '#EFF6FF';      // blue-50
const TEACHER_ACCENT_TEXT = '#1D4ED8';    // blue-700

bgcolor: '#FFFFFF'                        // sidebar bg (white)
boxShadow: '1px 0 0 #E2E8F0'            // right border replaces dark shadow
color: '#374151'                          // inactive nav text (dark gray)
color: '#1F2937'                          // inactive hover text
bgcolor: '#F1F5F9'                        // inactive hover bg (slate-100)
color: '#6B7280'                          // group label (gray-500)
borderColor: '#E2E8F0'                   // footer divider
color: '#0F172A'                          // logo text (near black)
color: '#6B7280'                          // subtitle text
```

**Nav active state (light theme):**
```tsx
'&.Mui-selected': { bgcolor: TEACHER_ACCENT_BG, color: TEACHER_ACCENT_TEXT },
'&.Mui-selected:hover': { bgcolor: TEACHER_ACCENT_BG },
```

Active indicator bar: `bgcolor: TEACHER_ACCENT` (unchanged positioning)

### Pattern 2: Homework Card Grid (D-03)

**What:** Replace `<TableShell>` render with CSS Grid of MUI `Card` components.

**Grid container:**
```tsx
<Box sx={{
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',  // desktop
  gap: '18px',
}}>
  {filtered.map((h) => <HwCard key={h.id} hw={h} ... />)}
</Box>
```

**Card structure (per D-03 wireframe):**
```tsx
<Card sx={{ borderRadius: '16px', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 8px 24px rgba(15,23,42,0.12)' } }}>
  {/* Header row: type chip + (optional) overdue badge */}
  <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <HwTypeChip type={h.type} />
    {isOverdue && <Chip label="Overdue" size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700 }} />}
  </Box>

  {/* Title */}
  <Box sx={{ px: 2.5, pb: 1 }}>
    <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0F172A', lineHeight: 1.3 }}>{hwName}</Typography>
    <Typography sx={{ fontSize: 12, color: '#64748B', mt: 0.5 }}>{classNames || '—'}</Typography>
  </Box>

  {/* Divider */}
  <Divider sx={{ mx: 2.5 }} />

  {/* Footer: progress + actions */}
  <Box sx={{ px: 2.5, py: 1.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
      <Typography sx={{ fontSize: 11, color: '#64748B' }}>{submittedCount}/{totalEnrolled} submitted</Typography>
      <Typography sx={{ fontSize: 11, color: '#64748B' }}>{dueText}</Typography>
    </Box>
    <LinearProgress
      variant="determinate"
      value={totalEnrolled > 0 ? (submittedCount / totalEnrolled) * 100 : 0}
      sx={{ height: 6, borderRadius: 99, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#3B82F6', borderRadius: 99 } }}
    />
    {/* Action icons row */}
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.25, mt: 1.5 }}>
      <IconButton size="small" ...assign />
      <IconButton size="small" ...edit />
      <IconButton size="small" ...preview />
      <IconButton size="small" ...delete />
    </Box>
  </Box>
</Card>
```

Note: `LinearProgress` is imported from `@mui/material/LinearProgress` — already in @mui/material v9. [VERIFIED: package.json shows @mui/material 9.0.1]

### Pattern 3: Pill Filter Tabs (D-04)

**What:** Replace current `Button variant="outlined"` tabs with pill-style toggle buttons.

**Current pattern (homework/page.tsx lines 723–735):**
```tsx
<Button key={t.key} variant="outlined" size="small"
  sx={{
    px: 1.5, py: 0.75, borderRadius: '8px', ...
    ...(typeFilter === t.key
      ? { bgcolor: '#FFF2EF', color: ACCENT, borderColor: ACCENT }
      : { bgcolor: 'white', color: '#64748B', borderColor: '#E2E8F0' }),
  }}>
  {t.label}<Box component="span">{counts[t.key]}</Box>
```

**New pill pattern (D-04):**
```tsx
<Button key={t.key} size="small" disableRipple={false}
  sx={{
    px: 1.75, py: 0.5, borderRadius: '999px', fontSize: 12, fontWeight: 600,
    border: 'none', minWidth: 0,
    ...(typeFilter === t.key
      ? { bgcolor: '#EFF6FF', color: '#3B82F6' }
      : { bgcolor: 'transparent', color: '#64748B', '&:hover': { bgcolor: '#F1F5F9' } }),
  }}>
  {t.label}
  <Box component="span" sx={{ ml: 0.75, px: 0.75, py: 0.125, borderRadius: '999px',
    fontSize: 10, fontWeight: 700,
    bgcolor: typeFilter === t.key ? '#DBEAFE' : '#F1F5F9',
    color: typeFilter === t.key ? '#3B82F6' : '#94A3B8',
  }}>{counts[t.key]}</Box>
```

### Pattern 4: colors.ts Update (D-07)

**Exact changes required:**
```typescript
// Before
export const colors = {
  ...
  teacherAccent: '#F0623A',
} as const;

// After
export const colors = {
  ...
  teacherAccent: '#3B82F6',      // blue-500 (was orange)
  adminAccent: '#6366F1',         // indigo-500 (new)
  teacherAccentBg: '#EFF6FF',     // blue-50 (new)
  adminAccentBg: '#EEF2FF',       // indigo-50 (new)
} as const;
```

**Also update theme.ts:**
```typescript
export const teacherTheme = createTheme(baseTheme, {
  palette: {
    primary: { main: '#3B82F6', contrastText: '#ffffff' },  // was '#F0623A'
  },
});

export const adminTheme = createTheme(baseTheme, {
  palette: {
    primary: { main: '#6366F1', contrastText: '#ffffff' },  // was '#4F9DFF'
  },
});
```

### Anti-Patterns to Avoid

- **Don't delete TableShell.tsx** — admin pages still use it (admin/teachers, admin/classes, admin/students, admin/homework all import TableShell). Only the teacher homework page switches to card grid.
- **Don't change HwTypeChip colors** — per-type colors (Phonics purple, Speaking pink, etc.) are intentionally kept per D-03.
- **Don't change game pages** — /game/* dark purple theme is out of scope per D-08.
- **Don't change student login page** — frontend/app/login/page.tsx has #F0623A but serves the student portal; it is NOT a teacher page.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress bar | Custom div-width CSS trick | `LinearProgress` from @mui/material | Already installed; handles edge cases (0%, 100%, animation) |
| Pill tabs | Custom toggle button group | MUI `Button` with borderRadius 999px + sx | Consistent with existing Button usage pattern throughout codebase |
| Card hover shadow | JS mouseover listener | MUI `sx` `transition` + `'&:hover': { boxShadow }` | CSS-only, no hydration issues, matches existing StatCard pattern |

---

## Common Pitfalls

### Pitfall 1: Hardcoded `#F0623A` in out-of-scope files
**What goes wrong:** Color grep finds #F0623A in login/page.tsx, not-found.tsx, 403/page.tsx. These are NOT teacher portal files — changing them is out of scope (D-08).
**Why it happens:** The old orange was used site-wide before the role split.
**How to avoid:** Only change files listed in CONTEXT.md canonical_refs. Use a targeted file list, not a repo-wide search-replace.
**Warning signs:** If `next build` passes but game/student login breaks visually, a non-teacher file was changed.

### Pitfall 2: `teacherTheme` primary.main affects all MUI components in teacher area
**What goes wrong:** Updating `teacherTheme.palette.primary.main` from #F0623A to #3B82F6 changes `Button variant="contained"` in ALL teacher pages — even ones not explicitly listed in the plan — via ThemeProvider cascade. This is actually desirable, but must be tested.
**Why it happens:** ThemeProvider wraps the entire teacher layout (teacher/layout.tsx uses `<ThemeProvider theme={teacherTheme}>`).
**How to avoid:** After updating theme.ts, verify all teacher pages still have correct visual intent. The cascade is intentional for contained buttons.

### Pitfall 3: AdminShell already has a different ACCENT (#4F9DFF, not orange)
**What goes wrong:** Planner mistakenly treats AdminShell as having an orange accent. It already uses `#4F9DFF` (blue) locally.
**Root cause:** AdminShell was written separately from TeacherShell and was never set to orange.
**How to avoid:** Research confirms AdminShell ACCENT = '#4F9DFF' currently. The migration is `#4F9DFF` → `#6366F1` (indigo), NOT orange → indigo. Also AdminShell lacks a "change password" form — it's simpler than TeacherShell.

### Pitfall 4: Sidebar text colors not adjusted for light background
**What goes wrong:** Copying sidebar sx from dark version — text colors like `#94A3B8` (light) look correct on dark (#0C1220) but too faint on white.
**Why it happens:** Dark-mode text colors are intentionally lighter; on white they disappear.
**How to avoid:** All sidebar text colors must be switched to dark-on-light equivalents. Group label: `#6B7280`, inactive nav: `#374151`, hover nav: `#1F2937`. See Pattern 1 above.

### Pitfall 5: `homework/page.tsx` has TWO separate ACCENT references
**What goes wrong:** homework/page.tsx line 33 declares `const ACCENT = '#F0623A'` (raw hex, not from colors.ts), AND lines 496/620 use `colors.teacherAccent` directly. Changing only the local const misses the two `colors.teacherAccent` usages; changing only colors.ts misses the local const.
**Why it happens:** The file was partially migrated during Phase 11 but not fully normalized.
**How to avoid:** In homework/page.tsx: (1) remove `const ACCENT = '#F0623A'`, (2) add `const ACCENT = colors.teacherAccent` (now blue after colors.ts update), (3) verify all 8 usages of `ACCENT` in the file are now consistent.

### Pitfall 6: The `sidebar` gradient in colors.ts is not used
**What goes wrong:** `gradients.sidebar` in colors.ts (`linear-gradient(180deg, #1F2937 0%, #374151 100%)`) exists but TeacherShell does NOT import it — the sidebar uses `bgcolor: '#0C1220'` directly. If someone tries to update gradients.sidebar thinking it drives the sidebar, nothing changes.
**Why it happens:** gradients.sidebar appears to be a vestigial value from an earlier design pass.
**How to avoid:** Do not update `gradients.sidebar`. Update the `bgcolor` in TeacherShell.tsx directly.

---

## Code Examples

### LinearProgress import (MUI v9)
```tsx
// Source: @mui/material v9.0.1 (installed)
import LinearProgress from '@mui/material/LinearProgress';

<LinearProgress
  variant="determinate"
  value={75}
  sx={{
    height: 6,
    borderRadius: 99,
    bgcolor: '#E2E8F0',
    '& .MuiLinearProgress-bar': { bgcolor: '#3B82F6', borderRadius: 99 },
  }}
/>
```

### MUI Card hover elevation (consistent with StatCard)
```tsx
// Source: existing StatCard.tsx pattern in codebase
<Card sx={{
  borderRadius: '16px',
  border: '1px solid #E2E8F0',
  transition: 'all 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
  },
}}>
```

### Active left indicator bar (keep from existing shell)
```tsx
// Source: TeacherShell.tsx line 151-155 (existing pattern — keep, just recolor)
{active && (
  <Box sx={{
    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
    width: 3, height: 20, borderRadius: '0 4px 4px 0', bgcolor: ACCENT,
  }} />
)}
```

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 16 |
|--------------|------------------|---------------------|
| Dark sidebar with orange | Light sidebar with blue | Core of D-01/D-02 |
| Table layout for homework | Card grid layout | Core of D-03 |
| Per-file hardcoded hex | Import from colors.ts | Reduces future migration cost |
| teacherTheme primary = orange | teacherTheme primary = blue | Cascades to all contained buttons in teacher layout |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `gradients.sidebar` in colors.ts is not imported by any active file | Common Pitfalls #6 | Low — grep shows TeacherShell uses hardcoded bgcolor, not this export |
| A2 | `app/teacher/sessions/page.tsx` accent usage is limited to `colors.teacherAccent` (1 occurrence at line 129) | Architecture Patterns | Low — if more usages exist, add to Wave 2 task |
| A3 | `app/teacher/homework/create/page.tsx` hardcodes '#F0623A' at lines 167/181 — should be updated in scope as teacher portal file | Common Pitfalls #1 | Medium — confirm this is a teacher-only route (it is: /teacher/homework/create) |
| A4 | `app/teacher/homework/_components/ListenCreationPage.tsx` and `ReadingCreationPage.tsx` hardcode '#F0623A' — these are teacher portal components | Common Pitfalls #1 | Medium — confirm these are in scope; they load inside teacher layout |

---

## Open Questions (RESOLVED)

1. **Scope of `app/login/page.tsx` (unified login page)**
   - What we know: File has `const ACCENT = '#F0623A'` with extensive usage; it serves as the root login (student/teacher router)
   - What's unclear: Is this in scope? It is NOT under /teacher/ route, but it IS part of the teacher auth flow
   - Recommendation: Treat as OUT OF SCOPE per D-08 (game/student pages unchanged). Teacher-specific login at `/teacher/login` uses `colors.teacherAccent` and will auto-update.
   - RESOLVED: OUT OF SCOPE per D-08. The unified login page serves the student portal and is not a teacher portal file.

2. **`app/teacher/homework/create/page.tsx` — 2 hardcoded #F0623A**
   - What we know: File is at /teacher/homework/create — teacher portal. Has hardcoded orange.
   - What's unclear: Phase 16 CONTEXT.md canonical list does not explicitly list this file.
   - Recommendation: Include in Wave 2 as part of homework page accent sync (same teacher path).
   - RESOLVED: IN SCOPE. Covered by 16-01 Task 3 (teacher portal file under /teacher/ route).

3. **`_components/ListenCreationPage.tsx` and `ReadingCreationPage.tsx` — hardcoded #F0623A**
   - These are teacher-only components loaded inside the teacher layout.
   - Recommendation: Include in Wave 2; they are part of the teacher portal.
   - RESOLVED: IN SCOPE. Covered by 16-01 Task 3 (teacher-only components inside teacher layout).

---

## Environment Availability

Step 2.6: SKIPPED — This phase is purely frontend code/style changes. No external tools, databases, CLIs, or services beyond the existing Next.js dev server are required.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in config.json).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — project has no Jest/Vitest/Playwright config |
| Config file | none |
| Quick run command | `cd frontend && npm run build` (TypeScript compile gate) |
| Full suite command | `cd frontend && npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| UI-01 | TeacherShell sidebar is white/light, blue accent | visual/smoke | `npm run build` (TS gate) | Manual verify in browser |
| UI-02 | AdminShell sidebar matches TeacherShell light style | visual/smoke | `npm run build` (TS gate) | Manual verify in browser |
| UI-03 | Homework card grid renders with type badge, progress bar, meta | visual/smoke | `npm run build` (TS gate) | Manual verify in browser |
| UI-04 | Teacher Dashboard 3-zone layout | visual/smoke | `npm run build` (TS gate) | Manual verify |
| UI-05 | Pill filter tabs with count badges | visual/smoke | `npm run build` (TS gate) | Manual verify |
| UI-06 | Admin pages use indigo accent consistently | visual/smoke | `npm run build` (TS gate) | Manual verify |
| UI-07 | No orange (#F0623A) remaining in teacher/admin files | grep check | `grep -r "F0623A" frontend/app/teacher frontend/app/admin frontend/components/TeacherShell.tsx frontend/components/AdminShell.tsx` | Automated grep pass |

### Sampling Rate
- **Per task commit:** `cd frontend && npm run build` (TypeScript must pass clean)
- **Per wave merge:** `npm run build` + grep check for stray #F0623A
- **Phase gate:** Full build green + manual browser smoke test before `/gsd:verify-work`

### Wave 0 Gaps
None — no new test files needed. This phase has no logic changes, only visual/styling. The TypeScript build (`npm run build`) is the primary automated gate.

---

## Security Domain

This phase modifies only CSS values and color constants in frontend UI components. No authentication, authorization, input validation, session management, cryptography, or data persistence is changed. ASVS categories V2–V6 are not applicable.

Security enforcement: confirmed not applicable to this phase scope.

---

## Sources

### Primary (HIGH confidence — verified from live codebase)
- `frontend/components/TeacherShell.tsx` — current sidebar DOM structure, color constants, nav rendering
- `frontend/components/AdminShell.tsx` — admin sidebar structure; confirmed different ACCENT (#4F9DFF, not orange)
- `frontend/lib/colors.ts` — current color exports; `teacherAccent: '#F0623A'` confirmed
- `frontend/lib/theme.ts` — teacherTheme, adminTheme; `teacherTheme primary.main = '#F0623A'` confirmed
- `frontend/app/teacher/homework/page.tsx` — current table layout, ACCENT usage audit
- `frontend/app/teacher/page.tsx` — current dashboard structure; already has 3-zone pattern
- `frontend/package.json` — @mui/material 9.0.1 confirmed installed

### Secondary (MEDIUM confidence)
- Grep audit of all `#F0623A` and `const ACCENT` across frontend — 9 files identified with orange usage
- Grep audit of `#4F9DFF` in admin files — AdminShell, admin/page.tsx, admin/teachers/page.tsx confirmed

---

## Metadata

**Confidence breakdown:**
- Color system audit: HIGH — verified via grep on live codebase
- MUI component patterns: HIGH — @mui/material 9.0.1 installed, LinearProgress API stable
- File change scope: HIGH — canonical_refs from CONTEXT.md cross-verified against grep audit
- Pitfalls: HIGH — found from direct code inspection

**Research date:** 2026-06-21
**Valid until:** 2026-07-21 (stable codebase; no external dependency changes)
