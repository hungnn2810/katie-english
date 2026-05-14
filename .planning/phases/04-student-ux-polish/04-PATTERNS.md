# Phase 4: Student UX Polish - Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 1
**Analogs found:** 1 / 1 (self-contained — the file is its own analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/app/game/homework/page.tsx` | component (page) | request-response | `frontend/app/game/homework/page.tsx` (self) | exact — all patterns extracted from this file |

---

## Pattern Assignments

### `frontend/app/game/homework/page.tsx` (component, request-response)

**Analog:** self

---

#### 1. State setter — where to insert the sort (lines 40-46)

The `useEffect` calls `getAvailableHomework` and pipes the result directly into `setAssignments` via `.then(setAssignments)`. The sort must be inserted here by replacing the bare callback with an inline sort:

```tsx
// CURRENT (line 43):
.then(setAssignments)

// TARGET pattern — replace with:
.then((data) => setAssignments([...data].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())))
```

Full context (lines 40-46):
```tsx
useEffect(() => {
  if (!user.studentId) { setLoading(false); return; }
  getAvailableHomework(user.studentId)
    .then(setAssignments)                        // <-- replace this line
    .catch(() => setError('Failed to load homework'))
    .finally(() => setLoading(false));
}, [user.studentId]);
```

---

#### 2. Badge rendering — current daysLeft-based badge (lines 183-186)

The badge lives inside the card `.map()` at lines 179-187, inside a conditional: if `bestScore !== null` → green "Best: X%" badge; else → urgency badge based on `daysLeft`.

**Current badge block (lines 179-187):**
```tsx
{bestScore !== null ? (
  <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-green text-white">
    Best: {bestScore}%
  </span>
) : (
  <span className={`text-xs font-bold px-3 py-1 rounded-full ${daysLeft <= 1 ? 'bg-highlight text-white' : 'bg-white bg-opacity-20 text-white'}`}>
    {daysLeft <= 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
  </span>
)}
```

**Key observations:**
- `daysLeft <= 1` already triggers `bg-highlight text-white` — this is the exact class the "Overdue" badge should also use.
- `daysLeft <= 0` currently maps to "Due today", which conflates `daysLeft === 0` (today) with `daysLeft < 0` (past-due). The branch needs splitting.
- The `daysLeft` variable is computed at line 165: `Math.ceil((dueDate.getTime() - Date.now()) / 86400000)`.

**Target badge logic (replacing lines 184-186):**
```tsx
// Replace the text expression inside the span:
{daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}

// Replace the className conditional:
// daysLeft < 0 OR daysLeft === 0  → bg-highlight text-white  (red)
// daysLeft >= 1                   → bg-white bg-opacity-20 text-white (neutral)
className={`text-xs font-bold px-3 py-1 rounded-full ${daysLeft <= 0 ? 'bg-highlight text-white' : 'bg-white bg-opacity-20 text-white'}`}
```

The change is minimal: `daysLeft <= 1` becomes `daysLeft <= 0` in the className condition, and the text expression gains a `daysLeft < 0 ? 'Overdue' :` prefix branch.

---

#### 3. Color token usage — `highlight` vs `brand-green` (lines 91, 148, 180, 184)

From `frontend/lib/colors.ts`:
- `highlight` = `#FF7B7B` (coral red) — used for warnings, errors, urgency
- `brand-green` is a Tailwind CSS class (not defined in `colors.ts`); it is used only for the "Best: X%" completed badge (line 181)

Existing usages of `highlight` in this file:
```tsx
// line 91 — password error text
className="text-highlight text-sm bg-highlight/10 border border-highlight/20 px-3 py-2 rounded-xl"

// line 148 — API error banner
className="bg-highlight/20 border border-highlight/60 rounded-2xl px-6 py-4 text-white/90 text-sm mb-6"

// line 184 — urgency badge (daysLeft <= 1 → already bg-highlight)
className={`text-xs font-bold px-3 py-1 rounded-full ${daysLeft <= 1 ? 'bg-highlight text-white' : 'bg-white bg-opacity-20 text-white'}`}
```

**Pattern for "Overdue" badge:** Use `bg-highlight text-white` — identical to the existing `daysLeft <= 1` styling. No new color token needed. No animation needed (static badge matches the existing "Due today" treatment).

---

## Shared Patterns

### Badge Shape (apply to any new status badge in this file)
**Source:** `frontend/app/game/homework/page.tsx` lines 180-182 and 184
```tsx
// All badges share this base shape:
className="text-xs font-bold px-3 py-1 rounded-full [bg-class] text-white"
// bg-highlight  → urgent/overdue/due today
// bg-brand-green → completed/score
// bg-white bg-opacity-20 → neutral/days remaining
```

### Error / Warning Color Token
**Source:** `frontend/lib/colors.ts` line 8; `frontend/app/game/homework/page.tsx` lines 91, 148, 184
```tsx
// highlight = #FF7B7B (coral red)
// Tailwind utility: bg-highlight, text-highlight, border-highlight, bg-highlight/[opacity]
// Use for: overdue badge, error banners, urgency text
```

---

## No Analog Found

None. The single file in scope is fully self-contained and contains all patterns needed for the change.

---

## Metadata

**Analog search scope:** `frontend/app/game/homework/page.tsx`, `frontend/lib/colors.ts`
**Files scanned:** 2
**Pattern extraction date:** 2026-05-14
