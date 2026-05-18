---
phase: 03-teacher-dashboard
plan: "06"
subsystem: homework
tags: [reading, edit-mode, try-preview, route-extraction, fill-in-blank, matching, frontend]
dependency_graph:
  requires: ["03-04", "03-05"]
  provides: ["reading-edit-route", "reading-try-preview", "ReadingCreationPage-extracted"]
  affects: ["03-07"]
tech_stack:
  added: []
  patterns:
    - "Component extraction to _components/: Next.js App Router convention, underscore-prefix skips router"
    - "Edit mode via optional prop: editId?: number, editMode = typeof editId === 'number'"
    - "FillBlank → SentenceSegment reconstruction: split sentence on ___, group choices by isCorrect:true boundary"
    - "MatchPairs prefill: matchPairs[].imageUrl reused as-is (full URL from prior upload)"
    - "READING preview: parallel if-branch before PHONICS/SPEAKING, no camera, no /game/session/* calls"
    - "Deterministic shuffle seeded by blankIdx/charCode sum for stable React key order"
key_files:
  created:
    - frontend/app/teacher/homework/_components/ReadingCreationPage.tsx
    - frontend/app/teacher/homework/[id]/edit/page.tsx
  modified:
    - frontend/app/teacher/homework/create/reading/page.tsx
    - frontend/app/teacher/homework/[id]/try/page.tsx
    - frontend/lib/admin-api.ts
decisions:
  - "Extracted ReadingCreationPage to _components/ as named export — required because Next.js disallows cross-route-boundary default-export imports"
  - "ReadingHomeworkDetail.activities renamed to readingActivities to match Prisma field name (bug fix, field was misnamed in Plan 04)"
  - "reconstructSegments() and buildBlanksFromFillBlanks() implemented to reverse-engineer DB FillBlank shape back to editor/preview segments — lossy but sufficient for edit + preview"
  - "Try button hidden in create mode (no DB row exists yet) — documented as intentional UX"
  - "ReadingPreview placed as early return BEFORE camera check — reading has no camera requirement"
  - "Tasks 1+2 committed together (single logical refactor: extract + add editId support)"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-18"
  tasks_completed: 3
  files_modified: 5
---

# Phase 03 Plan 06: Edit Mode + Try Preview Summary

Edit-mode reuse of ReadingCreationPage (prefill from DB, PUT save) and the READING branch in the try/preview page — completing the full teacher lifecycle for reading homework.

## What Was Built

### Task 1 — Edit-mode support in ReadingCreationPage (commit a3a1554)

**Component extracted to `_components/ReadingCreationPage.tsx`** (named export). The edit-mode path is driven by an optional `editId?: number` prop:

```typescript
export function ReadingCreationPage({ editId }: { editId?: number }) {
  const editMode = typeof editId === 'number';
  const [initialLoading, setInitialLoading] = useState(editMode);
  // ...
  useEffect(() => {
    if (!editMode || !editId) return;
    // fetch + prefill
  }, [editId, editMode]);
}
```

**Prefill mapping:**
- `MATCH` activities: `hw.readingActivities[].matchPairs` → `pairs: [{ imageUrl, word }]` (URLs reused as-is, no re-upload needed)
- `FILL_BLANK` activities: `reconstructSegments(a.fillBlanks)` → `SentenceSegment[]`

**reconstructSegments algorithm:** The backend stores FillBlank as one row with `sentence` (e.g. `"The ___ sat on ___"`) and flat `choices` array ordered as `[correct0, distractors0..., correct1, distractors1...]`. The reconstruction:
1. Splits sentence on `___` to get text parts
2. Groups choices by `isCorrect: true` boundary → per-blank `{correctWord, distractors[]}`
3. Interleaves text tokens and blank segments, assigning sequential `blankIndex`

**handleSave branches:** `editMode && editId` → `updateReadingHomework(editId, payload)` else `createReadingHomework(payload)`.

**UI changes:** Heading shows "Edit Reading Homework" / "New Reading Homework". Save button shows "Update" / "Create". Try button (👁️) visible only in edit mode.

**`create/reading/page.tsx` reduced to 5 lines:**
```tsx
'use client';
import { ReadingCreationPage } from '../../_components/ReadingCreationPage';
export default function Page() { return <ReadingCreationPage />; }
```

### Task 2 — Edit route `/[id]/edit/page.tsx` (commit a3a1554)

Thin wrapper reading `params.id` via `useParams` and passing it to the extracted component:

```tsx
'use client';
import { useParams } from 'next/navigation';
import { ReadingCreationPage } from '../../_components/ReadingCreationPage';
export default function Page() {
  const params = useParams<{ id: string }>();
  const editId = Number(params.id);
  if (!Number.isFinite(editId) || editId <= 0) return null;
  return <ReadingCreationPage editId={editId} />;
}
```

