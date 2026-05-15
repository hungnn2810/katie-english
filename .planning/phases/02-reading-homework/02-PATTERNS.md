# Phase 2: Reading Homework - Pattern Map

**Mapped:** 2026-05-15
**Files analyzed:** 12 new/modified files
**Analogs found:** 12 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/prisma/schema.prisma` | model/config | CRUD | `backend/prisma/schema.prisma` (self — extend) | exact |
| `backend/src/homework/homework.dto.ts` | model/DTO | request-response | `backend/src/homework/homework.dto.ts` (self — extend) | exact |
| `backend/src/homework/homework.repository.ts` | repository | CRUD | `backend/src/homework/homework.repository.ts` (self — extend) | exact |
| `backend/src/game/game.dto.ts` | model/DTO | request-response | `backend/src/game/game.dto.ts` (self — extend) | exact |
| `backend/src/game/game.repository.ts` | repository | CRUD | `backend/src/game/game.repository.ts` (self — extend) | exact |
| `backend/src/game/game.service.ts` | service | request-response | `backend/src/game/game.service.ts` (self — extend) | exact |
| `backend/src/game/game.controller.ts` | controller | request-response | `backend/src/game/game.controller.ts` (self — extend) | exact |
| `frontend/lib/admin-api.ts` | utility/types | request-response | `frontend/lib/admin-api.ts` (self — extend) | exact |
| `frontend/app/teacher/homework/page.tsx` | component/page | CRUD | `frontend/app/teacher/homework/page.tsx` (self — extend) | exact |
| `frontend/app/game/homework/page.tsx` | component/page | request-response | `frontend/app/game/homework/page.tsx` (self — extend) | exact |
| `frontend/app/teacher/homework/create/reading/page.tsx` | component/page | CRUD | `frontend/app/teacher/homework/page.tsx` (HomeworkModal) | role-match |
| `frontend/app/game/reading/[id]/page.tsx` | component/page | event-driven | `frontend/app/game/session/[id]/page.tsx` | role-match |

---

## Pattern Assignments

### `backend/prisma/schema.prisma` (model/config, CRUD)

**Analog:** `backend/prisma/schema.prisma` (self — extend)

**Existing enum pattern** (lines 16–19):
```prisma
enum HomeworkType {
  PHONICS
  SPEAKING
}
```
Add `READING` as third value.

**Existing model convention** (lines 126–149 — `HomeworkPart` and `HomeworkWord`):
```prisma
model HomeworkPart {
  id         Int            @id @default(autoincrement())
  homeworkId Int
  name       String
  order      Int
  homework   Homework       @relation(fields: [homeworkId], references: [id], onDelete: Cascade)
  words      HomeworkWord[]

  @@unique([homeworkId, order])
  @@map("homework_parts")
}
```
Key conventions to copy exactly:
- `@id @default(autoincrement())` on `id`
- `onDelete: Cascade` on all child FK relations
- `@@unique([parentId, order])` on ordered children
- `@@map("snake_case_table_name")`
- One-to-one result tables use `sessionId Int @unique` + `@@map`

**Existing result model pattern** (lines 191–201 — `SpeakingResult`):
```prisma
model SpeakingResult {
  id              Int             @id @default(autoincrement())
  sessionId       Int             @unique
  transcribedText String?
  score           Float
  matchedWords    Int
  totalWords      Int
  session         HomeworkSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@map("speaking_results")
}
```
`ReadingResult` copies this exactly: `sessionId Int @unique`, `score Float`, `onDelete: Cascade`.

**`Homework` model for adding relations** (lines 111–124):
```prisma
model Homework {
  id                 Int                  @id @default(autoincrement())
  type               HomeworkType
  ...
  parts              HomeworkPart[]
  assignments        HomeworkAssignment[]
  ...
}
```
Add `readingActivities ReadingActivity[]` here.

**`HomeworkSession` model for adding relation** (lines 175–189):
```prisma
model HomeworkSession {
  id              Int                 @id @default(autoincrement())
  ...
  speakingResults SpeakingResult[]
  phonicsResults  PhonicsItemResult[]

  @@map("homework_sessions")
}
```
Add `readingResult ReadingResult?` (one-to-one via `@unique` on FK side).

---

### `backend/src/homework/homework.dto.ts` (DTO, request-response)

**Analog:** `backend/src/homework/homework.dto.ts` (self — extend)

**Existing type alias pattern** (lines 1–2):
```typescript
export type HomeworkType = 'PHONICS' | 'SPEAKING';
export type SpeakingMode = 'FREE_SPEAK' | 'SCRIPT_MATCH';
```
Add `'READING'` to `HomeworkType`. Add `export type ReadingActivityType = 'MATCH' | 'FILL_BLANK';`.

**Existing nested DTO pattern** (lines 4–22):
```typescript
export class CreateWordDto {
  text: string;
  highlight?: string;
  imageUrl?: string;
}

