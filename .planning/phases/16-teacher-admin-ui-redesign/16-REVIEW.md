---
phase: 16-teacher-admin-ui-redesign
reviewed: 2026-06-21T10:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - frontend/app/admin/classes/page.tsx
  - frontend/app/admin/page.tsx
  - frontend/app/admin/students/page.tsx
  - frontend/app/admin/teachers/page.tsx
  - frontend/app/teacher/classes/page.tsx
  - frontend/app/teacher/homework/_components/ListenCreationPage.tsx
  - frontend/app/teacher/homework/_components/ReadingCreationPage.tsx
  - frontend/app/teacher/homework/create/page.tsx
  - frontend/app/teacher/homework/page.tsx
  - frontend/app/teacher/page.tsx
  - frontend/components/AdminShell.tsx
  - frontend/components/TeacherShell.tsx
  - frontend/lib/colors.ts
  - frontend/lib/theme.ts
findings:
  critical: 3
  warning: 9
  info: 4
  total: 16
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-06-21T10:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

This phase delivers a UI redesign of the teacher and admin shells plus related page components. The visual work is generally solid. However, several correctness issues were found: two genuinely broken UX flows (dead code page that navigates away immediately; "Bulk approve" that cannot function), a date-parsing bug that creates wrong Date objects in certain timezones, duplicated code that diverges in a semantically meaningful way, and multiple missing React hook dependencies that risk stale-closure bugs. The silently-swallowed errors in data loading paths are the most common pattern issue.

---

## Critical Issues

### CR-01: `create/page.tsx` — "Publish homework" immediately navigates away for all non-routing types

**File:** `frontend/app/teacher/homework/create/page.tsx:43-51`

**Issue:** `handlePublish` does two things:
1. For `VOCABULARY` and `LISTEN` (types with a `route`): navigates to the dedicated editor — correct.
2. For `PHONICS` and `SPEAKING` (types with `route: null`): navigates to `/teacher/homework` without ever submitting anything.

The page collects a title and a word list into local state (`title`, `words`, `assignTo`) but never sends them to any API. When the user clicks "Publish homework" on a PHONICS or SPEAKING type the form data is discarded and the user lands back on the list page with nothing created. The `READING` type is also absent from `HW_TYPES` entirely, so the page is effectively dead code for 3 of the 5 supported types.

```tsx
// Current (broken):
function handlePublish() {
  if (pickedMeta.route) {
    router.push(pickedMeta.route);
    return;
  }
  // drops title/words/assignTo silently
  router.push('/teacher/homework');
}
```

**Fix:** Either wire `createHomework` / open the existing `HomeworkModal` for PHONICS/SPEAKING, or remove this page entirely and rely only on the modal flow in `/teacher/homework/page.tsx`. If the page is kept, add a `READING` entry with a route.

---

### CR-02: `admin/students/page.tsx` — "Bulk approve" button is permanently broken

**File:** `frontend/app/admin/students/page.tsx:265-271`

**Issue:** The "Bulk approve" button is rendered with `disabled={selected.size === 0}`, so it only becomes enabled when at least one student is selected. However, there is no `onClick` handler at all on the button — it has no action wired to it. When a user selects students and clicks the button, nothing happens. The `selected` state is populated via `toggleSelect`, but it is never consumed for any API call. This is a broken feature shipped as seemingly functional UI.

```tsx
<Button
  variant="contained"
  disabled={selected.size === 0}
  sx={{ ... }}
>
  + Bulk approve   {/* no onClick — pressing this does nothing */}
</Button>
```

**Fix:** Either implement the bulk approval call or remove the button and the `selected` / `toggleSelect` state entirely to avoid misleading the user.

---

### CR-03: Date parsing creates wrong Date in certain timezones for class start/end fields

**File:** `frontend/app/admin/classes/page.tsx:146-157`, `frontend/app/teacher/classes/page.tsx:124-136`

**Issue:** When parsing an ISO date string like `"2025-09-01"` (no time component) with `new Date("2025-09-01")`, the ECMAScript spec treats it as UTC midnight. In timezones west of UTC (e.g. UTC-5), `new Date("2025-09-01")` resolves to `2025-08-31T19:00:00` local time. The MUI `DatePicker` then displays "August 31" instead of "September 1" in the edit form. When the user opens an existing class in the edit dialog they will see (and potentially save back) a date shifted one day earlier.

```tsx
// Both files:
value={form.startDate ? new Date(form.startDate) : null}
// "2025-09-01" → interpreted as UTC → displays Aug 31 in UTC-5
```

**Fix:** Parse date-only strings with local timezone interpretation:
```ts
function parseDateLocal(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
// Then:
value={parseDateLocal(form.startDate)}
```
The `onChange` already serializes to ISO date string correctly (`v.toISOString().split('T')[0]`), so only the parse direction needs fixing.

---

## Warnings

### WR-01: `admin/classes/page.tsx` — "Code" column rendered twice in every table row

**File:** `frontend/app/admin/classes/page.tsx:443-447`

