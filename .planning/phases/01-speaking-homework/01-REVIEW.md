---
phase: 01-speaking-homework
reviewed: 2026-05-22T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - backend/src/bfa/bfa.dto.ts
  - backend/src/bfa/bfa.service.ts
  - backend/src/game/game.controller.ts
  - backend/src/game/game.scoring.ts
  - backend/src/game/game.service.spec.ts
  - backend/src/game/game.service.ts
  - bfa-service/main.py
  - frontend/app/game/session/[id]/page.tsx
  - frontend/app/teacher/homework/[id]/try/page.tsx
  - frontend/lib/admin-api.ts
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 01: Speaking Homework — Code Review Report

**Reviewed:** 2026-05-22
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

This review covers the speaking-homework feature: the BFA Python service (`bfa-service/main.py`),
its NestJS client (`bfa.service.ts`), the game session service and controller (`game.service.ts`,
`game.controller.ts`, `game.scoring.ts`), unit tests (`game.service.spec.ts`), two frontend pages
(session player, teacher try-speak preview), shared type/API definitions (`admin-api.ts`), and DTOs
(`bfa.dto.ts`).

One critical authorization gap was found: the teacher-only "try-speak" endpoint is accessible to
any authenticated user including students, because the controller method lacks a `TeacherGuard`.
Four warnings cover a MIME-type inconsistency that silently degrades audio handling for real-world
devices (m4a, ogg, aac), a missing idempotency guard on `completeSession`, an unguarded
non-null assertion in the frontend that propagates an unhandled exception, and the fact that the
`analyze-speaking` service endpoint accepts a `FREE_SPEAK` mode that is never used by any
production caller. Two info items flag dead-code exports and the results-page `setPageState` call
that runs regardless of error state.

---

## Critical Issues

### CR-01: `POST /game/homework/:id/try-speak` accessible by all authenticated users — missing `TeacherGuard`

**File:** `backend/src/game/game.controller.ts:57`

**Issue:** The controller class carries `@UseGuards(AuthGuard)`, which allows any approved,
authenticated user — including students — to call `POST /game/homework/:id/try-speak`. The
endpoint is semantically a teacher-only preview tool: it invokes BFA transcription against any
homework without recording results. A student can therefore call it to (a) probe any homework's
speaking text, (b) consume BFA compute and the 100 MB upload quota at will, and (c) confirm
whether their pronunciation scores above a threshold before committing an official attempt.

Only `GET /game/sessions` (line 85) has the additional `@UseGuards(TeacherGuard)` applied at
method level. The try-speak endpoint does not.

**Fix:**
```typescript
@Post('homework/:id/try-speak')
@UseGuards(TeacherGuard)          // add this line
@UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 100 * 1024 * 1024 } }))
trySpeakingHomework(
  @Param('id', ParseIntPipe) hwId: number,
  @UploadedFile() audio?: Express.Multer.File,
) {
  return this.service.trySpeakingHomework(hwId, audio?.buffer, audio?.mimetype);
}
```

---

## Warnings

### WR-01: `analyze()` and `analyzeSpeaking()` in `BfaService` use inline MIME-to-extension logic that misses four audio formats

**File:** `backend/src/bfa/bfa.service.ts:61,81`

**Issue:** `align()` and `transcribe()` correctly call the shared `mimeToExt()` helper (which
handles `webm`, `m4a`, `mp4`, `quicktime/mov`, `ogg`, and `aac`). However, `analyze()` (line 61)
and `analyzeSpeaking()` (line 81) each contain a duplicated inline ternary:

```typescript
const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav';
```

This silently assigns `.wav` for `audio/m4a`, `audio/ogg`, `audio/aac`, and `audio/quicktime`
inputs. The resulting file is named `audio.wav` but contains non-WAV encoded bytes. `ffmpeg`
(inside the BFA service) probes file headers rather than trusting the extension, so conversion
still succeeds in practice — but the mismatch is a latent error surface: it breaks if any layer
downstream (logging, caching, format-detection libraries) trusts the filename extension.

**Fix:** Replace both inline expressions with the existing helper:
```typescript
// analyze(), line 61
const ext = mimeToExt(mimeType);

// analyzeSpeaking(), line 81
const ext = mimeToExt(mimeType);
```

---

### WR-02: `completeSession` has no idempotency guard — double invocation overwrites the stored score

**File:** `backend/src/game/game.service.ts:235`

**Issue:** Every `save*Result` method guards against re-submission on a completed session
(`if (session.completedAt) throw BadRequestException`). `completeSession` has no equivalent
guard. `repo.completeSession` calls `prisma.homeworkSession.update({ data: { score, completedAt } })`
which always overwrites. This creates two risks:

1. A client retry or network-level duplicate delivers two `POST /game/session/:id/complete` calls
   within a short window. Both read the same session state, compute the same `avgScore`, and
   overwrite with identical data — functionally harmless today, but fragile.

2. More importantly: if a session is already complete and a caller (inadvertently or maliciously)
   submits another complete request, the `score` field is overwritten with whatever Prisma
   currently returns for `speakingResults[0].score` — including a 0 if that relation was
   populated by a later upsert with a different score.

