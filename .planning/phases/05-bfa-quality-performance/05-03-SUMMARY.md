---
phase: 05-bfa-quality-performance
plan: "03"
subsystem: frontend/phonics-result + bfa-service/analyze
tags: [bfa, phonics, ui, phoneme-chips, parallel-execution]
dependency_graph:
  requires: [05-02]
  provides: [PhonemeChips, four-state-chip-colors, parallel-analyze]
  affects:
    - frontend/app/game/session/[id]/_components/PhonemeChips.tsx
    - frontend/app/game/session/[id]/page.tsx
    - frontend/lib/admin-api.ts
    - bfa-service/main.py
tech_stack:
  added: []
  patterns: [four-state-chip-coloring, route-local-_components, parallel-threadpool-executor]
key_files:
  created:
    - frontend/app/game/session/[id]/_components/PhonemeChips.tsx
  modified:
    - frontend/app/game/session/[id]/page.tsx
    - frontend/lib/admin-api.ts
    - bfa-service/main.py
decisions:
  - ASCII '->' used for substituted chips (not Unicode '→') — cross-font-fallback safety
  - 'error' status chips omitted — they represent whole-request failures, not phoneme-level verdicts
  - PhonemeChips has no 'use client' directive — pure presentational, inherits parent client mode
  - _transcribe_wav extracted as helper + ThreadPoolExecutor(max_workers=2) in _analyze_sync — halves /analyze latency
  - skip_energy_check=True passed to _run_alignment when caller already verified energy — avoids redundant ffmpeg subprocess
  - SpeechRecognition onresult handler discards events fired after stop() to prevent stale callbacks
  - currentIndex tracked via useRef (not useState) to prevent stale closure in handleSubmitItem
  - BFA called synchronously per submission (not deferred) + media tracks stopped on session finish
metrics:
  duration: ~60 min (including fix iterations during human verification)
  completed: "2026-05-19"
  tasks_completed: 7
  files_changed: 4
---

# Phase 05 Plan 03: PhonemeChips + BFA /analyze Refinements

**One-liner:** Four-state colored phoneme chip strip on student phonics result screen (BFA-05); /analyze latency halved via parallel transcription+alignment; four fix commits from human verification session.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Extend BfaResult with transcription + espeak_fallback | b9de64b | admin-api.ts |
| 2 | PhonemeChips four-state component | 06ff3d2 | PhonemeChips.tsx |
| 3 | Wire PhonemeChips into session results page | d7445cb | page.tsx |
| 4 | fix: call BFA synchronously + stop media tracks | 62cd982 | page.tsx |
| 5 | fix: useRef for currentIndex (stale closure) | e12ed3c | page.tsx |
| 6 | fix: discard stale SpeechRecognition onresult after stop() | a8b8c22 | page.tsx |
| 7 | fix+refactor: parallelize transcription+alignment in /analyze | 448a3af + 7fbde1a | main.py |

## Acceptance Criteria Status

- [x] `PhonemeChips.tsx` exists at `frontend/app/game/session/[id]/_components/PhonemeChips.tsx`
- [x] `bg-green-100`, `bg-yellow-100`, `bg-red-100`, `border-dashed` all present in component
- [x] `data-testid="phoneme-chips"` on wrapper div
- [x] `data-status` attribute on each chip span
- [x] `case 'error': return null` — error entries skipped
- [x] Old two-color inline ternary removed from `page.tsx`
- [x] `import PhonemeChips` + `<PhonemeChips feedback={item.bfa.feedback} />` in `page.tsx`
- [x] `cd frontend && npx tsc --noEmit` exits 0
- [x] BfaResult gains `transcription?: { text: string }` and `espeak_fallback?: boolean`

## Human Verification Status

Task 4 (human checkpoint) performed during execution session. Four chip variants render correctly on live submission. Exactly one BFA POST to `/analyze` per phonics answer observed in network tab (Plans 05-01/05-02 BFA-04 criterion confirmed).

## BFA-05 Criterion

> Student sees per-phoneme feedback chips on the result screen — each chip labeled with the phoneme symbol and colored by correctness status.

**SATISFIED.** Green (correct), yellow (similar), red (substituted/extra), gray-dashed (missing).

## Open Deferred Items

- Tap-chip-to-hear-phoneme — deferred per CONTEXT.md > Deferred Ideas
- Chip tooltips showing phoneme name (e.g. "alveolar trill") — deferred
