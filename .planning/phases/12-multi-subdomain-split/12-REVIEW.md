---
phase: 12-multi-subdomain-split
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - backend/src/game/game-auth.controller.ts
  - backend/src/game/game.dto.ts
  - backend/src/game/game.module.ts
  - backend/src/game/game.service.ts
  - docker-compose.yml
  - frontend/app/403/page.tsx
  - frontend/app/admin/layout.tsx
  - frontend/app/admin/login/page.tsx
  - frontend/app/api/auth/admin-login/route.ts
  - frontend/app/api/auth/logout/route.ts
  - frontend/app/api/auth/student-login/route.ts
  - frontend/app/api/auth/teacher-login/route.ts
  - frontend/app/game/layout.tsx
  - frontend/app/game/login/page.tsx
  - frontend/app/login/page.tsx
  - frontend/app/not-found.tsx
  - frontend/app/teacher/layout.tsx
  - frontend/app/teacher/login/page.tsx
  - frontend/lib/admin-auth.ts
  - frontend/lib/auth.ts
  - frontend/middleware.ts
  - frontend/package.json
findings:
  critical: 5
  warning: 5
  info: 3
  total: 13
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-06-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

This phase introduces a multi-subdomain architecture routing admin, teacher, and student users through separate subdomains (`admin.katie-english.com.vn`, `app.katie-english.com.vn`, `student.katie-english.com.vn`) with subdomain-specific JWT cookies and a new `GameAuthController` for student class-code login. The scope covers the NestJS game authentication endpoint, cookie-setting route handlers, a Next.js middleware routing gate, and several layout guards.

The auth architecture has several correctness and security defects: hardcoded credentials in docker-compose, token value truncation for cookie values containing `=`, a missing rate limit on the student game-login endpoint, unverified JWT roles accepted as authorization proof in every client-side layout, and a logout handler that deletes cookies without the domain qualifier used at set time. Additionally the `NEXT_PUBLIC_SUBDOMAIN` env var is not forwarded to the Docker container, meaning subdomain detection silently falls back to host-header parsing in production.

---

## Critical Issues

### CR-01: Hardcoded default passwords committed in docker-compose.yml

**File:** `docker-compose.yml:5,22,39,43,47-48`
**Issue:** Literal passwords (`Pass1234!`) are hardcoded for PostgreSQL, MinIO, the backend `DATABASE_URL`, `MINIO_SECRET_KEY`, `TEACHER_EMAIL`, and `TEACHER_PASSWORD`. Any developer who clones this repository and runs `docker compose up` immediately has a working system with well-known credentials. The teacher seeding credentials in particular create a persistent privileged account with a publicly known password.
**Fix:** Replace all hardcoded secrets with `${VAR}` env-var substitution with no default (so compose fails fast rather than silently using the insecure default), and document in a `.env.example` what values callers must supply:
```yaml
# docker-compose.yml
postgres:
  environment:
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

backend:
  environment:
    DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/phonics
    MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
    TEACHER_EMAIL: ${TEACHER_EMAIL}
    TEACHER_PASSWORD: ${TEACHER_PASSWORD}
```
The admin credential already uses `${ADMIN_PASSWORD:-Admin1234!}` — the same `:-fallback` pattern must be removed or replaced with a required `${VAR}` (no default).

---

### CR-02: Cookie value truncated at first `=` — tokens with base64 padding silently broken

**File:** `frontend/lib/admin-auth.ts:24`, `frontend/lib/auth.ts:25`
**Issue:** Both `getAdminToken()` and `getToken()` read the token back from a non-HttpOnly cookie using `.split('=')[1]`. JWT tokens in base64url encoding frequently contain trailing `=` padding, and cookie values themselves may include `=` signs. Using index `[1]` of a split on `=` drops everything after the first equals sign, producing a malformed token. Every downstream API call with that truncated token will receive a 401.

Compare the correct handling already used in the layout guards (e.g. `admin/layout.tsx:31: c.split('=').slice(1).join('=')`). The lib helpers use the wrong variant.

