---
phase: 11-frontend-refactor-with-react-mui
reviewed: 2026-06-01T00:00:00Z
depth: standard
files_reviewed: 34
files_reviewed_list:
  - frontend/lib/theme.ts
  - frontend/lib/student-theme.ts
  - frontend/lib/utils.ts
  - frontend/app/layout.tsx
  - frontend/app/globals.css
  - frontend/app/game/layout.tsx
  - frontend/app/login/page.tsx
  - frontend/components/AuthGate.tsx
  - frontend/components/TeacherShell.tsx
  - frontend/components/AdminShell.tsx
  - frontend/components/PhonemeButton.tsx
  - frontend/components/ResultBanner.tsx
  - frontend/components/SelectedPhonemes.tsx
  - frontend/app/teacher/layout.tsx
  - frontend/app/teacher/page.tsx
  - frontend/app/teacher/classes/page.tsx
  - frontend/app/teacher/students/page.tsx
  - frontend/app/teacher/sessions/page.tsx
  - frontend/app/teacher/homework/page.tsx
  - frontend/app/teacher/homework/[id]/page.tsx
  - frontend/app/teacher/homework/[id]/try/page.tsx
  - frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx
  - frontend/app/teacher/homework/[id]/edit/page.tsx
  - frontend/app/teacher/homework/create/reading/page.tsx
  - frontend/app/teacher/homework/_components/ReadingCreationPage.tsx
  - frontend/app/game/page.tsx
  - frontend/app/game/homework/page.tsx
  - frontend/app/game/session/[id]/page.tsx
  - frontend/app/game/session/[id]/_components/PhonemeChips.tsx
  - frontend/app/game/reading/[id]/page.tsx
  - frontend/app/admin/layout.tsx
  - frontend/app/admin/login/page.tsx
  - frontend/app/admin/page.tsx
  - frontend/app/admin/teachers/page.tsx
  - frontend/app/admin/classes/page.tsx
  - frontend/app/admin/students/page.tsx
  - frontend/app/admin/homework/page.tsx
findings:
  critical: 8
  warning: 12
  info: 5
  total: 25
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-06-01T00:00:00Z
**Depth:** standard
**Files Reviewed:** 34
**Status:** issues_found

## Summary

Phase 11 migrated all frontend pages from Tailwind CSS to MUI v9. The migration is structurally sound and the build passes clean. However, the review found 8 blockers and 12 warnings spanning three categories:

1. **Auth gate bypasses**: `AuthGate` and both layout auth guards have a missing-dependency `useEffect(fn, [])` that silently skips re-running when the authenticated-user contract changes. More critically, the teacher `/try` page wraps each render branch individually in `<AuthGate>` — if `pageState` transitions before the gate completes, a child renders without authentication being verified first.

2. **Unhandled async errors in delete flows**: Several inline `onClick={async () => { await deleteFoo(...) }}` handlers have no `try/catch`. A network failure will throw an unhandled promise rejection, leaving the UI in an inconsistent confirm state.

3. **State race in `finishSession` (reading game)**: The `computeTotals` / `finishSession` pattern uses a `setActivityStates(prev => { /* read but no-op return */ })` trick to capture state snapshots, which relies on React batching in a way that is not guaranteed. The reading session score can be sent to the backend as 0/0 under React Strict Mode double-invocation.

4. **`console.log` left in production code** (`game/page.tsx`), `'use client'` on a pure theme file that never uses hooks, `primary.50`/`error.50` MUI palette shortcuts used in `sx` that do not exist in v9 without custom palette augmentation, and an `IconButton` used as an avatar with no `aria-label`.

---

## Critical Issues

### CR-01: Auth re-run never fires on role change — missing dependency in `useEffect`

**File:** `frontend/components/AuthGate.tsx:17-25`
**Issue:** The effect has an empty dependency array `[]`, so it runs exactly once on mount and never again. `router` and `requiredRole` are both used inside the effect but excluded from deps. In Next.js 15 (App Router) components can remount with different props (e.g., when the same page is navigated to with a different `requiredRole`). The stale closure will not redirect the user to the correct route and the previously-authed user object will be served to `children`.

The same pattern is repeated in:
- `frontend/app/teacher/layout.tsx:23-27` — missing `router` in deps
- `frontend/app/admin/layout.tsx:22-28` — missing `router` and `pathname`

