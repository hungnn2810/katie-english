---
phase: 08-vocabulary-image
plan: "04"
subsystem: frontend-student-game
tags: [student-game, vocab, bfa, phoneme-chips, routing]
dependency_graph:
  requires: ["08-03"]
  provides: ["08-05"]
  affects: ["frontend/app/game/vocab", "frontend/app/game/homework", "frontend/lib/admin-api"]
tech_stack:
  added: []
  patterns: ["manual-tap-record", "bfa-error-map", "phoneme-chips-reuse", "shake-fadeIn-ping-animations"]
key_files:
  created:
    - frontend/app/game/vocab/[id]/page.tsx
  modified:
    - frontend/lib/admin-api.ts
    - frontend/app/game/homework/page.tsx
decisions:
  - "saveVocabResult and VocabItem types added in 08-04 (not 08-03) due to parallel wave execution — 08-03 owns teacher-side; both define compatible shapes against the same backend contract"
  - "PhonemeOp[] stored in VocabGameItem.feedback (not extracted from bfa) to avoid null-safety ceremony on every render"
  - "handleNext drives completeSession after the last item so each item is scored in-flight via saveVocabResult, not batched"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-02"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 08 Plan 04: Student Vocab Game + Homework Routing Summary

Student vocabulary game delivered at `/game/vocab/[id]`: per-item tap-to-record flow with BFA scoring, PhonemeChips feedback (yellow `similar` for VOCAB-04), shake/fadeIn/ping animations, and VOCABULARY routing wired into the student homework list.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Student vocab game page — state machine, record, scoring, phoneme chips, results | `75a2fe4` | `frontend/app/game/vocab/[id]/page.tsx`, `frontend/lib/admin-api.ts` |
| 2 | Route VOCABULARY sessions from student homework list | `0a7ed45` | `frontend/app/game/homework/page.tsx` |

## What Was Built

### Task 1 — Student Vocab Game (`/game/vocab/[id]`)

**State machine:** `loading → mic-check → mic-denied → ready → playing → uploading → results → error`

**Per-item client state shape (`VocabGameItem`):**
```typescript
interface VocabGameItem {
  vocabItemId: number;
  imageUrl: string;
  word: string;
  score: number;
  bfa: BfaResult | null;
  bfaError: string | null;   // extracted from bfa.error — drives amber message + shake
  recordState: 'idle' | 'recording' | 'recorded' | 'scoring';
  feedback: PhonemeOp[];     // from bfa.feedback — passed to <PhonemeChips />
}
```

**Record flow per item:**
1. Idle mic button → tap → `startRecording()` (MediaRecorder on existing stream)
2. Recording state (ping ring) → tap stop → `handleStopAndScore()` → `saveVocabResult(sessionId, vocabItemId, blob)`
3. BFA result arrives: `bfaError = bfa?.error ?? null`, `score = bfaError ? 0 : result.score`
4. If no error: PhonemeChips fade in, "Next →" / "View Results" button appears
5. If BFA error: amber `BFA_ERROR_MESSAGES[code]` shown, "Try Again" button (re-record), image card shakes

**BFA error surface:** `bfaError` string drives three simultaneous behaviors:
- `animation: \`${shake} 0.4s\`` on the 280×280 image card (`isBfaError` flag)
- Amber `BFA_ERROR_MESSAGES[bfaError]` Typography below the record button
- "Try Again" button (calls `handleReRecord()`) instead of "Next →"

**VOCAB-04 yellow chips confirmed:** `PhonemeChips` component handles `similar` status with `bgcolor: '#fef9c3', color: '#854d0e'` — this is the existing component reused as-is; no changes needed.

