---
phase: 08-vocabulary-image
plan: "02"
subsystem: backend/game+homework
tags: [nestjs, prisma, vocabulary, bfa, azure-pa, phoneme-scoring]
dependency_graph:
  requires: ["08-01"]
  provides:
    - POST/GET/PUT /homework/vocab endpoints
    - POST /game/session/:id/vocab-result endpoint
    - saveVocabResult in GameService + GameRepository
    - VOCABULARY completeSession branch
    - repaired savePhonicsResult (no sessionId_wordId)
    - mapPhonemeOps exported + unit-tested for VOCAB-04
  affects:
    - backend/src/homework/homework.dto.ts
    - backend/src/homework/homework.repository.ts
    - backend/src/homework/homework.service.ts
    - backend/src/homework/homework.controller.ts
    - backend/src/game/game.dto.ts
    - backend/src/game/game.repository.ts
    - backend/src/game/game.service.ts
    - backend/src/game/game.controller.ts
    - backend/src/bfa/bfa.service.ts
    - backend/src/bfa/bfa.service.spec.ts
tech_stack:
  added: []
  patterns:
    - Application-layer upsert (find-then-update-or-create) for PhonicsItemResult keyed by {sessionId, wordId} and {sessionId, vocabItemId}
    - Azure PA AccuracyScore band mapping for phoneme status (correct/similar/substituted/missing)
key_files:
  created:
    - backend/src/bfa/bfa.service.spec.ts
  modified:
    - backend/src/homework/homework.dto.ts
    - backend/src/homework/homework.repository.ts
    - backend/src/homework/homework.service.ts
    - backend/src/homework/homework.controller.ts
    - backend/src/game/game.dto.ts
    - backend/src/game/game.repository.ts
    - backend/src/game/game.service.ts
    - backend/src/game/game.controller.ts
    - backend/src/bfa/bfa.service.ts
decisions:
  - "savePhonicsResult migrated from upsert({where:{sessionId_wordId}}) to application-layer findFirst+update-or-create — dropped unique key from 08-01"
  - "saveVocabResult uses identical application-layer pattern keyed on {sessionId, vocabItemId}"
  - "VOCABULARY completeSession averages phonicsResults scores over vocabItems.length count"
  - "mapPhonemeOps exported from bfa.service.ts for pure-logic unit testing without network calls"
  - "D-08 frozenset premise obsolete — VOCAB-04 satisfied by Azure PA AccuracyScore band [50,80) not a phoneme-pair list"
  - "VocabItem cross-homework tampering prevented in saveVocabResult by checking item belongs to session homework (T-08-03)"
metrics:
  duration: "~30 minutes"
  completed_date: "2026-06-02"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 10
---

# Phase 8 Plan 02: Vocabulary Backend Slice Summary

Backend vertical slice for VOCABULARY homework: vocab CRUD endpoints, BFA-scored vocab result endpoint, repaired phonics upsert, and unit-tested VOCAB-04 similar-band proof.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Vocab homework CRUD (DTO + repository + service + controller) | 9eb9e20 | homework.dto.ts, homework.repository.ts, homework.service.ts, homework.controller.ts |
| 2 | Vocab scoring + repair savePhonicsResult + completeSession VOCABULARY branch | b095ab0 | game.dto.ts, game.repository.ts, game.service.ts, game.controller.ts |
| 3 | Verify phoneme-similar band backs VOCAB-04 | ecf693a | bfa.service.ts, bfa.service.spec.ts (new) |

## What Was Built

### Task 1: Vocab Homework CRUD

**homework.dto.ts** — added `VOCABULARY` to `HomeworkType` union plus three new DTOs:
```typescript
export type HomeworkType = 'PHONICS' | 'SPEAKING' | 'READING' | 'VOCABULARY';

export class CreateVocabItemDto { imageUrl: string; word: string; phonemes?: string[]; }
export class CreateVocabHomeworkDto { name: string; items: CreateVocabItemDto[]; }
export class UpdateVocabHomeworkDto { name?: string; items?: CreateVocabItemDto[]; }
```

**homework.repository.ts** — added `vocabItemsInclude` const and three methods:
- `findVocabById(id)` — includes vocabItems ordered by order asc + assignments
- `createVocabHomework(dto)` — creates Homework type VOCABULARY with nested vocabItems, maps phonemes via JSON.stringify
- `updateVocabHomework(id, dto)` — deleteMany vocabItems then recreate (mirrors updateReadingHomework)

