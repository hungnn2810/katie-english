# Phase 1: Speaking Homework - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver speaking homework end-to-end: teacher creates homework in one of two modes (free-speak or script-matching), student uploads a recorded video file, system transcribes via WhisperX and scores the result, teacher views score + transcript. No browser-based MediaRecorder — student films on device and uploads the file.

</domain>

<decisions>
## Implementation Decisions

### Speaking Modes

- **D-01:** Two modes — `FREE_SPEAK` and `SCRIPT_MATCH`. Add explicit `speakingMode` enum field to the `Homework` table. Requires a new Prisma migration. Do NOT infer mode from presence/absence of image.
- **D-02:** Free-speak mode: teacher sets an image prompt (`speakingPictureUrl`) AND a keyword list (`speakingText` stores comma-separated keywords, e.g. `"cat, sits, mat"`). System checks how many keywords appear in the WhisperX transcript.
- **D-03:** Script-matching mode: teacher sets target text in `speakingText` (full sentence/paragraph). Existing `calcSpeakingScore` word-match scoring applies unchanged.

### Scoring

- **D-04:** Free-speak score formula: `round((matched_keywords / total_keywords) * 100)`. Stored as `score: Float` in `SpeakingResult` (existing field). Displayed as `%` — consistent with existing phonics score display using `scoreHexColor`.
- **D-05:** Keyword matching is case-insensitive, whitespace-trimmed. Partial matches (e.g. "cats" matching "cat") are acceptable — treat as match.

### Recording & Upload

- **D-06:** Student does NOT record in-browser. Student records video on their phone/tablet (camera app), then uploads the file to the session page. Upload UI: single file input (`<input type="file" accept="video/*">`).
- **D-07:** One video upload per speaking session (not multiple items per session). Session has exactly one speaking result.
- **D-08:** Uploaded video stored in MinIO using the existing `StorageService.upload` pattern (same as phonics audio). Key format: `speaking/{sessionId}/recording.{ext}`.

### Teacher Creation Flow

- **D-09:** Teacher creation modal already supports `speakingPictureUrl` and `speakingText`. Add a mode selector (FREE_SPEAK / SCRIPT_MATCH) to the modal. Label fields based on mode: free-speak shows "Image" + "Keywords"; script-matching shows "Target text" (image optional).

### Teacher Results View

- **D-10:** Teacher session detail page (`/teacher/homework/[id]/session/[sessionId]`) displays: speaking mode, transcript (transcribed text from WhisperX), score as %, and video playback via existing streaming endpoint (`GET /game/session/:id/recording`).

### Claude's Discretion

- Free-speak keyword matching algorithm (exact tokenize/split implementation) — Claude decides.
- Whether to show keyword highlights in transcript on teacher view — Claude decides.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Backend — Speaking/Game
- `backend/src/game/game.service.ts` — `saveSpeakingResult` method + `calcSpeakingScore` (word-match scorer)
- `backend/src/game/game.controller.ts` — `POST /session/:id/speaking-result`, `POST /session/:id/complete`, `GET /session/:id/recording`
- `backend/src/homework/homework.dto.ts` — `CreateHomeworkDto`, `UpdateHomeworkDto` (needs `speakingMode` added)
- `backend/prisma/schema.prisma` — `Homework` model (needs `speakingMode` field + migration)

### Existing Frontend — Session & Recording
- `frontend/app/game/session/[id]/page.tsx` — current session flow; replace MediaRecorder logic with file upload input
- `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx` — teacher results view (add transcript + score display)
- `frontend/app/teacher/homework/page.tsx` — teacher homework creation modal (add mode selector)
- `frontend/lib/admin-api.ts` — API client functions (add speaking result/upload functions)
- `frontend/lib/colors.ts` — `scoreHexColor` (score display, 0–100 range)

### BFA Service
- `bfa-service/main.py` — `POST /transcribe` endpoint (used for speaking transcription, returns `{text: string}`)

### Planning
- `.planning/REQUIREMENTS.md` — SPEAK-01 through SPEAK-07

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StorageService.upload(key, buffer, mimeType)` — use for video upload to MinIO (identical to phonics audio pattern)
- `BfaService.transcribe(buffer, mimeType)` — WhisperX transcription, already called in `saveSpeakingResult`
- `scoreHexColor(score)` — frontend color function for 0–100 score display
- `CircleTimer` component — reusable timer UI in session page
- `AuthGate` component — wraps all student pages

### Established Patterns
- NestJS multipart upload: `@UseInterceptors(FileInterceptor('audio'))` pattern used in phonics; apply same for video with `FileInterceptor('video')`
- Prisma migration: existing migrations in `backend/prisma/migrations/` — add `speakingMode` via new migration
- MinIO key convention: `phonics-audio/{sessionId}/...` — follow same bucket, new prefix `speaking/`
- Score storage: `SpeakingResult` already has `score: Float, transcribedText: String` — no schema change needed for results table

### Integration Points
- New `speakingMode` enum in `HomeworkType` file (backend DTO + Prisma schema)
- Student session page: remove MediaRecorder, add `<input type="file">` + upload logic
- Teacher creation modal: add `speakingMode` selector, conditional field labels
- `calcSpeakingScore` in `game.scoring.ts`: add `calcFreeSpeak Score(transcript, keywords)` alongside it

</code_context>

<specifics>
## Specific Ideas

- Student experience: simple upload page — show homework image (free-speak) or target text (script-matching), file picker button, upload progress, then score screen
- Teacher creation: mode selector first (FREE_SPEAK | SCRIPT_MATCH), then conditional fields appear — keeps creation flow clean
- Keyword storage: store as comma-separated string in existing `speakingText` field to avoid a new column; parsing happens at score time

</specifics>

<deferred>
## Deferred Ideas

- Live browser recording (MediaRecorder) — user explicitly wants file upload only; defer or remove
- Multiple speaking items per session — user decided one video per session; not in this phase
- Student can re-record before submitting — not discussed; defer to v2 if needed
- Video transcription UI for student (show transcript during session) — teacher sees it, student result screen deferred

</deferred>

---

*Phase: 1-Speaking-Homework*
*Context gathered: 2026-05-13*
