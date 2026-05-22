# Phase 6: Admin Portal - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a separate admin section of the platform where a single super-admin account can manage all teacher accounts and have full visibility and control over all classes, homeworks, sessions, and student results. This phase also introduces multi-teacher support to replace the current single-teacher env-seed model.

</domain>

<decisions>
## Implementation Decisions

### Multi-Teacher Model
- **D-01:** Phase introduces multi-teacher support — teacher accounts stored in DB, replacing the single-teacher env-seed (`TEACHER_EMAIL`/`TEACHER_PASSWORD`) approach.
- **D-02:** Teacher account fields: email, password (hashed), name, phone number. No class assignment at creation time.
- **D-03:** Existing seed logic must migrate gracefully — seed teacher via DB on first boot if no teachers exist.

### Admin Auth
- **D-04:** Single admin account, seeded via env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Not manageable via UI.
- **D-05:** Separate `/admin/auth/login` endpoint (not `/auth/login`). Returns a distinct admin JWT (role: ADMIN).
- **D-06:** Admin JWT protected by a dedicated NestJS guard (`AdminGuard`) — not the same guard as teacher/student.

### Admin Operations Scope
- **D-07:** Admin can: view all teachers, create teacher, edit teacher (name/phone/password), disable/enable teacher account.
- **D-08:** Admin can: view all classes (filterable by teacher), edit class info (name, schedule, status), delete class.
- **D-09:** Admin can: delete any homework or session.
- **D-10:** Admin can: view all students and drill into their homework results across the platform.
- **D-11:** Admin cannot reassign a class from one teacher to another (out of scope).

### UI Structure
- **D-12:** Separate `/admin/*` routes in Next.js with its own layout (sidebar + header), completely independent from teacher dashboard.
- **D-13:** Pages: `/admin` (dashboard stats), `/admin/teachers` (teacher CRUD), `/admin/classes` (all classes, filter by teacher), `/admin/students` (all students + results).
- **D-14:** Admin login page at `/admin/login` — redirects to `/admin` on success. Middleware blocks non-admin from `/admin/*`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, stack, constraints, existing validated requirements
- `.planning/ROADMAP.md` — Phase 6 requirements (ADMIN-01 through ADMIN-07) and success criteria

### Auth & Role Patterns
- `.planning/phases/01-speaking-homework/` — Existing JWT auth implementation (teacher/student roles)
- `backend/src/auth/` — NestJS auth module: JwtStrategy, AuthGuard, role guards

### Existing Teacher/Class Patterns
- `backend/src/teacher/` — Teacher entity and service (currently single-teacher)
- `backend/src/class/` — Class CRUD patterns to extend for admin access
- `backend/prisma/schema.prisma` — Current User model with roles (TEACHER/STUDENT)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `JwtAuthGuard` / `RolesGuard`: Extend or duplicate for admin-specific guard
- Existing `User` Prisma model with `role` enum — add `ADMIN` role variant
- Teacher dashboard layout components — reference pattern for admin sidebar layout

### Established Patterns
- NestJS module-per-feature: create `admin` module with sub-controllers (teachers, classes, students)
- Next.js route groups for layout isolation: `(admin)` route group with its own `layout.tsx`
- JWT stored in httpOnly cookie or localStorage (match existing teacher pattern)

### Integration Points
- `Teacher` service must be refactored to support multiple teachers (remove single-teacher assumptions)
- Admin needs cross-entity read access: Teacher → Class → Homework → Session → Student
- Prisma: add `ADMIN` to role enum, add `phone` field to User, add `disabled` flag

</code_context>

<specifics>
## Specific Ideas

- Admin is a super-user: same app, separate route, separate auth token
- Teacher disable = soft-delete (set `disabled: true` flag), not hard delete
- Platform stats on admin dashboard: count of teachers, classes, students, total submissions

</specifics>

<deferred>
## Deferred Ideas

- Multiple admin accounts — user confirmed single admin only (env-seeded)
- Reassign class from one teacher to another — out of scope for this phase
- Admin creating student accounts directly — students created by teachers

</deferred>

---

*Phase: 6-Admin Portal*
*Context gathered: 2026-05-22*
