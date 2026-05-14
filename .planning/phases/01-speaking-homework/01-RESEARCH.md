# Phase 1: Speaking Homework (Continuation) — Research

**Researched:** 2026-05-14
**Domain:** NestJS backend, FastAPI BFA service, Next.js 14 frontend, Prisma ORM
**Confidence:** HIGH (all findings verified by direct file inspection)

## Summary

Phase 1 T-01 through T-10 from PLAN.md are complete and confirmed by SUMMARY.md. However CONTEXT.md was updated on 2026-05-14 with decisions D-11 through D-24 that were NOT covered by the original plan. This research inspects every affected file to document the exact current state and the precise delta needed to satisfy those new decisions.

The bulk of remaining work falls into four buckets:

1. **Scoring fix** — `calcFreeSpeak` uses bare `includes()` (D-05 requires word-boundary regex + Levenshtein fallback). Code confirmed at `game.scoring.ts` lines 75-76.
2. **BFA service improvements** — `main.py` still calls `whisperx.align()` in `/transcribe` (D-20), has no file size/duration cap (D-21), `espeak_phonemes()` is synchronous in async handler (D-23). `bfa.service.ts` MIME mapping is minimal (D-22). All confirmed by direct file inspection.
3. **Teacher try mode** — `try/page.tsx` is fully camera/SpeechRecognition based (D-13/D-14 require file-upload + real BFA call). No speaking-type branch exists. Confirmed.
4. **Commit untracked files** — Several modified/new files sit untracked: `image.controller.ts`, `bfa.service.ts`, `bfa.dto.ts`, `main.py`, `Dockerfile`, `teacher/homework/[id]/page.tsx`, game controller/dto/repository/spec, and stale migrations must be deleted (D-24).

Additional gaps: `WhisperXResult` interface still has `words: WhisperXWord[]` (D-20 says drop alignment, return `{text: string}` only), and the FREE_SPEAK student result screen (D-16) does not show image or "Keywords matched: N/N" line.

**Primary recommendation:** Plan a focused continuation with 9 tasks covering scoring fix, BFA improvements, try-mode rewrite, result screen update, and the commit/cleanup work.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Two modes — `FREE_SPEAK` and `SCRIPT_MATCH`. Explicit `speakingMode` enum on `Homework`.
- D-02: Free-speak: image prompt + comma-separated keywords in `speakingText`.
- D-03: Script-matching: `calcSpeakingScore` unchanged.
- D-04: Free-speak formula: `round((matched / total) * 100)`.
- D-05: Keyword matching: word-boundary regex `/\bkeyword\b/`; fuzzy Levenshtein >= 0.75 fallback. Replace bare `includes()`.
- D-06: `calcSpeakingScore` stays unchanged.
- D-07: File upload only (`<input type="file" accept="video/*,audio/*">`). No MediaRecorder.
- D-08: MinIO key `speaking/{sessionId}/recording.{ext}`.
- D-09: PHONICS unchanged.
- D-10: Teacher creation modal: mode selector for SPEAKING type.
- D-11: Teacher session detail: mode badge, transcript, score %, video playback via streaming endpoint.
- D-12: Teacher homework detail redesign committed as Phase 1 (already done in untracked file).
- D-13: Teacher try mode uses file-upload, not SpeechRecognition.
- D-14: Try mode calls BFA/WhisperX for real score.
- D-15: Try mode preview only — no session saved.
- D-16: FREE_SPEAK result screen: image prompt prominently, score %, "Keywords matched: N/N".
- D-17: SCRIPT_MATCH result: score + transcript only.
- D-18: `image.controller.ts` committed as Phase 1.
- D-19: WhisperX model stays `small`.
- D-20: Remove `whisperx.align()` from `/transcribe`. Return `{text: string}` only.
- D-21: 5-minute / 100MB cap on `/transcribe`.
- D-22: Fix MIME mapping in `bfa.service.ts`: `audio/m4a→m4a`, `video/quicktime→mov`, `audio/ogg→ogg`, `audio/aac→aac`.
- D-23: Fix `espeak_phonemes()` blocking call — wrap with `asyncio.to_thread()`.
- D-24: Delete stale migration folders 20260507000003 through 20260509000001 (5 folders).

