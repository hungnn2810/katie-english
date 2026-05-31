# Phase 11: Frontend React MUI Refactor - Research

**Researched:** 2026-05-31
**Domain:** React 18 + Next.js 14 App Router + Material UI v9 + Emotion CSS-in-JS
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-00 Visual parity:** Pages must look identical (or as close as possible) to the current UI. Library swap, not a redesign.

**CSS Strategy**
- D-01: Remove Tailwind CSS entirely. Delete `tailwind.config.js`, `postcss.config.js` Tailwind entries, and all `className="..."` Tailwind utility strings. All styling moves to MUI's emotion CSS-in-JS (`sx` prop and `styled()`).

**Component Library**
- D-02: Delete `frontend/components/ui/` entirely (all 11 shadcn components). Update all ~20 import sites to MUI equivalents.
- D-03: Remove `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge` (shadcn utilities — dead code after shadcn removal).

**Theme Architecture**
- D-04: Single `createTheme()` at the app root (`frontend/app/layout.tsx`) as the global theme.
- D-05: Student area (`frontend/app/game/` layout) wraps children in a nested `ThemeProvider` with playful override: larger `typography.fontSize`, rounder `shape.borderRadius`, kid-friendly primary palette.
- D-06: Teacher and admin areas use the base theme directly — no override needed.

**Migration Scope**
- D-07: Full page-by-page migration including game screens.
- D-08: dnd-kit stays unchanged. Only the visual wrapper around draggable items becomes MUI `Paper`/`Card`.
- D-09: `TeacherShell` and `AdminShell` migrate to MUI (`AppBar`, `Drawer`/`Box`, `Toolbar`). `AuthGate` migrates to MUI form elements.

**Wave Structure**
- Wave 1: Theme foundation — `createTheme()`, design tokens, MUI install, remove Tailwind/shadcn, shared base components
- Wave 2: Teacher area — `/teacher/**` pages + `TeacherShell`
- Wave 3: Student/game area — `/game/**` + student-facing components
- Wave 4: Admin area — `/admin/**` pages + `AdminShell`

### Claude's Discretion

None documented — discussion stayed within phase scope.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FE-01 | Introduce shared Material UI theme (palette, typography, spacing, component variants) and apply globally | MUI `createTheme()` + `AppRouterCacheProvider` + `ThemeProvider` setup; design token mapping from tailwind.config.js and globals.css documented below |
| FE-02 | Replace ad-hoc core UI primitives (buttons, inputs, dialogs, tables, badges) with reusable MUI-based shared components | Shadcn→MUI component mapping table below; import-site count per component audited (Button×13, Input×8, Dialog×5, etc.) |
| FE-03 | Refactor key teacher flows (homework creation, assignment, dashboard tables) to MUI components without behavior regressions | Teacher pages audited (259–856 LOC); dnd-kit stays; shake animation must be replicated with MUI `sx` keyframes |
| FE-04 | Refactor student homework list and gameplay shell layouts to MUI while preserving current UX rules | `minWidth: 1024` constraint documented; student ThemeProvider override spec from D-05; game screens use gradient backgrounds that must survive migration |
| FE-05 | Refactor admin portal pages to MUI data-entry and table patterns with consistent validation/error states | Admin pages audited (94–439 LOC); all use admin `Button` and `Input` from shadcn; migrate to MUI `TextField`, `Button`, `Table*` |
</phase_requirements>

---

## Summary

Phase 11 replaces the entire frontend styling layer from Tailwind CSS + shadcn/ui components to Material UI v9 with Emotion CSS-in-JS. The project uses Next.js 14 App Router and React 18, both of which are fully supported by MUI v9. MUI is not currently installed — this is a greenfield install paired with a full shadcn/Tailwind teardown.

The codebase has 28 `.tsx` files under `frontend/app/` and `frontend/components/` that use `className` Tailwind strings (confirmed: 44 files total when including `node_modules`, 28 in-project). The largest migration targets are the game session page (822 LOC), homework try page (856 LOC), teacher students page (574 LOC), teacher homework page (850 LOC), and ReadingCreationPage (729 LOC). These files contain dense Tailwind strings but their business logic is unchanged — the migration is purely visual layer replacement.

Critical integration detail: Next.js 14 App Router requires `AppRouterCacheProvider` from `@mui/material-nextjs` to properly inject Emotion SSR styles into `<head>`. Without this, styles render in `<body>` and cause hydration mismatches. This is the most common pitfall for MUI + Next.js App Router setups. [VERIFIED: mui.com/material-ui/integrations/nextjs/]

