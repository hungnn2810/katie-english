---
phase: 02-reading-homework
reviewed: 2026-06-23T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - backend/prisma/schema.prisma
  - backend/src/homework/homework.dto.ts
  - backend/src/homework/homework.repository.ts
  - backend/src/homework/homework.service.ts
  - backend/src/game/game.dto.ts
  - backend/src/game/game.repository.ts
  - backend/src/game/game.service.ts
  - backend/src/game/game.controller.ts
  - backend/src/game/game.service.spec.ts
  - frontend/lib/admin-api.ts
  - frontend/app/teacher/homework/page.tsx
  - frontend/app/teacher/homework/[id]/page.tsx
  - frontend/app/teacher/homework/create/reading/page.tsx
  - frontend/app/teacher/classes/page.tsx
  - frontend/app/teacher/homework/_components/ReadingCreationPage.tsx
findings:
  critical: 5
  warning: 8
  info: 4
  total: 17
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-23
**Depth:** standard
**Files Reviewed:** 15 (2 listed files not found on disk: `frontend/app/game/homework/page.tsx`, `frontend/app/game/reading/[id]/page.tsx` resolved to `frontend/app/student/reading/[id]/page.tsx`, `frontend/tailwind.config.js` absent)
**Status:** issues_found

## Summary

The reading homework implementation spans a backend NestJS/Prisma stack and a Next.js frontend. The new FILL_BLANK data model has a structural mismatch between how the creation path (segment-based) stores data vs. how the legacy creation path (item-based) stores data — they share the same Prisma table but write via incompatible code paths. Several authorization holes exist on teacher-facing endpoints, a race condition in the non-transactional `updateReadingHomework` path can leave orphaned records, and the student reading-game page passes a client-supplied `totalItems` value to the server despite the backend computing it server-side (making the client field dead weight but potentially confusing). Test coverage for the new reading flow is absent from `game.service.spec.ts`.

---

## Critical Issues

### CR-01: Non-atomic delete-then-write in `updateReadingHomework` can corrupt data on concurrent requests

**File:** `backend/src/homework/homework.repository.ts:289-300`

**Issue:** `updateReadingHomework` first calls `prisma.readingActivity.deleteMany` outside a transaction, then immediately calls `prisma.homework.update` to insert the new activities. If the second call fails (network hiccup, Prisma validation error, constraint violation) the homework will have zero activities — permanently corrupted. Compare this to `updateVocabHomework` and `updateListenHomework` which correctly wrap the same pattern in `prisma.$transaction`.

**Fix:**
```typescript
async updateReadingHomework(id: number, dto: UpdateReadingHomeworkDto) {
  return this.prisma.$transaction(async (tx) => {
    if (dto.activities !== undefined) {
      await tx.readingActivity.deleteMany({ where: { homeworkId: id } });
    }
    return tx.homework.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.activities !== undefined
          ? { readingActivities: buildReadingActivitiesCreate(dto.activities) }
          : {}),
      },
      include: { ...readingActivitiesInclude, assignments: { include: assignmentInclude } },
    });
  });
}
```

---

### CR-02: `HomeworkAssignmentClass` delete-then-recreate in `updateAssignment` is also non-atomic

**File:** `backend/src/homework/homework.repository.ts:251-262`

**Issue:** Same pattern as CR-01 — `deleteMany` followed by `createMany` with no enclosing `$transaction`. If `createMany` fails, the assignment loses all class associations (the homework becomes unassigned silently). Any in-flight student fetching assignments during this window sees an empty class list.

**Fix:**
```typescript
async updateAssignment(id: number, dto: UpdateAssignmentDto) {
  return this.prisma.$transaction(async (tx) => {
    if (dto.classIds !== undefined) {
      await tx.homeworkAssignmentClass.deleteMany({ where: { assignmentId: id } });
      await tx.homeworkAssignmentClass.createMany({
        data: dto.classIds.map((classId) => ({ assignmentId: id, classId })),
      });
    }
    return tx.homeworkAssignment.update({
      where: { id },
      data: { ...(dto.endDate && { endDate: new Date(dto.endDate) }) },
      include: { classes: { include: { class: true } }, homework: { include: { ...partsInclude, ...readingActivitiesInclude } } },
    });
  });
}
```

---

### CR-03: `saveReadingResult` client supplies `totalItems` which the server ignores — but the DTO accepts it, creating a false sense of validation

**File:** `frontend/lib/admin-api.ts:238-247` and `backend/src/game/game.service.ts:399-417`

