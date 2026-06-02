---
phase: 08-vocabulary-image
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - backend/prisma/schema.prisma
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
  - frontend/lib/admin-api.ts
  - frontend/app/teacher/homework/page.tsx
  - frontend/app/teacher/homework/_components/VocabCreationPage.tsx
  - frontend/app/teacher/homework/create/vocabulary/page.tsx
  - frontend/app/game/vocab/[id]/page.tsx
  - frontend/app/game/homework/page.tsx
  - frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx
findings:
  critical: 6
  warning: 7
  info: 4
  total: 17
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-06-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

This phase adds a Vocabulary-by-Image homework type end-to-end: Prisma schema (`VocabItem`), backend CRUD (homework + game), BFA pronunciation analysis for vocab items, and the frontend creation/game/results flow. The overall structure is sound and consistent with prior homework types. However, six blocker-level defects were found spanning security (no file-type validation on uploads), data integrity (non-atomic delete-then-update for vocab items), authorization (no session ownership check), score calculation (div-by-zero, double-count), and a race condition in the recording flow.

---

## Critical Issues

### CR-01: File upload endpoint accepts any MIME type — no server-side file-type validation

**File:** `backend/src/homework/homework.controller.ts:17-23`

**Issue:** `POST /homework/image` accepts `multipart/form-data` and forwards the raw buffer to storage with the caller-supplied `file.mimetype`. There is no server-side check that the uploaded file is actually an image. An authenticated teacher can upload an HTML file, SVG with embedded script, or any other content and obtain a permanent public URL that is then rendered as an `<img>` by students' browsers. SVG files with embedded `<script>` tags are particularly dangerous as they execute in the document origin when loaded as an image in many browsers.