export class CreatePartDto {
  name: string;
  words: CreateWordDto[];
}

export class CreateHomeworkDto {
  type: HomeworkType;
  speakingMode?: SpeakingMode;
  name?: string;
  parts?: CreatePartDto[];
  speakingPictureUrl?: string;
  speakingText?: string;
}
```
Plain classes, no decorators, optional fields use `?`. New DTOs to add follow same pattern:
```typescript
export class CreateMatchPairDto {
  imageUrl: string;
  word: string;
}

export class CreateFillBlankChoiceDto {
  word: string;
  isCorrect: boolean;
}

export class CreateFillBlankItemDto {
  sentence: string;
  choices: CreateFillBlankChoiceDto[];
}

export class CreateReadingActivityDto {
  type: ReadingActivityType;
  pairs?: CreateMatchPairDto[];      // present when type === 'MATCH'
  items?: CreateFillBlankItemDto[];  // present when type === 'FILL_BLANK'
}
```
Extend `CreateHomeworkDto` with `readingActivities?: CreateReadingActivityDto[];`.

---

### `backend/src/homework/homework.repository.ts` (repository, CRUD)

**Analog:** `backend/src/homework/homework.repository.ts` (self — extend)

**Include constant pattern** (lines 5–10):
```typescript
const partsInclude = {
  parts: {
    include: { words: { orderBy: { order: 'asc' as const } } },
    orderBy: { order: 'asc' as const },
  },
};
```
Add a parallel `readingActivitiesInclude` constant:
```typescript
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
```

**Existing `create()` branching pattern** (lines 68–80):
```typescript
create(dto: CreateHomeworkDto) {
  return this.prisma.homework.create({
    data: {
      type: dto.type,
      name: dto.name ?? null,
      speakingMode: dto.type === 'SPEAKING' ? (dto.speakingMode ?? null) : null,
      speakingPictureUrl: dto.type === 'SPEAKING' ? (dto.speakingPictureUrl ?? null) : null,
      speakingText: dto.type === 'SPEAKING' ? (dto.speakingText ?? null) : null,
      parts: dto.type === 'PHONICS' ? buildPartsCreate(dto.parts) : undefined,
    },
    include: { ...partsInclude, assignments: { include: assignmentInclude } },
  });
}
```
The READING branch cannot be added inline here because sequential creates (`ReadingActivity` ID required before `MatchPair`/`FillBlank` creates). Add a separate `createReading(dto)` method using `prisma.$transaction(async (tx) => {...})`. Call `createReading` from `create()` when `dto.type === 'READING'`.

**Transaction pattern to use** (from RESEARCH.md Architecture Patterns - Pattern 1):
```typescript
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
          data: (act.pairs ?? []).map((p, i) => ({
            activityId: activity.id, imageUrl: p.imageUrl, word: p.word, order: i,
          })),
        });
      } else {
        for (const [blankIdx, item] of (act.items ?? []).entries()) {
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
    return tx.homework.findUnique({
      where: { id: hw.id },
      include: { ...partsInclude, ...readingActivitiesInclude, assignments: { include: assignmentInclude } },
    });
  });
}
```

**Spread include pattern** used throughout (lines 78, 95, 111, etc.):
```typescript
include: { ...partsInclude, assignments: { include: assignmentInclude } },
```
Extend all `findAll`, `findById`, `createAssignment`, `findAssignmentById` includes to also spread `...readingActivitiesInclude`.

---

### `backend/src/game/game.dto.ts` (DTO, request-response)

**Analog:** `backend/src/game/game.dto.ts` (self — extend)

**Existing DTO pattern** (lines 1–13 — entire file):
```typescript
export class StartSessionDto {
  studentId: number;
  assignmentId: number;
}

