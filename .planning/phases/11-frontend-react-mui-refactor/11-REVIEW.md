---
phase: 11
status: issues_found
critical: 3
warning: 9
info: 5
reviewed: 2026-06-05T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - frontend/app/admin/classes/page.tsx
  - frontend/app/admin/homework/page.tsx
  - frontend/app/admin/layout.tsx
  - frontend/app/admin/login/page.tsx
  - frontend/app/admin/page.tsx
  - frontend/app/admin/students/page.tsx
  - frontend/app/admin/teachers/page.tsx
  - frontend/app/game/homework/page.tsx
  - frontend/app/game/layout.tsx
  - frontend/app/game/listen/[id]/page.tsx
  - frontend/app/game/login/page.tsx
  - frontend/app/game/session/[id]/_components/RecordButton.tsx
  - frontend/app/game/session/[id]/page.tsx
  - frontend/app/game/vocab/[id]/page.tsx
  - frontend/app/teacher/classes/page.tsx
  - frontend/app/teacher/homework/create/page.tsx
  - frontend/app/teacher/homework/page.tsx
  - frontend/app/teacher/login/page.tsx
  - frontend/app/teacher/students/page.tsx
  - frontend/components/AdminShell.tsx
  - frontend/components/TeacherShell.tsx
---

# Phase 11: Code Review Report

**Reviewed:** 2026-06-05
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Phase 11 refactors the entire frontend to React/MUI. The overall structure is sound — auth patterns are consistent, MUI usage is correct for the most part, and the game pages handle media cleanup on unmount. Three blockers were found: a hardcoded localhost URL leaked into the production audio URL assignment in the listen game, an unguarded `user.upn[0]` access that crashes when `upn` is an empty string, and an open RegExp injection path in keyword matching in the listen game. Nine warnings cover missing toast timer cleanup, broken teacher-filter dropdown, a stub create-homework page that silently discards data, missing React list keys on table cell content, and several minor logic issues. Five info items cover dead code, duplicate column definitions, and style inconsistencies.

---

## Critical Issues

### CR-01: RegExp injection via unsanitised keyword content (listen game)

