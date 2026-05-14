---
phase: 04-student-ux-polish
reviewed: 2026-05-14T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - frontend/app/game/homework/page.tsx
findings:
  critical: 2
  warning: 3
  info: 3
  total: 8
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-14
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed `frontend/app/game/homework/page.tsx` — the student homework selection screen introduced in the student UX polish phase. The file is a single-file React client component (~230 lines) that fetches available assignments, renders homework cards, and provides a change-password modal.

Two critical crash bugs were found: one null-dereference on line 201 that skips the null guard already applied two lines above, and one crash when a user account has an empty `upn` string. Three warnings cover a click-handler layering issue that can fire duplicate session-start requests, silent sort corruption from invalid dates, and a UX logic gap where overdue state is hidden from students who already have a score. Three info-level findings cover magic numbers and inconsistent defensive patterns.

---

## Critical Issues

### CR-01: Unguarded `hw.parts` Access After Null-Safe Slice

**File:** `frontend/app/game/homework/page.tsx:201`

**Issue:** The "overflow" badge at line 201 reads `hw.parts.length` directly, but `hw.parts` is typed as `HomeworkPart[]` with the parent interface offering no guarantee it is non-null at runtime. Two lines above (line 195 and line 200), the same array is accessed through `(hw.parts ?? [])` — demonstrating awareness that it can be absent. If the API returns a homework object where `parts` is null or undefined (e.g., a SPEAKING homework, or a partially-formed record), line 200's condition evaluates safely to `false` via the null-coalescing guard, but the runtime never reaches line 201 in that case — except that TypeScript allows `parts` to be implicitly `undefined` because `HomeworkItem.parts` is declared as `HomeworkPart[]` (non-optional), yet the runtime API shape can diverge. More concretely: if a future homework type or partially-migrated record has `parts: null`, line 200 short-circuits correctly but the expression `hw.parts.length - 4` on line 201 is evaluated inside the same `&&` chain as a JSX child — in React, the whole expression is evaluated before rendering, so `hw.parts.length` is dereferenced regardless.

**Fix:**
```tsx
// Line 200-202 — replace bare hw.parts.length with the already-guarded form:
{hw.type === 'PHONICS' && (hw.parts ?? []).length > 4 && (
  <span className="bg-white bg-opacity-10 text-white text-sm px-3 py-1 rounded-lg">
    +{(hw.parts ?? []).length - 4}
  </span>
)}
```

Or, extract once at the top of the map callback:
```tsx
const parts = hw.parts ?? [];
// then use `parts` everywhere instead of `hw.parts`
```

---

### CR-02: Crash on Empty `upn` String

**File:** `frontend/app/game/homework/page.tsx:114`

**Issue:** `user.upn[0].toUpperCase()` reads index 0 of the string unconditionally. `AuthUser.upn` is typed as `string` (no minimum-length constraint). If the backend ever returns `upn: ""` — or if `getUser()` deserializes a stored token with a blank `upn` — `user.upn[0]` is `undefined`, and calling `.toUpperCase()` on `undefined` throws `TypeError: Cannot read properties of undefined`. This is a runtime crash that unmounts the entire page content through React's error boundary.

**Fix:**
```tsx
// Line 114
{(user.upn[0] ?? '?').toUpperCase()}
```

Or use optional chaining with a fallback:
```tsx
{user.upn.charAt(0).toUpperCase() || '?'}
```
`String.prototype.charAt` returns `""` on out-of-bounds rather than `undefined`, so it is safer here; the `|| '?'` handles the empty result.

---

## Warnings

### WR-01: Outer `div` Click Handler Bypasses Inner Button's Disabled State

**File:** `frontend/app/game/homework/page.tsx:172-219`

**Issue:** Each homework card is a `<div onClick={() => handleStart(a.id)}>`. Inside it, a `<button disabled={starting === a.id}>` is rendered as a visual affordance (line 212-216). The `disabled` attribute prevents the button's own click from firing, but it does not stop clicks on the parent `<div>`. A student who clicks anywhere on the card — including the button area — while `starting === a.id` is true will still invoke `handleStart` through the div's onClick. In addition, a student can click multiple different cards before any of them transitions the `starting` state, because `starting` is a single number: clicking card A sets `starting = A`, but card B's `handleStart` check only guards against `B === B`, not against any in-flight request. The button `disabled` check is therefore only a partial visual guard; the functional guard is missing at the div level.

**Fix:**
```tsx
// Prevent clicks when any session is starting
<div
  key={a.id}
  className="..."
  onClick={() => starting === null && handleStart(a.id)}
  style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
>
```

Or disable the entire card via a CSS `pointer-events-none` class when `starting !== null`:
```tsx
className={`rounded-2xl overflow-hidden shadow-xl transition-transform hover:scale-105 cursor-pointer
  ${starting !== null ? 'pointer-events-none opacity-80' : ''}`}
```