export class SavePhonicsResultDto {
  wordId: number;
  transcribedText?: string;
}

export class CompleteSessionDto {
  // score calculated from results
}
```
Plain class, no decorators. Add:
```typescript
export class SaveReadingResultDto {
  correctItems: number;
  totalItems: number;
}
```

---

### `backend/src/game/game.repository.ts` (repository, CRUD)

**Analog:** `backend/src/game/game.repository.ts` (self — extend)

**`homeworkInclude` constant** (lines 4–9):
```typescript
const homeworkInclude = {
  parts: {
    include: { words: { orderBy: { order: 'asc' as const } } },
    orderBy: { order: 'asc' as const },
  },
};
```
Extend by spreading `readingActivitiesInclude` (same shape as homework.repository.ts pattern above).

**`sessionInclude` constant** (lines 11–21):
```typescript
const sessionInclude = {
  assignment: {
    include: {
      homework: { include: homeworkInclude },
      classes: { include: { class: true } },
    },
  },
  student: true,
  speakingResults: true,
  phonicsResults: { include: { word: true } },
};
```
Add `readingResult: true` at the same level as `speakingResults`.

**`saveSpeakingResult` upsert pattern** (lines 68–74) — copy for `saveReadingResult`:
```typescript
saveSpeakingResult(sessionId: number, transcribedText: string, score: number, matchedWords: number, totalWords: number) {
  return this.prisma.speakingResult.upsert({
    where: { sessionId },
    update: { transcribedText, score, matchedWords, totalWords },
    create: { sessionId, transcribedText, score, matchedWords, totalWords },
  });
}
```
New method:
```typescript
saveReadingResult(sessionId: number, totalItems: number, correctItems: number, score: number) {
  return this.prisma.readingResult.upsert({
    where: { sessionId },
    update: { totalItems, correctItems, score },
    create: { sessionId, totalItems, correctItems, score },
  });
}

getReadingResult(sessionId: number) {
  return this.prisma.readingResult.findUnique({ where: { sessionId } });
}
```

---

### `backend/src/game/game.service.ts` (service, request-response)

**Analog:** `backend/src/game/game.service.ts` (self — extend)

**Guard pattern** (lines 36–41 — session guard before any write):
```typescript
const session = await this.repo.getSession(sessionId);
if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
if (session.completedAt) throw new BadRequestException('Session already completed');

