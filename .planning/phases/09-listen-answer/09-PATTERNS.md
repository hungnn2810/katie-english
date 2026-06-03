# Phase 09: Listen & Answer — Pattern Map

**Mapped:** 2026-06-03
**Files analyzed:** 6 new/modified files
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/prisma/schema.prisma` | schema/config | CRUD | `backend/prisma/schema.prisma` (VocabItem block) | exact — add enum value + two models |
| `backend/src/homework/homework.service.ts` | service | CRUD | same file (vocab methods, lines 121-169) | exact — add LISTEN section below vocab |
| `backend/src/homework/homework.repository.ts` | repository | CRUD | same file (createVocabHomework block, lines 296-352) | exact |
| `backend/src/game/game.service.ts` | service | request-response | same file (saveVocabResult + completeSession VOCABULARY branch, lines 311-424) | exact |
| `frontend/app/teacher/homework/_components/ListenCreationPage.tsx` | component | request-response | `frontend/app/teacher/homework/_components/VocabCreationPage.tsx` | exact structural mirror |
| `frontend/app/game/listen/[id]/page.tsx` | page/component | request-response + file-I/O | `frontend/app/game/vocab/[id]/page.tsx` | exact structural mirror |

---

## Pattern Assignments

### 1. `backend/prisma/schema.prisma` — add LISTEN enum value + two models

**Analog block:** `backend/prisma/schema.prisma` lines 16-21 (HomeworkType enum) + lines 230-243 (VocabItem model)

**Enum extension** (lines 16-21 — add `LISTEN` after `VOCABULARY`):
```prisma
enum HomeworkType {
  PHONICS
  SPEAKING
  READING
  VOCABULARY
  LISTEN          // ← ADD
}
```

**ListenItem model** — copy VocabItem pattern (lines 230-243), replace image with audioUrl and add keywords field:
```prisma
// VocabItem (lines 230-243) — reference shape:
model VocabItem {
  id             Int                 @id @default(autoincrement())
  homeworkId     Int
  homework       Homework            @relation("VocabItems", fields: [homeworkId], references: [id], onDelete: Cascade)
  imageUrl       String
  word           String
  phonemes       String?
  order          Int                 @default(0)
  createdAt      DateTime            @default(now())
  phonicsResults PhonicsItemResult[]

  @@index([homeworkId])
  @@map("vocab_items")
}

// ListenItem — adapt to:
model ListenItem {
  id          Int                @id @default(autoincrement())
  homeworkId  Int
  homework    Homework           @relation("ListenItems", fields: [homeworkId], references: [id], onDelete: Cascade)
  audioUrl    String
  keywords    String             // comma-separated or JSON array of expected answer keywords
  order       Int                @default(0)
  createdAt   DateTime           @default(now())
  results     ListenItemResult[]

  @@index([homeworkId])
  @@map("listen_items")
}

model ListenItemResult {
  id              Int             @id @default(autoincrement())
  sessionId       Int
  listenItemId    Int
  transcribedText String?
  pronunciationScore Float        // from BFA /analyze (Azure PA)
  semanticScore   Float           // from bfa-service /score-semantic
  compositeScore  Float           // weighted average stored for display
  session         HomeworkSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  listenItem      ListenItem      @relation(fields: [listenItemId], references: [id], onDelete: Cascade)

  @@map("listen_item_results")
}
```

**Homework model — add relation** (lines 121-136, after `vocabItems` relation):
```prisma
// Existing (line 131):
  vocabItems         VocabItem[]          @relation("VocabItems")
// Add:
  listenItems        ListenItem[]         @relation("ListenItems")
```

**HomeworkSession model — add relation** (lines 187-201, after `readingResult`):
```prisma
// Add:
  listenResults      ListenItemResult[]
```

---

### 2. `backend/src/homework/homework.service.ts` — add LISTEN CRUD methods

**Analog:** same file, lines 121-169 (vocab methods block)

**Imports pattern** (line 3 — extend existing DTO import):
```typescript
// Existing:
import { CreateHomeworkDto, UpdateHomeworkDto, CreateAssignmentDto, UpdateAssignmentDto, CreateReadingHomeworkDto, UpdateReadingHomeworkDto, CreateVocabHomeworkDto, UpdateVocabHomeworkDto } from './homework.dto';
// Add CreateListenHomeworkDto, UpdateListenHomeworkDto to the import
```

**LISTEN service block** — copy vocab pattern (lines 121-169), adapt:
```typescript
// ── Plan 09 listen service methods ─────────────────────────────────────────

