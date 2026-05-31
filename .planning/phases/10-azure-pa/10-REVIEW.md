---
phase: 10-azure-pa
reviewed: 2026-05-31T16:51:27Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - bfa-service/Dockerfile
  - bfa-service/main.py
  - bfa-service/requirements.txt
  - bfa-service/test_bfa.py
  - docker-compose.yml
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-31T16:51:27Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This phase introduces the `bfa-service` Python microservice (FastAPI + Azure Pronunciation Assessment), its Docker configuration, and test suite. The service provides three endpoints (`/analyze`, `/analyze-speaking`, `/transcribe`) plus a legacy `/align` endpoint.

Three blockers were found. The most severe is a guaranteed runtime crash in the `/align` endpoint on all error paths. The second blocker prevents the entire stack from starting due to a missing `curl` binary used by the health check. The third is a hardcoded production password that is committed into the repository. Five warnings cover unhandled exceptions, misleading error codes, dead code, and input validation gaps.

---

## Critical Issues

### CR-01: `/align` endpoint crashes with 500 on every error path

**File:** `bfa-service/main.py:460-462`
**Issue:** The `/align` endpoint delegates to `analyze()` and then does:
```python
result_dict = result if isinstance(result, dict) else result.body
result_dict.pop("transcription", None)
return result_dict
```
When `analyze()` returns an error, it returns a `JSONResponse` object (not a `dict`). In that case `result.body` is `bytes` (e.g. `b'{"success":false,...}'`). Calling `.pop()` on `bytes` raises `AttributeError`, which FastAPI surfaces as an unhandled 500. Every error path in `analyze()` (`audio_too_short`, `audio_too_long`, `recording_too_noisy`, `speech_not_detected`, `wrong_language`, Azure failure) follows this code path, so `/align` never returns a structured error to callers — it always crashes. On the success path the dict is mutated in-place (`pop` on the same object reference), which is a side-effect smell but does not crash.

**Fix:**
```python
@app.post("/align")
async def align(
    audio: UploadFile = File(...),
    word: str = Form(...),
    expected_phonemes: str = Form("[]"),
):
    """Legacy endpoint — delegates to /analyze."""
    result = await analyze(audio=audio, word=word, expected_phonemes=expected_phonemes)
    if isinstance(result, JSONResponse):
        return result  # pass error responses through unchanged
    result_copy = dict(result)  # avoid mutating the original
    result_copy.pop("transcription", None)
    return result_copy
```

---

### CR-02: Health check uses `curl` which is not installed in the bfa container — stack never starts

**File:** `docker-compose.yml:15` and `bfa-service/Dockerfile`
**Issue:** The `bfa` service health check is:
```yaml
test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
```
The `bfa-service/Dockerfile` is based on `python:3.11-slim`, which does **not** include `curl`. The `apt-get install` step only installs `ffmpeg`. Since `curl` is absent, every health check invocation exits non-zero, meaning the `bfa` service is always reported unhealthy. The `backend` service declares `condition: service_healthy` on `bfa`, so the backend container will never start in any `docker compose up` invocation. The entire stack is broken on a clean run.

**Fix — Option A (install curl in Dockerfile):**
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*
```

**Fix — Option B (use Python for health check in docker-compose.yml):**
```yaml
healthcheck:
  test: ['CMD', 'python', '-c',
    'import urllib.request; urllib.request.urlopen("http://localhost:8000/health")']
  interval: 10s
  timeout: 10s
  retries: 10
  start_period: 20s
```

---

### CR-03: Hardcoded production credentials committed to the repository

**File:** `docker-compose.yml:24,41,58,62,67`
**Issue:** Multiple credentials are hardcoded as literal values in `docker-compose.yml`:
- `POSTGRES_PASSWORD: Pass1234!` (line 24)
- `MINIO_ROOT_PASSWORD: Pass1234!` (line 41)
- `DATABASE_URL: postgresql://postgres:Pass1234!@postgres:5432/phonics` (line 58)
- `MINIO_SECRET_KEY: Pass1234!` (line 62)
- `TEACHER_PASSWORD: Pass1234!` (line 67)