**Fix:** Add an early-return guard mirroring the other methods:
```typescript
async completeSession(sessionId: number) {
  const session = await this.repo.getSession(sessionId);
  if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
  if (session.completedAt) return session;   // already complete — idempotent
  // ... rest unchanged
}
```

---

### WR-03: Unguarded non-null assertion on `session.assignment!.homework!` in session page

**File:** `frontend/app/game/session/[id]/page.tsx:107`

**Issue:** The fetch inside the `useEffect` initializer accesses:
```typescript
const hw = session.assignment!.homework!;
```

If the API returns a session whose `assignment` or `homework` is `null` (deleted homework, orphaned
session, schema inconsistency), the TypeScript non-null assertion bypasses the type system and
throws a runtime `TypeError: Cannot read properties of null`. This crashes the entire component
tree without a user-visible error message, because the `.catch(() => setPageState('error'))` on
line 131 does not catch errors thrown synchronously inside the `.then()` callback after `await`.

**Fix:** Defensive check inside the `.then()` before accessing nested relations:
```typescript
fetchSession(sessionId).then((session) => {
  const hw = session.assignment?.homework;
  if (!hw) { setPageState('error'); return; }
  // ... rest unchanged using hw
}).catch(() => setPageState('error'));
```

---

### WR-04: `analyze-speaking` endpoint in `bfa-service` accepts `mode=FREE_SPEAK` but the scoring logic for that mode is incorrect — and no production caller uses it

**File:** `bfa-service/main.py:962`

**Issue:** `_analyze_speaking_sync` receives a `mode` parameter. When `mode == 'SCRIPT_MATCH'` it
applies transcription-based re-scoring per word (lines 962–972). When `mode == 'FREE_SPEAK'` it
skips re-scoring, but it still runs full **ordered forced alignment** against the target text and
computes `overall_score` via weighted phoneme matching (lines 974–979). This produces a
structurally different score than `calcFreeSpeak` in `game.scoring.ts`, which does unordered
keyword-boundary matching.

In production, `game.service.ts` (line 87–98) never calls `bfa.analyzeSpeaking()` for
`FREE_SPEAK` homework — it uses `bfa.transcribe()` + `calcFreeSpeak()` instead. The
`FREE_SPEAK` path in the BFA service endpoint is therefore dead from the NestJS side, but it
remains callable by any client that POSTs `mode=FREE_SPEAK` directly to the BFA service.

If the service is ever routed to directly (e.g., in development, from a new caller, or through the
teacher try-speak which passes `mode` from the frontend), a student assessed in `FREE_SPEAK` mode
via this path would receive a forced-alignment score, which systematically under-scores free
speech (words out of expected order are penalised).

**Fix:** Either:
- Remove `FREE_SPEAK` from the `mode` parameter validation in `_analyze_speaking_impl` so it
  returns HTTP 400 for that value, preventing accidental use:
  ```python
  if mode != "SCRIPT_MATCH":
      raise HTTPException(status_code=400, detail="Only SCRIPT_MATCH mode is supported by this endpoint")
  ```
- Or implement correct keyword-boundary scoring for `FREE_SPEAK` to match `calcFreeSpeak`.

---

## Info

### IN-01: `calcScore` and `levenshtein` are exported from `game.scoring.ts` but never imported in production code

**File:** `backend/src/game/game.scoring.ts:1,21`

**Issue:** `levenshtein` (line 1) and `calcScore` (line 21) are exported symbols. Neither appears
in any `import` statement in production source files (`game.service.ts` imports only
`calcSpeakingScore` and `calcFreeSpeak`). They are imported in `game.service.spec.ts` for unit
tests, but that does not constitute production usage. Keeping them as exported production exports
falsely implies they are part of the module's API contract.

**Fix:** Remove the `export` keyword from both declarations (keep them as module-private helpers
available for testing via Jest's module resolution), or move them to a separate internal utilities
file if test coverage of the primitives is desired.

---

### IN-02: `handleSpeakingUpload` in session page always transitions to `pageState='results'` even on error, showing a confusing 0% screen

**File:** `frontend/app/game/session/[id]/page.tsx:327-348`

**Issue:** `setPageState('results')` (line 347) is placed after the `catch` block in
`handleSpeakingUpload`, so it runs regardless of whether the `try` block succeeded or threw.
When the upload fails: `results` is `null`, `items` is empty, the results page displays `0%`
(from `items.reduce` on an empty array), and the only signal is the small red text "Recording
could not be saved". There is no way for the student to retry the upload from this state.

This is not a data-loss bug (the upsert in `saveSpeakingResult` is transactional and the failing
path silently sets `saveError=true`), but it creates a confusing UX dead-end.

**Fix:** On upload failure, revert to the `upload` page state so the student can try again:
```typescript
} catch (err) {
  console.error('[speakUpload] failed:', err);
  setSaveError(true);
  setPageState('upload');   // allow retry instead of showing broken results
  return;
}
setPageState('results');
```

---

_Reviewed: 2026-05-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
