---
phase: 6
reviewers: [claude-internal]
reviewed_at: 2026-05-23T08:44:52Z
plans_reviewed:
  - 06-01-PLAN.md
  - 06-02-PLAN.md
  - 06-03-PLAN.md
  - 06-04-PLAN.md
  - 06-05-PLAN.md
  - 06-06-PLAN.md
note: >
  No external AI CLIs available (gemini/codex/opencode/qwen: not installed; ollama/lm_studio/llama_cpp: not running).
  Running inside Claude Code (CLAUDE_CODE_ENTRYPOINT set) — skipping `claude` CLI for independence per workflow rules.
  Internal review performed by the orchestrating Claude Code session instead.
---

# Cross-AI Plan Review — Phase 6: Admin Portal

## Internal Claude Review

### Summary

Phase 6 is well-structured: atomic schema foundation in Wave 1, login+dashboard in Wave 2, teacher CRUD in Wave 2 (parallel), classes in Wave 3, students/homework in Wave 4. The separation of AdminGuard from TeacherGuard, the explicit `select` clauses that exclude `password`, and the soft-delete pattern for teacher accounts are all well-designed. Two implementation bugs stand out that would cause runtime failures if not caught during execution: the Prisma `$transaction` array-form misuse in Plans 04 and 06, and the incomplete duplicate-check in Plan 03. Three medium-priority gaps (admin login rate limiting, missing `/admin/homework` in nav, cross-class assignment bleed on class delete) should be addressed before shipping.

---

### Strengths

- **Additive-only schema changes (Plan 01).** New columns (`email`, `name`, `phone`, `disabled`, `teacherId`) are all nullable or defaulted. `prisma db push` will not prompt for `--accept-data-loss`. Zero migration risk.
- **AdminGuard is intentionally DB-free.** Skipping the `prisma.user` lookup on every admin request is correct for a single env-seeded admin. The JWT role assertion is sufficient and eliminates a hot-path DB call (T-06-01-06 correctly documents this).
- **Password never leaks.** All `findAll`/`create`/`update` queries in Plans 03–05 use explicit `select` clauses that omit `password` and `registrationData`. Consistent.
- **`disabled` is soft-delete only.** Teacher accounts are never hard-deleted; admin can re-enable. Low operational risk.
- **Plan 06 is `autonomous: false`.** Correct call — destructive irreversible deletes should have a human checkpoint.
- **Wave ordering is clean.** Plan 01 blocks everything; Plans 02+03 are wave 2 (parallel); Plan 04 is wave 3; Plans 05+06 are wave 4. Dependencies are correctly declared.
- **Threat model coverage.** Each plan includes a STRIDE register with disposition and mitigation. T-06-03-02 (password excluded from responses), T-06-03-04 (IDOR — role filter in findById), T-06-04-01 (teacherId omitted from UpdateDto per D-11) are well-handled.

---

### Concerns

#### HIGH Severity

**H-01 — `$transaction` array form cannot contain intermediate queries (Plans 04 + 06)**

Both Plan 04 (`AdminClassesService.delete`) and Plan 06 (`AdminHomeworkService.delete`) specify a delete algorithm that needs an intermediate `findMany` to compute a list of IDs before proceeding:

```
(b) const linkRows = await prisma.homeworkAssignmentClass.findMany(...)
(c) const assignmentIds = linkRows.map(r => r.assignmentId)
(d) await prisma.homeworkSession.deleteMany({ where: { assignmentId: { in: assignmentIds } } })
```

The plans then say: *"Wrap (a)–(f) in a single `prisma.$transaction([...])` call."*

The **array form** of `$transaction` accepts only an array of pre-built Prisma operation promises — it cannot contain intermediate JavaScript (no `const`, no `await`, no `.map()`). Using the array form here either silently ignores steps (b)–(c), or throws at runtime (`TypeError` or Prisma validation error).

**Fix:** Use the **interactive transaction form** everywhere a read is needed inside the transaction:

```typescript
await this.prisma.$transaction(async (tx) => {
  await tx.student.updateMany({ where: { classId: id }, data: { classId: null } });
  const linkRows = await tx.homeworkAssignmentClass.findMany({ where: { classId: id }, select: { assignmentId: true } });
  const assignmentIds = linkRows.map(r => r.assignmentId);
  await tx.homeworkSession.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
  await tx.homeworkAssignment.deleteMany({ where: { id: { in: assignmentIds } } }); // cascades assignment_class
  await tx.class.delete({ where: { id } });
});
```