async findListenById(id: number) {
  const hw = await this.repo.findListenById(id);
  if (!hw) throw new NotFoundException(`Listen homework ${id} not found`);
  return hw;
}

createListenHomework(dto: CreateListenHomeworkDto) {
  if (!dto.name || !dto.name.trim()) {
    throw new BadRequestException('Name is required');
  }
  if (!Array.isArray(dto.items) || dto.items.length === 0) {
    throw new BadRequestException('At least one item is required');
  }
  if (dto.items.length > 10) {
    throw new BadRequestException('Too many items (max 10)');
  }
  for (const item of dto.items) {
    if (!item.audioUrl?.trim()) {
      throw new BadRequestException('Each item must have a non-empty audioUrl');
    }
    if (!item.keywords?.trim()) {
      throw new BadRequestException('Each item must have keywords');
    }
  }
  return this.repo.createListenHomework(dto);
}

async updateListenHomework(id: number, dto: UpdateListenHomeworkDto) {
  await this.findListenById(id);
  if (dto.items !== undefined) {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }
    if (dto.items.length > 10) {
      throw new BadRequestException('Too many items (max 10)');
    }
    for (const item of dto.items) {
      if (!item.audioUrl?.trim()) {
        throw new BadRequestException('Each item must have a non-empty audioUrl');
      }
      if (!item.keywords?.trim()) {
        throw new BadRequestException('Each item must have keywords');
      }
    }
  }
  return this.repo.updateListenHomework(id, dto);
}
```

---

### 3. `backend/src/homework/homework.repository.ts` — LISTEN CRUD

**Analog:** `backend/src/homework/homework.repository.ts` lines 296-352 (vocab block)

**findListenById** — copy findVocabById (lines 298-306):
```typescript
findListenById(id: number) {
  return this.prisma.homework.findUnique({
    where: { id },
    include: {
      ...listenItemsInclude,          // define near top of file like vocabItemsInclude
      assignments: { include: assignmentInclude },
    },
  });
}
```

**createListenHomework** — copy createVocabHomework (lines 308-324):
```typescript
createListenHomework(dto: CreateListenHomeworkDto) {
  return this.prisma.homework.create({
    data: {
      type: 'LISTEN',
      name: dto.name,
      listenItems: {
        create: dto.items.map((item, idx) => ({
          audioUrl: item.audioUrl,
          keywords: item.keywords,
          order: idx,
        })),
      },
    },
    include: { ...listenItemsInclude, assignments: { include: assignmentInclude } },
  });
}
```

**updateListenHomework** — copy updateVocabHomework (lines 326-351), swap vocabItem → listenItem:
```typescript
async updateListenHomework(id: number, dto: UpdateListenHomeworkDto) {
  return this.prisma.$transaction(async (tx) => {
    if (dto.items !== undefined) {
      await tx.listenItem.deleteMany({ where: { homeworkId: id } });
    }
    return tx.homework.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.items !== undefined
          ? {
              listenItems: {
                create: dto.items.map((item, idx) => ({
                  audioUrl: item.audioUrl,
                  keywords: item.keywords,
                  order: idx,
                })),
              },
            }
          : {}),
      },
      include: { ...listenItemsInclude, assignments: { include: assignmentInclude } },
    });
  });
}
```

**saveListenResult** — copy saveVocabResult from game.repository.ts (lines 120-135), store three score columns:
```typescript
async saveListenResult(
  sessionId: number,
  listenItemId: number,
  transcribedText: string,
  pronunciationScore: number,
  semanticScore: number,
  compositeScore: number,
) {
  const existing = await this.prisma.listenItemResult.findFirst({
    where: { sessionId, listenItemId },
  });
  if (existing) {
    return this.prisma.listenItemResult.update({
      where: { id: existing.id },
      data: { transcribedText, pronunciationScore, semanticScore, compositeScore },
    });
  }
  return this.prisma.listenItemResult.create({
    data: { sessionId, listenItemId, transcribedText, pronunciationScore, semanticScore, compositeScore },
  });
}
```

---

### 4. `backend/src/game/game.service.ts` — saveListenResult + completeSession LISTEN branch

**Analog:** `backend/src/game/game.service.ts`

**saveListenResult method** — copy saveVocabResult shape (lines 311-370), call both BFA analyze (pronunciation) and bfa-service /score-semantic (semantic), then compute composite:
```typescript
async saveListenResult(
  sessionId: number,
  dto: SaveListenResultDto,        // { listenItemId, transcribedText? }
  requestingStudentId: number,
  audioBuffer?: Buffer,
  mimeType?: string,
) {
  const session = await this.repo.getSession(sessionId);
  if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
  if (session.studentId !== requestingStudentId) {
    throw new ForbiddenException('Not your session');
  }
  if (session.completedAt) throw new BadRequestException('Session already completed');
  const hw = session.assignment.homework;
  if (hw.type !== 'LISTEN') throw new BadRequestException('Homework is not a LISTEN type');

  const listenItems = (hw as any).listenItems as { id: number; keywords: string }[] ?? [];
  const listenItem = listenItems.find((li) => li.id === dto.listenItemId);
  if (!listenItem) throw new BadRequestException(`ListenItem ${dto.listenItemId} not found`);

  let transcribedText = dto.transcribedText ?? '';
  let pronunciationScore = 0;
  let semanticScore = 0;

  if (audioBuffer && audioBuffer.length > 0) {
    // 1. Transcribe + pronunciation score via Azure PA (reuse bfa.analyze pattern)
    try {
      const bfaResult = await this.bfa.analyze(audioBuffer, mimeType ?? 'audio/webm', transcribedText || listenItem.keywords, []);
      transcribedText = bfaResult.transcription?.text ?? transcribedText;
      pronunciationScore = bfaResult.success ? bfaResult.score : 0;
      this.logger.log(`[session=${sessionId}] listen pronScore=${pronunciationScore}`);
    } catch (err) {
      this.logger.warn(`[session=${sessionId}] BFA analyze error: ${(err as Error).message}`);
    }

    // 2. Semantic score via bfa-service /score-semantic
    try {
      const sem = await this.bfa.scoreSemantic(transcribedText, listenItem.keywords);
      semanticScore = sem.score;
      this.logger.log(`[session=${sessionId}] listen semanticScore=${semanticScore}`);
    } catch (err) {
      this.logger.warn(`[session=${sessionId}] scoreSemantic error: ${(err as Error).message}`);
    }
  }

  // Composite: 50% pronunciation + 50% semantic (adjust weights as needed)
  const compositeScore = Math.round((pronunciationScore + semanticScore) / 2);
  this.logger.log(`[session=${sessionId}] listen composite=${compositeScore}`);

  return this.repo.saveListenResult(sessionId, dto.listenItemId, transcribedText, pronunciationScore, semanticScore, compositeScore);
}
```

**completeSession LISTEN branch** — copy VOCABULARY branch (lines 409-415), swap vocabItem filter → listenItemResult:
```typescript
// In completeSession (lines 396-424), after the VOCABULARY branch:
} else if (hw.type === 'LISTEN') {
  const listenResults = (session as any).listenResults ?? [];
  const count = listenResults.length;
  const scoreSum = listenResults.reduce((s: number, r: { compositeScore: number }) => s + r.compositeScore, 0);
  avgScore = count > 0 ? scoreSum / count : 0;
}
```

---

### 5. `frontend/app/teacher/homework/_components/ListenCreationPage.tsx` — new file

**Analog:** `frontend/app/teacher/homework/_components/VocabCreationPage.tsx` (full file, 481 lines)

**Imports pattern** (lines 1-33 of VocabCreationPage.tsx) — copy exactly, change `createVocabHomework` + `uploadSpeakingImage` to `createListenHomework` + audio-upload helper; swap image icons for audio icons:
```typescript
'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  createListenHomework,
  uploadAudio,                        // new helper to add to admin-api.ts
} from '@/lib/admin-api';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import { GripVertical, Mic, Plus, X } from 'lucide-react';   // Mic replaces ImageIcon
```

**ListenItemDraft type** — replace VocabItemDraft (lines 36-41):
```typescript
type ListenItemDraft = {
  clientId: string;
  audioUrl: string;         // replaces imageUrl
  keywords: string;         // replaces word
};
```

**SortableListenItemCard** — copy SortableVocabItemCard (lines 44-232), adaptations:
- Replace 160x160 image upload zone with audio upload zone (file input `accept="audio/*"`)
- Replace `<img>` preview with `<audio controls src={item.audioUrl} />` when audioUrl is set
- Replace `ImageIcon` with `Mic` icon
- Replace `onWordChange` prop with `onKeywordsChange`
- Replace Word TextField label/placeholder with "Expected keywords" / "e.g. big, red, apple"

**VocabCreationPage → ListenCreationPage** — copy page component (lines 234-480), adaptations:
- State: `items` typed as `ListenItemDraft[]`
- `addItem`: `{ clientId: crypto.randomUUID(), audioUrl: '', keywords: '' }`
- `updateWord` → `updateKeywords`, targeting `keywords` field
- `handleImageUpload` → `handleAudioUpload` calling `uploadAudio(file)`
- `validate()` (lines 306-314): check `audioUrl` and `keywords` instead of `imageUrl` and `word`
- `handleSave()` (lines 316-335): call `createListenHomework({ name, items: [...] })`
- Page heading color: use `'#60A5FA'` (blue) instead of `'#FFB26B'` (orange) to distinguish LISTEN type
- Section label: `'Items (up to 10)'` stays the same
- Save button label: `'Save Listen Homework'`

**DnD pattern** (lines 246-303) — copy unchanged; `SortableContext` items keyed on `clientId`.

---

### 6. `frontend/app/game/listen/[id]/page.tsx` — new file

**Analog:** `frontend/app/game/vocab/[id]/page.tsx` (full file, 593 lines)

**Imports pattern** (lines 1-14 of vocab page) — copy, change `saveVocabResult` to `saveListenResult`, remove `VocabItem`/`PhonemeOp` and `PhonemeChips` (not needed for listen):
```typescript
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { authHeaders } from '@/lib/auth';
import { saveListenResult, completeSession, GameSession, ListenItem } from '@/lib/admin-api';
import { gradients, scoreHexColor } from '@/lib/colors';
import { Mic, CheckCircle2, PartyPopper, Volume2 } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
```

**PageState / RecordState types** (lines 18-19) — copy unchanged:
```typescript
type PageState = 'loading' | 'mic-check' | 'mic-denied' | 'ready' | 'playing' | 'uploading' | 'results' | 'error';
type RecordState = 'idle' | 'recording' | 'recorded' | 'scoring';
```

**ListenGameItem interface** — replace VocabGameItem (lines 21-30):
```typescript
interface ListenGameItem {
  listenItemId: number;
  audioUrl: string;          // the prompt audio student listens to
  keywords: string;          // expected answer keywords (display-only in results)
  compositeScore: number;
  semanticScore: number;
  pronunciationScore: number;
  scoreError: string | null;
  recordState: RecordState;
}
```

**buildItems** (lines 51-66) — copy, adapt to listenItems:
```typescript
function buildItems(session: GameSession): ListenGameItem[] {
  const hw = session.assignment?.homework;
  const listenItems: ListenItem[] =
    (session.listenItems ?? hw?.listenItems ?? []).slice().sort((a, b) => a.order - b.order);
  return listenItems.map((li) => ({
    listenItemId: li.id,
    audioUrl: li.audioUrl,
    keywords: li.keywords,
    compositeScore: 0,
    semanticScore: 0,
    pronunciationScore: 0,
    scoreError: null,
    recordState: 'idle',
  }));
}
```

**requestMic / startRecording / stopRecording** (lines 102-144) — copy unchanged verbatim; mic acquisition and MediaRecorder setup are identical.

**handleStopAndScore** (lines 146-171) — copy, replace `saveVocabResult` call:
```typescript
const result = await saveListenResult(sessionId, item.listenItemId, blob ?? undefined);
const scoreError = result.error ?? null;
const compositeScore = scoreError ? 0 : result.compositeScore;
const semanticScore = result.semanticScore ?? 0;
const pronunciationScore = result.pronunciationScore ?? 0;
setItems((prev) => prev.map((it, i) => i === capturedIndex ? {
  ...it,
  compositeScore,
  semanticScore,
  pronunciationScore,
  scoreError,
  recordState: 'recorded',
} : it));
```

**handleNext / handleReRecord / cleanup useEffect** (lines 173-213) — copy unchanged.

**Loading / mic-check / mic-denied / error / uploading states** (lines 215-295) — copy unchanged; UI is identical.

**Playing state card** — replace image card (lines 430-445) with audio player card:
```typescript
{/* Prompt audio — student listens before recording */}
<Box sx={{ width: 280, borderRadius: '16px', border: '4px solid rgba(255,255,255,0.2)', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
  <Volume2 size={32} color="rgba(255,255,255,0.7)" />
  <audio
    controls
    src={current.audioUrl}
    style={{ width: '100%', borderRadius: 8 }}
  />
</Box>
```

**Results screen** (lines 297-373) — copy, adapt item rows: replace `<img>` thumbnail with `<Volume2>` icon; show `compositeScore` as primary number; add small secondary row showing `Semantic: {semanticScore}% · Pronunciation: {pronunciationScore}%`; remove PhonemeChips (not rendered for LISTEN).

**Record button states** (lines 461-541) — copy idle / recording / scoring / recorded states verbatim; identical UX.

**Action buttons** (lines 557-585) — copy. Replace BFA error messages dict with generic:
```typescript
const SCORE_ERROR_MESSAGES: Record<string, string> = {
  audio_too_short:     'Bấm lâu hơn nhé — ghi âm quá ngắn',
  speech_not_detected: 'Không nghe rõ — nói to hơn nhé',
  wrong_language:      'Please speak in English',
};
```

---

## Shared Patterns

### Audio recording (MediaRecorder)
**Source:** `frontend/app/game/vocab/[id]/page.tsx` lines 40-43 (`pickAudioMimeType`), 113-144 (`startRecording`, `stopRecording`)
**Apply to:** `frontend/app/game/listen/[id]/page.tsx`
```typescript
function pickAudioMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}
```
Copy `startRecording` / `stopRecording` verbatim — identical for LISTEN.

### AuthGate wrapper
**Source:** `frontend/app/game/vocab/[id]/page.tsx` lines 218, 303, 383
**Apply to:** `frontend/app/game/listen/[id]/page.tsx`
```typescript
<AuthGate requiredRole="STUDENT">
  {() => (
    // page content
  )}
</AuthGate>
```
Every render path wraps in `<AuthGate requiredRole="STUDENT">`.

### Session guard pattern (service layer)
**Source:** `backend/src/game/game.service.ts` lines 319-325
**Apply to:** `saveListenResult` method in game.service.ts
```typescript
const session = await this.repo.getSession(sessionId);
if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
if (session.studentId !== requestingStudentId) {
  throw new ForbiddenException("Not your session");
}
if (session.completedAt) throw new BadRequestException('Session already completed');
```

### Logger pattern
**Source:** `backend/src/game/game.service.ts` lines 14, 99-103
**Apply to:** all new service methods
```typescript
private readonly logger = new Logger(GameService.name);
// Usage:
this.logger.log(`[session=${sessionId}] listen composite=${compositeScore}`);
this.logger.warn(`[session=${sessionId}] scoreSemantic error: ${(err as Error).message}`);
```

### DnD sortable list
**Source:** `frontend/app/teacher/homework/_components/VocabCreationPage.tsx` lines 8-23, 246-303, 396-421
**Apply to:** `ListenCreationPage.tsx`
Copy DndContext + SortableContext + useSortable block and `handleDragEnd` verbatim — keyed on `clientId`.

### Prisma upsert for per-item results
**Source:** `backend/src/game/game.repository.ts` lines 120-135 (`saveVocabResult`)
**Apply to:** `saveListenResult` in game.repository.ts
```typescript
const existing = await this.prisma.listenItemResult.findFirst({
  where: { sessionId, listenItemId },
});
if (existing) {
  return this.prisma.listenItemResult.update({ where: { id: existing.id }, data: { ... } });
}
return this.prisma.listenItemResult.create({ data: { ... } });
```

---

## New Infrastructure Required (no existing analog)

| Item | Role | Reason |
|---|---|---|
| `backend/src/bfa/bfa.service.ts` — `scoreSemantic` method | service | No semantic similarity call exists yet; add method that POSTs `{ hypothesis, reference }` to `http://bfa-service:8000/score-semantic` and returns `{ score: number }` |
| `bfa-service` `/score-semantic` endpoint | Python FastAPI endpoint | No Python bfa-service file exists in repo — must be created from scratch using sentence-transformers `paraphrase-MiniLM-L6-v2` model; warm up on startup |
| `frontend/lib/admin-api.ts` — `saveListenResult` function | API helper | Copy `saveVocabResult` (lines 346-362); POST to `/game/session/${sessionId}/listen-result`; response shape includes `compositeScore`, `semanticScore`, `pronunciationScore` |
| `frontend/lib/admin-api.ts` — `createListenHomework` function | API helper | Copy `createVocabHomework` (line 337-338); POST to `/homework/listen` |
| `frontend/lib/admin-api.ts` — `ListenItem` interface | type | Mirror `VocabItem` (lines 303-310): `{ id, homeworkId, audioUrl, keywords, order }` |
| `backend/src/game/game.controller.ts` + `homework.controller.ts` | controller routes | Add `/session/:id/listen-result` POST and `/homework/listen` POST/GET/PUT routes; copy existing vocab/phonics route handlers |

---

## Metadata

**Analog search scope:** `backend/prisma/`, `backend/src/homework/`, `backend/src/game/`, `backend/src/bfa/`, `frontend/app/teacher/homework/_components/`, `frontend/app/game/vocab/`, `frontend/lib/`
**Files scanned:** 10
**Pattern extraction date:** 2026-06-03
