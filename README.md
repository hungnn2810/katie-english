# Phonics Blending Web App

Learn English pronunciation by blending phonemes.

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | NestJS + TypeScript, Prisma ORM   |
| Database | PostgreSQL 16                     |
| Storage  | MinIO (S3-compatible)             |
| Frontend | Next.js 14 (App Router), Tailwind |
| Container| Docker Compose                    |

---

## Project Structure

```
katie-english/
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── prisma/          # PrismaService (global)
│   │   ├── phoneme/         # GET /phonics/phonemes
│   │   ├── word/            # GET /phonics/words/random?level=1
│   │   └── quiz/            # POST /phonics/submit
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── Dockerfile
│   └── .env
└── frontend/
    ├── app/
    │   ├── page.tsx         # Home
    │   └── game/page.tsx    # Game UI
    ├── components/
    │   ├── PhonemeButton.tsx
    │   ├── SelectedPhonemes.tsx
    │   └── ResultBanner.tsx
    ├── lib/api.ts
    └── Dockerfile
```

---

## API

### `GET /phonics/words/random?level=1`
```json
{
  "wordId": 1,
  "word": "cat",
  "wordAudioUrl": "http://...",
  "phonemes": [
    { "symbol": "c", "audioUrl": "http://..." },
    { "symbol": "a", "audioUrl": "http://..." },
    { "symbol": "t", "audioUrl": "http://..." }
  ]
}
```

### `POST /phonics/submit`
Request:
```json
{ "wordId": 1, "selectedPhonemes": ["c", "a", "t"] }
```
Response:
```json
{ "isCorrect": true, "correctAnswer": ["c", "a", "t"] }
```

---

## Run with Docker

```bash
docker compose up --build
```

| Service       | URL                                          |
|---------------|----------------------------------------------|
| Frontend      | http://localhost:3000                        |
| Backend API   | http://localhost:3001                        |
| MinIO Console | http://localhost:9001 (admin / Pass1234!)    |

> After first boot, seed the database:
> ```bash
> docker compose exec backend npx ts-node prisma/seed.ts
> ```

---

## Run Locally (Dev)

### Prerequisites
- Node.js 20+
- PostgreSQL running on port 5432
- MinIO running on port 9000

### Backend

```bash
cd backend
npm install
npx prisma migrate deploy
npx ts-node prisma/seed.ts
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:3001

---

## Audio Files

Upload audio to MinIO bucket `phonics-audio` before playing:

```
phonics-audio/
├── phonemes/
│   ├── c.mp3   a.mp3   t.mp3
│   ├── d.mp3   o.mp3   g.mp3
│   ├── sh.mp3  i.mp3   p.mp3
└── words/
    ├── cat.mp3  dog.mp3  ship.mp3
```

Upload via MinIO console at http://localhost:9001 or using `mc`:

```bash
mc alias set local http://localhost:9000 admin Pass1234!
mc mb local/phonics-audio
mc cp ./audio/phonemes/ local/phonics-audio/phonemes/ --recursive
mc cp ./audio/words/    local/phonics-audio/words/    --recursive
```

---

## Seed Data

| Word | Phonemes       | Difficulty |
|------|----------------|------------|
| cat  | c · a · t      | 1          |
| dog  | d · o · g      | 1          |
| ship | sh · i · p     | 2          |

---

## Environment Variables

`backend/.env`:

```env
DATABASE_URL="postgresql://postgres:Pass1234!@localhost:5432/phonics"
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=Pass1234!
MINIO_BUCKET=phonics-audio
MINIO_USE_SSL=false
MINIO_PUBLIC_URL=http://localhost:9000/phonics-audio
PORT=3001
```
