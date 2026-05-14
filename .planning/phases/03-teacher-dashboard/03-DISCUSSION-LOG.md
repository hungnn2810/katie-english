# Phase 3: Teacher Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 3-teacher-dashboard
**Areas discussed:** Reading creation UX, Reading activity editor, Submission count display, Reading results layout

---

## Reading Creation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Extend HomeworkModal | Add READING as a third tab in the existing modal | |
| Dedicated creation page | New route /teacher/homework/create/reading | ✓ |
| Same modal, separate activity editor section | READING tab in modal with inline expandable section | |

**User's choice:** Dedicated creation page

---

| Option | Description | Selected |
|--------|-------------|----------|
| "+ Create" → type picker → routes to page | Unified entry, type picker modal before navigating | ✓ |
| Separate "+ Reading" button | Distinct button on homework list page | |
| You decide | Claude picks | |

**User's choice:** "+ Create" button → type picker modal → routes to page

---

| Option | Description | Selected |
|--------|-------------|----------|
| Back to homework list | Save → redirect to /teacher/homework | ✓ |
| Directly to assign modal | Save → immediately opens AssignModal | |
| To homework detail page | Save → navigate to /teacher/homework/[newId] | |

**User's choice:** Back to homework list

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — same creation page in edit mode | /teacher/homework/[id]/edit, prefilled | ✓ |
| No — delete and recreate only | Immutable once created | |
| You decide | Claude decides | |

**User's choice:** Yes — same creation page in edit mode

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — add Try/Preview button | Consistent with phonics/speaking Try flow | ✓ |
| No — out of scope | Skip preview UI | |
| You decide | Claude decides | |

**User's choice:** Yes — add Try/Preview button for reading too

---

## Reading Activity Editor

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic pairs | "+ Add pair" button, flexible count | ✓ |
| Fixed 4 pairs per activity | Always exactly 4 | |
| Teacher sets count first | Picks count upfront, then fills | |

**User's choice:** Dynamic — teacher adds pairs one at a time

---

| Option | Description | Selected |
|--------|-------------|----------|
| Type sentence with ___ markers | Parse triple underscores as blanks | |
| Write sentence, highlight words to blank | Click words to toggle blank | ✓ |
| Separate fields: template + blank definitions | Explicit [BLANK] placeholders + separate fields | |

**User's choice:** Write full sentence, then highlight words to blank out

---

| Option | Description | Selected |
|--------|-------------|----------|
| Teacher manually types distractors | Free-text per blank | ✓ |
| Auto-generated from sentence words | System picks distractors | |
| You decide | Claude picks | |

**User's choice:** Teacher manually types distractors for each blank

---

| Option | Description | Selected |
|--------|-------------|----------|
| Up/Down arrow buttons | Simple, no drag library | |
| Drag-and-drop reordering | Intuitive, requires @dnd-kit/core | ✓ |
| Fixed order (no reordering) | Simplest, delete to redo | |

**User's choice:** Drag-and-drop reordering

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — required name | Consistent with phonics | ✓ |
| Optional name | Auto-generate if blank | |
| No name | Activities only | |

**User's choice:** Yes — teacher must set a name (required field)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — reuse uploadSpeakingImage() | Same MinIO endpoint, no new backend route | ✓ |
| New separate endpoint | Separate storage path | |
| You decide | Claude picks | |

**User's choice:** Yes — reuse uploadSpeakingImage() from admin-api.ts

---

## Submission Count Display

| Option | Description | Selected |
|--------|-------------|----------|
| Total enrolled students across all assigned classes | Accurate denominator; needs backend change | ✓ |
| Total sessions started | Simpler, no extra backend data | |
| You decide | Claude picks | |

**User's choice:** Total enrolled students across all assigned classes

---

| Option | Description | Selected |
|--------|-------------|----------|
| Homework list page only | Per assignment card | |
| Both homework list and homework detail page | List count + detail lists non-submitted students | ✓ |
| You decide | Claude decides | |

**User's choice:** Both homework list and homework detail page

---

## Reading Results Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Per-activity total score only | Simple summary | |
| Per-item breakdown within each activity | Full detail | |
| Summary score + expandable per-item details | Collapsed summary, expand for details | ✓ |

**User's choice:** Summary score + expandable per-item details

---

| Option | Description | Selected |
|--------|-------------|----------|
| Student's chosen word per image | Store student's answer for each pair | ✓ |
| Just correct/incorrect boolean per pair | No chosen word stored | |
| You decide | Claude picks | |

**User's choice:** Student's chosen word per image (correct/incorrect per pair)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Average of all activity scores | Unweighted mean | ✓ |
| Weighted by item count | More accurate | |
| You decide | Claude decides | |

**User's choice:** Average of all activity scores

---

## Claude's Discretion

- `@dnd-kit/core` as the drag library (D-09)
- JSON segment array format for fill-in-blank sentence storage (D-12)
- Image thumbnail size in matching results: 40×40px
- Empty-state on reading creation page
- Fill-in-blank word chips toggle UX with × button to unblank
- Type-picker modal design (extend HomeworkModal type selector)

## Deferred Ideas

- Student-side reading game UI — Phase 2 scope
- Auto-generated distractors — user chose manual; revisit if feedback warrants
- Bulk assignment to all classes — not requested
- Reading analytics (score trends) — v2 roadmap