---

### WR-02: Invalid/Null `endDate` Silently Corrupts Sort Order

**File:** `frontend/app/game/homework/page.tsx:43`

**Issue:** The sort comparator uses `new Date(a.endDate).getTime() - new Date(b.endDate).getTime()`. If `endDate` is null, undefined, or a malformed ISO string (possible from the API), `new Date(invalid).getTime()` returns `NaN`. A comparator that returns `NaN` causes `Array.prototype.sort` to produce implementation-defined, browser-dependent ordering — the array appears sorted but is actually in arbitrary order. There is no error surfaced to the user or developer.

**Fix:**
```tsx
.then((data) => {
  setAssignments(
    [...data].sort((a, b) => {
      const ta = a.endDate ? new Date(a.endDate).getTime() : Infinity;
      const tb = b.endDate ? new Date(b.endDate).getTime() : Infinity;
      return ta - tb;
    })
  );
})
```
Assignments with missing dates are pushed to the end rather than silently scrambling the list.

---

### WR-03: Overdue/Urgency Badge Hidden After First Completion

**File:** `frontend/app/game/homework/page.tsx:179-187`

**Issue:** The ternary on line 179 shows the "Best: X%" badge when `bestScore !== null`, otherwise shows the due-date/overdue badge. This means a student who has any completed session never sees deadline urgency — an overdue assignment with a completed attempt shows only a green "Best: X%" badge with no indication it is past due. A student reviewing their homework cannot distinguish between "done and still active" and "done and now overdue/closed", which can lead to confusion about whether resubmission is possible.

**Fix:** Decouple the two pieces of information. Show both the best-score badge and a smaller overdue indicator when applicable:
```tsx
<div className="flex flex-col items-end gap-1">
  {bestScore !== null && (
    <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-green text-white">
      Best: {bestScore}%
    </span>
  )}
  {daysLeft < 0 && (
    <span className="text-xs font-bold px-3 py-1 rounded-full bg-highlight text-white">
      Overdue
    </span>
  )}
  {bestScore === null && daysLeft >= 0 && (
    <span className={`text-xs font-bold px-3 py-1 rounded-full ${daysLeft <= 1 ? 'bg-highlight text-white' : 'bg-white bg-opacity-20 text-white'}`}>
      {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
    </span>
  )}
</div>
```

---

## Info

### IN-01: Hardcoded Magic Number `minWidth: 1024`

**File:** `frontend/app/game/homework/page.tsx:61`

**Issue:** `style={{ minWidth: 1024 }}` is a magic number inline style with no named constant or Tailwind class. This prevents responsive rendering on devices narrower than 1024 px (tablets, mobile) and will be invisible to any responsive-design audit that searches for Tailwind breakpoints. If the minimum-width requirement is intentional (desktop-only screen), it should be documented or extracted to a shared constant.

**Fix:** Extract to a constant or use a Tailwind min-width utility (e.g., `min-w-[1024px]`) so the intent is searchable. If this is a deliberate desktop-only constraint, add a comment:
```tsx
{/* Game screen requires 1024px minimum — desktop/tablet landscape only */}
<div className="min-h-screen min-w-[1024px]" style={{ background: gradients.gameBg }}>
```

---

### IN-02: Magic Number `86400000` for Milliseconds-Per-Day

**File:** `frontend/app/game/homework/page.tsx:165`

**Issue:** `86400000` is the number of milliseconds in one day, but it is not named. This is a common source of off-by-one errors when someone later changes the calculation and misreads the divisor.

**Fix:**
```tsx
const MS_PER_DAY = 24 * 60 * 60 * 1000; // defined once at module scope
// ...
const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / MS_PER_DAY);
```

---

### IN-03: Inconsistent Null Guards on `hw.parts` Throughout Card Render

**File:** `frontend/app/game/homework/page.tsx:195-201`

**Issue:** `hw.parts` is accessed three times in the card body:
- Line 195: `(hw.parts ?? []).slice(0, 4).map(...)` — guarded
- Line 200: `(hw.parts ?? []).length > 4` — guarded
- Line 201: `hw.parts.length - 4` — unguarded (also the CR-01 crash site)

Beyond the crash, the inconsistency signals that the null-guard was not applied systematically. Any future editor adding a fourth reference to `hw.parts` in this block may follow the unguarded pattern by analogy.

**Fix:** Extract to a local variable at the top of the map callback to enforce a single guard point:
```tsx
assignments.map((a, i) => {
  const parts = hw.parts ?? [];
  // use `parts` everywhere — no further null checks needed
  ...
  {hw.type === 'PHONICS' && parts.slice(0, 4).map((part) => ( ... ))}
  {hw.type === 'PHONICS' && parts.length > 4 && (
    <span>+{parts.length - 4}</span>
  )}
})
```

---

_Reviewed: 2026-05-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