**Primary recommendation:** Install `@mui/material @emotion/react @emotion/styled @mui/icons-material @mui/x-date-pickers @mui/material-nextjs @emotion/cache`, set up `AppRouterCacheProvider` + `ThemeProvider` in `app/layout.tsx` in Wave 1, then migrate area-by-area. The shake animation (used in reading game and try page) must be replicated as a MUI `sx` keyframe or CSS global since `tw-animate-css` is deleted.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Global MUI theme tokens | Frontend Server (layout.tsx) | — | `AppRouterCacheProvider` + `ThemeProvider` live in root layout; emotion SSR collects styles server-side |
| Student area theme override | Client component (game layout) | — | Must be `'use client'` to use nested `ThemeProvider`; wraps all `/game/**` routes |
| Shared UI primitives (Button, TextField, Dialog) | Browser / Client | — | All current import sites are `'use client'` pages; MUI components render client-side |
| Shell layouts (TeacherShell, AdminShell) | Browser / Client | — | Already `'use client'`; `usePathname` / `useRouter` hooks require client context |
| DatePicker + LocalizationProvider | Browser / Client | — | `@mui/x-date-pickers` requires client context; wrap at page or layout level |
| Animation keyframes (shake) | Browser / Client | MUI theme `keyframes` | Replace `animate-shake` Tailwind class with MUI `sx` keyframe definition or inline CSS |
| dnd-kit wrappers | Browser / Client | — | D-08: unchanged; only the visual container div becomes MUI `Paper` |

---

## Standard Stack

### Core Packages to Install

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mui/material` | 9.0.1 | Core component library + `ThemeProvider`/`createTheme` | Official MUI v9; React 18 compatible [VERIFIED: npm registry] |
| `@emotion/react` | 11.14.0 | CSS-in-JS runtime (MUI peer dep) | Required by MUI; preferred over styled-components for SSR [VERIFIED: npm registry] |
| `@emotion/styled` | 11.14.1 | `styled()` API for component variants | Required by MUI for `styled()` pattern [VERIFIED: npm registry] |
| `@mui/icons-material` | 9.0.1 | 2000+ Material icons as SvgIcon | Replaces lucide-react for MUI-native icon usage [VERIFIED: npm registry] |
| `@mui/x-date-pickers` | 9.3.0 | DatePicker component (replaces shadcn date-picker) | Official MUI X component; compatible with date-fns v4 [VERIFIED: npm registry] |
| `@mui/material-nextjs` | 9.0.1 | `AppRouterCacheProvider` for Next.js App Router SSR | Required to avoid style-in-body hydration bug [VERIFIED: npm registry] |
| `@emotion/cache` | 11.14.0 | Emotion cache for SSR style collection | Peer dep of `@mui/material-nextjs` [VERIFIED: npm registry] |

### Packages to Remove

| Package | Reason |
|---------|--------|
| `tailwindcss` | Replaced by MUI Emotion CSS-in-JS (D-01) |
| `autoprefixer` | Tailwind toolchain dependency — no longer needed |
| `tw-animate-css` | Tailwind-based animation utilities — no longer needed |
| `shadcn` | Component scaffolding tool — all components deleted (D-02) |
| `@base-ui/react` | Internal shadcn dependency — dead code (D-03) |
| `class-variance-authority` | shadcn utility — dead code (D-03) |
| `clsx` | shadcn utility — dead code (D-03) |
| `tailwind-merge` | shadcn utility — dead code (D-03) |
| `react-day-picker` | Used internally by shadcn calendar — deleted with it |
| `postcss` | Only needed for Tailwind; check if any other dep needs it before removing |

**Note:** `lucide-react` can stay — lucide icons work as MUI `SvgIcon` wrappers and `@mui/icons-material` coverage is not 100% equivalent. Keep `lucide-react` unless icon-by-icon replacement is explicitly required. [ASSUMED]

### Packages to Keep Unchanged

| Package | Reason |
|---------|--------|
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | D-08: dnd-kit stays |
| `@ricky0123/vad-web`, `onnxruntime-web` | VAD audio recording — unrelated to UI |
| `date-fns` | Already installed (^4.2.1); used by `@mui/x-date-pickers` AdapterDateFns |
| `next`, `react`, `react-dom` | Framework — unchanged |

**Installation:**
```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/x-date-pickers @mui/material-nextjs @emotion/cache
npm uninstall tailwindcss autoprefixer tw-animate-css shadcn @base-ui/react class-variance-authority clsx tailwind-merge react-day-picker
```

**Version verification:** All MUI packages confirmed on npm registry 2026-05-31. No postinstall scripts detected on any MUI or Emotion package.

---

## Package Legitimacy Audit

> Note: `slopcheck` defaulted to PyPI (Python) for these npm packages and returned false SLOP verdicts. Manual npm registry verification performed instead. All packages verified via `npm view <pkg>` against the npm registry.

| Package | Registry | Age | Downloads (estimated) | Source Repo | Verdict | Disposition |
|---------|----------|-----|----------------------|-------------|---------|-------------|
| `@mui/material` | npm | ~5 yrs (created 2021-09-02) | >3M/wk | github.com/mui/material-ui | OK (official MUI org) | Approved |
| `@emotion/react` | npm | ~6 yrs (created 2020-01-05) | >10M/wk | github.com/emotion-js/emotion | OK | Approved |
| `@emotion/styled` | npm | ~8 yrs (created 2018-02-09) | >8M/wk | github.com/emotion-js/emotion | OK | Approved |
| `@mui/icons-material` | npm | ~5 yrs (created 2021-09-02) | >2M/wk | github.com/mui/material-ui | OK (official MUI org) | Approved |
| `@mui/x-date-pickers` | npm | ~4 yrs (created 2022-04-04) | >1M/wk | github.com/mui/mui-x | OK (official MUI org) | Approved |
| `@mui/material-nextjs` | npm | ~3 yrs | >200K/wk | github.com/mui/material-ui | OK (official MUI org) | Approved |
| `@emotion/cache` | npm | ~8 yrs (created 2018-02-10) | >10M/wk | github.com/emotion-js/emotion | OK | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck was run against wrong ecosystem; npm registry verification used instead)
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Next.js 14 App Router (frontend/)
│
└── app/layout.tsx  [Server Component]
    ├── AppRouterCacheProvider   ← emotion SSR style collection
    ├── ThemeProvider(baseTheme) ← global MUI theme
    │   ├── CssBaseline          ← normalize + body background
    │   │
    │   ├── app/teacher/layout.tsx → TeacherShell (MUI AppBar+Drawer)
    │   │   └── teacher pages (use baseTheme directly)
    │   │
    │   ├── app/admin/layout.tsx → AdminShell (MUI AppBar+Drawer)
    │   │   └── admin pages (use baseTheme directly)
    │   │
    │   └── app/game/layout.tsx [new]
    │       └── ThemeProvider(studentThemeOverride)  ← nested override (D-05)
    │           └── game pages (larger type, rounder corners, kid palette)
    │
    └── app/login/page.tsx (uses baseTheme — teacher/student toggle)
```