const hw = session.assignment.homework;
if (hw.type !== 'SPEAKING') throw new BadRequestException('Homework is not a SPEAKING type');
```
New `saveReadingResult` method copies this guard pattern, checking `hw.type !== 'READING'`.

**`completeSession` branching pattern** (lines 147–156):
```typescript
if (hw.type === 'SPEAKING') {
  const sr = session.speakingResults[0];
  avgScore = sr ? sr.score : 0;
} else {
  const phonicsResults = session.phonicsResults ?? [];
  const totalWords = hw.parts.reduce((s: number, p: { words: unknown[] }) => s + p.words.length, 0);
  const scoreSum = phonicsResults.reduce((s: number, r: { score: number }) => s + r.score, 0);
  avgScore = totalWords > 0 ? scoreSum / totalWords : 0;
}
```
Add a third branch before the `else`:
```typescript
} else if (hw.type === 'READING') {
  const rr = await this.repo.getReadingResult(sessionId);
  avgScore = rr ? rr.score : 0;
} else {
```

**Logger pattern** (lines 11–12):
```typescript
private readonly logger = new Logger(GameService.name);
```
Use `this.logger.log(...)` for new `saveReadingResult` scoring log.

---

### `backend/src/game/game.controller.ts` (controller, request-response)

**Analog:** `backend/src/game/game.controller.ts` (self — extend)

**JSON POST endpoint pattern** (lines 26–29):
```typescript
@Post('session/start')
startSession(@Body() dto: StartSessionDto) {
  return this.service.startSession(dto);
}
```
New reading-result endpoint is a plain JSON POST (no file upload):
```typescript
@Post('session/:id/reading-result')
saveReadingResult(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: SaveReadingResultDto,
) {
  return this.service.saveReadingResult(id, dto);
}
```
Import `SaveReadingResultDto` from `./game.dto`.

**Controller-level `@UseGuards(AuthGuard)`** (line 13):
```typescript
@UseGuards(AuthGuard)
@Controller('game')
export class GameController {
```
No changes needed — class-level guard already covers all routes.

---

### `frontend/lib/admin-api.ts` (utility/types, request-response)

**Analog:** `frontend/lib/admin-api.ts` (self — extend)

**Type alias pattern** (line 239):
```typescript
export type HomeworkType = 'PHONICS' | 'SPEAKING';
```
Add `'READING'`. Then add new interfaces after the existing ones:
```typescript
export type ReadingActivityType = 'MATCH' | 'FILL_BLANK';

export interface MatchPair {
  id: number;
  activityId: number;
  imageUrl: string;
  word: string;
  order: number;
}

export interface FillBlankChoice {
  id: number;
  blankId: number;
  word: string;
  isCorrect: boolean;
}

export interface FillBlank {
  id: number;
  activityId: number;
  sentence: string;
  order: number;
  choices: FillBlankChoice[];
}

export interface ReadingActivity {
  id: number;
  homeworkId: number;
  type: ReadingActivityType;
  order: number;
  matchPairs?: MatchPair[];
  fillBlanks?: FillBlank[];
}

export interface ReadingResult {
  id: number;
  sessionId: number;
  totalItems: number;
  correctItems: number;
  score: number;
}
```

**`HomeworkItem` interface extension** (lines 316–327):
```typescript
export interface HomeworkItem {
  id: number;
  type: HomeworkType;
  ...
  parts: HomeworkPart[];
  ...
}
```
Add `readingActivities?: ReadingActivity[];` field.

**`GameSession` interface extension** (lines 341–353):
```typescript
export interface GameSession {
  id: number;
  ...
  speakingResults?: SpeakingResult[];
  phonicsResults?: PhonicsItemResult[];
}
```
Add `readingResult?: ReadingResult;`.

**`req<T>` JSON helper pattern** (lines 15–22):
```typescript
async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) return parseApiError(res);
  return res.json();
}
```
New `saveReadingResult` function uses this `req<T>` helper (JSON POST, not FormData):
```typescript
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

**Input type additions for `CreateHomeworkInput`** (lines 253–260):
```typescript
export interface CreateHomeworkInput {
  type: HomeworkType;
  speakingMode?: SpeakingMode;
  name?: string;
  parts?: CreatePartInput[];
  speakingPictureUrl?: string;
  speakingText?: string;
}
```
Add `readingActivities?: CreateReadingActivityInput[];` and define:
```typescript
export interface CreateMatchPairInput { imageUrl: string; word: string; }
export interface CreateFillBlankChoiceInput { word: string; isCorrect: boolean; }
export interface CreateFillBlankItemInput { sentence: string; choices: CreateFillBlankChoiceInput[]; }
export interface CreateReadingActivityInput {
  type: ReadingActivityType;
  pairs?: CreateMatchPairInput[];
  items?: CreateFillBlankItemInput[];
}
```