### Claude's Discretion
- Keyword highlight in transcript on teacher view.
- Specific Levenshtein implementation: reuse `levenshtein()` from `game.scoring.ts`.

### Deferred Ideas (OUT OF SCOPE)
- Live browser recording (MediaRecorder) for students.
- Multiple speaking items per session.
- Student re-record before submit.
- Word-level transcript highlighting in teacher results.
- Larger WhisperX model.
- Word-by-word SCRIPT_MATCH breakdown for students.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPEAK-01 | Teacher creates free-speak homework | Already implemented (T-08). No new work. |
| SPEAK-02 | Teacher creates script-match homework | Already implemented (T-08). No new work. |
| SPEAK-03 | Student records + uploads video | Upload flow done (T-09). Result screen needs D-16 update. |
| SPEAK-04 | Student can upload audio-only | Already implemented. |
| SPEAK-05 | System submits to WhisperX, stores transcript | BFA improvements (D-20/D-21/D-22/D-23) improve this. |
| SPEAK-06 | System scores transcript, stores score | D-05 scoring fix required. |
| SPEAK-07 | Teacher views score + transcript | Session detail complete. Try mode (D-13/D-14) needs rewrite. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Keyword scoring (D-05) | API / Backend | — | Pure computation in `game.scoring.ts` server-side |
| File-size/duration cap (D-21) | BFA Python Service | API / Backend | FastAPI rejects before processing; NestJS limit already at 100MB in controller |
| MIME extension mapping (D-22) | API / Backend | — | `bfa.service.ts` builds FormData with extension |
| espeak async fix (D-23) | BFA Python Service | — | FastAPI async handler wraps blocking subprocess |
| Try-mode file upload + real score (D-13/D-14) | Browser / Client | API / Backend | Frontend uploads file; backend `/transcribe` scores it without saving session |
| FREE_SPEAK result screen (D-16) | Browser / Client | — | Frontend renders image + keyword match count |
| Video streaming (D-11) | API / Backend | — | `GET /game/session/:id/recording` already implemented; frontend already uses it |
| Image serving (D-18) | API / Backend | — | `image.controller.ts` already written, just needs committing |
| Stale migration cleanup (D-24) | Database / Storage | — | Delete 5 untracked folders from `backend/prisma/migrations/` |

---

## Standard Stack

All libraries confirmed already in use. No new dependencies needed.

### Core (VERIFIED: direct file inspection)
| Library | Purpose | Notes |
|---------|---------|-------|
| NestJS (backend) | API framework | `game.service.ts`, `bfa.service.ts` |
| Prisma | ORM / migrations | `schema.prisma`, `game.repository.ts` |
| Next.js 14 (frontend) | React SSR framework | all `page.tsx` files |
| FastAPI (bfa-service) | Python API | `main.py` |
| whisperx | Speech transcription | `main.py` lines 364-384 |
| axios + FormData | HTTP client for BFA | `bfa.service.ts` |
| asyncio | Python async runtime | needed for D-23 fix |

### No New Installations Required
All changes are logic edits to existing files. No `npm install` or `pip install` needed.

---

## Architecture Patterns

### Try Mode: File-Upload + Real Score (No Session)
The try-mode rewrite (D-13/D-14/D-15) must call the BFA service directly without going through `saveSpeakingResult` (which requires a real session in DB). The pattern is:

1. Frontend: replace entire camera/SpeechRecognition try page with a file-upload page mirroring the student `upload` state.
2. Backend: add a new endpoint `POST /game/homework/:id/try-speak` (or reuse a pattern) that accepts a file, calls `BfaService.transcribe()`, runs scoring, and returns `{ score, matchedWords, totalWords, transcribedText }` without touching the DB.
3. Alternatively: call the BFA service URL directly from the frontend — but this bypasses auth and exposes the BFA URL. Use a dedicated NestJS endpoint.

The cleanest pattern matching this codebase: new controller endpoint on `GameController`:
```typescript
// [VERIFIED: game.controller.ts pattern]
@Post('homework/:id/try-speak')
@UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 100 * 1024 * 1024 } }))
trySpeak(
  @Param('id', ParseIntPipe) id: number,
  @UploadedFile() audio?: Express.Multer.File,
) {
  return this.service.trySpeakingHomework(id, audio?.buffer, audio?.mimetype);
}
```