**Fix:**
```typescript
import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

@Post('image')
@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
async uploadImage(@UploadedFile() file?: Express.Multer.File) {
  if (!file) throw new BadRequestException('No file uploaded');
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new BadRequestException('Only JPEG, PNG, WebP, and GIF images are accepted');
  }
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.mimetype] ?? 'jpg';
  const key = `homework-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  await this.storage.upload(key, file.buffer, file.mimetype);
  return { key };
}
```
Also note the controller currently enforces a 10 MB limit while `VocabCreationPage.tsx:276` enforces 5 MB client-side — the server limit should be tightened to 5 MB as the authoritative bound.

---

### CR-02: Non-atomic delete-then-recreate for vocab items — data loss on partial failure

**File:** `backend/src/homework/homework.repository.ts:326-349`

**Issue:** `updateVocabHomework` first calls `prisma.vocabItem.deleteMany` then calls `prisma.homework.update` to insert new rows. These are two separate database operations with no wrapping transaction. If the server crashes, loses the DB connection, or the second operation throws after the delete succeeds, the homework is left with zero vocab items — the data is permanently destroyed with no rollback.

The same pattern exists for `updateReadingHomework` at line 282-294 and `update` (phonics parts) at line 201-215, but the vocab variant is new in this phase.

**Fix:**
```typescript
async updateVocabHomework(id: number, dto: UpdateVocabHomeworkDto) {
  return this.prisma.$transaction(async (tx) => {
    if (dto.items !== undefined) {
      await tx.vocabItem.deleteMany({ where: { homeworkId: id } });
    }
    return tx.homework.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.items !== undefined
          ? {
              vocabItems: {
                create: dto.items.map((item, idx) => ({
                  imageUrl: item.imageUrl,
                  word: item.word,
                  phonemes: item.phonemes ? JSON.stringify(item.phonemes) : null,
                  order: idx,
                })),
              },
            }
          : {}),
      },
      include: { ...vocabItemsInclude, assignments: { include: assignmentInclude } },
    });
  });
}
```

---

### CR-03: No session ownership check — any student can submit vocab results for another student's session

**File:** `backend/src/game/game.service.ts:282-337`

**Issue:** `saveVocabResult` (and analogously `savePhonicsResult`, `saveSpeakingResult`) verifies that the `vocabItemId` belongs to the homework, but does not verify that the authenticated student owns the session. The `AuthGuard` at the controller level only validates a JWT is present; it does not confirm `session.studentId === token.studentId`. An authenticated student who knows (or guesses) another student's `sessionId` can post results and pollute that student's score record.

**Fix:** Extract the requesting student's ID from the JWT in the controller and pass it to the service for ownership verification:
```typescript
// In game.service.ts saveVocabResult:
async saveVocabResult(
  sessionId: number,
  dto: SaveVocabResultDto,
  requestingStudentId: number,  // <-- new param
  audioBuffer?: Buffer,
  mimeType?: string,
) {
  const session = await this.repo.getSession(sessionId);
  if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
  if (session.studentId !== requestingStudentId) {
    throw new ForbiddenException('Not your session');
  }
  // ... rest unchanged
}
```
Apply the same fix to `savePhonicsResult`, `saveSpeakingResult`, and `completeSession`.

---

### CR-04: Score calculation double-counts in `completeSession` for VOCABULARY type

**File:** `backend/src/game/game.service.ts:377-382`

**Issue:** The VOCABULARY branch computes the average score by dividing `scoreSum` by `count` (the number of vocab items in the homework). However, `session.phonicsResults` contains results for ALL phonics-related homework types — the existing `PhonicsItemResult` model is shared between PHONICS and VOCABULARY. If `phonicsResults` mistakenly includes rows from a prior session or another homework type that leaked in via the query, the denominator (`count` = vocab item count from the homework) may not match the actual number of entries in `phonicsResults`, producing a wrong average.

More precisely: `phonicsResults` from `sessionInclude` includes **all** `PhonicsItemResult` rows for the session (no filter by `vocabItemId IS NOT NULL`). If a student re-records an item, a new row is created without removing the old one (the application-layer upsert at `game.repository.ts:120-136` does prevent duplicates for the same `vocabItemId`, so this is the correct guard), but the denominator is the number of items in the homework — not `phonicsResults.length`. When a student skips items (records fewer items than the homework has), `scoreSum / count` gives a lower result than `scoreSum / phonicsResults.length`, underscoring students who only completed part of the work.

The critical sub-issue: if `vocabItems.length` on the `hw` object is 0 (because `vocabItems` is not eagerly loaded in `completeSession` via `repo.completeSession` which uses a different include than `sessionInclude`), `count = 0` produces `avgScore = 0 / 0 = NaN`, which `Math.round(NaN)` turns into `NaN`, and Prisma writes `NaN` as `score` to the DB.

**Fix:**
```typescript
} else if (hw.type === 'VOCABULARY') {
  const vocabResults = (session.phonicsResults ?? []).filter(
    (r: { vocabItemId?: number | null }) => r.vocabItemId != null,
  );
  const count = vocabResults.length;
  const scoreSum = vocabResults.reduce((s: number, r: { score: number }) => s + r.score, 0);
  avgScore = count > 0 ? scoreSum / count : 0;
}
```

---

### CR-05: Race condition — `handleStopAndScore` captures a stale `currentIndex` via closure

**File:** `frontend/app/game/vocab/[id]/page.tsx:146-170`

**Issue:** `handleStopAndScore` is declared with `useCallback` and depends on `[currentIndex, sessionId]`. However, between the user pressing "stop" and `stopRecording()` resolving (which can take up to 2000 ms due to the guard timeout at line 131), the user could in principle interact with the UI and change `currentIndex` — for example, if a parent re-renders trigger state. More critically, `item = itemsRef.current[currentIndex]` at line 149 uses `itemsRef` (which is the live array) but `currentIndex` is the value captured at `useCallback` memoization time. If the index and the ref diverge during the async gap, the wrong item's vocabItemId is submitted to the server.

This is unlikely in practice (only one item is displayed at a time), but the pattern is structurally unsound. The idiomatic fix is to capture the index into a local variable before any `await`:

**Fix:**
```typescript
const handleStopAndScore = useCallback(async () => {
  const capturedIndex = currentIndex;  // capture synchronously before any await
  setItems((prev) => prev.map((item, i) => i === capturedIndex ? { ...item, recordState: 'scoring' } : item));
  const blob = await stopRecording();
  const item = itemsRef.current[capturedIndex];  // use captured index
  if (!item) return;
  try {
    const result = await saveVocabResult(sessionId, item.vocabItemId, blob ?? undefined);
    // ...
    setItems((prev) => prev.map((it, i) => i === capturedIndex ? { ... } : it));
  } catch {
    setItems((prev) => prev.map((it, i) => i === capturedIndex ? { ...it, recordState: 'recorded', bfaError: 'speech_not_detected' } : it));
  }
}, [currentIndex, sessionId]);
```

---

### CR-06: `uploadSpeakingImage` returns a URL constructed from `API_URL` + `/homework/image/${key}` — but the backend endpoint `GET /homework/image/:key` does not exist

**File:** `frontend/lib/admin-api.ts:208-220`

**Issue:** `uploadSpeakingImage` at line 219 constructs `${API_URL}/homework/image/${key}` as the image URL and stores it in the database. But the backend `HomeworkController` only exposes `POST /homework/image` (upload). There is no `GET /homework/image/:key` handler. The image URLs stored in `VocabItem.imageUrl` and `HomeworkWord.imageUrl` will return 404 when browsers try to load them. Images are apparently served from a storage bucket directly; the URL should be the bucket object URL, not a backend proxy URL.

**Fix:** Return the storage-native URL from the upload handler instead of constructing a backend proxy URL on the client. In the controller:
```typescript
@Post('image')
async uploadImage(...) {
  // ...
  const url = await this.storage.upload(key, file.buffer, file.mimetype);
  return { url };  // return the full bucket URL, not just the key
}
```
And in the frontend:
```typescript
const { url } = await res.json() as { url: string };
return url;  // not `${API_URL}/homework/image/${key}`
```

---

## Warnings

### WR-01: `SavePhonicsResultDto.wordId` and `SaveVocabResultDto.vocabItemId` parsed with `Number()` — `NaN` on missing field

**File:** `backend/src/game/game.controller.ts:43, 84`

**Issue:** `wordId` and `vocabItemId` are extracted from `@Body()` as plain strings and coerced via `Number()`. If the client omits the field, `Number(undefined)` is `NaN`. `NaN` propagates into the repository's `findFirst` where call (Prisma will throw a type error), but the error message will be cryptic. Using `ParseIntPipe` or explicit validation prevents this.

**Fix:**
```typescript
// In controller, add validation:
const wordIdNum = Number(wordId);
if (!Number.isFinite(wordIdNum) || wordIdNum <= 0) {
  throw new BadRequestException('wordId must be a positive integer');
}
```
Or bind the field to a DTO with class-validator `@IsInt()`.

---

### WR-02: `toWav` leaves temp files on disk if `fs.readFileSync(tmpOut)` throws

**File:** `backend/src/bfa/bfa.service.ts:25-40`

**Issue:** `toWav` writes `tmpIn`, runs ffmpeg to produce `tmpOut`, then reads `tmpOut`. If `fs.readFileSync(tmpOut)` throws (e.g., ffmpeg produced no output, disk full), the `finally` block still runs and correctly unlinks both files. However, if `execFileSync` throws (caught), the `finally` block executes — this path is correct. The real risk is that `tmpIn` is written **before** the try, so if the `fs.writeFileSync(tmpIn, audioBuffer)` call itself throws (disk full), `tmpIn` is partially written and the `finally` block will attempt to unlink it — the unlink is wrapped in try/catch so this is fine. The actual issue is the potential for leftover files when the process crashes mid-function (no `finally` in OS process crash), which is unavoidable, but there is no cleanup for stale files from prior runs. This is a minor operational concern; the real code correctness issue is that `tmpIn` and `tmpOut` filenames use `process.hrtime.bigint()` called twice — they could theoretically clash under extremely fast hardware if called within the same nanosecond tick. A UUID or a combined PID+hrtime is safer.

**Fix:**
```typescript
import { randomUUID } from 'crypto';
const id = randomUUID();
const tmpIn  = path.join(os.tmpdir(), `apa-in-${id}.${ext}`);
const tmpOut = path.join(os.tmpdir(), `apa-out-${id}.wav`);
```

---

### WR-03: `completeSession` — result page shown even when `completeSession` call throws

**File:** `frontend/app/game/vocab/[id]/page.tsx:178-191`

**Issue:** In `handleNext`, after the last item is processed, `setPageState('uploading')` is set, then `completeSession(sessionId)` is awaited. If it throws, `setSaveError(true)` is called **but then `setPageState('results')` is always executed** at line 190 regardless of success or failure. The student sees the results page, and `saveError` shows a warning, but the session is not actually completed in the backend — the score is not saved. The student may re-enter the results screen thinking they've submitted when they haven't.

**Fix:**
```typescript
try {
  const session = await completeSession(sessionId);
  setResults(session);
  setPageState('results');
} catch {
  setSaveError(true);
  setPageState('results');  // still show results, but keep saveError visible
}
// Remove the unconditional setPageState('results') after the try/catch
```
The current code has `setPageState('results')` at line 190 outside the `try/catch`, which runs unconditionally. Move it inside both branches (already done in fix above — it's currently `} catch { setSaveError(true); } setPageState('results');` which means `setPageState` runs even after the catch).

---

### WR-04: `deleteHomework` on the homework list page has no error handling

**File:** `frontend/app/teacher/homework/page.tsx:866-870`

**Issue:** The delete confirmation button fires `await deleteHomework(h.id)` directly in an inline `onClick` handler with no `try/catch`. If the delete fails (e.g., the homework has active sessions and the DB cascades fail, or there is a network error), the error is silently swallowed, the UI calls `load()` which re-fetches (showing the item still exists), and the teacher receives no feedback about the failure.

**Fix:**
```typescript
onClick={async () => {
  try {
    await deleteHomework(h.id);
    setDeletingId(null);
    load();
    showToast('Homework deleted.');
  } catch (err: unknown) {
    setDeletingId(null);
    showToast(err instanceof Error ? err.message : 'Delete failed.');
  }
}}
```

---

### WR-05: Vocab homework `name` is validated as required in the service but not marked required in `CreateVocabHomeworkDto`

**File:** `backend/src/homework/homework.dto.ts:105-108` / `backend/src/homework/homework.service.ts:130`

**Issue:** `CreateVocabHomeworkDto.name` is typed as `string` (non-optional), but the validation in `HomeworkService.createVocabHomework` does `if (!dto.name?.trim())` using optional chaining, which implies the service expects `name` may be absent. The DTO has no class-validator decorators, so the NestJS validation pipe (if configured globally) will not enforce presence. An API caller sending `{ "name": "", "items": [...] }` gets a clear error, but sending `{}` bypasses the DTO type system and hits the service check. This is consistent with the rest of the codebase's DTO style but is a latent quality issue.

**Fix:** Add class-validator decorators to all vocab DTOs, or at minimum align the DTO with the service expectation:
```typescript
export class CreateVocabHomeworkDto {
  name: string;  // mark as truly required — document the API contract
  items: CreateVocabItemDto[];
}
```
And in the service, replace the optional-chaining guard with a strict check:
```typescript
if (!dto.name || !dto.name.trim()) {
  throw new BadRequestException('Name is required');
}
```

---

### WR-06: `VocabCreationPage` sends `name: name.trim()` without client-side validation of the name field

**File:** `frontend/app/teacher/homework/_components/VocabCreationPage.tsx:315-333`

**Issue:** `handleSave` calls `validate()` which only checks items (image + word), never the `name` field. If the teacher leaves the name empty, the frontend sends `{ name: '', items: [...] }` to the backend, where the service throws `'Name is required'` — the error is caught and displayed via `setError`. But the `TextField` for name has `required` on it (line 372), meaning pressing Save normally would be blocked by the browser's native form validation — **except the Save button is `type="button"`, not `type="submit"`**, so browser form validation is never triggered. The user gets a server round-trip error for something that should be caught client-side.

**Fix:** Add name validation to the `validate()` function:
```typescript
function validate(): string | null {
  if (!name.trim()) return 'Homework name is required.';
  if (items.length === 0) return 'Add at least one item.';
  // ...
}
```

---

### WR-07: `findVocabById` and `findAssignmentById` in `HomeworkRepository` both include `assignments` via `assignmentInclude` which does NOT include `vocabItems` in the session-embedded homework

**File:** `backend/src/homework/homework.repository.ts:233-242` (via `findAssignmentById`)

**Issue:** `findAssignmentById` includes `homework: { include: { ...partsInclude, ...readingActivitiesInclude } }` — note `vocabItemsInclude` is absent. When a student's game session loads via `GameRepository.getSession`, the `homeworkInclude` constant (game.repository.ts:23-30) correctly includes `vocabItemsInclude`. But when `findAssignmentById` is called from the homework service (e.g., for assignment validation), any code path that expects `vocabItems` on the homework returned by the assignment will receive an empty/missing array. The `game.service.ts:296` comment says "T-08-03: cross-homework tamper guard" and casts `hw as any` to access `vocabItems` — this works because `getSession` goes through `GameRepository` (which has the correct include), but the inconsistency is a latent trap for future callers of `findAssignmentById`.

**Fix:** Add `...vocabItemsInclude` to the `homeworkInclude` inside `findAssignmentById`:
```typescript
findAssignmentById(id: number) {
  return this.prisma.homeworkAssignment.findUnique({
    where: { id },
    include: {
      homework: { include: { ...partsInclude, ...readingActivitiesInclude, ...vocabItemsInclude } },
      classes: { include: { class: true } },
      sessions: { include: { student: true }, orderBy: { startedAt: 'desc' } },
    },
  });
}
```

---

## Info

### IN-01: Duplicate interface declarations for `VocabItem`, `CreateVocabItemInput`, `CreateVocabHomeworkInput`, `UpdateVocabHomeworkInput`, `VocabHomeworkDetail` in `admin-api.ts`

**File:** `frontend/lib/admin-api.ts:303-335` and again at `506-538`

**Issue:** Each of these five interfaces/types is declared twice in the same file. TypeScript merges duplicate interface declarations, so there is no runtime error, but the duplication creates confusion about which declaration is authoritative and makes the file harder to maintain.

**Fix:** Remove the second set of declarations (lines 506-538) and keep the first set (lines 303-335).

---

### IN-02: `PhonemeOp` interface is also declared twice in `admin-api.ts`

**File:** `frontend/lib/admin-api.ts:183-187` and `680-688`

**Issue:** A narrower version at line 183 (used only inside `tryPhonicsHomework`'s return type) and a fuller version at line 680. The narrower version is partially shadowed. Consolidate into one declaration.

---

### IN-03: `VocabCreationPage` uses `uploadSpeakingImage` for vocab item images — misleading API name

**File:** `frontend/app/teacher/homework/_components/VocabCreationPage.tsx:283`

**Issue:** `uploadSpeakingImage` is imported and used for uploading vocab images. The function name implies speaking-homework context. This is a naming quality issue; no functional defect, but it will confuse future maintainers.

**Fix:** Rename `uploadSpeakingImage` to `uploadHomeworkImage` in `admin-api.ts` and update all call sites.

---

### IN-04: `VocabGamePage` progress bar uses `pageState === 'playing'` as the condition for showing progress dots, but dots are rendered for all states including 'ready'

**File:** `frontend/app/game/vocab/[id]/page.tsx:386-401`

**Issue:** The progress indicator dots are rendered unconditionally in the "Ready / Playing" return branch (line 386), but the counter label `{currentIndex + 1} / {items.length}` is only shown when `pageState === 'playing'`. In the `'ready'` state, the dots render but the counter is hidden, which is consistent with the design intent. No bug, but the conditional could be clearer.

---

_Reviewed: 2026-06-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
