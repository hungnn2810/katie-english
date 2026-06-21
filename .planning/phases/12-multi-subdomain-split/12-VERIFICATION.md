---
phase: 12-multi-subdomain-split
verified: 2026-06-02T12:00:00Z
status: gaps_found
score: 14/17 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Visiting student.*/login shows a split-panel page with Class Code + Your Name fields and an Enter Class button in #A78BFA"
    status: failed
    reason: "The middleware student loginPath is '/login'. Unauthenticated students navigating to /login on student subdomain see the OLD combined teacher+student login page (frontend/app/login/page.tsx), NOT the class-code form at /game/login. Additionally, /game/login itself is unreachable without a student-token cookie because middleware redirects /game/login to /login (since '/game/login' !== loginPath '/login')."
    artifacts:
      - path: "frontend/middleware.ts"
        issue: "SUBDOMAIN_CONFIG.student.loginPath = '/login' causes middleware to redirect all unauthenticated /game/** requests (including /game/login) to /login — the old combined login page"
      - path: "frontend/app/login/page.tsx"
        issue: "Renders the combined TEACHER/STUDENT role picker, not the class-code form. Does not detect NEXT_PUBLIC_SUBDOMAIN to show a student-specific UI."
      - path: "frontend/app/game/layout.tsx"
        issue: "Redirects to '/game/login' (client-side) but middleware fires first on server and redirects to '/login' instead. The game/layout.tsx redirect to /game/login is effectively dead code for initial page loads."
    missing:
      - "Either change middleware student loginPath from '/login' to '/game/login' AND add '/game/login' to allowedPrefixes (already '/game' prefix covers it) so unauthenticated students are redirected to /game/login, OR redirect from /login to /game/login when NEXT_PUBLIC_SUBDOMAIN=student"
  - truth: "frontend/app/game/layout.tsx redirects to /login (student login) if student-token cookie is absent or decodes to non-STUDENT role"
    status: failed
    reason: "The plan must-have says the layout redirects to '/login' but actual code redirects to '/game/login'. More importantly, this redirect never fires for initial page loads because middleware already intercepts the request server-side and redirects to '/login'. The client-side layout redirect only works for in-app SPA navigation (not initial loads). This truth combines a wording conflict with a functional gap."
    artifacts:
      - path: "frontend/app/game/layout.tsx"
        issue: "window.location.replace('/game/login') — redirects to /game/login, not /login. Also unreachable by middleware redirect for initial page loads."
    missing:
      - "Align middleware student loginPath with game/layout.tsx redirect target. If game/login is the correct student login URL, middleware loginPath must be '/game/login' (which is still within '/game' allowedPrefix)."
deferred: []
human_verification:
  - test: "Navigate directly to student.katie-english.com.vn/login with no cookies"
    expected: "Student should see the class code + name login form (purple #A78BFA, 'Enter Your Class' heading)"
    why_human: "Requires running the Next.js app with NEXT_PUBLIC_SUBDOMAIN=student to observe middleware redirect behavior in a real browser"
  - test: "Navigate directly to student.katie-english.com.vn/game/homework with no cookies — observe which login page appears"
    expected: "Should redirect to /game/login showing the class-code form; currently will redirect to /login (old combined login)"
    why_human: "Requires running the app to see the end-to-end navigation behavior"
  - test: "Log in as teacher, then navigate to admin.katie-english.com.vn/admin (not /admin/login)"
    expected: "Should show 403 page (wrong-role detection in admin/layout.tsx)"
    why_human: "Wrong-role 403 detection only fires on client-side navigation, not initial page loads. Behavior depends on how user navigates."
  - test: "Log in as teacher on app.katie-english.com.vn, then navigate back to app.katie-english.com.vn/teacher/login"
    expected: "Teacher login page at /teacher/login renders correctly (split panel, email+password form, #F0623A accent)"
    why_human: "Visual confirmation of teacher login page rendering"
---

# Phase 12: Multi-Subdomain Split Verification Report