**Three animations (all present, all from correct sources):**
1. `shake` — imported from `@/lib/theme`, applied as `animation: \`${shake} 0.4s\`` on the image card's `sx` when `isBfaError`
2. `fadeIn` — imported from `@/lib/theme`, applied as `animation: \`${fadeIn} 0.3s ease\`` on the PhonemeChips wrapper Box
3. `ping` — inline `@keyframes ping` definition copied from `session/[id]/page.tsx`: `'ping 1s cubic-bezier(0,0,0.2,1) infinite'` on the absolute ring Box behind the recording button

**Results screen:** Overall score (from `completeSession` response or averaged), per-item cards with 48×48 image thumbnail + word + PhonemeChips + score%, "Finish Session" → `/game/homework`.

### Task 2 — VOCABULARY Routing in Homework Page

Added to `frontend/app/game/homework/page.tsx`:
- `ImageIcon` import from `lucide-react`
- `VOCABULARY: { label: 'Vocabulary', icon: ImageIcon }` entry in `TYPE_META`
- `else if (hwType === 'VOCABULARY') router.push(\`/game/vocab/${session.id}\`)` in `handleStart`
- VOCABULARY card body chip: `{(hw.vocabItems ?? []).length} item(s)` with ImageIcon (mirrors READING pattern)

### Admin-API Additions (Rule 3 deviation — parallel wave blocker)

Added to `frontend/lib/admin-api.ts` as a Rule 3 auto-fix (plan 08-03 runs in same wave, so these were not yet present):
- `'VOCABULARY'` added to `HomeworkType` union
- `VocabItem`, `CreateVocabItemInput`, `CreateVocabHomeworkInput`, `UpdateVocabHomeworkInput`, `VocabHomeworkDetail` interfaces
- `vocabItems?: VocabItem[]` on `GameSession` and `HomeworkItem`
- `vocabItem?: VocabItem` on `PhonicsItemResult`
- `saveVocabResult(sessionId, vocabItemId, audio?)` — multipart POST to `/game/session/:id/vocab-result`, returns `PhonicsItemResult`
- `createVocabHomework`, `getVocabHomework`, `updateVocabHomework` CRUD functions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vocab types and saveVocabResult not yet in admin-api.ts**
- **Found during:** Task 1 — plan 08-03 runs in parallel wave 3 and had not committed these types
- **Issue:** `saveVocabResult`, `VocabItem`, and `VOCABULARY` HomeworkType were missing; the page would not compile
- **Fix:** Added all required vocab types and functions to `admin-api.ts` matching the exact contract specified in 08-03's plan interfaces. When 08-03 merges it will find compatible (or identical) definitions — both target the same backend shapes
- **Files modified:** `frontend/lib/admin-api.ts`
- **Commit:** `75a2fe4`

## Known Stubs

None. All data paths are wired:
- Session fetch reads `session.vocabItems ?? session.assignment?.homework?.vocabItems` with order sort
- Each item calls `saveVocabResult` in real time
- `completeSession` is called after the last item
- Results render live `bfa.feedback` from the API response

## Threat Flags

No new threat surface beyond what was modeled in the plan's STRIDE register (T-08-11, T-08-12, T-08-13, T-08-SC).

## Self-Check: PASSED

- `frontend/app/game/vocab/[id]/page.tsx` — FOUND
- Commit `75a2fe4` — FOUND
- Commit `0a7ed45` — FOUND
- `saveVocabResult` referenced in vocab page — CONFIRMED (line 152)
- `PhonemeChips` referenced in vocab page — CONFIRMED (lines 342, 551)
- `BFA_ERROR_MESSAGES` + `recording_too_noisy` in vocab page — CONFIRMED (lines 32–38)
- `Homework Complete!` + `Start Recording` + `View Results` in vocab page — CONFIRMED
- `gradients.gameBg` in vocab page — CONFIRMED (multiple occurrences)
- `shake`, `fadeIn`, `ping` all present — CONFIRMED
- `from '@/lib/theme'` import present — CONFIRMED (line 9)
- `/game/vocab/` in homework page — CONFIRMED
- `VOCABULARY` in homework page — CONFIRMED (TYPE_META + routing)
