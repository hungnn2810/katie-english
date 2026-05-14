# Phase 2: Reading Homework - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver reading homework end-to-end: teacher creates a homework by composing a sequence of image-word matching activities and/or fill-in-blank activities in any order; student completes the activities on a dedicated reading game page; system scores deterministically and stores result. Teacher result view (READ-07) and unified creation dashboard (TEACH-01) are Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Schema / Data Model

- **D-01:** Add `READING` as a third value to the `HomeworkType` enum. Same `Homework` table, same `HomeworkAssignment`/`HomeworkSession` flow. Reading activities hang off `Homework.id`.
- **D-02:** New tables (new Prisma migration required):
  - `ReadingActivity` (id, homeworkId, type: `MATCH | FILL_BLANK`, order) — one per activity in the sequence
  - `MatchPair` (id, activityId, imageUrl, word, order) — each image→word pair in a matching activity; 2–6 per activity
  - `FillBlank` (id, activityId, sentence, order) — one sentence with exactly ONE blank (`___` placeholder) per item
  - `FillBlankChoice` (id, blankId, word, isCorrect) — word choices for a fill-blank item; teacher specifies how many, one must have `isCorrect=true`
- **D-03:** `ReadingResult` table (sessionId unique, totalItems, correctItems, score Float 0–100). Single row per session. Per-activity breakdown deferred to Phase 3 (READ-07).

### Student Game Page

- **D-04:** New dedicated page at `frontend/app/game/reading/[id]/page.tsx` — separate from the existing `game/session/[id]/page.tsx` which handles phonics + speaking.
- **D-05:** Route entry: student game app navigates to `/game/reading/{assignmentId}` for READING homework (same entry point detection as current session start — check homework type on start).

### Matching Activity UX

- **D-06:** All-at-once grid layout. Images displayed in a row across the top; words displayed in a row across the bottom. Student clicks an image to select it (highlighted border), then clicks a word to attempt the pair. Correct → both turn green and lock. Incorrect → both shake briefly then deselect (student tries again).
- **D-07:** 2–6 pairs per matching activity. Enforced in teacher creation UI (disable "Add pair" button at 6).
- **D-08:** Words are randomized (shuffled) on session load — prevents students from memorizing position.
- **D-09:** When all pairs are locked (complete), auto-advance to next activity after a brief celebration moment (~1s). No explicit "Next" button needed.
- **D-10:** Scoring for matching: final state counts. A pair is correct if it's matched correctly at activity end. Wrong attempts (shake events) do NOT penalize the score — only whether the pair is ultimately correct.

### Fill-in-blank Activity UX

- **D-11:** Each FillBlank item is one sentence with exactly ONE blank (represented as `___` in teacher input). Teacher creates multiple items per activity (e.g., 3–5 sentences).
- **D-12:** Teacher specifies word choices per item explicitly (no auto-generation). At least 2 choices required; exactly one must be marked correct (`isCorrect=true`). No constraint on how many choices — teacher decides per item.
- **D-13:** Student sees one sentence at a time. The sentence is displayed with `___` shown as a blank. Word choices shown as buttons below. Student taps a choice → immediate feedback.
- **D-14:** Wrong answer: choice shakes briefly, item marked incorrect, auto-advance to next item. **One shot per blank** — no retry.
- **D-15:** Correct answer: choice highlights green briefly, auto-advance to next item.
- **D-16:** Score contribution: 1 point per fill-blank item; correct on first attempt = 1 correct, wrong = 0 correct.

### Session Scoring

- **D-17:** Single session score = `round((correctItems / totalItems) * 100)`, where `totalItems = sum of all MatchPair rows + all FillBlank rows` across all activities in the homework, and `correctItems = correctly-matched pairs + correctly-answered fill-blank items`. Stored in `ReadingResult.score`.

### Teacher Creation Flow

- **D-18:** Dedicated creation page at `/teacher/homework/create/reading`. Accessed from the existing homework list page (add "Create Reading" button alongside existing PHONICS/SPEAKING creation entry points).
- **D-19:** Activity reordering via **drag-and-drop** using `@dnd-kit/core` (new dependency — add to `frontend/package.json`). Each activity is a draggable card.
- **D-20:** For matching activity image upload: **bulk upload** — teacher selects multiple image files at once (`<input type="file" multiple accept="image/*">`). Each selected file creates a pair card. Filename (without extension) pre-fills the word label; teacher edits as needed. Uses existing `POST /homework/image` endpoint (`uploadSpeakingImage`) per image.
- **D-21:** For fill-in-blank activity creation: teacher types each sentence (with `___` for the blank) and adds word choices one at a time. One choice is toggled as "correct". Teacher can add/remove choices per item.
- **D-22:** On save: POST to existing `/homework` endpoint with `type: READING` and activities array. Backend creates Homework + ReadingActivity + MatchPair/FillBlank/FillBlankChoice rows in a transaction.

### Claude's Discretion

- Exact animation implementation for pair lock (green flash duration, shake keyframe)
- Celebration moment between activities (color burst, star, or simple opacity fade)
- Specific layout/card styling on the creation page
- Whether to show activity index ("Activity 1 of 3") during student gameplay
- Error state if student loads a READING session with no activities

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prisma Schema (extend for READING)
- `backend/prisma/schema.prisma` — Add `READING` to `HomeworkType` enum; add `ReadingActivity`, `MatchPair`, `FillBlank`, `FillBlankChoice`, `ReadingResult` models

