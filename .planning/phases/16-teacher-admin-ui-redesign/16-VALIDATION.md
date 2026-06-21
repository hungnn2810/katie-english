# Phase 16: Validation Checklist

**Phase:** 16-teacher-admin-ui-redesign
**Framework:** No Jest/Vitest/Playwright detected — TypeScript build is the primary automated gate.

---

## Automated Gates

### 1. TypeScript Build

```bash
cd frontend && npm run build
```

Expected: exits 0 with no type errors.

Run after every task commit and again after each wave completes.

### 2. Orange literal audit (UI-07)

```bash
grep -rn "F0623A" \
  frontend/app/teacher \
  frontend/components/TeacherShell.tsx \
  frontend/components/AdminShell.tsx
```

Expected: zero matches. Any match is a blocker — the file must be patched before the phase closes.

### 3. Orange-50 tint audit (#FFF2EF)

```bash
grep -rn "FFF2EF" \
  frontend/app/teacher \
  frontend/app/admin \
  frontend/components/TeacherShell.tsx \
  frontend/components/AdminShell.tsx
```

Expected: zero matches. Replace any found occurrence with `#EFF6FF` (blue-50) in teacher files or `#EEF2FF` (indigo-50) in admin files.

### 4. Sidebar dark-background audit

```bash
grep -rn "0C1220" \
  frontend/components/TeacherShell.tsx \
  frontend/components/AdminShell.tsx
```

Expected: zero matches. Both shells must use `bgcolor: '#FFFFFF'` after plan 16-01.

---

## Manual Visual Smoke Test

Perform once after all plans complete and `npm run build` is green.

| Check | URL | Expected |
|-------|-----|----------|
| Teacher sidebar | /teacher | White sidebar, blue active nav item, no dark background |
| Teacher homework | /teacher/homework | Card grid (3 cols on wide screen), pill filter tabs, view toggle |
| Teacher dashboard | /teacher | 3-zone layout, blue stat cards, Quick Actions grid |
| Admin sidebar | /admin | White sidebar, indigo active nav item |
| Admin teachers | /admin/teachers | Indigo-colored accent elements (not old blue #4F9DFF) |
| Game pages unchanged | /game/* or student login | Dark purple theme preserved (D-08) |

---

## Per-Wave Gates

| Wave | Plans | Gate |
|------|-------|------|
| Wave 1 | 16-01 | `npm run build` + sidebar bgcolor grep |
| Wave 2a | 16-02 | `npm run build` + `grep "F0623A" frontend/app/teacher/page.tsx` = 0 |
| Wave 2b | 16-03 | `npm run build` + `grep "F0623A\|FFF2EF" frontend/app/teacher/homework/page.tsx frontend/app/teacher/classes/page.tsx frontend/app/teacher/students/page.tsx frontend/app/teacher/sessions/page.tsx` = 0 |
| Wave 3 | 16-04 | `npm run build` + `grep "#4F9DFF" admin pages` = 0 + human visual check |

---

## Source

Validation architecture derived from `16-RESEARCH.md § Validation Architecture`.
