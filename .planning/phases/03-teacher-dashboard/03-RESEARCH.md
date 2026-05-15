# Phase 03: Teacher Dashboard - Research

**Researched:** 2026-05-15
**Domain:** Next.js 14 teacher UI, NestJS/Prisma backend schema extension, @dnd-kit drag-and-drop, reading homework CRUD, session result display
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Reading homework is created on a dedicated page (`/teacher/homework/create/reading`), not inside the existing HomeworkModal.
- **D-02:** Entry point: the existing `+ Create` button opens a **type-picker modal** (Phonics / Speaking / Reading). Phonics and Speaking stay as before (inline HomeworkModal). Reading navigates to the dedicated creation page.
- **D-03:** After saving, teacher is redirected to `/teacher/homework`. No auto-open of AssignModal.
- **D-04:** Edit mode uses the **same creation page** with prefilled data, routed as `/teacher/homework/[id]/edit`.
- **D-05:** Reading homework creation page has a **Try/Preview button**.
- **D-06:** Image-word matching pairs are **added dynamically** via "+ Add pair". Minimum 2 pairs to save.
- **D-07:** Fill-in-blank: teacher writes the full sentence, then clicks/highlights individual words to mark them as blanks.
- **D-08:** Each blank has teacher-defined distractors (free-text per blank). System does NOT auto-generate distractors.
- **D-09:** Activities within a reading homework are **reordered via drag-and-drop** using `@dnd-kit/core`.
- **D-10:** Reading homework requires a **required name** field.
- **D-11:** Image uploads for matching pairs reuse `uploadSpeakingImage()` from `frontend/lib/admin-api.ts`.
- **D-12:** Store sentence as JSON segment array: `[{text: "The ", blank: false}, {text: "cat", blank: true, blankIndex: 0}, ...]`. Each blank entry carries `correctWord` and `distractors: string[]`.
- **D-13:** Y denominator = total enrolled students across all classes in the assignment. Extend `assignmentInclude` to include `class: { include: { _count: { select: { students: true } } } }`.
- **D-14:** Submission count displayed in two places: homework list page and homework detail page.
- **D-15:** Session detail page shows reading results as **collapsible activity cards**.
- **D-16:** Matching activity per-item row: image thumbnail + "student chose 'X'" + correct/wrong badge. Store `studentChosenWord` in `ReadingMatchingItemResult`.
- **D-17:** Fill-in-blank per-item row: sentence with blanks highlighted — student's chosen word shown inline (green if correct, red if wrong).
- **D-18:** Overall session score = **average of all activity scores** (unweighted).

### Claude's Discretion

- Drag-and-drop library: use `@dnd-kit/core` — smallest footprint, no peer-dep conflicts with Next.js 14.
- Image thumbnail size in matching results: 40×40px.
- Empty-state display on reading creation page when no activities added yet.
- Fill-in-blank sentence highlight UX: word clicks toggle blank state; already-blank words show as chip with × remove button.
- Type-picker modal design: extend HomeworkModal's type selector section into a standalone modal before navigating.

### Deferred Ideas (OUT OF SCOPE)

- Student-side reading game UI — Phase 2 scope (READ-01 through READ-06)
- Auto-generated distractors for fill-in-blank
- Bulk assignment to all classes at once
- Reading analytics (score trends) — v2 roadmap (ANALYTICS-01)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| READ-07 | Teacher can view reading session score breakdown per activity | Collapsible activity cards in session detail page; new `ReadingActivityResult` + item result tables; `getSession` must include reading results |
| TEACH-01 | Teacher can create any homework type from a unified creation flow | TypePickerModal splits create flow; dedicated `/teacher/homework/create/reading` page; `HomeworkType` enum extended to `READING` |
| TEACH-02 | Teacher can assign homework to one or more classes with a due date | `AssignModal` already handles multi-class; no changes needed |
| TEACH-03 | Teacher can view homework list with submission counts and assignment status | `assignmentInclude` extended for student counts; frontend sums enrolled students; displayed on list cards |
| TEACH-04 | Teacher can see per-student session results for any homework assignment | Existing detail page shows sessions; submission count (X/Y) added; non-submitted student list added |
| TEACH-05 | Teacher can review individual student attempt (score breakdown + recording playback for audio types) | Existing session detail extended with reading results section; `getSession` includes `readingResults` |
</phase_requirements>

