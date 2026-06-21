# Phase 12: Multi-Subdomain Split - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Partition the single Next.js app into three subdomain entry points using Next.js middleware. Same codebase, single build — middleware reads `Host` header and routes each subdomain to the appropriate set of pages. Each subdomain enforces role isolation: pages, auth flows, and cookies are scoped per role.

- `admin.katie-english.com.vn` → admin portal (`/admin/**`)
- `app.katie-english.com.vn` → teacher dashboard (`/teacher/**`)
- `student.katie-english.com.vn` → student game (`/game/**`, `/login` student flow)

No new features. No monorepo split. No separate builds. Routing + auth hardening only.
</domain>

<decisions>
## Implementation Decisions

### Local Development
- **D-01:** Separate dev ports per role: admin on `:3000`, teacher on `:3010`, student on `:3011`. (Backend stays on `:3001` — no conflict.)
- **D-02:** Middleware reads `NEXT_PUBLIC_SUBDOMAIN` env var when running locally to determine which role's surface to serve. Each `npm run dev:admin|teacher|student` script sets this var + port.

### Login Routing Per Subdomain
- **D-03:** Each subdomain has its own `/login` page:
  - `admin.*` → AdminLoginPage (email + password, admin JWT)
  - `app.*` → TeacherLoginPage (email + password, teacher JWT)
  - `student.*` → StudentLoginPage (class code + name, student session)
- **D-04:** Wrong-role access (teacher token on `admin.*`) → 403 page ("You don't have access to this area"). No cross-subdomain redirect.

### Cookie & Token Isolation
- **D-05:** Production cookies are subdomain-scoped (`Domain=admin.katie-english.com.vn`, `Domain=app.katie-english.com.vn`, `Domain=student.katie-english.com.vn`) with `Secure; HttpOnly; SameSite=Strict`. Requires HTTPS in prod.
- **D-06:** Cookie names per role: `admin-token`, `teacher-token`, `student-token`. Provides isolation in local dev (different ports, same `localhost` domain) where `Domain=` scoping cannot apply.
- **D-07:** Middleware reads only the cookie matching the current subdomain. Teacher cookie is invisible to admin middleware, and vice versa.

### Hostname Fallback
- **D-08:** Root domain (`katie-english.com.vn`, `www.katie-english.com.vn`) → 301 redirect to `app.katie-english.com.vn` (teacher is primary user).
- **D-09:** Unrecognized subdomains → 404 page.

### Route Protection Per Subdomain
- **D-10:** Middleware enforces route containment — `admin.*` can only serve `/admin/**`; `app.*` can only serve `/teacher/**`; `student.*` can only serve `/game/**` and its own `/login`. Attempting to navigate to a cross-role path on the wrong subdomain returns 404.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Auth Implementation
- `backend/src/auth/` — Teacher JWT auth guard and login endpoint
- `backend/src/admin/auth/` — Admin JWT auth guard and login endpoint
- `backend/src/game/game.controller.ts` — Student session auth pattern

### Existing Routing
- `frontend/app/` — Current flat route structure (admin/, teacher/, game/, login/)
- `frontend/next.config.js` — Standalone output config (must stay unchanged for Docker)

### Deployment Config
- `docker-compose.yml` — Service topology; frontend container env vars need subdomain config
- `.planning/codebase/STACK.md` — Full env var reference

### Phase Dependencies
- `.planning/phases/06-admin-portal/06-CONTEXT.md` — Admin auth decisions
- `.planning/ROADMAP.md §Phase 12` — Requirements SUBDOMAIN-01 through SUBDOMAIN-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing middleware — this phase creates `frontend/middleware.ts` from scratch
- `frontend/app/admin/layout.tsx` — admin shell, already guards for admin role
- `frontend/app/teacher/` — teacher routes, already under dedicated path prefix
- `frontend/app/game/` — student game routes

### Established Patterns
- NestJS `@nestjs/jwt` produces role-encoded JWTs — middleware can decode without backend call (verify signature client-side with public key or skip signature verify + trust role claim in middleware)
- `next.config.js` uses `output: 'standalone'` — do NOT change this; Docker build depends on it

### Integration Points
- `frontend/middleware.ts` (new) — intercepts every request, reads `Host` + cookies, rewrites or redirects
- `frontend/next.config.js` — may need `experimental.instrumentationHook` or matchers update for middleware scope
- `docker-compose.yml` — add `NEXT_PUBLIC_SUBDOMAIN` and per-subdomain env vars to frontend service

</code_context>

<specifics>
## Specific Ideas

- Teacher surface is "primary" — root domain redirects there
- 403 page preferred over silent redirect when wrong role hits wrong subdomain (clearer error)
- Subdomain-scoped cookies are non-negotiable in prod (strongest isolation chosen)
- Local dev uses separate ports (3000/3010/3011) — dev scripts needed in `frontend/package.json`
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 12-multi-subdomain-split*
*Context gathered: 2026-06-02*
