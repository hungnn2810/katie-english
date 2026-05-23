---
phase: 05-bfa-quality-performance
plan: 07
status: complete
---

# Plan 07 Summary: Rebuild Self-hosted BFA Service

## What was done

All 7 tasks completed:

1. **bfa-service/requirements.txt** — fastapi, uvicorn, phonemizer, espeak-ng, requests
2. **bfa-service/Dockerfile** — python:3.11-slim + ffmpeg + espeak-ng system deps
3. **bfa-service/main.py** — FastAPI service with `/health`, `/analyze`, `/analyze-speaking`, `/transcribe`, `/align` endpoints; Groq Whisper ASR + phonemizer G2P scoring
4. **bfa.service.ts** — reverted to axios HTTP client (no Azure SDK)
5. **azure-audio.util.ts** deleted; `microsoft-cognitiveservices-speech-sdk` removed from package.json; ffmpeg removed from backend/Dockerfile
6. **bfa.service.spec.ts** — axios mock spec (8 tests pass)
7. **docker-compose.yml** — bfa service block with GROQ_API_KEY; backend depends_on bfa: service_healthy

## Verification

- `npx tsc --noEmit` — ✅
- `npm run test` — ✅ 140 tests passed
- `docker compose config` — ✅ valid

## Architecture

```
NestJS BfaService → HTTP/axios → bfa-service (FastAPI, Docker)
                                    ↓ Groq Whisper API (ASR)
                                    ↓ phonemizer + espeak (G2P, local)
                                    ↓ SequenceMatcher alignment (local)
```

## Commits

- `b6531ec` feat(05-07): rebuild BFA service — Groq ASR + local phonemizer, remove Azure PA SDK
- `4e5a4d4` chore(05-07): remove ffmpeg from backend Dockerfile — moved to bfa-service