**Data flow:** Emotion collects styles on the server inside `AppRouterCacheProvider`, injects them into `<head>` before hydration. All MUI components inside `ThemeProvider` receive tokens via React context. Nested `ThemeProvider` for student area extends the base theme without duplicating all tokens.

### Recommended Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Add AppRouterCacheProvider + ThemeProvider + CssBaseline
│   ├── game/
│   │   ├── layout.tsx          # Add nested ThemeProvider(studentTheme) here
│   │   └── ...
│   ├── teacher/
│   │   └── ...                 # Use baseTheme — no extra provider
│   └── admin/
│       └── ...                 # Use baseTheme — no extra provider
├── components/
│   ├── ui/                     # DELETE entirely (Wave 1)
│   ├── TeacherShell.tsx        # Migrate to MUI AppBar+Box pattern (Wave 2)
│   ├── AdminShell.tsx          # Migrate to MUI AppBar+Box pattern (Wave 4)
│   ├── AuthGate.tsx            # Migrate loading state to MUI CircularProgress (Wave 1)
│   ├── PhonemeButton.tsx       # Migrate to MUI Button+IconButton pattern (Wave 3)
│   ├── PhonemeChips.tsx        # Migrate to MUI Chip components (Wave 3)
│   ├── ResultBanner.tsx        # Migrate to MUI Alert component (Wave 3)
│   └── SelectedPhonemes.tsx    # Migrate to MUI Box+Button pattern (Wave 3)
└── lib/
    ├── theme.ts                # NEW: createTheme() base theme (Wave 1)
    ├── student-theme.ts        # NEW: student ThemeProvider override (Wave 1)
    └── colors.ts               # KEEP: gradient values not in MUI theme