**File:** `frontend/app/game/listen/[id]/page.tsx:188`
**Issue:** The keyword-to-regex escape runs `kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` correctly for most metacharacters, but the regex is then fed `\\b` word-boundary anchors. If a keyword is entirely non-word characters (e.g. `"!"` or `"?"`) the `\b` anchor produces a malformed or always-false regex — but more importantly a crafted keyword containing a newline or unescaped `\` could still slip through if the server returns unexpected data. The escape is applied to `kw.toLowerCase()` *after* the outer try/catch, so a thrown SyntaxError from `new RegExp(...)` would be swallowed. The real risk is that teacher-supplied keywords (stored in the DB as a JSON string) are directly interpolated into a live `RegExp` with only partial escaping: if the JSON parsing succeeds and returns a string like `"(?i)"` or any PCRE-lookahead that Chrome's JS engine rejects, the whole scoring block fails silently and returns no matched keywords, which degrades the student's score without any visible error.
**Fix:**
```typescript
// Wrap the RegExp construction itself in try/catch
try {
  const pattern = new RegExp(
    '\\b' + kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'
  );
  return pattern.test(result.transcript.toLowerCase());
} catch {
  return false; // malformed keyword — skip silently
}
```
The outer `try { kwArr = JSON.parse(...) } catch {}` already exists; add a per-keyword guard inside the `kwArr.filter()` callback.

---

### CR-02: Hardcoded fallback `localhost:3001` exposed in production audio fetch

**File:** `frontend/app/game/listen/[id]/page.tsx:16`
**File:** `frontend/app/game/session/[id]/page.tsx:42`
**File:** `frontend/app/game/vocab/[id]/page.tsx:16`
**Issue:** All three game pages declare `const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'`. When `NEXT_PUBLIC_API_URL` is not set in a staging or production build (a common misconfiguration), every `fetch` silently targets `localhost:3001`, causing all game sessions to fail with a network error. The student sees a generic "Session not found" screen with no indication of misconfiguration. Because this is a `NEXT_PUBLIC_` variable it is baked in at build time — a missing env var produces a broken build that looks healthy.
**Fix:** Replace the silent fallback with a build-time assertion:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not set');
```
Or at minimum log a console error so the issue surfaces immediately in production monitoring.

---

### CR-03: Unguarded `user.upn[0]` — crash when `upn` is empty string

**File:** `frontend/app/game/homework/page.tsx:193`
**Issue:** `user.upn[0].toUpperCase()` is called directly without a null or length check. The `AuthUser` type may have `upn` as an empty string (e.g. if the JWT payload `upn` field is missing or blank), which makes `user.upn[0]` return `undefined`, and `.toUpperCase()` throws `TypeError: Cannot read properties of undefined`. This crashes the homework page for any student whose account is malformed.
**Fix:**
```typescript
{(user.upn?.[0] ?? '?').toUpperCase()}
```
The same pattern is already used correctly in `AdminShell.tsx` line 168 (`user.email?.[0] ?? '?'`) and `TeacherShell.tsx` line 212 (`user.upn?.[0] ?? '?'`). Apply the same guard here.

---

## Warnings

### WR-01: Toast timer in `StudentResults` not cleared on unmount (memory leak / stale setState)

**File:** `frontend/app/admin/students/page.tsx:47-50`
**Issue:** The `showToast` function inside `StudentResults` calls `setTimeout(() => setToast(''), 3000)` without storing the timer handle and without a cleanup effect. If the component unmounts (user clicks "Back") before the 3-second timer fires, React will log a warning about setting state on an unmounted component, and in development strict mode this can surface as a double-invocation bug. All other pages in this phase (e.g. `ClassesPage`, `TeachersPage`) correctly use `useRef` + `clearTimeout` in a cleanup effect.
**Fix:**
```typescript
const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
function showToast(msg: string) {
  setToast(msg);
  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  toastTimerRef.current = setTimeout(() => setToast(''), 3000);
}
useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
```

### WR-02: Same pattern in `HomeworkPage` (admin) — timer not cleaned up

**File:** `frontend/app/admin/homework/page.tsx:70-73`
**Issue:** Identical to WR-01. `showToast` creates a bare `setTimeout` with no stored handle and no cleanup, in the `HomeworkPage` component.
**Fix:** Same as WR-01 — add `useRef` timer handle and a cleanup effect.

### WR-03: Teacher-filter dropdown in admin homework page has no effect

**File:** `frontend/app/admin/homework/page.tsx:107`
**Issue:** The teacher filter dropdown is rendered and its state (`teacherFilter`) changes, but the filter logic on line 107 always returns `true` for `matchTeacher`:
```typescript
const matchTeacher = teacherFilter === 'ALL'; // teacher info not in AdminHomeworkItem
```
This means the filter never actually filters — selecting any teacher shows all homework. The comment acknowledges the issue but the UI still renders a functional-looking filter control, which will confuse users who try to use it.
**Fix:** Either remove the teacher filter UI entirely until the API exposes teacher information on `AdminHomeworkItem`, or fetch the teacher info and wire the filter up. Leaving a non-functional filter in production is misleading. At minimum, disable the `Select` when it cannot function:
```typescript
<Select disabled={true} ... >
```

### WR-04: `create/page.tsx` (teacher homework) is a dead stub — silently discards all input

**File:** `frontend/app/teacher/homework/create/page.tsx:43-51`
**Issue:** The "Create Homework" page at `/teacher/homework/create` allows teachers to pick a type, build a word list, set a title and assign-to class — but `handlePublish()` either navigates to a dedicated editor (VOCABULARY/LISTEN) or routes back to `/teacher/homework` (PHONICS/SPEAKING) **without submitting any data**. The word list, title, and assignTo fields are local state that is discarded. A teacher who spends time building a word list on this page will lose all their work when they click "Publish homework". This is a significant data-loss UX bug.
**Fix:** Either remove this stub page and redirect `/teacher/homework/create` directly to the homework modal on the homework list page, or wire the form up to actually call `createHomework()` before navigating away.

### WR-05: Missing React `key` on table cell content nodes (multiple pages)

**File:** `frontend/app/admin/classes/page.tsx:461`
**File:** `frontend/app/admin/students/page.tsx:312`
**File:** `frontend/app/admin/teachers/page.tsx:368`
**Issue:** `TableRow` renders its `cells` array with `cells.map((cell, index) => <Box key={index}>...)` using array indexes as keys — this is acceptable for the outer wrapper. However, the JSX elements passed as `cells` items (e.g. `<Box>`, `<Typography>`, `<Button>`) are themselves React nodes that contain child arrays rendered without keys. For example in `ClassesPage` line 461, the `cells` array is constructed inline with JSX elements that contain inner maps without keys. In `StudentsPage` line 571, `s.parents.map((p) => <Typography key={p.id} ...>)` is correct, but several other inline cell arrays in the same file lack keys. While React will still render these, it produces console warnings and can cause subtle reconciliation bugs when rows reorder.
**Fix:** Verify every map inside a `cells` element passes a stable key (prefer `p.id` or similar, not `index`).

### WR-06: `processItem` in session page called twice when timer fires at same time as `handleSubmitItem`

**File:** `frontend/app/game/session/[id]/page.tsx:316-318`
**Issue:** `processItem` guards against double-invocation with `processingRef.current`, which is correct. However, the timer callback on line 317 calls `processItem(index, finalTextRef.current)` directly, and `handleSubmitItem` (line 327-330) also calls `processItem`. There is a race condition: if the user clicks "Tiếp →" at the same moment the timer fires (both within the same JavaScript event loop turn before `processingRef.current` is set), both calls can enter the function before the guard is set. The guard is set at line 268 (`processingRef.current = true`) synchronously, so in practice this is safe within a single-threaded JS environment — but the `setInterval` fires via a task queue while `handleSubmitItem` fires via a microtask chain after an `await`. A click exactly on the last tick can trigger `processItem` twice in the same microtask checkpoint before `processingRef` is checked. The result is a double submission of phonics results for the same word index.
**Fix:** Set `processingRef.current = true` at the top of both `handleSubmitItem` and the timer callback, before the async call to `processItem`:
```typescript
timerRef.current = setInterval(() => {
  remaining -= 1;
  setTimeLeft(remaining);
  if (remaining <= 0) {
    if (!processingRef.current) processItem(index, finalTextRef.current);
  }
}, 1000);
```

### WR-07: `handleSpeakingUpload` in session page does not show error to user on failure

**File:** `frontend/app/game/session/[id]/page.tsx:430-451`
**Issue:** `handleSpeakingUpload` sets `setSaveError(true)` and logs to console on error (line 448), but the page immediately transitions to `setPageState('results')` regardless of success or failure. On the results screen, `saveError` shows a small text note "Không thể lưu bản ghi âm" but the `items` array will be empty (since `setItems(...)` inside the try block was not reached), causing the results screen to render with no items and a score of 0%. The student sees a "Hoàn thành bài tập!" screen with 0% and no items, with no clear indication that the upload failed or what to do.
**Fix:** On error in `handleSpeakingUpload`, stay on the `record` page state and show an inline error rather than navigating to results with empty items:
```typescript
} catch (err) {
  console.error('[speakUpload] failed:', err);
  setSaveError(true);
  setPageState('record'); // stay on record page, show retry
}
```

### WR-08: Admin layout `TITLES` map — dynamic sub-routes fall back silently to 'Admin Portal'

**File:** `frontend/app/admin/layout.tsx:85`
**Issue:** `const meta = TITLES[pathname] ?? { title: 'Admin Portal', subtitle: undefined }` uses exact pathname matching. Any sub-route (e.g. a future `/admin/teachers/123`) falls back to the generic "Admin Portal" title. This is not a crash, but it means any new admin sub-page will silently show the wrong breadcrumb/title in the shell header without any indication that the `TITLES` map needs updating. The `TeacherShell` avoids this by accepting `title` as a prop, making it impossible to forget.
**Fix:** Either accept `title` as a prop in `AdminShell` (matching the teacher pattern) so callers are forced to provide it, or add a development-mode assertion that warns when a pathname is not in the `TITLES` map.

### WR-09: Duplicate column definitions in `teacher/classes/page.tsx` — passed both to `TableShell` and each `TableShellRow`

**File:** `frontend/app/teacher/classes/page.tsx:325-330` and `358-364`
**Issue:** The `COLUMNS` array (5 columns) is passed to `<TableShell columns={...}>` on line 325, and then the *identical* inline literal array is passed again to each `<TableShellRow columns={[...]}>` on line 358. The `TableRow` component receives `columns` only to compute `gridTemplateColumns`, which is already set by `TableShell`'s header row. Passing duplicate inline column objects to every row creates unnecessary object allocations on every render and means a change to the column widths must be updated in two places.

The same duplication exists in `teacher/homework/page.tsx` (lines 759-765 and 802-808) and `teacher/students/page.tsx` (lines 505-510 and 543-549).
**Fix:** Define the columns once as a module-level constant and pass the same reference to both `TableShell` and each `TableShellRow`.

---

## Info

### IN-01: `admin/page.tsx` — `APPROVALS` and `ACTIVITY` are hardcoded static data

**File:** `frontend/app/admin/page.tsx:58-69`
**Issue:** The "Approvals pending" and "Recent activity" panels on the admin dashboard display hardcoded static strings (`'4 teacher accounts'`, `'12 students completed Phonics — week 3'`, etc.). The stat cards above them fetch real data, so a user will see live counts alongside fake activity, which is misleading. The "Review" buttons for approvals are also non-functional (`variant="text"` buttons with no `onClick`).
**Fix:** Either fetch real pending approval and activity data from the backend, or make it visually clear that these panels show placeholder data (e.g. add a "Coming soon" badge, or remove them entirely until the API supports them).

### IN-02: `teacher/homework/create/page.tsx` — `title` and `assignTo` state are unused beyond local state

**File:** `frontend/app/teacher/homework/create/page.tsx:25-26`
**Issue:** `const [title, setTitle] = useState('')` and `const [assignTo, setAssignTo] = useState('')` are declared and wired to `TextField` inputs, but neither is ever read by any logic. Since the form never submits (see WR-04), these values are always discarded. Dead code.
**Fix:** Remove the state and the corresponding `TextField` inputs until the page is wired up to actually submit.

### IN-03: `HwTypeChip` has no guard for unknown `type` values

**File:** `frontend/components/ui/HwTypeChip.tsx:23`
**Issue:** `const config = CONFIG[type]` — if `type` is an unexpected value not in `CONFIG` (e.g. from a future homework type added on the backend before the frontend is updated), `config` will be `undefined` and the component will crash with `TypeError: Cannot read properties of undefined`. TypeScript catches this at compile time within the same build, but at runtime if API data arrives with an unknown type string, it will crash.
**Fix:**
```typescript
const config = CONFIG[type] ?? CONFIG['PHONICS']; // fallback to prevent crash
```
Or render a neutral chip: `if (!config) return <Chip label={type} />;`

### IN-04: `lib/theme.ts` marked `'use client'` but exports pure objects — should be isomorphic

**File:** `frontend/lib/theme.ts:1`
**Issue:** `'use client'` forces the entire theme module to be treated as a client-only module. Since `createTheme` is a pure function with no browser API usage, this directive is unnecessary and prevents server components from importing theme tokens. The directive causes Next.js to include the theme in the client bundle instead of potentially sharing it via server rendering.
**Fix:** Remove `'use client'` from `theme.ts` and `student-theme.ts`. MUI themes created with `createTheme` are plain objects and do not require browser APIs.

### IN-05: `TableShell` / `TableRow` use array index as `key` — known React anti-pattern

**File:** `frontend/components/ui/TableShell.tsx:32`
**Issue:** `cells.map((cell, index) => <Box key={index}>...)` — using array index as key. When cells are added, removed, or reordered, React's reconciler will produce incorrect diffs. This is flagged as an anti-pattern in the React docs. The columns array is also keyed by index (`columns.map((col, index) => <Typography key={index}>)`). For static-structure tables this rarely causes visible bugs, but it is a quality issue that should be addressed.
**Fix:** If cells have stable identifiers (column names), use the column label as the key.

---

_Reviewed: 2026-06-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
