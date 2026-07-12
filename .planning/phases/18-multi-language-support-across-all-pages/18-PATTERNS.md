# Phase 18: Multi-language Support Across All Pages - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 11 (6 new + 5 modified + translation files)
**Analogs found:** 10 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/lib/i18n/request.ts` | utility | config | `frontend/middleware.ts` | role-match (request config pattern) |
| `frontend/lib/i18n/actions.ts` | utility | server-action | `frontend/lib/auth.ts` | role-match (side-effect function pattern) |
| `frontend/components/LanguageSwitcher.tsx` | component | request-response | `frontend/components/TeacherShell.tsx` | exact (MUI Button/Menu interaction) |
| `frontend/messages/en/teacher.json` | config | static | `marketing-site/app/data/content.ts` | role-match (typed content structure) |
| `frontend/messages/vi/teacher.json` | config | static | `marketing-site/app/data/content.ts` | role-match (typed content structure) |
| `frontend/next.config.js` | config | static | itself | exact (Next.js config format) |
| `frontend/app/teacher/layout.tsx` (modify) | component | provider | itself | exact (existing ThemeProvider pattern) |
| `frontend/components/TeacherShell.tsx` (modify) | component | interactive | itself | exact (existing header structure) |
| `frontend/lib/toast-context.tsx` (modify) | utility | context | itself | exact (context + hook pattern) |
| `frontend/app/teacher/classes/page.tsx` (modify) | component | CRUD | itself | exact (page component structure) |
| `frontend/app/teacher/students/page.tsx` (modify) | component | CRUD | itself | exact (page component structure) |

---

## Pattern Assignments

### `frontend/lib/i18n/request.ts` (utility, config)

**Analog:** `frontend/middleware.ts`

**Purpose:** Server-side getRequestConfig function to read locale from NEXT_LOCALE cookie, defaulting to 'vi' when no cookie exists. Called by next-intl to inject locale + messages into server context.

**Imports pattern** (middleware.ts lines 1-2):
```typescript
import { NextRequest, NextResponse } from 'next/server';
```

**Cookie reading pattern** (middleware.ts lines 25-30):
```typescript
function detectAppContext(pathname: string): AppContext | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/teacher')) return 'teacher';
  if (pathname.startsWith('/student')) return 'student';
  return null;
}
```

**Async request handling pattern** (middleware.ts lines 43-54):
```typescript
export default function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const appContext = detectAppContext(pathname);
  if (!appContext) {
    return NextResponse.next();
  }

  const appConfig = APP_CONFIG[appContext];
  const tokenValue = req.cookies.get(appConfig.cookieName)?.value;
```

**Key insight:** Use `req.cookies.get('NEXT_LOCALE')?.value` pattern; provide fallback via `||` operator.

---

### `frontend/lib/i18n/actions.ts` (utility, server-action)

**Analog:** `frontend/lib/auth.ts` (setAuth function pattern)

**Purpose:** Server action function to write NEXT_LOCALE cookie. Called from client component via useTransition.

**Function side-effect pattern** (auth.ts lines 37-40):
```typescript
export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
```

**Error-handling pattern** (auth.ts lines 54-63):
```typescript
export async function login(upn: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upn, password }),
  });
  if (!res.ok) return parseApiError(res);
  const data = await res.json();
  setAuth(data.token, data.user);
  return data.user as AuthUser;
}
```

**Key insight:** 
- Use `'use server'` directive at top of file
- Import `cookies()` from 'next/headers'
- Use `const cookieStore = await cookies(); cookieStore.set('NEXT_LOCALE', locale, { maxAge: 31536000 });`
- No return value needed; caller will handle UI update via router.refresh()

---

### `frontend/components/LanguageSwitcher.tsx` (component, request-response)

**Analog:** `frontend/components/TeacherShell.tsx` (user menu pattern)

**Purpose:** Dropdown button component that reads current locale via useLocale(), displays language options, calls server action to update cookie, triggers re-render.

**Imports pattern** (TeacherShell.tsx lines 1-20):
```typescript
'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { LogOut } from 'lucide-react';
```

**Button + Menu pattern** (TeacherShell.tsx lines 204-217):
```typescript
<IconButton
  onClick={handleMenuOpen}
  aria-label="Open account menu"
  aria-haspopup="true"
  aria-expanded={showUserMenu}
  sx={{
    width: 36, height: 36, borderRadius: '50%', bgcolor: '#22C55E',
    color: 'white', fontWeight: 700, fontSize: 14,
    '&:hover': { bgcolor: '#16A34A' },
  }}
