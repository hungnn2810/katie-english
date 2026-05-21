# BFA Service Architecture

## Endpoints

| Endpoint | Input | Use case |
|----------|-------|----------|
| `POST /align` | audio + word + expected_phonemes[] | Single word forced alignment |
| `POST /transcribe` | audio | Free-form speech → text |
| `POST /analyze` | audio + word + expected_phonemes[] | Single word + transcription re-score |
| `POST /analyze-speaking` | audio + target_text + mode | Multi-word speaking assessment |
| `GET /health` | — | Model/dependency status |
| `GET /metrics` | — | Prometheus counters + latency |

## Request Flow

```
Client
  │
  ▼
HTTP Middleware (request_id, latency, Prometheus metrics)
  │
  ▼
Semaphore (BFA_CONCURRENCY=1 — serialize GPU/CPU work)
  │
  ▼
ffmpeg convert → 16kHz mono WAV
  │
  ▼
Energy check (ffmpeg volumedetect, threshold -50dB)
  ├── silent → error_payload (score=0)
  └── has speech ──────────────────────────────────────────┐
                                                            │
              ┌─────────────────────────────────────────────┤
              │                                             │
    ┌─────────▼──────────┐                    ┌────────────▼────────────┐
    │  WhisperX (tiny)   │                    │  PhonemeTimestampAligner │
    │  CPU / int8        │                    │  (bournemouth-aligner)   │
    │  speech → text     │                    │  forced alignment        │
    │  batch_size=1/16   │                    │  → phoneme timestamps    │
    └─────────┬──────────┘                    └────────────┬────────────┘
              │                                            │
              │                               ┌────────────▼────────────┐
              │                               │  normalize_ipa()         │
              │                               │  IPA → simplified map    │
              │                               │  (IPA_TO_SIMPLIFIED)     │
              │                               └────────────┬────────────┘
              │                                            │
              │                               ┌────────────▼────────────┐
              │                               │  espeak-ng fallback      │
              │                               │  (when expected_phonemes │
              │                               │   is empty)              │
              │                               │  lru_cache(512)          │
              │                               └────────────┬────────────┘
              │                                            │
              └──────────────────┬─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   score_alignment()      │
                    │   DP edit distance       │
                    │   exact=0  similar=0.5   │
                    │   subst/miss/extra=1     │
                    │   score=(1-dist/max)×100 │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Transcription re-score  │
                    │  gate: whisperx output   │
                    │  must match target word  │
                    │  (SequenceMatcher ≥0.5)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │        Response          │
                    │  success, phonemes[],    │
                    │  score, feedback[],      │
                    │  transcription           │
                    └─────────────────────────┘
```

## /analyze-speaking — Multi-word Strategy

Aligner trả về segments → 3 strategy theo số segment:

```
segments == len(target_words)  →  _extract_per_word_results()   (exact match)
segments == 1                  →  _partition_flat_alignment()    (proportional split)
otherwise                      →  partial map + error entries    (best effort)
```

## Score Algorithm

```
score_alignment(expected[], aligned[]) → (score, ops[])

  DP edit distance với weighted cost:
    exact      → 0.0
    similar    → 0.5   (acoustically close pairs)
    substitute → 1.0
    missing    → 1.0
    extra      → 1.0

  score = max(0, round((1 - distance / max(len_expected, len_aligned)) × 100))
```

## Similar Phoneme Pairs (cost 0.5)

Tuned cho Vietnamese learners:

| Group | Pairs |
|-------|-------|
| Voiced/unvoiced stops | p↔b, t↔d, k↔g |
| Fricatives | f↔v, s↔z, sh↔zh, ch↔j |
| Nasals | m↔n, n↔ng |
| Liquids | l↔r |
| TH confusions | th↔d, th↔t |
| Vietnamese b/v | v↔b |
| Vowels | i↔e, a↔e, oo↔o, er↔a, ar↔a, or↔o |

## Models

| Model | Init | Cache |
|-------|------|-------|
| WhisperX `tiny` | Startup warmup | `threading.Lock` singleton |
| PhonemeTimestampAligner | Startup warmup | `lru_cache` |
| espeak-ng phonemes | On demand | `lru_cache(512)` per word |

## Limits & Timeouts

| Config | Default | Env var |
|--------|---------|---------|
| Max upload | 20 MB | `BFA_MAX_UPLOAD_BYTES` |
| Max phonemes | 200 | `BFA_MAX_EXPECTED_PHONEMES` |
| Concurrency | 1 | `BFA_CONCURRENCY` |
| ffmpeg timeout | 30s | `BFA_FFMPEG_TIMEOUT` |
| volumedetect timeout | 10s | `BFA_VOLUME_TIMEOUT` |
| espeak timeout | 5s | `BFA_ESPEAK_TIMEOUT` |
| Energy threshold | -50 dB | hardcoded |
| Transcription re-score threshold | 0.5 ratio | hardcoded |
