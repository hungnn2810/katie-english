Technical Report: Open-Source Speech Assessment Stack for Vietnamese Elementary English
  
  Target: Grade 1-5 (age 6-11), Vietnamese-accented English, noisy mic
  Date: May 2026

  ---
  1. Functional Analysis

  Exercise 1: Phonics

  Pipeline: VAD → noise reduction → ASR (constrained vocab) → forced alignment → GOP scoring → per-phoneme feedback

  Key challenge: Must use pronunciation dictionary (CMU Dict), not raw G2P. Single-word forced alignment is tractable near-realtime. ASR hallucination corrupts scoring entirely.

  Exercise 2: Listen and Answer

  Pipeline: VAD → ASR → semantic similarity → keyword detection → pronunciation scoring → composite score

  Key challenge: Children give truncated answers ("Red." instead of "The cat is red."). Semantic matching more important than exact string comparison.

  Exercise 3: Free Speaking

  Pipeline: VAD → ASR with timestamps → fluency metrics (from timestamps) → grammar scoring → vocabulary scoring → pronunciation scoring → holistic score

  Key challenge: ASR errors cascade into false grammar/vocab errors. Grammar scorers trained on adults over-penalize child speech.

  Exercise 4: Vocabulary by Image

  Pipeline: VAD → ASR (constrained to accepted word list) → word match → forced alignment → GOP → phoneme feedback

  Key challenge: Distinguish phonetically close confusions ("cat"/"cap") from semantically wrong answers.

  ---
  2. Missing Requirements / Suggested UX Improvements
  
  1. Per-grade score normalization — raw model scores will be systematically lower for Grade 1 vs Grade 5. Must normalize from day one.
  2. Longer VAD silence threshold — children restart words ("c-c-cat"), pause mid-word. Use 400-800ms vs adult default 200-300ms.
  3. Noise gate before scoring — if SNR < 10dB, prompt "too noisy" instead of scoring zero.
  4. Visual phoneme feedback — abstract scores (82/100) meaningless for age 6-8. Colored letters, mouth diagrams.
  5. Partial credit for phonics — binary pass/fail is discouraging. 4/5 correct phonemes should score meaningfully.
  6. Language mixing detection — if >50% Vietnamese detected, return "Please speak in English" rather than scoring garbage.
  7. Audio normalization — cheap school tablets vs. good devices vary wildly. Gain-normalize all incoming audio.
  8. Confidence gate — if ASR returns garbage, say "I couldn't hear you, try again" rather than score 0.

  ---
  3. Recommended Architecture

  Browser (MediaRecorder → webm/opus)
      ↓
  API Gateway (nginx)
      ↓
  FastAPI Backend (REST + WebSocket)
      ↓
  Redis (Celery task queue)
      ↓
  MinIO (object storage for audio files)
      ↓
  ┌─────────────────────────────────────┐
  │  Processing Workers (Docker)        │
  │                                     │
  │  Audio Worker    (VAD + denoise)    │
  │  ASR Worker      (faster-whisper)   │  ← GPU
  │  Align Worker    (WhisperX/wav2vec2)│  ← GPU optional
  │  Scoring Worker  (CTC-GOP)          │  ← GPU optional
  │  NLP Worker      (semantic+grammar) │  ← CPU
  │  Score Aggregator                   │  ← CPU
  └─────────────────────────────────────┘
      ↓
  PostgreSQL + Redis (results)
      ↓
  WebSocket → Client score display

  ---
  4. Recommended Open-Source Stack Per Stage

  ┌──────────────────────────────────┬─────────────────────────────────────────────┬────────────────────────────────────────────────────┐
  │              Stage               │                    Tool                     │                       Notes                        │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Audio capture                    │ Browser MediaRecorder + RecordRTC           │ webm/opus, re-encode server-side to 16kHz mono WAV │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ VAD                              │ Silero VAD v4                               │ MIT, 1MB, CPU-only, <5ms, outperforms WebRTC VAD   │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Noise reduction                  │ DeepFilterNet3                              │ Apache-2.0, CPU <20ms, PESQ 3.5-4.0                │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ ASR                              │ faster-whisper + whisper-large-v3-turbo     │ MIT, int8 CPU viable, word-level timestamps        │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ ASR (phonics/vocab, constrained) │ faster-whisper + constrained vocab decoding │ Dramatically reduces hallucination for single-word │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Forced alignment                 │ WhisperX + wav2vec2-base                    │ ±50ms phoneme boundary accuracy                    │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Phoneme scoring                  │ CTC-GOP on wav2vec2-large-xlsr-53           │ NOCASA 2025 winner approach                        │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ G2P                              │ phonemizer + CMU Dict                       │ Pre-compute for known word lists offline           │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Semantic similarity              │ sentence-transformers all-MiniLM-L6-v2      │ Apache-2.0, CPU <50ms, 80MB                        │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Grammar                          │ LanguageTool v6.6 (Docker)                  │ LGPL, self-hosted REST API, 4GB RAM                │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ NLP/vocab                        │ spaCy en_core_web_sm + CEFR word lists      │ Lemmatize → CEFR classification                    │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Fluency                          │ Computed from WhisperX timestamps           │ Speaking rate, pause duration, disfluency count    │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Task queue                       │ Celery + Redis                              │                                                    │
  ├──────────────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Object storage                   │ MinIO                                       │ S3-compatible, self-hosted                         │
  └──────────────────────────────────┴─────────────────────────────────────────────┴────────────────────────────────────────────────────┘

  ---
  5. Comparison Table

  ┌──────────────────────────────┬─────────────────────┬─────────────────────┬────────────────────────┬─────────────────┬─────────────────────────┬───────────────────────┬────────────┬─────────────────────────┐
  │             Tool             │        Task         │  Production-Ready   │    Children-Speech     │  Phoneme-Level  │       Self-Hosted       │      GPU-Needed       │  License   │         Status          │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ faster-whisper               │ ASR                 │         ✅          │   ⚠️  needs fine-tune   │       ❌        │           ✅            │ Optional (CPU viable) │ MIT        │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ whisper-large-v3             │ ASR                 │         ✅          │     ⚠️  WER ~30-40%     │       ❌        │           ✅            │      Recommended      │ MIT        │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ distil-whisper large-v3.5    │ ASR                 │         ✅          │   ⚠️  same as Whisper   │       ❌        │           ✅            │       Optional        │ Apache-2.0 │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ wav2vec2-large-xlsr-53       │ ASR + Phoneme       │  ⚠️  research-grade  │  ⚠️  fine-tune needed   │   ✅ via CTC    │           ✅            │  Optional inference   │ Apache-2.0 │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ wav2vec2-base                │ Forced alignment    │   ✅ via WhisperX   │       ⚠️  partial       │       ✅        │           ✅            │       No (CPU)        │ Apache-2.0 │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ Vosk (small EN)              │ ASR                 │         ✅          │   ⚠️  lower accuracy    │       ❌        │           ✅            │          No           │ Apache-2.0 │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ DeepSpeech                   │ ASR                 │    ❌ ABANDONED     │           ❌           │       ❌        │           N/A           │          N/A          │ MPL-2.0    │ Discontinued June 2025  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ CMU Sphinx                   │ ASR                 │ ⚠️  maintenance-only │       ⚠️  partial       │   ⚠️  partial    │           ✅            │          No           │ BSD        │ Low activity            │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ SpeechBrain                  │ ASR + Pronunciation │ ⚠️  research toolkit │    ⚠️  recipe-based     │ ✅ with recipes │           ✅            │      Recommended      │ Apache-2.0 │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ NeMo (NVIDIA)                │ ASR                 │    ✅ enterprise    │  ⚠️  fine-tune needed   │  ✅ CTC models  │        ✅ Docker        │       Required        │ Apache-2.0 │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ Kaldi + GOP                  │ Align + GOP         │  ⚠️  research-grade  │       ⚠️  partial       │       ✅        │ ⚠️  hard to containerize │          No           │ Apache-2.0 │ Legacy                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ MFA                          │ Forced alignment    │    ✅ batch only    │       ⚠️  partial       │       ✅        │           ✅            │          No           │ MIT        │ Active v3.x             │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ WhisperX                     │ Alignment           │         ✅          │       ⚠️  partial       │ ✅ via wav2vec2 │           ✅            │       Optional        │ BSD        │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ Charsiu                      │ Forced alignment    │  ⚠️  research-grade  │       ⚠️  partial       │       ✅        │           ✅            │          No           │ Apache-2.0 │ Low activity (2023)     │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ Allosaurus                   │ Phoneme recognition │  ⚠️  research-grade  │       ⚠️  partial       │       ✅        │           ✅            │          No           │ Apache-2.0 │ Active (minimal)        │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ OpenPronounce                │ Pronunciation       │   ❌ experimental   │           ❌           │   ⚠️  partial    │           ✅            │          No           │ MIT        │ Experimental (12 stars) │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ Silero VAD                   │ VAD                 │         ✅          │           ✅           │       N/A       │           ✅            │          No           │ MIT        │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ DeepFilterNet3               │ Noise reduction     │         ✅          │           ✅           │       N/A       │           ✅            │          No           │ Apache-2.0 │ Active 2025             │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ sentence-transformers MiniLM │ Semantic similarity │         ✅          │          N/A           │       N/A       │           ✅            │          No           │ Apache-2.0 │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ LanguageTool v6.6            │ Grammar             │         ✅          │ ⚠️  spoken lang. issues │       N/A       │        ✅ Docker        │          No           │ LGPL-2.1   │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ spaCy                        │ NLP                 │         ✅          │       ⚠️  partial       │       N/A       │           ✅            │          No           │ MIT        │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ phonemizer + CMU Dict        │ G2P                 │         ✅          │           ✅           │    ✅ output    │           ✅            │          No           │ GPL-3.0    │ Active                  │
  ├──────────────────────────────┼─────────────────────┼─────────────────────┼────────────────────────┼─────────────────┼─────────────────────────┼───────────────────────┼────────────┼─────────────────────────┤
  │ MFA (not for realtime)       │ G2P                 │      ✅ batch       │           ✅           │    ✅ output    │           ✅            │          No           │ MIT        │ Active                  │
  └──────────────────────────────┴─────────────────────┴─────────────────────┴────────────────────────┴─────────────────┴─────────────────────────┴───────────────────────┴────────────┴─────────────────────────┘

  ---
  6. Production-Readiness Analysis

  Ship with minimal wrapping

  - faster-whisper, Silero VAD, DeepFilterNet3, sentence-transformers, LanguageTool Docker, spaCy

  Requires 2-6 weeks engineering

  - WhisperX + wav2vec2 alignment: Works but needs careful error handling for alignment failures when ASR transcript is wrong, memory management, concurrency. Estimate 2-3 weeks.
  - CTC-GOP scoring: No clean PyPI package exists. Must implement from research repos (NOCASA baseline). Estimate 3-4 weeks.

  Requires fine-tuning before useful

  - Whisper (all sizes) — baseline WER ~25-40% on target population
  - wav2vec2 for phoneme scoring — adult-trained posteriors systematically too low for children

  Research-only / NOT recommended for production

  - Kaldi + GOP (traditional): Legacy C++, no Python-native API, difficult to containerize
  - DeepSpeech: ABANDONED June 2025
  - CMU Sphinx/Sphinx4: Abandoned for new development
  - Allosaurus: Below wav2vec2 accuracy on English children
  - OpenPronounce: 12 stars, experimental
  - Charsiu: Last major update 2023

  ---
  7. What Needs Fine-tuning

  Priority 1 — REQUIRED (system unusable without)

  1. Whisper fine-tuning for Vietnamese-accented children's English
  - Baseline WER estimate: 30-45% on target population (Vietnamese accent + child speech + noisy mic = worst-case for Whisper)
  - Dataset: 
    - MyST (My Science Tutor): 393 hours child speech, English, free research
    - CMU Kids: ~9 hours
    - Must collect: 10-20 hours Vietnamese children reading English (target domain)
    - Optional: SpeechOcean762 for non-native adult
  - Training: Fine-tune whisper-small.en or whisper-medium.en via Hugging Face LoRA. Cost: ~$40-80 on cloud spot A100.
  - Expected improvement: WER → 15-20% after fine-tuning

  2. GOP score recalibration on children's data
  - wav2vec2 trained on adult Librispeech → children's phoneme posteriors systematically too low
  - Approach: Collect 2-4 hours with human ratings (correct/acceptable/incorrect) → train lightweight regression head on wav2vec2 features
  - Dataset: SpeechOcean762 children subset as starter, augment with Vietnamese data
  - Compute: Minimal (logistic regression/small MLP). Days of work.

  Priority 2 — IMPORTANT

  3. Age-level score normalization
  - Collect 50-100 labeled examples per grade level → establish norm tables per grade
  - Transforms raw scores → age-appropriate pass/fail thresholds

  4. Language mixing handling in Whisper
  - Add language detection pre-filter (langid.py or Whisper language detection)
  - If >50% Vietnamese detected → "Please speak in English"

  ---
  8. GPU/Infra Requirements

  ┌──────────────────────────────────────────┬────────┬──────┬──────────────────────┬───────────────────────────────────────────────┐
  │                 Service                  │  CPU   │ RAM  │         GPU          │                     Notes                     │
  ├──────────────────────────────────────────┼────────┼──────┼──────────────────────┼───────────────────────────────────────────────┤
  │ API Gateway (nginx)                      │ 2 vCPU │ 1 GB │ No                   │                                               │
  ├──────────────────────────────────────────┼────────┼──────┼──────────────────────┼───────────────────────────────────────────────┤
  │ FastAPI Backend                          │ 4 vCPU │ 4 GB │ No                   │ Stateless, scale horizontal                   │
  ├──────────────────────────────────────────┼────────┼──────┼──────────────────────┼───────────────────────────────────────────────┤
  │ Redis                                    │ 2 vCPU │ 4 GB │ No                   │                                               │
  ├──────────────────────────────────────────┼────────┼──────┼──────────────────────┼───────────────────────────────────────────────┤
  │ ASR Worker (faster-whisper turbo)        │ 8 vCPU │ 8 GB │ Strongly recommended │ T4 16GB → <2s latency; CPU int8 → 3-5x slower │
  ├──────────────────────────────────────────┼────────┼──────┼──────────────────────┼───────────────────────────────────────────────┤
  │ Alignment Worker (wav2vec2)              │ 4 vCPU │ 4 GB │ Optional             │ CPU ~500ms for 3s clip                        │
  ├──────────────────────────────────────────┼────────┼──────┼──────────────────────┼───────────────────────────────────────────────┤
  │ Phoneme Scoring (CTC-GOP)                │ 4 vCPU │ 4 GB │ Optional             │ Share GPU with alignment                      │
  ├──────────────────────────────────────────┼────────┼──────┼──────────────────────┼───────────────────────────────────────────────┤
  │ VAD (Silero)                             │ 2 vCPU │ 1 GB │ No                   │ <10ms                                         │
  ├──────────────────────────────────────────┼────────┼──────┼──────────────────────┼───────────────────────────────────────────────┤
  │ Noise Reduction (DeepFilterNet)          │ 2 vCPU │ 1 GB │ No                   │ CPU <20ms                                     │
  ├──────────────────────────────────────────┼────────┼──────┼──────────────────────┼───────────────────────────────────────────────┤
  │ NLP Worker (transformers + LanguageTool) │ 4 vCPU │ 8 GB │ No                   │ LanguageTool JVM needs RAM                    │
  ├──────────────────────────────────────────┼────────┼──────┼──────────────────────┼───────────────────────────────────────────────┤
  │ PostgreSQL                               │ 4 vCPU │ 8 GB │ No                   │                                               │
  └──────────────────────────────────────────┴────────┴──────┴──────────────────────┴───────────────────────────────────────────────┘

  ---
  9. Cost Optimization
  
  1. Audio length gating: Reject clips >15s and <0.5s. Eliminates wasted inference on invalid input.
  2. Model size by exercise type:
    - Phonics/Vocabulary (single word): whisper-small.en + wav2vec2-base — 10x cheaper, sufficient with constrained decoding
    - Listen and Answer: whisper-medium.en
    - Free Speaking only: whisper-large-v3-turbo
  3. Priority queues: Phoneme feedback (priority 1, <2s) vs. grammar report (priority 2, <10s)
  4. Shared GPU: Load wav2vec2 + Whisper on same GPU, model rotation. NVIDIA MIG on A100 for multi-tenant isolation.
  5. CPU for NLP: sentence-transformers, LanguageTool, spaCy — all CPU. Never put on GPU.
  6. Spot instances for workers: Workers are stateless + retriable → 60-70% cost reduction.
  7. Cache GOP baselines: Phonics has fixed word list → pre-compute reference phoneme sequences once.
  8. Accept webm/opus from browser: More efficient than MP3/WAV → reduces bandwidth.

  ---
  10. MVP Recommendation (1-2 months)

  Scope: Phonics Exercise + Vocabulary by Image first (week 1-6). Add Listen and Answer week 8. Defer Free Speaking to Phase 2.

  MVP Stack:
  Browser MediaRecorder (webm/opus)
      → Silero VAD
      → faster-whisper small.en (constrained vocab decoding)
      → WhisperX alignment
      → wav2vec2 CTC posteriors → 3-star rating (hand-calibrated thresholds)
      → FastAPI + Celery + Redis + PostgreSQL (single docker-compose)
      
  Skip in MVP: Fine-tuning, grammar scoring, vocabulary scoring, DeepFilterNet, per-grade calibration

  Timeline:
  - Week 1-2: Audio pipeline (capture → VAD → ASR) end-to-end
  - Week 3-4: WhisperX alignment + phoneme score extraction
  - Week 5-6: Score normalization, 3-star UI, API integration
  - Week 7-8: Vocabulary by Image + Listen and Answer (semantic only)
  - Post-MVP: Fine-tune Whisper on collected data, add DeepFilterNet, add Free Speaking

  ---
  11. Long-Term Scalable Architecture (10k+ students)

  CDN (presigned URL upload) → MinIO object storage
      ↓
  Kafka (audio_uploaded events)
      ↓
  K8s Processing Cluster:
    - ASR Service         (GPU, KEDA autoscaled)
    - Alignment Service   (GPU, KEDA autoscaled)
    - Scoring Service     (CPU, autoscaled)
    - NLP Service         (CPU, autoscaled)
    - Score Aggregator    (CPU, stateless)
      ↓
  NVIDIA Triton Inference Server  ← batched GPU inference (GPU util 30% → 85%)
      ↓
  PostgreSQL (sharded by school/tenant) + Redis
      ↓
  WebSocket Gateway → client push
      ↓
  Teacher Dashboard (async, reads DB)

  Key differences from MVP:
  - Kafka replaces Celery — handles 10k+ concurrent uploads, backpressure, replay
  - KEDA autoscaling based on Kafka consumer lag
  - Triton Inference Server for batched GPU inference
  - Students upload audio directly to MinIO via presigned URL — API server never handles raw audio bytes at scale
  - Prometheus + Grafana for latency/error monitoring + scoring distribution drift detection

  Throughput math:
  - 10k concurrent students × 1 request/30s = ~333 req/s peak
  - T4 processes ~20 whisper-small requests/min (3s audio)
  - Need: 15-20 T4 GPU nodes for ASR at peak (autoscale 5-20)

  ---
  12. Risks & Limitations
  
  🔴 Critical Risk: ASR Accuracy on Vietnamese-Accented Child Speech

  Vietnamese is among worst-performing languages in Whisper accent studies. Combine Vietnamese accent + child speech + noisy mic + single-word utterances = worst-case conditions. Without fine-tuning, estimated WER 30-45%. This cascades into wrong phoneme alignment → nonsensical scores
   → product is unusable.

  Mitigation: Fine-tune Whisper (see Section 7) + constrained decoding for phonics/vocab exercises.

  ---
  🔴 Critical Risk: No Mature End-to-End Open-Source Pronunciation Scorer for Children Exists
  
  Honest assessment: no open-source library accepts audio + expected word → reliable phoneme-level score for non-native children, ready for production. Every option:
  - Works for adult non-native speech only (SpeechOcean762 baseline)
  - Requires significant wrapping (3-4 weeks)
  - Is commercial (SpeechSuper, Azure Pronunciation Assessment, Google)

  The CTC-GOP approach is 2025 state-of-the-art (NOCASA winner) but needs engineering to productionize.

  ---
  🟡 MFA Not Suitable for Realtime
  
  Excellent batch aligner but Kaldi backend has 5-30s cold-start latency. Not designed for request-level serving. WhisperX/wav2vec2 is the better path.

  🟡 GOP Unreliable for Very Short Words

  GOP works for ≥2s audio. Single isolated words (0.5-1.5s, e.g., "the") → minimal acoustic context → unreliable scores. Gate minimum audio length, avoid over-precise feedback on short words.

  🟡 LanguageTool Not Designed for Spoken Language

  Applied to ASR transcripts, will generate false errors for: ASR errors, disfluencies (uh, um), child simplification ("It red"). Strip disfluencies before running. For Grade 1-3, use rule-based expected structure instead of general grammar checker.

  🟡 Children's Speech Data Scarcity for Vietnamese-English

  No public dataset of Vietnamese children speaking English exists. Building training data requires school partnerships, consent, annotation — non-trivial. Plan from day one, not afterthought.

  🟡 Grade 1 Score Reliability

  For a 6-year-old's first English words, model distribution mismatch is extreme. Human teacher review should be mandatory for Grade 1. Automation assists only. Reliability improves significantly by Grade 4-5.

  🟡 Privacy / Legal

  Children's audio age 6-11 falls under Vietnam PDPD 2023. Default: process audio → extract features → delete raw audio within 24 hours. Must be designed in from the start.

  ---
  References
  
  - NOCASA 2025 Challenge (Non-native Children's Automatic Speech Assessment) — arxiv 2504.20678
  - WhisperX — github.com/m-bain/whisperX
  - SpeechOcean762 dataset — OpenSLR
  - Kid-Whisper: Bridging Performance Gap for Children vs Adults — arxiv 2309.07927
  - Silero VAD benchmark 2025
  - Mozilla formally discontinues DeepSpeech — Phoronix (June 2025)
  - Multi-task wav2vec2 for Children's Pronunciation Training — ISCA SLATE 2023

  ---
  Bottom line:
  
  1. Không có giải pháp out-of-box nào cho Vietnamese elementary children's English pronunciation. Phải build custom pipeline.
  2. MVP stack: faster-whisper (constrained) → WhisperX → CTC-GOP → sentence-transformers → LanguageTool. Engineering time: 6-8 weeks.
  3. Investment tối quan trọng: Collect 10-20 giờ labeled Vietnamese children's English audio để fine-tune Whisper. Không có data này, ASR WER quá cao, toàn bộ pipeline fail.
  4. NOCASA 2025 CTC-GOP architecture = current consensus cho non-native child pronunciation scoring.
  5. Deploy 1x T4 GPU node cho school-scale pilot. Scale lên K8s khi có traffic data thực.