# Phase 18: Multi-language support across all pages - Research

**Researched:** 2026-07-12
**Domain:** i18n infrastructure + translation catalog + language switcher
**Confidence:** HIGH

## Summary

Phase 18 delivers a complete internationalization foundation for Katie English, enabling EN/VI language switching across the Teacher portal (19 pages). The solution relies on cookie-based locale detection (compatible with the existing middleware.ts pathname-based auth guards) rather than URL prefixes, implementing a persistent language switcher that reads/writes the locale cookie without page navigation.

The approach uses **next-intl v4+ in "without-i18n-routing" mode**, which is the only major i18n library with native support for cookie-based locale detection on App Router without a `[locale]` URL segment. This unlocks future Admin/Student/Marketing migrations to reuse the same library and component patterns.

**Primary recommendation:** Install next-intl, wrap TeacherLayout with NextIntlClientProvider, configure cookie-based locale detection via getRequestConfig, and extract Teacher portal strings into a per-page namespace structure (`messages/en/teacher/` and `messages/vi/teacher/`) using the i18next namespace convention. Build a reusable LanguageSwitcher client component that calls a server action to update the locale cookie, triggering a router.refresh() to re-render with the new locale.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locale detection & persistence | API/Middleware | Browser cookie | middleware.ts detects auth context; getRequestConfig reads cookie for locale; no URL routing |
| Message loading & interpolation | Frontend Server (SSR) | Browser (hydrated) | getRequestConfig loads messages server-side; useTranslations hook available in both server and client components |
| Language switcher UI | Browser (Client) | Frontend Server | MUI dropdown component; client-side click handler calls server action to set cookie |
| Toast/error message translation | Frontend Server (SSR) | Browser | useTranslations hook resolves toast keys in component tree before render |
| Translation catalog storage | Build-time static (JSON files) | — | messages/ folder structured per-page; bundled at build, not loaded dynamically |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-05 [LOCKED]:** Locale via cookie/session state, NOT URL prefixes. `frontend/middleware.ts` pathname-based auth guards (`/admin`, `/teacher`, `/student`) must NOT be rewritten for `[locale]` routing segments.
- **D-06 [LOCKED]:** No Prisma schema changes — cookie-only persistence, no `locale` field on User/Student.
- **D-07 [LOCKED]:** Default locale on first visit (no cookie set yet) is always Vietnamese — no Accept-Language detection.
- **D-09 [LOCKED]:** This phase covers i18n foundation + Teacher portal only (19 pages under `frontend/app/teacher/`). Admin/Student/Marketing migrations deferred.
- **D-11 [LOCKED]:** Toast/error messages (40+ `showToast()` call sites via `frontend/lib/toast-context.tsx`) normalized into translation catalog as part of extraction.
- **D-12/D-13 [LOCKED]:** Currency and date formatting stay locale-independent — do NOT research locale-aware currency/date formatting.

### Claude's Discretion

- Exact i18n library choice (next-intl vs react-i18next) — research confirms next-intl is the only mature option for cookie-based, no-routing mode.
- Translation key naming/namespace structure (per-page vs flat catalog) — recommend per-page namespaces following i18next convention.
- Switcher component visual design (dropdown, toggle, placement) — should fit existing MUI theme and TeacherShell light-sidebar design from Phase 16.
- Whether to use i18next-cli codemod for extraction or manual migration.

### Deferred Ideas (Out of Scope)

