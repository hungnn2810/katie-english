# Sessions & Results

## `homework_sessions` (model: `HomeworkSession`)

Phiên làm bài của một học sinh cho một assignment cụ thể. Một session chứa toàn bộ kết quả của lần làm đó.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `studentId` | `Int` | FK → `students.id` | |
| `assignmentId` | `Int` | FK → `homework_assignments.id` | |
| `score` | `Float?` | nullable | Điểm tổng (0–100), null khi chưa hoàn thành |
| `completedAt` | `DateTime?` | nullable | Thời điểm nộp bài, null khi đang làm |
| `startedAt` | `DateTime` | default `now()` | Thời điểm bắt đầu |

**Relations:** `student` (→ Student), `assignment` (→ HomeworkAssignment), `speakingResults` (→ SpeakingResult[]), `phonicsResults` (→ PhonicsItemResult[]), `readingResult` (→ ReadingResult?), `listenResults` (→ ListenItemResult[])

---

## `speaking_results` (model: `SpeakingResult`)

Kết quả bài Speaking. Mỗi session có tối đa 1 kết quả.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `sessionId` | `Int` | UNIQUE, FK → `homework_sessions.id` (Cascade) | 1-1 với session |
| `transcribedText` | `String?` | nullable | Văn bản học sinh đã nói (STT output) |
| `score` | `Float` | | Điểm (0–100) |
| `matchedWords` | `Int` | | Số từ khớp với script |
| `totalWords` | `Int` | | Tổng số từ trong script |
| `phonemes` | `String?` | nullable | JSON — feedback âm vị từ BFA |

---

## `phonics_item_results` (model: `PhonicsItemResult`)

Kết quả từng từ trong bài Phonics hoặc Vocabulary. Mỗi session có nhiều item results.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `sessionId` | `Int` | FK → `homework_sessions.id` (Cascade) | |
| `wordId` | `Int?` | nullable, FK → `homework_words.id` (Cascade) | Dùng khi type=PHONICS |
| `vocabItemId` | `Int?` | nullable, FK → `vocab_items.id` (Cascade) | Dùng khi type=VOCABULARY |
| `transcribedText` | `String?` | nullable | Văn bản học sinh đã nói |
| `score` | `Float` | | Điểm phát âm từ BFA (0–100) |

> **Note:** `wordId` và `vocabItemId` không đồng thời có giá trị. Một trong hai nullable tùy theo loại bài.

---

## `reading_results` (model: `ReadingResult`)

Kết quả bài Reading. Mỗi session có tối đa 1 kết quả.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `sessionId` | `Int` | UNIQUE, FK → `homework_sessions.id` (Cascade) | 1-1 với session |
| `totalItems` | `Int` | | Tổng số câu hỏi |
| `correctItems` | `Int` | | Số câu trả lời đúng |
| `score` | `Float` | | Điểm (0–100) |

---

## `listen_item_results` (model: `ListenItemResult`)

Kết quả từng item trong bài Listen. Mỗi session có nhiều item results.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `sessionId` | `Int` | FK → `homework_sessions.id` (Cascade) | |
| `listenItemId` | `Int` | FK → `listen_items.id` (Cascade) | Item audio tương ứng |
| `itemOrder` | `Int` | default `0` | Thứ tự item trong bài |
| `transcript` | `String` | default `""` | Văn bản học sinh đã nói (STT) |
| `semanticScore` | `Float` | default `0` | Điểm nghĩa (0–1): so sánh với expectedText |
| `pronScore` | `Float` | default `0` | Điểm phát âm BFA (0–100) |
| `compositeScore` | `Float` | default `0` | Điểm tổng hợp cuối |
| `bfaFeedback` | `String?` | nullable | JSON — BFA feedback cho các keyword khớp |