>
  {(user.upn?.[0] ?? '?').toUpperCase()}
</IconButton>

<Menu
  anchorEl={anchorEl}
  open={showUserMenu}
  onClose={handleMenuClose}
  slotProps={{ paper: { sx: { width: 288, borderRadius: 3, p: 1, mt: 1 } } }}
  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
>
```

**Menu item pattern** (TeacherShell.tsx lines 250-256):
```typescript
<MenuItem
  onClick={() => { setShowPwForm((v) => !v); setPwError(''); setPwSuccess(false); }}
  sx={{ borderRadius: 2, fontSize: 14, color: 'text.secondary', gap: 1 }}
>
  <KeyRound size={14} />
  Change password
</MenuItem>
```

**State management pattern** (TeacherShell.tsx lines 55-56, 71-80):
```typescript
const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
const showUserMenu = Boolean(anchorEl);

function handleMenuOpen(event: React.MouseEvent<HTMLElement>) {
  setAnchorEl(event.currentTarget);
  setShowPwForm(false);
}

function handleMenuClose() {
  if (pwTimerRef.current) { clearTimeout(pwTimerRef.current); pwTimerRef.current = null; }
  setAnchorEl(null);
  setShowPwForm(false);
}
```

**Key insight:** 
- Use MUI Button with onClick handler to set anchorEl
- Use `useTransition()` for async server action calls
- Call `router.refresh()` after cookie update to re-render with new locale
- Apply teacherAccent color (`#3B82F6`) to button when selected

---

### `frontend/messages/en/teacher.json` (config, static)

**Analog:** `marketing-site/app/data/content.ts` (typed content structure)

**Purpose:** Centralized English translation catalog for all teacher portal strings. Organized hierarchically by page/feature domain with support for interpolation.

**Object structure pattern** (content.ts lines 1-8, 10-21):
```typescript
export const heroContent = {
  tagline: 'Tiếng Anh tự tin — bắt đầu từ đây',
  subheading: 'Lớp tiếng Anh cô Katie — dành cho trẻ em 6–12 tuổi tại Hà Nội',
  ctaLabel: 'Nhắn tin Zalo ngay',
  ctaHref: 'https://zalo.me/0000000000',
};

export const teacherContent = {
  name: 'Cô Katie',
  heading: 'Về cô Katie',
  credentials: [
    'Bằng cử nhân Sư phạm tiếng Anh',
    '10+ năm kinh nghiệm giảng dạy',
  ],
};
```