---

### `frontend/app/teacher/homework/page.tsx` (component/page, CRUD)

**Analog:** `frontend/app/teacher/homework/page.tsx` (self — extend)

**`TYPE_META` record pattern** (lines 12–15):
```typescript
const TYPE_META: Record<HomeworkType, { label: string; emoji: string; color: string; bg: string }> = {
  PHONICS:  { label: 'Phonics',  emoji: '🔤', color: '#A78BFA', bg: '#A78BFA18' },
  SPEAKING: { label: 'Speaking', emoji: '🎤', color: '#FF9BD2', bg: '#FF9BD218' },
};
```
Add READING entry: `READING: { label: 'Reading', emoji: '📖', color: '#4F9DFF', bg: '#4F9DFF18' }`.

**Filter tabs pattern** (lines 562–576):
```typescript
{([
  { key: 'ALL', label: 'All' },
  { key: 'PHONICS', label: '🔤 Phonics' },
  { key: 'SPEAKING', label: '🎤 Speaking' },
] as const).map((t) => (
  <button key={t.key} onClick={() => setTypeFilter(t.key)}
    className="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all"
    style={typeFilter === t.key
      ? { background: '#F0F9FF', color: colors.primary, borderColor: colors.primary }
      : { background: 'white', color: colors.textSecondary, borderColor: colors.border }}>
    {t.label}
  </button>
))}
```
Add `{ key: 'READING', label: '📖 Reading' }` entry.

**New button alongside existing "New Homework"** (lines 578–585):
```typescript
<button onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0"
  style={{ background: gradients.primarySecondary }}>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
  New Homework
</button>
```
Add a `Link` button for READING creation next to this button:
```typescript
import Link from 'next/link';
// ...
<Link href="/teacher/homework/create/reading"
  className="btn-primary flex items-center gap-2 shrink-0"
  style={{ background: gradients.primaryPurple }}>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
  New Reading
</Link>
```

**Card content preview pattern** (lines 639–668):
```typescript
{h.type === 'PHONICS' && ( ... )}
{h.type === 'SPEAKING' && ( ... )}
```
Add:
```typescript
{h.type === 'READING' && (
  <div className="text-xs text-textSecondary">
    {(h.readingActivities ?? []).length} activit{(h.readingActivities ?? []).length !== 1 ? 'ies' : 'y'}
  </div>
)}
```

---

### `frontend/app/game/homework/page.tsx` (component/page, request-response)

**Analog:** `frontend/app/game/homework/page.tsx` (self — extend)

**`TYPE_META` pattern** (lines 9–12):
```typescript
const TYPE_META: Record<HomeworkType, { label: string; emoji: string }> = {
  PHONICS:  { label: 'Phonics',  emoji: '🔤' },
  SPEAKING: { label: 'Speaking', emoji: '🎤' },
};
```
Add `READING: { label: 'Reading', emoji: '📖' }`.

**`handleStart` routing pattern** (lines 48–58):
```typescript
async function handleStart(assignmentId: number) {
  if (!user.studentId) return;
  setStarting(assignmentId); setError('');
  try {
    const session = await startSession(user.studentId, assignmentId);
    router.push(`/game/session/${session.id}`);
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Failed to start');
    setStarting(null);
  }
}
```
Replace `router.push` line with type branch:
```typescript
const hwType = session.assignment?.homework?.type;
if (hwType === 'READING') {
  router.push(`/game/reading/${session.id}`);
} else {
  router.push(`/game/session/${session.id}`);
}
```

---

### `frontend/app/teacher/homework/create/reading/page.tsx` (NEW component/page, CRUD)

