# Phase 12: Multi-Subdomain Split - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 12-multi-subdomain-split
**Areas discussed:** Local dev workflow, Login routing per subdomain, Cookie & token isolation, Hostname fallback

---

## App Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Monorepo, 3 Next.js apps | Same repo, apps/admin + apps/teacher + apps/student, Turborepo | |
| Single Next.js, different deploy targets | Middleware reads hostname, routes per subdomain, single build | ✓ |
| Completely separate repos | Three independent repos | |

**User's choice:** Single Next.js app with subdomain middleware routing
**Notes:** Chosen for lower overhead — no monorepo tooling, single build/deploy pipeline

---

## Split Motivation (multi-select)

| Driver | Selected |
|--------|----------|
| Security isolation | ✓ |
| Independent deploys | ✓ |
| Different auth flows | ✓ |
| Performance / bundle size | ✓ |

---

## Local Dev Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Query param (?subdomain=admin) | Middleware reads param on localhost, zero setup | |
| Custom /etc/hosts + real subdomains | 127.0.0.1 admin.localhost etc., one-time setup | |
| Separate dev ports (3000/3010/3011) | NEXT_PUBLIC_SUBDOMAIN env var + port per role | ✓ |

**User's choice:** Separate ports
**Notes:** Port 3001 is backend — teacher dev uses 3010 to avoid conflict

---

## Wrong-Role Access Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to correct subdomain | Middleware detects JWT role, redirects to right subdomain | |
| Show 403 / access denied page | Stay on subdomain, show error | ✓ |

**User's choice:** 403 page
**Notes:** Clearer to user that they're on the wrong surface, not silently redirected

---

## Login Routing Per Subdomain

| Option | Description | Selected |
|--------|-------------|----------|
| Each subdomain has its own /login | admin.* → AdminLogin, app.* → TeacherLogin, student.* → StudentLogin | ✓ |
| Shared /login with role selector | Single login URL, redirect after role selection | |

**User's choice:** Each subdomain has its own /login
**Notes:** Already matches the existing separate login pages in the codebase

---

## Cookie & Token Isolation

| Option | Description | Selected |
|--------|-------------|----------|
| Separate cookie names (admin-token, teacher-token, student-token) | Role isolation via naming, no domain scoping | |
| Single 'token' cookie, role validated server-side | Keep existing name, decode JWT role in middleware | |
| Subdomain-scoped cookie (Domain=admin.katie-english.com.vn) | Browser-enforced isolation, requires HTTPS | ✓ |

**User's choice:** Subdomain-scoped cookies
**Notes:** Strongest isolation. Local dev (same `localhost` domain across ports) uses separate cookie names as companion measure

---

## Hostname Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Root domain → redirect to app.katie-english.com.vn | katie-english.com.vn → teacher surface (primary user) | ✓ |
| Root domain → landing/marketing page | Separate landing with links to each surface | |
| No root domain handling — DNS covers it | DNS handles redirect at network level | |

**User's choice:** Redirect root → app.katie-english.com.vn
**Notes:** Teacher is primary user; unknown subdomains → 404

---

## Claude's Discretion

- Port numbers for local dev (3010 for teacher, 3011 for student) — chosen to avoid backend conflict
- Cookie `SameSite=Strict` + `HttpOnly` + `Secure` defaults for prod cookies
- Middleware matcher pattern (exclude `/_next/`, `/api/`, `/public/`)

## Deferred Ideas

None — discussion stayed within phase scope.
