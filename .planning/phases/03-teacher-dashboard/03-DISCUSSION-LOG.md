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

---

# UI/UX Overhaul Session — 2026-05-19

**Areas discussed:** shadcn setup & theme, Sidebar & shell redesign, CRUD interaction pattern, Data display pattern

---

## shadcn setup & theme

| Option | Description | Selected |
|--------|-------------|----------|
| Zinc | Neutral gray-zinc palette — professional, clean | ✓ |
| Slate | Slightly cooler gray-blue tones | |
| Neutral | Pure gray, no color tint | |

| Option | Description | Selected |
|--------|-------------|----------|
| Map to CSS vars | Define --primary, --accent in globals.css from colors.ts | ✓ |
| Keep colors.ts alongside shadcn | Import directly, use shadcn for structure only | |
| Full reset — shadcn defaults only | Drop colors.ts entirely | |

| Option | Description | Selected |
|--------|-------------|----------|
| Light mode only | Dark sidebar is design choice, not theme state | ✓ |
| Dark/light toggle | OS-level or manual toggle | |

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-install core set | button input dialog alert-dialog sheet table card badge select label form tabs | ✓ |
| Add as needed per plan | Each plan installs its own components | |

| Option | Description | Selected |
|--------|-------------|----------|
| frontend/components/ui/ | Standard shadcn convention | ✓ |
| frontend/components/ flat | Mix shadcn + custom in same dir | |

---

## Sidebar & shell redesign

| Option | Description | Selected |
|--------|-------------|----------|
| Keep dark sidebar | Preserve current gradient, refactor internals | ✓ |
| Full light sidebar | Switch to zinc palette throughout | |
| shadcn Sidebar component | Built-in collapsible + keyboard shortcuts | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed — always expanded | w-64, desktop-only app | ✓ |
| Collapsible to icon-only | More horizontal space for content | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep page header bar | White bar with title + subtitle | ✓ |
| Remove — use inline headings | Title inside content area | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current 5 items | Dashboard, Classes, Students, Homework, Sessions | |
| Add Reports/Analytics | Simple stats page in-scope | ✓ |
| Other changes | Reorder/rename nav | |

**Reports scope:** Simple summary page — total sessions, avg scores per class, homework completion rates.

---

## CRUD interaction pattern

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn Dialog | Replace all custom modals | ✓ |
| shadcn Sheet (slide-over) | Forms from right | |
| Mixed (Dialog + dedicated pages) | Simple=Dialog, complex=page | |

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn AlertDialog | Blocking confirm modal | ✓ |
| Inline confirm tooltip | Less interrupting | |

| Option | Description | Selected |
|--------|-------------|----------|
| Single scrollable Dialog | All fields in one dialog | ✓ |
| Multi-step wizard in Sheet | Step-by-step, progress indicator | |

| Option | Description | Selected |
|--------|-------------|----------|
| react-hook-form + zod + FormMessage | Field-level errors, type-safe | ✓ |
| Manual useState + validation | Current approach, no new deps | |

| Option | Description | Selected |
|--------|-------------|----------|
| Tabs in Students page | List / Pending Approvals / Password Resets | ✓ |
| Separate /teacher/students/admin page | Dedicated admin route | |

---

## Data display pattern

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn DataTable (TanStack) | Sort + filter, @tanstack/react-table | ✓ |
| shadcn Table (simple) | No built-in sort | |
| Keep card grid | Reskin with shadcn Card | |

**Classes:** Card grid (suits small count) ✓

**Homework:** DataTable (Name/Type/Status/Submitted/Due Date) ✓

**Sessions:** DataTable (Student/Homework/Score/Type/Date) ✓

| Option | Description | Selected |
|--------|-------------|----------|
| Sort + filter | Column sort + dropdown/input filters | ✓ |
| Sort only | No filter UI | |

| Option | Description | Selected |
|--------|-------------|----------|
| Stat cards + upcoming + recent homework | Extend current layout | ✓ |
| Stat cards + quick actions | Action-oriented | |
| Redesign with metric cards + panels | Full redesign | |

---

## Claude's Discretion (UI overhaul)

- Reports page: simple Table not chart library
- TeacherShell: Button variant="ghost" for nav links, keep visual CSS
- DataTable filter UX: filter row inside table header
- Empty state: centered message + icon
- Dialog ScrollArea for tall student creation form

## Deferred Ideas (UI overhaul)

- Full analytics dashboard (charts, trends, export) — future phase
- Reading analytics score trends — Reports shows completion rates only
