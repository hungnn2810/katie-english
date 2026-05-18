---
phase: "02"
plan: "03"
subsystem: frontend
tags: [teacher, reading-homework, dnd-kit, file-upload, form-validation]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [teacher-reading-creation-page]
  affects: [frontend/app/teacher/homework, frontend/app/teacher/homework/create/reading]
tech_stack:
  added:
    - "@dnd-kit/core@6.3.1"
    - "@dnd-kit/sortable@10.0.0"
    - "@dnd-kit/utilities@3.2.2"
  patterns:
    - SortableContext + useSortable with setActivatorNodeRef for handle-only drag
    - PointerSensor activationConstraint distance:8 to prevent drag-on-typing
    - Sequential bulk image upload loop (not Promise.all) for memory safety
    - crypto.randomUUID() for stable DraftActivity client IDs
    - Strip-extension regex /\.[^.]+$/ for filename-to-label prefill
key_files:
  created:
    - frontend/app/teacher/homework/create/reading/page.tsx
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - frontend/app/teacher/classes/page.tsx
decisions:
  - "Built both MatchingActivityEditor and FillBlankActivityEditor in Task 1 commit (full implementation, no stub phase) — simpler and avoids an intermediate broken state"
  - "Removed Homework stat block from classes/page.tsx to fix pre-existing TS error blocking build (Rule 1 deviation — out-of-scope bug that blocked npm run build)"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 02 Plan 03: Teacher Reading Homework Creation Page Summary

## One-liner

Teacher creation page at /teacher/homework/create/reading with @dnd-kit drag-and-drop activity reordering, bulk image upload to matching pairs with filename prefill, fill-in-blank sentence/choice authoring with radio correct-answer selection, and comprehensive client-side validation before POST /homework.

## What Was Built

### New File: `frontend/app/teacher/homework/create/reading/page.tsx`

Single-file React page (min_lines requirement: 250 — actual: ~430 lines) containing:

**Page shell (`CreateReadingHomeworkPage`):**
- Header row: Back link, "New Reading Homework" title, Save Homework button with spinner
- Homework name input with placeholder per UI-SPEC copywriting contract
- DnD container: DndContext + SortableContext (verticalListSortingStrategy)
- Empty state placeholder when no activities
- "Add Matching Activity" / "Add Fill-in-blank Activity" buttons (dashed border, type-colored)
- Error display blocks for both validation errors and upload errors
- `validate()` function: exhaustive checks for MATCH (2-6 pairs, non-empty labels) and FILL_BLANK (≥1 sentence with ___, ≥2 choices, exactly 1 correct)
- `handleSave()`: strips clientId, POSTs via createHomework(), router.push('/teacher/homework') on success

**`SortableActivityCard` component:**
- useSortable with setActivatorNodeRef so only the ≡ handle triggers drag (not inputs/buttons)
- CSS.Transform.toString(transform) for smooth DnD animation
- Type badge: 📷 Matching (bg-secondary/15 text-secondary) / ✏️ Fill in the Blank (bg-accent/20 text-amber-700)
- Activity index label, Remove button with hover states

**`MatchingActivityEditor` component:**
- Bulk upload trigger (label wrapping hidden file input with `multiple accept="image/*"`)
- Sequential upload loop: for-of with await, breaks on first error, calls onUploadError
- Filename prefill: `file.name.replace(/\.[^.]+$/, '')` strips extension
- Pair grid: grid-cols-3, 80×80px thumbnails, editable word label, ✕ remove per pair
- "+ Add images" label (hidden when pairs === 6) / "Maximum 6 pairs reached" text
- Inline warning when exactly 1 pair (need ≥2)
- All aria-labels present: "Remove pair"

**`FillBlankActivityEditor` component:**
- Per-sentence item cards with textarea (resize-none, rows=2, ___ placeholder)
- Inline sentence validation: shows error when sentence is non-empty and missing ___
- Choice rows: radio (name=`correct-{i}` per item for independent groups), word input, ✕ remove
- `markCorrect()`: radio behavior — setting one correct unmarks all others
- `removeChoice()`: maintains at-least-one-correct invariant after removal
- "+ Add choice" / "+ Add sentence" buttons per UI-SPEC copy
- Inline choice validation: "Add at least 2 word choices." / "Mark one choice as correct."
- All aria-labels present: "Mark as correct answer", "Remove choice"