**Recommended JSON structure** (from RESEARCH.md):
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "classes": "Classes",
    "students": "Students",
    "homework": "Homework",
    "sessions": "Sessions",
    "tuition": "Tuition",
    "import": "Import",
    "schedule": "Schedule"
  },
  "buttons": {
    "create": "Create",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "pages": {
    "classes": {
      "title": "Classes",
      "create_new": "Create New Class",
      "class_name": "Class Name"
    }
  },
  "toasts": {
    "class_created": "Class '{{name}}' created successfully",
    "class_error": "Failed to save class: {{error}}"
  }
}
```

**Key insight:**
- Use hierarchical namespacing: nav, buttons, pages.{feature}, toasts
- Use `{{variable}}` syntax for interpolation (compatible with i18next)
- Keep keys flat (no deeply nested > 3 levels for readability)
- All toast keys go in `toasts.*` namespace

---

### `frontend/messages/vi/teacher.json` (config, static)

**Analog:** `marketing-site/app/data/content.ts` (same structure, Vietnamese content)

**Purpose:** Centralized Vietnamese translation catalog for all teacher portal strings. Mirrors the English file structure exactly.

**Structure:** Identical to `frontend/messages/en/teacher.json` but with Vietnamese text.

**Key Vietnamese strings example:**
```json
{
  "nav": {
    "dashboard": "Bảng điều khiển",
    "classes": "Lớp học",
    "students": "Học sinh",
    "homework": "Bài tập"
  },
  "toasts": {
    "class_created": "Lớp '{{name}}' được tạo thành công",
    "class_error": "Không thể lưu lớp: {{error}}"
  }
}
```

---

### `frontend/next.config.js` (config, static — MODIFY)

**Analog:** itself

**Purpose:** Register next-intl plugin to enable cookie-based locale detection without URL routing.

**Current config structure** (next.config.js lines 1-22):
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/game/:path*', destination: '/student/:path*', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

**Modification pattern** (from RESEARCH.md Code Examples 1):
```javascript
// Add at top
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

