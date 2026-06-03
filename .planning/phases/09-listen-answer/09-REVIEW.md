---
phase: 09
reviewed: 2026-06-03T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - backend/src/bfa/bfa.service.ts
  - backend/src/game/game.controller.ts
  - backend/src/game/game.dto.ts
  - backend/src/game/game.repository.ts
  - backend/src/game/game.service.ts
  - backend/src/homework/homework.controller.ts
  - backend/src/homework/homework.dto.ts
  - backend/src/homework/homework.repository.ts
  - backend/src/homework/homework.service.ts
  - bfa-service/main.py
  - frontend/app/game/listen/[id]/page.tsx
  - frontend/app/teacher/homework/_components/ListenCreationPage.tsx
  - frontend/lib/admin-api.ts
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
status: critical
---

# Phase 09: Code Review Report

**Reviewed:** 2026-06-03
**Depth:** standard
**Files Reviewed:** 13
**Status:** critical

## Summary

This phase adds a Listen & Answer homework type end-to-end: backend service, REST controller, repository, Python semantic-scoring microservice, and React game page. The core logic is sound but several security and correctness defects exist.

The most serious issues are: (1) `startSession` performs no ownership check — any authenticated user can create sessions for any studentId they invent; (2) the `HomeworkType` union in `homework.dto.ts` does not include `'LISTEN'`, so `dto.type` is a compile-time type error that could allow invalid data through; (3) the `keywords` field stored in DB is an opaque JSON string with no server-side validation that it is actually a valid JSON array; and (4) `saveListenResult` uses a hardcoded fallback of `requestingStudentId = 0` when the JWT lacks `studentId`, bypassing the ownership guard.

---

## Critical Issues

### CR-01: `startSession` has no student-ownership guard — any authenticated user can impersonate any student

**File:** `backend/src/game/game.controller.ts:27-29`
**Issue:** `startSession` takes a `StartSessionDto` from the request body and creates a session for `dto.studentId` without ever verifying that the calling user owns that student account. A TEACHER or any other authenticated party can POST `{"studentId": <victim>, "assignmentId": ...}` and create sessions on behalf of arbitrary students, then read, manipulate, or complete those sessions.

```typescript
// game.controller.ts
@Post('session/start')
startSession(@Body() dto: StartSessionDto) {
  return this.service.startSession(dto); // no ownership check
}

// game.service.ts
async startSession(dto: StartSessionDto) {
  return this.repo.createSession(dto.studentId, dto.assignmentId);
}
```

**Fix:** Extract the calling student's ID from the JWT and assert it matches `dto.studentId` (or derive the studentId entirely from the token, removing the field from the DTO):

```typescript
@Post('session/start')
startSession(@Body() dto: StartSessionDto, @Req() req: Request) {
  const callerStudentId: number | undefined = (req as any).user?.studentId;
  if (!callerStudentId || callerStudentId !== dto.studentId) {
    throw new ForbiddenException('Cannot start a session for another student');
  }
  return this.service.startSession(dto);
}
```

---

### CR-02: `requestingStudentId` defaults to `0` when JWT lacks `studentId`, silently bypassing the ownership check

**File:** `backend/src/game/game.controller.ts:112`
**Issue:** Both `saveVocabResult` (line 94) and `saveListenResult` (line 112) extract `requestingStudentId` as:

```typescript
const requestingStudentId: number = (req as any).user?.studentId ?? 0;
```

If the JWT payload does not contain `studentId` (e.g., a TEACHER token), the fallback is `0`. In `game.service.ts:405` the guard is:

```typescript
if (session.studentId !== requestingStudentId) throw new ForbiddenException('Not your session');
```

If no session has `studentId = 0` the check accidentally passes (no sessions owned by student 0), but if somehow a session is created with studentId 0, or if any future path sets it, the guard is silently skipped. More critically, a teacher or any logged-in user who omits `studentId` from their token will get `requestingStudentId = 0` — this is an incorrect fallback, not a safe one.

**Fix:** Reject the request immediately when `studentId` is absent from the token:

```typescript
const requestingStudentId: number | undefined = (req as any).user?.studentId;
if (!requestingStudentId) throw new ForbiddenException('Student identity required');
```

---

### CR-03: `HomeworkType` union in `homework.dto.ts` is missing `'LISTEN'`

**File:** `backend/src/homework/homework.dto.ts:1`
**Issue:**

```typescript
export type HomeworkType = 'PHONICS' | 'SPEAKING' | 'READING' | 'VOCABULARY';
```

`'LISTEN'` is absent. `CreateHomeworkDto.type` is typed as `HomeworkType`, but `CreateListenHomeworkDto` bypasses this by using a separate DTO that hardcodes `'LISTEN'` in the repository. However, if `CreateHomeworkDto` is ever used to create a LISTEN homework (the legacy `POST /homework` route), the TypeScript compiler will flag `type: 'LISTEN'` as an error in calling code — or in practice, runtime code may reach the generic `create()` path with type `'LISTEN'` which has no guard, causing undefined behavior. The frontend `admin-api.ts:298` correctly includes `'LISTEN'` in its own `HomeworkType`, which is an inconsistency between client and server types.

