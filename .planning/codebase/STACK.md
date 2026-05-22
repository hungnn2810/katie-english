---
last_mapped_commit: 76a70d3d792f
---
# STACK.md
*Mapped: 2026-05-12*

## Languages & Runtime

| Layer | Language | Runtime |
|-------|----------|---------|
| Frontend | TypeScript 5, TSX | Node.js (Next.js build) |
| Backend | TypeScript 5 | Node.js 20 |
| BFA Service | Python 3.11 | CPython |

## Frameworks

### Frontend — `frontend/`
- **Next.js 14** — App Router (`app/` directory), SSR/CSR hybrid
- **React 18** — Functional components, hooks only
- **Tailwind CSS 3** — Utility-first styling
- **TypeScript 5** — Strict mode

### Backend — `backend/`
- **NestJS 10** — Module/controller/service/guard pattern
- **Prisma 5** — ORM + migration runner, client at `@prisma/client`
- **@nestjs/jwt** — JWT signing/verification
- **bcryptjs** — Password hashing (rounds: 10)
- **axios** — HTTP client for BFA service calls
- **multer** — Multipart file upload (via `@nestjs/platform-express`)
- **minio** — S3-compatible storage client

### BFA Service — `bfa-service/`
- **FastAPI** — HTTP API (single-file: `main.py`)
- **WhisperX** — Speech transcription + word-level alignment
- **bournemouth-forced-aligner** — Phoneme-timestamp alignment
- **PyTorch** (CPU) — Model inference
- **espeak-ng** (system) — IPA phoneme generation fallback
- **ffmpeg** (system) — Audio normalization (16kHz mono WAV)

## Database

- **PostgreSQL 16** — Primary datastore
- Connection: `DATABASE_URL` env var, Prisma manages pool
- Docker image: `postgres:16-alpine`

## Storage

- **MinIO** (S3-compatible) — Audio recordings, homework images
- Bucket: `phonics-audio` (configurable via `MINIO_BUCKET`)
- Ports: 9000 (API), 9001 (console)

## Configuration

| Env Var | Default | Where used |
|---------|---------|------------|
| `DATABASE_URL` | — | `backend/` Prisma |
| `MINIO_ENDPOINT` | `localhost` | `backend/` StorageService |
| `MINIO_PORT` | `9000` | `backend/` StorageService |
| `MINIO_ACCESS_KEY` | `admin` | `backend/` StorageService |
| `MINIO_SECRET_KEY` | — | `backend/` StorageService |
| `MINIO_BUCKET` | `phonics-audio` | `backend/` StorageService |
| `MINIO_USE_SSL` | `false` | `backend/` StorageService |
| `PORT` | `3001` | `backend/` main.ts |
| `TEACHER_EMAIL` | — | `backend/` bootstrap seed |
| `TEACHER_PASSWORD` | — | `backend/` bootstrap seed |
| `BFA_URL` | `http://localhost:3002` | `backend/` BfaService |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | `frontend/` lib/api.ts |
| `WHISPERX_MODEL` | `small` | `bfa-service/` main.py |
| `BFA_PRESET` | `en-us` | `bfa-service/` main.py |

## Build & Deployment

- **Docker Compose** — `docker-compose.yml` at root, 5 services: `postgres`, `minio`, `bfa`, `backend`, `frontend`
- Service startup order: `postgres` + `minio` + `bfa` → `backend` → `frontend`
- Port mapping: frontend:3000, backend:3001, bfa:3002, minio:9000/9001, postgres:5432

## Testing

- **Jest 30** + **ts-jest** — Unit/integration tests
- Test files: `*.spec.ts` co-located with source
- Config in `backend/package.json` `jest` block
- NestJS `@nestjs/testing` for dependency injection mocking