**Fix:**
```typescript
// AuthGate.tsx
useEffect(() => {
  const u = getUser();
  if (!u) { router.replace('/login'); return; }
  if (requiredRole && u.role !== requiredRole) {
    router.replace(u.role === 'TEACHER' ? '/teacher' : '/game/homework');
    return;
  }
  setUser(u);
}, [router, requiredRole]);

// teacher/layout.tsx
useEffect(() => {
  const u = getUser();
  if (!u || u.role !== 'TEACHER') { router.replace('/login'); return; }
  setUser(u);
}, [router]);

// admin/layout.tsx
useEffect(() => {
  if (pathname === '/admin/login') return;
  const u = getAdminUser();
  if (!u || u.role !== 'ADMIN') { router.replace('/admin/login'); return; }
  setUser(u);
}, [pathname, router]);
```

---

### CR-02: `<AuthGate>` re-instantiated on every render branch in the Try Homework page

**File:** `frontend/app/teacher/homework/[id]/try/page.tsx:499-999`
**Issue:** `TeacherTryHomeworkPage` renders an `<AuthGate requiredRole="TEACHER">` wrapper inside *each* early-return branch (`loading`, `error`, `speak_upload`, `speak_uploading`, `speak_results`, `phonics_word_select`, `phonics_upload`, `phonics_uploading`, `phonics_results`, `reading_playing`, `reading_done`). This creates a new `AuthGate` component instance every time `pageState` changes, forcing a full mount/unmount cycle. More critically, when `pageState` transitions from `'loading'` to `'speak_upload'`, React unmounts the old `AuthGate` and mounts a new one — during the unmount/remount gap the `user === undefined` loading spinner briefly renders, causing a flash of the loading UI. If the component tree unmounts entirely between state transitions, the side-effect inside `AuthGate`'s `useEffect` fires again, triggering redundant re-authentication calls. The correct pattern is a single top-level guard.

**Fix:**
```typescript
export default function TeacherTryHomeworkPage() {
  // ... all hooks ...
  return (
    <AuthGate requiredRole="TEACHER">
      {() => <TryHomeworkContent /* pass all state as props */ />}
    </AuthGate>
  );
}

function TryHomeworkContent(props: ...) {
  // All the pageState branches render here — no AuthGate inside
}
```

---

### CR-03: Unhandled promise rejection in inline delete handlers

**File:** `frontend/app/teacher/classes/page.tsx:381`
```tsx
onClick={async () => { await deleteClass(c.id); setDeletingId(null); load(); showToast('Class deleted.'); }}
```
**File:** `frontend/app/teacher/students/page.tsx:548`
```tsx
onClick={async () => { await deleteStudent(s.id); setDeletingId(null); load(...); showToast(...); }}
```
**File:** `frontend/app/teacher/homework/[id]/page.tsx:197`
```tsx
if (confirm('Remove this assignment?')) { await deleteAssignment(a.id); load(); }
```
**Issue:** None of these `async onClick` handlers have a `try/catch`. A network error throws an unhandled promise rejection. When `deleteClass` or `deleteStudent` fails, `setDeletingId(null)` is also never called, leaving the card stuck in the "confirm delete" UI state indefinitely with no way out except a page refresh.

**Fix:**
```typescript
onClick={async () => {
  try {
    await deleteClass(c.id);
    setDeletingId(null);
    load();
    showToast('Class deleted.');
  } catch {
    setDeletingId(null);
    // Optionally show an inline error
  }
}}
```

---

### CR-04: State-snapshot race in `finishSession` — reading game score submitted as 0

**File:** `frontend/app/game/reading/[id]/page.tsx:506-533`
**Issue:** `finishSession` uses `setActivityStates(prev => { /* accumulate totals */ return prev; })` to read current state inside a state updater. This is a misuse of the setter — React may batch or skip the call, and in Strict Mode the updater runs twice (the second run produces the real result, but `total` and `correct` are closed-over `let` variables that keep accumulating). The `await new Promise(r => setTimeout(r, 50))` comment acknowledges the race but the workaround is not reliable.

The identical pattern appears in `computeTotals` (line 488) which is defined but never called (dead code).

**Fix:** Use `useRef` or pass a snapshot of the state into the function directly:
```typescript
const finishSession = useCallback(async (snapshot: ActivityState[]) => {
  setPageState('submitting');
  let total = 0, correct = 0;
  for (const a of snapshot) {
    if (a.type === 'MATCH') {
      total += a.pairs.length;
      correct += a.pairs.filter((p) => p.status === 'locked').length;
    } else {
      total += a.items.length;
      correct += a.items.filter((it) => it.correct === true).length;
    }
  }
  // ... rest of submit
}, [sessionId]);

// Call site:
const advanceActivity = () => {
  if (currentActivityIndex + 1 >= activityStates.length) {
    finishSession(activityStates); // pass snapshot directly
  } else { ... }
};
```