Both plans 04 and 06 need this correction. This is a runtime crash, not a compile-time error — TypeScript will not catch it.

---

**H-02 — Plan 03 duplicate-check only guards `upn`; `email @unique` constraint is unhandled**

Plan 03 Task 1 specifies:

```typescript
prisma.user.findUnique({ where: { upn: dto.email } }) // → ConflictException if found
```

But `User.email` also has `@unique`. If a user already exists with `upn = 'X'` but a different `email` field value, and a new teacher is created with `email = 'X'` (which maps to `upn: 'X', email: 'X'`), the `findUnique({ where: { upn: 'X' } })` check catches it. So far OK.

However, if a user exists with `email = 'X'` but `upn = 'Y'` (possible for users created outside this flow), then `findUnique({ where: { upn: 'X' } })` returns null (no match on upn), the check passes, and `prisma.user.create()` throws a Prisma `P2002` (unique constraint violation on `email`). This bubbles up as an unhandled 500, not the designed 409 ConflictException.

**Fix:** Check both fields:
```typescript
const exists = await this.prisma.user.findFirst({
  where: { OR: [{ upn: dto.email }, { email: dto.email }] },
});
if (exists) throw new ConflictException('An account with this email already exists.');
```

Also wrap the `prisma.user.create()` call in a try/catch for `P2002` as a backstop.

---

#### MEDIUM Severity

**M-01 — Class delete may remove assignments shared across multiple classes**

Plan 04's delete algorithm finds all `HomeworkAssignmentClass` rows for `classId`, extracts `assignmentIds`, and then calls `prisma.homeworkAssignment.deleteMany({ where: { id: { in: assignmentIds } } })`. This **deletes the entire assignment** — including its sessions from students in any other class that shares the same assignment.

The schema is a many-to-many (`HomeworkAssignment → HomeworkAssignmentClass ← Class`), so an assignment can theoretically cover multiple classes.

**Impact:** If a teacher assigned one homework to two classes, and the admin deletes Class A, Class B students' sessions for that homework disappear.

**Options:**
1. Only remove the `HomeworkAssignmentClass` join rows for this classId (not the full assignment) — this orphans the sessions but is safer.
2. Only delete sessions belonging to students *in this class*, then remove the join rows.
3. Current approach (delete entire assignment) is acceptable if the product decision is: "a class owns its assignments exclusively." Confirm this with the user — it is not explicit in CONTEXT.

**M-02 — No rate limiting on `POST /admin/auth/login`**

Single seeded admin credential. An attacker who knows the admin email (often predictable) can brute-force the password. NestJS has no built-in rate limiting. Add `@nestjs/throttler` guard to the login endpoint (a one-liner after package install). Or document the decision to defer.

**M-03 — `/admin/homework` page not in AdminShell sidebar navigation**

CONTEXT D-13 lists pages as: `/admin`, `/admin/teachers`, `/admin/classes`, `/admin/students`. Plan 06 adds `/admin/homework` as a new page but does not instruct an update to `AdminShell.tsx` (built in Plan 02) to add a "Homework" nav item. Without the nav link, the page is reachable only by direct URL. Either:
- Plan 02 should have included homework in the nav (and be updated), OR
- Plan 06 must explicitly include `frontend/components/AdminShell.tsx` in its `files_modified` list and add the nav item.

**M-04 — Route ordering risk: `DELETE /admin/students/sessions/:sessionId` vs `GET /admin/students/:id/results`**

Plan 06 adds `DELETE /admin/students/sessions/:sessionId` to the same controller as Plan 05's `GET /admin/students/:id/results`. The NestJS router matches methods before segments, so `GET :id/results` and `DELETE sessions/:id` won't collide (different HTTP methods). However, if the executor registers them on the same controller class, the path `/admin/students/sessions/123` could match `:id = 'sessions'` on a `GET` request if a user navigates to it directly. Verify NestJS resolves static segment `sessions` before dynamic `:id` for same-method routes. This is likely fine (NestJS static-first), but worth an integration test.

**M-05 — Disabled teacher's active JWT remains valid until expiry**

Plan 03 Threat T-06-03-03 documents this as accepted. Flagging it here for visibility: when a teacher is disabled, their existing JWT (held in the browser) continues to authenticate API calls until token expiry. If JWT TTL is 24h or more (not specified in plans), a disabled teacher has a meaningful window of continued access. Mitigations: short TTL, or a `jti`/`disabled` DB check in `TeacherGuard`. Recommend documenting the JWT TTL explicitly.