**homework.service.ts** — added `findVocabById`, `createVocabHomework`, `updateVocabHomework` with validation:
- name non-empty
- items.length >= 1 (400: "At least one item is required")
- items.length <= 10 (400: "Too many items (max 10)")
- each item.word non-empty (400: "Each item must have a non-empty word")
- each item.imageUrl non-empty (400: "Each item must have a non-empty imageUrl")

**homework.controller.ts** — three routes declared BEFORE the generic `:id` routes:
```typescript
@Post('vocab')      createVocab(...)  // line 32
@Get('vocab/:id')   findVocab(...)    // line 33
@Put('vocab/:id')   updateVocab(...)  // line 34
// generic @Get(':id') appears at line 37
```

#### Request/Response Shape — POST /homework/vocab

Request body:
```json
{
  "name": "Animals",
  "items": [
    { "imageUrl": "https://…/cat.jpg", "word": "cat", "phonemes": ["k", "ae", "t"] },
    { "imageUrl": "https://…/dog.jpg", "word": "dog" }
  ]
}
```

Response (201):
```json
{
  "id": 42,
  "type": "VOCABULARY",
  "name": "Animals",
  "vocabItems": [
    { "id": 1, "homeworkId": 42, "imageUrl": "https://…/cat.jpg", "word": "cat", "phonemes": "[\"k\",\"ae\",\"t\"]", "order": 0 },
    { "id": 2, "homeworkId": 42, "imageUrl": "https://…/dog.jpg", "word": "dog", "phonemes": null, "order": 1 }
  ],
  "assignments": []
}
```

### Task 2: Vocab Scoring + savePhonicsResult Migration

**game.dto.ts** — added:
```typescript
export class SaveVocabResultDto { vocabItemId: number; transcribedText?: string; }
```

**game.repository.ts** — three changes:

1. `savePhonicsResult` — migrated from broken `upsert({where:{sessionId_wordId}})` to application-layer:
```typescript
const existing = await prisma.phonicsItemResult.findFirst({ where: { sessionId, wordId } });
if (existing) return prisma.phonicsItemResult.update({ where: { id: existing.id }, data: { transcribedText, score }, include: { word: true } });
return prisma.phonicsItemResult.create({ data: { sessionId, wordId, transcribedText, score }, include: { word: true } });
```

2. `saveVocabResult` — same application-layer pattern keyed on `{ sessionId, vocabItemId }`, returns row with `vocabItem` included.

3. `sessionInclude` extended — `homeworkInclude` now loads `vocabItems` (ordered by order asc); `phonicsResults` now includes `{ word: true, vocabItem: true }`.

**game.service.ts** — added `saveVocabResult`:
- Session lookup (404 if missing), completed guard (400), type guard `hw.type !== 'VOCABULARY'` (400)
- Cross-homework VocabItem ownership check: item must be in `session.assignment.homework.vocabItems` (T-08-03 mitigated)
- `JSON.parse(vocabItem.phonemes)` or `[]` as expectedPhonemes
- `bfa.analyze(audioBuffer, mimeType, vocabItem.word, expectedPhonemes)`
- `score = bfaResult.success ? bfaResult.score : 0`
- Persists via `repo.saveVocabResult`
- Returns `{ ...result, bfa: bfaResult }` (same shape as savePhonicsResult for frontend reuse)

Also added VOCABULARY branch in `completeSession`:
```typescript
} else if (hw.type === 'VOCABULARY') {
  const vocabItems = (hw as any).vocabItems ?? [];
  const count = vocabItems.length;
  const scoreSum = phonicsResults.reduce((s, r) => s + r.score, 0);
  avgScore = count > 0 ? scoreSum / count : 0;
}
```

**game.controller.ts** — added endpoint:
```typescript
@Post('session/:id/vocab-result')
@UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
saveVocabResult(@Param('id') id, @Body('vocabItemId') vocabItemId, @Body('transcribedText') t, @UploadedFile() audio?)
```

#### Request/Response Shape — POST /game/session/:id/vocab-result

Request: `multipart/form-data` with fields `vocabItemId` (number as string) + `transcribedText` (optional) + `audio` file (optional, max 10MB).

