# Phase 7: BFA Robustness & Audio Quality Gates - Pattern Map

**Mapped:** 2026-05-23
**Files analyzed:** 3
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `bfa-service/main.py` | service | request-response | `bfa-service/main.py` (existing) | exact — additions to existing file |
| `bfa-service/requirements.txt` | config | — | `bfa-service/requirements.txt` (existing) | exact — append one line |
| `frontend/app/game/session/[id]/page.tsx` | component | request-response | same file `finishSession()` block | exact — additions to existing file |

---

## Pattern Assignments

### `bfa-service/main.py` (service, request-response)

**Analog:** `bfa-service/main.py` — this is the file being modified. All new helpers are pure Python
stdlib additions that slot into the same module alongside `_to_wav`, `_groq_transcribe`, etc.

**Imports pattern** (lines 1-13 — current state to preserve):
```python
import difflib
import json
import logging
import os
import re
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import List, Optional

import requests
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
```

New imports to ADD (insert after existing stdlib block, before `import requests`):
```python
import math
import struct
import wave
```

New third-party import to ADD (after `import requests`):
```python
from langdetect import detect_langs
```

**Existing env-var config pattern** (lines 21-26 — copy this shape for new thresholds):
```python
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "whisper-large-v3-turbo")
MAX_UPLOAD_BYTES = int(os.getenv("BFA_MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
MIN_WORD_SCORE = int(os.getenv("BFA_MIN_WORD_SCORE", "70"))
```

New constants to ADD (same style, after existing env block):
```python
AUDIO_MIN_DURATION_S = float(os.getenv("BFA_MIN_DURATION_S", "0.5"))
AUDIO_MAX_DURATION_S = float(os.getenv("BFA_MAX_DURATION_S", "15.0"))
ENERGY_THRESHOLD_DB  = float(os.getenv("BFA_ENERGY_THRESHOLD_DB", "-50.0"))
```

**Existing helper pattern** (`_to_wav`, lines 54-62 — new helpers copy this exact shape):
```python
def _to_wav(input_path: Path, output_path: Path) -> None:
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", str(input_path),
         "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
         "-f", "wav", str(output_path)],
        capture_output=True, timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.decode()}")
```

**D-02 loudnorm — replace `_to_wav` body** (same signature, modified ffmpeg flags):
```python
def _to_wav(input_path: Path, output_path: Path) -> None:
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", str(input_path),
         "-af", "loudnorm=I=-16:LRA=11:TP=-1.5",
         "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
         "-f", "wav", str(output_path)],
        capture_output=True, timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.decode()}")
```

**D-01 duration gate helper** (insert after `_to_wav`, before `_groq_transcribe`):
```python
def _wav_duration_s(wav_path: Path) -> float:
    with wave.open(str(wav_path), 'rb') as wf:
        return wf.getnframes() / wf.getframerate()
```

**D-03 RMS energy helper** (insert after `_wav_duration_s`):
```python
def _rms_dbfs(wav_path: Path) -> float:
    with wave.open(str(wav_path), 'rb') as wf:
        raw = wf.readframes(wf.getnframes())
    samples = struct.unpack(f'{len(raw) // 2}h', raw)
    rms = math.sqrt(sum(s * s for s in samples) / len(samples)) if samples else 0
    if rms == 0:
        return -100.0
    return 20 * math.log10(rms / 32768)
```

**Existing error response pattern** (lines 183 — how HTTPException is used today):
```python
if len(raw) > MAX_UPLOAD_BYTES:
    raise HTTPException(400, "audio too large")
```

**D-01/D-03 gate calls — insertion point in `/analyze`** (after `_to_wav(in_path, wav_path)`, before `_groq_transcribe`):
```python
# D-01: length gate
dur = _wav_duration_s(wav_path)
if dur < AUDIO_MIN_DURATION_S:
    return JSONResponse(status_code=400, content={
        "success": False,
        "error": "audio_too_short",
        "message": "Recording too short — hold the button longer",
    })
if dur > AUDIO_MAX_DURATION_S:
    return JSONResponse(status_code=400, content={
        "success": False,
        "error": "audio_too_long",
        "message": "Recording too long — keep it under 15 seconds",
    })

# D-03: energy/noise gate
if _rms_dbfs(wav_path) < ENERGY_THRESHOLD_DB:
    return JSONResponse(status_code=200, content={
        "success": False,
        "error": "recording_too_noisy",
        "message": "Mic quá ồn — tìm chỗ yên tĩnh hơn nhé",
    })
```