---

## Summary

Phase 3 extends an already-functional teacher homework system by adding a third homework type — READING — end-to-end on the teacher side. The existing PHONICS and SPEAKING flows are mature, providing clear patterns to mirror. The backend needs a non-trivial Prisma schema extension (7 new models, 1 enum value), a reading-specific CRUD endpoint, and a `completeSession` branch for READING score computation. The frontend needs three new routes (create, edit, try for reading), a TypePickerModal refactor, and two result-display enhancements (submission counts, reading session breakdown).

The critical new complexity is the fill-in-blank sentence editor — a tokenized word-chip UI where clicks toggle blank state — and the drag-and-drop activity reordering. Both have clear, locked decisions (D-07, D-09) and well-supported libraries. Everything else follows existing patterns directly.

The submission count feature (D-13, D-14) is a backend query change plus two small frontend display patches; it is independent of reading and can be shipped as a standalone slice.

**Primary recommendation:** Plan as four vertical slices: (1) backend schema + reading CRUD endpoint, (2) reading creation page (matching + fill-in-blank editor + DnD), (3) submission count display, (4) reading session results UI.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TypePickerModal (create entry point) | Frontend (client component) | — | Pure UI routing decision; no server state needed |
| Reading creation page (activities editor) | Frontend (client component) | — | Complex interactive local state (pairs, segments, DnD order) |
| Image upload for matching pairs | Frontend → Backend API | MinIO storage | Reuse existing `POST /homework/image` endpoint |
| Reading homework CRUD | API / Backend (NestJS) | Prisma/PostgreSQL | Server-authoritative; mirrors existing homework controller pattern |
| Fill-in-blank segment storage | Database (PostgreSQL JSON column) | Backend | D-12 mandates JSON segment array; stored in `FillInBlankActivity.sentenceSegments` |
| Drag-and-drop activity ordering | Frontend (client component) | — | Local UI state; order persisted on save as `order` int field |
| Assignment submission count | API / Backend (Prisma include) | Frontend (sum) | Backend returns `_count.students` per class; frontend aggregates |
| Reading session result display | Frontend (client component) | API | Collapsible cards; data from extended `getSession` response |
| Reading score computation (`completeSession`) | API / Backend (game.service.ts) | — | Average of `ReadingActivityResult.score` values; matches SPEAKING/PHONICS pattern |

---

## Standard Stack

### Core (all verified against npm registry)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | 6.3.1 | Drag-and-drop primitives (`DndContext`, `useDraggable`, `useDroppable`) | [VERIFIED: npm registry] Minimal bundle, no external CSS, React 18 + Next.js 14 compatible; user-locked (D-09) |
| `@dnd-kit/sortable` | 10.0.0 | Sortable list (`useSortable`, `SortableContext`, `arrayMove`) | [VERIFIED: npm registry] Built on core; `arrayMove` is the standard way to reorder arrays on drag-end; peer requires `@dnd-kit/core ^6.3.0` |
| `@dnd-kit/utilities` | 3.2.2 | CSS transform helpers (`CSS.Transform.toString`) | [VERIFIED: npm registry] Tiny; simplifies `useSortable` style transform output |
| `prisma` | 5.x (existing) | Schema extension + migration | [VERIFIED: existing codebase] Already in use |
| `next` | 14.x (existing) | App Router page routes | [VERIFIED: existing codebase] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/common` | 10.x (existing) | NestJS decorators for new endpoints | Reading homework CRUD |
| `class-validator` | — (existing via NestJS) | DTO validation | `CreateReadingHomeworkDto` field validation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dnd-kit/sortable` | `react-beautiful-dnd` | react-beautiful-dnd is deprecated; dnd-kit is the community successor |
| `@dnd-kit/sortable` | custom CSS drag via mouse events | Requires accessibility handling, pointer capture, keyboard nav — don't hand-roll |

