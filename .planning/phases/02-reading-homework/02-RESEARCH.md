# Phase 2: Reading Homework — Research

**Researched:** 2026-05-14
**Domain:** NestJS backend, Next.js 14 frontend, Prisma ORM, @dnd-kit drag-and-drop
**Confidence:** HIGH (all findings verified by direct codebase inspection and npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Add `READING` as a third value to the `HomeworkType` enum. Same `Homework` table, same `HomeworkAssignment`/`HomeworkSession` flow.
- **D-02:** New tables (new Prisma migration required):
  - `ReadingActivity` (id, homeworkId, type: `MATCH | FILL_BLANK`, order)
  - `MatchPair` (id, activityId, imageUrl, word, order) — 2–6 per activity
  - `FillBlank` (id, activityId, sentence, order)
  - `FillBlankChoice` (id, blankId, word, isCorrect)
- **D-03:** `ReadingResult` table (sessionId unique, totalItems, correctItems, score Float 0–100). Single row per session. Per-activity breakdown deferred to Phase 3.
- **D-04:** New dedicated page at `frontend/app/game/reading/[id]/page.tsx`.
- **D-05:** Route entry: student app navigates to `/game/reading/{assignmentId}` for READING homework.
- **D-06:** Matching: images in top row, words in bottom row. Click image to select (highlighted border), click word to pair. Correct → green + locked. Incorrect → shake then deselect.
- **D-07:** 2–6 pairs per matching activity. "Add pair" button disabled at 6.
- **D-08:** Words shuffled on session load.
- **D-09:** All pairs locked → auto-advance after ~1s celebration.
- **D-10:** Matching score: only final state counts; shakes do not penalize.
- **D-11:** Each FillBlank item = one sentence with exactly ONE blank (`___`).
- **D-12:** Teacher specifies choices explicitly; at least 2 required; exactly one `isCorrect=true`.
- **D-13:** Student sees one sentence at a time; `___` shown as blank box; choices as buttons below.
- **D-14:** Wrong answer: shake briefly, item marked incorrect, auto-advance. One shot per blank.
- **D-15:** Correct answer: green highlight briefly, auto-advance.
- **D-16:** Score contribution: 1 point per fill-blank item; correct on first = 1, wrong = 0.
- **D-17:** Score = `round((correctItems / totalItems) * 100)`. `totalItems = all MatchPair rows + all FillBlank rows`. Stored in `ReadingResult.score`.
- **D-18:** Teacher creation page at `/teacher/homework/create/reading`. "Create Reading" button added to existing homework list page.
- **D-19:** Activity reordering via `@dnd-kit/core` drag-and-drop. Each activity is a draggable card.
- **D-20:** Bulk image upload for matching pairs: `<input type="file" multiple accept="image/*">`. Filename (sans extension) pre-fills word label. Uses existing `POST /homework/image` per image.
- **D-21:** Fill-in-blank creation: teacher types each sentence (with `___`) and adds choices one at a time. One choice toggled as correct.
- **D-22:** On save: POST to existing `/homework` endpoint with `type: READING` and activities array. Backend creates Homework + ReadingActivity + children in a `prisma.$transaction([])`.

### Claude's Discretion

- Exact animation implementation for pair lock (green flash duration, shake keyframe)
- Celebration moment between activities (color burst, star, or simple opacity fade)
- Specific layout/card styling on the creation page
- Whether to show activity index ("Activity 1 of 3") during student gameplay
- Error state if student loads a READING session with no activities

### Deferred Ideas (OUT OF SCOPE)

- Per-activity score breakdown on result screen (READ-07 is Phase 3)
- Teacher editing/updating reading homework after creation (Phase 3)
- Per-item correct/wrong detail stored in DB (Phase 3)
- Retry/re-attempt for wrong fill-blank answers
- Drag-and-drop for image ordering within a matching activity
- Reading homework "try" mode for teacher preview
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| READ-01 | Teacher can create image-word matching activity (upload images, assign word labels) | D-19/D-20: `@dnd-kit/core` for activity DnD; `POST /homework/image` reused for bulk upload; creation page at `/teacher/homework/create/reading` |
| READ-02 | Teacher can create fill-in-blank activity (paragraph/sentence with gaps, multiple-choice word options) | D-21/D-22: UI for sentence input + choice management; saved to `FillBlank`/`FillBlankChoice` tables via extended `POST /homework` |
| READ-03 | Teacher can freely sequence matching and fill-in-blank activities within one homework | D-19/D-22: `ReadingActivity.order` field + `@dnd-kit` DnD for reordering; order sent in POST payload |
| READ-04 | Student completes image-word matching by click-to-pair | D-06/D-07/D-08/D-09/D-10: Dedicated game page; all-at-once grid; shuffle on load; correct/incorrect feedback; auto-advance |
| READ-05 | Student answers fill-in-blank by selecting from provided word choices | D-11/D-12/D-13/D-14/D-15: One-at-a-time sentence view; one-shot answer; immediate feedback; auto-advance |
| READ-06 | System scores reading activities deterministically and stores result | D-17/D-03: `round(correctItems/totalItems*100)`; stored in `ReadingResult` via new `POST /game/session/:id/reading-result` endpoint |
</phase_requirements>

---

## Summary

Phase 2 adds reading homework end-to-end: teacher creation, student gameplay, and deterministic scoring. The existing codebase provides a strong foundation: the `Homework`/`HomeworkAssignment`/`HomeworkSession` tables need only a new enum value and five new tables; the `POST /homework/image` image-upload endpoint is already committed; the session start/complete lifecycle is reused as-is; and the `scoreHexColor`/`cardGradients` helpers are ready for the result screen.

The primary new concerns are: (1) extending the backend data model with a correct Prisma transaction that creates `ReadingActivity` + children atomically; (2) a new `POST /game/session/:id/reading-result` endpoint that scores and stores `ReadingResult`; (3) a teacher creation page with `@dnd-kit/core` drag-and-drop for activity reordering; and (4) a student reading game page that implements two distinct interaction patterns (matching grid and fill-in-blank one-at-a-time) within a single sequential flow. The `completeSession` endpoint in `game.service.ts` must be extended to handle `READING` type (no video upload, score comes from `ReadingResult.score`).

`@dnd-kit/core` version 6.3.1 and `@dnd-kit/sortable` version 10.0.0 are confirmed available on npm. The frontend currently has no `@dnd-kit` packages — they must be added to `frontend/package.json`.

**Primary recommendation:** Plan 10 tasks covering: (1) Prisma schema + migration, (2) backend DTO + homework repository extension, (3) reading-result endpoint + game service extension, (4) frontend type additions to `admin-api.ts`, (5) teacher creation page scaffold, (6) matching activity UI on creation page, (7) fill-blank activity UI on creation page, (8) student homework list routing fix for READING type, (9) student reading game page (matching activity renderer), (10) student reading game page (fill-blank renderer + submission + result screen).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Reading schema (new tables) | Database / Storage | — | Prisma migration generates DB schema and client types |
| Homework creation (READING type) | API / Backend | — | Existing `POST /homework` extended; transaction in `homework.repository.ts` |
| Activity image upload | API / Backend | — | Existing `POST /homework/image` endpoint; no changes needed |
| Reading result scoring + storage | API / Backend | — | Deterministic math; `POST /game/session/:id/reading-result` |
| `completeSession` READING branch | API / Backend | — | `game.service.ts` branch: no video, reads score from `ReadingResult` |
| Teacher creation UI | Browser / Client | — | `/teacher/homework/create/reading` page; `@dnd-kit` runs in browser |
| Student homework list routing | Browser / Client | — | Detect `hw.type === 'READING'`, navigate to `/game/reading/[id]` |
| Matching game interaction | Browser / Client | — | Pure client-side state; pairs stored locally until session complete |
| Fill-blank game interaction | Browser / Client | — | Pure client-side state; one-shot answer tracking |
| Session submission | Browser / Client | API / Backend | Frontend POSTs reading result then calls `completeSession` |

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| NestJS | 11.x (inferred from `@nestjs/testing ^11.1.19`) | Backend framework | No changes — extend existing modules |
| Prisma ORM | 5.x (inferred from existing schema) | DB schema + query client | New migration required for reading tables |
| Next.js | 14.x (`^14.0.0` in `package.json`) | Frontend framework | App Router + `use client` pages |
| React | 18.x (`^18.0.0`) | UI rendering | `useState`/`useEffect`/`useCallback` patterns already established |
| TypeScript | 5.x | Type safety | DTOs as plain classes (no decorators — existing pattern) |

[VERIFIED: direct file inspection of `frontend/package.json`, `backend/package.json`]

### New Dependency

| Library | Version | Purpose | Install Target |
|---------|---------|---------|----------------|
| @dnd-kit/core | 6.3.1 | Drag sensor, DnD context, draggable/droppable primitives | `frontend/package.json` |
| @dnd-kit/sortable | 10.0.0 | `SortableContext` + `useSortable` hook for ordered lists | `frontend/package.json` |
| @dnd-kit/utilities | 3.2.2 | `CSS.Transform.toString()` helper | `frontend/package.json` |

[VERIFIED: `npm view @dnd-kit/core version` → 6.3.1; `npm view @dnd-kit/sortable version` → 10.0.0; `npm view @dnd-kit/utilities version` → 3.2.2]

**Installation:**
```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core | react-beautiful-dnd | react-beautiful-dnd is unmaintained; @dnd-kit is the ecosystem standard (D-19 locked this choice) |
| @dnd-kit/sortable | raw @dnd-kit/core only | `@dnd-kit/sortable` provides `SortableContext` + `arrayMove` utility that eliminates boilerplate for ordered lists |

---

## Architecture Patterns

### System Architecture Diagram

```
Teacher creation flow:
  Browser ──POST images──> POST /homework/image ──> MinIO storage
  Browser ──POST homework (type:READING, activities[])──> homework.controller
                                                          └─> homework.repository.create()
                                                               └─> prisma.$transaction([
                                                                     createHomework,
                                                                     createReadingActivities,
                                                                     createMatchPairs / FillBlanks / Choices
                                                                   ])

Student game flow:
  Browser ──GET /game/homework/{studentId}──> game.controller
                                              └─> returns assignments (including READING type)
  Browser ──POST /game/session/start──> game.controller ──> createSession()
  Browser ──[play matching + fill-blank, track results locally]──>
  Browser ──POST /game/session/:id/reading-result──> game.controller
                                                     └─> saveReadingResult()
                                                          └─> prisma.readingResult.upsert()
  Browser ──POST /game/session/:id/complete──> game.controller
                                               └─> completeSession() [READING branch]
                                                    └─> reads ReadingResult.score
                                                         └─> updates HomeworkSession.score + completedAt
```

### Recommended Project Structure (new files only)

```
backend/prisma/
├── migrations/
│   └── 20260514XXXXXX_add_reading_homework/   # new migration

backend/src/
├── homework/
│   ├── homework.dto.ts          # extend: add READING to HomeworkType, add reading activity DTOs
│   └── homework.repository.ts   # extend: add READING branch in create()
├── game/
│   ├── game.controller.ts       # extend: add POST reading-result endpoint
│   ├── game.service.ts          # extend: add saveReadingResult(), update completeSession()
│   ├── game.dto.ts              # extend: add SaveReadingResultDto
│   └── game.repository.ts       # extend: add saveReadingResult(), update sessionInclude

frontend/
├── lib/
│   └── admin-api.ts             # extend: add READING types, saveReadingResult()
├── app/
│   ├── teacher/homework/
│   │   ├── page.tsx             # extend: add "Create Reading" button, add READING to TYPE_META
│   │   └── create/reading/
│   │       └── page.tsx         # NEW: teacher reading homework creation page
│   └── game/
│       ├── homework/
│       │   └── page.tsx         # extend: route READING homework to /game/reading/[id]
│       └── reading/
│           └── [id]/
│               └── page.tsx     # NEW: student reading game page
```

### Pattern 1: Prisma Transaction for READING Homework Creation

**What:** Create Homework + all child records atomically using `prisma.$transaction([...operations])`.
**When to use:** Any write that spans multiple tables where partial failure must not leave orphan records.

```typescript
// Source: existing homework.repository.ts pattern + Prisma docs
async createReading(dto: CreateHomeworkDto) {
  return this.prisma.$transaction(async (tx) => {
    const hw = await tx.homework.create({
      data: { type: 'READING', name: dto.name ?? null },
    });
    for (const [actIdx, act] of (dto.readingActivities ?? []).entries()) {
      const activity = await tx.readingActivity.create({
        data: { homeworkId: hw.id, type: act.type, order: actIdx },
      });
      if (act.type === 'MATCH') {
        await tx.matchPair.createMany({
          data: act.pairs.map((p, i) => ({
            activityId: activity.id, imageUrl: p.imageUrl, word: p.word, order: i,
          })),
        });
      } else {
        for (const [blankIdx, item] of act.items.entries()) {
          const blank = await tx.fillBlank.create({
            data: { activityId: activity.id, sentence: item.sentence, order: blankIdx },
          });
          await tx.fillBlankChoice.createMany({
            data: item.choices.map((c) => ({
              blankId: blank.id, word: c.word, isCorrect: c.isCorrect,
            })),
          });
        }
      }
    }
    return tx.homework.findUnique({ where: { id: hw.id }, include: readingInclude });
  });
}
```

[ASSUMED: `$transaction` async callback form is supported in this Prisma version — consistent with existing codebase pattern of `prisma.$transaction([])` array form, but the async callback form is safer for sequential dependent creates. Verify Prisma version supports both.]

### Pattern 2: @dnd-kit SortableContext for Activity Reordering

**What:** Wrap activity list in `SortableContext`, use `useSortable` per item, `arrayMove` on `DragEndEvent`.
**When to use:** Any ordered list where the user drags items to reorder.

```typescript
// Source: @dnd-kit/sortable docs (verified on npm 10.0.0)
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableActivity({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>{children}</div>;
}

// In parent:
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (over && active.id !== over.id) {
    setActivities((prev) => {
      const oldIdx = prev.findIndex((a) => a.id === active.id);
      const newIdx = prev.findIndex((a) => a.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }
}

<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
    {activities.map((a) => <SortableActivity key={a.id} id={a.id}>{/* card */}</SortableActivity>)}
  </SortableContext>
</DndContext>
```

[VERIFIED: `npm view @dnd-kit/sortable version` → 10.0.0; API pattern consistent with @dnd-kit/sortable docs]

### Pattern 3: Reading Result Submission Flow

**What:** Frontend tracks correctItems/totalItems locally during gameplay, then POSTs a single result object on completion.
**When to use:** Deterministic scoring where all state is client-side during play.

```typescript
// Source: existing saveSpeakingResult pattern in admin-api.ts
export async function saveReadingResult(
  sessionId: number,
  data: { correctItems: number; totalItems: number },
): Promise<ReadingResult> {
  return req<ReadingResult>(`/game/session/${sessionId}/reading-result`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Pattern 4: completeSession READING Branch

**What:** Extend the existing `completeSession` in `game.service.ts` with a third branch for READING type that reads `ReadingResult.score` instead of averaging phonics results.
**When to use:** READING sessions have no video upload and their score is already computed by `saveReadingResult`.

```typescript
// Source: existing game.service.ts completeSession (lines 131-157)
// In completeSession(), after SPEAKING and PHONICS branches:
if (hw.type === 'READING') {
  const rr = await this.repo.getReadingResult(sessionId);
  avgScore = rr ? rr.score : 0;
}
```

### Pattern 5: Matching Game Client State

**What:** Track which image is selected and which pairs are locked in React state.
**When to use:** Click-to-pair matching where correct pairs lock and incorrect pairs reset.

```typescript
// [ASSUMED] — standard React state pattern
type PairState = 'idle' | 'selected' | 'locked' | 'shaking';

interface MatchState {
  selectedImageId: number | null;
  pairStates: Record<number, { imageState: PairState; wordState: PairState; matchedWordId?: number }>;
}
```

### Anti-Patterns to Avoid

- **Storing per-answer correctness in DB during play:** Phase 2 does not need per-item breakdown. Only the final `ReadingResult` (totalItems, correctItems, score) is stored. Per-item detail is Phase 3 (READ-07).
- **Calling `completeSession` without first calling `saveReadingResult`:** `completeSession` reads `ReadingResult.score` for READING type — if no result row exists, score will be 0. The frontend must call `saveReadingResult` first.
- **Using `arrayMove` from `@dnd-kit/core` instead of `@dnd-kit/sortable`:** `arrayMove` is exported from `@dnd-kit/sortable`, not `@dnd-kit/core`.
- **Using `prisma.$transaction([])` array form for sequential dependent creates:** Array form requires all operations to be built before execution — you cannot use the ID of a newly-created record in a subsequent operation within the same array. Use the async callback form `prisma.$transaction(async (tx) => {...})` for sequential creates like `ReadingActivity → MatchPair/FillBlank`.
- **Not shuffling words server-side:** Word shuffle should happen client-side on game page load (D-08). Do not persist shuffle order to DB.
- **Reusing the existing `/homework` PUT endpoint for READING creation:** The update endpoint (`homework.repository.ts update()`) deletes and recreates parts — it does not know about reading activities. READING creation via POST is fine, but update is out of scope for Phase 2.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Activity drag-and-drop reordering | Custom mouse event handler | `@dnd-kit/core` + `@dnd-kit/sortable` | Accessibility, touch support, keyboard nav, pointer/touch sensor normalization |
| Fisher-Yates shuffle for word randomization | Custom shuffle | `[...arr].sort(() => Math.random() - 0.5)` or a proper Fisher-Yates implementation inline | Trivial but must be seeded per session load not per render (avoid re-shuffle on re-render) |
| Score calculation | Custom formula | Inline in `saveReadingResult` service method: `Math.round((correctItems / totalItems) * 100)` | Formula is locked (D-17); no external library needed |

**Key insight:** The main complexity in this phase is UX state management (matching grid selection + lock states, fill-blank one-at-a-time flow), not infrastructure. Lean on existing project patterns.

---

## Common Pitfalls

### Pitfall 1: HomeworkType enum not updated in all locations

**What goes wrong:** Adding `READING` to `schema.prisma` enum but forgetting to update `homework.dto.ts` (`HomeworkType` type alias) and `admin-api.ts` (`HomeworkType` type alias). TypeScript catches the backend and frontend separately — they share no code.
**Why it happens:** The enum is defined three places: Prisma schema, backend DTO, and frontend API types.
**How to avoid:** Update all three in the same task/wave. The frontend `TYPE_META` record in `homework/page.tsx` also needs a READING entry.
**Warning signs:** TypeScript error "Type 'READING' is not assignable to type 'PHONICS' | 'SPEAKING'".

### Pitfall 2: game.repository.ts sessionInclude missing readingActivities

**What goes wrong:** `getSession()` returns a session without reading activities or `ReadingResult`, so `completeSession` cannot read the score and the student game page cannot render activities.
**Why it happens:** `sessionInclude` is a static object defined at module top — it must be explicitly updated to include `readingResults`, and the homework include must add `readingActivities` with nested pairs/blanks/choices.
**How to avoid:** Extend `homeworkInclude` to include `readingActivities: { include: { matchPairs: { orderBy: { order: 'asc' } }, fillBlanks: { include: { choices: true }, orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } }` and add `readingResults: true` to `sessionInclude`.
**Warning signs:** Runtime error "Cannot read property 'readingActivities' of undefined".

### Pitfall 3: Prisma migration conflicts with untracked Phase 1 migration state

**What goes wrong:** Phase 1 RESEARCH.md notes there are stale untracked migration folders (20260507000003 through 20260509000001). If those haven't been cleaned up, running `prisma migrate dev` may fail with a drift error.
**Why it happens:** Prisma compares `migration_lock.toml` with the actual migration folder contents.
**How to avoid:** The Phase 2 migration task should first verify `prisma migrate status` is clean before creating the new migration. If Phase 1 cleanup (D-24) is not done, it must be done first.
**Warning signs:** `prisma migrate dev` error "The migration X is not yet applied".

### Pitfall 4: @dnd-kit pointer sensor triggering on input fields inside draggable cards

**What goes wrong:** When teacher types in an input inside an activity card that has drag handles, the pointer sensor may start a drag on mousedown inside inputs.
**Why it happens:** Default `PointerSensor` activates on any pointer press.
**How to avoid:** Use `PointerSensor` with `activationConstraint: { distance: 8 }` (requires moving 8px before drag starts), or place the `useSortable` listeners only on a dedicated drag-handle element (the ≡ icon) via `setActivatorNodeRef`.
**Warning signs:** Typing in an input inside a draggable card accidentally triggers drag.

### Pitfall 5: Matching grid re-shuffling on every React render

**What goes wrong:** Word order changes every time the component re-renders (e.g., when pair state updates), confusing the student.
**Why it happens:** Shuffle logic placed directly in render body or `useMemo` without stable dependency.
**How to avoid:** Shuffle words once in `useEffect` on game page mount (when activities data is first available) and store shuffled order in a `useRef` or `useState` that is set exactly once.
**Warning signs:** Words visibly jump position when student clicks.

### Pitfall 6: Fill-blank `___` placeholder not detected if teacher types spaces or different underscores

**What goes wrong:** Teacher types `_ _ _` or `___` with different Unicode dashes — sentence display breaks.
**Why it happens:** Frontend splits on literal `___` but teacher may enter variations.
**How to avoid:** Normalize `___` on input change in the creation form (trim whitespace, enforce exactly three underscores). Display code should split on the regex `/___/` not string `includes`.
**Warning signs:** Blank box not appearing in student view.

---

## Code Examples

### Extending `HomeworkType` in Prisma schema

```prisma
// Source: backend/prisma/schema.prisma (current state + addition)
enum HomeworkType {
  PHONICS
  SPEAKING
  READING   // ADD THIS
}

enum ReadingActivityType {
  MATCH
  FILL_BLANK
}

model ReadingActivity {
  id         Int                 @id @default(autoincrement())
  homeworkId Int
  type       ReadingActivityType
  order      Int
  homework   Homework            @relation(fields: [homeworkId], references: [id], onDelete: Cascade)
  matchPairs MatchPair[]
  fillBlanks FillBlank[]
  @@unique([homeworkId, order])
  @@map("reading_activities")
}

model MatchPair {
  id         Int             @id @default(autoincrement())
  activityId Int
  imageUrl   String
  word       String
  order      Int
  activity   ReadingActivity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  @@unique([activityId, order])
  @@map("match_pairs")
}

model FillBlank {
  id         Int             @id @default(autoincrement())
  activityId Int
  sentence   String
  order      Int
  activity   ReadingActivity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  choices    FillBlankChoice[]
  @@unique([activityId, order])
  @@map("fill_blanks")
}

model FillBlankChoice {
  id        Int       @id @default(autoincrement())
  blankId   Int
  word      String
  isCorrect Boolean
  blank     FillBlank @relation(fields: [blankId], references: [id], onDelete: Cascade)
  @@map("fill_blank_choices")
}

model ReadingResult {
  id           Int             @id @default(autoincrement())
  sessionId    Int             @unique
  totalItems   Int
  correctItems Int
  score        Float
  session      HomeworkSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  @@map("reading_results")
}
```

[VERIFIED: matches D-02 and D-03 decisions; follows existing schema conventions (snake_case @@map, onDelete Cascade)]

### `SaveReadingResultDto` (backend)

```typescript
// Source: backend/src/game/game.dto.ts (new addition, follows existing pattern)
export class SaveReadingResultDto {
  correctItems: number;
  totalItems: number;
}
```

### Extending `homeworkInclude` in game.repository.ts

```typescript
// Source: backend/src/game/game.repository.ts (extend homeworkInclude)
const readingActivitiesInclude = {
  readingActivities: {
    include: {
      matchPairs: { orderBy: { order: 'asc' as const } },
      fillBlanks: {
        include: { choices: true },
        orderBy: { order: 'asc' as const },
      },
    },
    orderBy: { order: 'asc' as const },
  },
};

const homeworkInclude = {
  parts: { include: { words: { orderBy: { order: 'asc' as const } } }, orderBy: { order: 'asc' as const } },
  ...readingActivitiesInclude,
};
```

### Student homework list routing for READING type

```typescript
// Source: frontend/app/game/homework/page.tsx (extend handleStart)
async function handleStart(assignmentId: number) {
  if (!user.studentId) return;
  setStarting(assignmentId);
  try {
    const session = await startSession(user.studentId, assignmentId);
    const hwType = session.assignment?.homework?.type;
    if (hwType === 'READING') {
      router.push(`/game/reading/${session.id}`);
    } else {
      router.push(`/game/session/${session.id}`);
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to start');
    setStarting(null);
  }
}
```

[VERIFIED: existing `handleStart` in `game/homework/page.tsx` line 48–58; READING branch is purely additive]

---

## Runtime State Inventory

> Not applicable — this is a greenfield feature addition, not a rename/refactor phase. No existing runtime state references "reading homework".

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build, backend runtime | Yes | 22.21.0 | — |
| npm | Package install | Yes | 10.9.4 | — |
| @dnd-kit/core | Teacher creation page | Not installed | 6.3.1 on registry | — (required, must install) |
| @dnd-kit/sortable | Teacher creation page | Not installed | 10.0.0 on registry | — (required, must install) |
| @dnd-kit/utilities | Teacher creation page | Not installed | 3.2.2 on registry | — (required, must install) |
| PostgreSQL (via Prisma) | All backend DB ops | Assumed running | — | — |
| MinIO (via StorageService) | Image upload | Assumed running | — | — |

[VERIFIED: `npm view @dnd-kit/core version` → 6.3.1; `npm view @dnd-kit/sortable version` → 10.0.0; `npm view @dnd-kit/utilities version` → 3.2.2]
[ASSUMED: PostgreSQL and MinIO are running — Phase 1 depends on them and Phase 1 is implemented; no explicit verification in this session]

**Missing dependencies with no fallback:**
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — must be installed via `cd frontend && npm install ...` before teacher creation page can be built.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 |
| Config file | `backend/package.json` (jest key) |
| Quick run command | `cd backend && npx jest game.service.spec.ts --no-coverage` |
| Full suite command | `cd backend && npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| READ-06 | Score formula: round(correctItems/totalItems*100) | unit | `cd backend && npx jest game.service.spec.ts --no-coverage -t "reading"` | Wave 0 (extend existing spec) |
| READ-06 | completeSession with READING type reads ReadingResult.score | unit | `cd backend && npx jest game.service.spec.ts --no-coverage -t "completeSession READING"` | Wave 0 |
| READ-04 | Matching pair lock: correct pair locked, wrong pair resets | manual | — | manual-only (DOM interaction) |
| READ-05 | Fill-blank one-shot: wrong answer advances, no retry | manual | — | manual-only (DOM interaction) |
| READ-01 | Bulk image upload creates pair cards | manual | — | manual-only (file picker) |
| READ-03 | Activity drag reorder changes order in state | manual | — | manual-only (pointer drag) |

### Sampling Rate

- **Per task commit:** `cd backend && npx jest game.service.spec.ts --no-coverage`
- **Per wave merge:** `cd backend && npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] Extend `backend/src/game/game.service.spec.ts` with READING session fixtures and tests for `saveReadingResult` and `completeSession` READING branch.

*(Frontend interaction tests are manual-only for this phase — no jest-dom/testing-library infrastructure exists in the frontend.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Session endpoints already behind `AuthGuard` |
| V3 Session Management | No | Session lifecycle unchanged |
| V4 Access Control | No | No new role-specific endpoints |
| V5 Input Validation | Yes | `isCorrect` boolean, `order` integer, `sentence` string — validate in DTO |
| V6 Cryptography | No | No new secrets or encryption |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Teacher submits `isCorrect: true` on multiple choices | Tampering | Backend enforces: validate exactly one `isCorrect=true` per `FillBlank` item in `homework.service.ts` |
| Student submits `correctItems > totalItems` | Tampering | Backend recomputes score from `correctItems`/`totalItems` — validate `0 <= correctItems <= totalItems` in `SaveReadingResultDto` or service |
| Oversized image upload for matching pairs | Denial of Service | Existing `POST /homework/image` already enforces 10 MB file size limit (`limits: { fileSize: 10 * 1024 * 1024 }`) — no changes needed |

[ASSUMED: The backend currently has no DTO validation decorators (existing DTOs use plain classes without `class-validator`). Input range validation for `correctItems`/`totalItems` must be done manually in the service method, not via `@IsInt()` decorators.]

---

## Existing Code: Precise Delta Required

This section documents the exact current state of each file that needs modification and the specific changes required.

### `backend/prisma/schema.prisma`

- **Current:** `HomeworkType` enum has `PHONICS | SPEAKING`. `HomeworkSession` has `speakingResults` and `phonicsResults` relations. No reading-related models.
- **Delta:** Add `READING` to `HomeworkType`. Add `ReadingActivityType` enum. Add 5 new models: `ReadingActivity`, `MatchPair`, `FillBlank`, `FillBlankChoice`, `ReadingResult`. Add `readingActivities ReadingActivity[]` relation to `Homework`. Add `readingResults ReadingResult[]` relation to `HomeworkSession`.

### `backend/src/homework/homework.dto.ts`

- **Current:** `HomeworkType = 'PHONICS' | 'SPEAKING'`. `CreateHomeworkDto` has phonics/speaking fields only.
- **Delta:** Add `'READING'` to `HomeworkType`. Add `ReadingActivityType = 'MATCH' | 'FILL_BLANK'`. Add `CreateMatchPairDto`, `CreateFillBlankChoiceDto`, `CreateFillBlankItemDto`, `CreateReadingActivityDto`. Add `readingActivities?: CreateReadingActivityDto[]` to `CreateHomeworkDto`.

### `backend/src/homework/homework.repository.ts`

- **Current:** `create()` handles PHONICS (parts) and SPEAKING (speakingPictureUrl etc) branches. No transaction.
- **Delta:** Add READING branch in `create()` using `prisma.$transaction(async tx => {...})`. Add `readingActivitiesInclude` constant. Update `homeworkInclude` to include reading activities. Update `findById` include to expose activities.

### `backend/src/game/game.dto.ts`

- **Current:** Only `StartSessionDto`, `SavePhonicsResultDto`, `CompleteSessionDto`.
- **Delta:** Add `SaveReadingResultDto { correctItems: number; totalItems: number }`.

### `backend/src/game/game.repository.ts`

- **Current:** `homeworkInclude` has only `parts`. `sessionInclude` has `speakingResults` and `phonicsResults`. No reading result methods.
- **Delta:** Extend `homeworkInclude` with `readingActivities` (with matchPairs + fillBlanks/choices). Add `readingResults: true` to `sessionInclude`. Add `saveReadingResult(sessionId, totalItems, correctItems, score)` method. Add `getReadingResult(sessionId)` method.

### `backend/src/game/game.service.ts`

- **Current:** `completeSession` has SPEAKING and PHONICS branches (`hw.type === 'SPEAKING'` then implicit PHONICS). No READING branch.
- **Delta:** Add `saveReadingResult(sessionId, dto)` method. Add `READING` branch in `completeSession` that calls `this.repo.getReadingResult(sessionId)` and uses its score (no video upload).

### `backend/src/game/game.controller.ts`

- **Current:** No reading-result endpoint.
- **Delta:** Add `@Post('session/:id/reading-result')` endpoint calling `this.service.saveReadingResult(id, dto)`.

### `frontend/lib/admin-api.ts`

- **Current:** `HomeworkType = 'PHONICS' | 'SPEAKING'`. No reading types. `GameSession` has `speakingResults` and `phonicsResults` only.
- **Delta:** Add `'READING'` to `HomeworkType`. Add `ReadingActivity`, `MatchPair`, `FillBlank`, `FillBlankChoice`, `ReadingResult` interfaces. Add `readingActivities` to `HomeworkItem`. Add `readingResults` to `GameSession`. Add `saveReadingResult()` function. Add `CreateReadingActivityInput`, `CreateMatchPairInput`, `CreateFillBlankChoiceInput`, `CreateFillBlankItemInput` types. Extend `CreateHomeworkInput` with `readingActivities?`.

### `frontend/app/teacher/homework/page.tsx`

- **Current:** `TYPE_META` has `PHONICS` and `SPEAKING` only. `HomeworkModal` handles PHONICS and SPEAKING. Toolbar filter has PHONICS/SPEAKING filter buttons. Single "New Homework" button.
- **Delta:** Add `READING` to `TYPE_META` with label/emoji/color. Add "Create Reading" button/link alongside "New Homework" (links to `/teacher/homework/create/reading`). Add READING to filter tabs. Add READING content preview in homework card (show activity count summary).

### `frontend/app/game/homework/page.tsx`

- **Current:** `TYPE_META` has PHONICS and SPEAKING. `handleStart` always routes to `/game/session/{sessionId}`.
- **Delta:** Add `READING` to `TYPE_META`. In `handleStart`: after `startSession`, check `session.assignment?.homework?.type` — if `'READING'`, route to `/game/reading/${session.id}` instead.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Prisma `$transaction(async tx => {...})` callback form is available in the version used by this project | Architecture Patterns - Pattern 1 | If only array form is supported, sequential dependent creates (activity → pairs) require restructuring with separate write calls; low risk as callback form is standard Prisma 4.7+ |
| A2 | PostgreSQL and MinIO services are running in the development environment | Environment Availability | If down, all DB operations and image uploads fail at runtime; not a code issue |
| A3 | Backend DTOs use plain classes (no `class-validator`) so input validation must be manual in service | Security Domain | If class-validator IS installed, guards could be added as decorators instead of manual checks; verify with `grep -r class-validator backend/src` |

---

## Open Questions (RESOLVED)

1. **Phase 1 migration cleanup status** — RESOLVED in Plan 02-01 Task 1 Step 2
   - What we know: Phase 1 RESEARCH.md (D-24) called for deleting stale migration folders 20260507000003 through 20260509000001.
   - What's unclear: `ls backend/prisma/migrations/` shows those folders are still present (20260507000003, 20260507000004, 20260507000005, 20260508000001, 20260509000001). It is unknown if `prisma migrate status` shows drift.
   - Resolution: Plan 02-01 Task 1 Step 2 includes a `prisma migrate status` check with `migrate resolve --applied` instructions for handling any drift before running the Phase 2 migration.

2. **`HomeworkSession.readingResults` relation — single vs array** — RESOLVED in Plan 02-01 Task 1 Step 1
   - What we know: `ReadingResult` has `sessionId @unique` — one per session.
   - What's unclear: Whether to expose as `readingResults ReadingResult[]` (Prisma default) or rely on `readingResult ReadingResult?` (Prisma `@relation` one-to-one).
   - Resolution: Use `readingResult ReadingResult?` (one-to-one relation) as recommended — Plan 02-01 Task 1 Step 1 uses this form, avoiding the `.readingResults[0]` pattern.

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `backend/prisma/schema.prisma`, `backend/src/game/game.service.ts`, `backend/src/game/game.repository.ts`, `backend/src/homework/homework.repository.ts`, `frontend/app/game/homework/page.tsx`, `frontend/app/game/session/[id]/page.tsx`, `frontend/lib/admin-api.ts`, `frontend/lib/colors.ts`
- npm registry: `npm view @dnd-kit/core version` → 6.3.1, `npm view @dnd-kit/sortable version` → 10.0.0, `npm view @dnd-kit/utilities version` → 3.2.2

### Secondary (MEDIUM confidence)
- @dnd-kit/sortable API: `SortableContext`, `useSortable`, `arrayMove` pattern — consistent with public API at npm registry version 10.0.0

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from npm registry and direct file inspection
- Architecture: HIGH — all integration points verified by reading actual source files
- Pitfalls: HIGH — most pitfalls derived from direct inspection of existing code patterns (not hypothetical)

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (stable stack; @dnd-kit releases infrequently)
