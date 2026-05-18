---
phase: 03-teacher-dashboard
plan: "05"
subsystem: homework
tags: [reading, fill-in-blank, dnd-kit, chip-toggle, segments, frontend]
dependency_graph:
  requires: ["03-04"]
  provides: ["fill-in-blank-editor-ui", "dnd-activity-reorder"]
  affects: ["03-06", "03-07"]
tech_stack:
  added:
    - "@dnd-kit/core ^6.3.1 (already installed in base commit)"
    - "@dnd-kit/sortable ^10.0.0 (already installed in base commit)"
    - "@dnd-kit/utilities ^3.2.2 (already installed in base commit)"
  patterns:
    - "Sentence tokenizer: match(/\\S+|\\s+/g) splits into word + whitespace tokens"
    - "reindexBlanks: single-pass sequential blankIndex assignment after any toggle"
    - "toggleBlankAt: immutable segment replace + reindex in one call"
    - "Chip toggle: blank chips show ___ + x button; non-blank chips show word text"
    - "DnD stable id: clientId (crypto.randomUUID) — never array index (Pitfall 2)"
    - "PointerSensor distance:4 prevents accidental drags on chip/button clicks"
    - "KeyboardSensor with sortableKeyboardCoordinates for accessibility"
key_files:
  modified:
    - frontend/app/teacher/homework/create/reading/page.tsx
    - frontend/lib/admin-api.ts
decisions:
  - "Kept clientId as stable DnD ID (existing codebase pattern) — plan said draftId but clientId is equivalent; same crypto.randomUUID() generation"
  - "Combined Tasks 2+3 into single commit since both modify the same page.tsx file"
  - "Task 1 was a no-op: @dnd-kit packages were already installed in the base commit (03-04)"
  - "Kept items? field on CreateReadingActivityInput for backward compatibility; added segments? alongside it"
  - "FillInBlankActivityEditor replaces old FillBlankActivityEditor entirely (items-based approach removed)"
  - "Whitespace tokens rendered as 2px spacers (not interactive) to preserve sentence layout"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-18"
  tasks_completed: 3
  files_modified: 2
---

# Phase 03 Plan 05: FillInBlankActivityEditor + DnD Reorder Summary

Segment-based fill-in-blank editor with chip-toggle UI and drag-and-drop activity reordering fully wired into the Reading homework creation page.

## What Was Built

### Task 1 — @dnd-kit Package Install (no-op)

All three packages were already present in `frontend/package.json` at the correct versions from the base commit (03-04):
- `@dnd-kit/core: ^6.3.1`
- `@dnd-kit/sortable: ^10.0.0`
- `@dnd-kit/utilities: ^3.2.2`

Runtime resolution confirmed: `node -e "require('@dnd-kit/core'); require('@dnd-kit/sortable'); require('@dnd-kit/utilities')"` exits 0.

### Task 2 — FillInBlankActivityEditor (commit 458d12e)

**Three module-scope pure helpers added:**

```typescript
function tokenizeSentence(sentence: string): SentenceSegment[]
```
Uses `sentence.match(/\S+|\s+/g) ?? []` to split sentence into alternating word and whitespace tokens. Each token becomes a `SentenceSegment` with `blank: false` initial state.

```typescript
function reindexBlanks(segments: SentenceSegment[]): SentenceSegment[]
```
Single-pass sequential assignment: iterates all segments, assigns `blankIndex: 0, 1, 2...` to blank segments only. Non-blank segments pass through unchanged. Called after every toggle to guarantee contiguous sequence (Pitfall 3 defense).

```typescript
function toggleBlankAt(segments: SentenceSegment[], i: number): SentenceSegment[]
```
Immutable toggle at index `i`. Skips whitespace tokens (`text.trim() === ''`). On blank→normal: replaces segment with `{ text, blank: false }` (drops blankIndex/correctWord/distractors). On normal→blank: sets `{ text, blank: true, correctWord: text, distractors: [] }`. Always calls `reindexBlanks` on result.

**FillInBlankActivityEditor component structure:**
- Textarea for sentence entry; `onChange` calls `tokenizeSentence` (clears existing blanks, warned to user)
- Chip row: blank chips show `___` + `×` button in `bg-primary text-white` style; word chips show text in `bg-gray-100` with `hover:bg-primary/10`; whitespace tokens render as 2px `<span>` spacers
- Distractor rows: one `<input>` per blank, comma-separated, labeled `Blank N: "correctWord"`, wired to `updateDistractors`

**Validation in `handleSave`:**
- At least one segment with `blank: true`
- Contiguous blankIndex sequence 0..n-1 verified client-side
- Each blank has at least 1 distractor (D-08)