Service method fetches the homework (by ID, not session), transcribes, scores, returns result without DB write.

### D-05: Keyword Matching Algorithm
Current `calcFreeSpeak` (confirmed at `game.scoring.ts` line 75):
```typescript
const matched = kws.filter((kw) => text.includes(kw)).length;  // WRONG — bare includes()
```

Required pattern per D-05:
```typescript
// [ASSUMED: algorithm design from CONTEXT.md specification]
function matchKeyword(transcript: string, keyword: string): boolean {
  // Step 1: word-boundary regex
  const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (pattern.test(transcript)) return true;
  // Step 2: Levenshtein fuzzy fallback at >= 0.75
  const words = transcript.toLowerCase().split(/\s+/).filter(Boolean);
  return words.some((w) => {
    const sim = 1 - levenshtein(w, keyword) / Math.max(w.length, keyword.length);
    return sim >= 0.75;
  });
}
```
Reuse existing `levenshtein()` from `game.scoring.ts` — it is already exported.

### D-20: Remove whisperx.align() from /transcribe
Current `/transcribe` in `main.py` (confirmed lines 367-384): loads `get_whisperx_align_model()`, calls `whisperx.align()`, iterates `result["segments"]` for word timestamps, returns `{"text": ..., "words": [...]}`.

After D-20: skip the align model load entirely. Text is obtained from `model.transcribe()` directly:
```python
# [VERIFIED: main.py lines 363-365 already have this]
model = get_whisperx_model()
audio_data = whisperx.load_audio(str(wav_path))
result = model.transcribe(audio_data, batch_size=16, language="en")
text = " ".join(s.get("text", "").strip() for s in result.get("segments", []))
return {"text": text.strip()}
# Delete everything from line 367 (model_a, metadata = ...) through end
```

`WhisperXResult` in `bfa.dto.ts` must drop the `words: WhisperXWord[]` field (or make it optional) — but backend doesn't use `words` for speaking, so making it optional `words?: WhisperXWord[]` is safest.

### D-21: File Size/Duration Cap
```python
# [ASSUMED: pattern consistent with FastAPI File() handling]
MAX_SIZE_BYTES = 100 * 1024 * 1024  # 100MB
MAX_DURATION_SECONDS = 300  # 5 minutes

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    # Check Content-Length header first (fast path)
    if audio.size and audio.size > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 100MB)")
    content = await audio.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 100MB)")
    # After converting to wav, check duration via ffprobe or read wav header
```
Duration check: run `ffprobe` after wav conversion to check duration, or use `ffmpeg` output which already runs for conversion.

### D-22: MIME Extension Mapping Fix
Current `bfa.service.ts` ext logic (confirmed lines 18 and 33):
```typescript
const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav';
```

Required:
```typescript
// [VERIFIED: gap confirmed from bfa.service.ts inspection]
function mimeToExt(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('quicktime')) return 'mov';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('aac')) return 'aac';
  return 'wav';
}
```
Apply to both `align()` and `transcribe()` methods.

### D-23: espeak Async Fix
Current `espeak_phonemes()` (confirmed `main.py` lines 101-133): synchronous `subprocess.run()` called directly in async handler. Fix:
```python
# [CITED: Python asyncio.to_thread docs — Python 3.9+]
import asyncio

async def espeak_phonemes_async(word: str) -> list[str]:
    return await asyncio.to_thread(espeak_phonemes, word)
```
Call `await espeak_phonemes_async(word)` inside the `/align` endpoint where `espeak_phonemes(word)` is currently called (line 256).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Levenshtein distance | Custom implementation | `levenshtein()` in `game.scoring.ts` | Already correct, tested, reused by `calcSpeakingScore` |
| MIME type extension mapping | Regex soup | Simple if-chain helper function | ffmpeg handles actual conversion regardless of extension — extension is just filename hint |
| Duration checking | Custom WAV parser | ffprobe subprocess (same pattern as ffmpeg already used) | Already have ffmpeg in Docker image |

---

## Gap Analysis: Decisions vs. Current Code

### Already Done (no work needed)