```

### Pattern 1: Root Layout Setup (Wave 1 Critical Path)

**What:** AppRouterCacheProvider wraps everything, ThemeProvider wraps app content, CssBaseline resets defaults.

**When to use:** Wave 1 foundation — must land before any other MUI migration.

```tsx
// Source: mui.com/material-ui/integrations/nextjs/
// app/layout.tsx — Server Component (no 'use client' needed here)
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { baseTheme } from '@/lib/theme';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={baseTheme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
```

### Pattern 2: createTheme with Project Design Tokens

**What:** Maps existing Tailwind color tokens (from `tailwind.config.js` + `globals.css`) to MUI palette.

**Token mapping from current codebase:**

| Tailwind Token | Value | MUI Theme Key |
|---------------|-------|---------------|
| `primary` | `#4F9DFF` | `palette.primary.main` |
| `secondary` | `#6ED6C1` | `palette.secondary.main` |
| `accent` | `#FFD166` | `palette.warning.main` |
| `highlight` | `#FF7B7B` | `palette.error.main` |
| `background` | `#F7F9FC` | `palette.background.default` |
| `card` | `#FFFFFF` | `palette.background.paper` |
| `border` | `#E2E8F0` | `palette.divider` |
| `textPrimary` | `#0F172A` | `palette.text.primary` |
| `textSecondary` | `#64748B` | `palette.text.secondary` |
| `brand-purple` | `#A78BFA` | custom token in `palette` |
| `brand-pink` | `#FF9BD2` | custom token in `palette` |
| `brand-green` | `#7BD88F` | custom token in `palette` |
| Teacher accent | `#F0623A` | custom `teacherAccent` in `palette` |
| Admin accent | `#4F9DFF` | same as `primary` |
| Font | `var(--font-inter)` | `typography.fontFamily` |
| Border radius | `0.75rem` (12px) | `shape.borderRadius: 12` |

```tsx
// Source: mui.com/material-ui/customization/theming/
// lib/theme.ts
'use client';
import { createTheme } from '@mui/material/styles';

export const baseTheme = createTheme({
  palette: {
    primary: { main: '#4F9DFF', contrastText: '#ffffff' },
    secondary: { main: '#6ED6C1', contrastText: '#0F172A' },
    error: { main: '#FF7B7B' },
    warning: { main: '#FFD166' },
    background: { default: '#F7F9FC', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B' },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F7F9FC' },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-thumb': { background: '#CBD5E1', borderRadius: 3 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
});
```

### Pattern 3: Student Area Nested Theme Override (D-05)

**What:** A nested `ThemeProvider` in `app/game/layout.tsx` provides kid-friendly overrides.

```tsx
// lib/student-theme.ts
'use client';
import { createTheme } from '@mui/material/styles';
import { baseTheme } from './theme';

export const studentTheme = createTheme(baseTheme, {
  // Extends base — only overrides are needed
  palette: {
    primary: { main: '#A78BFA', contrastText: '#ffffff' }, // playful purple
  },
  typography: {
    fontSize: 16, // slightly larger base (default is 14)
  },
  shape: { borderRadius: 16 }, // rounder corners
});
```

```tsx
// app/game/layout.tsx (new or existing — add ThemeProvider here)
'use client';
import { ThemeProvider } from '@mui/material/styles';
import { studentTheme } from '@/lib/student-theme';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={studentTheme}>
      {children}
    </ThemeProvider>
  );
}
```

### Pattern 4: Shell Migration (AppBar + Permanent Drawer)

**What:** `TeacherShell` / `AdminShell` custom flex layout becomes MUI `AppBar` + `Box` (permanent sidebar pattern).

**Note:** The existing shells use a **sidebar** not a top AppBar — they have a left nav column + main content column. The MUI equivalent is a `Box` flex container with a fixed-width sidebar `Box`, not a `Drawer` component. Using `AppBar` for a sidebar is incorrect. [VERIFIED: by reading current TeacherShell.tsx + AdminShell.tsx code directly]

```tsx
// Pattern: sidebar shell (TeacherShell MUI version)
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

// Outer: flex row container
<Box sx={{ display: 'flex', height: '100vh', minWidth: 1280 }}>
  {/* Sidebar */}
  <Box sx={{ width: 240, flexShrink: 0, bgcolor: '#0C1220', display: 'flex', flexDirection: 'column' }}>
    {/* Logo + nav groups */}
    <List>
      <ListItem disablePadding>
        <ListItemButton
          selected={active}
          sx={{ borderRadius: 3, mx: 1, '&.Mui-selected': { bgcolor: ACCENT_BG, color: ACCENT_TEXT } }}
        >
          <ListItemIcon><item.icon /></ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      </ListItem>
    </List>
  </Box>
  {/* Main content */}
  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    {children}
  </Box>
</Box>
```

### Pattern 5: Shadcn → MUI Component Mapping

| shadcn Component | Usage Count | MUI Equivalent | Import |
|-----------------|-------------|----------------|--------|
| `Button` | 13 | `Button` | `@mui/material/Button` |
| `Input` | 8 | `TextField` (or `OutlinedInput`) | `@mui/material/TextField` |
| `Label` | 6 | `FormLabel` / `InputLabel` | `@mui/material/FormLabel` |
| `Dialog` + `DialogContent` etc. | 5 | `Dialog` + `DialogTitle` + `DialogContent` + `DialogActions` | `@mui/material/Dialog` |
| `DatePicker` (custom shadcn) | 4 | `DatePicker` from `@mui/x-date-pickers` | `@mui/x-date-pickers/DatePicker` |
| `Select` | 3 | `Select` + `MenuItem` | `@mui/material/Select` |
| `Badge` | 3 | `Chip` | `@mui/material/Chip` |
| `Table` + variants | 2 | `Table` + `TableHead` + `TableBody` + `TableRow` + `TableCell` | `@mui/material/Table` |
| `Card` | 1 | `Card` / `Paper` | `@mui/material/Card` |

### Pattern 6: Shake Animation in MUI (Critical for Reading Game)

**What:** `animate-shake` Tailwind class is used in 3 files (`game/reading/[id]/page.tsx`, `teacher/homework/[id]/try/page.tsx`). When Tailwind is removed, this animation breaks. Must be replicated.

```tsx
// Source: MUI sx prop keyframes pattern
import { keyframes } from '@mui/system';

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(4px); }
`;

// Usage in sx prop:
<Box sx={{ animation: `${shake} 0.4s ease-in-out` }} />
```

**Alternative:** Add the keyframe to `MuiCssBaseline.styleOverrides` global styles as a CSS class `.animate-shake { animation: ... }` to avoid defining it in every file. This is cleaner for the 3 affected files.

### Pattern 7: MUI DatePicker with date-fns v4

```tsx
// Source: mui.com/x/react-date-pickers/getting-started/
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// LocalizationProvider must wrap the DatePicker (can be at page level or game layout level)
<LocalizationProvider dateAdapter={AdapterDateFns}>
  <DatePicker
    value={dateValue}
    onChange={(newValue) => setDateValue(newValue)}
  />
</LocalizationProvider>
```

**Note:** `date-fns` v4 is already installed (`^4.2.1`) in `frontend/package.json`. The `@mui/x-date-pickers` peer dep accepts `^4.0.0`. [VERIFIED: npm registry peerDependencies]

### Anti-Patterns to Avoid

- **Mixing Tailwind + MUI:** After D-01, no `className` Tailwind strings should remain. MUI `sx` prop is the only styling mechanism. Leaving stray Tailwind classes causes broken styles (Tailwind purged, MUI not).
- **ThemeProvider without AppRouterCacheProvider:** MUI styles render in `<body>` causing FOUC and hydration errors in Next.js App Router. [CITED: mui.com/material-ui/integrations/nextjs/]
- **'use client' on layout.tsx:** Root `app/layout.tsx` must stay a Server Component. Only the ThemeProvider child (if needed) or individual client components add `'use client'`.
- **Nested ThemeProvider replacing instead of extending:** Use `createTheme(baseTheme, overrides)` not `createTheme(overrides)` for student theme — otherwise all base tokens are lost.
- **Using MUI `Drawer` for sidebar:** The existing shell pattern is a CSS flex sidebar, not an overlay Drawer. Use `Box` with `width` + `flexShrink: 0` to match current behavior.
- **Forgetting LocalizationProvider for DatePicker:** `@mui/x-date-pickers` DatePicker requires `LocalizationProvider` in its ancestor tree. If not wrapped, it throws at runtime.
- **Removing postcss before checking:** `postcss` is a devDep — check if any remaining tooling needs it before removing. If only Tailwind used it, it can go.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS-in-JS SSR style collection for Next.js | Custom emotion cache config | `AppRouterCacheProvider` from `@mui/material-nextjs` | Official MUI solution handles insertion point, nonce, and hydration |
| Date picker | Custom calendar/date-input | `DatePicker` from `@mui/x-date-pickers` | Handles keyboard nav, localization, date-fns adapter |
| Modal/overlay | Custom fixed-position div | MUI `Dialog` | Handles focus trapping, scroll lock, backdrop, a11y |
| Table sorting/display | Custom table HTML | MUI `Table*` family | Semantic HTML, `TableSortLabel`, responsive patterns built in |
| Icon system | Custom SVG wrappers | `@mui/icons-material` or lucide as MUI `SvgIcon` | Consistent sizing with `fontSize` prop, theme color inheritance |
| Theme-aware box layout | Inline style objects | MUI `Box` with `sx` prop | `sx` resolves theme tokens, supports responsive breakpoints |

**Key insight:** The biggest risk in this migration is subtle SSR style ordering bugs — they don't fail the build but cause flash-of-unstyled-content. `AppRouterCacheProvider` exists specifically to solve this for Next.js App Router; hand-rolling emotion cache setup is error-prone and outdated.

---

## Common Pitfalls

### Pitfall 1: Styles Rendering in `<body>` Instead of `<head>`
**What goes wrong:** Without `AppRouterCacheProvider`, Emotion SSR styles are appended to `<body>`. In App Router, this causes hydration mismatch warnings and flash of unstyled content.
**Why it happens:** Next.js App Router changed how React renders HTML; MUI's default emotion setup was designed for Pages Router. `AppRouterCacheProvider` adapts it.
**How to avoid:** Always install `@mui/material-nextjs` and wrap root layout content with `AppRouterCacheProvider`.
**Warning signs:** Console hydration mismatch errors; components briefly unstyled on page load.

### Pitfall 2: `createTheme` Called Inside a Component
**What goes wrong:** `createTheme()` called inside a render function creates a new theme object on every render, causing all MUI children to re-render.
**Why it happens:** Developers write the theme inline for convenience.
**How to avoid:** Always define the theme in a module-level variable (in `lib/theme.ts`), not inside a component.
**Warning signs:** Entire page re-rendering on any state change.

### Pitfall 3: `sx` Prop Tailwind Confusion
**What goes wrong:** Developer writes `sx={{ className: "text-sm" }}` — mixing MUI `sx` with Tailwind class names that no longer work.
**Why it happens:** Reflex muscle memory after removing Tailwind.
**How to avoid:** After removing Tailwind, all styling must use MUI `sx` object values (`sx={{ fontSize: 14, color: 'text.secondary' }}`), not class strings.
**Warning signs:** Build passes but visual styles not applying.

### Pitfall 4: Shake Animation Breaking on Migration
**What goes wrong:** `animate-shake` class is removed with Tailwind but not replaced. Reading game and try page items show no error feedback animation.
**Why it happens:** The shake animation is defined in `tailwind.config.js` keyframes — it's not a standard CSS animation, it's a project-specific Tailwind extension.
**How to avoid:** Wave 1 MUST add the `shake` keyframe to MUI `CssBaseline.styleOverrides` global CSS (or as a named `keyframes` constant for use in `sx`).
**Warning signs:** Incorrect answer selections produce no visual shake feedback.

### Pitfall 5: Student Game Backgrounds Not Preserved
**What goes wrong:** Game pages use gradient backgrounds via `gradients.gameBg = '#2D0B2E'` from `lib/colors.ts` via inline `style={{ background: gradients.gameBg }}`. These are NOT Tailwind classes — they're inline styles using the `gradients` color map. They will survive Tailwind removal.
**Why it matters:** Planner might over-migrate these to `sx` when they should stay as inline styles or `sx={{ bgcolor: '#2D0B2E' }}`.
**How to avoid:** `lib/colors.ts` stays unchanged. Pages that use `gradients` import still work post-migration; only `className` Tailwind strings need replacement.

### Pitfall 6: PhonemeChips Color Classes Breaking
**What goes wrong:** `PhonemeChips.tsx` uses Tailwind classes directly: `bg-green-100 text-green-800`, etc. These are not from `components/ui/` — they're in a game component. Removing Tailwind breaks them silently.
**Why it happens:** The component is not in `components/ui/` so it might be missed in the migration scan.
**How to avoid:** Wave 3 must explicitly migrate `PhonemeChips.tsx` from Tailwind classes to MUI `Chip` with `sx` color overrides.

### Pitfall 7: `postcss.config.js` Not Fully Cleaned
**What goes wrong:** Leaving Tailwind entries in `postcss.config.js` causes PostCSS to try loading `tailwindcss` plugin which no longer exists, breaking the build.
**How to avoid:** Wave 1 must delete (or empty out) both `tailwind.config.js` and `postcss.config.js`. If `postcss` itself is still needed, replace with an empty plugins object.

### Pitfall 8: `cn()` Utility Still Imported After Removal
**What goes wrong:** `frontend/app/layout.tsx` imports `cn` from `@/lib/utils`, which uses `clsx` + `tailwind-merge`. After removing those packages, this crashes at runtime.
**How to avoid:** Remove the `cn` utility usage from `layout.tsx` during Wave 1. `cn` becomes unnecessary when all className-based styling is replaced with MUI `sx`.

---

## Code Examples

### Shell Layout Reference (TeacherShell Pattern)

Current `TeacherShell.tsx` uses:
- Outer `div.flex.h-screen` → MUI `<Box sx={{ display: 'flex', height: '100vh', minWidth: 1280 }}>`
- `<aside>` sidebar with `w-60` → `<Box sx={{ width: 240, flexShrink: 0, bgcolor: '#0C1220' }}>`
- Nav items: plain `<Link>` with hover classes → `<ListItemButton selected={active} component={Link}>`
- User dropdown: custom div → MUI `<Popover>` or `<Menu>` component
- Password form inputs: shadcn `<Input>` → MUI `<TextField type="password">`
- Change password button: shadcn `<Button>` → MUI `<Button variant="contained">`

### PhonemeChips Migration Reference

Current: Tailwind class strings per variant state
```tsx
const VARIANT_CLASSES = {
  correct: 'bg-green-100 text-green-800',
  similar: 'bg-yellow-100 text-yellow-800',
  wrong:   'bg-red-100 text-red-800',
  missing: 'border-2 border-dashed border-gray-400 text-gray-400 bg-transparent',
};
```

MUI replacement using `Chip`:
```tsx
// Source: MUI Chip sx pattern
const VARIANT_SX = {
  correct: { bgcolor: '#dcfce7', color: '#166534' },
  similar: { bgcolor: '#fef9c3', color: '#854d0e' },
  wrong:   { bgcolor: '#fee2e2', color: '#991b1b' },
  missing: { border: '2px dashed #9ca3af', color: '#9ca3af', bgcolor: 'transparent' },
};

// Usage:
<Chip
  label={labelFor(op)}
  size="small"
  sx={{ fontFamily: 'monospace', fontWeight: 700, ...VARIANT_SX[variant] }}
  data-status={op.status}
/>
```

### DatePicker Replacement

Current shadcn `DatePicker` prop signature (from `components/ui/date-picker.tsx`):
```tsx
<DatePicker value={reg.dateOfBirth} onChange={(v) => setReg((r) => ({ ...r, dateOfBirth: v }))} />
// Returns ISO string (YYYY-MM-DD)
```

MUI replacement (note: MUI DatePicker returns a Date object, not a string):
```tsx
// Must convert Date → ISO string at the onChange boundary
<LocalizationProvider dateAdapter={AdapterDateFns}>
  <DatePicker
    value={reg.dateOfBirth ? new Date(reg.dateOfBirth) : null}
    onChange={(newValue: Date | null) => {
      const iso = newValue ? newValue.toISOString().split('T')[0] : '';
      setReg((r) => ({ ...r, dateOfBirth: iso }));
    }}
    slotProps={{ textField: { size: 'small', fullWidth: true } }}
  />
</LocalizationProvider>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router MUI setup | App Router requires `AppRouterCacheProvider` | MUI v6 (2024) | Breaking change for Next.js App Router users |
| `ThemeProvider` from `@mui/material` | `ThemeProvider` from `@mui/material/styles` (same API) | MUI v5+ | No change; import path the same |
| MUI v4 `makeStyles` / `withStyles` | Emotion `sx` prop and `styled()` | MUI v5 (2021) | `makeStyles` is not available in MUI v9 |
| Default MUI Roboto font | Any font via `typography.fontFamily` | MUI v5+ | This project uses Inter — set in `createTheme()` |

**Deprecated/outdated:**
- `makeStyles` and `withStyles` (MUI v4 API): Not available in MUI v9. Use `sx` prop or `styled()` instead.
- `ThemeProvider` from `@mui/material` (direct import): Works but `@mui/material/styles` is the canonical import.
- Manual emotion cache setup for App Router: Replaced by `AppRouterCacheProvider` from `@mui/material-nextjs`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install | ✓ | (darwin zsh env) | — |
| npm | package install | ✓ | available | — |
| @mui/material | Core MUI | ✗ (not installed) | registry: 9.0.1 | — install in Wave 1 |
| @emotion/react | MUI peer dep | ✗ (not installed) | registry: 11.14.0 | — install in Wave 1 |
| @mui/material-nextjs | App Router SSR | ✗ (not installed) | registry: 9.0.1 | — install in Wave 1 |
| date-fns | DatePicker adapter | ✓ | ^4.2.1 (installed) | — |
| @dnd-kit/* | Reading creation drag | ✓ | ^6.3.1 / ^10.0.0 | — |
| Next.js | App Router | ✓ | ^14.0.0 | — |
| React | All components | ✓ | ^18.0.0 | — |

**Missing dependencies with no fallback:** None — all packages install from npm registry.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected in frontend (`jest.config.*`, `vitest.config.*`, `*.test.tsx` — none found) |
| Config file | None — Wave 1 gap |
| Quick run command | `cd frontend && npm run build` (build as proxy for correctness) |
| Full suite command | `cd frontend && npm run build && npm run lint` (if lint configured) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FE-01 | MUI theme applied globally; no Tailwind classes remain | smoke (build) | `cd frontend && npm run build` | ✅ (build script exists) |
| FE-01 | `globals.css` Tailwind directives removed | manual grep | `grep -r "@tailwind" frontend/app/ && echo "FAIL" \|\| echo "PASS"` | ✅ (grep available) |
| FE-02 | No imports from `@/components/ui/*` remain | manual grep | `grep -r "@/components/ui" frontend/app/ frontend/components/ && echo "FAIL" \|\| echo "PASS"` | ✅ |
| FE-03 | Teacher pages load and function without regression | manual smoke | Visit `/teacher`, `/teacher/homework`, `/teacher/sessions` | ❌ Wave 0 gap — no automated test |
| FE-04 | Student pages load; game animations work | manual smoke | Visit `/game/homework`, `/game/session/*`, `/game/reading/*` | ❌ Wave 0 gap |
| FE-04 | `minWidth: 1024` preserved on game pages | manual visual | Resize browser | ❌ Manual only |
| FE-05 | Admin pages load and CRUD functions work | manual smoke | Visit `/admin`, `/admin/teachers`, `/admin/students` | ❌ Wave 0 gap |

**Note:** No frontend unit tests exist in this project. The build (`npm run build`) is the primary automated gate. Functional correctness is validated via manual smoke tests per the skills doc checklist.

### Sampling Rate
- **Per task commit:** `cd frontend && npm run build` (verify TypeScript + Next.js compilation succeeds)
- **Per wave merge:** Full build + manual smoke of wave's pages
- **Phase gate:** Full build + full smoke checklist before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No test framework configured — Wave 1 does NOT need to add one (not in project skill patterns); build serves as primary gate
- [ ] Manual smoke checklist in plans must cover: `/login`, `/teacher/*`, `/game/*`, `/admin/*`

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth logic is backend-only; this phase is UI-only |
| V3 Session Management | no | Session management unchanged; JWT/localStorage patterns not touched |
| V4 Access Control | no | `AuthGate` component migrates to MUI loading state only; auth logic preserved |
| V5 Input Validation | yes | MUI `TextField` + `required` prop for form fields; validation logic is unchanged |
| V6 Cryptography | no | No cryptography in frontend UI layer |

**Security note:** This migration changes zero auth/session/API contract code. The `AuthGate` component's routing logic is preserved; only its loading spinner div becomes an MUI `CircularProgress`. No ASVS concerns introduced.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `lucide-react` can be kept alongside `@mui/icons-material`; icon-by-icon replacement is not required | Standard Stack | Low — both icon systems work together; no functional risk. If removed, all 22 files using lucide-react need icon replacements. |
| A2 | `postcss` devDep has no other consumers and can be removed with Tailwind | Standard Stack | Medium — if another tool uses PostCSS, build fails after removal. Check `postcss.config.js` before removing. |
| A3 | `app/game/layout.tsx` does not yet exist (game pages are direct routes); Wave 1 or Wave 3 creates it | Architecture | Low — easy to verify with `ls frontend/app/game/`; if it exists already, just add ThemeProvider to it |
| A4 | MUI `ListItemButton` with `component={Link}` from `next/link` works without special config in Next.js 14 | Architecture | Low — this is a standard Next.js + MUI pattern; if it fails, use `href` prop on `ListItemButton` directly |

---

## Open Questions

1. **`app/game/layout.tsx` existence**
   - What we know: The directory `app/game/` has `page.tsx` and subdirectories but no `layout.tsx` was found in the file tree scan
   - What's unclear: Whether a game layout file already exists or needs to be created
   - Recommendation: Wave 1/3 task should check and create `app/game/layout.tsx` as the student `ThemeProvider` insertion point

2. **PostCSS removal**
   - What we know: `postcss` and `autoprefixer` are in devDependencies; they're in scope for removal per D-01
   - What's unclear: Whether `next.config.js` or any other build step depends on postcss
   - Recommendation: Check `postcss.config.js` contents before removing; if it only has `tailwindcss` + `autoprefixer` plugins, both file and packages can be removed

3. **`@fontsource/roboto` needed?**
   - What we know: MUI documentation recommends Roboto font; this project uses Inter (loaded via `next/font/google`)
   - What's unclear: Whether any MUI component defaults hardcode Roboto and look wrong without it
   - Recommendation: Do NOT install `@fontsource/roboto`; instead set `typography.fontFamily` in `createTheme()` to `'var(--font-inter), system-ui, sans-serif'`. MUI will use Inter correctly.

---

## Sources

### Primary (HIGH confidence)
- `mui.com/material-ui/integrations/nextjs/` — AppRouterCacheProvider setup, ThemeProvider placement, Next.js 14 App Router integration [VERIFIED: WebFetch]
- `mui.com/material-ui/customization/theming/` — createTheme API, nested ThemeProvider behavior [VERIFIED: WebFetch]
- `mui.com/material-ui/getting-started/installation/` — package install command [VERIFIED: WebFetch]
- `mui.com/x/react-date-pickers/getting-started/` — DatePicker + AdapterDateFns setup [VERIFIED: WebFetch]
- npm registry (`npm view`) — package versions, creation dates, peerDependencies for all 7 MUI packages [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Direct codebase reading of `tailwind.config.js`, `globals.css`, `TeacherShell.tsx`, `AdminShell.tsx`, `PhonemeChips.tsx`, `PhonemeButton.tsx`, `AuthGate.tsx` — design token extraction, component API signatures, animation patterns [VERIFIED: codebase]
- `frontend/package.json` — current dep list, versions, scripts [VERIFIED: codebase]
- All 28 app pages — LOC counts, import sites, shadcn usage frequency [VERIFIED: codebase grep]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — npm registry verified versions, peer deps, official docs
- Architecture: HIGH — Next.js 14 App Router + MUI integration verified against official docs
- Pitfalls: HIGH — grounded in codebase reading (animations, PostCSS, cn utility) + official docs (AppRouterCacheProvider)
- Component mapping: HIGH — direct codebase grep of all 17 import sites

**Research date:** 2026-05-31
**Valid until:** 2026-08-31 (MUI stable; React 18 + Next.js 14 not moving rapidly)