**Fix:**

```typescript
// homework.dto.ts
export type HomeworkType = 'PHONICS' | 'SPEAKING' | 'READING' | 'VOCABULARY' | 'LISTEN';
```

---

### CR-04: `keywords` field stored and consumed without validating that it is a valid JSON array

**File:** `backend/src/homework/homework.service.ts:193` / `backend/src/game/game.service.ts:437`
**Issue:** `CreateListenItemDto.keywords` is declared as `string` (a raw JSON array string), and the service only validates that it is non-empty:

```typescript
if (!item.keywords?.trim()) {
  throw new BadRequestException('Each item must have keywords');
}
```

The value is stored verbatim in the database. At runtime in `saveListenResult`, it is parsed with a try/catch that silently falls back to an empty array on failure:

```typescript
try { keywordsArr = JSON.parse(listenItem.keywords); } catch { /* malformed keywords JSON */ }
```

If the teacher submits malformed JSON (e.g., `"red, cat"` instead of `'["red","cat"]'`), keywords are silently dropped and the semantic-scoring threshold is never met for any student. No error is surfaced to the teacher. This is a data-integrity defect that degrades scoring correctness.

**Fix:** Validate and parse keywords at creation time in `HomeworkService.createListenHomework` (and `updateListenHomework`), store a normalised string:

```typescript
// In createListenHomework validation loop:
let kwArr: string[];
try {
  kwArr = JSON.parse(item.keywords);
  if (!Array.isArray(kwArr) || !kwArr.every((k) => typeof k === 'string')) {
    throw new Error();
  }
} catch {
  throw new BadRequestException('keywords must be a valid JSON array of strings e.g. ["red","cat"]');
}
```

---

## Warnings

### WR-01: `listSessions` endpoint accessible by any authenticated user — no teacher/admin guard

**File:** `backend/src/game/game.controller.ts:136-145`
**Issue:** The `GET /game/sessions` endpoint is decorated with both `@UseGuards(AuthGuard)` (class-level) and `@UseGuards(TeacherGuard)` (method-level). NestJS applies guards in order; the class-level `AuthGuard` runs first and sets `req.user`, then the `TeacherGuard` runs. This layering is redundant but not broken — `TeacherGuard` does independently validate TEACHER role. However, `TeacherGuard` does a separate DB lookup that duplicates the one `AuthGuard` already did, incurring an unnecessary query per request. Additionally, a student can reach the DB lookup inside `TeacherGuard` (only to be rejected), which leaks a timing side-channel — authenticated students can determine whether `TeacherGuard` is installed.

This is mainly a quality issue but warrants review for the double-lookup pattern.

**Fix:** Remove the class-level `@UseGuards(AuthGuard)` from endpoints that already have `@UseGuards(TeacherGuard)`, or consolidate into a single guard that handles both authentication and role.

---

### WR-02: Race condition in `savePhonicsResult` / `saveVocabResult` / `saveListenResult` application-layer upsert

**File:** `backend/src/game/game.repository.ts:110-126`, `128-143`, `169-189`
**Issue:** All three result-save methods use an application-layer upsert pattern: `findFirst` then conditionally `create` or `update`. Under concurrent submissions (e.g., student double-taps), two simultaneous requests can both see no existing row, both reach `create`, and one will fail with a unique-constraint violation (if the DB has one) or create a duplicate row (if it does not). The comment on `savePhonicsResult` explicitly notes the named unique constraint was dropped; there is nothing preventing a duplicate row.

**Fix:** Wrap each of these in a Prisma `$transaction` or use a DB-level unique constraint and rely on `upsert` with proper conflict handling. Alternatively, restore the named unique index on `(sessionId, listenItemId)` so the DB enforces deduplication.

---

### WR-03: `bfa-service` `/score-semantic` performs no input length or sanity validation

**File:** `bfa-service/main.py:32-57`
**Issue:** The endpoint accepts `student_text` and `expected_text` as unbounded strings. Encoding arbitrarily long strings through `SentenceTransformer.encode()` is not only slow but can cause OOM on the worker process with no error surfaced to the caller. An attacker or buggy client sending multi-megabyte text payloads can crash the bfa-service worker.

**Fix:** Add length guards at the endpoint level:

```python
MAX_TEXT_LEN = 2000
if len(student_text) > MAX_TEXT_LEN or len(expected_text) > MAX_TEXT_LEN:
    return {"semantic_score": 0.0, "matched_keywords": []}
```

---

### WR-04: `bfa-service` `/score-semantic` does not validate that `keywords` is a JSON array

**File:** `bfa-service/main.py:40`
**Issue:**

```python
kw_list: list[str] = json.loads(keywords)
```

If `keywords` is not valid JSON, this raises an unhandled `json.JSONDecodeError`, returning a 500 to the NestJS caller. The NestJS side catches the error and falls back to `semanticScore = 0`, so functionally it degrades gracefully — but the 500 is avoidable and will pollute logs.