**Issue:** The first cell renders a `Box` with both `c.name` and `c.code` (stacked). The second cell (the "Code" column) also renders `c.code`. This is intentional duplication visible in the UI — every row shows the code twice. The `COLUMNS` definition confirms `Code` is a separate column (width `0.9fr`). This appears to be a copy-paste mistake left from a redesign where `code` was moved into the name cell without removing the separate code column.

```tsx
// Cell 1 (Class column):
<Box>
  <Typography ...>{c.name}</Typography>
  <Typography ...>{c.code}</Typography>   // <-- also here
</Box>,
// Cell 2 (Code column):
<Typography ...>{c.code}</Typography>,   // <-- and here again
```

**Fix:** Remove `c.code` from the first cell's `Box`, keeping it only in the dedicated Code column, or remove the separate Code column from `COLUMNS`.

---

### WR-02: `admin/classes/page.tsx` — `EditClassModal` has no teacher-assignment UI despite being the only way to assign a teacher

**File:** `frontend/app/admin/classes/page.tsx:453-461`

**Issue:** Clicking "Assign teacher" or "Reassign" in the classes table opens `EditClassModal`. However, `EditClassModal` has no teacher selector field in its form — it only edits name, code, dates, status, and schedule. `AdminUpdateClassInput` presumably supports a `teacherId` field. The admin can open this dialog but cannot actually assign the teacher, making the "Assign teacher" button non-functional in practice.

**Fix:** Add a teacher `<Select>` field inside `EditClassModal` populated from the already-fetched `teachers` state in `ClassesPage`. Pass the teachers list as a prop and add `teacherId` to the form state.

---

### WR-03: `admin/page.tsx` — "Approvals pending" and "Recent activity" are hardcoded mock data

**File:** `frontend/app/admin/page.tsx:59-70`

**Issue:** `APPROVALS` and `ACTIVITY` are module-level constants containing fabricated data ("4 teacher accounts", "Katie Tran created class..."). These are never loaded from the API. The `Review` buttons in the Approvals card call no action. This content will be stale and misleading in a production environment.

**Fix:** Either replace with real API calls (fetching pending approvals and recent activity from the backend), or clearly label these as placeholders and disable the `Review` buttons until the feature is implemented.

---

### WR-04: `teacher/page.tsx` — `loadDashboard` is a missing `useEffect` dependency, risking stale `showToast` closure

**File:** `frontend/app/teacher/page.tsx:71-97`

**Issue:** `loadDashboard` is defined inside the component and closes over `showToast`, but `useEffect(() => { loadDashboard(); }, [])` has an empty dependency array. `loadDashboard` is not stable across renders (not wrapped in `useCallback`). The ESLint suppression comment is absent here — this is simply a missing dep. If `showToast` identity changes (context re-render), the effect will silently use the stale reference. The manual Refresh button re-calls the function but could also use a stale reference from the first render closure.

**Fix:** Wrap `loadDashboard` in `useCallback` with `[showToast]` as deps, or add `loadDashboard` to the dependency array.

```ts
const loadDashboard = useCallback(async () => { ... }, [showToast]);
useEffect(() => { loadDashboard(); }, [loadDashboard]);
```

---

### WR-05: `admin/teachers/page.tsx` and `admin/students/page.tsx` — `useEffect` calling non-memoized functions with empty deps

**File:** `frontend/app/admin/teachers/page.tsx:258`, `frontend/app/admin/students/page.tsx:187-196`

**Issue:** Both pages define `loadTeachers` / the student fetch inline (not wrapped in `useCallback`) and call them from `useEffect` with `[]` or an `eslint-disable` suppression. `showToast` is captured by closure at mount time. In both cases the linter suppression on the students page (line 69) silences the real issue. If the toast context refreshes, error toasts will call a stale reference silently.

**Fix:** Same pattern as WR-04 — wrap in `useCallback` with proper deps.

---

### WR-06: `teacher/classes/page.tsx` — silent error suppression on primary data load

**File:** `frontend/app/teacher/classes/page.tsx:227`

**Issue:** `const load = () => getClasses().then(setClasses).catch(() => {});` — any error silently swallows the failure. If the API call fails (auth expiry, network error) the classes list will remain empty with no user feedback. The same pattern exists in `teacher/homework/page.tsx:759-760`.

**Fix:**
```ts
const load = () => getClasses()
  .then(setClasses)
  .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Failed to load classes.', 'error'));
```

---

### WR-07: `ListenCreationPage.tsx` — empty catch block discards JSON parse error

**File:** `frontend/app/teacher/homework/_components/ListenCreationPage.tsx:274-277`

**Issue:**
```ts
try {
  const arr = JSON.parse(li.keywords);
  if (Array.isArray(arr)) keywords = arr.join(', ');
} catch {}
```
Swallowing this silently is defensible (keywords fall back to raw string) but the `catch {}` will also hide any unexpected runtime error in the `if (Array.isArray(arr))` branch. More importantly, this block indicates the backend sometimes stores keywords as a JSON array and sometimes as a plain string, which is a data inconsistency that should be documented or fixed at source.

