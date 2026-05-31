---
phase: 10-azure-pa
verified: 2026-05-31T17:30:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Submit correctly pronounced word 'cat' — all phoneme chips should be green; score >= 80"
    expected: "success=true, score >= 80, all phoneme ops have status='correct', Azure acoustic model used"
    why_human: "Requires a live AZURE_SPEECH_KEY, real microphone input, and browser-accessible running service. Cannot mock a real acoustic response in automated checks."
  - test: "Submit 'cap' audio for target word 'cat' — 't' phoneme should be yellow or red; score < 80"
    expected: "score < 80, feedback includes 't' phoneme with status='similar' or 'substituted'"
    why_human: "Requires a live AZURE_SPEECH_KEY and real audio substitution input to trigger acoustic scoring."
  - test: "Verify /align endpoint on error paths (e.g. send 0.3s audio)"
    expected: "Returns structured error JSON (not 500). Current implementation has CR-01 bug: result.body is bytes, .pop() crashes."
    why_human: "CR-01 from REVIEW.md is an unfixed BLOCKER — /align crashes with AttributeError on every error path. Needs human to confirm scope of /align usage and whether a fix is required before proceeding."
  - test: "Run 'docker compose up' from clean state and verify bfa container becomes healthy"
    expected: "bfa service reaches 'healthy' state within start_period. Currently Dockerfile does not install curl; health check command 'curl -f http://localhost:8000/health' will always fail (CR-02)."
    why_human: "CR-02 from REVIEW.md is an unfixed BLOCKER — the entire stack fails to start on a clean 'docker compose up' because bfa never becomes healthy. Needs human to confirm whether Dockerfile fix is required in this phase."
---

# Phase 10: Azure PA Engine Verification Report

