---
phase: 05-bfa-quality-performance
plan: "04"
subsystem: bfa-service/tests + backend/bfa/tests
tags: [testing, pytest, jest, bfa, regression]
dependency_graph:
  requires: [05-02]
  provides: [test_bfa.py, bfa.service.spec.ts]
  affects:
    - bfa-service/test_bfa.py
    - backend/src/bfa/bfa.service.spec.ts
tech_stack:
  added: [pytest]
  patterns: [sys.modules-stub-before-import, jest.mock-axios-module-level]
key_files:
  created:
    - bfa-service/test_bfa.py
    - backend/src/bfa/bfa.service.spec.ts
  modified: []
decisions:
  - sys.modules stubs applied before `import main` — avoids whisperx/fastapi import-time errors
  - MagicMock() sufficient for all stubs — FastAPI decorators absorbed silently on mocked app
  - No conftest.py — single test_bfa.py file to avoid pytest discovery complications
  - BfaService instantiated directly (no NestJS testing module) — no constructor injection
  - FormData._streams inspection for field content — documented as form-data npm implementation detail
metrics:
  duration: ~20 min
  completed: "2026-05-19"
  tasks_completed: 2
  files_changed: 2
---

# Phase 05 Plan 04: BFA Unit Test Suite

**One-liner:** Python pytest (24 tests) + NestJS Jest (13 tests) locking D-01 regression, scoring algorithm, and HTTP bridge behavior — runs without Docker.

## Test Results

### Python pytest (bfa-service/test_bfa.py)

```
============================= test session starts ==============================
collected 24 items

test_bfa.py::test_phoneme_cost_identical PASSED
test_bfa.py::test_phoneme_cost_all_similar_pairs PASSED
test_bfa.py::test_phoneme_cost_unrelated PASSED
test_bfa.py::test_phoneme_cost_vietnamese_confusion_pairs PASSED
test_bfa.py::test_seeded_word_cat_perfect PASSED
test_bfa.py::test_seeded_word_dog_perfect PASSED
test_bfa.py::test_seeded_word_ship_perfect PASSED
test_bfa.py::test_vietnamese_final_consonant_deletion_ship PASSED
test_bfa.py::test_vietnamese_final_consonant_deletion_cat PASSED
test_bfa.py::test_vietnamese_lr_confusion_d01_regression PASSED
test_bfa.py::test_vietnamese_vb_confusion PASSED
test_bfa.py::test_vietnamese_thd_confusion PASSED
test_bfa.py::test_vietnamese_pb_confusion_ship PASSED
test_bfa.py::test_score_alignment_substituted_unrelated PASSED
test_bfa.py::test_score_alignment_extra_phonemes PASSED
test_bfa.py::test_score_alignment_empty_expected_all_extra PASSED
test_bfa.py::test_score_alignment_empty_both PASSED
test_bfa.py::test_score_alignment_mixed_correct_similar_missing PASSED
test_bfa.py::test_normalize_ipa_strips_primary_stress PASSED
test_bfa.py::test_normalize_ipa_strips_length_mark PASSED
test_bfa.py::test_normalize_ipa_strips_secondary_stress PASSED
test_bfa.py::test_normalize_ipa_lowercases PASSED
test_bfa.py::test_normalize_ipa_maps_k_to_c PASSED
test_bfa.py::test_error_payload_shape PASSED

============================== 24 passed in 0.08s ==============================
```

### NestJS Jest (backend/src/bfa/bfa.service.spec.ts)

```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

## D-01 Regression Guard Status

**PASSED** — `test_vietnamese_lr_confusion_d01_regression` asserts `ops[0]["status"] == "similar"` for l/r pair. Any revert of the D-01 fix breaks this test immediately.

## Phase BFA Requirement Rollup

| Req | Description | Status |
|-----|-------------|--------|
| BFA-01 | `similar` ops get timestamps (D-01 fix in 05-01) | ✓ SATISFIED |
| BFA-02 | Word.phonemes stored; game service passes stored phonemes (05-02) | ✓ SATISFIED |
| BFA-03 | WhisperX + aligner preloaded on startup; /health reports status (05-01) | ✓ SATISFIED |
| BFA-04 | Single /analyze call; TS client updated; game service collapses two calls (05-01/05-02) | ✓ SATISFIED |
| BFA-05 | Per-phoneme colored chips on student result screen (05-03) | ✓ SATISFIED |