**Fix:** At minimum log the parse failure in development, or add a type guard:
```ts
} catch (e) {
  if (process.env.NODE_ENV === 'development') console.warn('keywords not JSON:', e);
}
```

---

### WR-08: `TeacherShell.tsx` — password change timer calls `handleMenuClose` inside its own timeout, causing double-close logic

**File:** `frontend/components/TeacherShell.tsx:88`

**Issue:**
```ts
pwTimerRef.current = setTimeout(() => {
  setShowPwForm(false);
  setPwSuccess(false);
  handleMenuClose();   // <-- calls clearTimeout(pwTimerRef.current) then sets anchorEl=null
}, 1800);
```
`handleMenuClose` (line 75) calls `clearTimeout(pwTimerRef.current)`. When the timeout fires, `pwTimerRef.current` still holds the now-expired timer ID. `clearTimeout` on an expired ID is harmless (per spec), so this is not a crash, but the logic is confusing: `handleMenuClose` is designed to cancel the timer, yet it is being called *from* inside the timer. If `handleMenuClose` is later modified to check `pwTimerRef.current !== null` before acting, it could skip necessary state resets.

**Fix:** Replace the `handleMenuClose()` call inside the timeout with the direct state updates it performs, and set `pwTimerRef.current = null` explicitly:
```ts
pwTimerRef.current = setTimeout(() => {
  setShowPwForm(false);
  setPwSuccess(false);
  setAnchorEl(null);
  pwTimerRef.current = null;
}, 1800);
```

---

### WR-09: `admin/students/page.tsx` — `showToast` not in `useEffect` dependency array (line 195), suppressed by comment

**File:** `frontend/app/admin/students/page.tsx:69, 195`

**Issue:** Two separate `useEffect` hooks suppress `react-hooks/exhaustive-deps`. The student results fetch at line 61-70 closes over `showToast` but suppresses the warning. Stale closure risk is real here: if the student changes rapidly (navigating between students), the toast could fire on an unmounted component or use a stale context reference.

**Fix:** Add a proper cleanup or convert to a stable `useCallback` pattern. Alternatively use an `AbortController` to cancel in-flight requests on cleanup.

---

## Info

### IN-01: Inline magic color constants diverge from `colors.ts` / `theme.ts`

**File:** `frontend/components/AdminShell.tsx:19-21`, `frontend/components/TeacherShell.tsx:22-24`, and throughout all page files

**Issue:** `ACCENT`, `ACCENT_BG`, `ACCENT_TEXT` are redefined locally in every file using hardcoded hex strings. `colors.ts` already exports `adminAccent`, `adminAccentBg`, `teacherAccent`, `teacherAccentBg`. The values are consistent today, but if a brand color changes, every file must be updated independently.

**Fix:** Replace local constants with imports from `@/lib/colors`:
```ts
import { colors } from '@/lib/colors';
const ACCENT = colors.adminAccent;
const ACCENT_BG = colors.adminAccentBg;
```

---

### IN-02: `teacher/homework/page.tsx` — submission count / total enrolled logic duplicated between card and table views

**File:** `frontend/app/teacher/homework/page.tsx:651-671` (HwCard) and `929-950` (table view)

**Issue:** The logic for computing `submittedCount`, `totalEnrolled`, `classNames`, `nearestDue`, `dueText`, and `isOverdue` is copy-pasted verbatim between the grid card component and the table row renderer. They are already slightly inconsistent: `hwName` truncates at 32 characters in both, but `assignHeading` in `AssignModal` (line 548) truncates at 30.

**Fix:** Extract into a helper function or compute these derived values outside both renderers:
```ts
function deriveHwDisplayInfo(h: HomeworkItem, now: Date) { ... }
```

---

### IN-03: `admin/classes/page.tsx` — `TableRow` columns prop passed redundantly on every row in table view

**File:** `frontend/app/teacher/classes/page.tsx:342-350`

**Issue:** The `columns` prop is passed to both `<TableShell>` and each `<TableShellRow>`. Inside the mapped render loop, the `columns` array is re-created as an inline literal on every row render:
```tsx
<TableShellRow
  columns={[
    { label: 'Class', width: '2fr' },
    ...
  ]}
  ...
/>
```
This creates a new array reference on every render cycle for every row. Not a performance finding (out of scope), but it indicates the columns should be extracted to a module-level constant as is done in the admin pages.

**Fix:** Extract to a `const COLUMNS = [...]` at module scope and reference it in both `<TableShell>` and each `<TableShellRow>`.

---

### IN-04: `gradients.sidebar` in `colors.ts` is unused (references old dark sidebar style)

**File:** `frontend/lib/colors.ts:35`

**Issue:**
```ts
sidebar: 'linear-gradient(180deg, #1F2937 0%, #374151 100%)',
```
Both `AdminShell` and `TeacherShell` now use a white sidebar (`bgcolor: '#FFFFFF'`). The `gradients.sidebar` value is a remnant of the previous dark sidebar design. A search confirms it is not imported by any of the reviewed files.

**Fix:** Remove `sidebar` from `gradients` or leave a comment indicating it is kept for legacy reference.

---

_Reviewed: 2026-06-21T10:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