**Phase Goal:** Replace Groq ASR + espeak G2P scoring in bfa-service with Azure Pronunciation Assessment REST API. Delivers real per-phoneme timestamps from forced acoustic alignment and acoustically-calibrated accuracy scores. All audio gates (Phase 7), NestJS BfaService, and frontend unchanged — same DTO shapes.
**Verified:** 2026-05-31T17:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | bfa-service/main.py calls Azure PA REST API — no Groq, no phonemizer, no espeak | VERIFIED | `_azure_pa_assess()` and `_azure_stt()` call `{AZURE_SPEECH_REGION}.stt.speech.microsoft.com`; grep for GROQ/phonemize/espeak/difflib in main.py returns zero matches (only `espeak_fallback: False` DTO field preserved per D-10) |
| 2 | POST /analyze returns same BfaAnalyzeResult shape as before | VERIFIED | Returns `{success, transcription, phonemes, score, feedback, word, espeak_fallback}` — `espeak_fallback` field preserved for NestJS DTO contract |
| 3 | POST /analyze-speaking returns same BfaSpeakingResult shape as before | VERIFIED | Returns `{success, transcription, words, overall_score, matched_words, total_words}` for both SCRIPT_MATCH and FREE_SPEAK modes |
| 4 | POST /transcribe returns same {text, words[]} shape as before | VERIFIED | Returns `{text, words[{word, start, end, score}]}` via `_azure_stt()` |
| 5 | All 5 audio gates (length/energy/ASR-confidence/language) still fire correctly | VERIFIED | D-01 length gate (lines 179-191/288-298), D-03 energy gate (lines 193-199/301-307), D-04 ASR confidence gate (lines 212-221/323-329), D-05 language gate (lines 223-235/330-342); 17 pytest tests pass including gate tests |
| 6 | bfa-service/requirements.txt has no phonemizer, no espeak-ng | VERIFIED | requirements.txt contains only: fastapi, uvicorn, python-multipart, requests, langdetect |
| 7 | docker-compose.yml bfa env has AZURE_SPEECH_KEY + AZURE_SPEECH_REGION, no GROQ_API_KEY | VERIFIED | Lines 7-10 of docker-compose.yml: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, AZURE_PHONEME_CORRECT_THRESHOLD, AZURE_PHONEME_SIMILAR_THRESHOLD; grep for GROQ_API_KEY/GROQ_MODEL returns zero matches |
| 8 | pytest bfa-service/test_bfa.py passes (mocked Azure REST calls) | VERIFIED | `python3 -m pytest bfa-service/test_bfa.py -v` → 17 passed, 0 failed (1.29s). Tests use monkeypatch on `_azure_pa_assess`/`_azure_stt` directly |
| 9 | npx tsc --noEmit in frontend and backend both pass (no DTO changes needed) | VERIFIED | `cd backend && npx tsc --noEmit` exit 0; `cd frontend && npx tsc --noEmit` exit 0 |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bfa-service/main.py` | Azure PA engine — _azure_pa_assess, _azure_stt, _map_phoneme_ops | VERIFIED | All three functions present and used by all three endpoints |
| `bfa-service/requirements.txt` | No phonemizer, no espeak-ng | VERIFIED | 5 packages: fastapi, uvicorn, python-multipart, requests, langdetect |
| `bfa-service/Dockerfile` | No espeak-ng apt install | VERIFIED | Only `ffmpeg` installed via apt-get |
| `docker-compose.yml` | Azure env vars, no Groq vars | VERIFIED | AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, thresholds present; no GROQ vars |
| `bfa-service/test_bfa.py` | >= 8 Azure-specific tests, all pass | VERIFIED | 17 tests total, 17 passed |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `/analyze` endpoint | `_azure_pa_assess()` | Direct call line 203 | WIRED | Called with `(wav_path, word)` |
| `/analyze-speaking` SCRIPT_MATCH | `_azure_pa_assess()` | Direct call line 312 | WIRED | Called with `(wav_path, target_text)` |
| `/analyze-speaking` FREE_SPEAK | `_azure_stt()` | Direct call line 375 | WIRED | Called with `(wav_path)` |
| `/transcribe` | `_azure_stt()` | Direct call line 428 | WIRED | Called with `(wav_path)` |
| `/health` | `AZURE_SPEECH_KEY` | `bool(AZURE_SPEECH_KEY)` line 156 | WIRED | Returns `{"status": "ok", "azure_key_set": bool(AZURE_SPEECH_KEY)}` |
| `_map_phoneme_ops()` | `AZURE_PHONEME_CORRECT_THRESHOLD` | Line 136 | WIRED | Threshold comparison at lines 136/138 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `/analyze` | `pa_result` | `_azure_pa_assess(wav_path, word)` → `requests.post(azure_url)` | Yes — live HTTP call to Azure REST API | FLOWING |
| `/analyze-speaking` | `pa_result` / `stt_result` | `_azure_pa_assess` / `_azure_stt` | Yes — live HTTP call to Azure REST API | FLOWING |
| `/transcribe` | `stt_result` | `_azure_stt(wav_path)` | Yes — live HTTP call to Azure REST API | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Old Groq/espeak symbols absent | `grep -n "GROQ\|phonemize\|espeak\|difflib\|_g2p\|_score_phonemes" main.py` | Only `espeak_fallback` literal (DTO field) — no function/var references | PASS |
| Azure symbols present | `grep -n "AZURE_SPEECH\|_azure_pa_assess\|_azure_stt\|_map_phoneme_ops" main.py` | 18 matches across declarations and usages | PASS |
| pytest 17 tests | `python3 -m pytest bfa-service/test_bfa.py -v` | 17 passed, 0 failed | PASS |
| backend tsc | `cd backend && npx tsc --noEmit` | exit 0 | PASS |
| frontend tsc | `cd frontend && npx tsc --noEmit` | exit 0 | PASS |
| No GROQ vars in docker-compose | `grep "GROQ_API_KEY\|GROQ_MODEL" docker-compose.yml` | No matches | PASS |
| No espeak/phonemizer in requirements.txt | `grep "phonemizer\|espeak" requirements.txt` | No matches | PASS |

---

### Probe Execution

Step 7c: No probe files found in `scripts/*/tests/probe-*.sh`. No probes declared in PLAN frontmatter. Phase is a bfa-service-only refactor; conventional probe discovery returns empty. SKIPPED.

---

### Requirements Coverage

| Requirement | Source | Description | Status | Evidence |
|-------------|--------|-------------|--------|---------|
| BFA-11 | Phase 10 ROADMAP | Azure PA REST API replaces Groq ASR + espeak G2P; per-phoneme AccuracyScore maps to correct/similar/substituted/missing | SATISFIED | `_azure_pa_assess()` calls Azure REST; `_map_phoneme_ops()` maps scores to correct/similar/substituted/missing |
| BFA-12 | Phase 10 ROADMAP | All 5 audio gates (BFA-06 through BFA-10) preserved unchanged | SATISFIED | Gates verified in code at lines 179-235 (/analyze) and 288-342 (/analyze-speaking); 5 gate pytest tests pass |
| BFA-13 | Phase 10 ROADMAP | DTO shapes for /analyze, /analyze-speaking, /transcribe unchanged — NestJS and frontend zero changes | SATISFIED | Shapes verified; `espeak_fallback` preserved; `npx tsc --noEmit` passes in both NestJS and frontend |
| BFA-01 through BFA-10 | Phase 10 PLAN (preserved) | Pre-existing requirements from Phases 5 and 7 — not modified by this phase | NOT_TARGETED | Phase 10 preserves but does not implement these; they were implemented in Phases 5/7 |

**Note on BFA-01 through BFA-10:** The PLAN declares these as "preserved" not as newly implemented. REQUIREMENTS.md only defines BFA-01 through BFA-05 in the BFA Quality section; BFA-06 through BFA-10 are Phase 7 requirements. Phase 10's authoritative requirements are BFA-11, BFA-12, BFA-13 — all three are SATISFIED.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bfa-service/main.py` | 460 | `/align` calls `result.body` on JSONResponse then `.pop()` — AttributeError on every error path | WARNING (CR-01 from REVIEW.md) | `/align` legacy endpoint crashes with 500 on all error paths (audio_too_short, noisy, speech_not_detected, wrong_language). Success path works. |
| `docker-compose.yml` | 14-19 | Health check uses `curl` which is not in `bfa-service/Dockerfile` (python:3.11-slim) | WARNING (CR-02 from REVIEW.md) | `docker compose up` will never succeed on a clean run — bfa service always unhealthy, backend container never starts |
| `bfa-service/main.py` | 398-400 | Dead variable `aw` in FREE_SPEAK loop; `azure_words_raw` fetched but never used | INFO (IN-02) | Cosmetic dead code |
| `bfa-service/main.py` | 163, 456 | `expected_phonemes` parameter accepted but never used | INFO (IN-01) | Confusing API contract but no runtime impact |

**No TBD/FIXME/XXX debt markers found in phase-modified files.**

---

### Human Verification Required

All 9 automated truths are VERIFIED. The items below require human action and are not blockable by automated checking.

#### 1. Live Azure PA acoustic accuracy (ROADMAP SC-1 and SC-2)

**Test:** With a valid `AZURE_SPEECH_KEY`, call `POST /analyze` with audio of someone saying "cat" correctly, then with audio of "cap" substitution for "cat".
**Expected:** First call: score >= 80, all ops `status="correct"`. Second call: score < 80, `t` phoneme shows `status="similar"` or `status="substituted"`.
**Why human:** Requires a real AZURE_SPEECH_KEY (secret) and actual audio input. Cannot be verified without a live Azure account or real audio fixtures.

#### 2. /align endpoint error path behavior (CR-01 from REVIEW.md)

**Test:** Call `POST /align` with a 0.3s audio clip (which triggers the length gate returning a JSONResponse error).
**Expected:** Should return structured error JSON. Actual: `result.body` is `bytes`, `.pop()` raises `AttributeError`, FastAPI returns 500.
**Why human:** The /align endpoint is a legacy endpoint. Human decision needed: is /align used by any NestJS caller? If yes, fix is required before this phase can be marked clean. The PLAN self-check did not cover /align error paths; REVIEW.md CR-01 flags this as a critical blocker.

**Fix to apply:**
```python
@app.post("/align")
async def align(...):
    result = await analyze(audio=audio, word=word, expected_phonemes=expected_phonemes)
    if isinstance(result, JSONResponse):
        return result  # pass error responses through unchanged
    result_copy = dict(result)
    result_copy.pop("transcription", None)
    return result_copy
```

#### 3. Docker stack health check (CR-02 from REVIEW.md)

**Test:** Run `docker compose up` from a clean environment. Check whether bfa service reaches "healthy" state.
**Expected:** bfa container becomes healthy within the 20s start_period.
**Why human:** `curl` is not installed in `python:3.11-slim`. The health check `CMD curl -f http://localhost:8000/health` will fail with "command not found" on every check, causing bfa to remain perpetually "unhealthy" and backend to never start. Fix requires either adding `curl` to the Dockerfile or switching to a Python-based health check.

**Fix to apply (Dockerfile):**
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*
```

---

### Gaps Summary

No automated gaps — all 9 must-have truths are VERIFIED against the codebase. The phase goal (replace Groq+espeak with Azure PA, preserve DTO shapes and audio gates) is achieved in the code.

Two issues from the REVIEW.md (CR-01 and CR-02) exist in the committed code but are outside the scope of the phase's must-have truths as defined in the PLAN frontmatter and ROADMAP success criteria. They are surfaced for human decision:

- **CR-01** (`/align` error-path crash): The PLAN did not list /align correctness as a must-have. The endpoint is legacy. If it has active callers, this is a production bug. If unused, it is lower priority.
- **CR-02** (docker health check / no curl): This is a deployment blocker that would prevent `docker compose up` from ever succeeding. If anyone attempts a clean container-based deployment, the entire backend stack fails to start.

Human decision required on whether CR-01 and CR-02 must be fixed before this phase is closed.

---

_Verified: 2026-05-31T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