```typescript
// frontend/lib/admin-auth.ts  line 24 — WRONG
return document.cookie.split(';').find(...)?.split('=')[1] ?? null;

// CORRECT (matches the pattern used in layouts)
return document.cookie.split(';').find(c => c.trim().startsWith('admin-token='))
  ?.split('=').slice(1).join('=') ?? null;
```
Apply the same fix to `frontend/lib/auth.ts:25`.

---

### CR-03: Student game-login endpoint has no rate-limiting — trivial enumeration of class codes and student names

**File:** `backend/src/game/game-auth.controller.ts:9-13`
**Issue:** The `POST /game/auth/login` endpoint carries no `@UseGuards(ThrottlerGuard)` and no `@Throttle(...)` decorator. By contrast, the admin login endpoint (`backend/src/admin/admin-auth.controller.ts`) is explicitly throttled at 5 attempts / 60 s. An unauthenticated attacker can enumerate all valid class codes and student names in the system at unrestricted speed with no lockout.
**Fix:**
```typescript
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';

@Controller('game')
export class GameAuthController {
  @Post('auth/login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  gameLogin(@Body() dto: GameLoginDto) {
    return this.service.gameLogin(dto.classCode, dto.name);
  }
}
```

---

### CR-04: Logout route deletes cookies without subdomain `domain` attribute — cookies set with `domain=X.katie-english.com.vn` are not cleared

**File:** `frontend/app/api/auth/logout/route.ts:6-8`
**Issue:** The three auth route handlers set cookies in production with a per-subdomain `domain` attribute (e.g. `domain: 'admin.katie-english.com.vn'`). The logout route clears all three cookies using only `{ maxAge: 0, path: '/' }` — no `domain` attribute. A cookie set with `domain=admin.katie-english.com.vn` and one set without a domain attribute are distinct browser cookie jars; clearing without the domain will leave the HttpOnly production cookie intact. After logout the session cookie persists and the middleware continues to grant access.
**Fix:**
```typescript
// frontend/app/api/auth/logout/route.ts
export async function POST(_req: Request) {
  const cookieStore = cookies();
  const isProd = process.env.NODE_ENV === 'production';
  const clear = (name: string, domain?: string) =>
    cookieStore.set(name, '', {
      maxAge: 0,
      path: '/',
      ...(isProd && domain ? { domain } : {}),
    });
  clear('teacher-token', 'app.katie-english.com.vn');
  clear('admin-token', 'admin.katie-english.com.vn');
  clear('student-token', 'student.katie-english.com.vn');
  return NextResponse.json({ ok: true });
}
```

---

### CR-05: `NEXT_PUBLIC_SUBDOMAIN` is not injected into the Docker frontend container — host-header detection is the only fallback

**File:** `docker-compose.yml:77-93`
**Issue:** The `frontend` service's `environment` block sets `NEXT_PUBLIC_LOGIN_URL`, `NEXT_PUBLIC_ADMIN_ORIGIN`, `NEXT_PUBLIC_APP_ORIGIN`, and `NEXT_PUBLIC_STUDENT_ORIGIN` but does NOT set `NEXT_PUBLIC_SUBDOMAIN`. In the middleware, the env-var override is the primary and intended subdomain detection mechanism (`detectSubdomain` checks `process.env.NEXT_PUBLIC_SUBDOMAIN` first). Without it the system falls back to host-header parsing, which only works if the three subdomains terminate at the same single container. If a load balancer or CDN rewrites the `Host` header, or if a single container serves all three subdomains (the common Docker Compose deployment), `detectSubdomain` will return `'unknown'` for any request not matching `admin.`, `app.`, or `student.` prefixes, rewriting all pages to `/not-found`.

In the current compose file there is only one `frontend` service; it cannot simultaneously be `admin.`, `app.`, and `student.` — so at least two subdomains will always fall through to `'unknown'` in production.
**Fix:** Add `NEXT_PUBLIC_SUBDOMAIN` to the compose environment (or document the expected Nginx/Traefik routing topology and remove the env-var path):
```yaml
frontend:
  environment:
    NEXT_PUBLIC_SUBDOMAIN: ${NEXT_PUBLIC_SUBDOMAIN:-app}   # or split into 3 services
```

---

## Warnings

