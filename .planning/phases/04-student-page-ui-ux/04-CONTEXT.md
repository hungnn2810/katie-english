# Phase 4: Student Page UI/UX - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the student homework page UI/UX: display assignments sorted by ascending due date, mark overdue assignments in red, and make the page kid-friendly for ages 6–12. All other student-facing screen layout and touch-target concerns are out of scope — student devices are laptop/PC only (STUDENT-02 requirement revised during discuss-phase).

</domain>

<decisions>
## Implementation Decisions

### Platform Requirement (STUDENT-02 Revised)
- **D-01:** Student device target changed to **laptop/PC only**. Tablet/phone support is NOT required. `minWidth: 1024` on game screens can remain. No responsive layout work, no touch target work, no hover-state changes needed.

### Homework List Ordering (STUDENT-01)
- **D-02:** Sort assignments by `endDate` ascending — earliest due date first.
- **D-03:** Sort is done on the **frontend** in the component after the API response: `assignments.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())`.
- **D-04:** Overdue assignments (daysLeft < 0) display a **red "Overdue" badge** in place of the "X days left" badge. No separate section — overdue items remain mixed into the sorted list.
- **D-05:** Completed assignments (bestScore !== null) are **mixed in by due date** — no separate "completed" section. Student sees full list sorted by date.

### Kid-Friendly UI (STUDENT-03)
- **D-06:** Typography is larger than current: bigger headings, clearer badges, and more readable labels for ages 6–12.
- **D-07:** Palette shifts to gentler, friendlier colors while keeping existing gradients; avoid harsh contrast.
- **D-08:** Add playful icons and rounded, "cute" primary buttons on the student homework page.
- **D-09:** Use more colorful shapes or accents in cards/badges to feel playful, without changing layout structure.

### Claude's Discretion
- Exact shade of red for the "Overdue" badge — use existing `highlight` color token (already used for "Due today" warning styling) for consistency.
- Whether to animate overdue badge vs. static display — Claude decides.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend — Homework List
- `frontend/app/game/homework/page.tsx` — Student homework list page (the only file that changes in this phase)
- `frontend/lib/admin-api.ts` — `getAvailableHomework` API call and `AssignmentItem` type
- `frontend/lib/colors.ts` — `gradients`, `cardGradients`, color tokens including `highlight` (used for overdue badge)

### Requirements
- `.planning/REQUIREMENTS.md` — STUDENT-01 definition

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `highlight` color token — already used for `daysLeft <= 1` warning badge; reuse for "Overdue" state
- `daysLeft` calculation already exists: `Math.ceil((dueDate.getTime() - Date.now()) / 86400000)` — extend with `daysLeft < 0` → "Overdue" branch

### Established Patterns
- Assignments rendered as gradient cards via `cardGradients[i % cardGradients.length]` — sort affects order but not card appearance
- Badge pattern: `className="text-xs font-bold px-3 py-1 rounded-full bg-highlight text-white"` — already used for "Due today"; use same class for "Overdue"

### Integration Points
- Only `frontend/app/game/homework/page.tsx` changes. No backend changes. No other files affected.

</code_context>

<specifics>
## Specific Ideas

- Insert `.sort()` immediately after `setAssignments(data)` or inside the state setter: `setAssignments([...data].sort((a,b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()))`
- Badge logic: `daysLeft < 0 → 'Overdue'`, `daysLeft === 0 → 'Due today'`, `daysLeft === 1 → '1 day left'`, else `'${daysLeft} days left'`

</specifics>

<deferred>
## Deferred Ideas

- Responsive/tablet layout — requirement changed to laptop/PC only; if tablet support ever needed, revisit
- Touch target sizing — not needed for laptop/PC target
- Hover state changes — not needed (hover works fine on desktop)
- Separate "Overdue" section pinned at top — user chose red badge only; revisit if teachers report students missing overdue work
- Backend ORDER BY sort — frontend sort chosen for simplicity; backend sort is an option if API ever paginates

</deferred>

---

*Phase: 4-Student-Page-UI-UX*
*Context gathered: 2026-05-14*
