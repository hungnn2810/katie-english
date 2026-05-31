# Phase 11: Frontend React MUI Refactor - Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 22 new/modified files
**Analogs found:** 19 / 22

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/lib/theme.ts` | config | transform | `frontend/tailwind.config.js` (token source) + `frontend/app/globals.css` | partial (token mapping) |
| `frontend/lib/student-theme.ts` | config | transform | `frontend/lib/theme.ts` (extends it) | exact (same pattern) |
| `frontend/app/layout.tsx` | provider/layout | request-response | `frontend/app/layout.tsx` (current — modify in place) | exact (modify) |
| `frontend/app/game/layout.tsx` | provider/layout | request-response | `frontend/app/teacher/layout.tsx` + `frontend/app/admin/layout.tsx` | role-match |
| `frontend/components/TeacherShell.tsx` | component | request-response | itself (current — migrate in place) | exact (modify) |
| `frontend/components/AdminShell.tsx` | component | request-response | `frontend/components/TeacherShell.tsx` (parallel) | exact (same pattern) |
| `frontend/components/AuthGate.tsx` | component | request-response | itself (current — migrate loading spinner only) | exact (modify) |
| `frontend/components/PhonemeButton.tsx` | component | event-driven | itself (current — migrate in place) | exact (modify) |
| `frontend/components/PhonemeChips.tsx` (moved from `app/game/session/[id]/_components/`) | component | transform | itself (current) | exact (modify) |
| `frontend/components/ResultBanner.tsx` | component | transform | itself (current — migrate in place) | exact (modify) |
| `frontend/components/SelectedPhonemes.tsx` | component | event-driven | itself (current — migrate in place) | exact (modify) |
| `frontend/app/login/page.tsx` | page | request-response | itself (current — migrate in place) | exact (modify) |
| `frontend/app/teacher/layout.tsx` | layout | request-response | itself (current — migrate loading spinner) | exact (modify) |
| `frontend/app/admin/layout.tsx` | layout | request-response | itself (current — migrate loading spinner) | exact (modify) |
| `frontend/app/teacher/**` pages (5 pages) | page | CRUD | `frontend/app/admin/teachers/page.tsx` | role-match |
| `frontend/app/admin/**` pages (5 pages) | page | CRUD | `frontend/app/admin/teachers/page.tsx` | exact |
| `frontend/app/game/homework/page.tsx` | page | CRUD | `frontend/app/game/session/[id]/page.tsx` | role-match |
| `frontend/app/game/session/[id]/page.tsx` | page | event-driven | itself (current — migrate in place) | exact (modify) |
| `frontend/app/game/reading/[id]/page.tsx` | page | event-driven | itself (current — migrate in place) | exact (modify) |
| `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx` | component | CRUD | itself (current — dnd-kit stays, visual wrapper only) | exact (modify) |
| `frontend/components/ui/` (DELETE — 11 files) | utility | n/a | n/a — deleted entirely | n/a |
| `frontend/lib/utils.ts` (DELETE `cn()`) | utility | transform | n/a — `cn()` function removed; no replacement needed | n/a |

---

## Pattern Assignments

### `frontend/lib/theme.ts` (config, transform) — NEW FILE

**Analog:** `frontend/tailwind.config.js` (token source) + `frontend/app/globals.css` (CSS variable values)

**Token source — `frontend/tailwind.config.js` lines 7–19 (brand color values):**
```js
primary: '#4F9DFF',
secondary: '#6ED6C1',
accent: '#FFD166',
highlight: '#FF7B7B',
'brand-purple': '#A78BFA',
'brand-pink': '#FF9BD2',
'brand-orange': '#FFB26B',
'brand-green': '#7BD88F',
background: '#F7F9FC',
card: '#FFFFFF',
border: '#E2E8F0',
textPrimary: '#0F172A',
textSecondary: '#64748B',
```

**Animation keyframes to preserve — `frontend/tailwind.config.js` lines 55–65:**
```js
shake: {
  '0%, 100%': { transform: 'translateX(0)' },
  '20%':      { transform: 'translateX(-8px)' },
  '40%':      { transform: 'translateX(8px)' },
  '60%':      { transform: 'translateX(-6px)' },
  '80%':      { transform: 'translateX(4px)' },
},
fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
slideUp: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
```

**Scrollbar styles to preserve — `frontend/app/globals.css` lines 22–31:**
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
```

**MUI theme file pattern (copy directly — from RESEARCH.md Pattern 2):**
```typescript
// frontend/lib/theme.ts
'use client';
import { createTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';

export const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(4px); }
`;

export const fadeIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

export const slideUp = keyframes`
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
`;

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
        body: {
          backgroundColor: '#F7F9FC',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': { background: '#CBD5E1', borderRadius: 3 },
        '::-webkit-scrollbar-thumb:hover': { background: '#94A3B8' },
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

---

### `frontend/lib/student-theme.ts` (config, transform) — NEW FILE

**Analog:** `frontend/lib/theme.ts` (extends it; same `createTheme` pattern)

**Core pattern (from RESEARCH.md Pattern 3):**
```typescript
// frontend/lib/student-theme.ts
'use client';
import { createTheme } from '@mui/material/styles';
import { baseTheme } from './theme';

export const studentTheme = createTheme(baseTheme, {
  // Extends base — only overrides are specified
  palette: {
    primary: { main: '#A78BFA', contrastText: '#ffffff' }, // playful purple
  },
  typography: {
    fontSize: 16, // slightly larger base (default is 14)
  },
  shape: { borderRadius: 16 }, // rounder corners for kids
});
```

**Critical:** Use `createTheme(baseTheme, overrides)` not `createTheme(overrides)` — the first form extends, the second replaces all tokens.

---

### `frontend/app/layout.tsx` (layout, request-response) — MODIFY

**Current file:** `frontend/app/layout.tsx` lines 1–23

**Current imports pattern (lines 1–4):**
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
```

**Current body (lines 17–23):**
```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="bg-background min-h-screen font-sans">{children}</body>
    </html>
  );
}
```

**Target pattern (from RESEARCH.md Pattern 1):**
```typescript
// Remove: cn import, './globals.css' import (no more Tailwind directives)
// Add: AppRouterCacheProvider, ThemeProvider, CssBaseline, baseTheme
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { baseTheme } from '@/lib/theme';

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

**Key changes:**
- Remove `cn()` usage (no more Tailwind classes on html/body)
- Remove `import './globals.css'` (file will be deleted or emptied)
- Root `layout.tsx` stays a Server Component — NO `'use client'` added here
- `AppRouterCacheProvider` must be the outermost wrapper (critical for SSR style injection)

---

### `frontend/app/game/layout.tsx` (layout, request-response) — NEW FILE

**Analog:** `frontend/app/teacher/layout.tsx` lines 1–41 (loading state pattern) + RESEARCH.md Pattern 3

**Loading state analog from `frontend/app/teacher/layout.tsx` lines 27–31:**
```typescript
if (user === undefined) return (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ minWidth: 1280 }}>
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);
```

**Target pattern for game layout (nested ThemeProvider):**
```typescript
// frontend/app/game/layout.tsx — NEW
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

**Note:** The game pages already handle their own auth via `AuthGate`. This layout only adds the student `ThemeProvider` override. No auth logic here. The `minWidth: 1024` constraint lives on individual game pages via inline style, not here.

---

### `frontend/components/TeacherShell.tsx` (component, request-response) — MODIFY

**Current file:** `frontend/components/TeacherShell.tsx` lines 1–241

**Current imports (lines 1–8):**
```typescript
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, changePassword, AuthUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutDashboard, School, Users, BookOpen, Video, KeyRound, LogOut, X } from 'lucide-react';
```

**Current outer container (line 64):**
```typescript
<div className="flex h-screen bg-background" style={{ minWidth: 1280 }}>
```

**Current sidebar (lines 66–68):**
```typescript
<aside
  className="w-60 flex-shrink-0 flex flex-col"
  style={{ background: '#0C1220', boxShadow: '1px 0 0 rgba(255,255,255,0.05)' }}
>
```

**Current nav link (lines 99–115):**
```typescript
<Link
  key={item.href}
  href={item.href}
  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
    active ? '' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
  }`}
  style={active ? { background: ACCENT_BG, color: ACCENT_TEXT } : {}}
>
```

**Current form inputs (lines 189–204):**
```typescript
<Input type="password" placeholder="Current password" value={currentPw} ... className="h-8 text-xs rounded-xl border-border" />
<Button type="submit" disabled={pwLoading} size="sm" className="w-full ..." style={{ background: ACCENT }}>
```

**MUI replacement pattern (from RESEARCH.md Pattern 4):**
```typescript
// New imports — replace Button/Input from '@/components/ui'
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

// Outer container: className="flex h-screen" → MUI Box sx
<Box sx={{ display: 'flex', height: '100vh', minWidth: 1280 }}>

// Sidebar: <aside className="w-60 flex-shrink-0 flex flex-col"> →
<Box sx={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
  bgcolor: '#0C1220', boxShadow: '1px 0 0 rgba(255,255,255,0.05)' }}>

// Nav group label: <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600"> →
<Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.1em', color: '#475569', px: 1.5, mb: 0.5, display: 'block' }}>

// Nav link: <Link className="relative flex items-center ..."> →
<ListItemButton
  component={Link}
  href={item.href}
  selected={active}
  sx={{ borderRadius: 3, mx: 1, py: 1.25,
    '&.Mui-selected': { bgcolor: ACCENT_BG, color: ACCENT_TEXT },
    '&:not(.Mui-selected)': { color: '#94A3B8' },
    '&:not(.Mui-selected):hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#E2E8F0' },
  }}
>
  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}><item.icon size={15} /></ListItemIcon>
  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 500 }} />
</ListItemButton>

// Password inputs: <Input type="password"> →
<TextField type="password" size="small" fullWidth
  placeholder="Current password"
  value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
  required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: 12 } }} />

// Submit button: <Button style={{ background: ACCENT }}> →
<Button type="submit" variant="contained" fullWidth disabled={pwLoading}
  sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, borderRadius: 3, fontSize: 12 }}>
  {pwLoading ? 'Updating...' : 'Update password'}
</Button>

// User menu dropdown: custom div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow..." →
// Use MUI Menu component:
<Menu anchorEl={anchorEl} open={showUserMenu} onClose={() => setShowUserMenu(false)}
  PaperProps={{ sx: { width: 288, borderRadius: 3, p: 1 } }}>
  <MenuItem onClick={logout} sx={{ color: 'error.main', borderRadius: 2 }}>
    <LogOut size={14} style={{ marginRight: 8 }} />Sign out
  </MenuItem>
</Menu>
```

---

### `frontend/components/AdminShell.tsx` (component, request-response) — MODIFY

**Analog:** `frontend/components/TeacherShell.tsx` — identical sidebar pattern, different ACCENT color and nav items.

**Current imports (lines 1–6):**
```typescript
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminAuth, AdminUser } from '@/lib/admin-auth';
import { LayoutDashboard, Users, School, GraduationCap, FileText, LogOut, X } from 'lucide-react';
```

**Current outer container (line 40) — identical to TeacherShell:**
```typescript
<div className="flex h-screen bg-background" style={{ minWidth: 1280 }}>
```

**Migration is identical to TeacherShell** — use same MUI `Box`/`List`/`ListItemButton` pattern. Key difference: AdminShell has no password-change form (simpler user menu), and `ACCENT = '#4F9DFF'` instead of `'#F0623A'`.

**AdminShell user menu (lines 131–165) — simpler than Teacher, just sign out button:**
```typescript
// Current: custom absolute-positioned div
<div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-card-hover border border-border z-50 p-4 animate-slide-up">

// MUI replacement: same Menu pattern as TeacherShell (no password form)
<Menu anchorEl={anchorEl} open={showUserMenu} onClose={() => setShowUserMenu(false)}
  PaperProps={{ sx: { width: 288, borderRadius: 3, p: 1 } }}>
  {/* user info row */}
  <MenuItem onClick={logout} sx={{ color: 'error.main', borderRadius: 2 }}>
    <LogOut size={14} style={{ marginRight: 8 }} />Sign out
  </MenuItem>
