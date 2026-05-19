---
phase: 05-bfa-quality-performance
plan: "01"
subsystem: bfa-service
tags: [bug-fix, thread-safety, startup-warmup, new-endpoint, python, fastapi]
dependency_graph:
  requires: []
  provides:
    - "bfa-service/main.py: similar-timestamp fix (D-01)"
    - "bfa-service/main.py: threading lock on _whisperx_model (D-03)"
    - "bfa-service/main.py: FastAPI lifespan model warm-up (D-03)"
    - "bfa-service/main.py: POST /analyze endpoint (D-04)"
  affects:
    - "05-02: NestJS BfaService.analyze() must use form-data with expected_phonemes field, read transcription.text from response"
tech_stack:
  added:
    - "threading.Lock (stdlib) — double-checked locking for _whisperx_model singleton"
    - "contextlib.asynccontextmanager — FastAPI lifespan handler"
  patterns:
    - "Double-checked locking: fast-path None check outside lock, re-check inside lock"
    - "Shared sync helper (_run_alignment) called from both _align_sync and _analyze_sync"
    - "Fail-loud lifespan: model errors propagate, server does not start degraded"
key_files:
  modified:
    - bfa-service/main.py
decisions:
  - "Used lifespan context manager (FastAPI >= 0.93) over deprecated @app.on_event('startup')"
  - "Transcription failure in _analyze_sync is non-fatal: alignment still runs, transcription.text returns empty string"
  - "Moved logger initialization before lifespan definition to avoid forward-reference confusion"
  - "_run_alignment takes prepared wav_path so ffmpeg conversion is not duplicated in _analyze_sync"
metrics:
  duration: "3m 42s"
  completed: "2026-05-19"
  tasks_completed: 3
  files_modified: 1
---

# Phase 05 Plan 01: BFA Bug Fixes + /analyze Endpoint Summary

Single file updated (`bfa-service/main.py`): fixed similar-timestamp omission, added thread-safe WhisperX singleton, added FastAPI lifespan warm-up, extended /health, and added POST /analyze combining transcription + alignment in one round-trip.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix similar-timestamp bug (D-01) + threading lock for WhisperX (D-03) | 3f868e4 | bfa-service/main.py |
| 2 | Add FastAPI lifespan warm-up for both models + aligner in /health (D-03) | ec0a738 | bfa-service/main.py |
| 3 | Add POST /analyze endpoint + extract _run_alignment helper (D-04) | ea74776 | bfa-service/main.py |

## Diff Stats for bfa-service/main.py

- Lines added: 183
- Lines removed: 68
- Net change: +115 lines
- Original: 546 lines → Final: 660 lines

## What Changed

### Task 1 — D-01 + D-03 lock

**Bug D-01 (similar timestamps):** Added `"similar"` to the `if op["status"] in (...)` tuple in the feedback-build loop. Previously `similar` ops (diagonal DP move, cost 0.5) never received `start`/`end`/`duration` from the aligned phoneme. Now they do, matching `correct`/`substituted`/`extra` behavior.

**Thread safety D-03:** Added `import threading` and `_whisperx_lock = threading.Lock()` at module level. Rewrote `get_whisperx_model()` with double-checked locking:

```python
def get_whisperx_model():
    global _whisperx_model
    if _whisperx_model is not None:       # fast path — no lock
        return _whisperx_model
    with _whisperx_lock:                  # serialize concurrent inits
        if _whisperx_model is None:       # correctness guard inside lock
            _whisperx_model = whisperx.load_model(...)
    return _whisperx_model
```

`get_aligner()` uses `@lru_cache` which is GIL-safe in CPython 3.11 — left unchanged.

### Task 2 — D-03 warm-up + /health

Added `from contextlib import asynccontextmanager` and a lifespan handler defined before `app = FastAPI(lifespan=lifespan)`:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(json.dumps({"event": "startup_warmup_begin"}))
    get_whisperx_model()
    get_aligner()
    logger.info(json.dumps({"event": "startup_warmup_complete", "whisperx_loaded": _whisperx_model is not None}))
    yield
