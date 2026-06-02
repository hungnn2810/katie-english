---
phase: 12-multi-subdomain-split
fix_scope: critical_warning
fixed_at: 2026-06-02T17:00:00Z
review_path: .planning/phases/12-multi-subdomain-split/12-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 12: Code Review Fix Report

**Fixed at:** 2026-06-02T17:00:00Z
**Source review:** .planning/phases/12-multi-subdomain-split/12-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (5 Critical + 5 Warning)
- Fixed: 10
- Skipped: 0

---

## Fixed Issues

### CR-01: Hardcoded default passwords committed in docker-compose.yml

**Files modified:** `docker-compose.yml`, `.env.example`
**Commit:** `1e95c13`
**Applied fix:** Replaced all hardcoded `Pass1234!` and `Admin1234!` literals with required `${VAR}` substitutions (no fallback defaults) for `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `MINIO_SECRET_KEY`, `TEACHER_EMAIL`, `TEACHER_PASSWORD`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Removed `:-Admin1234!` fallback from admin credentials. Created `.env.example` documenting all required variables with empty values. CR-05 (missing `NEXT_PUBLIC_SUBDOMAIN`) was also addressed in this same commit since it touches the same file.

---

### CR-02: Cookie value truncated at first `=` — tokens with base64 padding silently broken

**Files modified:** `frontend/lib/admin-auth.ts`, `frontend/lib/auth.ts`
**Commit:** `abded4d`
**Applied fix:** Changed `.split('=')[1]` to `.split('=').slice(1).join('=')` in both `getAdminToken()` (admin-auth.ts:24) and `getToken()` (auth.ts:25). This preserves the full token value including any `=` padding characters in the base64url-encoded JWT, matching the correct pattern already used in the layout guards.

---

### CR-03: Student game-login endpoint has no rate-limiting

**Files modified:** `backend/src/game/game-auth.controller.ts`, `backend/src/app.module.ts`
**Commit:** `e7f4397`
**Applied fix:** Added `@UseGuards(ThrottlerGuard)` and `@Throttle({ default: { limit: 10, ttl: 60_000 } })` decorators to the `gameLogin` handler. Registered a `{ name: 'default', ttl: 60_000, limit: 10 }` throttler config alongside the existing `admin-login` config in `ThrottlerModule.forRoot()` in `AppModule` so the named `default` bucket resolves correctly.

---

### CR-04: Logout route deletes cookies without domain attribute

**Files modified:** `frontend/app/api/auth/logout/route.ts`
**Commit:** `b21eec5`
**Applied fix:** Replaced the three bare `cookieStore.set(name, '', { maxAge: 0, path: '/' })` calls with a `clear(name, domain)` helper that conditionally includes `domain` when `NODE_ENV === 'production'`. Each cookie is now cleared with its corresponding subdomain (`app.katie.vn`, `admin.katie.vn`, `student.katie.vn`) so the browser expires the correct HttpOnly production cookie instead of a different same-name cookie without a domain qualifier.

---

### CR-05: `NEXT_PUBLIC_SUBDOMAIN` not injected into Docker frontend container

**Files modified:** `docker-compose.yml`, `.env.example`
**Commit:** `1e95c13` (committed together with CR-01)
**Applied fix:** Added `NEXT_PUBLIC_SUBDOMAIN: ${NEXT_PUBLIC_SUBDOMAIN:-app}` to the `frontend` service environment block in `docker-compose.yml`. The `:-app` fallback matches the reviewer's suggested format and ensures single-container local dev resolves to `app` subdomain by default. `.env.example` documents that multi-container deployments should run three frontend services with different values for this variable.

---

### WR-01: Client-side JWT role check trusts an unverified claim

**Files modified:** `frontend/app/admin/layout.tsx`, `frontend/app/teacher/layout.tsx`, `frontend/app/game/layout.tsx`
**Commit:** `41a7784`
**Applied fix:** Added explicit `SECURITY NOTE (WR-01)` comments to the `decodeJwtRole` function in all three layout guards, clearly documenting that client-side JWT decoding is defense-in-depth UX only (no signature verification) and that the backend is the sole authoritative authorization gate. A full server-side `/api/auth/verify` endpoint was not added as it would be a new feature beyond a fix pass, and the backend already enforces authz on every API call.
**Note:** Requires human verification — this is a design/documentation fix; the underlying pattern (unverified role decode) remains unchanged by intent.

---

### WR-02: `GameLoginDto` has no input validation decorators

**Files modified:** `backend/src/game/game.dto.ts`, `backend/src/main.ts`
**Commit:** `f925759`
**Applied fix:** Added `@IsString()`, `@IsNotEmpty()`, and `@MaxLength(20)` to `classCode` and `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` to `name` in `GameLoginDto`, importing from `class-validator`. Added `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` to `bootstrap()` in `main.ts` (importing `ValidationPipe` from `@nestjs/common`) so the decorators are actually enforced at runtime.

---

### WR-03: Wildcard CORS on backend allows any origin

**Files modified:** `backend/src/main.ts`
**Commit:** `fbd9727`
**Applied fix:** Replaced `app.enableCors({ origin: '*' })` with an explicit allowlist of the three frontend origins read from `NEXT_PUBLIC_ADMIN_ORIGIN`, `NEXT_PUBLIC_APP_ORIGIN`, and `NEXT_PUBLIC_STUDENT_ORIGIN` env vars (with `https://` production fallbacks), plus `credentials: true`. This prevents cross-origin requests from arbitrary pages and aligns with the subdomain architecture.

---

### WR-04: `admin-auth.ts` `setAdminAuth` writes non-HttpOnly client cookie

**Files modified:** `frontend/lib/admin-auth.ts`
**Commit:** `9cddff2`
**Applied fix:** Removed `setAdminAuth()`, `adminLogin()`, and the now-unused `parseApiError` helper and `API_URL` constant from `admin-auth.ts` entirely. `adminLogin` was dead code (never imported in any reviewed file) and `setAdminAuth` was its only caller. The `/api/auth/admin-login` route handler is the authoritative login path and sets an HttpOnly cookie; the removed functions wrote a parallel JS-accessible cookie exposing the token to XSS.

---

### WR-05: `/api` prefix not in `allowedPrefixes` — API routes blocked in production

**Files modified:** `frontend/middleware.ts`
**Commit:** `359164f`
**Applied fix:** Added an early-return `if (pathname.startsWith('/api/')) { return NextResponse.next(); }` before the `isAllowed` check in middleware. Without this, all Next.js API route calls (e.g. `/api/auth/admin-login` from `admin.katie.vn`) would be rewritten to `/not-found` since `/api` is absent from every subdomain's `allowedPrefixes`, breaking every auth flow in production.

---

## Skipped Issues

None — all 10 in-scope findings were fixed.

---

_Fixed: 2026-06-02T17:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