**D-04 ASR confidence gate — insertion point** (after `transcript = groq_result.get("text", "").strip()`, before `_g2p`):
```python
# D-04: ASR confidence gate
if not transcript or re.search(r'[a-zA-Z]', transcript) is None:
    return JSONResponse(status_code=200, content={
        "success": False,
        "error": "speech_not_detected",
        "message": "Không nghe rõ — nói to hơn nhé",
    })
```

**D-05 language detection gate — insertion point** (after D-04 gate, before `_g2p`):
```python
# D-05: language mixing detection (skip if < 3 words)
if len(transcript.split()) >= 3:
    try:
        langs = detect_langs(transcript)
        top = langs[0] if langs else None
        if top is None or top.lang != 'en' or top.prob <= 0.5:
            return JSONResponse(status_code=200, content={
                "success": False,
                "error": "wrong_language",
                "message": "Please speak in English",
            })
    except Exception as e:
        logger.warning(f"langdetect failed: {e}")
```

**Apply same gates to `/analyze-speaking`:** The identical gate block (D-01, D-03, D-04, D-05) is
inserted at the same relative position inside `analyze_speaking` — after `_to_wav(in_path, wav_path)`
and after `transcript = groq_result.get("text", "").strip()` respectively. Copy verbatim.

**Existing success response shape** (lines 222-230 — D-07 error shape must mirror this):
```python
return {
    "success": True,
    "transcription": {"text": transcript},
    "phonemes": phonemes,
    "score": score,
    "feedback": ops,
    "word": word,
    "espeak_fallback": False,
}
```

Error shape (D-07 — all gates use this):
```python
{"success": False, "error": "<error_code>", "message": "<human_readable>"}
```

---

### `bfa-service/requirements.txt` (config)

**Analog:** `bfa-service/requirements.txt` (existing)

**Current content** (lines 1-6):
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
python-multipart==0.0.12
requests==2.32.3
phonemizer==3.3.0
espeak-ng==1.51.1
```

**Addition — append one line:**
```
langdetect==1.0.9
```

No other changes. Line 7 is the insertion point.

---

### `frontend/app/game/session/[id]/page.tsx` (component, request-response)

**Analog:** Same file — `finishSession()` function (lines 325-365) and `SessionItem` interface
(lines 15-28) are the direct context. Additions slot into both locations.

**Existing `SessionItem` interface** (lines 15-28 — add `bfaError` field):
```typescript
interface SessionItem {
  kind: ItemKind;
  text: string;
  wordId?: number;
  highlight?: string;
  imageUrl?: string;
  pictureUrl?: string;
  transcribed: string;
  matchedWords?: number;
  totalWords?: number;
  score: number;
  state: ItemState;
  bfa?: BfaResult | null;
}
```

Add field (after `bfa?: BfaResult | null;`):
```typescript
  bfaError?: string | null;   // error code from BFA gate response