The `_components/` folder uses Next.js App Router's underscore-prefix convention to prevent the directory from being treated as a route segment.

### Task 3 — READING branch in try page (commit 614a88d)

**Early detection in the main useEffect:**
```typescript
if (h.type === 'READING') {
  const rh = await getReadingHomework(hwId);
  setReadingHomework(rh);
  setPageState('ready'); // skip camera check
  return;
}
// PHONICS/SPEAKING path unchanged below
```

**ReadingPreview component:** Receives `ReadingHomeworkDetail`, walks `readingActivities` sequentially.

**MatchingActivityPreview:**
- Two-column layout: image buttons (left) + word buttons (right)
- Click image → `selectedImage` state; click word → records answer, marks correct/wrong
- Correct/wrong feedback via outline color (`#22c55e` / `#ef4444`) and overlay icon
- `shuffledWords` via `useMemo` with deterministic sort by char-code sum (stable across re-renders)
- Shows score + "Next" button when all pairs answered

**FillInBlankPreview:**
- Inline blank chips in sentence text using `sentence.split('___')`
- Active blank tracked by `activeBlankIdx`; choice palette shown for active unanswered blank
- `deterministicShuffle(words, seed=blankIdx)` for stable choice order per blank
- `buildBlanksFromFillBlanks()`: same grouping algorithm as `reconstructSegments` but returns `BlankPreview[]`
- Score computed as `correctCount / blanks.length * 100`

**Final summary card:** Average score across activities (D-18 formula), "Results not saved to database" notice, Done button → `/teacher/homework/[id]`.

**Game shell reuse:** Progress chip bar, back button, gameBgAlt background, preview mode badge — identical to PHONICS/SPEAKING shell. Camera panel omitted (reading has no speech requirement).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ReadingHomeworkDetail.activities → readingActivities**
- **Found during:** Task 1, when mapping `hw.activities` in the prefill useEffect
- **Issue:** `ReadingHomeworkDetail` interface had `activities: ReadingActivity[]` but the Prisma `readingActivitiesInclude` query nests activities under `readingActivities`. Backend controller returns raw Prisma object. The field was misnamed in Plan 04.
- **Fix:** Changed `ReadingHomeworkDetail.activities` to `ReadingHomeworkDetail.readingActivities` in `admin-api.ts`
- **Files modified:** `frontend/lib/admin-api.ts`
- **Commit:** a3a1554

**2. [Rule 2 - Missing] Added FillBlank reconstruction logic**
- **Found during:** Task 1, when designing the FILL_BLANK prefill path
- **Issue:** The plan's pseudocode used `a.fillInBlank?.sentenceSegments` (an idealized shape that doesn't match the actual DB schema). The real schema stores FillBlank as one row per activity with `sentence` + flat `choices[]`, not as a pre-built `SentenceSegment[]`.
- **Fix:** Implemented `reconstructSegments()` helper that reverses the `buildReadingActivitiesCreate()` logic from the backend repository.
- **Files modified:** `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx`
- **Commit:** a3a1554

### Approach Deviation

**Tasks 1+2 committed together:** The extraction of `ReadingCreationPage` from the create route is structurally inseparable from adding the `editId` prop — doing one without the other would leave the codebase in a broken state. Combined into a single commit.

## Known Stubs

None. All data paths are wired: prefill fetches from `getReadingHomework`, saves call `updateReadingHomework`, preview fetches from `getReadingHomework`. No hardcoded empty values flow to the UI.

## Threat Flags

No new network endpoints, auth paths, or trust boundaries introduced beyond those already listed in the plan's threat model (T-03-21 through T-03-24). Confirmed `dangerouslySetInnerHTML` count = 0 in try/page.tsx (T-03-23 mitigated).

## Self-Check

**Files created:**
- FOUND: frontend/app/teacher/homework/_components/ReadingCreationPage.tsx
- FOUND: frontend/app/teacher/homework/[id]/edit/page.tsx

**Acceptance criteria:**
- editId count in _components: 9 (>= 4) PASS
- getReadingHomework in _components: 2 PASS
- updateReadingHomework in _components: 2 PASS
- editMode ? 'Update' : 'Create' in _components: 1 PASS
- Edit Reading Homework in _components: 1 PASS
- Try button emoji in _components: 1 PASS
- ReadingPreview/h.type === 'READING' in try page: 7 (>= 2) PASS
- preview notice in try page: 8 (>= 1) PASS
- dangerouslySetInnerHTML in try page: 0 PASS

**Commits verified:**
- a3a1554: feat(03-06): extract ReadingCreationPage to _components, add edit-mode + edit route
- 614a88d: feat(03-06): add READING branch to try page — interactive client-side preview

## Self-Check: PASSED