</Menu>
```

---

### `frontend/components/AuthGate.tsx` (component, request-response) — MODIFY

**Current file:** `frontend/components/AuthGate.tsx` lines 1–28

**Current loading state (line 25):**
```typescript
if (user === undefined) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;
```

**MUI replacement — only this line changes:**
```typescript
// Add imports:
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

// Replace loading div:
if (user === undefined) return (
  <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress size={32} />
  </Box>
);
```

**Auth logic (lines 15–23) is UNCHANGED** — no modification to `getUser()`, `router.replace()`, or role-check logic.

---

### `frontend/components/PhonemeChips.tsx` — MODIFY (path stays or moves to `components/`)

**Current file:** `frontend/app/game/session/[id]/_components/PhonemeChips.tsx` lines 1–63

**Current Tailwind class map (lines 19–24):**
```typescript
const VARIANT_CLASSES: Record<Variant, string> = {
  correct: 'bg-green-100 text-green-800',
  similar: 'bg-yellow-100 text-yellow-800',
  wrong:   'bg-red-100 text-red-800',
  missing: 'border-2 border-dashed border-gray-400 text-gray-400 bg-transparent',
};
```

**Current chip element (lines 51–57):**
```typescript
<span
  key={key}
  className={`font-mono font-bold text-sm px-2 py-1 rounded ${VARIANT_CLASSES[variant]}`}
  data-status={op.status}