// Wrap export
module.exports = withNextIntl(nextConfig);
```

**Key insight:** The `withNextIntl` plugin must wrap the `nextConfig` object. Order matters: plugin first, then config spread.

---

### `frontend/app/teacher/layout.tsx` (component — MODIFY)

**Analog:** itself (existing ThemeProvider pattern)

**Purpose:** Wrap TeacherShell with NextIntlClientProvider to make useTranslations() hook available to all child pages.

**Current provider pattern** (layout.tsx lines 77-86):
```typescript
return (
  <ThemeProvider theme={teacherTheme}>
    <CssBaseline />
    <TeacherUserContext.Provider value={user}>
      <TeacherShell user={user} title={TITLES[pathname] ?? 'Teacher Portal'}>
        {children}
      </TeacherShell>
    </TeacherUserContext.Provider>
  </ThemeProvider>
);
```

**Modification:** Insert NextIntlClientProvider after ThemeProvider, before TeacherUserContext.Provider:
```typescript
return (
  <ThemeProvider theme={teacherTheme}>
    <CssBaseline />
    <NextIntlClientProvider>
      <TeacherUserContext.Provider value={user}>
        <TeacherShell user={user} title={TITLES[pathname] ?? 'Teacher Portal'}>
          {children}
        </TeacherShell>
      </TeacherUserContext.Provider>
    </NextIntlClientProvider>
  </ThemeProvider>
);
```

**Import to add** (line 1-11):
```typescript
import { NextIntlClientProvider } from 'next-intl';
```

**Key insight:** Provider must wrap the context and shell; order is critical (ThemeProvider → NextIntlClientProvider → TeacherUserContext → TeacherShell).

---

### `frontend/components/TeacherShell.tsx` (component — MODIFY)

**Analog:** itself (existing header structure, user menu)

**Purpose:** Add LanguageSwitcher component to the page header (top-right, next to user avatar menu).

**Current header pattern** (TeacherShell.tsx lines 187-217):
```typescript
<Box sx={{ px: '32px', pt: '28px', pb: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
  <Box>
    <Typography sx={{ fontSize: 12, color: '#F97316', fontWeight: 700, mb: '5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      👋 Chào {user.upn?.split('@')[0] ?? 'Teacher'},
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        {title}
      </Typography>
      <Box component="span" sx={{ fontSize: 20, lineHeight: 1 }}>✨</Box>
    </Box>
    {subtitle && (
      <Typography sx={{ fontSize: 13, color: '#6B7280', mt: '6px' }}>{subtitle}</Typography>
    )}
  </Box>

  {/* User avatar button — RIGHT SIDE */}
  <Box sx={{ position: 'relative', flexShrink: 0, mt: 0.5 }}>
    <IconButton
      onClick={handleMenuOpen}
      ...
    />
  </Box>
</Box>
```

**Modification:** Add LanguageSwitcher component to the right-side Box (before or alongside user avatar):
```typescript
<Box sx={{ position: 'relative', flexShrink: 0, mt: 0.5, display: 'flex', gap: 1, alignItems: 'center' }}>
  <LanguageSwitcher />
  <IconButton
    onClick={handleMenuOpen}
    ...
  />
</Box>
```

**Import to add** (line 1-20):
```typescript
import LanguageSwitcher from '@/components/LanguageSwitcher';
```

**Key insight:** The right-side Box already uses flexbox; add `display: 'flex', gap: 1` to align LanguageSwitcher and user avatar horizontally.

---

### `frontend/lib/toast-context.tsx` (utility — MODIFY)

**Analog:** itself (existing context + hook pattern)

**Purpose:** Update ToastProvider and showToast to accept translation keys (instead of hardcoded strings). Keep backward compatibility by supporting both strings and keys.

**Current pattern** (toast-context.tsx lines 1-57):
```typescript
'use client';
import React, { createContext, useCallback, useContext, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  open: boolean;
  message: string;
  severity: Severity;
}

interface ToastContextValue {
  showToast: (message: string, severity?: Severity) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'success' });

  const showToast = useCallback((message: string, severity: Severity = 'success') => {
    setToast({ open: true, message, severity });
  }, []);

  function handleClose() {
    setToast((t) => ({ ...t, open: false }));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={handleClose}
          variant="filled"
          sx={{ borderRadius: 3, minWidth: 280, boxShadow: 6, fontSize: 14 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

**Modification strategy:**
- **No breaking change:** Keep signature as `showToast(message: string, severity?: Severity)`
- **At call sites:** Pass pre-translated string from `useTranslations('teacher.toasts').t(key, vars)` instead of hardcoded string
- **Example usage pattern** (from classes/page.tsx after modification):
```typescript
'use client';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/toast-context';

export default function ClassesPage() {
  const t = useTranslations('teacher.toasts');
  const { showToast } = useToast();

  async function handleCreateClass(name: string) {
    try {
      await createClass(name);
      // Pass already-translated string to showToast
      showToast(t('class_created', { name }), 'success');
    } catch (err) {
      showToast(
        t('class_error', { error: err instanceof Error ? err.message : 'Unknown error' }),
        'error'
      );
    }
  }
}
```

**Key insight:** Toast context itself does NOT change; only the *call sites* change to translate before passing to `showToast()`.

---

### `frontend/app/teacher/*/page.tsx` (19 files — components, MODIFY)

**Analogs:** 
- `frontend/app/teacher/classes/page.tsx`
- `frontend/app/teacher/students/page.tsx`
- `frontend/app/teacher/homework/page.tsx`
- `frontend/app/teacher/tuition/page.tsx`

**Purpose:** Extract all hardcoded UI strings into translation keys and use `useTranslations('teacher')` hook to resolve them at render time.

**Imports pattern** (classes/page.tsx lines 1-22):
```typescript
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getClasses, createClass, deleteClass, updateClass, ClassItem, ClassStatus, ScheduleSlot } from '@/lib/admin-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import ModalShell, { sectionInputSx } from '@/components/ui/ModalShell';
import FormSection from '@/components/ui/FormSection';
import { useToast } from '@/lib/toast-context';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Search, Plus, Calendar, Pencil, Trash2, Users } from 'lucide-react';
import { formatDate, DATE_FORMAT } from '@/lib/datetime';
import TableShell, { TableRow as TableShellRow } from '@/components/ui/TableShell';
import { colors } from '@/lib/colors';
import PageLoading, { PAGE_LOADING_DELAY } from '@/components/ui/PageLoading';
```

**Add useTranslations import:**
```typescript
import { useTranslations } from 'next-intl';
```

**Hook usage pattern** (at top of component):
```typescript
export default function ClassesPage() {
  const t = useTranslations('teacher');
  const { showToast } = useToast();
  // ... rest of component
}
```

**String replacement pattern** (classes/page.tsx lines 26-30):
```typescript
// BEFORE (hardcoded):
const STATUS_CONFIG: Record<ClassStatus, { label: string; color: string; bg: string; dot: string }> = {
  PENDING:    { label: 'Pending',     color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  INPROGRESS: { label: 'In Progress', color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  ENDED:      { label: 'Ended',       color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
};

// AFTER (translation keys):
// In messages/en/teacher.json:
// "classStatus": { "PENDING": "Pending", "INPROGRESS": "In Progress", "ENDED": "Ended" }

// In component (or move to const above component if not dynamic):
const statusLabels = {
  PENDING: t('classStatus.PENDING'),
  INPROGRESS: t('classStatus.INPROGRESS'),
  ENDED: t('classStatus.ENDED'),
};
```

**Typography usage pattern** (classes/page.tsx lines 96-98):
```typescript
// BEFORE:
<ModalShell title={editing ? `Edit ${editing.name}` : 'New Class'} />

// AFTER:
<ModalShell 
  title={editing ? t('pages.classes.edit_title', { name: editing.name }) : t('pages.classes.create_title')}
/>
```

**Button label pattern:**
```typescript
// BEFORE:
<Button>{loading ? (editing ? 'Updating…' : 'Creating…') : (editing ? 'Update Class' : 'Create Class')}</Button>

// AFTER:
<Button>{loading ? t(editing ? 'buttons.updating' : 'buttons.creating') : t(editing ? 'buttons.update_class' : 'buttons.create_class')}</Button>
```

**Toast usage pattern** (classes/page.tsx lines 79-88):
```typescript
// BEFORE:
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault(); setLoading(true);
  try {
    if (editing) { await updateClass(editing.id, form); }
    else { await createClass(form); }
    onSaved(); onClose();
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : 'Failed to save class', 'error');
  } finally { setLoading(false); }
}

// AFTER:
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault(); setLoading(true);
  try {
    if (editing) { await updateClass(editing.id, form); }
    else { await createClass(form); }
    showToast(t('toasts.class_saved'), 'success');
    onSaved(); onClose();
  } catch (err: unknown) {
    showToast(
      t('toasts.class_error', { error: err instanceof Error ? err.message : 'Unknown error' }),
      'error'
    );
  } finally { setLoading(false); }
}
```

**Key insight:**
- Every hardcoded string visible to users must be extracted to messages/en/teacher.json + messages/vi/teacher.json
- Use namespace `teacher` for all `useTranslations()` calls in teacher pages
- Use dot notation for nested keys: `t('pages.classes.title')`
- Use interpolation for dynamic values: `t('key', { variable: value })`
- Keep toast messages in `toasts.*` namespace
- Labels and buttons in `buttons.*` namespace
- Page-specific strings in `pages.{feature}.*` namespace

---

## Shared Patterns

### useTranslations Hook Integration
**Source:** next-intl library (RESEARCH.md Pattern 2, Code Examples 3)
**Apply to:** All 19 teacher page components

```typescript
import { useTranslations } from 'next-intl';

export default function YourPage() {
  const t = useTranslations('teacher');  // Access teacher.json keys
  
  return (
    <Typography>{t('pages.yourfeature.title')}</Typography>
  );
}
```

### Interpolation in Toast Messages
**Source:** RESEARCH.md Pattern 3, Code Examples 3
**Apply to:** All showToast calls in teacher portal (40+ call sites per D-11)

```typescript
const t = useTranslations('teacher.toasts');
const { showToast } = useToast();

// In messages/en/teacher.json:
// "toasts": { "class_created": "Class '{{name}}' created successfully" }

showToast(t('class_created', { name: 'Math 101' }), 'success');
// Result: "Class 'Math 101' created successfully"
```

### Server Action Pattern for Locale Switching
**Source:** RESEARCH.md Pattern 2, Code Examples 2
**Apply to:** LanguageSwitcher component + i18n/actions.ts

```typescript
// frontend/lib/i18n/actions.ts
'use server';
import { cookies } from 'next/headers';

export async function setLocale(locale: 'en' | 'vi') {
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, { maxAge: 31536000 });
}
```

```typescript
// frontend/components/LanguageSwitcher.tsx
'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLocale } from '@/lib/i18n/actions';

export default function LanguageSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleLocaleChange(newLocale: 'en' | 'vi') {
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();  // Re-render with new locale
    });
  }

  return (
    <Button onClick={() => handleLocaleChange('en')} disabled={isPending}>
      English
    </Button>
  );
}
```

### MUI Styling for Language Switcher Button
**Source:** `frontend/components/TeacherShell.tsx` (lines 211-214)
**Apply to:** LanguageSwitcher component

```typescript
sx={{
  borderRadius: 2,           // Rounded corners to match other buttons
  fontSize: 13,              // Smaller text
  fontWeight: 600,           // Bold
  textTransform: 'uppercase', // "EN" / "VI"
  border: '1px solid',       // Outlined style
  borderColor: locale === 'en' ? '#3B82F6' : 'divider', // Highlight selected
  color: locale === 'en' ? '#3B82F6' : 'text.secondary',
  bgcolor: locale === 'en' ? '#EFF6FF' : 'transparent', // Use teacherAccentBg
  '&:hover': {
    borderColor: '#3B82F6',
    bgcolor: '#EFF6FF',
  },
}}
```

### Provider Nesting Order
**Source:** `frontend/app/teacher/layout.tsx` (lines 77-86)
**Apply to:** TeacherLayout initialization

```typescript
// Correct order (top to bottom):
<ThemeProvider theme={teacherTheme}>           {/* Material-UI theme */}
  <CssBaseline />
  <NextIntlClientProvider>                     {/* i18n context */}
    <TeacherUserContext.Provider value={user}> {/* App-specific user context */}
      <TeacherShell user={user}>
        {children}
      </TeacherShell>
    </TeacherUserContext.Provider>
  </NextIntlClientProvider>
</ThemeProvider>
```

**Critical:** NextIntlClientProvider must wrap TeacherShell for useTranslations() to work in child pages.

---

## No Analog Found

**Files with sufficient precedent in codebase or external documentation (RESEARCH.md):**

| File | Role | Data Flow | Reason | Fallback Source |
|------|------|-----------|--------|-----------------|
| `frontend/lib/i18n/request.ts` | utility | config | No existing request-time config, but pattern is standard next-intl | RESEARCH.md Pattern 1, official docs |
| `frontend/lib/i18n/actions.ts` | utility | server-action | No existing server action, but pattern is standard Next.js 14+ | RESEARCH.md Pattern 2, Next.js docs |

*All other files have direct analogs in the codebase.*

---

## Metadata

**Analog search scope:** 
- `frontend/middleware.ts` (request handling)
- `frontend/lib/*.ts` (utility functions, auth patterns)
- `frontend/components/*.tsx` (reusable components, MUI patterns)
- `frontend/app/teacher/**/*.tsx` (page components, string/UI patterns)
- `frontend/next.config.js` (build config)
- `marketing-site/app/data/content.ts` (typed content structure precedent)

**Files scanned:** 15+

**Pattern extraction date:** 2026-07-12

**Confidence levels:**
- **Exact matches (3):** LanguageSwitcher (TeacherShell menu pattern), next.config.js, layout wrapping (ThemeProvider)
- **Role matches (6):** middleware.ts (request config), auth.ts (side-effect function), content.ts (static data structure), toast-context (context/hook), page components
- **Partial matches (1):** request.ts (uses middleware cookie pattern but in different context)
- **External patterns (1):** actions.ts (standard Next.js server action pattern)

---

## Ready for Planning

All files classified and analogs identified. Planner can now reference concrete code excerpts and patterns for each file's implementation.