```

No try/except — model failures propagate so uvicorn exits non-zero (fail-loud).

Extended `/health` `models_loaded` with:
```python
"aligner": get_aligner.cache_info().currsize > 0,
```

### Task 3 — D-04 /analyze endpoint

**Refactored `_align_sync`:** Extracted the alignment-only block (energy check → aligner.process_sentence → phoneme_ts → score_alignment → feedback loop → return dict) into `_run_alignment(wav_path, word, expected, espeak_fallback) -> dict`. `_align_sync` now calls `_run_alignment(wav_path, ...)` after ffmpeg conversion.

**Added `_analyze_sync`:** Runs one ffmpeg conversion (with `-t 300`), then:
1. WhisperX transcription (try/except — failure sets `transcription_text = ""`, alignment still runs)
2. `_run_alignment(wav_path, word, expected, espeak_fallback)` — same path as `/align`
3. Merges `"transcription": {"text": transcription_text}` into the alignment result dict

**Added `_analyze_impl`:** Mirrors `_align_impl` — same validation guards (json.loads, isinstance list, MAX_EXPECTED_PHONEMES, MAX_UPLOAD_BYTES), reads audio once, calls `asyncio.to_thread(_analyze_sync, ...)`.

**Added endpoint:**
```python
@app.post("/analyze")
async def analyze(audio: UploadFile = File(...), word: str = Form(...), expected_phonemes: str = Form(...)):
    async with REQUEST_SEMAPHORE:
        return await _analyze_impl(audio, word, expected_phonemes)
```

**Response shape:**
```json
{
  "success": true,
  "transcription": { "text": "cat" },
  "phonemes": [...],
  "score": 85,
  "feedback": [...],
  "word": "cat",
  "espeak_fallback": false
}
```

## Deviations from Plan

None — plan executed exactly as written.

All three LOCKED decisions (D-01, D-03, D-04) implemented as specified. No new files created in `bfa-service/`. No other Python files modified.

## Live Testing

Static parse only (`python3 -c "import ast; ast.parse(open('bfa-service/main.py').read())"` exits 0). Live end-to-end testing (`uvicorn main:app` + curl against dockerized BFA) deferred to plan 05-02 when NestJS bridge is wired and Docker image is running.

## Threat Surface Scan

No new network endpoints beyond `/analyze` (which was the planned addition). `/analyze` inherits all existing input validation from `_align_impl` pattern: `json.loads` + `isinstance(list)` + `MAX_EXPECTED_PHONEMES` + `MAX_UPLOAD_BYTES`. `REQUEST_SEMAPHORE` gates all three endpoints uniformly. No new trust boundaries introduced.

## Open Follow-ups for Plan 05-02

1. **NestJS form-data field name:** `BfaService.analyze()` must send `expected_phonemes` as a form-data string field (JSON-stringified array), matching `/analyze`'s `Form(...)` declaration — same as `/align`.
2. **Response field path:** NestJS must read `response.transcription.text` (not `response.text`) for the transcription result.
3. **New DTO:** Add `BfaAnalyzeResult` interface extending `BfaAlignResult` with `transcription: { text: string }` to `bfa.dto.ts`.
4. **Health check validation:** After dockerized deploy, confirm `GET /health` returns `models_loaded.whisperx: true` and `models_loaded.aligner: true` before first request.
5. **Live /analyze test:** POST multipart with a similar-pair word (e.g. say "rat" expecting ["l","a","t"]) — verify `feedback` entry for `r` has `status: "similar"` with populated `start`/`end`/`duration`.

## Self-Check: PASSED

- bfa-service/main.py: FOUND
- 05-01-SUMMARY.md: FOUND
- Commit 3f868e4 (Task 1): FOUND
- Commit ec0a738 (Task 2): FOUND
- Commit ea74776 (Task 3): FOUND
- AST parse: OK
