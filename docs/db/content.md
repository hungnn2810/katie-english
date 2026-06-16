# Homework Content

Các bảng chứa nội dung của từng loại bài tập. Đều belong về một `Homework`.

---

## `vocab_items` (model: `VocabItem`)

Từ vựng trong bài **VOCABULARY**. Học sinh nhìn ảnh rồi nói tên từ.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `homeworkId` | `Int` | FK → `homeworks.id` (Cascade), index | |
| `imageUrl` | `String` | | URL ảnh minh họa |
| `word` | `String` | | Từ cần nói |
| `phonemes` | `String?` | nullable | Chuỗi âm vị (để hiển thị) |
| `order` | `Int` | default `0` | Thứ tự hiển thị |
| `createdAt` | `DateTime` | default `now()` | |

**Relations:** `homework` (→ Homework), `phonicsResults` (→ PhonicsItemResult[])

---

## `listen_items` (model: `ListenItem`)

Item audio trong bài **LISTEN**. Học sinh nghe rồi nói lại.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `homeworkId` | `Int` | FK → `homeworks.id` (Cascade), index | |
| `audioUrl` | `String` | | URL file audio cần nghe |
| `keywords` | `String` | | JSON array — các từ khoá cần nói đúng, vd `["red", "cat"]` |
| `expectedText` | `String` | | Câu trả lời đầy đủ — dùng để tính semantic score |
| `order` | `Int` | default `0` | Thứ tự trong bài |
| `createdAt` | `DateTime` | default `now()` | |

**Relations:** `homework` (→ Homework), `results` (→ ListenItemResult[])

---

## `reading_activities` (model: `ReadingActivity`)

Activity trong bài **READING**. Mỗi activity có type riêng.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `homeworkId` | `Int` | FK → `homeworks.id` (Cascade) | |
| `type` | `ReadingActivityType` | | `MATCH` / `FILL_BLANK` |
| `order` | `Int` | UNIQUE với homeworkId | Thứ tự trong bài |

**Relations:** `homework` (→ Homework), `matchPairs` (→ MatchPair[]), `fillBlanks` (→ FillBlank[])

---

## `match_pairs` (model: `MatchPair`)

Cặp ảnh-từ trong activity **MATCH**. Học sinh kéo-thả nối ảnh với từ.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `activityId` | `Int` | FK → `reading_activities.id` (Cascade) | |
| `imageUrl` | `String` | | URL ảnh |
| `word` | `String` | | Từ cần nối với ảnh |
| `order` | `Int` | UNIQUE với activityId | Thứ tự hiển thị |

---

## `fill_blanks` (model: `FillBlank`)

Câu điền từ trong activity **FILL_BLANK**.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `activityId` | `Int` | FK → `reading_activities.id` (Cascade) | |
| `sentence` | `String` | | Câu có chỗ trống, vd: `"The ___ is red."` |
| `order` | `Int` | UNIQUE với activityId | Thứ tự trong activity |

**Relations:** `activity` (→ ReadingActivity), `choices` (→ FillBlankChoice[])

---

## `fill_blank_choices` (model: `FillBlankChoice`)

Các lựa chọn (đáp án) cho một câu `FillBlank`.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `blankId` | `Int` | FK → `fill_blanks.id` (Cascade) | |
| `word` | `String` | | Từ lựa chọn |
| `isCorrect` | `Boolean` | | `true` = đây là đáp án đúng |

**Relations:** `blank` (→ FillBlank)