**Installation (frontend only):**
```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Version verification (done):**
- `@dnd-kit/core`: 6.3.1 (2025) [VERIFIED: npm registry]
- `@dnd-kit/sortable`: 10.0.0 [VERIFIED: npm registry]
- `@dnd-kit/utilities`: 3.2.2 [VERIFIED: npm registry]
- `@dnd-kit/sortable@10.0.0` peer requires `@dnd-kit/core ^6.3.0` — satisfied by 6.3.1 [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Teacher Browser
  │
  ├── /teacher/homework (page.tsx)
  │     TypePickerModal → [PHONICS/SPEAKING] → HomeworkModal (existing)
  │                     → [READING] ─────────→ navigate to /create/reading
  │
  ├── /teacher/homework/create/reading (new page)
  │     ReadingCreationPage
  │       ├── name field
  │       ├── ActivityList (DnD reorder)
  │       │     ├── MatchingActivityEditor (+ Add pair, image upload)
  │       │     └── FillInBlankEditor (sentence → tokenized chips)
  │       ├── + Add Activity (MATCHING | FILL_IN_BLANK)
  │       └── Save → POST /homework/reading → redirect /teacher/homework
  │
  ├── /teacher/homework/[id]/edit (new page, same component)
  │     ReadingCreationPage (prefilled) → PUT /homework/reading/:id
  │
  ├── /teacher/homework/[id]/try (existing, extended)
  │     READING branch → ReadingPreview (scored, not saved)
  │
  ├── /teacher/homework/[id] (existing, extended)
  │     + X/Y submitted count per assignment
  │     + non-submitted student list
  │
  └── /teacher/homework/[id]/session/[sessionId] (existing, extended)
        + Reading results section (collapsible activity cards)

Backend (NestJS)
  │
  ├── POST   /homework/reading          → createReadingHomework
  ├── GET    /homework/reading/:id      → getReadingHomework (with activities)
  ├── PUT    /homework/reading/:id      → updateReadingHomework
  ├── GET    /game/session/:id          → getSession (extended: readingResults)
  └── POST   /game/session/:id/complete → completeSession (READING branch)

Database (PostgreSQL via Prisma)
  └── 7 new models + READING enum value
```

### Recommended Project Structure (new files only)

```
frontend/app/teacher/homework/
├── create/
│   └── reading/
│       └── page.tsx          ← ReadingCreationPage (create mode)
├── [id]/
│   ├── edit/
│   │   └── page.tsx          ← ReadingCreationPage (edit mode, prefilled)
│   └── try/
│       └── page.tsx          ← extend existing: add READING branch

frontend/lib/
└── admin-api.ts              ← extend: HomeworkType, reading types, reading API fns

backend/src/homework/
├── homework.dto.ts           ← add CreateReadingHomeworkDto, UpdateReadingHomeworkDto
├── homework.repository.ts    ← add reading CRUD + extend assignmentInclude
├── homework.service.ts       ← add reading methods
└── homework.controller.ts    ← add POST/GET/PUT /homework/reading routes

backend/prisma/
└── schema.prisma             ← add READING enum + 7 new models + migration
```

### Pattern 1: Prisma Nested Create for Reading Activities

Mirror the existing `buildPartsCreate` function in `homework.repository.ts`:

```typescript
// Source: existing homework.repository.ts lines 17-33 (established pattern)
function buildReadingActivitiesCreate(activities: CreateReadingActivityDto[]) {
  if (!activities?.length) return undefined;
  return {
    create: activities.map((act, idx) => ({
      type: act.type,
      order: idx,
      ...(act.type === 'MATCHING' ? {
        matchingPairs: {
          create: act.pairs.map((p, pIdx) => ({
            imageUrl: p.imageUrl,
            word: p.word,
            order: pIdx,
          })),
        },
      } : {
        fillInBlank: {
          create: {
            sentenceSegments: act.segments,  // JSON stored as-is
            blanks: {
              create: act.segments
                .filter(s => s.blank)
                .map(s => ({
                  blankIndex: s.blankIndex!,
                  correctWord: s.text,
                  distractors: s.distractors ?? [],
                })),
            },
          },
        },
      }),
    })),
  };
}
```

