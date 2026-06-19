# Tuition Management

Tuition configuration and payment tracking for classes.

## `tuition_configs` (model: `TuitionConfig`)

Học phí cấu hình cho một lớp. Mỗi lớp có một config, chứa giá/buổi + tiền sách + hạn đóng.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `classId` | `Int` | UNIQUE, FK → `classes.id` | Lớp |
| `pricePerSession` | `Int` | | Đơn giá/buổi (VNĐ) |
| `bookFee` | `Int?` | nullable | Tiền sách (VNĐ), null = không có |
| `dueDayOfMonth` | `Int` | range 1-31 | Ngày hạn trong tháng |
| `createdAt` | `DateTime` | default `now()` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Relations:** `class` (→ Class)

---

## `tuition_records` (model: `TuitionRecord`)

Phiếu thu học sinh/tháng. Mỗi học sinh × tháng = 1 record. Trạng thái: PENDING / PAID / OVERDUE.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `studentId` | `Int` | FK → `students.id` | Học sinh |
| `classId` | `Int` | FK → `classes.id` | Lớp |
| `month` | `Int` | range 1-12 | Tháng (1-12) |
| `year` | `Int` | | Năm |
| `tuitionAmount` | `Int` | | Tiền học (= sessions × pricePerSession) |
| `bookFee` | `Int` | | Tiền sách (0 nếu không tính) |
| `totalAmount` | `Int` | | Tổng (tuitionAmount + bookFee) |
| `dueDate` | `DateTime` | | Hạn đóng (ngày dueDayOfMonth của tháng) |
| `status` | `TuitionStatus` | enum, default PENDING | PENDING / PAID / OVERDUE |
| `paidAt` | `DateTime?` | nullable | Ngày đóng (nếu đã đóng) |
| `paidBy` | `String?` | nullable | Người ghi nhận đóng (admin/teacher username) |
| `createdAt` | `DateTime` | default `now()` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Unique constraint:** `@@unique([studentId, classId, month, year])` — prevents duplicate records per student/month.

**Relations:** `student` (→ Student), `class` (→ Class), `notificationLogs` (→ TuitionNotificationLog[])

---

## `tuition_notification_logs` (model: `TuitionNotificationLog`)

Log gửi thông báo ZNS. Mỗi lần gửi ZNS cho một phiếu thu = 1 log.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `tuitionRecordId` | `Int` | FK → `tuition_records.id` | Phiếu thu |
| `sentAt` | `DateTime` | | Thời gian gửi |
| `zaloResponse` | `String` | | Response JSON từ Zalo API (stringified) |
| `success` | `Boolean` | | `true` nếu status=0, `false` nếu lỗi |
| `createdAt` | `DateTime` | default `now()` | |

**Relations:** `tuitionRecord` (→ TuitionRecord, onDelete: Cascade)

---

## `TuitionStatus` Enum

| Value | Meaning |
|-------|---------|
| `PENDING` | Chưa đóng, chưa quá hạn |
| `PAID` | Đã đóng |
| `OVERDUE` | Quá hạn, chưa đóng (dueDate < now) |

---

## Computation Rules

### Tuition Amount (TUITION-02)

```
tuitionAmount = countSessionsInMonth(Class.scheduleSlots, month, year) × TuitionConfig.pricePerSession
totalAmount = tuitionAmount + (TuitionConfig.bookFee || 0)
```

### Due Date (TUITION-03)

```
dueDate = new Date(year, month-1, TuitionConfig.dueDayOfMonth)
```

### OVERDUE Status (TUITION-05)

```
status =
  if (TuitionRecord.paidAt) → PAID
  else if (TuitionRecord.dueDate < now) → OVERDUE
  else → PENDING
```

Computed at query time, not persisted to DB — the `status` column stores PENDING/PAID only; OVERDUE is derived at read time.

---

## Relationships Diagram

```
Class ──(1:1)──► TuitionConfig
      └─(1:N)──► TuitionRecord
               └─(N:1)──► Student

Student ──(1:N)──► TuitionRecord
        └─(1:N)──► ParentInfo (for ZNS notifications)

TuitionRecord ──(1:N)──► TuitionNotificationLog
```