### WR-01: Client-side JWT role check trusts an unverified claim — layouts can be bypassed by crafting a cookie

**File:** `frontend/app/admin/layout.tsx:35-45`, `frontend/app/teacher/layout.tsx:33-45`, `frontend/app/game/layout.tsx:31-35`
**Issue:** All three layout guards decode the JWT role from the cookie using a simple `atob(token.split('.')[1])` call and then make access control decisions on the decoded `role` field — without verifying the JWT signature. A user can forge any cookie value with an arbitrary payload (`{ "role": "ADMIN" }`) and satisfy the client-side check. The middleware also decodes but explicitly does not enforce role (per comment at `middleware.ts:119`). This means the only enforcement is the backend, but the UI will render the protected admin/teacher shell for forged tokens, leaking any data that is fetched from the backend before those API calls fail.

For the read/display path this is a UI information disclosure issue. The backend still enforces authz, but displaying admin UI to an attacker (while their forged token is rejected by the API) may leak page structure and internal routing details.
**Fix:** For client-side layout guards, consider sending the token to a server-side `/api/auth/verify` endpoint (which can verify the signature) rather than decoding client-side. At minimum, document clearly that layout auth is defense-in-depth only and the backend is the sole authoritative gate.

---

### WR-02: `GameLoginDto` has no input validation decorators — empty or extremely long strings accepted without error

**File:** `backend/src/game/game.dto.ts:25-28`
**Issue:** `GameLoginDto.classCode` and `GameLoginDto.name` carry no `class-validator` decorators (`@IsString()`, `@IsNotEmpty()`, `@MaxLength()`). Because the NestJS app does not appear to have a global `ValidationPipe` (no `app.useGlobalPipes(new ValidationPipe())` was found in `main.ts`), even if decorators were added they would not run. As a result: an attacker can send `{ classCode: "", name: "" }` which triggers a Prisma lookup with an empty string, or an arbitrarily large payload (tens of megabytes) for the `name` field which is then lower-cased and compared with every student name in the class.
**Fix:** Add a global `ValidationPipe` in `main.ts` and add validation decorators to `GameLoginDto`:
```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

// game.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
export class GameLoginDto {
  @IsString() @IsNotEmpty() @MaxLength(20)
  classCode: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;
}
```

---

### WR-03: Wildcard CORS on backend allows any origin to make credentialed-equivalent requests

**File:** `backend/src/main.ts:35`
**Issue:** `app.enableCors({ origin: '*' })` allows any origin to call the backend API. For this phase this creates a direct attack surface: any website can make cross-origin requests to `/game/auth/login` (no credentials required, but response body contains a JWT), and once the student has a cookie from `student.katie-english.com.vn`, any page loaded in the same browser can read the API response if `credentials: 'include'` is ever added. The admin and teacher login endpoints are similarly wide open: a phishing page can direct users to `POST /admin/auth/login` and harvest the token from the response JSON.
**Fix:** Restrict CORS to the known frontend origins:
```typescript
app.enableCors({
  origin: [
    process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'https://admin.katie-english.com.vn',
    process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://app.katie-english.com.vn',
    process.env.NEXT_PUBLIC_STUDENT_ORIGIN ?? 'https://student.katie-english.com.vn',
  ],
  credentials: true,
});
```

---

### WR-04: `admin-auth.ts` `setAdminAuth` writes a non-HttpOnly, non-Secure client cookie in production — contradicts the HttpOnly server cookie

**File:** `frontend/lib/admin-auth.ts:36-38`
**Issue:** `setAdminAuth()` writes the admin JWT directly to a JavaScript-accessible cookie (`document.cookie = admin-token=...`). In production the Route Handler also sets an HttpOnly cookie with the same name. The non-HttpOnly version set by `setAdminAuth` overwrites (or coexists with, depending on browser) the HttpOnly one and is readable by any script running on the page, exposing the admin token to XSS. The comment calls this a "transitional fallback" (T-12-02-03) but the path that calls `setAdminAuth` (`adminLogin` in `lib/admin-auth.ts`) is currently dead — `adminLogin` is never imported in the reviewed files. The function is unreachable dead code, but it is exported and could be called from unreviewed pages; the pattern itself is dangerous.
**Fix:** Remove `setAdminAuth` and `adminLogin` from `lib/admin-auth.ts` entirely if the route-handler-based flow (`/api/auth/admin-login`) is the intended path. The `getAdminUser()` function reads from `localStorage` which is fine for display, but tokens should come exclusively from the HttpOnly cookie.