### Pattern 2: @dnd-kit/sortable Vertical List

Standard sortable list pattern for activity reordering:

```typescript
// Source: [CITED: https://docs.dndkit.com/presets/sortable]
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// In the sortable item component:
function SortableActivityCard({ activity }: { activity: ReadingActivityDraft }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: activity.draftId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <button {...listeners} className="cursor-grab active:cursor-grabbing">≡</button>
      {/* card content */}
    </div>
  );
}

// In the page:
function handleDragEnd(event) {
  const { active, over } = event;
  if (active.id !== over?.id) {
    setActivities(prev => {
      const oldIdx = prev.findIndex(a => a.draftId === active.id);
      const newIdx = prev.findIndex(a => a.draftId === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }
}
```

**Important:** Each sortable item needs a stable `id` prop. Use a `draftId` (e.g., `nanoid()` or `crypto.randomUUID()`) generated when the activity is added — do not use array index as DnD id.

### Pattern 3: Fill-in-Blank Sentence Tokenizer

```typescript
// Source: [ASSUMED] — standard word-splitting approach
function tokenizeSentence(sentence: string): SentenceSegment[] {
  // Split on word boundaries preserving spaces/punctuation as separate tokens
  const tokens = sentence.match(/\S+|\s+/g) ?? [];
  return tokens.map(token => ({
    text: token,
    blank: false,
    // blankIndex and distractors added when toggled to blank
  }));
}

// Toggle a word token to blank:
function toggleBlank(segments: SentenceSegment[], idx: number): SentenceSegment[] {
  const seg = segments[idx];
  if (seg.text.trim() === '') return segments; // skip whitespace tokens
  if (seg.blank) {
    // unblank: remove blankIndex, re-index all remaining blanks
    const next = segments.map((s, i) => i === idx ? { ...s, blank: false } : s);
    return reindexBlanks(next);
  } else {
    const blankCount = segments.filter(s => s.blank).length;
    return segments.map((s, i) =>
      i === idx ? { ...s, blank: true, blankIndex: blankCount, correctWord: s.text, distractors: [] } : s
    );
  }
}
```

### Pattern 4: completeSession READING Branch

Mirrors existing SPEAKING / PHONICS branch in `game.service.ts` lines 148-156:

```typescript
// Source: game.service.ts line 132+ (established pattern to extend)
if (hw.type === 'READING') {
  const activityResults = session.readingActivityResults ?? [];
  const scores = activityResults.map(r => r.score);
  avgScore = scores.length > 0
    ? scores.reduce((s, v) => s + v, 0) / scores.length
    : 0;
}
```

### Pattern 5: assignmentInclude Extension for Student Counts (D-13)

```typescript
// Source: homework.repository.ts line 13-15 (existing assignmentInclude to extend)
const assignmentInclude = {
  classes: {
    include: {
      class: {
        include: { _count: { select: { students: true } } },
      },
    },
  },
  _count: { select: { sessions: true } },
};

// Frontend sum (D-13):
const totalEnrolled = assignment.classes.reduce(
  (sum, ac) => sum + (ac.class._count?.students ?? 0), 0
);
```

### Anti-Patterns to Avoid