---

### CR-05: `'use client'` directive on theme files with no client-only APIs

**File:** `frontend/lib/theme.ts:1`
**File:** `frontend/lib/student-theme.ts:1`
**Issue:** Both theme files carry `'use client'` at the top. `createTheme` and `keyframes` from `@mui/material/styles` and `@mui/system` are pure JavaScript utilities that work equally well in the server context. Marking these as client-only forces every server component that imports a theme token (for SSR-side styling) to shift to the client bundle, inflating client-bundle size. In Next.js 15, `ThemeProvider` already ensures the theme is passed down client-side; the theme definition itself does not need to be a client module.

**Fix:** Remove `'use client';` from both `theme.ts` and `student-theme.ts`.

---

### CR-06: `primary.50`/`error.50` palette shorthand used in `sx` props — non-existent tokens cause silent style failures

**File:** `frontend/components/PhonemeButton.tsx:44`
```tsx
'&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
```
**File:** `frontend/app/teacher/students/page.tsx:558`
```tsx
'&:hover': { bgcolor: 'error.50' }
```
**File:** `frontend/app/teacher/homework/page.tsx:858`
```tsx
'&:hover': { bgcolor: 'primary.50' }
```
**Issue:** MUI v9's default theme palette does not include `primary.50` or `error.50`. These token strings resolve to `undefined`, which MUI silently ignores. The hover styles fail to apply, resulting in no background color change on hover. The theme definition in `theme.ts` does not augment the palette to add these shades.

**Fix:** Either add `50`/`100` shades to the custom theme:
```typescript
// theme.ts — inside palette.primary
primary: { main: '#4F9DFF', ..., 50: '#EFF6FF', 100: '#DBEAFE' },
```
or replace the shorthand with explicit hex values:
```tsx
'&:hover': { bgcolor: '#EFF6FF' }  // primary.50 equivalent
'&:hover': { bgcolor: '#FEF2F2' }  // error.50 equivalent
```

---

### CR-07: `IconButton` avatar buttons lack `aria-label` — screen readers announce nothing

**File:** `frontend/components/TeacherShell.tsx:194-202`
```tsx
<IconButton onClick={handleMenuOpen} sx={{ ... }}>
  {user.upn[0].toUpperCase()}
</IconButton>
```
**File:** `frontend/components/AdminShell.tsx:133-137`
```tsx
<IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ... }}>
  {user.email[0].toUpperCase()}
</IconButton>
```
**Issue:** Both avatar `IconButton` elements use a single character as their visible label, but provide no `aria-label`. A screen reader announces the button as the raw character (e.g., "J button") rather than its purpose ("Open account menu"). The `IconButton` in the `TeacherShell` user-menu close button (`<X size={14} />` at line 230) also lacks an `aria-label`.

**Fix:**
```tsx
<IconButton
  onClick={handleMenuOpen}
  aria-label="Open account menu"
  aria-haspopup="true"
  aria-expanded={showUserMenu}
  sx={{ ... }}
>
  {user.upn[0].toUpperCase()}
</IconButton>

// Close button
<IconButton size="small" onClick={handleMenuClose} aria-label="Close menu" sx={{ ... }}>
  <X size={14} />
</IconButton>
```

---

### CR-08: `button` nested inside `button` — invalid HTML causes event propagation issues

**File:** `frontend/components/PhonemeButton.tsx:50-73`
**Issue:** A `<Box component="button">` (the audio play button) is rendered as a direct child of `<Button>` (which also renders a `<button>` element). This creates a `<button>` inside a `<button>`, which is invalid HTML per the HTML5 spec. Browsers handle this inconsistently: Chrome promotes the inner button out of the outer button, breaking the layout. The `e.stopPropagation()` call in `playAudio` correctly tries to prevent the outer `onClick` from firing, but because the DOM is malformed, browser behaviour is undefined — on some browsers the stop-propagation has no effect and both the audio plays *and* the phoneme is selected/deselected.