>
  {labelFor(op)}
</span>
```

**MUI replacement (from RESEARCH.md Pattern, PhonemeChips section):**
```typescript
// Add imports:
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

// Replace VARIANT_CLASSES with VARIANT_SX:
const VARIANT_SX: Record<Variant, object> = {
  correct: { bgcolor: '#dcfce7', color: '#166534' },
  similar: { bgcolor: '#fef9c3', color: '#854d0e' },
  wrong:   { bgcolor: '#fee2e2', color: '#991b1b' },
  missing: { border: '2px dashed #9ca3af', color: '#9ca3af', bgcolor: 'transparent' },
};

// Replace <span> chip with MUI Chip:
<Chip
  key={key}
  label={labelFor(op)}
  size="small"
  sx={{ fontFamily: 'monospace', fontWeight: 700, ...VARIANT_SX[variant] }}
  data-status={op.status}
/>

// Replace wrapper <div className="flex flex-wrap gap-1 mt-2">:
<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }} data-testid="phoneme-chips">
```

---

### `frontend/components/PhonemeButton.tsx` (component, event-driven) — MODIFY

**Current file:** `frontend/components/PhonemeButton.tsx` lines 1–37

**Current button (lines 20–27):**
```typescript
<button
  onClick={onClick}
  className={`
    relative w-20 h-20 rounded-2xl text-2xl font-bold border-2 transition-all select-none
    ${selected
      ? 'bg-primary text-white border-[#3B8AEA] scale-95 shadow-inner'
      : 'bg-white text-primary border-primary/40 hover:border-primary hover:bg-primary/10 shadow-md'}
  `}
