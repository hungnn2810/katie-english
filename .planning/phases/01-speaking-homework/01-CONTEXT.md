# Phase 1: Speaking Homework - Context

**Gathered:** 2026-05-14 (updated from 2026-05-13)
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver speaking homework end-to-end: teacher creates homework in one of two modes (free-speak or script-matching), student uploads a recorded video/audio file, system transcribes via WhisperX and scores the result, teacher views score + transcript. No browser-based MediaRecorder — student films on device and uploads. Teacher can also "try" the homework via the same upload flow (preview only, BFA scored, no session saved). Phase 1 also includes: image serving for speaking prompts, teacher homework detail redesign (assignment grouping + speaking content display), and BFA service quality improvements.

</domain>

<decisions>
## Implementation Decisions

### Speaking Modes

- **D-01:** Two modes — `FREE_SPEAK` and `SCRIPT_MATCH`. Explicit `speakingMode` enum field on `Homework` table. Do NOT infer mode from presence/absence of image.
- **D-02:** Free-speak mode: teacher sets image prompt (`speakingPictureUrl`) AND comma-separated keyword list (`speakingText`, e.g. `"cat, sits, mat"`). System checks how many keywords appear in transcript.
- **D-03:** Script-matching mode: teacher sets target text in `speakingText`. Existing `calcSpeakingScore` word-match scoring applies unchanged.

### Scoring

- **D-04:** Free-speak score formula: `round((matched_keywords / total_keywords) * 100)`. Stored as `score: Float` in `SpeakingResult`.
- **D-05:** Keyword matching: word-boundary regex (`/\bkeyword\b/`) — prevents "catapult" matching keyword "cat". If boundary match fails, fuzzy fallback at Levenshtein ≥ 0.75 — catches transcription errors like "set" → "sit". Replace the current bare `includes()` check.
- **D-06:** `calcSpeakingScore` (SCRIPT_MATCH) stays unchanged — already uses Levenshtein ≥ 0.7 word matching.

### Recording & Upload

- **D-07:** Student records off-device, uploads file. Upload UI: `<input type="file" accept="video/*,audio/*">`. One file per speaking session.
- **D-08:** Uploaded file stored in MinIO: `speaking/{sessionId}/recording.{ext}` via `StorageService.upload`.
- **D-09:** PHONICS flow completely unchanged.

### Teacher Creation Flow

- **D-10:** Teacher creation modal: mode selector (FREE_SPEAK / SCRIPT_MATCH) shown for SPEAKING type. FREE_SPEAK → "Keywords (comma-separated)" label + image field. SCRIPT_MATCH → "Target text" label, image optional.

### Teacher Results View

- **D-11:** Teacher session detail page (`/teacher/homework/[id]/session/[sessionId]`) shows: speaking mode badge (pink FREE_SPEAK / purple SCRIPT_MATCH), transcript, score as %, video playback via streaming endpoint.
- **D-12:** Teacher homework detail page (`/teacher/homework/[id]`) redesign committed as Phase 1: assignments grouped by class, Open/Closed status badge, completion count (N/M), due date, delete-assignment button. SPEAKING type shows picture + text.

### Teacher Try Mode

- **D-13:** Teacher try mode for speaking uses the same file-upload flow as students (not live SpeechRecognition).
- **D-14:** Try mode calls BFA/WhisperX for real score and transcript — teacher sees exactly what students experience.
- **D-15:** Try mode is preview only — no session created in DB. Existing "Preview Mode — Results not saved" banner stays.

### Student Result Screen

- **D-16:** FREE_SPEAK result screen shows: image prompt prominently, score as %, "Keywords matched: N/N" line. Does NOT show raw comma-separated keyword list.
- **D-17:** SCRIPT_MATCH result screen stays as-is: score + transcript. No word-by-word breakdown.

### Image Serving

- **D-18:** `image.controller.ts` (`GET /homework/image/:key`) committed as Phase 1 — needed for speaking picture prompt display in both teacher and student views.

### BFA Service Improvements

- **D-19:** WhisperX model stays `small` — keep current default.
- **D-20:** Skip word-level alignment in `/transcribe`: remove `whisperx.align()` call. Return `{text: string}` only (no `words[]`). Saves ~300–800ms per speaking submission. If word timestamps are needed in future, add a separate endpoint.
- **D-21:** Add 5-minute / 100MB cap on `/transcribe` uploads. Reject before processing.
- **D-22:** Fix MIME type extension mapping in `bfa.service.ts`: add explicit cases for `audio/m4a → m4a`, `video/quicktime → mov`, `audio/ogg → ogg`, `audio/aac → aac`.
- **D-23:** `espeak_phonemes()` subprocess runs blocking in async FastAPI handler. Fix: wrap with `asyncio.to_thread()`.

### Migrations

- **D-24:** Delete all 5 untracked migration folders (20260507000003 through 20260509000001) — stale exploratory history. Prisma schema is the source of truth. Committed migration `20260510000001_add_speaking_mode` reflects actual state.