### Updated: `frontend/package.json` + `frontend/package-lock.json`

@dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2 added to dependencies.

## Dependencies Installed

| Package | Version | Purpose |
|---------|---------|---------|
| @dnd-kit/core | 6.3.1 | DndContext, PointerSensor, closestCenter |
| @dnd-kit/sortable | 10.0.0 | SortableContext, useSortable, arrayMove |
| @dnd-kit/utilities | 3.2.2 | CSS.Transform.toString |

## Validation Rules Implemented

| Rule | Trigger | Message |
|------|---------|---------|
| No activities | Save with empty list | "Add at least one activity." |
| MATCH < 2 or > 6 pairs | Save | "Matching activity N: add 2 to 6 image-word pairs." |
| MATCH empty word label | Save | "Matching activity N: every pair needs a word label." |
| FILL_BLANK no sentences | Save | "Fill-in-blank activity N: add at least 1 sentence." |
| Sentence missing ___ | Save (and inline) | "...sentence N: must contain ___ for the blank." |
| Sentence < 2 choices | Save (and inline) | "...sentence N: add at least 2 word choices." |
| No correct choice | Save (and inline) | "...sentence N: mark one choice as correct." |
| Matching pair count = 1 | Inline only | "Add at least 2 image-word pairs." |

## Key Decisions

1. Full editors implemented in Task 1 commit — plan called for stubs in Task 1 then replacement in Task 2, but building the full implementation immediately avoids an intermediate broken commit state with no user-visible value.

2. PointerSensor activationConstraint `{ distance: 8 }` — prevents drag from activating on click inside text inputs/textareas within activity cards. Without this, users cannot type in fields on draggable cards (RESEARCH Pitfall 4).

3. Sequential upload loop (for-of + await) over Promise.all — bounds memory use per RESEARCH Pitfall 5 and threat model T-02-19.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TS error in classes/page.tsx blocking `npm run build`**
- **Found during:** Task 1 build verification
- **Issue:** `c._count.homeworks` referenced a property not in `ClassItem._count` type (only `{ students: number }` exists)
- **Fix:** Removed the Homework stat block from the classes page card — stat was non-functional (backend never populated it)
- **Files modified:** `frontend/app/teacher/classes/page.tsx`
- **Commit:** 91588e6

**2. [Rule 2 - Deviation] Combined Task 1 and Task 2 into single implementation commit**
- Both editors written fully in the Task 1 commit (7c14e1a) instead of stubs-then-replace
- No functional impact — all acceptance criteria for both tasks satisfied in 7c14e1a

## UI-SPEC Compliance

All copywriting contract strings used verbatim:
- "Save Homework" / "Saving…"
- "Add Matching Activity" / "Add Fill-in-blank Activity"
- "e.g. Animals – Unit 3 Reading"
- "Type the sentence, use ___ for the blank (e.g. The cat sat on the ___)"
- "Click to upload images" / "Each image becomes a matching pair"
- "+ Add images" / "Maximum 6 pairs reached"
- "+ Add choice" / "+ Add sentence" / "Remove sentence"
- All 5 aria-labels required by UI-SPEC checker revision 2026-05-15

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 + 2 | 7c14e1a | Install @dnd-kit deps + full reading creation page (shell + both editors) |
| Deviation fix | 91588e6 | Fix pre-existing classes/page.tsx TS error blocking build |

## Self-Check

### Files exist:
- frontend/app/teacher/homework/create/reading/page.tsx: FOUND
- frontend/package.json (with @dnd-kit entries): FOUND

### Commits exist:
- 7c14e1a: FOUND
- 91588e6: FOUND

### Build: PASSED (npm run build exits 0)
### TypeScript: PASSED (no errors in new file)

## Self-Check: PASSED