- **Using array index as DnD sortable id:** DnD loses track of items on reorder. Always use a stable string/number id per draft item.
- **Storing blank distractors as a single comma-string:** D-08 specifies per-blank distractor lists; store as `string[]` JSON array, not a single concatenated string.
- **Mutating `sentenceSegments` JSON in place on update:** Delete all existing reading activities and re-create (same pattern as `update()` in `homework.repository.ts` lines 82-95 for parts). Doing a partial update on nested JSON arrays in Prisma requires careful handling.
- **Putting reading activity type logic inside HomeworkModal:** Modal is for PHONICS and SPEAKING only (D-01, D-02). Reading has its own dedicated page.
- **Reading creation page wrapping TeacherShell directly:** The existing try page uses `AuthGate`; the creation page should use `TeacherShell` (same as other teacher pages) since it is a standard teacher route, not a full-screen game.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop activity list | Custom mouse/touch drag | `@dnd-kit/sortable` + `useSortable` | Handles pointer capture, keyboard accessibility, touch events, drop animation — locked in D-09 |
| Sentence word tokenizer | Regex character-split | Standard `match(/\S+|\s+/g)` split + chip toggle | Preserves whitespace tokens for re-assembly; simple and correct for English sentences |
| Image upload for matching pairs | New upload endpoint | `uploadSpeakingImage()` in `admin-api.ts` → `POST /homework/image` | Same MinIO bucket, same endpoint — locked in D-11 |
| Assignment student count query | Manual JOIN or second query | Prisma `_count: { select: { students: true } }` nested include | One-query solution; Prisma handles the aggregate — locked in D-13 |

**Key insight:** The reading homework system reuses every infrastructure piece already in place (upload, assignment, session, score storage). The only truly new complexity is the fill-in-blank editor UI and the Prisma schema additions.

---

## Common Pitfalls

### Pitfall 1: `HomeworkType` enum out of sync between Prisma and TypeScript
**What goes wrong:** Adding `READING` to `schema.prisma` but forgetting to update `export type HomeworkType` in `frontend/lib/admin-api.ts` or `export type HomeworkType` in `backend/src/homework/homework.dto.ts`. TypeScript will happily compile with the old union type, and READING items will be treated as unknown type in `TYPE_META` lookups, causing silent runtime errors.
**Why it happens:** Three locations own this type: schema, backend DTO, frontend API client.
**How to avoid:** Update all three in the same commit. Add `READING` to `TYPE_META` in `homework/page.tsx` and `homework/[id]/page.tsx` before any render code touches it.
**Warning signs:** `TYPE_META[h.type]` returns `undefined`, causing crashes on the homework list/detail pages for READING items.

### Pitfall 2: DnD sortable item id must be stable across renders
**What goes wrong:** Using array index as the `id` prop for `useSortable`. After a drag-and-drop reorder, the array index of each item changes, causing DnD to misidentify items on the next drag.
**Why it happens:** `@dnd-kit/sortable` tracks items by their id, not their array position.
**How to avoid:** Assign a `draftId` (e.g., `crypto.randomUUID()`) when each activity is created in local state. Use `draftId` as the sortable id. The `order` persisted to DB is derived from array index at save time, not stored in local state.
**Warning signs:** Dragging an item to position 2 then dragging again causes wrong item to move.

### Pitfall 3: Fill-in-blank blank index drift after unblank
**What goes wrong:** If a teacher unblanks word at `blankIndex: 1` (middle of three blanks), the remaining blanks have indices 0 and 2 — a gap. When the student game tries to render blank slots by index, the missing index causes undefined renders.
**Why it happens:** `blankIndex` is sequential and used to map answers back to blanks.
**How to avoid:** After every toggle-to-normal, re-index all `blank: true` segments in the array (assign blankIndex 0, 1, 2... in order of appearance). See `reindexBlanks` helper in Pattern 3 above.
**Warning signs:** Student game (Phase 2) shows wrong number of blank slots.

### Pitfall 4: Prisma update deletes child records on reading homework edit
**What goes wrong:** The existing `update()` pattern in `homework.repository.ts` deletes all parts and re-creates them. For reading homework, the same delete-and-recreate must cascade through activities → matchingPairs AND activities → fillInBlank → blanks. If cascade `onDelete` is not set on child models, the delete will fail with a foreign key constraint.
**Why it happens:** Prisma nested deletes require either explicit cascade rules or manual delete ordering.
**How to avoid:** Set `onDelete: Cascade` on all child relations in `schema.prisma` (same pattern as `HomeworkPart → HomeworkWord`). Confirm before writing migration.
**Warning signs:** `PUT /homework/reading/:id` returns 500 with Prisma FK constraint error.