### Claude's Discretion

- Keyword highlight in transcript on teacher view — Claude decides.
- Specific Levenshtein implementation (shared with existing `levenshtein()` in `game.scoring.ts` — reuse it).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend — Speaking/Game
- `backend/src/game/game.service.ts` — `saveSpeakingResult` (BFA transcription wired), `calcFreeSpeak` scoring branch
- `backend/src/game/game.scoring.ts` — `calcFreeSpeak`, `calcSpeakingScore`, shared `levenshtein()` — update `calcFreeSpeak` per D-05
- `backend/src/game/game.controller.ts` — `POST /session/:id/speaking-result`, `POST /session/:id/complete`, `GET /session/:id/recording`
- `backend/src/homework/homework.dto.ts` — `CreateHomeworkDto`, `UpdateHomeworkDto`
- `backend/src/homework/image.controller.ts` — `GET /homework/image/:key` (new, untracked — commit as Phase 1)
- `backend/src/bfa/bfa.service.ts` — `transcribe()` method (untracked changes to commit)
- `backend/src/bfa/bfa.dto.ts` — `WhisperXResult`, `BfaAlignResult` (untracked changes to commit)
- `backend/prisma/schema.prisma` — `Homework`, `SpeakingResult`, `HomeworkPart`, `HomeworkWord` models

### BFA Python Service
- `bfa-service/main.py` — `/transcribe` endpoint (remove `whisperx.align()` per D-20, add duration/size cap per D-21, fix espeak async per D-23)

### Frontend — Session & Teacher
- `frontend/app/game/session/[id]/page.tsx` — student session (upload state + results screen — update FREE_SPEAK result per D-16)
- `frontend/app/teacher/homework/[id]/page.tsx` — teacher detail page (untracked redesign — commit as Phase 1 per D-12)
- `frontend/app/teacher/homework/[id]/try/page.tsx` — try mode (untracked — update to file-upload flow per D-13/D-14)
- `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx` — session results (transcript + video + mode badge)
- `frontend/app/teacher/homework/page.tsx` — creation modal (mode selector)
- `frontend/lib/admin-api.ts` — `SpeakingResult`, `saveSpeakingResult`, `WhisperXResult`
- `frontend/lib/colors.ts` — `scoreHexColor`

### Planning
- `.planning/REQUIREMENTS.md` — SPEAK-01 through SPEAK-07

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StorageService.upload(key, buffer, mimeType)` — video upload to MinIO (identical to phonics audio pattern)
- `BfaService.transcribe(buffer, mimeType)` — WhisperX transcription
- `scoreHexColor(score)` — 0–100 score color display
- `levenshtein(a, b)` in `game.scoring.ts` — reuse for D-05 fuzzy keyword matching
- `CircleTimer` component — reusable timer UI (phonics; not needed for speaking upload)
- `AuthGate` component — wraps all student/teacher pages

### Established Patterns
- NestJS multipart upload: `@UseInterceptors(FileInterceptor('file'))` — apply same for speaking video
- Prisma migration: migrations in `backend/prisma/migrations/` — delete stale ones per D-24
- MinIO key convention: `speaking/{sessionId}/recording.{ext}`
- Score storage: `SpeakingResult` has `score`, `transcribedText`, `matchedWords`, `totalWords`
- FastAPI async pattern: use `asyncio.to_thread()` for blocking calls (D-23)

### Integration Points
- `calcFreeSpeak` in `game.scoring.ts`: update keyword matching (D-05)
- BFA `/transcribe`: remove alignment call, add file cap (D-20, D-21)
- `bfa.service.ts` `transcribe()`: fix MIME mapping (D-22)
- Try page: replace SpeechRecognition with file-upload + BFA call (D-13, D-14)
- Student results screen: show image prompt for FREE_SPEAK (D-16)

</code_context>

<specifics>
## Specific Ideas

- FREE_SPEAK result screen: image prompt prominently at top, large score %, small "Keywords matched: N/N" below — consistent with age group (5–10)
- Try mode: same UI as student upload page (`pageState='upload'`) reused or mirrored — teacher sees exactly what student sees + "Preview Mode" banner
- Keyword fuzzy matching: reuse existing `levenshtein()` from `game.scoring.ts` — check each transcript word against each keyword, take max similarity
- BFA cap: check Content-Length header first; if missing, read up to limit and reject if exceeded

</specifics>

<deferred>
## Deferred Ideas

- Live browser recording (MediaRecorder) for student — file upload only; defer to v2 if needed
- Multiple speaking items per session — one video per session; not in this phase
- Student can re-record before submitting — defer to v2
- Word-level transcript highlighting in teacher results — Claude's discretion (D-10 original note)
- Larger WhisperX model (medium/large-v3) — keep `small` for now; upgrade if accuracy complaints arise
- Word-by-word match breakdown for SCRIPT_MATCH student result — deferred; score + transcript is enough

</deferred>

---

*Phase: 1-Speaking-Homework*
*Context gathered: 2026-05-13, updated: 2026-05-14*
