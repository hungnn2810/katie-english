---
status: testing
phase: 05-bfa-quality-performance
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md]
started: 2026-05-19T22:40:00Z
updated: 2026-05-19T22:40:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running BFA service (uvicorn). Clear lock files or temp state if any.
  Start the BFA service from scratch: `cd bfa-service && uvicorn main:app --port 8001`.
  Server boots without errors. Both model warm-up log lines appear:
    {"event": "startup_warmup_begin"}
    {"event": "startup_warmup_complete", "whisperx_loaded": true}
  Then `GET http://localhost:8001/health` returns JSON with
    "models_loaded": {"whisperx": true, "aligner": true}
  and status 200 — no "model not loaded" error on first request.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running BFA service (uvicorn). Clear lock files or temp state if any. Start the BFA service from scratch: `cd bfa-service && uvicorn main:app --port 8001`. Server boots without errors. Both model warm-up log lines appear: {"event": "startup_warmup_begin"} and {"event": "startup_warmup_complete", "whisperx_loaded": true}. Then `GET http://localhost:8001/health` returns JSON with "models_loaded": {"whisperx": true, "aligner": true} and status 200 — no cold-request model-load delay.
result: [pending]

### 2. BFA /analyze Endpoint Response Shape
expected: POST `http://localhost:8001/analyze` with multipart form-data (audio file + `word=cat` + `expected_phonemes=["c","a","t"]`). Response is 200 JSON with all of: `success: true`, `transcription: { text: "..." }`, `phonemes: [...]`, `score: <number>`, `feedback: [...]`, `word: "cat"`, `espeak_fallback: false/true`. No 500. No missing fields.
result: [pending]

### 3. D-01 Fix — Similar Phoneme Gets Timestamp
expected: POST `/analyze` with a word where spoken phoneme is "similar" to expected (e.g. say "rat" but expected is ["l","a","t"] — r/l are a similar pair). In the response `feedback` array, the entry for the r/l mismatch has `"status": "similar"` AND has `"start"`, `"end"`, `"duration"` populated (non-null numbers). Before this fix, similar ops had null timestamps.
result: [pending]

### 4. Single /analyze Call Per Phonics Submission
expected: Open the student game session page. Submit a phonics answer. Open the browser Network tab. Confirm exactly ONE POST request to `/analyze` (or the backend's `/game/...` endpoint that wraps it) — NOT two separate calls to `/transcribe` and `/align`. Response arrives with phoneme feedback in that single round-trip.
result: [pending]

### 5. Word Phonemes Loaded From DB
expected: After running `npx prisma db push` and `npx prisma db seed` in the backend dir, submit a phonics answer for a seeded word (cat, dog, or ship). In the BFA response (visible via backend logs or devtools), `espeak_fallback` is `false` — meaning the stored phonemes from the DB were used, not runtime espeak computation.
result: [pending]

### 6. PhonemeChips Four-State Rendering
expected: Submit a phonics answer in a game session where the student gets a mix of results (some correct, maybe one similar, one wrong). On the result screen after submission, a row of phoneme chips appears. Chips are colored: green for correct, yellow/amber for similar, red for substituted or extra, gray with dashed border for missing phonemes. Each chip shows the phoneme symbol (IPA). No chips show for "error" status entries.
result: [pending]

### 7. pytest Unit Suite Passes (No Docker Required)
expected: From the repo root, run `cd bfa-service && python -m pytest test_bfa.py -v`. Result: 24 tests collected, 24 passed, 0 failed, 0 errors. Suite completes in under 1 second (no actual WhisperX or audio processing — all model calls are stubbed). No Docker or GPU required.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

[none yet]