Response (200):
```json
{
  "id": 15,
  "sessionId": 7,
  "vocabItemId": 1,
  "transcribedText": "cat",
  "score": 87,
  "vocabItem": { "id": 1, "word": "cat", "imageUrl": "https://…/cat.jpg", "order": 0 },
  "bfa": {
    "success": true,
    "score": 87,
    "word": "cat",
    "transcription": { "text": "cat" },
    "feedback": [
      { "status": "correct", "expected": "k", "aligned": "k", "start": 0.05, "end": 0.15, "duration": 0.1 },
      { "status": "correct", "expected": "ae", "aligned": "ae", "start": 0.15, "end": 0.25, "duration": 0.1 },
      { "status": "similar", "expected": "t", "aligned": "t", "start": 0.25, "end": 0.35, "duration": 0.1 }
    ],
    "phonemes": [...]
  }
}
```

### Task 3: VOCAB-04 Similar Band Verification

**bfa.service.ts** — `mapPhonemeOps` exported for testability (no behavioral change).

**bfa.service.spec.ts** (new) — 11 pure-logic unit tests, no network calls:

| Test | AccuracyScore | Expected status |
|------|--------------|-----------------|
| cat→cap /p/ confusion | 65 ∈ [50, 80) | `'similar'` (yellow) |
| Exactly at threshold | 50 | `'similar'` |
| Just below correct | 79 | `'similar'` |
| Correct threshold | 80 | `'correct'` |
| Perfect | 100 | `'correct'` |
| Below similar | 49 | `'substituted'` (red) |
| Zero score | 0 | `'substituted'` |
| Omission error | any | `'missing'` |
| Timing fields | 85 | correct start/end/duration |
| Empty phonemes | — | empty array |
| Missing PronAssessment | — | `'substituted'` |

**VOCAB-04 conclusion:** D-08's `SIMILAR_PAIRS` frozenset premise is obsolete — the old Python bfa-service no longer exists. The Azure PA migration (Phases 05/07) produces `'similar'` purely from AccuracyScore ∈ `[PHONEME_SIMILAR_THRESHOLD, PHONEME_CORRECT_THRESHOLD)` = `[50, 80)` by default. No phoneme-pair list needed. To widen the yellow band for child vocab, set `AZURE_PHONEME_SIMILAR_THRESHOLD` env var (e.g. `AZURE_PHONEME_SIMILAR_THRESHOLD=40`).

## Deviations from Plan

None — plan executed exactly as written.

The one pre-existing issue discovered during verification (the broken `sessionId_wordId` upsert in `game.repository.ts`) was explicitly expected and planned in Task 2 of this plan. It was repaired as directed.

## Known Stubs

None — all implemented methods are fully wired. No placeholder data flows to any UI rendering.

## Threat Flags

No new threat surface beyond what the plan's threat model covers. All T-08-0x mitigations applied:
- T-08-03: VocabItem cross-homework ownership check implemented in `saveVocabResult`
- T-08-04: Completed-session guard in `saveVocabResult`; existing `AuthGuard` covers GameController
- T-08-05: FileInterceptor `limits.fileSize: 10MB` on vocab-result endpoint
- T-08-06: `/homework/vocab` routes sit behind existing `@UseGuards(AuthGuard)` on HomeworkController
- T-08-14: `savePhonicsResult` migrated; 66 existing game tests gate the change

## Self-Check: PASSED

Files confirmed to exist:
- `backend/src/homework/homework.dto.ts` — contains `VOCABULARY`, `CreateVocabHomeworkDto`
- `backend/src/homework/homework.repository.ts` — contains `createVocabHomework`, `vocabItemsInclude`
- `backend/src/homework/homework.service.ts` — contains `createVocabHomework` with validation
- `backend/src/homework/homework.controller.ts` — contains `@Post('vocab')` before `@Get(':id')`
- `backend/src/game/game.dto.ts` — contains `SaveVocabResultDto`
- `backend/src/game/game.repository.ts` — contains `saveVocabResult`, `findFirst` (2x), no `sessionId_wordId`
- `backend/src/game/game.service.ts` — contains `saveVocabResult`, `VOCABULARY` branch (2 occurrences)
- `backend/src/game/game.controller.ts` — contains `vocab-result` endpoint
- `backend/src/bfa/bfa.service.ts` — `mapPhonemeOps` exported
- `backend/src/bfa/bfa.service.spec.ts` — 11 tests, all passing

Commits confirmed:
- 9eb9e20: `feat(08-02): vocab homework CRUD — DTO + repository + service + controller`
- b095ab0: `feat(08-02): vocab scoring + repair savePhonicsResult upsert + completeSession VOCABULARY branch`
- ecf693a: `test(08-02): verify phoneme similar band backs VOCAB-04 (cat→cap yellow chip)`

Build: `npm run build` — PASSED (0 errors)
Tests: 77 tests passing (66 game.service.spec + 11 bfa.service.spec)
