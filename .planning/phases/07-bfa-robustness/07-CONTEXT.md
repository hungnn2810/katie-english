# Phase 7: BFA Robustness & Audio Quality Gates — Context

**Gathered:** 2026-05-23
**Status:** Ready for planning
**Source:** STATEGY.MD §2 "Missing Requirements", §9 "Cost Optimization", §12 "Risks & Limitations"

<domain>
## Phase Boundary

This phase targets the BFA service audio ingestion layer only — it does NOT change phoneme scoring logic, DTO shapes visible to the frontend, or any other homework type. Deliverables are entirely within `bfa-service/main.py` and the frontend error-display path for phonics submissions.

The goal is "zero silent failures": replace all code paths that return `score: 0` due to bad input with structured error responses that the frontend can display as actionable messages for students.

Depends on: Phase 5 plan 07 complete (Groq ASR + phonemizer service live).

</domain>

<decisions>
## Implementation Decisions

### D-01: Audio Length Gate (BFA-06)
Reject audio clips shorter than 0.5s or longer than 15s before any processing. Return HTTP 400 with structured error body:
```json
{"error": "audio_too_short", "message": "Recording too short — hold the button longer"}
{"error": "audio_too_long",  "message": "Recording too long — keep it under 15 seconds"}
```
Implementation: check WAV duration via `ffprobe` or compute from file size + sample rate after conversion. Gate applied in `_to_wav()` helper or immediately after WAV conversion — before any Groq API call.

### D-02: Audio Gain Normalization (BFA-07)
Normalize audio loudness using ffmpeg `loudnorm` filter (EBU R128) before sending to Groq. Single ffmpeg pass: convert to 16kHz mono WAV + loudnorm. Eliminates score variance between cheap tablets and good microphones.
```bash
ffmpeg -i input -af loudnorm=I=-16:LRA=11:TP=-1.5 -ar 16000 -ac 1 output.wav
```
No configurable threshold needed — standard broadcast loudness target.

### D-03: Energy / Noise Gate (BFA-08)
After WAV conversion, compute RMS energy using Python (read WAV samples via `wave` stdlib). If RMS below `ENERGY_THRESHOLD_DB` (default -50 dBFS, env configurable `BFA_ENERGY_THRESHOLD_DB`), return:
```json
{"error": "recording_too_noisy", "message": "Mic quá ồn — tìm chỗ yên tĩnh hơn nhé"}
```
Note: "too quiet" and "too noisy" are hard to distinguish via RMS alone. RMS gate catches silence / very low energy. SNR check is out of scope — full SNR requires a noise profile. Gate is best-effort: catches clear silence, does not catch all noisy environments.

### D-04: ASR Confidence Gate (BFA-09)
After Groq returns transcript, check if result is empty string or contains no alphabetic characters. If so, return:
```json
{"error": "speech_not_detected", "message": "Không nghe rõ — nói to hơn nhé"}
```
Implementation: `transcript.strip()` empty OR `re.search(r'[a-zA-Z]', transcript) is None`.

### D-05: Language Mixing Detection (BFA-10)
After Groq returns transcript, run `langdetect.detect_langs()` on the transcript text. If the top detected language is not `en` with probability > 0.5, return:
```json
{"error": "wrong_language", "message": "Please speak in English"}
```
Library: `langdetect==1.0.9` (pure Python, <1ms on short strings, no model download). Add to `requirements.txt`.
Skip language check if transcript has fewer than 3 words (too short to reliably detect).

### D-06: Frontend Error Display (BFA-06/08/09/10)
Frontend phonics game currently shows score 0 on any BFA error. After this phase:
- Detect `error` field in BFA response (non-2xx or `{"error": "..."}` body)
- Map error code → kid-friendly message (Vietnamese + English)
- Show inline amber error message — session advances normally (no retry button)
- PhonicsItemResult row still created with score=0 (session-completion accounting stays intact)

> **Decision update (2026-05-23):** Retry button and DB-skip deferred. Transaction restructure in `savePhonicsResult` is out of scope. The amber message replaces the silent score=0 — student sees actionable feedback without session flow changes.

### D-07: Error Response Shape
All error responses from bfa-service use consistent shape:
```json
{
  "success": false,
  "error": "<error_code>",
  "message": "<human_readable>"
}
```
HTTP status: 400 for input validation errors (length gate), 200 for processing errors (noise/speech/language — already decoded audio, Groq may have been called).

### D-08: Existing Tests Must Pass
All 24+ existing pytest tests must pass unmodified after phase 7. New tests added for each gate condition. Audio length gate and energy gate tested with synthetic WAV bytes; ASR confidence gate tested by mocking Groq to return empty string; language gate tested by mocking langdetect.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `bfa-service/main.py` — Full service (post plan 07). Entry points: `analyze()`, `analyze_speaking()`, `transcribe()`, `align()`
- `bfa-service/requirements.txt` — Add `langdetect==1.0.9`
- `bfa-service/test_bfa.py` — Existing pytest suite — must still pass
- `frontend/app/game/session/[id]/page.tsx` — Phonics submission handler — add error display branch
- `STATEGY.MD` §2, §9, §12 — Requirements source
- `.planning/phases/05-bfa-quality-performance/05-07-PLAN.md` — Current bfa-service architecture (Groq + phonemizer)

</canonical_refs>

<specifics>
## Audio Length Check (ffprobe approach)

```python
import subprocess, json

def _get_audio_duration_s(wav_path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_streams", str(wav_path)],
        capture_output=True, timeout=10,
    )
    info = json.loads(result.stdout)
    return float(info["streams"][0]["duration"])
```

Or simpler: after ffmpeg WAV conversion, read via `wave` stdlib:
```python
import wave
with wave.open(str(wav_path), 'rb') as wf:
    duration_s = wf.getnframes() / wf.getframerate()
```

## RMS Energy Check

```python
import wave, struct, math

def _rms_dbfs(wav_path: Path) -> float:
    with wave.open(str(wav_path), 'rb') as wf:
        raw = wf.readframes(wf.getnframes())
    samples = struct.unpack(f'{len(raw)//2}h', raw)
    rms = math.sqrt(sum(s*s for s in samples) / len(samples))
    if rms == 0:
        return -100.0
    return 20 * math.log10(rms / 32768)
```

## Frontend Error Branch

```typescript
// In phonics submission handler
if (!bfaResult.success && bfaResult.error) {
  const messages: Record<string, string> = {
    audio_too_short:    'Bấm lâu hơn nhé — ghi âm quá ngắn',
    audio_too_long:     'Ghi âm quá dài — nói dưới 15 giây',
    recording_too_noisy:'Mic quá ồn — tìm chỗ yên tĩnh hơn',
    speech_not_detected:'Không nghe rõ — nói to hơn nhé',
    wrong_language:     'Please speak in English',
  };
  setError(messages[bfaResult.error] ?? 'Có lỗi — thử lại nhé');
  return; // Do not advance item, do not store result
}
```

</specifics>

<deferred>
## Deferred Ideas

- Full SNR measurement (requires noise profile estimation) — complex, out of scope
- Per-grade noise tolerance thresholds — deferred to post-v2
- Automatic noise suppression via DeepFilterNet3 (STATEGY.MD §4) — future improvement
- Grade-level score normalization (STATEGY.MD §2.1) — deferred, needs labeled data
- Whisper fine-tuning (STATEGY.MD §7 Priority 1) — separate post-v2 initiative

</deferred>

---

*Phase: 07-bfa-robustness*
*Context gathered: 2026-05-23 from STATEGY.MD + Phase 5 context*