**Issue:** The frontend `saveReadingResult` function sends `{ correctItems, totalItems }` to the server. The backend `SaveReadingResultDto` has no `totalItems` field — the server computes `totalItems` from the homework's activities. The client-sent `totalItems` is silently discarded. This is not a security bug by itself (server ignores it), but it is a correctness hazard: if the server-computed `totalItems` ever differs from the client view (e.g., due to a homework edit between session start and submission), the server score wins but the client has no feedback. More critically, if activities load differently between `fetchSession` at game start and the server recompute at score time, the `correctItems > totalItems` guard on the backend can reject a legitimate submission.

The real bug is in `finishSession` in `frontend/app/student/reading/[id]/page.tsx:501-503`: it counts `a.pairs.length` for MATCH activities but the server counts `act.matchPairs.length + act.fillBlanks.length`. When `fillBlanks` has more than one row (multiple sentences in one FILL_BLANK activity), the server total will exceed the client's item count causing the "correctItems cannot exceed totalItems" error.

**Fix:** The frontend should not send `totalItems` at all since the server ignores it. More importantly, the server-side `totalItems` computation must match the client's counting logic exactly. The server counts `matchPairs.length + fillBlanks.length` per activity, and the client counts `a.pairs.length` (only) for MATCH activities and `a.items.length` for FILL_BLANK. These are structurally aligned for single-FillBlank-per-activity (the current schema), but this is fragile. Add a comment or assertion making this invariant explicit.

---

### CR-04: Race condition in application-level upsert for `savePhonicsResult` and `saveVocabResult`

**File:** `backend/src/game/game.repository.ts:110-129` and `131-150`

**Issue:** The "application-level upsert" pattern (findFirst → update or create) is wrapped in a `$transaction`, but Prisma interactive transactions at the default isolation level (`READ COMMITTED` in PostgreSQL) do NOT prevent another concurrent request from inserting between the `findFirst` and `create` calls. Two simultaneous submissions for the same `(sessionId, wordId)` can both see no existing row and both attempt `create`, causing a constraint violation if a unique constraint exists, or a duplicate row if it does not. The comment states the unique constraint was "dropped in 08-01", meaning duplicate rows are silently created — the student gets multiple score rows for the same word, breaking the average computation in `completeSession`.

**Fix:** Either re-add the unique constraint on `(sessionId, wordId)` and use Prisma's native `upsert`, or use `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` within the transaction. The simplest fix:
```typescript
// In schema.prisma, add:
@@unique([sessionId, wordId])  // on PhonicsItemResult

// In game.repository.ts:
async savePhonicsResult(...) {
  return this.prisma.phonicsItemResult.upsert({
    where: { sessionId_wordId: { sessionId, wordId } },
    update: { transcribedText, score },
    create: { sessionId, wordId, transcribedText, score },
    include: { word: true },
  });
}
```

---

### CR-05: `reconstructSegments` in `ReadingCreationPage.tsx` crashes when choices list begins with distractors (no leading `isCorrect`)

**File:** `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx:88-128`

**Issue:** `reconstructSegments` assumes `choices` are ordered with each `isCorrect: true` entry starting a new blank group. If the choices stored in the DB arrive in a different order (e.g., distractors before the correct answer for a blank), the `current` variable is `null` when a distractor is encountered and the distractor is silently dropped. This can happen if the backend's `createMany` does not preserve insertion order, or if a future migration sorts choices differently.

More critically, the `parts.length === blankGroups.length + 1` invariant is assumed but never checked: if `blankGroups.length > parts.length - 1` (more `isCorrect` choices than `___` placeholders in the sentence), `g = blankGroups[i]` at line 117 will be `undefined` and `g.correctWord` throws a runtime error, crashing the edit-mode prefill and leaving the teacher with a broken form.

**Fix:**
```typescript
function reconstructSegments(fillBlanks: FillBlankShape[]): SentenceSegment[] {
  if (!fillBlanks?.length) return [];
  const fb = fillBlanks[0];
  const { sentence, choices } = fb;
  const parts = sentence.split('___');
  const blankGroups: { correctWord: string; distractors: string[] }[] = [];
  let current: { correctWord: string; distractors: string[] } | null = null;
  for (const c of choices) {
    if (c.isCorrect) {
      if (current) blankGroups.push(current);
      current = { correctWord: c.word, distractors: [] };
    } else if (current) {
      current.distractors.push(c.word);
    }
    // distractors before any isCorrect:true are now safely ignored
  }
  if (current) blankGroups.push(current);

  // Guard invariant
  if (blankGroups.length !== parts.length - 1) return [];  // malformed — return empty to force re-entry

  // ... rest unchanged
}
```

---

## Warnings

### WR-01: `HomeworkPart` delete-then-write in `update()` is non-atomic (same class of bug as CR-01)

