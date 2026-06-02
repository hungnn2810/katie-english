---
status: testing
phase: 12-multi-subdomain-split
source: [12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md]
started: 2026-06-02T17:30:00Z
updated: 2026-06-02T17:30:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running server/container. Run `docker compose up` from scratch (or start frontend+backend manually). Both frontend and backend boot without errors. Backend seed/migration completes. A basic request (e.g. hitting the frontend homepage or backend health) returns a live response with no crash.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/container. Run `docker compose up` from scratch (or start frontend+backend manually). Both frontend and backend boot without errors. Backend seed/migration completes. A basic request (e.g. hitting the frontend homepage or backend health) returns a live response with no crash.
result: [pending]

### 2. Dev Scripts Set Subdomain
expected: Run `npm run dev:admin` inside the frontend directory. The Next.js server starts on port 3000 with `NEXT_PUBLIC_SUBDOMAIN=admin`. Similarly `dev:teacher` starts on 3010 and `dev:student` on 3011. Each port should behave as its respective subdomain (admin routes only, teacher routes only, student routes only).
result: [pending]

### 3. Route Containment — Admin Subdomain
expected: With `npm run dev:admin` running (admin subdomain), navigate to `/teacher` or `/game/homework`. The middleware should rewrite the request to `/not-found` — you see the 404 page (Globe icon, three login links) instead of the teacher or game content.
result: [pending]

### 4. Route Containment — App/Teacher Subdomain
expected: With `npm run dev:teacher` running (app subdomain), navigate to `/admin` or `/game/homework`. Middleware rewrites to `/not-found`. Also: navigating to `/login` should redirect you to `/teacher/login` (not show a role-picker page).
result: [pending]

### 5. Route Containment — Student Subdomain
expected: With `npm run dev:student` running (student subdomain), navigate to `/admin` or `/teacher`. Middleware rewrites to `/not-found`. Navigating to `/game/homework` or `/login` should be allowed.
result: [pending]

### 6. Auth Redirect — No Cookie → Login
expected: Clear all auth cookies. On the admin subdomain, navigate to `/admin`. Middleware detects no `admin-token` cookie and redirects you to `/admin/login`. On the teacher subdomain, navigating to `/teacher` redirects to `/teacher/login`. On the student subdomain, navigating to `/game/homework` redirects to `/game/login`.
result: [pending]

### 7. Teacher Login — HttpOnly Cookie + Redirect
expected: On the teacher/app subdomain, go to `/teacher/login`. Enter valid teacher credentials (email + password) and submit. The login succeeds: a `teacher-token` HttpOnly cookie is set (visible in DevTools → Application → Cookies but NOT readable via `document.cookie`), and you are redirected to `/teacher` (the teacher dashboard).
result: [pending]

### 8. Admin Login — HttpOnly Cookie + Redirect
expected: On the admin subdomain, go to `/admin/login`. Enter valid admin credentials and submit. A `admin-token` HttpOnly cookie is set, and you are redirected to `/admin` (the admin dashboard).
result: [pending]

### 9. Student Login — Class Code + Name
expected: On the student subdomain, go to `/game/login`. Enter a valid class code and student name. Submit. A `student-token` cookie is set and you are redirected to `/game/homework`. Invalid class code or wrong name shows an error message without revealing which field was wrong.
result: [pending]

### 10. Logout — Clears All Cookies
expected: While logged in as teacher, trigger logout (call `/api/auth/logout` or click a logout button if present). All three cookies (`teacher-token`, `admin-token`, `student-token`) are cleared. Navigating to a protected route now redirects back to the subdomain login page.
result: [pending]

### 11. Wrong-Role → 403 Page
expected: Simulate having a teacher token while accessing the admin subdomain (e.g. manually set a `teacher-token` cookie with a valid TEACHER JWT and navigate to `/admin`). The admin layout's wrong-role guard detects a non-ADMIN role and redirects to `/403`. The 403 page shows the ShieldOff icon, "Access Denied" heading, and a "Go to Login" button — with admin blue (#4F9DFF) accent (if `NEXT_PUBLIC_SUBDOMAIN=admin`).
result: [pending]

### 12. Teacher Login Page UI
expected: The `/teacher/login` page shows a split-panel layout: left panel is dark navy with the K monogram in orange (#F0623A), "Teacher Portal" headline, and feature icons. Right panel has email/password fields and a Sign In button in orange. No role picker, no registration link.
result: [pending]

### 13. Student Login Page UI
expected: The `/game/login` page shows a split-panel layout: left panel is dark navy with the K monogram in purple (#A78BFA), "Play & Learn" headline, and game-related icons. Right panel has "Class Code" and "Your Name" fields, and an "Enter Class" button in purple. No password field.
result: [pending]

### 14. 404 Not-Found Page
expected: Navigate to a non-existent path on any subdomain (e.g. `/unknown-route-xyz`). The middleware rewrites to `/not-found`. You see the Globe icon, "Page not found" heading, "This subdomain is not recognized." body, and three buttons linking to admin/teacher/student login pages.
result: [pending]

### 15. Game Layout Auth Guard
expected: On the student subdomain, access `/game/homework` without a valid `student-token` cookie. The game layout's client-side guard detects no STUDENT role token and redirects to `/game/login`. The login page itself is accessible without being redirected (no loop).
result: [pending]

## Summary

total: 15
passed: 0
issues: 0
pending: 15
skipped: 0
blocked: 0

## Gaps

[none yet]
