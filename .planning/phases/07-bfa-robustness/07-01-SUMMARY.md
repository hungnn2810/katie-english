---
phase: 07-bfa-robustness
plan: "01"
subsystem: bfa-service
tags: [bfa, audio-gates, python, fastapi, pytest, tdd]
dependency_graph:
  requires: []
  provides: [audio-quality-gates, pytest-suite]
  affects: [bfa-service/main.py, bfa-service/test_bfa.py]
tech_stack:
  added: [langdetect==1.0.9]
  patterns: [D-07-error-shape, JSONResponse-gates, wave-stdlib-helpers, ffmpeg-loudnorm]
key_files:
  created:
    - bfa-service/test_bfa.py
  modified:
    - bfa-service/main.py
    - bfa-service/requirements.txt
decisions:
  - "Monkeypatched _to_wav in integration tests with a no-op copy helper (_copy_to_wav) — ffmpeg not available on local dev machine; gates fire against the real WAV bytes without conversion"
  - "Same-file edge case in _copy_to_wav: when upload suffix is .wav, in_path == wav_path, so copy is skipped (no-op)"
  - "ENERGY_THRESHOLD_DB default -50.0 dBFS: catches all-zero silence reliably; make_wav(amplitude=0) tests below threshold"
metrics:
  duration: "364s"
  completed: "2026-05-23T14:06:24Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 7 Plan 01: BFA Audio Quality Gates Summary

Five audio-quality gates added to bfa-service plus a full pytest suite — structured error responses replace silent score-0 failures for bad audio inputs.

## What Was Built

### bfa-service/main.py
- Added stdlib imports: `math`, `struct`, `wave` (alphabetical in existing block)
- Added third-party import: `from langdetect import detect_langs`
- Added 3 env-var threshold constants after `MIN_WORD_SCORE`:
  - `AUDIO_MIN_DURATION_S` (default 0.5s, env `BFA_MIN_DURATION_S`)
  - `AUDIO_MAX_DURATION_S` (default 15.0s, env `BFA_MAX_DURATION_S`)
  - `ENERGY_THRESHOLD_DB` (default -50.0 dBFS, env `BFA_ENERGY_THRESHOLD_DB`)
- `_to_wav` modified: inserted `-af loudnorm=I=-16:LRA=11:TP=-1.5` between `-i` and `-ar 16000` (D-02)
- New helper `_wav_duration_s(wav_path)` at line 73: reads WAV frames/framerate
- New helper `_rms_dbfs(wav_path)` at line 78: struct-unpack RMS in dBFS, returns -100.0 for silence
- Gate insertion in `/analyze` handler:
  - D-01 length gate: lines ~214-230 (after `_to_wav`, before `_groq_transcribe`)
  - D-03 energy gate: lines ~232-237
  - D-04 ASR confidence gate: lines ~248-253 (after `transcript = ...`)
  - D-05 language detection gate: lines ~255-265
- Gate insertion in `/analyze-speaking` handler: identical blocks at same relative positions

### bfa-service/requirements.txt
- Appended `langdetect==1.0.9` (line 7)

### bfa-service/test_bfa.py (new file, 310 lines)
- 16 tests total, all passing:

| Test | Category | Status |
|------|----------|--------|
| test_wav_duration_helper | unit | PASS |
| test_rms_dbfs_silence | unit | PASS |
| test_rms_dbfs_loud | unit | PASS |
| test_loudnorm_flag_present | unit | PASS |
| test_audio_too_short_returns_400 | integration | PASS |
| test_audio_too_long_returns_400 | integration | PASS |
| test_recording_too_noisy_returns_200 | integration | PASS |
| test_speech_not_detected_empty | integration | PASS |
| test_speech_not_detected_no_alpha | integration | PASS |
| test_wrong_language_vietnamese | integration | PASS |
| test_language_gate_skipped_under_3_words | integration | PASS |
| test_happy_path_returns_success | integration | PASS |
| test_gate_order_length_before_groq | gate-order | PASS |
| test_analyze_speaking_length_gate | /analyze-speaking | PASS |
| test_analyze_speaking_noisy_gate | /analyze-speaking | PASS |
| test_analyze_speaking_wrong_language | /analyze-speaking | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ffmpeg not available on local machine — integration tests needed _to_wav bypass**
- **Found during:** Task 1 commit, first integration test run
- **Issue:** `_to_wav` calls `ffmpeg` subprocess which is not installed on the local dev machine. All integration tests that call `/analyze` or `/analyze-speaking` failed with `FileNotFoundError: ffmpeg`
- **Fix:** Added `_copy_to_wav` helper in `test_bfa.py` that copies input to output (or no-ops when src==dst for .wav uploads). All integration tests monkeypatch `main._to_wav` with this helper. Unit tests for `_to_wav` itself (test_loudnorm_flag_present) already monkeypatched subprocess.run so were unaffected.
- **Files modified:** `bfa-service/test_bfa.py`
- **Commit:** 41c25cf (included in Task 2 commit)

**2. [Rule 1 - Bug] Same-file error when upload extension is .wav**
- **Found during:** Task 2 first test run
- **Issue:** `_safe_suffix("fixture.wav")` returns `.wav`; handler builds `in_path = {uid}.wav` and `wav_path = {uid}.wav` — identical paths. `shutil.copy2(src, dst)` raises `SameFileError` when src == dst.
- **Fix:** `_copy_to_wav` now checks `input_path.resolve() != output_path.resolve()` before copying; same-path is a silent no-op (the bytes are already in place).
- **Files modified:** `bfa-service/test_bfa.py`
- **Commit:** 41c25cf

## Gate Behavior Summary

| Gate | Code | HTTP | Trigger |
|------|------|------|---------|
| D-01 length (short) | `audio_too_short` | 400 | duration < 0.5s |
| D-01 length (long) | `audio_too_long` | 400 | duration > 15.0s |
| D-03 energy | `recording_too_noisy` | 200 | RMS < -50.0 dBFS |
| D-04 ASR confidence | `speech_not_detected` | 200 | empty or no-alpha transcript |
| D-05 language | `wrong_language` | 200 | top lang != en with prob > 0.5 (>= 3 words) |

## TDD Gate Compliance

- RED commit (test(07-01)): `8a91a74` — 4 unit tests PASS, 3 integration stubs FAIL (expected: gates not yet wired)
- GREEN commit (feat(07-01)): `41c25cf` — all 16 tests PASS

## Known Stubs

None — all gate logic fully implemented and tested. Happy path preserved.

## Threat Flags

No new threat surface beyond what is documented in the plan's STRIDE register. All 6 threats (T-07-01 through T-07-SC) have been addressed:
- T-07-01: MAX_UPLOAD_BYTES gate preserved at line ~204
- T-07-02: temp dir paths confirmed — no user-supplied components in argv
- T-07-03: langdetect exception logs only the exception string, not GROQ_API_KEY
- T-07-04: length gate fires before _rms_dbfs (O(N) bounded to 240k samples)
- T-07-05: langdetect wrapped in try/except, 3-word minimum guard in place
- T-07-SC: langdetect==1.0.9 pinned in requirements.txt

## Self-Check: PASSED

- bfa-service/main.py: exists, syntax valid, imports ok
- bfa-service/requirements.txt: ends with langdetect==1.0.9
- bfa-service/test_bfa.py: exists, 310 lines, 16 tests all PASS
- Task 1 commit 8a91a74: present in git log
- Task 2 commit 41c25cf: present in git log