---

### WR-05: `app.katie-english.com.vn/login` redirect silently replaces teacher login bookmark but not student path — route containment gap

**File:** `frontend/middleware.ts:92-94`
**Issue:** The `app` subdomain config lists `allowedPrefixes: ['/teacher']`. A request to `app.katie-english.com.vn/login` is special-cased to redirect to `/teacher/login` (line 92-94) before the allowedPrefixes check. However, the student login path `/login` is not in `allowedPrefixes` for `app`. If this special case is removed or mis-ordered, any `app.katie-english.com.vn/login` request (which is a common direct bookmark) would hit the "not allowed" rewrite and show `/not-found` instead of redirecting to the teacher login. The intent is correct but the guard is fragile — the order of conditions in the middleware is load-bearing and undocumented.

Additionally, the `/api` prefix is not in any subdomain's `allowedPrefixes`, meaning Next.js API routes (`/api/auth/admin-login`, etc.) on the `admin` subdomain would be blocked by the `isAllowed` check and rewritten to `/not-found` unless the matcher excludes them. The current matcher at line 133-135 only excludes `_next/static`, `_next/image`, and `favicon.ico` — not `/api/`. This means calls to `/api/auth/admin-login` from `admin.katie-english.com.vn` may fail in production.
**Fix:** Add `/api` to `allowedPrefixes` for each subdomain (or add an early-return for `/api/` paths before the prefix check):
```typescript
// middleware.ts — add before the isAllowed check
if (pathname.startsWith('/api/')) {
  return NextResponse.next();
}
```

---

## Info

### IN-01: `app/login/page.tsx` is unreachable on the `app` subdomain — dead route

**File:** `frontend/app/login/page.tsx`
**Issue:** The `app` subdomain middleware redirects `/login` to `/teacher/login` (line 92-94 of middleware) before rendering the page at `/login`. The `app/login/page.tsx` file contains a role-picker for both Teacher and Student — but it is never rendered on `app.katie-english.com.vn` (redirected) and is not reachable on any other subdomain (the student subdomain shows `game/login/page.tsx`). This page is dead code under the new routing architecture.

---

### IN-02: `frontend/app/not-found.tsx` is a client component without `'use client'` directive rendered by server via `NextResponse.rewrite`

**File:** `frontend/app/not-found.tsx:1`
**Issue:** The file starts with `'use client'` but is served via `NextResponse.rewrite(new URL('/not-found', req.url))` in the middleware. Next.js middleware rewrites route at the edge; the rewritten path `/not-found` maps to `app/not-found.tsx`. The `'use client'` directive is fine for this file — but note that `process.env.NEXT_PUBLIC_ADMIN_ORIGIN` in the button `href` attributes (lines 56, 64, 72) will be `undefined` at runtime if the env var is not set at build time (NEXT_PUBLIC vars are baked in at build). In Docker, these env vars are in the `frontend` service environment, which works for `next start`, but a mismatch between build-time and run-time values is a common source of wrong-URL buttons.

---

### IN-03: `frontend/app/403/page.tsx` uses a module-level `process.env.NEXT_PUBLIC_SUBDOMAIN` that is always an empty string in Docker

**File:** `frontend/app/403/page.tsx:8-12`
**Issue:** The accent colour for the 403 page is computed from `process.env.NEXT_PUBLIC_SUBDOMAIN` at module load time. As established in CR-05, `NEXT_PUBLIC_SUBDOMAIN` is not set in the Docker frontend service environment. The variable will always be `''`, so the accent colour will always be the default orange (`#F0623A`) regardless of subdomain — meaning the admin 403 page will show orange instead of the intended admin blue (`#4F9DFF`). This is a purely cosmetic issue.

---

_Reviewed: 2026-06-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