### Pitfall 5: Session `getSession` missing reading results in include
**What goes wrong:** `game.repository.ts` `sessionInclude` currently includes `speakingResults` and `phonicsResults`. If `readingActivityResults` and their child item results are not added here, the session detail page will receive an empty array for reading sessions.
**Why it happens:** Prisma does not auto-include relations; every relation must be explicitly listed.
**How to avoid:** Extend `sessionInclude` to include `readingActivityResults: { include: { matchingItemResults: { include: { pair: true } }, fillInBlankItemResults: { include: { blank: true } } } }`.
**Warning signs:** Session detail shows "No results recorded yet" for a completed reading session with a non-zero score.

---

## Code Examples

### Existing: `uploadSpeakingImage` (reuse for matching pairs)
```typescript
// Source: frontend/lib/admin-api.ts lines 155-167
export async function uploadSpeakingImage(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/homework/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) return parseApiError(res);
  const { key } = await res.json() as { key: string };
  return `${API_URL}/homework/image/${key}`;
}
```

### Existing: `assignmentInclude` to extend for D-13
```typescript
// Source: backend/src/homework/homework.repository.ts lines 13-15
const assignmentInclude = {
  classes: { include: { class: true } },
  _count: { select: { sessions: true } },
};
// Extend to:
const assignmentInclude = {
  classes: { include: { class: { include: { _count: { select: { students: true } } } } } },
  _count: { select: { sessions: true } },
};
```

### Existing: `scoreColor` / `scoreHex` helpers (reuse for activity scores)
```typescript
// Source: frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx lines 13-21
function scoreColor(score: number) {
  if (score >= 80) return 'text-brand-green';
  if (score >= 50) return 'text-accent';
  return 'text-highlight';
}
function scoreHex(score: number) {
  if (score >= 80) return '#22C55E';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}
```

### Existing: Homework card action bar (reuse Try / Edit / Delete pattern)
```typescript
// Source: frontend/app/teacher/homework/page.tsx lines 676-698
// READING adds: Edit navigates to /teacher/homework/[id]/edit (not openEdit modal)
// READING Try: navigates to /teacher/homework/[id]/try (same as PHONICS/SPEAKING)
```

---

## New Prisma Schema (D-12 + Context.md backend schema decision)

The following models must be added to `backend/prisma/schema.prisma`:

```prisma
// Extend enum:
enum HomeworkType {
  PHONICS
  SPEAKING
  READING  // ← add
}

// New models:

model ReadingActivity {
  id              Int                   @id @default(autoincrement())
  homeworkId      Int
  type            ReadingActivityType
  order           Int
  homework        Homework              @relation(fields: [homeworkId], references: [id], onDelete: Cascade)
  matchingPairs   MatchingPair[]
  fillInBlank     FillInBlankActivity?
  activityResults ReadingActivityResult[]

  @@unique([homeworkId, order])
  @@map("reading_activities")
}

enum ReadingActivityType {
  MATCHING
  FILL_IN_BLANK
}

model MatchingPair {
  id              Int                     @id @default(autoincrement())
  activityId      Int
  imageUrl        String
  word            String
  order           Int
  activity        ReadingActivity         @relation(fields: [activityId], references: [id], onDelete: Cascade)
  itemResults     MatchingItemResult[]

  @@unique([activityId, order])
  @@map("matching_pairs")
}

model FillInBlankActivity {
  id               Int                      @id @default(autoincrement())
  activityId       Int                      @unique
  sentenceSegments Json                     // SentenceSegment[] per D-12
  activity         ReadingActivity          @relation(fields: [activityId], references: [id], onDelete: Cascade)
  blanks           FillInBlankBlank[]

  @@map("fill_in_blank_activities")
}

model FillInBlankBlank {
  id                Int                      @id @default(autoincrement())
  activityId        Int
  blankIndex        Int
  correctWord       String
  distractors       Json                     // string[]
  fillInBlank       FillInBlankActivity      @relation(fields: [activityId], references: [id], onDelete: Cascade)
  itemResults       FillInBlankItemResult[]

  @@unique([activityId, blankIndex])
  @@map("fill_in_blank_blanks")
}

model ReadingActivityResult {
  id             Int             @id @default(autoincrement())
  sessionId      Int
  activityId     Int
  score          Float
  session        HomeworkSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  activity       ReadingActivity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  matchingResults    MatchingItemResult[]
  fillInBlankResults FillInBlankItemResult[]

  @@unique([sessionId, activityId])
  @@map("reading_activity_results")
}

model MatchingItemResult {
  id                Int                   @id @default(autoincrement())
  activityResultId  Int
  pairId            Int
  studentChosenWord String
  isCorrect         Boolean
  activityResult    ReadingActivityResult @relation(fields: [activityResultId], references: [id], onDelete: Cascade)
  pair              MatchingPair          @relation(fields: [pairId], references: [id], onDelete: Cascade)

  @@unique([activityResultId, pairId])
  @@map("matching_item_results")
}

model FillInBlankItemResult {
  id                Int                   @id @default(autoincrement())
  activityResultId  Int
  blankId           Int
  studentChosenWord String
  isCorrect         Boolean
  activityResult    ReadingActivityResult @relation(fields: [activityResultId], references: [id], onDelete: Cascade)
  blank             FillInBlankBlank      @relation(fields: [blankId], references: [id], onDelete: Cascade)

  @@unique([activityResultId, blankId])
  @@map("fill_in_blank_item_results")
}
```