```

**Existing phonics branch in `finishSession`** (lines 346-349 — insertion point for error check):
```typescript
} else if (item.kind === 'phonics') {
  const r = await savePhonicsResult(sessionId, item.wordId!, audioBlob);
  scored[i] = { ...scored[i], score: r.score, bfa: r.bfa ?? null };
}
```

**D-06 replacement — detect error field, skip storing score:**
```typescript
} else if (item.kind === 'phonics') {
  const r = await savePhonicsResult(sessionId, item.wordId!, audioBlob);
  // BFA gate error: r may contain {success:false, error, message} forwarded from bfa-service
  if ('error' in r && (r as unknown as { error: string }).error) {
    const bfaError = (r as unknown as { error: string }).error;
    scored[i] = { ...scored[i], bfaError, score: 0, bfa: null };
  } else {
    scored[i] = { ...scored[i], score: r.score, bfa: r.bfa ?? null };
  }
}
```

**Error message map — declare as module-level constant** (insert before `export default function SessionPage()`):
```typescript
const BFA_ERROR_MESSAGES: Record<string, string> = {
  audio_too_short:     'Bấm lâu hơn nhé — ghi âm quá ngắn',
  audio_too_long:      'Ghi âm quá dài — nói dưới 15 giây',
  recording_too_noisy: 'Mic quá ồn — tìm chỗ yên tĩnh hơn',
  speech_not_detected: 'Không nghe rõ — nói to hơn nhé',
  wrong_language:      'Please speak in English',
};
```

**Existing results render — phonics card** (lines 550-567 — add bfaError display branch):

Current pattern:
```typescript
{item.bfa?.success && item.bfa.feedback.length > 0 && (
  <PhonemeChips feedback={item.bfa.feedback} />
)}
```

Add above `PhonemeChips`:
```typescript
{item.bfaError && (
  <div className="mt-2 text-sm font-semibold text-amber-400">
    {BFA_ERROR_MESSAGES[item.bfaError] ?? 'Có lỗi — thử lại nhé'}
  </div>
)}
{!item.bfaError && item.bfa?.success && item.bfa.feedback.length > 0 && (
  <PhonemeChips feedback={item.bfa.feedback} />
)}
```

**Existing error state style used for page-level errors** (lines 500-511 — reference for inline error styling):
```typescript
if (pageState === 'error') {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
      <p className="text-highlight text-lg font-bold">Session not found.</p>
      <button onClick={() => router.push('/game/homework')} className="text-white/60 text-sm hover:text-white">← Back</button>
    </div>
  );
}
```

Use `text-amber-400` (warning, not fatal) for item-level BFA errors — distinct from `text-highlight`
(red, page-level fatal error).

---

## Shared Patterns

### Error Response Shape (D-07)
**Source:** `bfa-service/main.py` (new pattern — `JSONResponse` with explicit content dict)
**Apply to:** All five gate conditions in both `/analyze` and `/analyze-speaking`

Use `JSONResponse` (already imported from fastapi.responses) instead of `raise HTTPException`
for gates that return after partial processing (D-03, D-04, D-05) because `JSONResponse` allows
returning a custom body with `success: false` at HTTP 200. For input rejection before any
processing (D-01 length), HTTP 400 is correct per D-07.

Pattern:
```python
# 400 for input rejection (D-01):
return JSONResponse(status_code=400, content={"success": False, "error": "...", "message": "..."})

# 200 for processing gates (D-03, D-04, D-05):
return JSONResponse(status_code=200, content={"success": False, "error": "...", "message": "..."})
```

### Subprocess / ffmpeg Pattern
**Source:** `bfa-service/main.py` lines 54-62 (`_to_wav`)
**Apply to:** `_to_wav` modification (D-02 loudnorm flag addition)

Always use `capture_output=True, timeout=30` and check `returncode`. Raise `RuntimeError` on failure.

### WAV Stdlib Pattern (D-01, D-03)
**Source:** CONTEXT.md `<specifics>` section (no existing analog — first use of `wave` stdlib)
**Apply to:** `_wav_duration_s` and `_rms_dbfs` helpers

Use `wave.open(str(path), 'rb')` as context manager. Read all frames in one pass for RMS — do not
re-open the file.

### Env Config Pattern
**Source:** `bfa-service/main.py` lines 21-26
**Apply to:** Three new threshold constants (`BFA_MIN_DURATION_S`, `BFA_MAX_DURATION_S`, `BFA_ENERGY_THRESHOLD_DB`)

Always `os.getenv("KEY", "default_string")` with explicit cast (int/float) wrapping the call.

### Frontend State Extension Pattern
**Source:** `frontend/app/game/session/[id]/page.tsx` `SessionItem` interface (lines 15-28)
**Apply to:** Adding `bfaError` field

Add optional field with `?` to avoid breaking existing spread operations (`{ ...scored[i], ... }`).

---

## No Analog Found

None — all three target files are existing files with clear patterns to extend. The `langdetect`
library usage has no prior codebase analog but is a simple one-liner (`detect_langs(text)`) with
pattern provided in CONTEXT.md.

---

## Metadata

**Analog search scope:** `bfa-service/`, `frontend/app/game/session/[id]/`, `frontend/lib/`
**Files scanned:** 6 (`main.py`, `requirements.txt`, `page.tsx`, `admin-api.ts`, `auth.ts`, `05-07-PLAN.md`)
**Pattern extraction date:** 2026-05-23
