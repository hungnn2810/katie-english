# Phonics Reference Data

Các bảng dữ liệu tĩnh về âm vị học. Dùng để map từ với phoneme và hỗ trợ phân tích phát âm.

---

## `phonemes` (model: `Phoneme`)

Âm vị IPA. Dữ liệu tham chiếu, không thay đổi thường xuyên.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `symbol` | `String` | UNIQUE | Ký hiệu IPA (vd: `"sh"`, `"æ"`) |
| `audioUrl` | `String` | | URL audio ví dụ phát âm phoneme |
| `type` | `String` | | Loại phoneme (vd: `"consonant"`, `"vowel"`) |

**Relations:** `wordPhonemes` (→ WordPhoneme[])

---

## `words` (model: `Word`)

Từ tiếng Anh có liên kết âm vị. Dùng để tra cứu cách phát âm chuẩn.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `text` | `String` | UNIQUE | Từ (vd: `"ship"`) |
| `audioUrl` | `String` | | URL audio phát âm chuẩn |
| `difficulty` | `Int` | default `1` | Độ khó (1 = dễ nhất) |
| `phonemes` | `String?` | nullable | Chuỗi phoneme dạng text (vd: `"sh-ɪ-p"`) |

**Relations:** `wordPhonemes` (→ WordPhoneme[])

---

## `word_phonemes` (model: `WordPhoneme`)

Quan hệ nhiều-nhiều giữa `Word` và `Phoneme`, có thứ tự. Mỗi row = một phoneme tại vị trí cụ thể trong từ.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `wordId` | `Int` | FK → `words.id` (Cascade) | |
| `phonemeId` | `Int` | FK → `phonemes.id` (Cascade) | |
| `orderIndex` | `Int` | UNIQUE với wordId | Vị trí phoneme trong từ (0-indexed) |

**Unique:** `(wordId, orderIndex)` — không có hai phoneme cùng vị trí trong một từ.

### Ví dụ

Từ `"ship"` → 3 rows:

| wordId | phonemeId | orderIndex | phoneme.symbol |
|--------|-----------|------------|----------------|
| 1 | 5 | 0 | `sh` |
| 1 | 12 | 1 | `ɪ` |
| 1 | 3 | 2 | `p` |