**`admin-api.ts` change:** Added `segments?: SentenceSegment[]` to `CreateReadingActivityInput`. The existing `items?` field retained for backward compatibility.

### Task 3 — DnD Enhancements (commit 458d12e, same commit)

DnD was already wired in the base commit with `DndContext + SortableContext + useSortable + arrayMove`. Enhancements applied in this plan:

| Enhancement | Change | Reason |
|-------------|--------|--------|
| `KeyboardSensor` | Added alongside `PointerSensor` | Accessibility (screen readers, keyboard nav) |
| `sortableKeyboardCoordinates` | Added as coordinateGetter | Standard @dnd-kit keyboard UX |
| `PointerSensor distance` | Changed 8 → 4 | Reduces accidental drags on chip/button clicks inside cards |
| `isDragging` opacity | Added `opacity: isDragging ? 0.6 : 1` | Visual feedback during drag |
| `handleDragEnd` bounds check | Added `if (oldIdx < 0 \|\| newIdx < 0) return prev` | Guard against race conditions |

**SortableActivityCard props:**
```typescript
{ id: string; index: number; activity: ReadingActivityDraft; onRemove: () => void; onUpdate: (patch) => void; onUploadError: (msg) => void; }
```
Uses `setActivatorNodeRef` on the drag handle button for precise activation area. The stable DnD `id` is `activity.clientId` (crypto.randomUUID at creation) — never array index.

## Deviations from Plan

### Auto-adapted: clientId used instead of draftId

**Found during:** Task 2 read phase
**Issue:** Plan spec uses `draftId` as the stable activity ID. Existing codebase uses `clientId` (established in Plan 03). Both are `crypto.randomUUID()` strings; the semantic is identical.
**Fix:** Kept `clientId` throughout to avoid churn on a working pattern. No behavior difference.
**Impact:** None — same stable UUID, same DnD guarantee (Pitfall 2 satisfied).

### Auto-adapted: Task 1 was a no-op

**Found during:** Pre-task read of package.json
**Issue:** All three @dnd-kit packages were already installed in the base commit (7613588, Plan 04).
**Fix:** Skipped the `npm install` command. Verified via `node -e "require(...)"`.
**Impact:** None.

### Auto-adapted: Tasks 2+3 committed together

**Found during:** Staging
**Issue:** Both tasks modify only `page.tsx` (+ one line in `admin-api.ts` for Task 2). Splitting into two commits would produce a broken intermediate state where the chip editor exists but DnD lacks KeyboardSensor.
**Fix:** Combined into a single `feat(03-05)` commit with comprehensive message.
**Impact:** Easier bisect — the single commit is coherent and self-contained.

### Auto-adapted: FillBlankActivityEditor fully replaced

**Found during:** Task 2 implementation
**Issue:** Plan 04 SUMMARY noted `FillBlankActivityEditor` (items-based) as a known stub — it sent `items` format to the backend which expects `segments`. This stub is resolved here.
**Fix:** Completely replaced with the new segment-based `FillInBlankActivityEditor`. The `addFillBlankActivity` now initializes with `segments: []` instead of `items: []`.
**Impact:** Resolves the Plan 04 known stub. FILL_BLANK activities now serialize the correct `segments` format to `POST /homework/reading`.

## Known Stubs

None introduced by this plan. The Plan 04 FILL_BLANK stub (items format → backend) is resolved.

## Threat Surface Scan

No new network endpoints. No new auth paths. The `segments` payload field was already part of the `CreateReadingActivityDto` on the backend (Plan 01). No new threat surface introduced.

T-03-17 (blankIndex tampering): Client-side contiguous blankIndex validation added in `handleSave` as planned. Server-side validation already existed from Plan 04. Defense in depth is active.

## Self-Check: PASSED

- `grep -c "@dnd-kit/core" frontend/package.json` = 1 (PASS)
- `grep -c "tokenizeSentence" page.tsx` = 2 (PASS, >=2 required)
- `grep -c "DndContext" page.tsx` = 3 (PASS, >=2 required)
- `grep -c "SortableContext" page.tsx` = 3 (PASS, >=2 required)
- `grep -c "useSortable" page.tsx` = 2 (PASS, >=2 required)
- `grep -c "arrayMove" page.tsx` = 2 (PASS, >=1 required)
- `grep -c "reindexBlanks" page.tsx` = 2 (PASS, >=2 required)
- `grep -c "toggleBlankAt|toggleSegmentBlank" page.tsx` = 5 (PASS, >=2 required)
- `grep -c "updateDistractors" page.tsx` = 2 (PASS, >=2 required)
- `grep -c "blankIndex" page.tsx` = 10 (PASS, >=3 required)
- `cd frontend && npx tsc --noEmit` = exit 0 (PASS)