---

#### LOW Severity

**L-01 — `Query('teacherId')` in Plan 04 controller uses `Number()` without NaN guard**

`@Query('teacherId') teacherId?: string` → `Number(teacherId)` → if value is `'abc'`, `Number('abc') === NaN`. Prisma receives `{ where: { teacherId: NaN } }`, which either throws a type error or is silently ignored. Use `parseInt(teacherId, 10)` with a `isNaN` guard, or apply `ParseIntPipe` to the query param.

**L-02 — `ensureAdminUser` identity check is `upn` only; changing `ADMIN_EMAIL` env var creates a second admin**

If `ADMIN_EMAIL` is changed between deployments, a new ADMIN user is created without deactivating the old one. Two orphan admin users accumulate. Low risk (single-admin platform, no UI to create a second admin), but worth a comment in the code.

**L-03 — No input length validation on teacher name/phone**

`CreateTeacherDto` and `UpdateTeacherDto` are plain DTOs without class-validator. Arbitrarily long strings can be stored. Acceptable for MVP, but worth noting.

**L-04 — No structured audit log for destructive admin actions**

Class delete, homework delete, teacher disable — none produce an audit log entry. The single-admin platform makes this low risk. Note it as a deferred item.

---

### Suggestions

1. **Fix $transaction form (H-01, both Plan 04 + 06):** Change all delete implementations to use `prisma.$transaction(async (tx) => { ... })`. This is the only correct form when intermediate reads inform downstream writes. Add this pattern to 06-PATTERNS.md so future phases don't repeat it.

2. **Add backstop to teacher create (H-02):** Wrap `prisma.user.create()` in a try/catch that converts Prisma `P2002` code to ConflictException. Combine with the `findFirst({ OR: [{ upn }, { email }] })` pre-check.

3. **Decide + document assignment-sharing semantics (M-01):** One sentence in CONTEXT.md: "Each homework assignment is exclusive to one class" (if true) makes the delete logic safe and self-documenting.

4. **Add `files_modified: [frontend/components/AdminShell.tsx]` to Plan 06 (M-03):** Or create a Plan 07 for nav cleanup. The homework page needs to be discoverable.

5. **Document JWT TTL (M-05):** Add to CONTEXT.md or backend `.env.example`. Even a note like "admin JWT uses the same TTL as teacher JWT (see JWT_EXPIRY env var)" prevents future confusion.

6. **Add NaN guard to teacherId query param (L-01):** One-line fix: `const tid = teacherId ? parseInt(teacherId, 10) : undefined; if (tid !== undefined && isNaN(tid)) throw new BadRequestException('teacherId must be a number');`

---

### Risk Assessment

**Overall: MEDIUM**

The phase design is solid — separate auth, correct RBAC separation, safe schema migration, thoughtful threat model. The two HIGH-severity items (H-01 `$transaction` form, H-02 duplicate check) are implementation bugs, not design flaws, and are detectable during execution. The transactional delete will fail at runtime with an unambiguous error, so they're likely to be caught before shipping. The MEDIUM items (especially M-01 cross-class assignment bleed and M-03 missing nav) need decisions before marking the phase complete.

**Ship blocker threshold:** Resolve H-01 and H-02 before execution. Decide on M-01 and M-03 before UAT.

---

## Consensus Summary

*(Single reviewer — consensus section not applicable. See findings above.)*

### Key Findings (Priority Order)

1. **H-01** — `$transaction([...])` array form won't work with intermediate reads (Plans 04 + 06). Use interactive form.
2. **H-02** — Teacher create duplicate check misses `email @unique` — can produce unhandled P2002 error.
3. **M-01** — Class delete may silently nuke assignments shared with other classes. Needs product decision.
4. **M-03** — `/admin/homework` page has no nav link in AdminShell sidebar.
5. **M-02** — No rate limiting on admin login endpoint.
6. **M-04** — Route ordering for sessions vs students/:id — verify NestJS static-first resolution.
7. **M-05** — Disabled teacher's JWT stays valid until expiry.

### Agreed Strengths

- Additive schema migration (zero data-loss risk)
- Password excluded from all response shapes via explicit `select`
- Soft-delete for teachers (not hard delete)
- `autonomous: false` on destructive plan (Plan 06) — human checkpoint required
- Wave dependency graph is correct and clean

### Divergent Views

*(N/A — single reviewer)*