### Backend — Homework Module
- `backend/src/homework/homework.controller.ts` — existing `POST /homework` endpoint (extend to handle READING type + activities array)
- `backend/src/homework/homework.service.ts` — homework creation logic (add READING creation transaction)
- `backend/src/homework/homework.dto.ts` — `CreateHomeworkDto` (add reading activities fields)
- `backend/src/homework/homework.repository.ts` — DB queries for homework with activities
- `backend/src/homework/image.controller.ts` — `POST /homework/image` — reuse for matching pair images (already committed in Phase 1)

### Backend — Game Module (session + scoring)
- `backend/src/game/game.controller.ts` — session endpoints (add `POST /session/:id/reading-result`, update `completeSession` for READING type)
- `backend/src/game/game.service.ts` — `getSession`, `completeSession` (add `saveReadingResult` method)
- `backend/src/game/game.dto.ts` — add `SaveReadingResultDto`
- `backend/src/game/game.repository.ts` — add reading result DB methods

### Frontend — New Files
- `frontend/app/game/reading/[id]/page.tsx` — new student reading game page (D-04)
- `frontend/app/teacher/homework/create/reading/page.tsx` — new teacher creation page (D-18)

### Frontend — Existing Files to Modify
- `frontend/app/teacher/homework/page.tsx` — add "Create Reading" entry point button (D-18)
- `frontend/lib/admin-api.ts` — add `ReadingActivity`, `MatchPair`, `FillBlank`, `FillBlankChoice`, `ReadingResult` types; add `saveReadingResult` API call
- `frontend/lib/colors.ts` — `scoreHexColor`, `cardGradients` (reuse for result screen)

### New Dependency
- `@dnd-kit/core` — drag-and-drop for activity reordering on teacher creation page (D-19); add to `frontend/package.json`

### Planning
- `.planning/REQUIREMENTS.md` — READ-01 through READ-06 (Phase 2 scope)
- `.planning/ROADMAP.md` — Phase 2 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `uploadSpeakingImage(file)` in `frontend/lib/admin-api.ts` — `POST /homework/image` — identical endpoint to use for matching pair images (D-20)
- `scoreHexColor(score)` in `frontend/lib/colors.ts` — 0–100 score color for result screen
- `cardGradients` / `gradients` in `frontend/lib/colors.ts` — card styling for activity display
- `AuthGate` component — wraps all student and teacher pages
- `StorageService.upload(key, buffer, mimeType)` — used by image.controller.ts; no changes needed
- `backend/src/homework/image.controller.ts` — `POST /homework/image` already committed in Phase 1; reuse as-is

### Established Patterns
- NestJS multipart upload: `@UseInterceptors(FileInterceptor('file'))` — used by `image.controller.ts` (Phase 1); reuse same pattern if new upload endpoints are needed
- Prisma transaction: reading homework creation should wrap Homework + ReadingActivity + children in a `prisma.$transaction([])`
- Session start/complete flow: `POST /game/session/start` → play → `POST /game/session/:id/complete` — READING sessions follow same lifecycle
- Result storage: `SpeakingResult`/`PhonicsItemResult` patterns — `ReadingResult` follows same sessionId-unique pattern
- Next.js App Router: `frontend/app/game/reading/[id]/page.tsx` with `use client` + `useParams`

### Integration Points
- `HomeworkType` enum: add `READING` value → affects frontend `TYPE_META`, backend DTO validation, and anywhere enum is used
- `getAvailableHomework` API: already returns assignments; student app navigates differently for READING type (to `/game/reading/[id]` instead of `/game/session/[id]`)
- Teacher homework list page: detect `type === 'READING'` to show different detail/edit entry (Phase 3); for Phase 2 just add a creation entry point
- `completeSession` in `game.service.ts`: needs to handle READING type (no video upload, compute ReadingResult score instead of averaging phonicsResults)

</code_context>

<specifics>
## Specific Ideas

- Matching grid: images as square cards (~100–120px), words as pill buttons below. Same row count as pairs (up to 6 columns). On mobile/tablet not needed (laptop/PC only per Phase 4 D-01).
- Fill-blank display: sentence shown in large readable font with `___` replaced by a styled blank box (underline or box border). Word choices as large pill buttons below (same style as phonics word buttons for consistency).
- Creation page: each activity is a card with a drag handle (≡ icon) on the left. "Add Matching Activity" and "Add Fill-in-blank Activity" buttons at the bottom. Save button at top-right.
- Matching pair bulk upload: grid of pair cards after upload, each showing the image thumbnail + editable word label text field.

</specifics>

<deferred>
## Deferred Ideas

- Per-activity score breakdown on result screen — READ-07 is Phase 3; Phase 2 shows only total score
- Teacher editing/updating reading homework after creation — Phase 3 (unified dashboard)
- Per-item correct/wrong detail stored in DB — Phase 3 needs this; not needed for Phase 2 score storage
- Retry/re-attempt for wrong fill-blank answers — user chose one-shot; defer to v2 if feedback from teachers
- Drag-and-drop for image ordering within a matching activity — up/down arrows sufficient for pair reordering; DnD only needed for activity-level reordering
- Reading homework "try" mode for teacher preview — not in scope for Phase 2; could be Phase 3 addition

</deferred>

---

*Phase: 2-Reading-Homework*
*Context gathered: 2026-05-14*
