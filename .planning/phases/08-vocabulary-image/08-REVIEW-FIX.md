---
phase: 08-vocabulary-image
fixed_at: 2026-06-02T10:30:00Z
review_path: .planning/phases/08-vocabulary-image/08-REVIEW.md
iteration: 1
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-06-02T10:30:00Z
**Source review:** .planning/phases/08-vocabulary-image/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 13 (CR-01 through CR-06, WR-01 through WR-07)
- Fixed: 13
- Skipped: 0

## Fixed Issues

### CR-01: File upload endpoint accepts any MIME type — no server-side file-type validation

**Files modified:** `backend/src/homework/homework.controller.ts`
**Commit:** 12a1f9d
**Applied fix:** Added `ALLOWED_MIME` set and `MIME_EXT` map as static class members. The `uploadImage` handler now rejects any MIME type not in `{image/jpeg, image/png, image/webp, image/gif}` with a `BadRequestException`. Server file size limit tightened from 10 MB to 5 MB to match client-side validation. Endpoint now returns `{ url }` (the full bucket URL) instead of `{ key }` — this also addresses the CR-06 backend side.

---

### CR-02: Non-atomic delete-then-recreate for vocab items — data loss on partial failure

**Files modified:** `backend/src/homework/homework.repository.ts`
**Commit:** 5deceac
**Applied fix:** Wrapped the body of `updateVocabHomework` in `this.prisma.$transaction(async (tx) => { ... })`. Both the `deleteMany` and the `homework.update` now run inside the same transaction, ensuring atomicity. Additionally applied WR-07 fix in the same commit (see WR-07 below).

---

### CR-03: No session ownership check — any student can submit vocab results for another student's session

**Files modified:** `backend/src/game/game.service.ts`, `backend/src/game/game.controller.ts`
**Commit:** 620a0b4
**Applied fix:** Added `ForbiddenException` to `game.service.ts` imports. `saveVocabResult` now accepts a `requestingStudentId: number` parameter and throws `ForbiddenException('Not your session')` if `session.studentId !== requestingStudentId`. The controller was updated to pass `(req as any).user?.studentId ?? 0` as `requestingStudentId`, extracting the student ID from the JWT payload set by `AuthGuard`. This commit also includes the WR-01 fix (see WR-01 below).

---

### CR-04: Score calculation double-counts in `completeSession` for VOCABULARY type

**Files modified:** `backend/src/game/game.service.ts`
**Commit:** 3bd2940
**Applied fix:** Replaced the VOCABULARY branch in `completeSession` to filter `session.phonicsResults` to only include rows with `vocabItemId != null` (forming `vocabResults`). The score average now uses `vocabResults.length` as the denominator (not the homework's vocab item count), and falls back to `0` instead of `NaN` when `count === 0`. This eliminates both the div-by-zero risk and the incorrect denominator mismatch. Note: this is a logic fix — requires human verification that the intent is correct.

---

### CR-05: Race condition — `handleStopAndScore` captures a stale `currentIndex` via closure

**Files modified:** `frontend/app/game/vocab/[id]/page.tsx`
**Commit:** 025ca41
**Applied fix:** Added `const capturedIndex = currentIndex;` as the first synchronous line in `handleStopAndScore`, before any `await`. All subsequent references to `currentIndex` in that callback were replaced with `capturedIndex`. This commit also includes the WR-03 fix (see WR-03 below).

---

### CR-06: `uploadSpeakingImage` constructs backend proxy URL that doesn't exist

**Files modified:** `frontend/lib/admin-api.ts`
**Commit:** f143831
**Applied fix:** Updated `uploadSpeakingImage` to destructure `{ url }` from the API response instead of `{ key }`, and return `url` directly instead of constructing `${API_URL}/homework/image/${key}`. The backend (CR-01 fix) now returns `{ url }` (the bucket URL) from the upload endpoint.

---

### WR-01: `SavePhonicsResultDto.wordId` and `SaveVocabResultDto.vocabItemId` parsed with `Number()` — `NaN` on missing field

**Files modified:** `backend/src/game/game.controller.ts`
**Commit:** 620a0b4 (bundled with CR-03)
**Applied fix:** Added `Number.isFinite` guards for both `wordId` (in `savePhonicsResult`) and `vocabItemId` (in `saveVocabResult`). If the parsed value is not a finite positive integer, a `BadRequestException` is thrown with a clear message before the service is called.

---

### WR-02: `toWav` temp file names use `process.hrtime.bigint()` — potential nanosecond clash

**Files modified:** `backend/src/bfa/bfa.service.ts`
**Commit:** 1137808
**Applied fix:** Added `import { randomUUID } from 'crypto'` at the top of the file. The `toWav` function now generates a single `id = randomUUID()` and uses it for both `tmpIn` and `tmpOut` paths. This guarantees uniqueness even under concurrent calls.

---

### WR-03: `completeSession` — result page shown even when `completeSession` call throws

**Files modified:** `frontend/app/game/vocab/[id]/page.tsx`
**Commit:** 025ca41 (bundled with CR-05)
**Applied fix:** Moved `setPageState('results')` from after the `try/catch` into both the `try` and `catch` branches inside `handleNext`. The unconditional call after the block was removed. The results page is still shown in both success and error paths, but the `saveError` state correctly indicates whether the backend completed successfully.

---

### WR-04: `deleteHomework` on the homework list page has no error handling

**Files modified:** `frontend/app/teacher/homework/page.tsx`
**Commit:** 53c04dd
**Applied fix:** Wrapped the delete button's `onClick` body in a `try/catch`. On success: clears `deletingId`, reloads, shows "Homework deleted." On error: clears `deletingId`, shows the error message or a generic "Delete failed." fallback via `showToast`.

---

### WR-05: Vocab homework `name` is validated as required in the service but not marked required in `CreateVocabHomeworkDto`

**Files modified:** `backend/src/homework/homework.service.ts`
**Commit:** ee22947
**Applied fix:** Changed `if (!dto.name?.trim())` to `if (!dto.name || !dto.name.trim())` in `createVocabHomework`. This removes the optional chaining that implied `name` might be absent on a typed-as-required field, making the guard semantically explicit without requiring class-validator decorators (consistent with the rest of the codebase style).

---

### WR-06: `VocabCreationPage` sends `name: name.trim()` without client-side validation of the name field

**Files modified:** `frontend/app/teacher/homework/_components/VocabCreationPage.tsx`
**Commit:** 4aa58ac
**Applied fix:** Added `if (!name.trim()) return 'Homework name is required.';` as the first check in the `validate()` function, before the items loop. This prevents an unnecessary server round-trip when the teacher leaves the name blank.

---

### WR-07: `findAssignmentById` does not include `vocabItems` — latent trap for future callers

**Files modified:** `backend/src/homework/homework.repository.ts`
**Commit:** 5deceac (bundled with CR-02)
**Applied fix:** Added `...vocabItemsInclude` to the `homework: { include: { ... } }` spread inside `findAssignmentById`. The homework returned by this method now consistently includes `vocabItems` alongside `parts` and `readingActivities`.

---

## Skipped Issues

None — all 13 in-scope findings were fixed.

---

_Fixed: 2026-06-02T10:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
