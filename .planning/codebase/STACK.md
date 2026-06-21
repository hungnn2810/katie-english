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
- **bullmq** + **ioredis** — Redis-backed job queue (audio processing)
- **ffmpeg-static** — Bundled ffmpeg for dev/test audio conversion (falls back to system ffmpeg in prod)

## Infrastructure

### Database
- **PostgreSQL 16** — Primary datastore
- Connection: `DATABASE_URL` env var, Prisma manages pool
- Docker image: `postgres:16-alpine`

### Queue
- **Redis 7** — BullMQ job queue backing store
- Docker image: `redis:7-alpine`
- Port: 6379

## Storage

- **MinIO** (S3-compatible) — Audio recordings, homework images
- Bucket: `phonics-audio` (configurable via `MINIO_BUCKET`)
- Ports: 9000 (API), 9001 (console)

## Configuration

| Env Var | Default | Where used |
|---------|---------|------------|
| `DATABASE_URL` | — | `backend/` Prisma |
| `JWT_SECRET` | `katie-secret-2024` | `backend/` JwtService — **change in production** |
| `MINIO_ENDPOINT` | `localhost` | `backend/` StorageService |
| `MINIO_PORT` | `9000` | `backend/` StorageService |
| `MINIO_ACCESS_KEY` | `admin` | `backend/` StorageService |
| `MINIO_SECRET_KEY` | `Pass1234!` | `backend/` StorageService + MinIO root password |
| `MINIO_BUCKET` | `phonics-audio` | `backend/` StorageService |
| `MINIO_USE_SSL` | `false` | `backend/` StorageService |
| `PORT` | `3001` | `backend/` main.ts |
| `REDIS_URL` | `redis://redis:6379` | `backend/` BullMQ |
| `TEACHER_EMAIL` | — | `backend/` bootstrap seed |
| `TEACHER_PASSWORD` | — | `backend/` bootstrap seed |
| `ADMIN_EMAIL` | — | `backend/` bootstrap seed |
| `ADMIN_PASSWORD` | — | `backend/` bootstrap seed |
| `AZURE_SPEECH_KEY` | — | `backend/` BfaService (PA + STT) |
| `AZURE_SPEECH_REGION` | `eastus` | `backend/` BfaService |
| `AZURE_PHONEME_CORRECT_THRESHOLD` | `80` | `backend/` BfaService.mapPhonemeOps |
| `AZURE_PHONEME_SIMILAR_THRESHOLD` | `50` | `backend/` BfaService.mapPhonemeOps |
| `AZURE_MIN_WORD_SCORE` | `70` | `backend/` BfaService.analyzeSpeaking |
| `AZURE_OPENAI_KEY` | — | `backend/` BfaService.scoreSemantic (optional) |
| `AZURE_OPENAI_ENDPOINT` | — | `backend/` BfaService.scoreSemantic (optional) |
| `AZURE_OPENAI_DEPLOYMENT` | `gpt-4o-mini` | `backend/` BfaService.scoreSemantic (optional) |
| `AZURE_OPENAI_API_VERSION` | `2024-08-01-preview` | `backend/` BfaService.scoreSemantic (optional) |
| `BFA_WEBHOOK_URL` | `''` | `backend/` GameJobsService (optional) |
| `BFA_QUEUE_CONCURRENCY` | `1` | `backend/` GameJobsService (optional) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | `frontend/` lib/api.ts |
| `NEXT_PUBLIC_SUBDOMAIN` | `app` | `frontend/` subdomain routing |
| `NEXT_PUBLIC_ADMIN_ORIGIN` | `http://admin.katie-english.com.vn` | `frontend/` |
| `NEXT_PUBLIC_APP_ORIGIN` | `http://app.katie-english.com.vn` | `frontend/` |
| `NEXT_PUBLIC_STUDENT_ORIGIN` | `http://student.katie-english.com.vn` | `frontend/` |
| `NEXT_PUBLIC_LOGIN_URL` | `http://app.katie-english.com.vn/login` | `frontend/` |

## Build & Deployment

- **Docker Compose** — `docker-compose.yml` at root, 5 services: `postgres`, `minio`, `redis`, `backend`, `frontend`
- Service startup order: `postgres` + `minio` + `redis` → `backend` → `frontend`
- Port mapping: frontend:3000, backend:3001, minio:9000/9001, redis:6379, postgres:5432
- BFA pronunciation scoring via Azure Cognitive Services REST API (no local service container needed)

## Testing

- **Jest 30** + **ts-jest** — Unit/integration tests
- Test files: `*.spec.ts` co-located with source
- Config in `backend/package.json` `jest` block
- NestJS `@nestjs/testing` for dependency injection mocking