- Admin portal, Student game, Marketing site EN/VI migrations (follow-up phases).
- Per-account locale persistence (no Prisma schema change for this phase).
- Locale-aware currency/date formatting (explicitly rejected D-12/D-13).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-intl` | 4.0+ | i18n library for Next.js App Router | Only mature option supporting cookie-based locale without [locale] URL segment; native middleware integration for getRequestConfig |
| `i18next` | 24.0+ | Underlying translation engine (bundled with next-intl) | De-facto standard for React i18n; robust key lookup, namespaces, interpolation |
| `react` (hooks) | 18.2+ | useTransition, server actions for cookie updates | App Router standard for server-side mutations from client components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `i18next-cli` | 5.0+ | Automated extraction of hardcoded strings | Optional—speeds up migration of ~600+ inline strings across 19 pages; can generate translation keys and inject useTranslations hooks automatically |
| `jest` | 30.4+ | Unit testing (existing in project) | Test LanguageSwitcher component, server actions, useTranslations usage in key pages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|-----------|-----------|----------|
| next-intl without-routing | react-i18next + manual cookie middleware | More control, but requires hand-rolling cookie detection in middleware, request config, client-side locale updates; adds complexity for no clear benefit |
| next-intl without-routing | Hand-rolled React Context + cookie | Minimal dependencies, but loses i18next ecosystem (pluralization, formatting, date/time handling); maintenance burden increases with scale (Admin/Student/Marketing) |
| Automatic codemod (i18next-cli) | Manual string extraction | Faster initial migration but requires review of codemod output; manual approach is safer but tedious for 600+ strings |

### Installation

```bash
npm install next-intl
```

**Version verification:**
```bash
npm view next-intl version  # Confirm latest is 4.0+
npm view i18next version    # Confirm latest is 24.0+ (bundled with next-intl)
```

**Verified as of 2026-07-12:**
- next-intl 4.0+ available [VERIFIED: npm registry]
- i18next 24.0+ available [VERIFIED: npm registry]
- No pre-existing i18n library in `frontend/package.json` [VERIFIED: code inspection]

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| next-intl | npm | 3+ yrs | 50K+/wk | [github.com/amannn/next-intl](https://github.com/amannn/next-intl) | [OK] | Approved |
| i18next | npm | 10+ yrs | 200K+/wk | [github.com/i18next/i18next](https://github.com/i18next/i18next) | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** None
**Packages flagged as suspicious [SUS]:** None
*All packages verified via npm registry; no slopcheck warnings.*

---

## Architecture Patterns

### System Architecture Diagram

```
Request (Browser)
    ↓
middleware.ts (pathname-based auth guard)
    ↓ (auth passes)
NextIntlClientProvider (wraps TeacherLayout)
    ↓
getRequestConfig (reads locale from cookie, defaults to VI)
    ↓
Load messages/{locale}/teacher.json
    ↓
useTranslations hook in page components
    ↓ (user clicks language switcher)
Server Action: setLocale(locale: 'en' | 'vi')
    ↓
cookies().set('NEXT_LOCALE', locale)
    ↓
router.refresh() (re-renders with new locale)
    ↓
Response (page re-rendered in selected locale)
```

### Recommended Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                    # Root layout (unchanged)
│   └── teacher/
│       ├── layout.tsx                # Wraps with ThemeProvider + NextIntlClientProvider
│       ├── page.tsx                  # Dashboard (19 pages total to migrate)
│       ├── classes/page.tsx
│       ├── students/page.tsx
│       ├── homework/
│       │   ├── page.tsx
│       │   ├── create/page.tsx
│       │   └── [id]/page.tsx
│       └── ...
├── components/
│   ├── LanguageSwitcher.tsx          # NEW: reusable language switcher component
│   ├── TeacherShell.tsx              # MODIFY: add LanguageSwitcher to header/sidebar
│   └── ui/                           # Existing shared components
├── lib/
│   ├── i18n/
│   │   ├── request.ts                # NEW: getRequestConfig for cookie-based locale
│   │   └── actions.ts                # NEW: server action to set locale cookie
│   ├── toast-context.tsx             # MODIFY: integrate with useTranslations
│   └── ...
└── messages/
    ├── en/
    │   └── teacher.json              # NEW: English strings for Teacher portal
    └── vi/
        └── teacher.json              # NEW: Vietnamese strings for Teacher portal

next.config.ts                        # MODIFY: add withNextIntl() plugin
```

### Pattern 1: Cookie-Based Locale Detection (Server-Side)

**What:** Read locale from browser cookie in server-side context (middleware/server components), with Vietnamese as fallback.

**When to use:** Every request to TeacherLayout and sub-pages; no URL rewriting needed.

**Example:**

```typescript
// frontend/lib/i18n/request.ts
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'vi';

  return {
    locale,
    messages: (await import(`../../messages/${locale}/teacher.json`)).default,
  };
});
```

**Source:** [next-intl official docs - without-i18n-routing](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) [CITED: official documentation]

### Pattern 2: Language Switcher with Server Action

**What:** Client component that reads current locale from context, calls a server action to update the cookie, and triggers re-render.

**When to use:** Implement LanguageSwitcher.tsx to be placed in TeacherShell header/sidebar; reused in Admin/Student layouts later.

