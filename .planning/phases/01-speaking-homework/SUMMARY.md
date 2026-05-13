---
plan: PLAN.md
phase: 01-speaking-homework
status: complete
completed: "2026-05-13"
key-files:
  created:
    - backend/prisma/migrations/20260510000001_add_speaking_mode/migration.sql
    - .planning/phases/01-speaking-homework/PLAN.md
  modified:
    - backend/prisma/schema.prisma
    - backend/src/game/game.scoring.ts
    - backend/src/game/game.service.ts
    - backend/src/homework/homework.dto.ts
    - backend/src/homework/homework.repository.ts
    - frontend/lib/admin-api.ts
    - frontend/app/teacher/homework/page.tsx
    - frontend/app/game/session/[id]/page.tsx
    - frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx
---

# Phase 1: Speaking Homework — Summary

## What Was Built

End-to-end speaking homework system covering SPEAK-01 through SPEAK-07.

### Database (T-01, T-02)
- Added `SpeakingMode` enum (`FREE_SPEAK | SCRIPT_MATCH`) to Prisma schema
- Added optional `speakingMode` field to `Homework` model
- Created and applied migration `20260510000001_add_speaking_mode`

### Backend Scoring (T-04, T-05)
- Added `calcFreeSpeak(transcript, keywords)` to `game.scoring.ts`:
  - Splits comma-separated keywords, case-insensitive substring match
  - Score = round(matched / total × 100)%
  - Tested: 100%, 33%, 0% cases all correct
- `saveSpeakingResult` branches on `speakingMode`: FREE_SPEAK → `calcFreeSpeak`, else → `calcSpeakingScore`
- `completeSession` stores SPEAKING videos at `speaking/{sessionId}/recording.{ext}`

### Backend DTO + Repository (T-03, T-06)
- `SpeakingMode` type + `speakingMode?: SpeakingMode` added to `CreateHomeworkDto` / `UpdateHomeworkDto`
- `HomeworkRepository.create` and `update` persist `speakingMode`

### Frontend — API Client (T-07)
- `SpeakingMode` type exported from `admin-api.ts`
- Added to `CreateHomeworkInput`, `UpdateHomeworkInput`, `HomeworkItem`
- Fixed file upload filename to use actual file name (fixes MIME type for BFA/WhisperX)

### Frontend — Teacher Creation Modal (T-08)
- Mode selector (Script Match / Free Speak) shown for SPEAKING type
- Conditional field labels: FREE_SPEAK → "Keywords (comma-separated)" / SCRIPT_MATCH → "Target Text"
- Image prompt field only shown in FREE_SPEAK mode
- Form validation message adapts to mode

### Frontend — Student Session Page (T-09)
- SPEAKING homework detected at session load → skips camera/MediaRecorder entirely
- New `'upload'` page state: shows image prompt (FREE_SPEAK) or target text (SCRIPT_MATCH)
- File picker (`accept="video/*,audio/*"`) with file name + size display
- Submit calls `saveSpeakingResult` + `completeSession` with the uploaded file
- PHONICS flow completely unchanged

### Frontend — Teacher Results (T-10)
- Speaking mode badge (pink "Free Speak" / purple "Script Match") in session detail page

## Test Results

- Backend: 95/95 tests passing
- TypeScript: clean (no new errors in Phase 1 files)
- `calcFreeSpeak` manually verified: cat/sits/mat → 100%, no match → 0%, partial → 33%

## Self-Check: PASSED

All 10 tasks from PLAN.md completed. SPEAK-01 through SPEAK-07 covered.
