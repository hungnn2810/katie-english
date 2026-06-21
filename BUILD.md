# Hướng dẫn Build

Tài liệu này mô tả cách build Docker image cho **backend** và **frontend** từ thư mục gốc của project.

---

## Yêu cầu

- [Docker](https://docs.docker.com/get-docker/) >= 24
- File `.env` tại root project (xem `.env.example` trong thư mục `backend/`)

---

## Cấu trúc Docker image

| Service  | Dockerfile              | Port | Image name (example)                  |
|----------|-------------------------|------|----------------------------------------|
| Backend  | `backend/Dockerfile`    | 3001 | `yourname/katie-english-backend:latest` |
| Frontend | `frontend/Dockerfile`   | 3000 | `yourname/katie-english-frontend:latest` |

---

## Build nhanh với Docker Compose

Cách đơn giản nhất — build và chạy toàn bộ stack (postgres, redis, minio, backend, frontend):

```bash
docker compose up --build
```

Chỉ build lại một service cụ thể mà không khởi động lại toàn bộ:

```bash
docker compose build backend
docker compose build frontend
```

---

## Build thủ công từng service

### Backend

Build context là thư mục `backend/`. Không cần env var ở build time — tất cả config được inject lúc chạy container.

```bash
docker build \
  -t katie-english-backend:latest \
  -f backend/Dockerfile \
  ./backend
```

Chạy thử:

```bash
docker run --rm \
  --env-file backend/.env \
  -p 3001:3001 \
  katie-english-backend:latest
```

---

### Frontend

Frontend dùng Next.js standalone. Các biến `NEXT_PUBLIC_*` phải được truyền lúc **build** (chúng được nhúng vào JS bundle, không thể thay đổi lúc runtime).

```bash
docker build \
  -t katie-english-frontend:latest \
  -f frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.katie.vn \
  --build-arg NEXT_PUBLIC_SUBDOMAIN=app \
  --build-arg NEXT_PUBLIC_ADMIN_ORIGIN=https://admin.katie.vn \
  --build-arg NEXT_PUBLIC_APP_ORIGIN=https://app.katie.vn \
  --build-arg NEXT_PUBLIC_STUDENT_ORIGIN=https://student.katie.vn \
  --build-arg NEXT_PUBLIC_LOGIN_URL=https://app.katie.vn/login \
  ./frontend
```

Chạy thử:

```bash
docker run --rm \
  -p 3000:3000 \
  katie-english-frontend:latest
```

> **Lưu ý:** Mỗi subdomain (`admin`, `app`, `student`) dùng chung một image; hành vi UI được quyết định bởi `NEXT_PUBLIC_SUBDOMAIN`. Nếu muốn 3 image riêng biệt, build 3 lần với giá trị `--build-arg NEXT_PUBLIC_SUBDOMAIN` khác nhau.

---

## Build với cache (tăng tốc CI/CD local)

Dùng BuildKit inline cache để tái sử dụng layer giữa các lần build:

```bash
# Backend
DOCKER_BUILDKIT=1 docker build \
  --cache-from katie-english-backend:latest \
  -t katie-english-backend:latest \
  -f backend/Dockerfile \
  ./backend

# Frontend
DOCKER_BUILDKIT=1 docker build \
  --cache-from katie-english-frontend:latest \
  -t katie-english-frontend:latest \
  -f frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.katie.vn \
  ...
  ./frontend
```

---

## Push lên Docker Hub

```bash
# Đăng nhập
docker login

# Tag và push backend
docker tag katie-english-backend:latest yourname/katie-english-backend:latest
docker push yourname/katie-english-backend:latest

# Tag và push frontend
docker tag katie-english-frontend:latest yourname/katie-english-frontend:latest
docker push yourname/katie-english-frontend:latest
```

---

## CI/CD (GitHub Actions)

Hai workflow đã được cấu hình trong `.github/workflows/`:

| Workflow | File | Trigger | Làm gì |
|----------|------|---------|--------|
| CI | `ci.yml` | Push / PR → `main` | Type check + test backend & frontend |
| Build & Push | `build-push.yml` | CI pass trên `main`, hoặc push tag `v*` | Build Docker image → push Docker Hub |

### Secrets cần cấu hình trên GitHub

`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Mô tả |
|--------|-------|
| `DOCKERHUB_USERNAME` | Tên tài khoản Docker Hub |
| `DOCKERHUB_TOKEN` | Access token Docker Hub (không dùng password) |
| `NEXT_PUBLIC_API_URL` | URL API production (vd: `https://api.katie.vn`) |
| `NEXT_PUBLIC_SUBDOMAIN` | Subdomain mặc định (vd: `app`) |
| `NEXT_PUBLIC_ADMIN_ORIGIN` | `https://admin.katie.vn` |
| `NEXT_PUBLIC_APP_ORIGIN` | `https://app.katie.vn` |
| `NEXT_PUBLIC_STUDENT_ORIGIN` | `https://student.katie.vn` |
| `NEXT_PUBLIC_LOGIN_URL` | `https://app.katie.vn/login` |

---

## Build local để dev (không dùng Docker)

### Backend

```bash
cd backend
npm install
npx prisma generate
npm run build        # compile TypeScript → dist/
npm run start        # chạy dist/main.js
```

### Frontend

```bash
cd frontend
npm install
npm run build        # cần file ../.env tại root project
```

File `.env` tại root cần có tối thiểu:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUBDOMAIN=app
NEXT_PUBLIC_ADMIN_ORIGIN=https://admin.katie.vn
NEXT_PUBLIC_APP_ORIGIN=https://app.katie.vn
NEXT_PUBLIC_STUDENT_ORIGIN=https://student.katie.vn
NEXT_PUBLIC_LOGIN_URL=https://app.katie.vn/login
```
