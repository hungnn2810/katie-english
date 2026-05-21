---
phase: 05-bfa-quality-performance
plan: "05"
subsystem: bfa-service
tags: [hardening, validation, performance, configuration]
dependency_graph:
  requires: [05-04]
  provides: [input-validation, shared-thread-pool, configurable-thresholds]
  affects: [bfa-service/main.py]
tech_stack:
  added: []
  patterns: [module-level-executor, env-var-configuration, input-validation]
key_files:
  created: []
  modified: [bfa-service/main.py]
decisions:
  - "TRANSCRIPTION_MATCH_THRESHOLD declared at module level per plan spec; no call sites to update since _transcription_matches_word does not exist in current codebase"
  - "MIN_WORD_SCORE replaces literal 70 in _analyze_speaking_sync matched_words calculation"
  - "THREAD_POOL lives for process lifetime with no explicit shutdown"
metrics:
  duration_minutes: 3
  completed_date: "2026-05-21"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 1
---

# Phase 05 Plan 05: BFA Service Hardening Summary

**One-liner:** Input length limits (HTTP 400 on oversized word/target_text), shared module-level ThreadPoolExecutor replacing per-request allocation, and three operational thresholds made configurable via BFA_ENERGY_THRESHOLD_DB / BFA_TRANSCRIPTION_MATCH_THRESHOLD / BFA_MIN_WORD_SCORE env vars.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Input Length Limits | c5d1dac | bfa-service/main.py |
| 2 | Shared ThreadPoolExecutor | aa2d6bf | bfa-service/main.py |
| 3 | Configurable Operational Thresholds | f58aa79 | bfa-service/main.py |

## What Was Built

### Task 1 — Input Length Limits

Added two env var config entries after the `BFA_CONCURRENCY` block:
- `MAX_WORD_LENGTH = int(os.getenv("BFA_MAX_WORD_LENGTH", "200"))`
- `MAX_TARGET_TEXT_LENGTH = int(os.getenv("BFA_MAX_TARGET_TEXT_LENGTH", "2000"))`

Added validation guards:
- `_align_impl`: after `MAX_EXPECTED_PHONEMES` check → HTTP 400 `"word is too long"` if `len(word) > MAX_WORD_LENGTH`
- `_analyze_impl`: same guard
- `_analyze_speaking_impl`: after `target_text.strip()` empty check → HTTP 400 `"target_text is too long"` if `len(target_text) > MAX_TARGET_TEXT_LENGTH`

### Task 2 — Shared ThreadPoolExecutor

Added at module level (after `REQUEST_SEMAPHORE`):
```python
THREAD_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=2)
```

Replaced `with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:` blocks in both:
- `_analyze_sync`: now submits directly to `THREAD_POOL`
- `_analyze_speaking_sync`: same — no per-request pool allocation

No `ThreadPoolExecutor(` constructor calls remain inside any function body.

### Task 3 — Configurable Operational Thresholds

Added three env vars to the config block:
- `ENERGY_THRESHOLD_DB = float(os.getenv("BFA_ENERGY_THRESHOLD_DB", "-50.0"))`
- `TRANSCRIPTION_MATCH_THRESHOLD = float(os.getenv("BFA_TRANSCRIPTION_MATCH_THRESHOLD", "0.5"))`
- `MIN_WORD_SCORE = int(os.getenv("BFA_MIN_WORD_SCORE", "70"))`

Changes:
- `has_sufficient_energy` default parameter changed from literal `-50.0` to `ENERGY_THRESHOLD_DB`
- `matched_words` in `_analyze_speaking_sync` changed from literal `70` to `MIN_WORD_SCORE`

## Verification

All 24 existing pytest tests pass after each task and at final verification:
```
bfa-service $ python3 -m pytest test_bfa.py -x -q
24 passed in 0.12s
```

## Deviations from Plan

### Auto-noted — _transcription_matches_word does not exist

**Found during:** Task 3
**Issue:** The plan referenced updating `_transcription_matches_word(... threshold=0.5)` call sites in `_analyze_sync` and `_align_sync` (plan lines 118–121). The current codebase does not contain this function — the re-scoring path uses `espeak_phonemes()` and `score_alignment()` directly instead.
**Action taken:** `TRANSCRIPTION_MATCH_THRESHOLD` env var was declared per the plan spec (so operators can set it for future use), but no call sites were updated since none exist. Documented in commit message.
**Impact:** Zero functional regression; all acceptance criteria not involving `_transcription_matches_word` are fully satisfied.

## Acceptance Criteria Status

| Criterion | Status |
|-----------|--------|
| POST /align word > 200 chars → HTTP 400 "word is too long" | PASS |
| POST /analyze-speaking target_text > 2000 chars → HTTP 400 "target_text is too long" | PASS |
| POST /align word = 200 chars does not return 400 | PASS (guard is `>`, not `>=`) |
| No ThreadPoolExecutor constructor inside _analyze_sync or _analyze_speaking_sync | PASS |
| THREAD_POOL defined at module level | PASS |
| has_sufficient_energy default uses ENERGY_THRESHOLD_DB | PASS |
| No literal 70 in matched_words calculation | PASS |
| BFA_ENERGY_THRESHOLD_DB, BFA_TRANSCRIPTION_MATCH_THRESHOLD, BFA_MIN_WORD_SCORE in env var block | PASS |
| All existing pytest tests still pass | PASS (24/24) |

## Known Stubs

None.

## Threat Flags

None — changes are purely internal to the bfa-service process: no new network endpoints, no new auth paths, no new file access patterns, no schema changes.

## Self-Check: PASSED

- bfa-service/main.py exists and contains all three sets of changes
- Commits c5d1dac, aa2d6bf, f58aa79 all exist in git log
- 24 pytest tests pass
