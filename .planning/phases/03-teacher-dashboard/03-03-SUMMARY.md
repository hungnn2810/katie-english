---
phase: 03-teacher-dashboard
plan: "03"
subsystem: frontend
tags: [teacher-dashboard, homework, type-picker, reading-creation, routing]
completed: "2026-05-18T02:34:50Z"
duration_minutes: 15

dependency_graph:
  requires: [03-01, 03-02]
  provides:
    - TypePickerModal (homework/page.tsx) — unified + Create entry for all homework types
    - ReadingActivityDraft type (create/reading/page.tsx) — canonical draft shape for Plans 04/05
    - /teacher/homework/create/reading route now reachable via TypePickerModal Reading card
  affects:
    - Plans 04/05: ReadingActivityDraft type is the stable draft shape; do not redefine
    - Plan 06: edit route /teacher/homework/[id]/edit wired in Edit button (READING branch)

tech_stack:
  added: []
  patterns:
    - TypePickerModal: inline component in homework/page.tsx, same file pattern as HomeworkModal
    - showTypePicker state: useState(false), set true by openCreate(), false by onClose
    - READING Edit routing: conditional router.push vs openEdit(h) on Edit button

key_files:
  modified:
    - frontend/app/teacher/homework/page.tsx
    - frontend/app/teacher/homework/create/reading/page.tsx

decisions:
  - TypePickerModal placed inline in homework/page.tsx (consistent with HomeworkModal pattern — both in same file)
  - Removed separate "New Reading" Link button from toolbar; unified into TypePickerModal flow
  - Kept existing full reading creation implementation (Phase 2 work) rather than replacing with skeleton
  - Renamed DraftActivity -> ReadingActivityDraft and CreateReadingHomeworkPage -> ReadingCreationPage for cross-plan clarity

metrics:
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  commits: 2
---

# Phase 3 Plan 03: TypePickerModal + Reading Creation Page Summary

TypePickerModal added to homework list page; reading creation route reachable; ReadingActivityDraft type canonicalized.

## What Was Built

### Task 1: TypePickerModal + READING wiring (homework/page.tsx)

**TypePickerModal location:** Declared as a standalone function component between `AssignModal` and the `Page` section in `frontend/app/teacher/homework/page.tsx` (around line 519). Pattern mirrors `HomeworkModal` — inline in the same file.

**Component contract:**
```typescript
function TypePickerModal({
  onClose,
  onPickInline,
  onPickReading,
}: {
  onClose: () => void;
  onPickInline: (type: 'PHONICS' | 'SPEAKING') => void;
  onPickReading: () => void;
})
```

**Dispatch logic:**
- Phonics card: `onPickInline('PHONICS'); onClose()`
- Speaking card: `onPickInline('SPEAKING'); onClose()`
- Reading card: `onPickReading()` (navigation unmounts, no explicit `onClose` needed)

**State plumbing:**
```typescript
const [showTypePicker, setShowTypePicker] = useState(false);
function openCreate() { setShowTypePicker(true); }
// Render:
{showTypePicker && (
  <TypePickerModal
    onClose={() => setShowTypePicker(false)}
    onPickInline={(t) => { setForm({ ...emptyForm(), type: t }); setShowModal(true); }}
    onPickReading={() => router.push('/teacher/homework/create/reading')}
  />
)}
```

**Edit button READING branch:**
```typescript
onClick={() => h.type === 'READING' ? router.push(`/teacher/homework/${h.id}/edit`) : openEdit(h)}
```

**TYPE_META and filter tab:** Both already present from Plan 01/02 work. No changes needed.

### Task 2: ReadingActivityDraft type (create/reading/page.tsx)

**ReadingActivityDraft type signature** (final — Plans 04 and 05 MUST NOT redefine):
```typescript
type ReadingActivityDraft = CreateReadingActivityInput & { clientId: string };
```

Where `CreateReadingActivityInput` (from `@/lib/admin-api`) includes:
- `type: ReadingActivityType` — `'MATCH' | 'FILL_BLANK'`
- `pairs?: CreateMatchPairInput[]` — for MATCH activities (`{ imageUrl: string; word: string }`)
- `items?: CreateFillBlankItemInput[]` — for FILL_BLANK activities

The `clientId: string` field is a client-side stable key (via `crypto.randomUUID()`) used for React keys and DnD sorting — it is stripped before sending to the API.

**Page export:** `export default function ReadingCreationPage()` at `frontend/app/teacher/homework/create/reading/page.tsx`.

The existing Phase 2 implementation is retained (full DnD editor with `@dnd-kit/sortable`, MatchingActivityEditor, FillBlankActivityEditor, validation, and save via `createHomework`). The skeleton described in this plan's task was superseded by the Phase 2 implementation — which is strictly a superset.

## Deviations from Plan

### 1. [Rule 1 - Existing work] Reading creation page retained as full implementation, not skeleton

**Found during:** Task 2 assessment
**Issue:** `frontend/app/teacher/homework/create/reading/page.tsx` already existed from Phase 2 (02-03 plan) with a complete working editor including DnD, validation, and save — far beyond the skeleton described in Plan 03-03.
**Fix:** Kept the full implementation. Only applied the naming changes (`DraftActivity` → `ReadingActivityDraft`, `CreateReadingHomeworkPage` → `ReadingCreationPage`) required for cross-plan clarity.
**Impact:** Positive — Plans 04 and 05 can skip re-implementing the editor infrastructure.

### 2. [Rule 3 - No ESLint] ESLint not configured in frontend project

**Found during:** Task 1 verification
**Issue:** `next lint` prompted for ESLint setup interactively; no `.eslintrc` or `eslint.config.js` exists; ESLint is not listed in `package.json` devDependencies.
**Fix:** Skipped lint verification; relied on `tsc --noEmit` (exits 0) as the quality gate.
**Impact:** Low — project has no pre-existing lint rules to violate.

### 3. [Intentional] Removed separate "New Reading" Link from toolbar

**Found during:** Task 1
**Issue:** The existing homework/page.tsx had a separate "New Reading" green button alongside "New Homework". The plan's D-02 design calls for a single unified entry point via TypePickerModal.
**Fix:** Removed the "New Reading" Link; the single "+ Create" button now opens TypePickerModal which routes to `/teacher/homework/create/reading` for Reading type. No regression — the route is still reachable.

## Known Stubs

None — the reading creation page has a working Save implementation (Phase 2 work).

## Threat Flags

No new threat surface beyond what the plan's threat model documents. The `/teacher/homework/create/reading` route inherits auth from the `/teacher/*` layout (TeacherShell + AuthGate). TypePickerModal navigates without parameters — same risk profile as existing homework list page.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `frontend/app/teacher/homework/page.tsx` exists | FOUND |
| `frontend/app/teacher/homework/create/reading/page.tsx` exists | FOUND |
| `03-03-SUMMARY.md` exists | FOUND |
| Commit d14d065 (Task 1) exists | FOUND |
| Commit 7f79c9c (Task 2) exists | FOUND |
| `tsc --noEmit` exits 0 | PASSED |
| `grep -c "function TypePickerModal"` = 1 | PASSED |
| `grep -c "showTypePicker"` >= 3 | PASSED (3) |
| `grep -c "router.push('/teacher/homework/create/reading')"` = 1 | PASSED |
| `grep -c "ReadingActivityDraft"` >= 2 | PASSED (9) |
| `grep -c "export default function ReadingCreationPage"` = 1 | PASSED |