**Analog:** `frontend/app/teacher/homework/page.tsx` (HomeworkModal component)

**Page wrapper pattern** — `use client`, named imports from `@/lib/admin-api` and `@/lib/colors`:
```typescript
'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createHomework, uploadSpeakingImage,
  CreateReadingActivityInput, CreateMatchPairInput, CreateFillBlankItemInput,
} from '@/lib/admin-api';
import { gradients, colors } from '@/lib/colors';
```

**Image upload handler pattern** (lines 72–89 — `uploadWordImage` in HomeworkModal):
```typescript
async function uploadWordImage(pIdx: number, wIdx: number, file: File) {
  const key = `${pIdx}-${wIdx}`;
  setWordUploading(key);
  setUploadError('');
  try {
    const url = await uploadSpeakingImage(file);
    // update state...
  } catch (err: unknown) {
    setUploadError(err instanceof Error ? err.message : 'Upload failed');
  } finally {
    setWordUploading(null);
  }
}
```
Copy error handling pattern (try/catch, `err instanceof Error ? err.message : 'fallback'`).

**Form submit + navigate pattern** (lines 107–139 — `handleSubmit`):
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError('');
  // ... validation ...
  setLoading(true);
  try {
    await createHomework(form);
    onSaved();
    onClose();
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Failed to save.');
  } finally {
    setLoading(false);
  }
}
```
Reading creation page: on save success, `router.push('/teacher/homework')`.

**Error display pattern** (lines 383–389):
```typescript
{error && (
  <div className="text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-4">{error}</div>
)}
```

**Loading button pattern** (lines 396–399):
```typescript
<button type="submit" disabled={loading}
  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
  style={{ background: gradients.primarySecondary }}>
  {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>}
  {loading ? 'Saving…' : 'Create'}
</button>
```

**`@dnd-kit` SortableContext pattern** (from RESEARCH.md Pattern 2 — no analog in codebase yet):
```typescript
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

// Activation constraint prevents drag from firing inside input fields
const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

function SortableActivityCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="...">
      {/* Drag handle — listeners only on this element, not the whole card */}
      <button ref={setActivatorNodeRef} {...attributes} {...listeners} className="cursor-grab px-2">≡</button>
      {children}
    </div>
  );
}

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

<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
    {activities.map((a) => <SortableActivityCard key={a.id} id={a.id}>...</SortableActivityCard>)}
  </SortableContext>
</DndContext>
```

**Bulk image upload pattern** (lines 258–265 — `<input type="file" multiple>`):
```typescript
// Existing single file pattern in HomeworkModal:
<input type="file" accept="image/*" className="hidden"
  ref={(el) => { wordFileRefs.current[uploadKey] = el; }}
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) uploadWordImage(pIdx, wIdx, file);
    e.target.value = '';
  }} />
```
For bulk upload, add `multiple` attribute and iterate `e.target.files`:
```typescript
<input type="file" accept="image/*" multiple className="hidden"
  onChange={async (e) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const url = await uploadSpeakingImage(file);
      const word = file.name.replace(/\.[^.]+$/, ''); // strip extension
      addPair({ imageUrl: url, word });
    }
    e.target.value = '';
  }} />
