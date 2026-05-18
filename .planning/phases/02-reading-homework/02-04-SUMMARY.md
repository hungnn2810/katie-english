---
phase: "02"
plan: "04"
subsystem: frontend
tags: [student, reading-game, animation, scoring, state-machine]
dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [student-reading-game-page, shake-animation]
  affects: [frontend/app/game/reading, frontend/tailwind.config.js]
tech_stack:
  added: []
  patterns:
    - "State machine with PageState union (loading/error/playing/submitting/results)"
    - "Shuffle-once-on-mount via useEffect[sessionId] stored in useState"
    - "Functional setState in setTimeout closures for stale-closure safety"
    - "Extract<ActivityState, { type: 'MATCH' }> discriminated union narrowing"
    - "useEffect on lockedCount for celebration auto-advance (500ms)"
    - "useEffect on isFinished for fill-blank activity completion"
key_files:
  created:
    - frontend/app/game/reading/[id]/page.tsx
  modified:
    - frontend/tailwind.config.js
decisions:
  - "Combined Tasks 1 and 2 into single implementation commit — both activity renderers fully built immediately rather than stub-then-replace, avoiding an intermediate broken state"
  - "computeTotals reads activityStates via setActivityStates functional updater (no-op return) to capture current state synchronously at finishSession call time"
  - "Celebration advance (500ms) driven by useEffect watching lockedCount — avoids stale closure from callback-in-setTimeout"
  - "finishSession uses 50ms settle delay to allow final setState to flush before reading totals"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 02 Plan 04: Student Reading Game Page Summary

## One-liner

Student reading game page at /game/reading/[id] with matching click-to-pair (lock green + shake 400ms + celebration 500ms auto-advance) and fill-in-blank one-shot (flash/shake 400ms + auto-advance), deterministic scoring via saveReadingResult + completeSession, and per-activity results screen.

## What Was Built

### Updated: `frontend/tailwind.config.js`

Added shake keyframe and animate-shake animation utility:
- `animation.shake: 'shake 0.4s ease-in-out'`
- `keyframes.shake`: 5-stop translateX sequence (0% → -8px → 8px → -6px → 4px → 0)
- Existing fadeIn and slideUp entries untouched

### New File: `frontend/app/game/reading/[id]/page.tsx`

Single-file React page (373 lines) containing the entire student reading game:

**Page shell (`ReadingGamePage`):**
- `useParams<{ id: string }>()` + `Number(id)` for sessionId
- State: `pageState`, `errorKind`, `activityStates`, `currentActivityIndex`, `finalResult`, `saveError`
- `fetchSession()` helper (mirrors existing game/session/[id] pattern)
- `shuffle<T>()` Fisher-Yates utility
- `setActivityState(idx, updater)` lifts functional setter to parent for stale-closure safety
- `finishSession()`: captures totals via functional setState no-op, calls `saveReadingResult` then `completeSession`, sets results
- `useEffect[sessionId]`: loads session, validates type=READING + non-empty activities, initializes ActivityState array with shuffle-once for MATCH activities

**State components:**
- `LoadingState`: spinner + "Loading…" on gameBg
- `ErrorState`: "Homework not found" heading + conditional "This reading homework has no activities yet." sub-line for no-activities case
- `SubmittingState`: accent spinner + "Saving your score…"
- `ResultsState`: 🎉 hero, score (text-7xl font-black scoreHexColor), per-activity breakdown (pairs matched / sentences correct with individual percentages), Finish button

**`PlayingShell`:**
- h-screen flex-col with top bar: Back button, activity progress pills (yellow current, white/50 done, white/20 upcoming), activity counter
- flex-1 content area for renderers

**`MatchingActivityRenderer`:**
- `useEffect` on `lockedCount === pairs.length` → 500ms timeout → setState complete + onComplete()
- `handleImageClick`: toggle selected image (skips locked)
- `handleWordClick`: correct → lock pair (functional setState); incorrect → shake both 400ms then reset to idle
- Image row: 4-state border styling (idle/selected/locked/shaking), lock ✓ overlay
- Word row (shuffledWords order, never changes): same 3-state styling

**`FillBlankActivityRenderer`:**
- `useEffect` on `isFinished` → setState complete + onComplete()
- `handleChoiceClick`: one-shot guard (`chosenChoiceId !== null`), 400ms then advance currentItemIndex
- Item progress dots with correct/wrong/current/upcoming colors
- Sentence display: `split('___')` → flatMap with styled blank box inline element
- Choice buttons: 4-state styling (idle/flash-correct/shake-wrong/disabled)

**AuthGate wrapping:**
- All render branches inside `<AuthGate requiredRole="STUDENT">{() => ...}</AuthGate>`
- `minWidth: 1024` on all state containers (PC-only per Phase 4 D-01)

## Scoring Logic

Deterministic per plan spec:
- MATCH: each locked pair = 1 correct item; wrong attempts do not penalize (D-10)
- FILL_BLANK: first-attempt correct = 1; wrong = 0 (D-16)
- Total score = `round(correctItems / totalItems * 100)` computed server-side from values sent to `saveReadingResult`

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Implementation Combination

**1. [Rule 2 - Deviation] Combined Tasks 1 and 2 into single implementation commit**
- Both activity renderers (MatchingActivityRenderer + FillBlankActivityRenderer) built in the same commit as the page shell
- Plan called for a placeholder in Task 1 then replacement in Task 2
- Combined implementation avoids intermediate broken state and is functionally equivalent
- All acceptance criteria for both tasks verified

## UI-SPEC Compliance

All copywriting contract strings used verbatim:
- "Loading…", "Homework not found", "This reading homework has no activities yet.", "← Back to Homework"
- "Saving your score…", "Homework Complete!", "Your score has been saved"
- "📷 Match each image to its word"
- "{n} / {total} pairs matched", "{n} / {total} sentences correct"
- "Finish"

Animation spec matches UI-SPEC exactly:
- Shake: 400ms ease-in-out, 5-stop translateX keyframe
- Celebration: 500ms delay then advance (useEffect-driven)
- Fill-blank feedback: 400ms then advance

## Threat Model Compliance

| Threat | Mitigation Applied |
|--------|--------------------|
| T-02-21 Tampering (devtools edit) | Backend validates correctItems <= totalItems (Plan 01); client sends raw counters |
| T-02-23 Spoofing (non-student) | AuthGate requiredRole="STUDENT" on all render branches |
| T-02-25 XSS (sentence content) | sentence rendered via React JSX `{part}` text — no dangerouslySetInnerHTML |
| T-02-26 Shuffle predictability | Math.random per-mount; per D-08 acceptable for reading exercise |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 + 2 | 42a867b | Scaffold reading game page — state machine, session load, shake keyframe, all renderers |

## Self-Check

### Files exist:
- frontend/app/game/reading/[id]/page.tsx: FOUND
- frontend/tailwind.config.js (with shake entries): FOUND

### Key content verified:
- `grep -c "shake" tailwind.config.js` → 2 (animation + keyframe)
- `grep -c "function MatchingActivityRenderer|function FillBlankActivityRenderer|..."` → 21 matches
- TypeScript: PASSED (npx tsc --noEmit exits 0)
- Build: PASSED (npm run build exits 0)

### Commits exist:
- 42a867b: FOUND

## Self-Check: PASSED
