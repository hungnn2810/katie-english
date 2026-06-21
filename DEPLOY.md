# Hướng dẫn Deploy Production

Tài liệu này mô tả quy trình deploy **Katie English** lên server production sử dụng Docker Compose + Nginx.

---

## Kiến trúc tổng quan

```
Internet (80/443)
      │
   nginx:1.27
      ├─ admin.katie-english.com.vn  ──► frontend:3000
      ├─ app.katie-english.com.vn    ──► frontend:3000  (Next.js đọc Host header)
      ├─ student.katie-english.com.vn ─► frontend:3000
      └─ api.katie-english.com.vn    ──► backend:3001

Internal (không expose ra ngoài):
  postgres:5432 │ redis:6379 │ minio:9000
```

---

## Yêu cầu server

| Yêu cầu | Tối thiểu |
|---------|-----------|
| OS | Ubuntu 22.04 / Debian 12 |
| RAM | 2 GB |
| CPU | 2 core |
| Disk | 20 GB |
| Docker | >= 24 |
| Docker Compose plugin | >= 2.20 |

---

## Lần đầu deploy

### 1. Cài đặt Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Đăng xuất rồi đăng nhập lại để áp dụng group
```

### 2. Copy file cấu hình lên server

Chỉ cần copy các file deploy (không cần toàn bộ source code):

```bash
scp docker-compose.prod.yml env.prod.example backend.env.example user@server:~/katie/
scp -r nginx/ user@server:~/katie/nginx/
```

Hoặc clone repo:

```bash
git clone <repo-url> ~/katie
cd ~/katie
```

### 3. Xin SSL certificate (wildcard)

Cài certbot và xin cert cho `*.katie-english.com.vn`:

```bash
sudo apt install certbot python3-certbot-dns-<provider>

# Với DNS challenge (cần cấu hình DNS API hoặc dừng lại để thêm TXT record thủ công)
sudo certbot certonly --manual \
  --preferred-challenges dns \
  -d "katie-english.com.vn" \
  -d "*.katie-english.com.vn"
```

> Cert sẽ được lưu tại `/etc/letsencrypt/live/katie-english.com.vn/` — đây là đường dẫn đã cấu hình sẵn trong `nginx/conf.d/katie.conf`.

**Tự động renew:** certbot tự đặt cronjob. Sau khi renew cần reload nginx:

```bash
# Thêm vào /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
#!/bin/sh
cd ~/katie && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

```bash
chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

### 4. Tạo file env

```bash
cd ~/katie

# File cho Docker Compose (image registry, passwords dùng chung)
cp env.prod.example .env
nano .env   # điền DOCKERHUB_USERNAME, POSTGRES_PASSWORD, MINIO_SECRET_KEY

# File secrets riêng cho backend
cp backend.env.example backend.env
nano backend.env  # điền JWT_SECRET, AZURE_SPEECH_KEY, ADMIN_EMAIL, ...
```

**Nội dung `.env` tối thiểu:**

```env
DOCKERHUB_USERNAME=your-dockerhub-username
IMAGE_TAG=latest
POSTGRES_PASSWORD=strong_random_password
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=strong_random_password
```

**Nội dung `backend.env` quan trọng nhất:**

```env
JWT_SECRET=<ít nhất 64 ký tự ngẫu nhiên>
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=<khớp với .env>
ADMIN_EMAIL=admin@katie-english.com.vn
ADMIN_PASSWORD=<mật khẩu admin>
TEACHER_EMAIL=teacher@katie-english.com.vn
TEACHER_PASSWORD=<mật khẩu teacher>
AZURE_SPEECH_KEY=<key Azure Speech>
```

### 5. Pull image và khởi động

```bash
cd ~/katie

# Pull image mới nhất từ Docker Hub
docker compose -f docker-compose.prod.yml pull

# Khởi động toàn bộ stack
docker compose -f docker-compose.prod.yml up -d

# Kiểm tra trạng thái
docker compose -f docker-compose.prod.yml ps
```

Sau ~30 giây, kiểm tra:

```bash
curl -I https://api.katie-english.com.vn/health
curl -I https://app.katie-english.com.vn
```

---

## Cập nhật (rolling update)

Khi CI/CD push image mới lên Docker Hub:

```bash
cd ~/katie

# Pull image mới
docker compose -f docker-compose.prod.yml pull

# Restart service bị thay đổi (zero-downtime với nginx giữ connections)
docker compose -f docker-compose.prod.yml up -d --no-deps backend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
```

Hoặc restart toàn bộ:

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Lệnh thường dùng

```bash
# Xem log realtime
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx

# Xem tất cả service
docker compose -f docker-compose.prod.yml logs -f

# Restart một service
docker compose -f docker-compose.prod.yml restart backend

# Vào shell container backend
docker compose -f docker-compose.prod.yml exec backend sh

# Chạy Prisma migration thủ công
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Xem trạng thái tất cả service
docker compose -f docker-compose.prod.yml ps

# Dừng toàn bộ stack (giữ data)
docker compose -f docker-compose.prod.yml down

# Dừng và XÓA volumes (mất data!)
docker compose -f docker-compose.prod.yml down -v
```

---

## Backup database

```bash
# Dump database ra file
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres phonics | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore từ backup
gunzip -c backup_20240101_120000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres phonics
```

---

## Cấu trúc file trên server

```
~/katie/
├── docker-compose.prod.yml   # compose file production
├── .env                      # biến cho compose (GITIGNORED — không commit)
├── backend.env               # secrets backend (GITIGNORED — không commit)
├── env.prod.example          # template cho .env
├── backend.env.example       # template cho backend.env
└── nginx/
    ├── nginx.conf            # config nginx chính
    └── conf.d/
        └── katie.conf        # server blocks cho 4 subdomain
```

---

## Troubleshooting

**nginx không start do thiếu cert:**
```bash
# Kiểm tra cert tồn tại
ls /etc/letsencrypt/live/katie-english.com.vn/

# Nếu chưa có cert, tạm thời comment SSL blocks trong katie.conf
# rồi chạy certbot, sau đó bỏ comment lại
```

**Backend lỗi database:**
```bash
docker compose -f docker-compose.prod.yml logs postgres
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status
```

**MinIO không connect:**
```bash
docker compose -f docker-compose.prod.yml logs minio
# Kiểm tra MINIO_ACCESS_KEY và MINIO_SECRET_KEY khớp giữa .env và backend.env
```

**Xem resource usage:**
```bash
docker stats
```