**Fix:** Change the outer `<Button>` to a `<Box component="div">` and manage the keyboard interaction manually, or restructure so the play button is a sibling rather than a child:
```tsx
// Option: use a Box container instead of Button
<Box sx={{ position: 'relative', width: 80, height: 80 }}>
  <Box
    component="button"
    onClick={onClick}
    sx={{ width: '100%', height: '100%', ... }}
  >
    {symbol}
  </Box>
  <Box
    component="button"
    onClick={playAudio}
    sx={{ position: 'absolute', top: -8, right: -8, ... }}
  >
    ▶
  </Box>
</Box>
```

---

## Warnings

### WR-01: `useEffect` missing `loadWord` dependency in `game/page.tsx`

**File:** `frontend/app/game/page.tsx:41-43`
```tsx
useEffect(() => {
  loadWord(level);
}, []);  // missing loadWord, level
```
**Issue:** `loadWord` is a `useCallback` with an empty dep array, but `level` starts at `1` and the `useEffect` also closes over `level`. If the level state ever changes before the initial load completes, the initial load runs with the wrong level. The exhaustive-deps lint rule would flag this.

**Fix:**
```tsx
useEffect(() => {
  loadWord(level);
}, [loadWord, level]);
```
(Note: this will re-trigger on every `level` change, which is correct; the duplicate call from the `onClick` handler should be removed.)

---

### WR-02: `console.log` left in production code

**File:** `frontend/app/game/page.tsx:26`
```typescript
console.log('Loading word for level', lvl);
```
**Issue:** Debug logging left in production code; leaks internal state to browser devtools.

**Fix:** Remove the `console.log` call.

---

### WR-03: `loadPending` and `loadResets` defined inside render — new function reference on every render

**File:** `frontend/app/teacher/students/page.tsx:373-374`
```typescript
const loadPending = () => getPendingStudents().then(setPending).catch(() => {});
const loadResets = () => getPasswordResetRequests().then(setResetRequests).catch(() => {});
```
**Issue:** These are plain arrow functions declared in the component body. Every render creates new function instances. They are passed as `onClick` handlers and used in `useEffect` (line 376-381). Using them in `useEffect` with `[]` deps avoids the re-render problem only because the effect never re-runs — but any future attempt to add them to a dependency array will cause infinite loops. They should be wrapped in `useCallback`.

**Fix:**
```typescript
const loadPending = useCallback(() => {
  getPendingStudents().then(setPending).catch(() => {});
}, []);

const loadResets = useCallback(() => {
  getPasswordResetRequests().then(setResetRequests).catch(() => {});
}, []);
```

---

### WR-04: `doSearch` in sessions page called inside `useEffect` with empty deps, not listed as dep

**File:** `frontend/app/teacher/sessions/page.tsx:48-53`
```typescript
useEffect(() => {
  getStudents().then(setStudents).catch(() => {});
  getHomeworkList().then(setHomeworks).catch(() => {});
  doSearch();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```
**Issue:** `doSearch` reads `assignmentFilter` and `studentFilter` from component state. The `// eslint-disable-next-line` suppresses the missing dependency warning. If filters are ever pre-populated from URL parameters in the future, the initial search will silently use stale default values instead.

**Fix:** Extract the initial data load into a separate `useEffect` and let `doSearch` be called separately when filters change, or use `useCallback` and add it to the dep array.

---

### WR-05: `showToast` uses raw `setTimeout` — timer leaks on unmount

**File:** `frontend/app/teacher/classes/page.tsx:229`
**File:** `frontend/app/teacher/students/page.tsx:386`
**File:** `frontend/app/teacher/homework/page.tsx:612-615`
**File:** `frontend/app/admin/teachers/page.tsx:221-224`
**File:** `frontend/app/admin/classes/page.tsx:311-314`
```typescript
function showToast(msg: string) {
  setToast(msg);
  setTimeout(() => setToast(''), 3000);
}
```
**Issue:** The `setTimeout` return value is discarded, so the timer cannot be cancelled. If the component unmounts before the 3-second timeout fires (e.g., user navigates away), React will call `setToast('')` on an unmounted component, generating a React warning. In React 18 strict mode this is benign but will produce noisy console warnings.

**Fix:** Use a `useRef` to track the timer and clear it on unmount or when a new toast is scheduled.

---

### WR-06: Stale closure in `TeacherShell.handleChangePassword` success timeout

**File:** `frontend/components/TeacherShell.tsx:80`
```typescript
setTimeout(() => { setShowPwForm(false); setPwSuccess(false); handleMenuClose(); }, 1800);
```
**Issue:** If the component unmounts while the 1800ms timer is pending (user navigates away), the callbacks fire on an unmounted component. The timer is also not cancelled if the user closes the menu manually before it expires.

