---
phase: 08-vocabulary-image
plan: "01"
subsystem: backend/database
tags: [prisma, schema, vocabulary, database]
dependency_graph:
  requires: []
  provides: [vocab_items table, VOCABULARY HomeworkType, PhonicsItemResult.vocabItemId FK]
  affects: [backend/prisma/schema.prisma, Prisma generated client]
tech_stack:
  added: []
  patterns: [Prisma schema extension, nullable FK for polymorphic result model]
key_files:
  created: []
  modified:
    - backend/prisma/schema.prisma
decisions:
  - "@@unique([sessionId, wordId]) removed — uniqueness enforced at application layer via upsert-by-find in 08-02 (both savePhonicsResult and saveVocabResult)"
  - "VocabItem uses named relation 'VocabItems' on Homework to avoid ambiguous relation errors"
  - "PhonicsItemResult reused for vocab scores per D-04 — no separate VocabItemResult model"
  - "Docker postgres container started to unblock Task 2 (was paused per STATE.md 2026-05-19 note)"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-06-02"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 1
---

# Phase 8 Plan 01: Vocabulary Database Schema Summary

Prisma schema extended with VOCABULARY HomeworkType, VocabItem model, and nullable vocabItemId FK on PhonicsItemResult; database synced and client regenerated.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add VOCABULARY enum + VocabItem model + extend PhonicsItemResult | 9f647c8 | backend/prisma/schema.prisma |
| 2 | Push schema to database and regenerate Prisma client | 88207eb | (runtime op — no source files) |

## What Was Built

### Schema Changes (`backend/prisma/schema.prisma`)

**1. HomeworkType enum extended:**
```prisma
enum HomeworkType {
  PHONICS
  SPEAKING
  READING
  VOCABULARY  // NEW
}
```

**2. VocabItem model added:**
```prisma
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
```

**3. Homework model extended:**
```prisma
vocabItems VocabItem[] @relation("VocabItems")  // NEW back-relation
```

**4. PhonicsItemResult extended:**
- `wordId Int` → `wordId Int?` (nullable — vocab rows have no HomeworkWord)
- `word HomeworkWord` → `word HomeworkWord?` (relation made optional)
- `vocabItemId Int?` added
- `vocabItem VocabItem?` relation added (onDelete: Cascade)
- `@@unique([sessionId, wordId])` REMOVED (see Uniqueness Strategy below)

### Database Sync

- `npx prisma db push` completed — `vocab_items` table created, `phonics_item_results` columns altered
- `npx prisma generate` completed — Prisma client regenerated with `prisma.vocabItem` accessor
- Verified: `p.vocabItem.findMany({take:1})` resolves against live DB

## Uniqueness Strategy (CRITICAL — read before implementing 08-02)

The `@@unique([sessionId, wordId])` constraint was **dropped** from `PhonicsItemResult` because:
- `wordId` is now nullable — PostgreSQL treats NULL as distinct in unique constraints, so `(sessionId, NULL)` would allow duplicate vocab rows for the same session
- A session can now key on either `wordId` (phonics) OR `vocabItemId` (vocab) — a single composite unique cannot express both cases cleanly

**Application-layer enforcement required in 08-02:**

Both handlers must use upsert-by-find (find existing row, update if found, create if not):

```typescript
// Pattern for BOTH savePhonicsResult AND saveVocabResult in 08-02:
const existing = await prisma.phonicsItemResult.findFirst({
  where: { sessionId, wordId },  // or { sessionId, vocabItemId }
});
if (existing) {
  return prisma.phonicsItemResult.update({ where: { id: existing.id }, data: { ... } });
} else {
  return prisma.phonicsItemResult.create({ data: { ... } });
}
```

**Warning for 08-02:** The existing `savePhonicsResult` in `game.service.ts` may use `upsert` with `where: { sessionId_wordId: ... }` (the named unique key that was just dropped). This WILL throw at runtime. 08-02 Task 2 MUST migrate `savePhonicsResult` off the dropped named unique key and implement the find-then-update pattern.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Operational Notes

**Docker DB not running (expected per STATE.md):**
- STATE.md noted (2026-05-19): "DB push deferred (Docker Desktop paused — run npx prisma db push + db seed when unpaused)"
- Resolution: Started postgres container via `docker compose up -d postgres` before Task 2
- Container became healthy within 10 seconds; db push completed in 612ms
- This is per-plan guidance ("If the database is unreachable... surface the failure rather than skipping"), resolved by starting the container rather than skipping.

## Known Stubs

None — this plan is pure schema/database, no UI or application stubs.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: destructive-migration | backend/prisma/schema.prisma | `@@unique([sessionId, wordId])` index dropped from phonics_item_results — existing `savePhonicsResult` upsert will break at runtime until 08-02 migrates it to application-layer upsert |

## Self-Check: PASSED

- `backend/prisma/schema.prisma` modified: confirmed (contains `model VocabItem`, `VOCABULARY`, `vocabItemId Int?`, `wordId Int?`)
- Commit 9f647c8 exists: `feat(08-01): add VOCABULARY enum + VocabItem model + extend PhonicsItemResult`
- Commit 88207eb exists: `chore(08-01): push schema to DB and regenerate Prisma client`
- `npx prisma validate` passed (schema syntactically valid)
- `p.vocabItem.findMany({take:1})` resolved: "vocabItem queryable"
