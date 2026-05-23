# Phase 8: Vocabulary by Image Exercise — Context

**Gathered:** 2026-05-23
**Status:** Ready for planning
**Source:** STATEGY.MD Exercise 4 — Vocabulary by Image

<domain>
## Phase Boundary

New homework type: `VOCABULARY`. Teacher uploads images + assigns word labels. Student sees image, records the word, receives per-phoneme feedback. This phase reuses the existing BFA phonics pipeline (`/analyze` endpoint) and `PhonemeChips` component end-to-end — delta is schema + new homework type routing + new UI pages.

Depends on: Phase 5 (BFA analyze pipeline), Phase 6 (admin portal for teacher account context), Phase 7 (audio quality gates — student sees error messages, not score 0).

Does NOT touch: speaking homework, reading homework, phonics game (existing), admin portal.

</domain>

<decisions>
## Implementation Decisions

### D-01: New HomeworkType enum variant
Add `VOCABULARY` to the `HomeworkType` enum in `prisma/schema.prisma`. Pattern mirrors `PHONICS` — array of items, each item has a word + image.

### D-02: VocabItem model
New Prisma model `VocabItem`:
```
model VocabItem {
  id         Int      @id @default(autoincrement())
  homeworkId Int
  homework   Homework @relation(fields: [homeworkId], references: [id], onDelete: Cascade)
  imageUrl   String
  word       String
  phonemes   String?  // JSON array — pre-computed via espeak, same pattern as Word.phonemes
  order      Int      @default(0)
}
```
No separate `Word` model entry needed — vocab words are homework-specific labels, not the global phonics word bank.

### D-03: Scoring — reuse BFA /analyze
Student records word → call `bfa.analyze(audio, mimeType, word, phonemes)` — identical to phonics game. Store result in `PhonicsItemResult` reusing existing model (word field matches vocab item word).
Alternative considered: separate `VocabItemResult` model → rejected to avoid schema duplication. PhonicsItemResult is generic enough.

### D-04: PhonicsItemResult reuse
`PhonicsItemResult` stores `{ sessionId, word, score, bfa (JSON) }`. For VOCABULARY sessions, `word` = vocab item word, `bfa` = phoneme feedback. Teacher results page distinguishes by `HomeworkSession.homework.type`.

### D-05: Image serving
Reuse `StorageService` + MinIO pattern from reading homework image upload. Path: `vocab/{homeworkId}/{itemIndex}.{ext}`.

### D-06: Student game flow
Same pattern as phonics game: item-by-item, one recording per item, phoneme chips on result, next item button. Show image prominently (full-width), word label hidden until after recording (avoids reading instead of speaking from memory). Option: show word label below image as hint — decision deferred to UI spec.

### D-07: Teacher creation flow
Extend existing TypePickerModal with VOCABULARY option. Teacher creation page: image upload grid (up to 10 items), word label input per item, drag-to-reorder (reuse @dnd-kit from reading homework). Same MinIO upload pattern.

### D-08: Phonetically close confusions (VOCAB-04)
This is already handled by existing SIMILAR_PAIRS in bfa-service. "cat" vs "cap": /t/ → /p/ is in similar pairs (`frozenset(["d", "t"])` — need to check if `t/p` is there or add it). The PhonemeChips component already renders `similar` as yellow. No new logic needed — just verify similar pairs cover common vocab confusions.

### D-09: Teacher results page
Reuse existing session detail page (`/teacher/homework/[id]/session/[sessionId]`) — already handles PhonicsItemResult rows. Add image thumbnail next to word in VOCABULARY result view. Minimal delta.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `backend/prisma/schema.prisma` — Current HomeworkType enum + PhonicsItemResult model
- `backend/src/game/game.service.ts` — `savePhonicsResult` handler — VOCABULARY branch mirrors this
- `backend/src/bfa/bfa.service.ts` — `analyze()` call — unchanged, reused as-is
- `frontend/app/game/session/[id]/_components/PhonemeChips.tsx` — Reuse directly
- `frontend/app/game/session/[id]/page.tsx` — Reference for phonics game flow pattern
- `frontend/app/teacher/homework/[id]/` — Teacher creation + results pages to extend
- `.planning/phases/02-reading-homework/` — Image upload pattern (MinIO + StorageService)
- `.planning/phases/05-bfa-quality-performance/05-CONTEXT.md` — BFA pipeline decisions
- `STATEGY.MD` Exercise 4 — Requirements source

</canonical_refs>

<specifics>
## Schema Delta

```prisma
enum HomeworkType {
  PHONICS
  SPEAKING
  READING
  VOCABULARY  // NEW
  // LISTEN added in Phase 9
}

model VocabItem {
  id         Int      @id @default(autoincrement())
  homeworkId Int
  homework   Homework @relation("VocabItems", fields: [homeworkId], references: [id], onDelete: Cascade)
  imageUrl   String
  word       String
  phonemes   String?  // JSON array of simplified phoneme symbols
  order      Int      @default(0)
  createdAt  DateTime @default(now())

  @@index([homeworkId])
}

model Homework {
  // ... existing fields ...
  vocabItems VocabItem[] @relation("VocabItems")  // NEW
}
```

## Game Service Branch

```typescript
// game.service.ts — new VOCABULARY branch in completeSession
case 'VOCABULARY': {
  const vocabItems = await this.prisma.vocabItem.findMany({
    where: { homeworkId: homework.id },
    orderBy: { order: 'asc' },
  });
  // items submitted as PhonicsItemResult[] — same shape as PHONICS
  break;
}
```

## Image Display in Student Game

Image shown full-width above record button. Word label shown as small hint below image (teacher can disable in future — deferred). After recording + scoring: show word label + phoneme chips.

</specifics>

<deferred>
## Deferred Ideas

- "Hide word" mode (test from image only, no label hint) — future v2 option
- Multiple valid words per image (e.g., "cat" / "kitten") — out of scope
- TTS playback of correct pronunciation on result screen — post-v2
- CEFR difficulty tagging per vocab item — post-v2

</deferred>

---

*Phase: 08-vocabulary-image*
*Context gathered: 2026-05-23 from STATEGY.MD + existing codebase patterns*