**Fix:** Store the timer in a `useRef` and clear it in a cleanup function or on `handleMenuClose`.

---

### WR-07: Delete-without-error-boundary in `TeacherHomeworkDetailPage`

**File:** `frontend/app/teacher/homework/[id]/page.tsx:196-199`
```tsx
onClick={async () => {
  if (confirm('Remove this assignment?')) { await deleteAssignment(a.id); load(); }
}}
```
**Issue:** `confirm()` is deprecated in many contexts and does not work in iframes or certain PWA configurations. Beyond the API concern: the `async onClick` handler has no error handling. A failure in `deleteAssignment` leaves the user on the same page with no feedback.

**Fix:** Replace the browser `confirm()` with an inline confirmation UI (already used elsewhere in the codebase) and add a `try/catch`.

---

### WR-08: `finishSession` in `game/session/[id]/page.tsx` silently suppresses BFA scoring errors

**File:** `frontend/app/game/session/[id]/page.tsx:370-373`
```typescript
} catch (err) {
  console.error(`[score] item="${item.text}"`, err);
}
```
**Issue:** When `savePhonicsResult` or `saveSpeakingResult` throws (e.g., network error, 500 from backend), the item score stays at 0 and the error is only logged to the console — the student sees a 0% for that item with no indication of a failure. On the results screen `setSaveError(true)` is only set for `completeSession` failure, not for individual item scoring failures.

**Fix:** Track per-item save failures and display them on the results screen, or set `setSaveError(true)` when any item fails to save.

---

### WR-09: `advanceActivity` in `game/reading/[id]/page.tsx` defined inline inside render

**File:** `frontend/app/game/reading/[id]/page.tsx:587-594`
```typescript
const advanceActivity = () => {
  if (currentActivityIndex + 1 >= activityStates.length) {
    finishSession();
  } else {
    setCurrentActivityIndex(currentActivityIndex + 1);
  }
};
```
**Issue:** `advanceActivity` is defined inside the JSX render return body (inside the `AuthGate` render prop), not as a component-level function. It captures `currentActivityIndex` and `activityStates.length` by closure from the render scope. It is passed as the `onComplete` prop to `MatchingActivityRenderer` and `FillBlankActivityRenderer`, which pass it into `useEffect` dependency arrays. The ESLint exhaustive-deps rule is suppressed in both renderers (`// eslint-disable-next-line react-hooks/exhaustive-deps`). If the `onComplete` reference changes each render (it will), effects in the renderers will fire more times than intended.

**Fix:** Move `advanceActivity` to the component body and wrap in `useCallback`:
```typescript
const advanceActivity = useCallback(() => {
  if (currentActivityIndex + 1 >= activityStates.length) {
    finishSession();
  } else {
    setCurrentActivityIndex((i) => i + 1);
  }
}, [currentActivityIndex, activityStates.length, finishSession]);
```

---

### WR-10: Unsafe `user.upn[0]` access without null guard

**File:** `frontend/components/TeacherShell.tsx:202, 221`
```typescript
{user.upn[0].toUpperCase()}
```
**File:** `frontend/components/AdminShell.tsx:136, 148`
```typescript
{user.email[0].toUpperCase()}
```
**Issue:** If `user.upn` or `user.email` is an empty string (possible if the backend returns `""` for a freshly-created account), `.toUpperCase()` is called on `undefined`, throwing a runtime error and crashing the shell.

**Fix:**
```typescript
{(user.upn[0] ?? '?').toUpperCase()}
{(user.email[0] ?? '?').toUpperCase()}
```

---

### WR-11: `loadClasses` defined inside component body but called from two separate `useEffect`s — missing `useCallback`

**File:** `frontend/app/admin/classes/page.tsx:316-327`
```typescript
async function loadClasses(filter: string) { ... }

useEffect(() => {
  getTeachers().then(setTeachers).catch(() => {});
}, []);

useEffect(() => {
  loadClasses(teacherFilter);
}, [teacherFilter]);
```
**Issue:** `loadClasses` is redefined on every render. The second `useEffect` lists `teacherFilter` as a dep but omits `loadClasses`. React's exhaustive-deps rule would flag this. While the current behaviour is accidentally correct (the effect re-runs whenever `teacherFilter` changes, so the stale `loadClasses` reference is never actually stale in practice), this is fragile and will produce lint errors.

