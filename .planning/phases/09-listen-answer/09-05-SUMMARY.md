---
phase: 09-listen-answer
plan: "05"
subsystem: frontend/game
tags: [listen, game-page, audio, recording, scoring, student-ux]
dependency_graph:
  requires:
    - "09-04 (ListenItem schema, ListenItemResult interface, backend listen-result endpoint)"
    - "frontend/lib/colors.ts (scoreHexColor, gradients)"
    - "frontend/lib/theme.ts (fadeIn keyframe)"
    - "frontend/components/AuthGate.tsx"
    - "frontend/lib/auth.ts (authHeaders)"
  provides:
    - "saveListenResult in admin-api.ts — POST /game/session/:id/listen-result"
    - "ListenGamePage at /game/listen/[id] — student game page for LISTEN homework"
  affects:
    - "frontend/lib/admin-api.ts — HomeworkType, HomeworkItem, GameSession extended with listenItems"
tech_stack:
  added: []
  patterns:
    - "Audio element auto-play with useEffect on currentIndex + pageState"
    - "AudioPlayState machine (idle/playing/played) for play/replay button"
    - "Keyword matching via word-boundary regex against transcript"
    - "Composite score displayed as compositeScore * 100 (0.0-1.0 to 0-100%)"
key_files:
  created:
    - frontend/app/game/listen/[id]/page.tsx
  modified:
    - frontend/lib/admin-api.ts
decisions:
  - "Added ListenItem/ListenItemResult types and listen CRUD functions to worktree admin-api.ts (Plan 09-04 additions not yet in worktree branch — included as dependency)"
  - "matchedKeywords computed client-side via word-boundary regex against transcript when semanticScore >= 0.2"
  - "AudioPlayState resets to idle on each item advance via setAudioPlayState in handleNext"
  - "Try Again shown on any scoreError (both semantic threshold and BFA errors) per plan spec"
metrics:
  duration: "4 minutes"
  completed: "2026-06-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 09 Plan 05: Listen Game Page Summary

**One-liner:** Student LISTEN game page at /game/listen/[id] with audio auto-play, MediaRecorder flow, semantic feedback zone (transcript + keyword chips + composite score), and D-09 amber banner for low-confidence answers.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add saveListenResult to admin-api.ts | 8997875 | frontend/lib/admin-api.ts |
| 2 | Create ListenGamePage at /game/listen/[id]/page.tsx | 2e54198 | frontend/app/game/listen/[id]/page.tsx |

## What Was Built

### Task 1: saveListenResult in admin-api.ts

Added to `frontend/lib/admin-api.ts`:
- `HomeworkType` union extended with `'LISTEN'`
- `ListenItem` interface (id, homeworkId, audioUrl, keywords, expectedText, order)
- `ListenItemResult` interface (id, sessionId, listenItemId, itemOrder, transcript, semanticScore, pronScore, compositeScore, bfaFeedback)
- `CreateListenItemInput`, `CreateListenHomeworkInput`, `UpdateListenHomeworkInput` input types
- `ListenHomeworkDetail` interface
- `createListenHomework`, `getListenHomework`, `updateListenHomework` CRUD functions
- `uploadAudio` helper for audio prompt upload to `/homework/audio`
- `saveListenResult(sessionId, listenItemId, audio?)` — POST FormData to `/game/session/:id/listen-result`, returns `ListenItemResult`
- `HomeworkItem.listenItems` and `GameSession.listenItems` fields added

### Task 2: ListenGamePage

Created `frontend/app/game/listen/[id]/page.tsx` as a structural mirror of VocabGamePage with:

**State machine:** loading -> mic-check -> ready -> playing -> uploading -> results (identical to VocabGamePage)

**Audio prompt player (playing state):**
- Hidden `<audio ref={audioRef}>` element
- `AudioPlayState` machine: `idle` -> `playing` -> `played`
- Auto-plays on `currentIndex`/`pageState` change via `useEffect` (D-08)
- Play/Replay button: Play icon (idle), CircularProgress (playing), RotateCcw (played)
- Graceful autoplay fallback: reverts to `idle` if browser blocks autoplay

**Recording flow:** Verbatim copy from VocabGamePage:
- `pickAudioMimeType()`, `startRecording()`, `stopRecording()` unchanged
- 96x96 mic circle: idle -> red ping ring -> scoring spinner -> green check

**Feedback zone (after `recorded` state):**
- D-09 amber banner: `semanticScore < 0.2` -> "hay thu lai, nghe ky cau hoi nhe"
- BFA/score error banner for other errors when `semanticScore >= 0.2`
- Transcript shown in italic ("Ban noi: ...")
- Matched keyword chips (green, fadeIn animation)
- Composite score at 48px with `scoreHexColor`

**Results screen:**
- 72px final score with `scoreHexColor`
- Per-item cards with: Headphones icon + "Question N" label, transcript (italic), keyword chips, "Semantic: X% · Pronunciation: Y%" breakdown row
- "Finish" button -> `/game/homework`
- `AuthGate requiredRole="STUDENT"` on all render paths

## Deviations from Plan

### Rule 2 - Missing Critical Functionality: Plan 09-04 types added to worktree admin-api.ts

**Found during:** Task 1 setup
**Issue:** The worktree branch did not have the Plan 09-04 Listen types (`ListenItem`, `ListenItemResult`, `createListenHomework`, etc.) that the main branch already has. These are required dependencies for `saveListenResult` and `ListenGamePage`.
**Fix:** Added all Plan 09-04 additions to the worktree's `admin-api.ts` as part of Task 1, since Plan 09-05 depends on them.
**Files modified:** `frontend/lib/admin-api.ts`
**Commit:** 8997875

## Known Stubs

None. `saveListenResult` calls the real `/game/session/:id/listen-result` endpoint. `matchedKeywords` is computed client-side using word-boundary regex against the real transcript from the API response.

## Threat Flags

No new threat surface beyond the plan's `<threat_model>`. The `saveListenResult` function follows the same Bearer-token auth pattern as `saveVocabResult` and `savePhonicsResult`.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| frontend/lib/admin-api.ts exists | FOUND |
| frontend/app/game/listen/[id]/page.tsx exists | FOUND |
| .planning/phases/09-listen-answer/09-05-SUMMARY.md exists | FOUND |
| Commit 8997875 (Task 1) exists | FOUND |
| Commit 2e54198 (Task 2) exists | FOUND |