**File:** `backend/src/homework/homework.repository.ts:208-222`

**Issue:** `update()` deletes all parts with `deleteMany` then immediately calls `homework.update` with new parts outside a transaction. A failure mid-way leaves the homework part-less. Lower severity than CR-01 because PHONICS homework editing is less frequent.

**Fix:** Wrap in `prisma.$transaction` as shown for CR-01.

---

### WR-02: `gameLogin` checks `class.code !== classCode` AFTER password verification, leaking user existence

**File:** `backend/src/game/game.service.ts:46-55`

**Issue:** The login flow: (1) look up user by `upn`, (2) check student belongs to class, (3) check password. If step 2 fails, an attacker with a valid `upn` gets `UnauthorizedException('Student not found in this class')` rather than a generic credential error. An attacker can enumerate valid student accounts by trying known class codes. The password check should come before or simultaneously with class validation, or all failure paths should return an identical generic message.

**Fix:**
```typescript
// Run password check before class check, or always throw generic:
if (!validPw) throw new UnauthorizedException('Invalid credentials');
if (!user.student.class || user.student.class.code !== classCode) {
  throw new UnauthorizedException('Invalid credentials');
}
```

---

### WR-03: No authorization check on `GET /homework/reading/:id`, `PUT /homework/reading/:id` — teacher can edit another teacher's homework

**File:** `backend/src/homework/homework.repository.ts` (no `teacherId` ownership check in `findReadingById` / `updateReadingHomework`)

**Issue:** The schema has no `teacherId` foreign key on `Homework`, so there is no ownership concept. However, the route guards only require `TEACHER` role, not that the homework belongs to the requesting teacher. In a multi-teacher deployment, any teacher can update any other teacher's reading homework. This may be intentional (shared templates), but if not, it is a missing authorization control.

**Fix:** If homework should be teacher-scoped, add `teacherId` to `Homework` and validate it in service methods. If shared, document the intent explicitly to prevent future confusion.

---

### WR-04: `saveReadingResult` DTO has no `@IsInt()` or `@Min(0)` validators on `correctItems`

**File:** `backend/src/game/game.dto.ts:21-23`

**Issue:** `SaveReadingResultDto` has an empty class with a bare `correctItems: number` field and no class-validator decorators. NestJS `ValidationPipe` (if configured with `transform: true`) will parse the JSON body, but without `@IsInt()` and `@Min(0)` decorators, a float or negative value passes DTO validation and only fails the manual check inside `saveReadingResult`. The manual check `if (dto.correctItems < 0)` catches negatives, but a float like `0.5` passes through and produces a non-integer score.

**Fix:**
```typescript
export class SaveReadingResultDto {
  @IsInt()
  @Min(0)
  correctItems: number;
}
```

---

### WR-05: `advanceActivity` in reading game closes over a stale `activityStates` snapshot

**File:** `frontend/app/student/reading/[id]/page.tsx:511-517`

**Issue:** `advanceActivity` is defined with `useCallback` depending on `[currentActivityIndex, activityStates, finishSession]`. When the last activity completes, it calls `finishSession(activityStates)` — but `activityStates` at that moment is the value captured by the closure at the time `advanceActivity` was last re-created. If `setActivityState` updates are batched or the closure is stale when the final `onComplete` fires, `finishSession` may receive an `activityStates` array where the last activity's results are not yet committed, producing an incorrect `correct` count and hence wrong score. This is a classic React stale-closure bug.

**Fix:** Pass a functional updater to get fresh state:
```typescript
const finishSession = useCallback(async () => {
  setActivityStates((snapshot) => {
    // compute score from fresh snapshot
    let total = 0; let correct = 0;
    for (const a of snapshot) { /* ... same logic ... */ }
    // trigger async save using the computed values
    doSave(total, correct);
    return snapshot; // no mutation
  });
}, [sessionId]);
```
Or use a `useRef` to always hold the current `activityStates`.

---

### WR-06: `completeSession` in `game.service.ts` divides by `totalWords` (from homework parts) but uses `phonicsResults.length` which may differ

**File:** `backend/src/game/game.service.ts:541-544`

**Issue:** In the PHONICS branch of `completeSession`:
```typescript
const totalWords = hw.parts.reduce((s, p) => s + p.words.length, 0);
const scoreSum = phonicsResults.reduce(...);
avgScore = totalWords > 0 ? scoreSum / totalWords : 0;
```
If a student has only submitted results for some words (incomplete session), `phonicsResults.length < totalWords` and the sum is divided by the total word count — giving a lower score than a true average of completed words. This is intentional (penalize incomplete submissions) but it is not documented. If the intent is "average of submitted words only", the denominator is wrong. If the intent is to penalize, the logic is correct but should be documented.