**Phase Goal:** Split the single Next.js app into three subdomain entry points using middleware-based routing: admin.* (admin portal), app.* (teacher dashboard), student.* (student game). Single codebase, three deployment targets with security isolation, separate auth flows, and per-role JS bundles.
**Verified:** 2026-06-02T12:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Roadmap Success Criteria:

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| SC1 | Visiting admin.katie-english.com.vn serves the admin portal and rejects teacher/student JWT tokens | VERIFIED | Middleware reads only admin-token; admin subdomain only serves /admin/** routes; admin/layout.tsx wrong-role guard redirects to /403 for non-ADMIN role cookies |
| SC2 | Visiting app.katie-english.com.vn serves the teacher dashboard and rejects admin/student JWT tokens | VERIFIED | Middleware reads only teacher-token; app subdomain only serves /teacher/**; teacher/layout.tsx wrong-role guard redirects to /403 for non-TEACHER cookies |
| SC3 | Visiting student.katie-english.com.vn serves the student game and rejects admin/teacher JWT tokens | VERIFIED | Cookie isolation effective — admin-token/teacher-token ignored on student subdomain; student-token gate in middleware and game/layout.tsx |
| SC4 | Local dev can access all three entry points without DNS changes | VERIFIED | package.json has dev:admin (port 3000), dev:teacher (port 3010), dev:student (port 3011) with NEXT_PUBLIC_SUBDOMAIN override |
| SC5 | Build and Docker Compose work with no regression on existing functionality | VERIFIED | All 6 commits confirmed in git log; docker-compose.yml has 4 new NEXT_PUBLIC_*_ORIGIN vars; dual-write preserves localStorage auth |

Plan 01 must-have truths:

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| P01-T1 | dev:admin serves only /admin/** — other routes 404 | VERIFIED | middleware.ts SUBDOMAIN_CONFIG.admin.allowedPrefixes = ['/admin'], non-matching paths rewrite to /not-found |
| P01-T2 | dev:teacher serves only /teacher/** — other routes 404 | VERIFIED | allowedPrefixes = ['/teacher'] |
| P01-T3 | dev:student serves only /game/** and /login — other routes 404 | VERIFIED | allowedPrefixes = ['/game', '/login'] |
| P01-T4 | katie-english.com.vn/www.katie-english.com.vn returns 301 to app.katie-english.com.vn | VERIFIED | middleware lines 76-81: subdomain === 'root' → NextResponse.redirect with 301 status |
| P01-T5 | Unrecognized subdomains return 404 | VERIFIED | middleware line 84-86: subdomain === 'unknown' → NextResponse.rewrite('/not-found') |
| P01-T6 | _next/static, _next/image, favicon.ico pass through unmodified | VERIFIED | matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'] line 133-135 |
| P01-T7 | docker-compose.yml declares NEXT_PUBLIC_SUBDOMAIN, NEXT_PUBLIC_ADMIN_ORIGIN, NEXT_PUBLIC_APP_ORIGIN, NEXT_PUBLIC_STUDENT_ORIGIN | VERIFIED | docker-compose.yml lines 83-86 confirm all 4 vars with ${VAR:-default} syntax |

Plan 02 must-have truths:

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| P02-T1 | POST /api/auth/teacher-login sets HttpOnly teacher-token cookie | VERIFIED | frontend/app/api/auth/teacher-login/route.ts: httpOnly: true, teacher-token, proxies to /auth/login |
| P02-T2 | POST /api/auth/admin-login sets HttpOnly admin-token cookie | VERIFIED | frontend/app/api/auth/admin-login/route.ts: httpOnly: true, admin-token, proxies to /admin/auth/login |
| P02-T3 | POST /api/auth/student-login sets HttpOnly student-token cookie | VERIFIED | frontend/app/api/auth/student-login/route.ts: httpOnly: true, student-token, proxies to /game/auth/login |
| P02-T4 | POST /api/auth/logout clears all three cookies | VERIFIED | logout/route.ts: sets teacher-token, admin-token, student-token with maxAge: 0 |
| P02-T5 | Existing localStorage login still works (dual-write) | VERIFIED | lib/auth.ts setAuth writes both localStorage and document.cookie; getToken falls back to cookie |
| P02-T6 | login/page.tsx uses window.location.href | VERIFIED | app/login/page.tsx line 81, 85: window.location.href with NEXT_PUBLIC_APP_ORIGIN/NEXT_PUBLIC_STUDENT_ORIGIN |
| P02-T7 | admin/login/page.tsx uses window.location.href | VERIFIED | app/admin/login/page.tsx line 32: window.location.href = NEXT_PUBLIC_ADMIN_ORIGIN + '/admin' |
| P02-T8 | backend has POST /game/auth/login without AuthGuard | VERIFIED | game-auth.controller.ts: @Controller('game'), @Post('auth/login'), @HttpCode(200) — no @UseGuards |

Plan 03 must-have truths:

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| P03-T1 | Visiting student.*/login shows Class Code + Your Name fields (#A78BFA) | FAILED | /login on student subdomain renders OLD combined login page (app/login/page.tsx). Class-code form is at /game/login which is BLOCKED by middleware for unauthenticated users (middleware loginPath = '/login', so /game/login → redirect to /login). |
| P03-T2 | Visiting app.*/login shows teacher-only email+password form, no role picker | VERIFIED | frontend/app/teacher/login/page.tsx: email+password only, no role picker, calls /api/auth/teacher-login; middleware redirects app.* /login to /teacher/login |
| P03-T3 | Wrong-role page shows 403 with ShieldOff icon and Go to Login — layout guards detect wrong-role cookie | VERIFIED (partial) | 403/page.tsx: ShieldOff icon, "Access Denied", "Go to Login" button. admin/layout.tsx and teacher/layout.tsx check cross-role cookies and router.replace('/403'). Works for SPA navigation. |
| P03-T4 | Unknown subdomain shows 404 with Globe icon and links to all three login pages | VERIFIED | not-found.tsx: Globe icon, "Page not found", three MUI Button links to all three subdomain login URLs |
| P03-T5 | game/layout.tsx redirects to /login if student-token absent | FAILED | game/layout.tsx redirects to '/game/login' (not '/login' as plan states). For initial page loads, middleware fires first and redirects unauthenticated users to '/login' before layout runs. The layout guard is only effective for in-app SPA navigation. |
| P03-T6 | app/login/page.tsx student branch calls /api/auth/student-login | VERIFIED | app/login/page.tsx student branch (line 84) still calls login() from lib/auth — as per plan 03 deliberate decision to keep legacy student password auth on combined page |

**Score:** 14/17 truths verified (2 FAILED, 1 PARTIAL counted as VERIFIED)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/middleware.ts` | Subdomain detection, route containment, auth redirect | VERIFIED | 135 lines, detectSubdomain, decodeJwtRole, SUBDOMAIN_CONFIG, matcher |
| `frontend/package.json` | dev:admin/dev:teacher/dev:student scripts | VERIFIED | Lines 6-8: all three scripts with NEXT_PUBLIC_SUBDOMAIN and correct ports |
| `docker-compose.yml` | 4 NEXT_PUBLIC_* env vars | VERIFIED | Lines 83-86: all four vars with ${VAR:-default} syntax |
| `frontend/app/api/auth/teacher-login/route.ts` | HttpOnly teacher-token cookie | VERIFIED | Sets httpOnly teacher-token, domain: 'app.katie-english.com.vn' in prod |
| `frontend/app/api/auth/admin-login/route.ts` | HttpOnly admin-token cookie | VERIFIED | Sets httpOnly admin-token, domain: 'admin.katie-english.com.vn' in prod |
| `frontend/app/api/auth/student-login/route.ts` | HttpOnly student-token cookie | VERIFIED | Sets httpOnly student-token, domain: 'student.katie-english.com.vn' in prod |
| `frontend/app/api/auth/logout/route.ts` | Clears all three cookies | VERIFIED | maxAge: 0 for all three token cookies |
| `backend/src/game/game.dto.ts` | GameLoginDto with classCode and name | VERIFIED | GameLoginDto exported with classCode: string, name: string |
| `backend/src/game/game.service.ts` | gameLogin method | VERIFIED | Lines 25-50: gameLogin() with Class lookup, Student match, User verification, JWT sign |
| `backend/src/game/game-auth.controller.ts` | POST game/auth/login, no AuthGuard | VERIFIED | GameAuthController with no @UseGuards, POST auth/login at @HttpCode(200) |
| `frontend/app/teacher/login/page.tsx` | Teacher-only login, #F0623A, NEXT_PUBLIC_APP_ORIGIN | VERIFIED | Split panel, email+password only, ACCENT = '#F0623A', window.location.href redirect |
| `frontend/app/game/login/page.tsx` | Student class-code login, #A78BFA, ThemeProvider | VERIFIED | File exists and is correct — but unreachable by unauthenticated users (see gaps) |
| `frontend/app/403/page.tsx` | ShieldOff, Access Denied, Go to Login | VERIFIED | ShieldOff icon, "Access Denied", "You don't have access to this area", Go to Login button |
| `frontend/app/not-found.tsx` | Globe, Page not found, three login links | VERIFIED | Globe icon, "Page not found", three MUI Button links with env-var URLs |
| `frontend/app/game/layout.tsx` | Student auth guard, student-token check | VERIFIED (partial) | Auth guard exists, reads student-token, decodes role — but redirect target mismatch with middleware loginPath |
| `frontend/lib/auth.ts` | Dual-write: localStorage + teacher-token cookie | VERIFIED | setAuth writes localStorage + document.cookie; getToken has cookie fallback; clearAuth expires both |
| `frontend/lib/admin-auth.ts` | Dual-write: localStorage + admin-token cookie | VERIFIED | setAdminAuth writes localStorage + document.cookie; getAdminToken has cookie fallback |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| middleware.ts | req.headers.get('host') / NEXT_PUBLIC_SUBDOMAIN | detectSubdomain reads env var first, then Host header | VERIFIED | Lines 41-57: env var check before host parsing |
| middleware.ts | NextResponse.next(config) | matcher excludes _next/static, _next/image, favicon.ico | VERIFIED | matcher line 133-135 |
| middleware.ts | decodeJwtRole / cookie-per-subdomain | reads cookieName from SUBDOMAIN_CONFIG | VERIFIED | Lines 113-120: req.cookies.get(subConfig.cookieName) |
| teacher-login/route.ts | backend /auth/login | fetch to API_URL/auth/login, sets teacher-token | VERIFIED | Lines 8-28 |
| student-login/route.ts | backend /game/auth/login | fetch with classCode+name, sets student-token | VERIFIED | Lines 8-28 |
| game/layout.tsx | student-token cookie | useEffect reads document.cookie, decodes STUDENT role | VERIFIED (partial) | Lines 9-36: correct implementation but redirect target /game/login conflicts with middleware loginPath |
| game/login/page.tsx | /api/auth/student-login | fetch with classCode+name, window.location.href to /game/homework | NOT_WIRED (effectively) | Page exists and wiring correct, but page is unreachable by unauthenticated students |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| backend/src/game/game-auth.controller.ts | token, user | gameLogin() → prisma.class.findUnique → prisma.user.findFirst → tokenService.sign | Yes — real DB queries | FLOWING |
| teacher-login/route.ts | token (cookie) | Proxied from /auth/login backend | Yes — backend auth endpoint | FLOWING |
| student-login/route.ts | token (cookie) | Proxied from /game/auth/login backend | Yes — backend auth endpoint | FLOWING |
| middleware.ts | subdomain detection | NEXT_PUBLIC_SUBDOMAIN env var / Host header | Yes — env/request data | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — requires running Next.js app; cannot test middleware behavior without a live server.

### Probe Execution

Step 7c: No probe scripts declared in PLAN files. No conventional probe-*.sh scripts found in scripts/ directory.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| SUBDOMAIN-01 | 12-01 | Next.js middleware reads Host header and rewrites routing | SATISFIED | middleware.ts: detectSubdomain reads Host header, routes to admin/teacher/student entry points |
| SUBDOMAIN-02 | 12-01 | Each subdomain serves only its appropriate routes | SATISFIED | SUBDOMAIN_CONFIG allowedPrefixes enforced by middleware route containment check |
| SUBDOMAIN-03 | 12-03 | Each subdomain has its own login page with role-appropriate auth flow | PARTIAL | admin.* has /admin/login (verified); app.* has /teacher/login (verified); student.* has /game/login but it is unreachable without a cookie — BLOCKER |
| SUBDOMAIN-04 | 12-02 | JWT cookies scoped per subdomain | SATISFIED | HttpOnly cookies with per-subdomain domain scoping (app.katie-english.com.vn, admin.katie-english.com.vn, student.katie-english.com.vn); middleware reads only subdomain-specific cookie |
| SUBDOMAIN-05 | 12-01 | Local dev without DNS changes | SATISFIED | NEXT_PUBLIC_SUBDOMAIN env var in package.json dev scripts; middleware checks env var first |
| SUBDOMAIN-06 | 12-01 | Docker Compose updated | SATISFIED | docker-compose.yml lines 83-86: all four NEXT_PUBLIC_* vars with ${VAR:-default} syntax |

Note: SUBDOMAIN-01 through SUBDOMAIN-06 are Phase 12 requirements defined in ROADMAP.md only — they do not appear in REQUIREMENTS.md, which covers v1 product requirements (SPEAK-*, READ-*, TEACH-*, STUDENT-*, BFA-*). No REQUIREMENTS.md entries are mapped to Phase 12 and no orphaned requirements exist.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| middleware.ts | 119 | `decodeJwtRole(tokenValue)` result discarded | Info | JWT role is decoded but not used in middleware — intentional per D-04 design decision (wrong-role deferred to layout guard). Not a stub; design choice documented in SUMMARY. |
| frontend/app/login/page.tsx | 83 | Student branch comment "will be replaced by class-code login in plan 12-03" | Info | The plan note is not implemented — the combined /login page still shows student password login, not class-code login. Relates to the routing gap (plan 03 decision was to keep combined page as teacher fallback). |

No `TBD`, `FIXME`, or `XXX` markers found in any phase-modified files.

### Human Verification Required

### 1. Student Subdomain Login Flow

**Test:** Start app with `NEXT_PUBLIC_SUBDOMAIN=student npm run dev:student`. Navigate to http://localhost:3011/login with no cookies.
**Expected:** Should see the Class Code + Your Name login form (purple #A78BFA accent). Currently this path renders the OLD combined teacher/student login page.
**Why human:** Requires running the Next.js server and observing actual browser rendering.

### 2. Student Game Login Reachability

**Test:** Clear all cookies. Navigate to http://localhost:3011/game/homework.
**Expected:** Should redirect to the student class-code login page. Currently middleware redirects to /login (old combined page).
**Why human:** Requires running app + observing actual server-side middleware redirect behavior.

### 3. Teacher Visit to Admin Subdomain — 403 Behavior

**Test:** Log in as teacher at http://localhost:3010. Then navigate to http://localhost:3000/admin (admin subdomain, port 3000 with dev:admin).
**Expected:** If 403 is shown, the wrong-role detection works. If /admin/login is shown instead, the middleware redirect fires before layout guard.
**Why human:** Tests an edge case in the interaction between server-side middleware and client-side layout guards that grep cannot verify.

### 4. Teacher Login Page Visual Verification

**Test:** Navigate to http://localhost:3010/teacher/login with dev:teacher running.
**Expected:** Split-panel page with left navy panel showing "Teacher Portal / the smart way", right panel with Email + Password fields only, Sign In button in #F0623A. No role picker, no registration link.
**Why human:** Visual appearance cannot be verified programmatically.

### Gaps Summary

Two related gaps share a root cause: the student subdomain middleware `loginPath` is set to `'/login'` instead of `'/game/login'`.

**Root cause:** In `frontend/middleware.ts`, `SUBDOMAIN_CONFIG.student.loginPath = '/login'`. This means:
1. Unauthenticated students hitting any `/game/**` route (including `/game/login`) are server-redirected to `/login` by middleware.
2. `/login` on student subdomain renders `frontend/app/login/page.tsx` (the OLD combined teacher+student login), not the class-code form at `frontend/app/game/login/page.tsx`.
3. `game/layout.tsx` redirects to `/game/login` client-side, but middleware fires first on the server — this redirect is only effective for in-app SPA navigation, not initial page loads.

**Required fix:** Change `SUBDOMAIN_CONFIG.student.loginPath` in `middleware.ts` from `'/login'` to `'/game/login'`. Since `/game/login` already starts with `/game` (which is in allowedPrefixes), no allowedPrefixes change is needed. Also update `game/layout.tsx` to keep its redirect to `/game/login` (already correct).

This fix makes the student login flow coherent:
- Unauthenticated student → `/game/homework` → middleware → `/game/login` (class-code form) ✓
- `/game/login` allowed through (under `/game` prefix, no cookie check on loginPath) ✓
- Student sees class-code form, submits → student-token cookie → authenticated ✓

The student class-code login page (`frontend/app/game/login/page.tsx`) is otherwise fully implemented and correctly wired to `/api/auth/student-login`.

---

_Verified: 2026-06-02T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