These are committed into the git history. If this repository is ever pushed to a shared remote, these credentials will be permanently accessible. `ADMIN_PASSWORD` correctly uses an env-var default `${ADMIN_PASSWORD:-Admin1234!}` — the same pattern must be applied to all other credentials.

**Fix:** Replace all hardcoded secrets with env-var references, e.g.:
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD must be set}
DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/phonics
MINIO_SECRET_KEY: ${MINIO_SECRET_KEY:?MINIO_SECRET_KEY must be set}
TEACHER_PASSWORD: ${TEACHER_PASSWORD:?TEACHER_PASSWORD must be set}
```
Store actual values in a `.env` file that is listed in `.gitignore`.

---

## Warnings

### WR-01: `_to_wav` failure is unhandled — malformed upload causes unstructured 500

**File:** `bfa-service/main.py:176,284,425`
**Issue:** `_to_wav()` raises `RuntimeError` when `ffmpeg` exits non-zero (e.g. the uploaded bytes are not a valid audio format). This call is made outside any `try/except` block in `/analyze` (line 176), `/analyze-speaking` (line 284), and `/transcribe` (line 425). An attacker — or a misbehaving client — can send arbitrary bytes, cause `ffmpeg` to fail, and receive an unhandled 500 response rather than a clean 400 with a user-friendly message. All subsequent pipeline steps (duration gate, energy gate, Azure) are guarded, making this omission inconsistent.

**Fix:** Wrap `_to_wav` in all three endpoints:
```python
try:
    _to_wav(in_path, wav_path)
except RuntimeError as e:
    logger.warning(f"ffmpeg conversion failed: {e}")
    return JSONResponse(status_code=400, content={
        "success": False,
        "error": "invalid_audio",
        "message": "Could not process audio — unsupported format",
    })
```

---

### WR-02: Energy gate fires on silence but error code/message says "too noisy"

**File:** `bfa-service/main.py:194-199,302-307`
**Issue:** `_rms_dbfs()` measures signal energy in dBFS. A low value (e.g. -100 dBFS for silence) means the recording is **too quiet**, not too noisy. Both `/analyze` and `/analyze-speaking` trigger this gate when `rms < ENERGY_THRESHOLD_DB` (-50 dBFS), then return:
```python
"error": "recording_too_noisy",
"message": "Mic quá ồn — tìm chỗ yên tĩnh hơn nhé",  # "Mic too noisy"
```
This is the wrong error code and message. Students will be told their mic is noisy when they submitted a silent recording, which is confusing and unactionable. The test `test_energy_gate` asserts this wrong error code (`recording_too_noisy`) on a silent (amplitude=0) fixture, confirming the mismatch is baked into both production code and tests.

**Fix:** Change the error code and message for the silence/low-energy case:
```python
"error": "audio_too_quiet",
"message": "Không nghe thấy giọng — nói to hơn nhé",  # "Can't hear voice — speak louder"
```
Update `test_energy_gate` assertion to match the corrected error code.

---

### WR-03: Word index alignment in `SCRIPT_MATCH` can silently pair wrong words

**File:** `bfa-service/main.py:348-360`
**Issue:** The code maps Azure's returned word list to the target words by positional index:
```python
target_words = target_text.split()
for i, tw in enumerate(target_words):
    aw = azure_words[i] if i < len(azure_words) else {}
```
`target_text.split()` uses whitespace tokenization, but Azure's STT tokenizer handles contractions (e.g. `"I'm"` → `["I", "'m"]`), hyphenated words, and punctuation differently. When the tokenization diverges, `azure_words[i]` references the wrong word's phoneme data, silently attaching incorrect feedback to the wrong target word. The user sees misleading per-word scores with no error.

**Fix:** Match on the `Word` field from Azure rather than position:
```python
azure_word_map = {w.get("Word", "").lower(): w for w in azure_words}
for tw in target_words:
    aw = azure_word_map.get(tw.lower(), {})
    ...