**Fix:** Add a comment clarifying the scoring intent, or change to `phonicsResults.length` if averaging submitted words only.

---

### WR-07: Missing imageUrl validation in `CreateMatchPairDto` and `CreateReadingPairDto` — empty imageUrl accepted

**File:** `backend/src/homework/homework.dto.ts:42-48` and `188-194`

**Issue:** Both `CreateMatchPairDto` and `CreateReadingPairDto` declare `imageUrl: string` with `@IsString()` but no `@IsNotEmpty()` or `@IsUrl()`. A teacher can submit an empty string for `imageUrl`, which is stored in the DB and rendered as a broken image in the student game. The frontend editor enforces non-empty imageUrl only through UI flow (the pair is added after an upload), but API requests bypass this.

**Fix:**
```typescript
export class CreateMatchPairDto {
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsString()
  @IsNotEmpty()
  word: string;
}
```

---

### WR-08: `try-speak` and `try-phonics` endpoints have no rate limiting and no student-identity requirement

**File:** `backend/src/game/game.controller.ts:85-105`

**Issue:** `POST /game/homework/:id/try-speak` and `POST /game/homework/:id/try-phonics` are protected only by `AuthGuard` (any authenticated user), not `TeacherGuard`. A student account can call these endpoints repeatedly to probe the BFA service with arbitrary audio. These endpoints are designed for teachers to preview homework, but the controller does not restrict them to the `TEACHER` role. A malicious student could abuse them to make unlimited free BFA calls.

**Fix:** Add `@UseGuards(TeacherGuard)` to the try-speak and try-phonics endpoints, or at minimum document that student access is intentional.

---

## Info

### IN-01: Duplicate `PhonemeOp` interface declared in `admin-api.ts`

**File:** `frontend/lib/admin-api.ts:189-193` and `743-753`

**Issue:** `PhonemeOp` is declared twice in the same file — once as a short form (lines 189–193, used in `tryPhonicsHomework` return type) and once as a full form with optional `start/end/duration/message` fields (lines 743–753, used in `BfaResult`). The first declaration is a subset of the second; both are exported. TypeScript will use whichever is imported first. The short form is shadowed by the full form if both exist in the same module scope, but having both is confusing and could cause type errors if they diverge.

**Fix:** Remove the first duplicate declaration (lines 189–193) and use only the full `PhonemeOp` interface throughout.

---

### IN-02: `load()` function in `HomeworkPage` swallows errors silently

**File:** `frontend/app/teacher/homework/page.tsx:763`

**Issue:** `getHomeworkList().then(setList).catch(() => {})` — the `.catch` swallows all errors with an empty handler. A network failure or 401 response silently shows the user an empty list with no error message.

**Fix:**
```typescript
const load = () => {
  setPageLoading(true);
  getHomeworkList()
    .then(setList)
    .catch(() => showToast('Failed to load homework list. Please refresh.', 'error'))
    .finally(() => setTimeout(() => setPageLoading(false), PAGE_LOADING_DELAY));
};
```

---

### IN-03: `reconstructSegments` only reads `fillBlanks[0]` — multi-FillBlank activities are ignored during edit-mode prefill

**File:** `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx:85`

**Issue:** In `reconstructSegments`, only `fillBlanks[0]` is accessed. The current schema stores one `FillBlank` row per FILL_BLANK activity (by design in `buildReadingActivitiesCreate`), so this works today. But the `fillBlanks` field is an array and the comment in `game.repository.ts` (line 50) notes the design was a simplification. If the schema ever allows multiple FillBlank rows per activity, the edit-mode prefill will silently discard all but the first. A guard comment would prevent future silent data loss.

---

### IN-04: Test file missing coverage for `saveReadingResult` authorization path and edit-mode `updateReadingHomework`

**File:** `backend/src/game/game.service.spec.ts`

**Issue:** `saveReadingResult` tests cover the correctness and validation branches but do not test the `ForbiddenException` path (`requestingStudentId !== session.studentId`). Similarly, `updateReadingHomework` in `homework.service.ts` has no tests at all in this spec file. Per project rules (CLAUDE.md), new features must have tests covering the happy path and at least one edge/error case.

**Fix:** Add:
```typescript
it('throws ForbiddenException when student submits result for another session', async () => {
  repo.getSession.mockResolvedValue(mockReadingSession({ studentId: 2 }) as any);
  const dto: SaveReadingResultDto = { correctItems: 0 };
  await expect(service.saveReadingResult(1, dto, 1)).rejects.toThrow(ForbiddenException);
});
```

---

_Reviewed: 2026-06-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
