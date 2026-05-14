# Phase 4: Student UX Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 4-student-ux-polish
**Areas discussed:** Responsive layout, Due date ordering + overdue

---

## Responsive Layout

| Option | Description | Selected |
|--------|-------------|----------|
| 768px (tablet portrait) | iPad portrait primary target, sm:grid-cols-2 lg:grid-cols-3 | |
| 375px (phone) | Full phone support, single-column on phone | |
| 320px (small phone) | Maximum compatibility | |
| Require laptop/PC | Change STUDENT-02 to desktop-only | ✓ |

**User's choice:** Change requirement — laptop/PC only
**Notes:** User explicitly changed STUDENT-02 from tablet/phone to laptop/PC only. `minWidth: 1024` stays. No responsive work, no touch target work, no hover-state changes needed.

---

## Hover → Touch States

*Area was pre-empted by the laptop/PC decision above — hover states are fine on desktop. Not discussed.*

---

## Due Date Ordering + Overdue

### Overdue visual treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Red badge only | All sorted by endDate, overdue shows red 'Overdue' badge | ✓ |
| Separate section | 'Overdue' pinned at top, then 'Upcoming' sorted | |
| Hide overdue | Only show upcoming assignments | |

**User's choice:** Red badge only (recommended)

### Completed assignment position

| Option | Description | Selected |
|--------|-------------|----------|
| Mixed in by due date | All sorted by endDate regardless of completion | ✓ |
| Completed at bottom | Incomplete first, completed at end | |
| You decide | Claude picks ordering | |

**User's choice:** Mixed in by due date (recommended)

### Sort location

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend sort | `.sort()` in component after API response | ✓ |
| Backend ORDER BY | Add ORDER BY endDate ASC to game.repository.ts | |

**User's choice:** Frontend sort (recommended)

---

## Small Touch Targets

*Area was pre-empted by the laptop/PC decision — touch targets are not required for desktop. Not discussed.*

---

## Claude's Discretion

- Exact shade of red for "Overdue" badge — use existing `highlight` color token for consistency
- Overdue badge animation vs. static — Claude decides

## Deferred Ideas

- Responsive/tablet layout — requirement changed; revisit if tablet support needed
- Touch target sizing — not needed for laptop/PC
- Hover state changes — not needed on desktop
- Separate overdue section — user chose badge-only; revisit if feedback suggests students miss overdue work
- Backend ORDER BY — frontend sort chosen; revisit if pagination is added