```

---

### `frontend/app/game/reading/[id]/page.tsx` (NEW component/page, event-driven)

**Analog:** `frontend/app/game/session/[id]/page.tsx`

**Page scaffolding pattern** (lines 1–11):
```typescript
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { authHeaders } from '@/lib/auth';
import { completeSession, saveReadingResult, GameSession } from '@/lib/admin-api';
import { gradients, scoreHexColor } from '@/lib/colors';
```

**Session fetch pattern** (lines 33–37):
```typescript
async function fetchSession(id: number): Promise<GameSession> {
  const res = await fetch(`${API_URL}/game/session/${id}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}
```
Copy this exactly — reading game page fetches session the same way.

**`useParams` + page state machine pattern** (lines 70–82):
```typescript
const { id } = useParams<{ id: string }>();
const sessionId = Number(id);
const router = useRouter();

const [pageState, setPageState] = useState<PageState>('loading');
```
Reading page uses simpler states: `'loading' | 'playing' | 'submitting' | 'results' | 'error'`.

**`useEffect` session load pattern** (lines 108–135):
```typescript
useEffect(() => {
  fetchSession(sessionId).then((session) => {
    const hw = session.assignment!.homework!;
    // ... build items from hw.parts ...
  }).catch(() => setPageState('error'));
}, [sessionId]);
```
Reading page loads `hw.readingActivities` instead of `hw.parts`. Shuffle words in-place via `useRef` so shuffle runs once on mount.

**`AuthGate` wrapper on every render branch** (lines 375–377):
```typescript
return (
  <AuthGate requiredRole="STUDENT">
    {() => ( ... )}
  </AuthGate>
);
```
All render branches (loading, error, results, playing) are wrapped in `AuthGate requiredRole="STUDENT"`.

**Loading state pattern** (lines 440–452):
```typescript
if (pageState === 'loading') {
  return (
    <AuthGate requiredRole="STUDENT">
      {() => (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
          <div className="w-12 h-12 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/70 text-sm">Loading…</p>
        </div>
      )}
    </AuthGate>
  );
}
```

**Error state pattern** (lines 473–484):
```typescript
if (pageState === 'error') {
  return (
    <AuthGate requiredRole="STUDENT">
      {() => (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
          <p className="text-highlight text-lg font-bold">Session not found.</p>
          <button onClick={() => router.push('/game/homework')} className="text-white/60 text-sm hover:text-white">← Back</button>
        </div>
      )}
    </AuthGate>
  );
}
```

**Results screen pattern** (lines 499–583 — result score display):
```typescript
const finalScore = results?.score ?? 0;
const scoreColor = scoreHexColor(finalScore);
// ...
<div className="text-7xl font-black mt-4" style={{ color: scoreColor }}>{finalScore}%</div>
// ...
<button onClick={() => router.push('/game/homework')}
  className="w-full py-4 rounded-2xl text-white font-black text-lg"
  style={{ background: gradients.primaryPurple }}>
  Finish
</button>
```
Reading results screen: uses same `scoreHexColor`, `gradients.gameBg`, same "Finish" button → `/game/homework`.

**Session finish + `completeSession` call pattern** (lines 306–340):
```typescript
async function finishSession() {
  setPageState('uploading');
  // ... score items ...
  try {
    const session = await completeSession(sessionId, blob);
    setResults(session);
  } catch (err) {
    console.error('[finishSession] failed:', err);
    setSaveError(true);
  }
  setPageState('results');
}
```
Reading equivalent: call `saveReadingResult(sessionId, { correctItems, totalItems })` first, then `completeSession(sessionId)` without a blob.

**`gameBg` gradient on root div** (line 591):
```typescript
<div className="h-screen flex flex-col overflow-hidden" style={{ background: gradients.gameBgAlt, minWidth: 1024 }}>
```
Reading game page uses `gradients.gameBg` on root, `minWidth: 1024` (laptop/PC only per Phase 4 D-01).

**Progress indicator pattern** (lines 594–605):
```typescript
<div className="flex items-center gap-3">
  {items.map((item, i) => (
    <div key={i} className="h-2 w-8 rounded-full transition-all"
      style={{
        background: item.state === 'done' ? '#ffffff80' : i === currentIndex ? '#A78BFA' : '#ffffff20',
      }} />
  ))}
</div>
<div className="text-white/70 text-sm font-semibold">
  {currentIndex + 1} / {items.length}
</div>
```
Reading game progress bar: one pip per activity, same color logic.

**Shake animation** — no existing analog, use Tailwind CSS custom keyframe or inline style:
```typescript
// Shake state: add CSS class that triggers keyframe
// Define in globals.css or as inline style animation
// @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
```

---

## Shared Patterns

### Authentication / Guard
**Source:** `backend/src/game/game.controller.ts` line 13; `frontend/app/game/session/[id]/page.tsx` line 589
```typescript
// Backend: class-level guard (applies to all routes)
@UseGuards(AuthGuard)
@Controller('game')
export class GameController { ... }

// Frontend: wrap every render branch
<AuthGate requiredRole="STUDENT">{() => ( ... )}</AuthGate>
// Teacher pages use requiredRole="TEACHER" or no explicit role (teacher layout handles it)
```
**Apply to:** All new controller endpoints (auto-covered by class-level guard); all new student page branches.

### Error Handling (Frontend)
**Source:** `frontend/app/teacher/homework/page.tsx` lines 83–87, 133–136
```typescript
try {
  // async operation
} catch (err: unknown) {
  setError(err instanceof Error ? err.message : 'Fallback message');
} finally {
  setLoading(false);
}
```
**Apply to:** All async handlers in `frontend/app/teacher/homework/create/reading/page.tsx` and `frontend/app/game/reading/[id]/page.tsx`.

### Error Display (Frontend)
**Source:** `frontend/app/teacher/homework/page.tsx` line 385
```typescript
{error && (
  <div className="text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-4">
    {error}
  </div>
)}
```
**Apply to:** Teacher creation page and student game page error states.

### Game Background (Student Pages)
**Source:** `frontend/app/game/session/[id]/page.tsx` line 591; `frontend/lib/colors.ts` lines 19–20
```typescript
style={{ background: gradients.gameBg, minWidth: 1024 }}
// or
style={{ background: gradients.gameBgAlt, minWidth: 1024 }}
```
**Apply to:** `frontend/app/game/reading/[id]/page.tsx` root div.

### Score Color
**Source:** `frontend/lib/colors.ts` lines 44–48
```typescript
export function scoreHexColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 50) return colors.accent;
  return colors.highlight;
}
```
**Apply to:** Result screen in `frontend/app/game/reading/[id]/page.tsx`.

### Repository Method Injection
**Source:** `backend/src/game/game.repository.ts` lines 24–26
```typescript
@Injectable()
export class GameRepository {
  constructor(private readonly prisma: PrismaService) {}
```
**Apply to:** All new repository methods are added to existing `GameRepository` and `HomeworkRepository` classes — no new injectable classes needed.

### Service Guard Sequence
**Source:** `backend/src/game/game.service.ts` lines 36–41
```typescript
const session = await this.repo.getSession(sessionId);
if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
if (session.completedAt) throw new BadRequestException('Session already completed');
const hw = session.assignment.homework;
if (hw.type !== 'SPEAKING') throw new BadRequestException('...');
```
**Apply to:** New `saveReadingResult` service method — same guard order, change type check to `'READING'`.

### Card Gradient Cycling
**Source:** `frontend/app/teacher/homework/page.tsx` lines 602–603; `frontend/lib/colors.ts` lines 35–43
```typescript
const g = cardGradients[i % cardGradients.length];
// used as: style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }}
```
**Apply to:** Activity card list on teacher creation page (visual variety per card index).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `@dnd-kit/core` + `@dnd-kit/sortable` usage | utility | event-driven | No drag-and-drop exists anywhere in the codebase — pattern from RESEARCH.md Pattern 2 only |
| Matching game grid interaction state | component | event-driven | No click-to-pair matching UI exists — client state pattern from RESEARCH.md Pattern 5 |
| Fill-blank one-at-a-time interaction | component | event-driven | No fill-blank UI exists — new pattern; model after phonics item-by-item progression in `session/[id]/page.tsx` |

---

## Metadata

**Analog search scope:** `backend/src/`, `frontend/app/`, `frontend/lib/`
**Files scanned:** 12 source files read directly
**Pattern extraction date:** 2026-05-15