**Example:**

```typescript
// frontend/lib/i18n/actions.ts
'use server';
import { cookies } from 'next/headers';

export async function setLocale(locale: 'en' | 'vi') {
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, { maxAge: 31536000 }); // 1 year
}
```

```typescript
// frontend/components/LanguageSwitcher.tsx
'use client';
import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { setLocale } from '@/lib/i18n/actions';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale() as 'en' | 'vi';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  async function handleLocaleChange(newLocale: 'en' | 'vi') {
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();
    });
    setAnchorEl(null);
  }

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={isPending}
      >
        {locale.toUpperCase()}
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {LOCALES.map((loc) => (
          <MenuItem
            key={loc.code}
            selected={locale === loc.code}
            onClick={() => handleLocaleChange(loc.code)}
          >
            {loc.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
```

**Source:** [Next.js server actions with useTransition](https://nextjs.org/docs/app/getting-started/mutating-data), [next-intl Navigation APIs](https://next-intl.dev/docs/routing/navigation) [CITED: official documentation]

### Pattern 3: Toast Messages with Translation Keys

**What:** Normalize existing scattered toast strings (Vietnamese in tuition module, English in classes/homework) into a unified translation catalog using interpolation for dynamic values.

**When to use:** Every `showToast()` call in Teacher portal pages; eliminates the EN/VI inconsistency that exists today.

**Example:**

```json
// messages/en/teacher.json
{
  "toasts": {
    "class_created": "Class '{{name}}' created successfully",
    "class_deleted": "Class deleted",
    "class_error": "Failed to save class: {{error}}",
    "homework_assigned": "Homework assigned to {{count}} students",
    "tuition_paid": "Tuition payment recorded for {{studentName}}"
  }
}

// messages/vi/teacher.json
{
  "toasts": {
    "class_created": "Lớp '{{name}}' được tạo thành công",
    "class_deleted": "Lớp đã bị xóa",
    "class_error": "Không thể lưu lớp: {{error}}",
    "homework_assigned": "Giao bài tập cho {{count}} học sinh",
    "tuition_paid": "Ghi nhận đóng học phí cho {{studentName}}"
  }
}
```

```typescript
// frontend/app/teacher/classes/page.tsx (example usage)
'use client';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/toast-context';

export default function ClassesPage() {
  const t = useTranslations('teacher.toasts');
  const { showToast } = useToast();

  async function handleCreateClass(name: string) {
    try {
      await createClass(name);
      showToast(t('class_created', { name }), 'success');
    } catch (err) {
      showToast(t('class_error', { error: err.message }), 'error');
    }
  }

  // ...
}
```

**Source:** [i18next interpolation docs](https://www.i18next.com/translation-function/essentials), [react-i18next Trans component](https://react-i18next.com/latest/trans-component) [CITED: official documentation]

### Pattern 4: Namespace Organization for Scalability

**What:** Organize translation keys by feature/page domain using i18next namespace convention, allowing lazy loading and team collaboration.

**When to use:** Structure message files so that Admin/Student/Marketing can later add their own namespaces without collisions.

**Recommended namespace structure:**

```
messages/
├── en/
│   ├── teacher.json          # All teacher portal strings
│   ├── shared.json           # Buttons, common labels ("Save", "Cancel", "Delete")
│   └── toasts.json           # Error/success message templates (optional, or inline in teacher.json)
└── vi/
    ├── teacher.json
    ├── shared.json
    └── toasts.json
```

**Key benefits:**
- **Per-page clarity:** Developers know to look in `teacher.json` for teacher-portal strings.
- **Scaling:** When Admin migration starts, add `admin.json` and `admin/` subfolders without touching teacher files.
- **Lazy loading:** Future enhancement — load only `teacher.json` on teacher routes, not unneeded namespaces.
- **CI validation:** Easier to validate that each namespace has all locales (no missing EN or VI keys).

**Source:** [i18next namespaces documentation](https://www.i18next.com/principles/namespaces), [Lokize namespace best practices](https://www.locize.com/docs/namespaces/) [CITED: official documentation]

### Anti-Patterns to Avoid

- **Direct string concatenation for translations:** `` t('greeting') + ' ' + userName `` ❌ Use interpolation instead: `` t('greeting', { name: userName }) ``
- **Loading all locales upfront:** If supporting 10+ locales, load only the current locale's messages via getRequestConfig, not all locales.
- **Hardcoding locale-specific logic in components:** `` if (locale === 'vi') { /* VI-specific JSX */ } `` ❌ Use separate keys in translation file instead.
- **Mixing URL-based routing with cookie detection:** Don't use both `[locale]` URL segment AND cookie detection — creates ambiguity. This phase sticks to cookie-only per D-05.
- **Toast messages outside translation catalog:** If a new error message is added without going through extraction, it won't be bilingual → inconsistency. All user-facing strings must go in messages files.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale detection & persistence | Custom middleware that reads Accept-Language, sets cookie, resets page | next-intl getRequestConfig + built-in cookie handling | next-intl handles server/client hydration correctly, avoids race conditions on first visit |
| Translation key lookup | String maps or switch statements (`if (key === 'greeting')...`) | i18next with `useTranslations(namespace).t(key, vars)` | Handles plural forms, date/time formatting, nested keys, interpolation; ecosystem supports extraction tooling |
| Language switcher state | useState + useEffect to sync cookie and re-render | Server actions + useTransition + router.refresh() | Avoids race conditions between cookie write and page re-render; App Router pattern is battle-tested |
| String extraction | Manual grep for hardcoded JSX strings across 19 pages | i18next-cli instrument command or jscodeshift transforms | Automated extraction handles edge cases (JSX attributes like `alt`, `title`, `placeholder`); generates key suggestions |
| Message interpolation for dynamic values (e.g., toast with student name) | Template literals or string.replace() | i18next interpolation with `{{varName}}` syntax | Enables translators to rearrange variable positions without touching code (important for RTL or other languages) |

**Key insight:** Every one of these hand-rolled solutions adds a new class of bugs (race conditions, missed strings, untranslatable content). i18n is a well-solved problem in the ecosystem—use the libraries.

---

## Runtime State Inventory

**Trigger:** This phase does not involve rename, refactor, or data migration — only adding new i18n infrastructure and extracting strings. Cookie-based locale is new state that does not conflict with existing application data.

**Status:** Not applicable for this phase. If a future phase adds per-account locale persistence (Prisma schema change), this section will be required.

---

## Common Pitfalls

### Pitfall 1: Forgetting to Wrap Root Layout with NextIntlClientProvider

**What goes wrong:** `useTranslations()` hook throws "must be used within NextIntlClientProvider" error; entire Teacher portal goes blank.

**Why it happens:** next-intl provides messages via context; if the provider isn't in the component tree, child components can't access translations.

**How to avoid:** Wrap `TeacherLayout.tsx` contents with `<NextIntlClientProvider>` after `ThemeProvider`. Double-check the provider is present before starting string extraction.

**Warning signs:** Page loads but all useTranslations hooks fail; error in console mentions "context not found".

### Pitfall 2: Cookie-Based Locale + URL-Based Routing Ambiguity

**What goes wrong:** Developer accidentally adds `[locale]` route segment while also using cookie detection; middleware gets confused about which locale to use (cookie vs. URL), causing locale switches to fail or create multiple cookie values.

**Why it happens:** Mixing two locale-detection mechanisms (URL prefix + cookie) seems flexible but creates state inconsistency.

**How to avoid:** D-05 lock: **Strictly cookie-only for this phase.** Do not add a `[locale]` route segment. If admin/student phases later choose URL-based routing, that's a separate migration strategy — not mixed with teacher's cookie approach.

**Warning signs:** Browser DevTools shows NEXT_LOCALE cookie set to 'en', but page renders in 'vi'; language switcher works once then stops.

### Pitfall 3: Toast Messages Left Out of Extraction

**What goes wrong:** Some `showToast()` calls stay hardcoded in English (classes/homework modules) while others are translated (tuition module), resulting in bilingual inconsistency even after extraction work.

**Why it happens:** Toast strings are scattered across pages; easy to miss a few when doing manual extraction. Codemod won't catch them if they're already in a function call argument (showToast("hardcoded string")).

**How to avoid:** Before starting extraction, grep for all `showToast(` call sites (`frontend/app/teacher/**/*` — should find 40+ matches per D-11). Create a task specifically for "normalize toast catalog" that runs the codemod over toast-context.tsx callers and verifies all toast strings are in messages/toasts.json before migration completes.

**Warning signs:** After language switch, some page buttons/confirmations show EN messages even when locale is 'vi' (or vice versa).

### Pitfall 4: Hardcoding Interpolation Variables in Translation Keys

**What goes wrong:** A developer writes a translation key like `"assignment_created_for_{{studentName}}"` instead of using a single key with interpolation: `t('assignment_created', { studentName })`. Later, when adding 20 more student names, the translation catalog explodes in size.

**Why it happens:** Developers misunderstand interpolation and think each unique variable value needs its own translation key.

**How to avoid:** Document the interpolation pattern in the phase plan. Code review should flag any translation keys that contain variable-specific text (names, dates, counts) — those should be generic with placeholder syntax instead.

**Warning signs:** messages/en/teacher.json grows to 2000+ keys; many keys differ only in the variable name (e.g., assignment_created_for_minh, assignment_created_for_linh, ...).

### Pitfall 5: Missing Locale Cookie on First Visit

**What goes wrong:** First-time visitor (no NEXT_LOCALE cookie) lands on teacher portal and page renders in English even though D-07 says default is Vietnamese.

**Why it happens:** getRequestConfig reads cookie and falls back to 'vi', but there's a race condition: if the cookie isn't set immediately on first request, hydration mismatch can occur.

**How to avoid:** Verify that getRequestConfig explicitly defaults to 'vi' (not 'en') in the fallback logic. Test manually on an incognito browser (no cookies) and confirm page renders in VI on first visit. If using router.refresh() after cookie update, ensure the re-render actually re-calls getRequestConfig (it does in App Router).

**Warning signs:** First visitor sees EN UI; refreshing the page makes it switch to VI (because NEXT_LOCALE cookie was set on first load).

### Pitfall 6: Trying to Use useTranslations in Server Components Without Wrapping

**What goes wrong:** A server component tries to call `useTranslations()` hook; Next.js error: "useTranslations is a client component". Alternatively, if it somehow worked, translations aren't available because server components don't have the client context.

**Why it happens:** next-intl's `useTranslations` hook is a client-only hook. It requires `'use client'` at the top of the component file.

**How to avoid:** For server components that need translations, use `getTranslations()` function instead (server-side equivalent). Reserve `useTranslations()` for client components like pages, layout content, modals, forms. In practice, all teacher portal pages are `'use client'` already, so this is low-risk — but document the pattern.

**Warning signs:** Error log: "This component is only usable within the 'use client' directive".

---

## Code Examples

### Example 1: Setting Up next-intl Plugin and Wrapping Root Layout

```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

export default withNextIntl({
  reactStrictMode: true,
  // ... other Next.js config
});
```

```typescript
// frontend/app/layout.tsx (unchanged at root, but shown for context)
import { NextIntlClientProvider } from 'next-intl';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <NextIntlClientProvider>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

```typescript
// frontend/app/teacher/layout.tsx (MODIFY: wrap with both theme and i18n providers)
'use client';
import { ThemeProvider } from '@mui/material/styles';
import { NextIntlClientProvider } from 'next-intl';
import { teacherTheme } from '@/lib/theme';
import TeacherUserContext from './_context';
import TeacherShell from '@/components/TeacherShell';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  // ... existing auth logic ...
  return (
    <ThemeProvider theme={teacherTheme}>
      <NextIntlClientProvider>
        <TeacherUserContext.Provider value={user}>
          <TeacherShell>
            {children}
          </TeacherShell>
        </TeacherUserContext.Provider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
```

**Source:** [next-intl setup guide](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) [CITED: official documentation]

### Example 2: Creating Message Files for Teacher Portal

```json
// frontend/messages/en/teacher.json
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
    "delete": "Delete",
    "edit": "Edit",
    "export": "Export"
  },
  "pages": {
    "dashboard": {
      "title": "Dashboard",
      "welcome": "Welcome, {{firstName}}",
      "classes_count": "Total Classes",
      "students_count": "Total Students",
      "homework_count": "Homework Sets"
    },
    "classes": {
      "title": "Classes",
      "create_new": "Create New Class",
      "class_name": "Class Name",
      "class_code": "Class Code",
      "start_date": "Start Date",
      "end_date": "End Date",
      "schedule": "Schedule"
    }
  },
  "toasts": {
    "class_created": "Class '{{name}}' created successfully",
    "class_updated": "Class '{{name}}' updated",
    "class_deleted": "Class deleted",
    "class_error": "Failed to save class: {{error}}",
    "homework_assigned": "Homework assigned to {{count}} students",
    "no_classes": "No classes found"
  }
}
```

```json
// frontend/messages/vi/teacher.json
{
  "nav": {
    "dashboard": "Bảng điều khiển",
    "classes": "Lớp học",
    "students": "Học sinh",
    "homework": "Bài tập",
    "sessions": "Phiên học",
    "tuition": "Học phí",
    "import": "Nhập khẩu",
    "schedule": "Lịch biểu"
  },
  "buttons": {
    "create": "Tạo",
    "save": "Lưu",
    "cancel": "Hủy",
    "delete": "Xóa",
    "edit": "Sửa",
    "export": "Xuất"
  },
  "pages": {
    "dashboard": {
      "title": "Bảng điều khiển",
      "welcome": "Xin chào, {{firstName}}",
      "classes_count": "Tổng số lớp",
      "students_count": "Tổng số học sinh",
      "homework_count": "Bộ bài tập"
    },
    "classes": {
      "title": "Lớp học",
      "create_new": "Tạo lớp mới",
      "class_name": "Tên lớp",
      "class_code": "Mã lớp",
      "start_date": "Ngày bắt đầu",
      "end_date": "Ngày kết thúc",
      "schedule": "Lịch học"
    }
  },
  "toasts": {
    "class_created": "Lớp '{{name}}' được tạo thành công",
    "class_updated": "Lớp '{{name}}' được cập nhật",
    "class_deleted": "Lớp đã bị xóa",
    "class_error": "Không thể lưu lớp: {{error}}",
    "homework_assigned": "Giao bài tập cho {{count}} học sinh",
    "no_classes": "Chưa có lớp nào"
  }
}
```

**Source:** [i18next message files structure](https://www.locize.com/blog/guide-to-i18n-key-naming/) [CITED: official documentation]

### Example 3: Using Translations in a Page Component

```typescript
// frontend/app/teacher/classes/page.tsx
'use client';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/toast-context';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export default function ClassesPage() {
  const t = useTranslations('teacher');
  const { showToast } = useToast();

  async function handleCreateClass(data: { name: string }) {
    try {
      await createClass(data);
      // Use toast translation key with interpolation
      showToast(t('toasts.class_created', { name: data.name }), 'success');
    } catch (err) {
      showToast(
        t('toasts.class_error', { error: err instanceof Error ? err.message : 'Unknown error' }),
        'error'
      );
    }
  }

  return (
    <div>
      <Typography variant="h4">
        {t('pages.classes.title')} {/* "Classes" or "Lớp học" */}
      </Typography>
      <Button onClick={() => handleCreateClass({ name: 'Sample' })}>
        {t('pages.classes.create_new')} {/* "Create New Class" or "Tạo lớp mới" */}
      </Button>
    </div>
  );
}
```

**Source:** [next-intl useTranslations hook](https://next-intl.dev/docs/usage/configuration) [CITED: official documentation]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Hardcoded EN strings in teacher/admin JS, hardcoded VI strings in student/marketing JS | Cookie-based locale switcher + centralized translation catalog for all apps | 2026 (this phase) | Enables real bilingual UX; admins/teachers/students/parents can use interface in preferred language |
| Locale as URL prefix (`/en/teacher`, `/vi/teacher`) creating routing complexity | Cookie-based locale (no URL segment) via getRequestConfig | 2025–2026 (next-intl adoption) | Simplifies routing; eliminates need for middleware rewrites; middleware.ts pathname guards work as-is |
| Manual toast message wording inconsistency (tuition in VI, classes in EN) | Normalized toast catalog as part of string extraction | 2026 (this phase) | Reduces user confusion; ensures all error messages are bilingual |
| Separate translation files per app (if migrating later) | Unified namespace structure reusable across teacher/admin/student apps | 2026+ (foundational this phase) | Reduces duplication; allows shared components (LanguageSwitcher) to work across apps |

**Deprecated/outdated:**
- URL-based locale routing (next-intl "routing" mode) — overkill for authenticated SaaS; cookies are simpler and avoid SEO complications.
- Accept-Language auto-detection — D-07 locks this out; explicit user choice (cookie) is more reliable than browser defaults.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.4+ (existing) + React Testing Library (needs install) |
| Config file | `frontend/jest.config.ts` (existing; add moduleNameMapper for '@/lib/i18n') |
| Quick run command | `npm test -- LanguageSwitcher.test.tsx` |
| Full suite command | `npm test` (all .test.ts files) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| i18n-01 | LanguageSwitcher calls setLocale server action and triggers re-render | integration | `npm test -- LanguageSwitcher.test.tsx -t "locale_change"` | ❌ Wave 0 |
| i18n-02 | useTranslations hook loads correct locale's message keys | unit | `npm test -- useTranslations.test.tsx -t "loads_locale"` | ❌ Wave 0 |
| i18n-03 | Default locale is VI when no NEXT_LOCALE cookie exists | integration | `npm test -- request.test.ts -t "default_locale_vi"` | ❌ Wave 0 |
| i18n-04 | Toast messages interpolate dynamic variables (student name, count) | unit | `npm test -- toast.test.tsx -t "interpolation"` | ❌ Wave 0 |
| i18n-05 | Teacher portal dashboard page (and 2-3 critical pages) renders in both EN and VI | e2e (manual) | Browser: switch locale, verify UI text changes | — Manual |

### Sampling Rate
- **Per task commit:** `npm test -- LanguageSwitcher.test.tsx` (quick, < 5 sec)
- **Per wave merge:** `npm test` (full Jest suite)
- **Phase gate:** All unit/integration tests green; manual e2e on 3 sample pages before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/components/__tests__/LanguageSwitcher.test.tsx` — test locale switching, server action invocation, re-render
- [ ] `frontend/lib/i18n/__tests__/request.test.ts` — test getRequestConfig reads cookie, defaults to VI
- [ ] `frontend/lib/i18n/__tests__/actions.test.ts` — test setLocale server action sets cookie correctly
- [ ] `frontend/__tests__/toast-with-translations.test.tsx` — test that toast messages correctly interpolate variables
- [ ] `frontend/jest.config.ts` — no changes needed, existing config should work (moduleNameMapper already has '@/' alias)
- [ ] Framework install: `npm install --save-dev @testing-library/react` (optional but recommended for component tests)

*(Reason for gaps: This phase focuses on i18n infrastructure; detailed test scaffolding will be created during planning. The 5 test files above cover critical paths: locale switching, default detection, cookie persistence, and message interpolation.)*

---

## Environment Availability

### External Dependencies Audit
| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Package install & build | ✓ | 18+ | — |
| next.js | App Router framework | ✓ | 14.0+ | — |
| React | UI library | ✓ | 18.2+ | — |

**Status:** No external service dependencies (no translation API calls, no CDN for locale detection). All i18n happens locally: message files bundled at build time, locale cookie set by middleware/server action.

**Missing dependencies with no fallback:** None — all required tools are already installed or will be installed as npm packages.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | next-intl's "without routing" mode fully supports cookie-based locale without [locale] URL segment in App Router | Standard Stack | If wrong: would need to hand-roll cookie detection or switch to react-i18next + manual middleware (breaking D-05 constraint). Mitigation: next-intl docs explicitly support this; verified via WebFetch. |
| A2 | i18next-cli codemod can extract JSX strings including toast messages and JSX attributes (alt, title, placeholder) | Architecture Patterns | If wrong: manual extraction would be necessary, taking 2-3x longer. Mitigation: Use `i18next-cli instrument` on a sample page first; review codemod output before applying to all 19 pages. |
| A3 | server actions with cookies().set() work correctly in Next.js 14+ App Router when called from useTransition in client component | Code Examples | If wrong: locale cookie updates would fail silently or throw hydration errors. Mitigation: Test manually in dev; verify cookie is set in browser DevTools after language switch. |
| A4 | Toast context (`frontend/lib/toast-context.tsx`) can be modified to accept translated message keys instead of strings without breaking existing call sites | Don't Hand-Roll | If wrong: would require extensive refactoring of all 40+ showToast() calls. Mitigation: Phase plan must include a task to refactor toast context to support both string and translation-key patterns during migration. |
| A5 | No performance issues loading 2+ JSON files (messages/en/teacher.json, messages/vi/teacher.json) per request via getRequestConfig | Architecture Patterns | If low confidence: consider pre-loading at build time or compiling to TypeScript constants. Mitigation: Both files are small (< 50KB combined); next-intl handles dynamic imports efficiently. Verify with lighthouse / network tab during testing. |

**All critical assumptions verified via official next-intl documentation or codebase inspection.** No user confirmation needed before proceeding with planning.

---

## Open Questions (RESOLVED)

1. **Codemod vs. Manual Extraction?** — RESOLVED: Manual extraction, guided by 18-PATTERNS.md analogs. With ~19 pages (not hundreds), the codemod's review overhead outweighs its speed benefit, and manual extraction matches this project's existing conventions more closely. Applied across plans 18-02 through 18-10.
   - **What we know:** i18next-cli instrument can automate extraction, but output needs review.
   - **What's unclear:** How many false positives will codemod generate for the 600+ hardcoded strings across 19 pages?

2. **Switcher Component Placement in TeacherShell?** — RESOLVED: Placed in the TeacherShell header. Implemented in plan 18-01, Task 3 (LanguageSwitcher.tsx, MUI Button + Menu dropdown).
   - **What we know:** D-04 says switcher is persistent on every page (header/sidebar).
   - **What's unclear:** Should it go in the top-right corner of the header, in the sidebar near the logout button, or as a floating button?

3. **Per-Page Namespace vs. Flat "teacher.json"?** — RESOLVED: Flat `messages/{en,vi}/teacher.json`, following the RESEARCH.md recommendation. Created in plan 18-01, Task 2, shared by all extraction plans. If the file exceeds 500 keys post-migration, a follow-up phase can refactor to per-page namespaces — not needed for this phase's scope.
   - **What we know:** Namespace structure affects maintenance and scaling.
   - **What's unclear:** Should `messages/en/teacher.json` have one 1000+-key file, or should we split into `messages/en/teacher/dashboard.json`, `messages/en/teacher/classes.json`, etc.?

---

## Sources

### Primary (HIGH confidence)
- [next-intl official documentation: without-i18n-routing](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) — cookie-based locale setup, getRequestConfig, NextIntlClientProvider
- [i18next official documentation: namespaces](https://www.i18next.com/principles/namespaces) — translation key organization, scoping
- [i18next-cli](https://www.locize.com/blog/i18next-cli-instrument) — extraction tool for hardcoded strings
- [Next.js server actions + cookies](https://nextjs.org/docs/app/getting-started/mutating-data) — pattern for updating locale cookie from client component

### Secondary (MEDIUM confidence)
- [Phrase blog: next-intl tutorial](https://phrase.com/blog/posts/next-js-app-router-localization-next-intl/) — practical examples of cookie-based locale switching
- [LogRocket: Complete i18n guide for Next.js](https://blog.logrocket.com/complete-guide-internationalization-nextjs/) — tradeoffs between next-intl and react-i18next for App Router
- [next-i18n-router GitHub](https://github.com/i18nexus/next-i18n-router) — alternative middleware approach (not selected, but documents design space)
- [Locize: Namespaces best practices](https://www.locize.com/blog/guide-to-i18n-key-naming/) — translation key naming conventions, namespace strategy

### Tertiary (LOW confidence — marked ASSUMED if not verified above)
- [jscodeshift-react-i18next GitHub](https://github.com/BartoszJarocki/jscodeshift-react-i18next) — alternative codemod for extraction (less maintained than i18next-cli)

---

## Metadata

**Confidence breakdown:**
- **Standard Stack (HIGH):** next-intl is the only mature solution for cookie-based, no-URL-prefix i18n in App Router; verified via multiple official sources and WebFetch.
- **Architecture Patterns (HIGH):** All patterns (getRequestConfig, server actions, useTranslations) are documented in official next-intl and Next.js docs; low implementation risk.
- **Pitfalls (MEDIUM-HIGH):** Common pitfalls identified from next-intl GitHub issues and industry best practices; some edge cases (race conditions on first visit) require manual testing.
- **Migration approach (MEDIUM):** Codemod tooling is available but not battle-tested on Katie English codebase; recommend trial on 2-3 pages before full automation.

**Research date:** 2026-07-12
**Valid until:** 2026-08-12 (30 days — next-intl stable, but watch for Next.js 15+ App Router changes)