| Decision | Status | Evidence |
|----------|--------|----------|
| D-01: `speakingMode` enum in DB | DONE | `schema.prisma` has `SpeakingMode` enum |
| D-02: FREE_SPEAK keywords | DONE | `calcFreeSpeak` exists in `game.scoring.ts` |
| D-03: SCRIPT_MATCH unchanged | DONE | `calcSpeakingScore` untouched |
| D-04: Score formula | DONE | `game.scoring.ts` line 77 |
| D-06: `calcSpeakingScore` unchanged | DONE | Confirmed |
| D-07: File upload | DONE | Student session `upload` state in `session/[id]/page.tsx` |
| D-08: MinIO key pattern | DONE | `game.service.ts` line 141 |
| D-09: PHONICS unchanged | DONE | Separate code paths |
| D-10: Teacher creation modal | DONE | `teacher/homework/page.tsx` has mode selector |
| D-11: Mode badge in session detail | DONE | `session/[sessionId]/page.tsx` lines 117-125 |
| D-11: Video streaming endpoint | DONE | `GET /game/session/:id/recording` in `game.controller.ts` lines 61-73 |
| D-11: Video playback via streaming | DONE | `session/[sessionId]/page.tsx` lines 33-40 fetches blob via auth |
| D-12: Teacher detail redesign | DONE (untracked) | `teacher/homework/[id]/page.tsx` has Open/Closed badge, completion count, delete button, SPEAKING picture+text |

### Remaining Work (concrete gaps)

| Decision | Gap | File(s) | Complexity |
|----------|-----|---------|------------|
| D-05 | `calcFreeSpeak` uses bare `includes()` — must replace with word-boundary regex + Levenshtein fallback | `backend/src/game/game.scoring.ts` | Low |
| D-13/D-14 | Teacher try page uses camera + SpeechRecognition — must be rewritten as file-upload + real BFA call | `frontend/app/teacher/homework/[id]/try/page.tsx`, new backend endpoint | Medium |
| D-15 | Try mode calls real BFA but must not create a DB session — needs new stateless endpoint | `backend/src/game/game.controller.ts`, `game.service.ts` | Low-Medium |
| D-16 | Student result screen for SPEAKING doesn't show image or "Keywords matched: N/N" | `frontend/app/game/session/[id]/page.tsx` results section | Low |
| D-18 | `image.controller.ts` is new and untracked — needs committing | `backend/src/homework/image.controller.ts` | Trivial (commit only) |
| D-20 | `/transcribe` in `main.py` still calls `whisperx.align()` and returns `words[]` | `bfa-service/main.py`, `backend/src/bfa/bfa.dto.ts` | Low |
| D-21 | No file size/duration cap on `/transcribe` | `bfa-service/main.py` | Low |
| D-22 | MIME mapping in `bfa.service.ts` is incomplete | `backend/src/bfa/bfa.service.ts` | Low |
| D-23 | `espeak_phonemes()` is sync in async `/align` handler | `bfa-service/main.py` | Low |
| D-24 | 5 stale migration folders exist untracked — must be deleted | `backend/prisma/migrations/20260507000003` through `20260509000001` | Trivial |

### Untracked Files to Commit (git staging work)

| File | Status | Action |
|------|--------|--------|
| `backend/src/homework/image.controller.ts` | New, untracked | Commit as-is (logic already correct) |
| `backend/src/bfa/bfa.service.ts` | Modified (untracked changes) | Commit after D-22 fix |
| `backend/src/bfa/bfa.dto.ts` | Modified (untracked changes) | Commit after D-20 fix (drop `words` or make optional) |
| `bfa-service/main.py` | Modified (untracked changes) | Commit after D-20/D-21/D-23 fixes |
| `bfa-service/Dockerfile` | Modified (untracked changes) | Commit as-is |
| `frontend/app/teacher/homework/[id]/page.tsx` | Modified (untracked redesign) | Commit as-is |
| `frontend/app/teacher/homework/[id]/try/page.tsx` | Modified (untracked — still old camera flow) | Commit after D-13/D-14 rewrite |
| `backend/src/game/game.controller.ts` | Modified (untracked) | Commit as-is after adding try-speak endpoint |
| `backend/src/game/game.dto.ts` | Modified (untracked) | Commit as-is |
| `backend/src/game/game.repository.ts` | Modified (untracked) | Commit as-is |
| `backend/src/game/game.service.spec.ts` | Modified (untracked) | Commit after updating mock for `speakingMode` |

---

## Common Pitfalls