Also: `HomeworkSession` must gain `readingActivityResults ReadingActivityResult[]` relation.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-beautiful-dnd` | `@dnd-kit/*` | ~2022 | react-beautiful-dnd deprecated; @dnd-kit is the community standard |
| Prisma `Json` for typed arrays | Still `Json` | — | Prisma does not have a typed JSON array column; use `Json` and cast in TypeScript |

**Deprecated/outdated:**
- `react-beautiful-dnd`: deprecated by maintainer; do not use (D-09 correctly specifies @dnd-kit)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `FillInBlankActivity` relates to `ReadingActivity` via `activityId` (1:1, `@unique`) | Prisma Schema section | If wrong: schema needs a different join; low risk, easy to change before migration |
| A2 | Reading Try page should show a non-saved interactive preview of matching + fill-in-blank activities | Architecture Patterns | If wrong: try page needs different interaction model; discuss with user before implementing |
| A3 | `HomeworkSession` model will need `readingActivityResults` back-relation added explicitly | Pitfall 5 | If omitted: Prisma generate will fail; caught at compile time |

---

## Open Questions

1. **Reading Try page interaction model (D-05)**
   - What we know: Try page is "scored, not saved to DB"; existing try page simulates phonics/speaking with speech recognition + camera.
   - What's unclear: Should the reading try page be fully interactive (clickable matching pairs, fill-in-blank word selection) or a simpler visual walkthrough?
   - Recommendation: Implement as fully interactive (same game logic as student side) but client-side only — no API calls. This gives teachers the most accurate preview of the student experience.

2. **Non-submitted student list source (D-14)**
   - What we know: D-14 says homework detail page should show "list of students who haven't submitted."
   - What's unclear: The current detail page loads `hw.assignments[].sessions[]`. Students who have NOT submitted are those enrolled in assignment classes but without a session. The query must join class enrollment.
   - Recommendation: Either (a) fetch class enrollment separately via `getClass(classId)` on the detail page, or (b) extend `findById` in `homework.repository.ts` to include class students. Option (b) is a single query; option (a) adds N+1 fetches. Use option (b).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Frontend package install | ✓ | (existing) | — |
| PostgreSQL | Prisma migration | ✓ | (existing via Docker) | — |
| `@dnd-kit/core` | Activity drag-and-drop | ✗ (not installed) | 6.3.1 available | No fallback — install required |
| `@dnd-kit/sortable` | Activity drag-and-drop | ✗ (not installed) | 10.0.0 available | No fallback — install required |
| `@dnd-kit/utilities` | DnD CSS helpers | ✗ (not installed) | 3.2.2 available | No fallback — install required |
| MinIO | Image upload (matching pairs) | ✓ | (existing) | — |

**Missing dependencies with no fallback:**
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — must be installed before reading creation page is implemented. Wave 0 task.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.2 + ts-jest (backend) |
| Config file | `backend/package.json` → `"jest"` key |
| Quick run command | `cd backend && npx jest --testPathPattern=homework --no-coverage` |
| Full suite command | `cd backend && npx jest --no-coverage` |

No frontend test framework is configured. Frontend changes are validated by TypeScript build + manual verification.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| READ-07 | Reading activity results returned in `getSession` | unit (backend) | `npx jest game.service --no-coverage` | ❌ Wave 0 |
| TEACH-01 | `createReadingHomework` creates homework with activities, pairs, blanks | unit (backend) | `npx jest homework.service --no-coverage` | ❌ Wave 0 |
| TEACH-03 | `assignmentInclude` includes class student count | unit (backend) | `npx jest homework.repository --no-coverage` | ❌ Wave 0 |
| TEACH-04, TEACH-05 | `completeSession` computes READING average score | unit (backend) | `cd backend && npx jest game.service --no-coverage` | ❌ Wave 0 (extend existing spec) |
| TEACH-02 | AssignModal multi-class assignment | manual | — | manual only |

### Sampling Rate
- **Per task commit:** `cd backend && npx jest --testPathPattern="homework|game" --no-coverage`
- **Per wave merge:** `cd backend && npx jest --no-coverage`
- **Phase gate:** Full backend suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/src/homework/homework.service.spec.ts` — covers TEACH-01 (reading CRUD)
- [ ] `backend/src/homework/homework.repository.spec.ts` — covers TEACH-03 (student count in assignmentInclude)
- [ ] Extend `backend/src/game/game.service.spec.ts` — add READING session mock + completeSession READING branch test

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `AuthGuard` on all homework + game endpoints |
| V4 Access Control | yes | `AuthGuard` with `TEACHER` role check (existing pattern) |
| V5 Input Validation | yes | DTOs validate reading activity structure; `min 2 pairs` enforced in service |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unvalidated JSON in `sentenceSegments` | Tampering | Validate segment array shape in `CreateReadingHomeworkDto` before persisting |
| Unrestricted image upload for matching pairs | Elevation of privilege | `POST /homework/image` already limits to 10MB and `TEACHER` role (existing controller) |
| Cross-student result access | Information Disclosure | `getSession` should verify session belongs to a homework assigned to a class visible to the requesting teacher (existing gap — same risk as before this phase) |

---

## Sources

### Primary (HIGH confidence)
- Codebase direct read — `frontend/app/teacher/homework/page.tsx`, `[id]/page.tsx`, `[id]/session/[sessionId]/page.tsx`, `[id]/try/page.tsx`
- Codebase direct read — `frontend/lib/admin-api.ts`, `frontend/lib/colors.ts`
- Codebase direct read — `backend/prisma/schema.prisma`
- Codebase direct read — `backend/src/homework/homework.repository.ts`, `homework.dto.ts`, `homework.controller.ts`
- Codebase direct read — `backend/src/game/game.service.ts`, `game.repository.ts`, `game.controller.ts`
- [VERIFIED: npm registry] — `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`

### Secondary (MEDIUM confidence)
- [CITED: https://docs.dndkit.com/presets/sortable] — `useSortable`, `SortableContext`, `arrayMove` usage pattern
- Context.md `03-CONTEXT.md` — all locked decisions D-01 through D-18

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry verified for @dnd-kit; everything else is existing codebase
- Architecture: HIGH — direct codebase read of all canonical files referenced in CONTEXT.md
- Pitfalls: HIGH — derived from actual code patterns in existing files
- Prisma schema: HIGH — mirrors established patterns in current schema; one [ASSUMED] structural detail flagged

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (stable libraries; Prisma 5 + Next.js 14 + @dnd-kit 6/10 are stable)