**Fix:**

```python
try:
    kw_list: list[str] = json.loads(keywords)
    if not isinstance(kw_list, list):
        kw_list = []
except json.JSONDecodeError:
    kw_list = []
```

---

### WR-05: `completeSession` score calculation for LISTEN type converts composite scores incorrectly when `listenResults` is empty

**File:** `backend/src/game/game.service.ts:502-507`
**Issue:**

```typescript
const listenResults = (session as any).listenResults ?? [];
const count = listenResults.length;
const scoreSum = listenResults.reduce((s: number, r: { compositeScore: number }) => s + r.compositeScore, 0);
avgScore = count > 0 ? (scoreSum / count) * 100 : 0;
```

If a student completes the session without submitting any answers (unlikely but possible via direct `POST /game/session/:id/complete`), `count = 0` and `avgScore = 0`. That is technically correct but the zero score is silently persisted without any indication of why. More importantly, `session.listenResults` is cast via `as any` — if the shape of `listenResults` differs from `{ compositeScore: number }` (e.g., the DB returns camelCase `compositeScore` but the field is actually stored as a Decimal that Prisma might return as a `Prisma.Decimal`), the arithmetic produces `NaN` which is silently stored as `0` after `Math.round`.

**Fix:** Add a type assertion or map the value: `r.compositeScore` should be converted to a plain number (`Number(r.compositeScore)`) to guard against Prisma Decimal objects.

---

### WR-06: Frontend `ListenCreationPage` does not validate `expectedText` field before save

**File:** `frontend/app/teacher/homework/_components/ListenCreationPage.tsx:337-345`
**Issue:** The `validate()` function checks `audioUrl` and `keywords` but not `expectedText`:

```typescript
function validate(): string | null {
  if (!name.trim()) return 'Homework name is required.';
  if (items.length === 0) return 'Add at least one question.';
  for (const item of items) {
    if (!item.audioUrl) return 'Each question needs an audio file.';
    if (!item.keywords.trim()) return 'Each question needs keywords.';
    // expectedText is NOT checked
  }
  return null;
}
```

An empty `expectedText` will pass client-side validation. The server rejects it (`BadRequestException`) but the error is surfaced only after the API call, providing a poor UX. The semantic score is meaningless without an expected text.

**Fix:** Add the missing check:

```typescript
if (!item.expectedText.trim()) return 'Each question needs an expected answer.';
```

---

## Info

### IN-01: Duplicate interface declarations for `VocabItem`, `CreateVocabItemInput`, `CreateVocabHomeworkInput`, `UpdateVocabHomeworkInput`, and `VocabHomeworkDetail` in `admin-api.ts`

**File:** `frontend/lib/admin-api.ts:303-335` and again at `frontend/lib/admin-api.ts:595-627`
**Issue:** All five vocab-related interfaces are declared twice in the same file. TypeScript does not throw an error for duplicate interface declarations (they are merged), but duplicate declarations are a maintenance hazard — updates to one copy may not be reflected in the other.

**Fix:** Remove the duplicate block at lines 595–627 and keep only the earlier declarations at lines 303–335.

---

### IN-02: Audio `ogg` MIME type is accepted on upload but extension is mapped to `webm`

**File:** `backend/src/homework/homework.controller.ts:57-59`
**Issue:**

```typescript
const ext = file.mimetype.includes('mpeg') || file.mimetype.includes('mp3') ? 'mp3'
  : file.mimetype.includes('wav') ? 'wav' : 'webm';
```

`audio/ogg` is in `ALLOWED_AUDIO_MIME` but the ternary falls through to `'webm'`, storing an `.ogg` file with a `.webm` extension. This may confuse some audio players.

**Fix:** Add an explicit ogg case:

```typescript
const ext = file.mimetype.includes('mpeg') || file.mimetype.includes('mp3') ? 'mp3'
  : file.mimetype.includes('wav') ? 'wav'
  : file.mimetype.includes('ogg') ? 'ogg'
  : 'webm';
```

---

### IN-03: `stopRecording()` guard timeout fires after 2 s even on successful stop

**File:** `frontend/app/game/listen/[id]/page.tsx:139-151`
**Issue:** A 2-second fallback `setTimeout` is set unconditionally and is only cancelled in `onstop`. If `recorder.stop()` succeeds and fires `onstop` promptly, the timeout is correctly cleared. But if there is a race between `onstop` and the guard, `resolve` can be called twice (once from `onstop`, once from `setTimeout`). A `Promise` ignores subsequent `resolve` calls after the first, so there is no functional bug — but the stale timer will hold a reference to `chunks` for up to 2 s after the promise has settled.

**Fix:** Declare the guard after setting `onstop`, and always `clearTimeout(guard)` in `onstop` (already done). The existing code is correct in this regard; the concern is cosmetic. No change strictly required, but `clearTimeout(guard)` should also be called in the `catch` branch (already present at line 148). This is informational only.

---

_Reviewed: 2026-06-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