### Pitfall 1: Regex Escaping in Word-Boundary Match
**What goes wrong:** Keywords with special regex characters (e.g., "cat." or "isn't") cause `new RegExp()` to throw or match incorrectly.
**Why it happens:** User-supplied keyword strings are passed directly into `RegExp` constructor.
**How to avoid:** Escape the keyword with `keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` before wrapping in `\b...\b`.
**Warning signs:** Test with keyword "cat." and ensure no exception is thrown.

### Pitfall 2: Try Mode — Fetching Homework Without a Session
**What goes wrong:** The try-mode endpoint needs homework data (speakingText, speakingMode, speakingPictureUrl) but no session exists. The current `getSession()` path cannot be used.
**Why it happens:** All existing scoring paths start from a session ID.
**How to avoid:** Add a distinct `trySpeakingHomework(homeworkId, buffer, mimeType)` method in `GameService` that calls `HomeworkRepository.findById()` directly (or `homework.service`) to load the homework, then transcribes and scores without touching the session table.
**Warning signs:** If you try to pass `homeworkId` as a session ID, `getSession()` will throw NotFoundException.

### Pitfall 3: `whisperx.align()` Model Still Loaded After D-20
**What goes wrong:** Even after removing the `whisperx.align()` call, the `get_whisperx_align_model()` cache function and the globals `_whisperx_align_model` / `_whisperx_metadata` remain. If they are still called anywhere (lazy init), they consume significant startup time.
**How to avoid:** Remove `get_whisperx_align_model()` function AND remove `_whisperx_align_model` / `_whisperx_metadata` globals from `main.py` entirely (only relevant if no other endpoint uses them — `/align` endpoint does not call them, confirmed by inspection).
**Warning signs:** Startup logs showing alignment model loading.