>
```

**MUI replacement:**
```typescript
// Add imports:
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

// Replace outer <button>:
<Button
  onClick={onClick}
  sx={{
    position: 'relative', width: 80, height: 80, minWidth: 80,
    borderRadius: 4, fontSize: '1.5rem', fontWeight: 700, border: '2px solid',
    transition: 'all 0.15s',
    ...(selected
      ? { bgcolor: 'primary.main', color: 'white', borderColor: '#3B8AEA', transform: 'scale(0.95)' }
      : { bgcolor: 'white', color: 'primary.main', borderColor: 'primary.light',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' }, boxShadow: 3 }),
  }}
>
  {symbol}
  {/* audio play sub-button — keep as native button or MUI IconButton */}
  <Box
    component="button"
    onClick={playAudio}
    sx={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24,
      bgcolor: 'warning.main', borderRadius: '50%', fontSize: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: 'none', cursor: 'pointer', '&:hover': { bgcolor: '#F5C040' }, boxShadow: 1 }}
    title="Play sound"
  >
    ▶
  </Box>
</Button>
```

---

### `frontend/components/ResultBanner.tsx` (component, transform) — MODIFY

**Current file:** `frontend/components/ResultBanner.tsx` lines 1–23

**Current div (lines 8–10):**
```typescript
<div
  className={`p-4 rounded-2xl text-center font-semibold text-lg ${
    isCorrect ? 'bg-green-100 text-green-700 border-2 border-green-400' : 'bg-red-100 text-red-700 border-2 border-red-400'
  }`}
>
```

**MUI replacement:**
```typescript
// Add imports:
import Alert from '@mui/material/Alert';

// Replace div:
<Alert
  severity={isCorrect ? 'success' : 'error'}
  sx={{ borderRadius: 4, textAlign: 'center', fontSize: '1.125rem', fontWeight: 600,
    '& .MuiAlert-message': { width: '100%' } }}
>
  {isCorrect ? (
    'Correct! Well done!'
  ) : (
    <>Not quite. Correct answer: <strong>{correctAnswer.join(' - ')}</strong></>
  )}
</Alert>
```

---

### `frontend/components/SelectedPhonemes.tsx` (component, event-driven) — MODIFY

**Current file:** `frontend/components/SelectedPhonemes.tsx` lines 1–27

**Current wrapper (line 10):**
```typescript
<div className="flex gap-3 min-h-[5rem] items-center justify-center flex-wrap p-4 bg-background rounded-2xl border-2 border-dashed border-border">
```

**Current phoneme button (lines 15–22):**
```typescript
<button
  key={i}
  onClick={() => onRemove(i)}
  className="w-16 h-16 bg-primary/20 text-primary rounded-xl text-xl font-bold border-2 border-primary/60 hover:bg-highlight/20 hover:border-highlight hover:text-highlight transition-colors"
  title="Remove"
>
```

**MUI replacement:**
```typescript
// Add imports:
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// Replace wrapper:
<Box sx={{ display: 'flex', gap: 1.5, minHeight: '5rem', alignItems: 'center',
  justifyContent: 'center', flexWrap: 'wrap', p: 2,
  bgcolor: 'background.default', borderRadius: 4, border: '2px dashed', borderColor: 'divider' }}>

// Replace empty state:
<Typography variant="body2" color="text.secondary">Click phonemes to build a word</Typography>

// Replace phoneme remove button:
<Button
  onClick={() => onRemove(i)}
  sx={{ width: 64, height: 64, minWidth: 64, bgcolor: 'primary.main', color: 'white',
    opacity: 0.2, borderRadius: 3, fontSize: '1.25rem', fontWeight: 700,
    border: '2px solid', borderColor: 'primary.main', borderOpacity: 0.6,
    '&:hover': { bgcolor: 'error.main', borderColor: 'error.main', opacity: 1 },
    transition: 'colors 0.15s' }}
  title="Remove"
>
  {symbol}
</Button>
```

---

### `frontend/app/login/page.tsx` (page, request-response) — MODIFY

**Current file:** `frontend/app/login/page.tsx` (uses `DatePicker` from shadcn, inline style layouts, no shadcn Button/Input — uses raw `<input>` and `<button>` HTML)

**Current outer container (line 73):**
```typescript
<div className="min-h-screen flex font-sans" style={{ minWidth: 1024 }}>
```

**Key migration points:**
- `DatePicker` from `@/components/ui/date-picker` → MUI `DatePicker` from `@mui/x-date-pickers` (RESEARCH.md Pattern 7)
- Raw `<input>` elements → MUI `TextField`
- Raw `<button>` elements → MUI `Button`
- `minWidth: 1024` inline style MUST be preserved (from Phase 04, constraint D-01 in `04-CONTEXT.md`)

**DatePicker replacement (from RESEARCH.md Pattern 7):**
```typescript
// Current prop signature:
<DatePicker value={reg.dateOfBirth} onChange={(v) => setReg((r) => ({ ...r, dateOfBirth: v }))} />

// MUI replacement (note: MUI returns Date object, not string):
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

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

### `frontend/app/teacher/layout.tsx` (layout, request-response) — MODIFY

**Current loading spinner (lines 27–31):**
```typescript
if (user === undefined) return (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ minWidth: 1280 }}>
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);
```

**MUI replacement:**
```typescript
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

if (user === undefined) return (
  <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center',
    justifyContent: 'center', minWidth: 1280 }}>
    <CircularProgress size={32} />
  </Box>
);
```

**All other logic (lines 1–41) is UNCHANGED** — auth check, router, `TeacherUserContext.Provider`, `TeacherShell`.

---

### `frontend/app/admin/layout.tsx` (layout, request-response) — MODIFY

**Analog:** `frontend/app/teacher/layout.tsx` — identical loading pattern (lines 31–36 in admin/layout.tsx).

**Same `CircularProgress` replacement** as teacher layout. Auth logic UNCHANGED.

---

### Teacher pages: `frontend/app/teacher/**` (5 pages) — MODIFY

**Analog:** `frontend/app/admin/teachers/page.tsx` (most complete CRUD page with Dialog, Table, Button, Input, Label, Badge patterns)

**Shared import pattern across all teacher pages (from `frontend/app/teacher/homework/page.tsx` lines 12–20):**
```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
```

**MUI replacement imports (shadcn → MUI mapping):**
```typescript
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
```

**Dialog pattern (from `frontend/app/admin/teachers/page.tsx` lines 68–85):**
```typescript
// Current shadcn Dialog pattern:
<Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
  <DialogContent className="max-w-md rounded-3xl p-0" showCloseButton={false}>
    <DialogHeader className="flex flex-row items-center justify-between px-8 pt-7 pb-5 border-b border-border gap-0">
      <DialogTitle className="text-xl font-black text-textPrimary">...</DialogTitle>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>...</Button>
    </DialogHeader>
    <form ...>
      <Label htmlFor="teacher-name">Name</Label>
      <Input id="teacher-name" value={name} onChange={...} required className="border-border" />
    </form>
  </DialogContent>
</Dialog>

// MUI replacement:
<Dialog open onClose={onClose} maxWidth="sm" fullWidth
  PaperProps={{ sx: { borderRadius: 4 } }}>
  <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant="h6" fontWeight={900}>...</Typography>
    <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
      <CloseIcon />
    </IconButton>
  </DialogTitle>
  <DialogContent sx={{ px: 4, py: 3 }}>
    <form ...>
      <FormLabel htmlFor="teacher-name" sx={{ fontSize: 13, fontWeight: 600, mb: 0.5, display: 'block' }}>Name</FormLabel>
      <TextField id="teacher-name" value={name} onChange={...} required fullWidth size="small"
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
    </form>
  </DialogContent>
  <DialogActions sx={{ px: 4, pb: 3, gap: 1.5 }}>
    <Button variant="outlined" onClick={onClose} sx={{ flex: 1, borderRadius: 3 }}>Cancel</Button>
    <Button type="submit" variant="contained" disabled={loading} sx={{ flex: 1, borderRadius: 3 }}>Save</Button>
  </DialogActions>
</Dialog>
```

**Table pattern (from `frontend/app/admin/teachers/page.tsx` — uses shadcn Table):**
```typescript
// Current shadcn:
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
<Table><TableHeader><TableRow><TableHead>Name</TableHead>...

// MUI replacement:
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
<TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
  <Table><TableHead><TableRow><TableCell>Name</TableCell>...
```

**Badge → Chip:**
```typescript
// Current: <Badge className="...">Active</Badge>
// MUI: <Chip label="Active" size="small" color="success" />
// Or with sx: <Chip label="Active" size="small" sx={{ bgcolor: '#dcfce7', color: '#166534' }} />
```

---

### Admin pages: `frontend/app/admin/**` (5 pages) — MODIFY

**Analog:** `frontend/app/admin/teachers/page.tsx` — this IS the reference admin page. All 5 admin pages follow the same Dialog + Table + Button + Input + Label pattern.

Same import replacement pattern as teacher pages above. Same Dialog, Table, Chip (Badge), Button, TextField patterns apply.

**Select replacement (used in student forms in `frontend/app/teacher/students/page.tsx` lines 15):**
```typescript
// Current shadcn:
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// MUI replacement:
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

<FormControl fullWidth size="small">
  <InputLabel>Class</InputLabel>
  <Select value={classId} onChange={(e) => setClassId(Number(e.target.value))} label="Class"
    sx={{ borderRadius: 3 }}>
    <MenuItem value="">None</MenuItem>
    {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
  </Select>
</FormControl>
```

---

### Game pages: `frontend/app/game/**` (3 pages) — MODIFY

**Analog:** `frontend/app/game/reading/[id]/page.tsx` and `frontend/app/game/session/[id]/page.tsx` — both use `gradients.gameBg` via inline style (NOT Tailwind), `minWidth: 1024` constraint.

**Critical game page constraint — `frontend/app/game/reading/[id]/page.tsx` lines 54–58:**
```typescript
// These inline styles survive Tailwind removal — DO NOT change them:
<div className="min-h-screen flex flex-col items-center justify-center gap-4"
  style={{ background: gradients.gameBg, minWidth: 1024 }}>
```

**Migration pattern for game pages:**
```typescript
// Tailwind className strings → MUI Box sx, but inline style={{ background: gradients.gameBg }} stays
// OR migrated to sx={{ background: gradients.gameBg }} — both work

// Current loading spinner (reading page line 55):
<div className="w-12 h-12 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />

// MUI replacement:
import CircularProgress from '@mui/material/CircularProgress';
<CircularProgress size={48} sx={{ color: 'rgba(255,255,255,0.7)' }} />

// Current container classes → MUI Box sx:
// "min-h-screen flex flex-col items-center justify-center gap-4"
<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 2,
  background: gradients.gameBg, minWidth: 1024 }}>
```

**Shake animation (used in reading/try pages):**
```typescript
// Import from theme file (NOT redefined in component):
import { shake } from '@/lib/theme';

// Apply in sx:
<Box sx={{ animation: shaking ? `${shake} 0.4s ease-in-out` : 'none' }}>
```

---

### `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx` (component, CRUD) — MODIFY (visual wrapper only)

**Current file:** `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx` (729 LOC)

**Current dnd-kit imports (lines 18–34) — UNCHANGED:**
```typescript
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

**D-08 constraint:** dnd-kit sensor logic, `useSortable`, `DndContext`, `arrayMove` — all UNCHANGED. Only the visual wrapper around draggable items changes.

**Target: Draggable item visual wrapper:**
```typescript
// Current: custom div/card-like container with Tailwind classes → MUI Paper:
import Paper from '@mui/material/Paper';

// Replace the outer draggable item div:
<Paper
  ref={setNodeRef}
  style={{ transform: CSS.Transform.toString(transform), transition }}
  elevation={isDragging ? 4 : 1}
  sx={{ borderRadius: 3, p: 2, mb: 1.5, bgcolor: 'background.paper',
    border: '1px solid', borderColor: isDragging ? 'primary.main' : 'divider',
    cursor: isDragging ? 'grabbing' : 'grab' }}
>
  {/* drag handle + activity content */}
</Paper>
```

---

## Shared Patterns

### Tailwind → MUI `sx` Translation Reference

**Source:** `frontend/tailwind.config.js` + `frontend/app/globals.css`
**Apply to:** All modified files

| Tailwind Class | MUI `sx` Equivalent |
|---|---|
| `flex` | `display: 'flex'` |
| `flex-col` | `flexDirection: 'column'` |
| `items-center` | `alignItems: 'center'` |
| `justify-center` | `justifyContent: 'center'` |
| `justify-between` | `justifyContent: 'space-between'` |
| `gap-2` | `gap: 1` (MUI spacing × 8px) |
| `gap-3` | `gap: 1.5` |
| `gap-4` | `gap: 2` |
| `p-4` | `p: 2` |
| `px-8` | `px: 4` |
| `py-6` | `py: 3` |
| `h-screen` | `height: '100vh'` |
| `min-h-screen` | `minHeight: '100vh'` |
| `w-full` | `width: '100%'` |
| `flex-1` | `flex: 1` |
| `overflow-hidden` | `overflow: 'hidden'` |
| `overflow-y-auto` | `overflowY: 'auto'` |
| `rounded-xl` | `borderRadius: 3` (24px at theme borderRadius 8 — adjust to match 12px base) |
| `rounded-2xl` | `borderRadius: 4` |
| `rounded-full` | `borderRadius: '50%'` |
| `text-sm` | `fontSize: 14` or `variant="body2"` |
| `text-xs` | `fontSize: 12` or `variant="caption"` |
| `font-bold` | `fontWeight: 700` |
| `font-semibold` | `fontWeight: 600` |
| `text-white` | `color: 'white'` or `color: 'common.white'` |
| `bg-white` | `bgcolor: 'background.paper'` or `bgcolor: 'white'` |
| `bg-background` | `bgcolor: 'background.default'` |
| `border border-border` | `border: '1px solid'`, `borderColor: 'divider'` |
| `shadow-md` | `boxShadow: 3` |
| `animate-spin` | `animation: 'spin 1s linear infinite'` or use `CircularProgress` |
| `animate-shake` | `animation: `${shake} 0.4s ease-in-out`` |
| `text-textPrimary` | `color: 'text.primary'` |
| `text-textSecondary` | `color: 'text.secondary'` |
| `text-red-500` | `color: 'error.main'` |
| `text-green-500` | `color: 'success.main'` |
| `bg-gray-50` | `bgcolor: 'grey.50'` |
| `space-y-2` | `display: 'flex'`, `flexDirection: 'column'`, `gap: 1` |

### Loading Spinner Pattern

**Source:** `frontend/app/teacher/layout.tsx` lines 27–31 (current Tailwind version)
**Apply to:** All layout files and AuthGate loading states
```typescript
// Replace custom spinner div with:
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

<Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex',
  alignItems: 'center', justifyContent: 'center', minWidth: 1280 }}>
  <CircularProgress size={32} />
