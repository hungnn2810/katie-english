# Homework & Assignments

## `homeworks` (model: `Homework`)

Bài tập gốc (template). Không gắn với lớp hay học sinh cụ thể — chỉ chứa nội dung. Giao bài qua `HomeworkAssignment`.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `type` | `HomeworkType` | | `PHONICS` / `SPEAKING` / `READING` / `VOCABULARY` / `LISTEN` |
| `speakingMode` | `SpeakingMode?` | nullable | Chỉ dùng khi type=SPEAKING: `FREE_SPEAK` / `SCRIPT_MATCH` |
| `name` | `String?` | nullable | Tên bài tập |
| `speakingPictureUrl` | `String?` | nullable | Ảnh gợi ý cho bài Speaking |
| `speakingText` | `String?` | nullable | Script cho SCRIPT_MATCH |
| `createdAt` | `DateTime` | default `now()` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Relations:** `parts` (→ HomeworkPart[]), `assignments` (→ HomeworkAssignment[]), `readingActivities` (→ ReadingActivity[]), `vocabItems` (→ VocabItem[]), `listenItems` (→ ListenItem[])

### Nội dung theo type

| type | Nội dung chứa ở đâu |
|------|---------------------|
| `PHONICS` | `HomeworkPart` → `HomeworkWord` |
| `SPEAKING` | `speakingPictureUrl`, `speakingText`, `HomeworkPart` → `HomeworkWord` |
| `READING` | `ReadingActivity` (MATCH / FILL_BLANK) |
| `VOCABULARY` | `VocabItem` |
| `LISTEN` | `ListenItem` |

---

## `homework_parts` (model: `HomeworkPart`)

Phần (part) trong bài Phonics hoặc Speaking. Mỗi part có tên và thứ tự.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `homeworkId` | `Int` | FK → `homeworks.id` (Cascade) | |
| `name` | `String` | | Tên part (vd: "Part 1") |
| `order` | `Int` | UNIQUE với homeworkId | Thứ tự hiển thị |

**Relations:** `homework` (→ Homework), `words` (→ HomeworkWord[])

---

## `homework_words` (model: `HomeworkWord`)

Từ trong một part của bài Phonics/Speaking.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `partId` | `Int` | FK → `homework_parts.id` (Cascade) | |
| `text` | `String` | | Từ cần đọc |
| `highlight` | `String?` | nullable | Phần âm cần highlight (vd: "sh") |
| `imageUrl` | `String?` | nullable | Ảnh minh họa |
| `order` | `Int` | UNIQUE với partId | Thứ tự trong part |

**Relations:** `part` (→ HomeworkPart), `phonicsResults` (→ PhonicsItemResult[])

---

## `homework_assignments` (model: `HomeworkAssignment`)

Lệnh giao bài: link một `Homework` đến một hoặc nhiều lớp, kèm deadline.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `homeworkId` | `Int` | FK → `homeworks.id` (Cascade) | |
| `endDate` | `DateTime` | | Hạn nộp bài |
| `createdAt` | `DateTime` | default `now()` | |

**Relations:** `homework` (→ Homework), `classes` (→ HomeworkAssignmentClass[]), `sessions` (→ HomeworkSession[])

---

## `homework_assignment_classes` (model: `HomeworkAssignmentClass`)

Bảng trung gian nhiều-nhiều giữa `HomeworkAssignment` và `Class`.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `assignmentId` | `Int` | FK → `homework_assignments.id` (Cascade) | |
| `classId` | `Int` | FK → `classes.id` | |

**Unique:** `(assignmentId, classId)`