```
This is still imperfect for duplicate words but eliminates the systematic offset bug.

---

### WR-04: `_to_wav` stderr from ffmpeg is decoded without specifying encoding

**File:** `bfa-service/main.py:52`
**Issue:**
```python
raise RuntimeError(f"ffmpeg failed: {result.stderr.decode()}")
```
`bytes.decode()` defaults to the system locale encoding. On some container environments (e.g. `C` locale or non-UTF-8 locales), ffmpeg's stderr may contain non-ASCII characters (e.g. filename paths with Unicode). This will raise a `UnicodeDecodeError`, masking the original error and making the failure harder to diagnose.

**Fix:**
```python
raise RuntimeError(f"ffmpeg failed: {result.stderr.decode('utf-8', errors='replace')}")
```

---

### WR-05: `bfa` service port 3002 exposed to host with no authentication

**File:** `docker-compose.yml:13`
**Issue:**
```yaml
ports:
  - '3002:8000'
```
The bfa-service exposes all endpoints (including `/analyze` which proxies audio data to Azure using the project's Azure Speech key) to any process on the Docker host. There is no authentication layer on any endpoint. If this compose file is used in a shared or staging environment, unauthorized callers can consume the Azure Speech quota and access the scoring API without any credentials.

**Fix:** Remove the host-port binding for internal-only services, or add an `X-Internal-Key` header check. If local debugging access is needed, restrict the binding:
```yaml
ports:
  - '127.0.0.1:3002:8000'
```

---

## Info

### IN-01: `expected_phonemes` parameter is accepted but never used

**File:** `bfa-service/main.py:163,456`
**Issue:** Both `/analyze` and `/align` accept `expected_phonemes: str = Form("[]")` as a parameter. The value is never parsed or referenced in any logic. The parameter name implies the caller's expected phoneme list would influence scoring or alignment, but it is completely ignored.

**Fix:** Either implement the intended behavior, or remove the parameter from the form definition and API contract to avoid confusing callers:
```python
# Remove from /analyze and /align signatures:
# expected_phonemes: str = Form("[]"),
```

---

### IN-02: Dead variable `aw` in `FREE_SPEAK` mode

**File:** `bfa-service/main.py:399-400`
**Issue:** In the `FREE_SPEAK` branch:
```python
for i, tw in enumerate(target_words):
    aw = azure_words_raw[i] if i < len(azure_words_raw) else {}
    word_results.append({"word": tw, "phonemes": [], "score": 100, "feedback": []})
```
`aw` is assigned but never read. `azure_words_raw` is fetched from Azure's STT result (line 395) but also never used. All word scores are hardcoded to 100 regardless of what Azure returned. The loop body only needs `tw`.

**Fix:**
```python
for tw in target_words:
    word_results.append({"word": tw, "phonemes": [], "score": 100, "feedback": []})
```
If STT word-level data is intended for future use, add a comment; otherwise remove `azure_words_raw` as well.

---

### IN-03: `word` parameter in `/analyze` is not stripped of whitespace

**File:** `bfa-service/main.py:162,203`
**Issue:** `target_text` in `/analyze-speaking` is stripped at line 277 (`target_text = target_text.strip()`), but `word` in `/analyze` is never stripped. If a client sends `word=" cat "` (with surrounding spaces), Azure receives the padded string as `referenceText`, which may cause a `NoMatch` response and a confusing `speech_not_detected` error for correctly pronounced audio.

**Fix:** Add stripping after the `word` parameter is received:
```python
word = word.strip()
```

---

_Reviewed: 2026-05-31T16:51:27Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