</Box>
```

### Form Field Pattern

**Source:** `frontend/app/admin/teachers/page.tsx` lines 88–140 (Label + Input pairs)
**Apply to:** All form modals in teacher and admin pages
```typescript
// Replace <Label> + <Input> pair:
import FormLabel from '@mui/material/FormLabel';
import TextField from '@mui/material/TextField';

<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
  <FormLabel htmlFor={id} sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
    {label}
  </FormLabel>
  <TextField id={id} size="small" fullWidth required={required}
    value={value} onChange={onChange}
    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
</Box>
```

### Error Banner Pattern

**Source:** `frontend/app/teacher/students/page.tsx` lines 47–53 (ErrorBanner component)
**Apply to:** All form modals that show errors
```typescript
// Current:
<div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4">

// MUI replacement:
import Alert from '@mui/material/Alert';
<Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>{msg}</Alert>
```

### Inline Style Preservation Rule

**Source:** `frontend/app/game/reading/[id]/page.tsx` lines 54–58, `frontend/lib/colors.ts`
**Apply to:** ALL game pages
```typescript
// These inline styles are NOT Tailwind — they reference lib/colors.ts values.
// They survive Tailwind removal UNCHANGED:
style={{ background: gradients.gameBg, minWidth: 1024 }}
style={{ background: gradients.gameBgAlt }}
// DO NOT convert to sx if the value comes from lib/colors.ts gradients map.
// Optionally migrate to: sx={{ background: gradients.gameBg, minWidth: 1024 }}
// Either form is correct; inline style is simpler and already works.
```

---

## Files with No Analog

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/lib/theme.ts` | config | transform | No MUI theme exists yet — greenfield. Token values come from `tailwind.config.js` + `globals.css`. Use RESEARCH.md Pattern 2 directly. |
| `frontend/lib/student-theme.ts` | config | transform | No nested ThemeProvider override exists yet. Use RESEARCH.md Pattern 3 directly. |
| `frontend/app/game/layout.tsx` | layout | request-response | No game-area layout file exists (`ls frontend/app/game/` confirmed no `layout.tsx`). Create new using teacher/admin layout files as structural analog, game ThemeProvider from RESEARCH.md Pattern 3. |

---

## Metadata

**Analog search scope:** `frontend/app/`, `frontend/components/`, `frontend/lib/`
**Files scanned:** 22 source files read directly
**Tailwind config scanned:** `frontend/tailwind.config.js`, `frontend/app/globals.css`
**Pattern extraction date:** 2026-06-01

**Wave reminder:**
- Wave 1: `lib/theme.ts`, `lib/student-theme.ts`, `app/layout.tsx`, `app/game/layout.tsx`, `components/AuthGate.tsx`, delete `components/ui/`, remove `lib/utils.ts cn()`, delete `tailwind.config.js` / `postcss.config.js` Tailwind entries, clear `globals.css`
- Wave 2: `components/TeacherShell.tsx`, `app/teacher/layout.tsx`, all `app/teacher/**` pages
- Wave 3: `components/PhonemeButton.tsx`, `components/PhonemeChips.tsx`, `components/ResultBanner.tsx`, `components/SelectedPhonemes.tsx`, `app/game/**` pages, `app/login/page.tsx`
- Wave 4: `components/AdminShell.tsx`, `app/admin/layout.tsx`, all `app/admin/**` pages