### Pitfall 4: D-16 Result Screen — speakHw State Not Available at Results Time
**What goes wrong:** The student result screen uses `items` state but `speakHw` (containing `speakingPictureUrl` and `speakingMode`) is stored in a separate state variable. The `handleSpeakingUpload` function already populates `items[0].pictureUrl` (confirmed `session/[id]/page.tsx` line 352). However, the results rendering loop at line 552 uses a generic speaking branch that doesn't display image or keyword count.
**How to avoid:** In the `pageState === 'results'` block, when `item.kind === 'speaking'` and `speakHw?.speakingMode === 'FREE_SPEAK'`, show `item.pictureUrl` prominently and display `r.matchedWords`/`r.totalWords` (available from `SpeakingResult` response). These values are already on the `SpeakingResult` object stored via `saveSpeakingResult` response.
**Warning signs:** Check that `speakHw` is not null at results render time (it's set on initial load and not cleared).

### Pitfall 5: Stale Migration Folders Conflict with Prisma
**What goes wrong:** Deleting untracked migration folders while `migration_lock.toml` references only committed migrations is safe. But if any of the 5 stale folders (20260507000003 through 20260509000001) contain SQL that Prisma has NOT applied (because they were exploratory/not committed), deleting them is safe. If they were applied to a dev DB, Prisma will complain about drift on next `migrate dev`.
**How to avoid:** Verify with `npx prisma migrate status` before deleting — if the stale migrations show "not applied" or "not in migration history", deletion is safe. The CONTEXT.md confirms they are "stale exploratory history" never committed.
**Warning signs:** `prisma migrate status` shows unexpected applied migrations.

---

## Code Examples

### Current calcFreeSpeak (confirmed, needs replacement)
```typescript
// [VERIFIED: backend/src/game/game.scoring.ts lines 65-81]
// BUG: uses bare text.includes(kw) — "catapult" matches keyword "cat"
const matched = kws.filter((kw) => text.includes(kw)).length;
```

### Required calcFreeSpeak (D-05 fix)
```typescript
// [ASSUMED: algorithm from CONTEXT.md D-05 specification]
// Reuses existing exported levenshtein() in same file
function matchesKeyword(transcript: string, kw: string): boolean {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\b${escaped}\\b`, 'i').test(transcript)) return true;
  const words = transcript.toLowerCase().split(/\s+/).filter(Boolean);
  return words.some((w) => {
    const maxLen = Math.max(w.length, kw.length);
    if (maxLen === 0) return false;
    return (1 - levenshtein(w, kw) / maxLen) >= 0.75;
  });
}
```

### Try-Speak Backend Endpoint Pattern
```typescript
// [ASSUMED: pattern consistent with existing game.controller.ts]
@Post('homework/:id/try-speak')
@UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 100 * 1024 * 1024 } }))
trySpeakingHomework(
  @Param('id', ParseIntPipe) hwId: number,
  @UploadedFile() audio?: Express.Multer.File,
) {
  return this.service.trySpeakingHomework(hwId, audio?.buffer, audio?.mimetype);
}
```

### BFA /transcribe After D-20 (simplified)
```python
# [ASSUMED: simplification from current main.py lines 342-386]
@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    content = await audio.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 100MB limit")
    work_dir = Path(tempfile.mkdtemp(prefix="whisperx_"))
    try:
        suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
        raw_path = work_dir / f"input{suffix}"
        raw_path.write_bytes(content)
        wav_path = work_dir / "input.wav"
        conv = subprocess.run(
            ["ffmpeg", "-i", str(raw_path), "-ar", "16000", "-ac", "1",
             "-t", "300", "-y", str(wav_path)],  # -t 300 = 5min cap
            capture_output=True, timeout=30,
        )
        if conv.returncode != 0:
            raise HTTPException(status_code=400, detail="Audio conversion failed")
        if not has_sufficient_energy(wav_path):
            return {"text": ""}
        model = get_whisperx_model()
        audio_data = whisperx.load_audio(str(wav_path))
        result = model.transcribe(audio_data, batch_size=16, language="en")
        text = " ".join(s.get("text", "").strip() for s in result.get("segments", []))
        return {"text": text.strip()}
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
```
Note: `-t 300` in ffmpeg command enforces the 5-minute cap at conversion time (simpler than ffprobe duration check).

---

## Runtime State Inventory

This is not a rename/refactor phase, but there is state relevant to the DB migration cleanup (D-24):

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Prisma `migrations` table in dev DB may have applied some stale migrations | Run `npx prisma migrate status` before deleting; if stale folders show as applied, dev DB may need reset |
| Live service config | None — BFA service has no external state | None |
| OS-registered state | None | None |
| Secrets/env vars | None affected by these changes | None |
| Build artifacts | None — no compiled binaries for these files | None |

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Node.js / NestJS | Backend changes | Assumed available (existing project) | [ASSUMED] |
| Python 3.11 / FastAPI | BFA service changes | Confirmed in Dockerfile (`FROM python:3.11-slim`) | [VERIFIED: bfa-service/Dockerfile] |
| whisperx | D-20 changes | Confirmed installed in Docker image | [VERIFIED: bfa-service/Dockerfile] |
| asyncio.to_thread | D-23 | Available in Python 3.9+ | [ASSUMED: Python 3.11 confirmed] |
| ffmpeg -t flag | D-21 duration cap | Standard ffmpeg flag | [ASSUMED: ffmpeg in Docker confirmed] |
| `npx prisma` | D-24 migration cleanup | Available | [ASSUMED: existing project] |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (NestJS backend), `game.service.spec.ts` |
| Config file | `backend/package.json` (jest config) |
| Quick run command | `cd backend && npx jest game.service.spec.ts --no-coverage` |
| Full suite command | `cd backend && npx jest --no-coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPEAK-06 (D-05) | `calcFreeSpeak` word-boundary regex + fuzzy | unit | `cd backend && npx jest game.service.spec.ts -t "calcFreeSpeak" --no-coverage` | Need to add test cases to existing spec |
| D-14 | Try mode scores correctly (no DB write) | unit | `cd backend && npx jest game.service.spec.ts -t "trySpeakingHomework" --no-coverage` | Need new describe block |
| D-22 | MIME mapping produces correct extensions | unit | `cd backend && npx jest bfa.service.spec.ts --no-coverage` | May need new spec file |

### Wave 0 Gaps
- `game.service.spec.ts` — add `calcFreeSpeak` test cases for D-05 (word-boundary, fuzzy, exact)
- `game.service.spec.ts` — add `trySpeakingHomework` describe block for D-14/D-15
- `bfa.service.spec.ts` — create if needed for D-22 MIME mapping unit test (optional: low risk)

---

## Security Domain

