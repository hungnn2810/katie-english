---
phase: 10-azure-pa
plan: "01"
subsystem: bfa-service
tags: [azure, pronunciation-assessment, speech, bfa, refactor]
dependency_graph:
  requires: []
  provides: [azure-pa-engine]
  affects: [bfa-service/main.py, bfa-service/requirements.txt, bfa-service/Dockerfile, docker-compose.yml]
tech_stack:
  added: []
  patterns:
    - Azure Pronunciation Assessment REST API (no SDK, requests-only)
    - _azure_pa_assess() for PA+ASR in one call
    - _azure_stt() for STT-only (FREE_SPEAK/transcribe)
    - _map_phoneme_ops() mapping AccuracyScore to correct/similar/substituted/missing
key_files:
  created: []
  modified:
    - bfa-service/main.py
    - bfa-service/requirements.txt
    - bfa-service/Dockerfile
    - docker-compose.yml
    - bfa-service/test_bfa.py
decisions:
  - REST API over Python SDK — no native blobs, lighter Docker image, requests already in deps
  - Mock _azure_pa_assess/_azure_stt directly in tests (not requests.post) — avoids AZURE_SPEECH_KEY guard in unit tests
  - espeak_fallback field preserved in /analyze response — NestJS DTO contract unchanged (D-10)
metrics:
  duration: 5 minutes
  completed: "2026-05-31T16:45:11Z"
  tasks_completed: 6
  files_modified: 5
---

# Phase 10 Plan 01: Replace BFA Engine with Azure Pronunciation Assessment REST API Summary

**One-liner:** Replaced Groq ASR + espeak G2P scoring pipeline in bfa-service with Azure PA REST API — single HTTP call returns ASR transcript + per-phoneme acoustic scores; all 5 audio gates, DTO shapes, and NestJS integration unchanged.

## What Was Built

Swapped the BFA scoring engine from Groq Whisper + espeak/phonemizer to Azure Pronunciation Assessment REST API. The change is entirely contained in bfa-service — no NestJS, frontend, or DTO changes were needed.

**Key changes:**

- `docker-compose.yml`: Replaced `GROQ_API_KEY`/`GROQ_MODEL` env vars with `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_PHONEME_CORRECT_THRESHOLD`, `AZURE_PHONEME_SIMILAR_THRESHOLD`
- `bfa-service/requirements.txt`: Removed `phonemizer==3.3.0` and `espeak-ng==1.51.1`
- `bfa-service/Dockerfile`: Removed `espeak-ng` and `libespeak-ng-dev` apt packages; kept `ffmpeg`
- `bfa-service/main.py`: Full engine rewrite — removed `_groq_transcribe`, `_g2p`, `_is_similar`, `_score_phonemes`, `_distribute_timestamps`, `_calc_score`, `_SIMILAR_PAIRS`, `difflib` import; added `_azure_pa_assess`, `_azure_stt`, `_map_phoneme_ops`; all 3 endpoints rewritten to use Azure
- `bfa-service/test_bfa.py`: Rewrote scoring tests to mock `_azure_pa_assess`/`_azure_stt` directly; added 8 new Azure-specific test cases; 17 tests total, all passing

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d2ce233 | chore(10-01): swap bfa env vars from Groq to Azure PA |
| 2 | 5c109ea | chore(10-01): remove phonemizer and espeak-ng from bfa requirements |
| 3 | 263d8b4 | chore(10-01): remove espeak-ng from Dockerfile apt install |
| 4 | 1dc66d1 | feat(10-01): rewrite bfa-service engine to use Azure PA REST API |
| 5 | 6d66795 | test(10-01): rewrite test_bfa.py for Azure PA REST API |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mocked requests.post instead of _azure_pa_assess in tests**

- **Found during:** Task 5 — first test run
- **Issue:** Tests that patched `main_module.requests.post` failed because `_azure_pa_assess` checks `AZURE_SPEECH_KEY` before calling `requests.post`, raising `RuntimeError("AZURE_SPEECH_KEY not set")` before the mock was reached
- **Fix:** Changed all Azure scoring tests to monkeypatch `_azure_pa_assess` and `_azure_stt` directly, bypassing the key guard entirely — cleaner isolation, same coverage
- **Files modified:** `bfa-service/test_bfa.py`
- **Commit:** 6d66795 (included in Task 5 commit after fix)

## Known Stubs

None — all endpoints fully implemented with real Azure PA integration.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The existing `/analyze`, `/analyze-speaking`, `/transcribe` endpoints are unchanged in signature; only the internal engine (HTTP call target) changed from Groq to Azure.

## Self-Check: PASSED

- [x] `bfa-service/main.py` has no `GROQ`, `groq`, `phonemize`, `difflib`, `_g2p`, `_score_phonemes`, `_distribute_timestamps`, `_SIMILAR_PAIRS`, `_calc_score` references (only `espeak_fallback` DTO field preserved for NestJS contract)
- [x] `bfa-service/requirements.txt` has no `phonemizer`, `espeak-ng`
- [x] `docker-compose.yml` bfa env has `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, no `GROQ_API_KEY`
- [x] `_map_phoneme_ops()` present and uses `AZURE_PHONEME_CORRECT_THRESHOLD`
- [x] `/analyze` body uses `_azure_pa_assess()`
- [x] `/analyze-speaking` SCRIPT_MATCH branch uses `_azure_pa_assess()`
- [x] `/analyze-speaking` FREE_SPEAK branch uses `_azure_stt()`
- [x] `/transcribe` uses `_azure_stt()`
- [x] `/health` returns `azure_key_set`
- [x] All 5 audio gates present in `/analyze` and `/analyze-speaking`
- [x] `test_bfa.py` has 17 tests, all passing
- [x] `backend tsc --noEmit` → 0 errors
- [x] `frontend tsc --noEmit` → 0 errors
