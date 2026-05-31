---
phase: 07-bfa-robustness
plan: "02"
subsystem: backend + frontend
tags: [bfa, error-forwarding, frontend, nestjs, react, tdd]
dependency_graph:
  requires: [07-01]
  provides: [bfa-error-forwarding, amber-error-display]
  affects:
    - backend/src/bfa/bfa.dto.ts
    - backend/src/bfa/bfa.service.ts
    - backend/src/bfa/bfa.service.spec.ts
    - backend/src/game/game.service.spec.ts
    - frontend/lib/admin-api.ts
    - frontend/app/game/session/[id]/page.tsx
key_files:
  modified:
    - backend/src/bfa/bfa.dto.ts
    - backend/src/bfa/bfa.service.ts
    - backend/src/bfa/bfa.service.spec.ts
    - backend/src/game/game.service.spec.ts
    - frontend/lib/admin-api.ts
    - frontend/app/game/session/[id]/page.tsx
metrics:
  tasks_completed: 2
  new_tests_bfa_service: 2
  new_tests_game_service: 5
  total_tests_passing: 82
---

# Phase 7 Plan 02: BFA Error Forwarding + Frontend Display Summary

BFA gate errors (audio_too_short, audio_too_long, recording_too_noisy, speech_not_detected, wrong_language) now propagate from bfa-service → NestJS → frontend result card as amber Vietnamese/English messages instead of `0%`.

## What Was Built

### backend/src/bfa/bfa.dto.ts
- Added `error?: string;` and `message?: string;` to `BfaAlignResult` (inherited by `BfaAnalyzeResult`)

### backend/src/bfa/bfa.service.ts
- `analyze()` now catches axios errors: HTTP 400 with `error` field → returns structured `BfaAnalyzeResult{success:false, error, message, word, phonemes:[], feedback:[], score:0, transcription:{text:''}}`
- Non-400 / non-axios errors still re-throw (preserves infra-error behaviour)

### backend/src/bfa/bfa.service.spec.ts (+2 tests)
- `forwards HTTP-400 audio_too_short body as BfaAnalyzeResult with success:false`
- `re-throws non-400 axios errors (e.g. 500)`

### backend/src/game/game.service.spec.ts (+5 tests)
New `describe('BFA error forwarding')` block covering all 5 gate codes:
- audio_too_short, audio_too_long, recording_too_noisy, speech_not_detected, wrong_language
- Each asserts: repo called with score=0 + empty transcribedText; returned bfa.error matches code

### frontend/lib/admin-api.ts
- `BfaResult` interface gains `error?: string;` and `message?: string;`

### frontend/app/game/session/[id]/page.tsx
- `SessionItem` gains `bfaError?: string | null;`
- `BFA_ERROR_MESSAGES` constant (5 verbatim Vietnamese/English messages from CONTEXT D-06)
- `finishSession()` phonics branch: detects `r.bfa?.error`, sets `bfaError` + forces `score:0`
- Results card: renders amber `text-amber-400` message when `bfaError` truthy; suppresses PhonemeChips for error items

## Gate Error Messages (Verbatim)

| Code | Display |
|------|---------|
| audio_too_short | Bấm lâu hơn nhé — ghi âm quá ngắn |
| audio_too_long | Ghi âm quá dài — nói dưới 15 giây |
| recording_too_noisy | Mic quá ồn — tìm chỗ yên tĩnh hơn |
| speech_not_detected | Không nghe rõ — nói to hơn nhé |
| wrong_language | Please speak in English |

## Verification

- `cd backend && npx jest bfa.service.spec game.service.spec` → 82 tests pass (all existing + 7 new)
- `cd backend && npx tsc --noEmit` → 0 errors
- `cd frontend && npx tsc --noEmit` → 0 errors
- Task 3 (human browser verify): pending — requires live stack (uvicorn + nest start:dev + next dev)

## Self-Check: PASSED

- bfa.dto.ts: `error?: string` present (1 match), `message?: string` present (2 matches)
- bfa.service.ts: `axios.isAxiosError` + `err.response?.data` present
- game.service.spec.ts: all 5 error codes covered (3+ matches each)
- frontend/lib/admin-api.ts: BfaResult has error?/message?
- frontend page.tsx: bfaError field × 6, BFA_ERROR_MESSAGES × 2, text-amber-400 × 1
- All 5 Vietnamese message strings present in page.tsx