**Fix:** Wrap in `useCallback` with `[]` deps (it doesn't close over any state that changes), or move it outside the component.

---

### WR-12: `dateFrom`/`dateTo` filters are applied client-side only in `sessions/page.tsx`

**File:** `frontend/app/teacher/sessions/page.tsx:83-87`
```typescript
const displayed = sessions.filter(s => {
  if (dateFrom && new Date(s.startedAt) < new Date(dateFrom)) return false;
  if (dateTo && new Date(s.startedAt) > new Date(dateTo + 'T23:59:59')) return false;
  return true;
});
```
**Issue:** Date filters are applied after all sessions are fetched. If the backend returns a large number of sessions, all of them are loaded into memory and then most are discarded. More importantly, the date filter is not applied when `doSearch()` is called — clicking "Search" re-fetches with `assignmentFilter`/`studentFilter` but ignores the date range. Users may believe the date filter is server-side and be surprised when changing dates with no subsequent "Search" click has no effect until after the data changes.

**Fix:** Pass `dateFrom` and `dateTo` to `doSearch()` / the API call, or add a clear UI affordance that date filtering is local-only and takes effect immediately (no Search click needed).

---

## Info

### IN-01: `frontend/lib/utils.ts` is a stub export — consider removing

**File:** `frontend/lib/utils.ts:1-2`
```typescript
// cn() removed — clsx and tailwind-merge removed with Tailwind CSS migration to MUI
export {};
```
**Issue:** This file has no exports and serves only as documentation of a removed utility. Any imports of `@/lib/utils` will resolve to an empty module, which may confuse future contributors. The comment is better placed in a migration note.

**Fix:** Delete `frontend/lib/utils.ts` entirely.

---

### IN-02: `app/globals.css` is effectively empty — can be removed or used for actual globals

**File:** `frontend/app/globals.css:1`
```css
/* Tailwind CSS removed — styles migrated to MUI theme (frontend/lib/theme.ts) */
```
**Issue:** The file exists and is presumably imported somewhere, but contains only a comment. This adds a network request for an empty stylesheet.

**Fix:** Check if `globals.css` is still imported in `layout.tsx` (it is not in the reviewed version, so it may already be dead). If no import exists, delete it.

---

### IN-03: `theme.ts` exports `shake`, `fadeIn`, `slideUp` keyframes — `fadeIn` and `slideUp` appear unused

**File:** `frontend/lib/theme.ts:13-21`
**Issue:** `fadeIn` and `slideUp` are exported but a codebase search finds them referenced only in the try/session pages where `shake` is imported. `fadeIn` and `slideUp` may be dead exports.

**Fix:** Verify usage with a global search; remove if unused.

---

### IN-04: Duplicate `PhonemeButton`-level audio management bypasses global audio context

**File:** `frontend/components/PhonemeButton.tsx:13-17`
```typescript
const playAudio = (e: React.MouseEvent) => {
  e.stopPropagation();
  const audio = new Audio(audioUrl);
  audio.play().catch(() => {});
};
```
**Issue:** Each button creates a new `Audio` object on every click without holding a reference. Multiple rapid clicks create multiple concurrent `Audio` instances all playing simultaneously. Existing instances are never stopped or released.

**Fix:** Hold the audio reference in a `useRef` and stop the previous instance before starting a new one:
```typescript
const audioRef = useRef<HTMLAudioElement | null>(null);
const playAudio = (e: React.MouseEvent) => {
  e.stopPropagation();
  audioRef.current?.pause();
  audioRef.current = new Audio(audioUrl);
  audioRef.current.play().catch(() => {});
};
```

---

### IN-05: `TeacherShell` breadcrumb title never updates for sub-pages

**File:** `frontend/app/teacher/layout.tsx:10-16`
```typescript
const TITLES: Record<string, string> = {
  '/teacher': 'Dashboard',
  '/teacher/classes': 'Classes',
  '/teacher/students': 'Students',
  '/teacher/homework': 'Homework',
  '/teacher/sessions': 'Sessions',
};
```
**Issue:** When navigating to `/teacher/homework/123` or `/teacher/homework/123/session/456`, `pathname` does not match any key, so the title falls back to `'Teacher Portal'`. The breadcrumb and page heading in `TeacherShell` display "Teacher Portal" for all homework sub-pages, which is confusing.

**Fix:** Use `pathname.startsWith('/teacher/homework')` to display "Homework" for all homework sub-routes, or pass the title as a prop from each page component rather than inferring it from the URL.

---

_Reviewed: 2026-06-01T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
