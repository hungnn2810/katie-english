# Phase 12: Multi-Subdomain Split — Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 7 new/modified files
**Analogs found:** 6 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/middleware.ts` | middleware | request-response | (none — file does not exist) | no analog |
| `frontend/lib/cookie-auth.ts` | utility | request-response | `frontend/lib/auth.ts` | role-match |
| `frontend/app/login/page.tsx` (modify) | component | request-response | `frontend/app/login/page.tsx` | exact (self) |
| `frontend/app/admin/login/page.tsx` (modify) | component | request-response | `frontend/app/admin/login/page.tsx` | exact (self) |
| `frontend/app/teacher/layout.tsx` (modify) | middleware/guard | request-response | `frontend/app/admin/layout.tsx` | exact |
| `frontend/app/game/layout.tsx` (modify) | layout | request-response | `frontend/app/admin/layout.tsx` | role-match |
| `docker-compose.yml` (modify) | config | — | `docker-compose.yml` | exact (self) |

---

## Pattern Assignments

### `frontend/middleware.ts` (new file — no analog)

There is **no existing `middleware.ts`** in the project. This is a net-new Next.js Edge middleware file.

**What to create:** A Next.js middleware that reads the `Host` header and rewrites the path based on subdomain, so the single Next.js build serves three logical apps.

**Reference pattern (from Next.js docs / RESEARCH.md):**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const url = req.nextUrl.clone();

  if (host.startsWith('admin.')) {
    url.pathname = url.pathname.startsWith('/admin')
      ? url.pathname
      : `/admin${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  if (host.startsWith('app.')) {
    url.pathname = url.pathname.startsWith('/teacher')
      ? url.pathname
      : `/teacher${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  if (host.startsWith('student.')) {
    url.pathname = url.pathname.startsWith('/game')
      ? url.pathname
      : `/game${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Key constraint:** Must NOT run on `_next/static`, `_next/image`, or `favicon.ico` — use the negative-lookahead matcher shown above.

**next.config.js note:** Current config (`frontend/next.config.js` lines 1–17) uses `output: 'standalone'` — the middleware file will be picked up automatically by Next.js; no config change needed for the matcher.

---

### `frontend/lib/cookie-auth.ts` (new utility)

**Analog:** `frontend/lib/auth.ts` (localStorage-based, lines 20–44) and `frontend/lib/admin-auth.ts` (lines 19–45).

**Why a new file:** The middleware runs on the Edge and cannot read `localStorage`. Auth tokens must be stored in cookies (accessible to both client JS and Edge middleware) for subdomain-gated redirects to work. This utility wraps `document.cookie` reads/writes with the same interface shape as `auth.ts`.

**Imports pattern to copy from `frontend/lib/auth.ts` lines 1 and 41–44:**
```typescript
// Same API_URL pattern
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Same AuthHeaders shape
export function authHeaders(): HeadersInit {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}
```

**What must differ from `auth.ts`:**
- `getToken()` reads `document.cookie` (parse `token=...`) instead of `localStorage.getItem('token')`
- `setAuth()` writes `document.cookie = \`token=...; path=/; SameSite=Lax\`` instead of `localStorage.setItem`
- Cookie must be set with `domain=.katie-english.com.vn` in production so all three subdomains can read it
- Keep `localStorage` reads as fallback during transition so existing sessions don't break

**Interface to preserve (from `frontend/lib/auth.ts` lines 13–18):**
```typescript
export interface AuthUser {
  id: number;
  upn: string;
  role: 'TEACHER' | 'STUDENT';
  studentId?: number;
}
```

**Admin variant to preserve (from `frontend/lib/admin-auth.ts` lines 13–17):**
```typescript
export interface AdminUser {
  id: number;
  email: string;
  role: 'ADMIN';
}
```

---

### `frontend/app/login/page.tsx` (modify — teacher/student login)

**Analog:** `frontend/app/login/page.tsx` (self, lines 62–81).

**Current redirect logic (lines 74–75):**
```typescript
const user = await login(upn, password);
router.push(user.role === 'TEACHER' ? '/teacher' : '/game/homework');
```

**What must differ for subdomain split:**
- After successful login, instead of `router.push(...)`, redirect to the appropriate subdomain origin:
  ```typescript
  // Teacher → app.katie-english.com.vn/teacher
  // Student → student.katie-english.com.vn/game/homework
  window.location.href = user.role === 'TEACHER'
    ? `${process.env.NEXT_PUBLIC_APP_ORIGIN}/teacher`
    : `${process.env.NEXT_PUBLIC_STUDENT_ORIGIN}/game/homework`;
  ```
- `setAuth()` call (inside `login()` in `frontend/lib/auth.ts` line 54) must write a cross-subdomain cookie instead of localStorage.

**Current `setAuth` call (via `frontend/lib/auth.ts` lines 31–34):**
```typescript
export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
```
Replace with cookie write using `cookie-auth.ts`.

---

### `frontend/app/admin/login/page.tsx` (modify — admin login)

**Analog:** `frontend/app/admin/login/page.tsx` (self, lines 21–36).

**Current redirect (line 27):**
```typescript
router.push('/admin');
```

**What must differ:**
```typescript
window.location.href = `${process.env.NEXT_PUBLIC_ADMIN_ORIGIN}/admin`;
```

**Current `setAdminAuth` (via `frontend/lib/admin-auth.ts` lines 30–33):**
```typescript
export function setAdminAuth(token: string, user: AdminUser) {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
}
```
Replace with cookie write; use key `admin_token` in cookie to avoid collision with `token`.

---

### `frontend/app/teacher/layout.tsx` (modify — auth guard)

**Analog:** `frontend/app/admin/layout.tsx` (exact pattern, lines 17–48).

**Current teacher guard (lines 23–27):**
```typescript
useEffect(() => {
  const u = getUser();
  if (!u || u.role !== 'TEACHER') { router.replace('/login'); return; }
  setUser(u);
}, [router]);
```

**What must differ:** The `router.replace('/login')` target changes. On `app.katie-english.com.vn`, the login page lives at the main domain (or `app.katie-english.com.vn/login`). Use an env var:
```typescript
if (!u || u.role !== 'TEACHER') {
  window.location.replace(process.env.NEXT_PUBLIC_LOGIN_URL ?? '/login');
  return;
}
```

Also update `getUser()` import to read from cookie instead of localStorage.

**Admin layout bypass pattern to copy (lines 23–24):**
```typescript
// Bypass auth gate for login page to prevent redirect loop
if (pathname === '/admin/login') return;
```
Teacher layout does not currently have this guard — it is safe to omit since `/teacher/login` does not exist.

---

### `frontend/app/game/layout.tsx` (modify — student auth guard)

**Analog:** `frontend/app/admin/layout.tsx` (lines 17–48) — the game layout currently has NO auth guard (only a ThemeProvider wrapper, lines 1–11).

**Current game layout (all 11 lines):**
```typescript
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

**What must be added:** A `useEffect` auth guard copied from `frontend/app/teacher/layout.tsx` (lines 22–27), wrapping children in ThemeProvider only after auth is confirmed. On failure, redirect to student login page:
```typescript
if (!u || u.role !== 'STUDENT') {
  window.location.replace(process.env.NEXT_PUBLIC_LOGIN_URL ?? '/login');
  return;
}
```

---

### `docker-compose.yml` (modify — env vars)

**Analog:** `docker-compose.yml` (self, lines 77–87 for the frontend service).

**Current frontend env block (lines 81–83):**
```yaml
frontend:
  environment:
    NEXT_PUBLIC_API_URL: http://localhost:3001
```

**What must be added:** Three new `NEXT_PUBLIC_*` origin env vars so login pages can redirect across subdomains:
```yaml
frontend:
  environment:
    NEXT_PUBLIC_API_URL: http://localhost:3001
    NEXT_PUBLIC_ADMIN_ORIGIN: http://admin.katie-english.com.vn   # or http://localhost:3000 in dev
    NEXT_PUBLIC_APP_ORIGIN: http://app.katie-english.com.vn
    NEXT_PUBLIC_STUDENT_ORIGIN: http://student.katie-english.com.vn
    NEXT_PUBLIC_LOGIN_URL: http://app.katie-english.com.vn/login   # canonical login page
```

**Docker env var style to follow (from lines 49–50):**
```yaml
ADMIN_EMAIL: ${ADMIN_EMAIL:-admin@katie-english.com}
ADMIN_PASSWORD: ${ADMIN_PASSWORD:-Admin1234!}
```
Use `${VAR:-default}` syntax for values that differ between dev/prod.

---

## Shared Patterns

### Token Storage (localStorage → Cookie)
**Source:** `frontend/lib/auth.ts` lines 20–38, `frontend/lib/admin-auth.ts` lines 19–38
**Apply to:** `cookie-auth.ts`, modified `auth.ts`, modified `admin-auth.ts`

All three token keys in use today:
- `token` — teacher/student JWT
- `user` — serialized `AuthUser` JSON
- `admin_token` — admin JWT
- `admin_user` — serialized `AdminUser` JSON

Cookie equivalents must use identical key names so existing code that reads `localStorage` and any new code that reads cookies can coexist during a phased rollout.

### Auth Guard Pattern
**Source:** `frontend/app/admin/layout.tsx` lines 17–48, `frontend/app/teacher/layout.tsx` lines 18–43
**Apply to:** `game/layout.tsx` (add guard), `teacher/layout.tsx` (update redirect target)

Both guards use the same three-state model:
```typescript
const [user, setUser] = useState<T | null | undefined>(undefined);
// undefined = loading, null = unauthenticated (redirect in flight), T = authenticated
```
Loading state renders `<CircularProgress size={32} />` centered on `minHeight: '100vh'`.

### Backend JWT Response Shape
**Source:** `backend/src/auth/auth.service.ts` lines 22–25, `backend/src/admin/admin-auth.service.ts` lines 22–23

Both auth endpoints return the same envelope — **no `Set-Cookie` header** is issued by the backend. Token storage is entirely client-side.

Teacher/Student response:
```typescript
return { token, user: { id, upn, role, studentId } };
```
Admin response:
```typescript
return { token, user: { id, email: user.upn, role: 'ADMIN' } };
```

The frontend reads `data.token` and `data.user` (see `auth.ts` line 54, `admin-auth.ts` line 55). This pattern is unchanged for Phase 12 — only where the token is stored changes (cookie instead of localStorage).

### Error Handling Pattern
**Source:** `frontend/lib/auth.ts` lines 3–11 (`parseApiError`)
**Apply to:** `cookie-auth.ts` — copy verbatim.

```typescript
async function parseApiError(res: Response): Promise<never> {
  const text = await res.text();
  let message = text;
  try {
    const json = JSON.parse(text);
    message = Array.isArray(json.message) ? json.message.join(', ') : (json.message ?? text);
  } catch { /* not JSON */ }
  throw new Error(message || 'An error occurred. Please try again.');
}
```

### next.config.js headers
**Source:** `frontend/next.config.js` lines 3–15

The `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` headers are applied to all routes. With subdomain splitting, these COOP/COEP headers must continue to apply. No change needed — the wildcard `source: '/(.*)'` still covers all routes after middleware rewriting.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/middleware.ts` | middleware | request-response | Next.js Edge middleware does not exist anywhere in this project |

---

## Metadata

**Analog search scope:** `frontend/lib/`, `frontend/app/`, `backend/src/auth/`, `backend/src/admin/`, `docker-compose.yml`, `frontend/next.config.js`
**Files scanned:** 12
**Pattern extraction date:** 2026-06-02
