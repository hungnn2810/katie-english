---
phase: 10-azure-pa
type: context
status: active
created: 2026-05-31
---

# Phase 10 Context: Azure Pronunciation Assessment Engine

**Goal:** Replace Groq ASR + espeak G2P scoring in bfa-service with Azure Pronunciation Assessment REST API.
All audio gates (Phase 7), NestJS BfaService, and frontend remain unchanged.

---

## Architecture

```
BEFORE:
  Audio → ffmpeg → [length/energy gates] → Groq Whisper API (ASR) → espeak G2P → edit-distance → score

AFTER:
  Audio → ffmpeg → [length/energy gates] → Azure PA REST API → phoneme scores → map to ops → score
```

Azure PA does ASR + forced phoneme alignment + acoustic scoring in one call. No separate ASR step.

---

## Key Decisions

### D-01: REST API, not Python SDK
Azure has a Python SDK (`azure-cognitiveservices-speech`) but it ships native binary blobs (~100MB).
Use the REST API via `requests` instead — no new deps, lighter Docker image, already in requirements.txt.

**API endpoint:**
```
POST https://{AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1
  ?language=en-US
  &format=detailed
  &pronunciation.referenceText={url_encoded_text}
  &pronunciation.granularity=Phoneme
  &pronunciation.gradingSystem=HundredMark
  &pronunciation.enableMiscue=True

Headers:
  Ocp-Apim-Subscription-Key: {AZURE_SPEECH_KEY}
  Content-Type: audio/wav; codecs=audio/pcm; samplerate=16000
  Accept: application/json

Body: raw WAV PCM bytes (16kHz, 16-bit, mono — already produced by ffmpeg step)
```

For STT-only (FREE_SPEAK mode / /transcribe endpoint) — same endpoint without pronunciation params.

### D-02: Keep all 5 audio gates unchanged
Phase 7 gates (BFA-06 through BFA-10) stay in Python bfa-service:
- D-01: length gate (0.5s–15s)
- D-03: energy/RMS gate
- D-04: ASR confidence — adapt: check Azure `RecognitionStatus != "Success"` instead of empty Groq text
- D-05: language gate — keep langdetect on Azure transcript (Azure outputs English transcription even for non-English)

### D-03: Azure phoneme format is CMU ARPABET-derived
Azure returns lowercase ARPABET-style symbols for en-US: `k`, `ae`, `t`, `sh`, `ow`, etc.
Display as-is in PhonemeChips — no IPA mapping required (kids don't read notation).

### D-04: Score threshold mapping
Map Azure per-phoneme `AccuracyScore` (0–100) to our `status` field:

| AccuracyScore | status      | UI color |
|---------------|-------------|----------|
| >= 80         | correct     | green    |
| >= 50         | similar     | yellow   |
| < 50          | substituted | red      |
| word Omission | missing     | gray     |

Thresholds configurable via env vars:
- `AZURE_PHONEME_CORRECT_THRESHOLD` (default: 80)
- `AZURE_PHONEME_SIMILAR_THRESHOLD` (default: 50)

### D-05: Word-level score uses Azure AccuracyScore directly
`PronunciationAssessment.AccuracyScore` at word level is from Azure's acoustic model.
Use this directly as the word score (0–100 int). Replaces our `_calc_score()` text-heuristic.

For `/analyze-speaking` overall_score: use `PronunciationAssessment.AccuracyScore` from top-level
NBest[0], which scores the whole utterance.

### D-06: FREE_SPEAK mode uses STT-only (no PA referenceText)
`/analyze-speaking` with `mode=FREE_SPEAK` has no fixed expected text.
Call Azure STT without `pronunciation.*` params. Return transcript only (no per-phoneme feedback).
This matches current behavior — FREE_SPEAK speaking homework never showed phoneme chips.

### D-07: /transcribe endpoint unchanged semantically
Calls Azure STT, maps `Words` array to `{word, start, end, score: 1.0}`. Same shape as before.

### D-08: Environment variables
Remove: `GROQ_API_KEY`, `GROQ_MODEL`
Add: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (e.g. `eastus`, `southeastasia`)

### D-09: Timestamp format
Azure Offset and Duration are in 100-nanosecond ticks. Convert: `seconds = ticks / 10_000_000`.

### D-10: NestJS BfaService zero changes
bfa.service.ts, bfa.dto.ts, game.service.ts — no modifications. DTO shape is preserved exactly.

---

## Response mapping reference

**Azure PA response (NBest[0]):**
```json
{
  "Lexical": "cat",
  "PronunciationAssessment": { "AccuracyScore": 85, "FluencyScore": 90, "PronScore": 87 },
  "Words": [{
    "Word": "cat",
    "Offset": 1000000,
    "Duration": 4000000,
    "PronunciationAssessment": { "AccuracyScore": 85, "ErrorType": "None" },
    "Phonemes": [
      { "Phoneme": "k", "PronunciationAssessment": { "AccuracyScore": 92 }, "Offset": 1000000, "Duration": 800000 },
      { "Phoneme": "ae", "PronunciationAssessment": { "AccuracyScore": 70 }, "Offset": 1800000, "Duration": 1200000 },
      { "Phoneme": "t", "PronunciationAssessment": { "AccuracyScore": 90 }, "Offset": 3000000, "Duration": 800000 }
    ]
  }]
}
```

**Our PhonemeOp output:**
```json
[
  { "status": "correct",     "expected": "k",  "aligned": "k",  "start": 0.1, "end": 0.18, "duration": 0.08 },
  { "status": "similar",     "expected": "ae", "aligned": "ae", "start": 0.18, "end": 0.30, "duration": 0.12 },
  { "status": "correct",     "expected": "t",  "aligned": "t",  "start": 0.30, "end": 0.38, "duration": 0.08 }
]
```

---

## What is removed

| Old component | Reason |
|---------------|--------|
| `_groq_transcribe()` | Azure PA handles ASR internally |
| `_g2p()` / phonemizer + espeak | Azure PA returns actual phoneme scores from audio |
| `_score_phonemes()` | Edit-distance text comparison replaced by acoustic scores |
| `_distribute_timestamps()` | Azure returns real per-phoneme timestamps |
| `_SIMILAR_PAIRS` | Azure AccuracyScore captures phonetic proximity acoustically |
| `_calc_score()` | Azure AccuracyScore used directly |
| `GROQ_API_KEY` / `GROQ_MODEL` | Not needed |

---

## What stays

- All 5 audio gates (Phase 7 work)
- ffmpeg loudnorm pipeline
- FastAPI structure (/analyze, /analyze-speaking, /transcribe, /health)
- DTO response shapes
- Error gate messages (Vietnamese/English strings)
- langdetect for language gate
- Docker + docker-compose structure