No new auth surfaces. All new endpoints (`/game/homework/:id/try-speak`) must use the existing `@UseGuards(AuthGuard)` decorator — confirmed pattern in `game.controller.ts` line 11. `image.controller.ts` already has `StorageService` (no public endpoint without auth in existing pattern). No new security concerns beyond what T-01 through T-10 already addressed.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes — new try-speak endpoint | `@UseGuards(AuthGuard)` — existing pattern |
| V5 Input Validation | yes — file size cap | D-21 FastAPI 413 rejection |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `asyncio.to_thread()` available in Python 3.9+ (project runs 3.11) | D-23 fix | None — Dockerfile confirms Python 3.11 |
| A2 | ffmpeg `-t 300` flag enforces duration cap at decode time | D-21 approach | Low — worst case, file exceeds 5min but gets processed; alternative is ffprobe check |
| A3 | `trySpeakingHomework` service method can call `HomeworkService` or `HomeworkRepository` directly | D-13/D-15 backend | Low — existing injection patterns support this |
| A4 | Dev DB migration history is clean (stale folders not applied) | D-24 cleanup | Medium — if some stale migrations ran on dev DB, deleting folders causes drift |

---

## Open Questions

1. **Try-mode endpoint: which module?**
   - What we know: `GameController` is the natural home; requires `HomeworkService` or `HomeworkRepository` injected into `GameService`.
   - What's unclear: whether `GameModule` already imports `HomeworkService` or needs to add it.
   - Recommendation: check `game.module.ts` during implementation; if not imported, inject `PrismaService` directly in `GameService` for a single `findUnique` call.

2. **Stale migration DB state**
   - What we know: 5 folders are untracked (not committed to git). CONTEXT.md says delete them.
   - What's unclear: whether developer's local DB has them applied.
   - Recommendation: plan task includes `npx prisma migrate status` check step before deletion.

3. **`bfa.dto.ts` `WhisperXResult.words` field**
   - What we know: `WhisperXResult` currently has `words: WhisperXWord[]` (required). After D-20, BFA returns only `{text: string}`.
   - What's unclear: whether any frontend code reads `.words` from the transcribe result.
   - Recommendation: make `words` optional (`words?: WhisperXWord[]`) rather than deleting — safer migration. Frontend inspection shows `admin-api.ts` has no `WhisperXResult` type exposed to frontend (BFA is backend-only), so change is safe.

---

## Sources

### Primary (HIGH confidence — direct file inspection)
- `backend/src/game/game.scoring.ts` — current `calcFreeSpeak` implementation confirmed
- `bfa-service/main.py` — confirmed `whisperx.align()` call, sync `espeak_phonemes`, no file cap
- `backend/src/bfa/bfa.service.ts` — confirmed minimal MIME mapping
- `backend/src/bfa/bfa.dto.ts` — confirmed `words: WhisperXWord[]` field exists
- `frontend/app/teacher/homework/[id]/try/page.tsx` — confirmed full camera/SpeechRecognition implementation (no file-upload path)
- `frontend/app/game/session/[id]/page.tsx` — confirmed upload flow done; result screen missing D-16 elements
- `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx` — confirmed mode badge and streaming video done
- `frontend/app/teacher/homework/[id]/page.tsx` — confirmed redesign already in untracked file
- `backend/src/homework/image.controller.ts` — confirmed complete, just untracked
- `backend/prisma/migrations/` — confirmed 5 stale folders present

### Secondary (MEDIUM confidence)
- `frontend/lib/admin-api.ts` — `saveSpeakingResult` and `SpeakingResult` types confirmed; `WhisperXResult` not exposed to frontend
- `backend/src/game/game.controller.ts` — streaming endpoint and speaking-result endpoint confirmed
- `.planning/phases/01-speaking-homework/01-CONTEXT.md` — all decisions sourced from here

---

## Metadata

**Confidence breakdown:**
- Gap analysis: HIGH — every gap verified by direct file read
- Algorithm patterns (D-05, D-20, D-21): MEDIUM — logic correct, exact line placement confirmed by inspection
- Architecture (try-mode endpoint): MEDIUM — pattern matches existing code; module injection TBD
- Stale migration safety: MEDIUM — depends on dev DB state (A4 assumption)

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (stable stack, no fast-moving dependencies)
