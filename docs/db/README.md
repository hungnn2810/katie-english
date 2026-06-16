# Database Schema Overview

PostgreSQL database, accessed via Prisma ORM. Provider: `postgresql`.

## Enums

| Enum | Values |
|------|--------|
| `ClassStatus` | `PENDING`, `INPROGRESS`, `ENDED` |
| `HomeworkType` | `PHONICS`, `SPEAKING`, `READING`, `VOCABULARY`, `LISTEN` |
| `ReadingActivityType` | `MATCH`, `FILL_BLANK` |
| `SpeakingMode` | `FREE_SPEAK`, `SCRIPT_MATCH` |
| `Sex` | `MALE`, `FEMALE` |
| `ParentType` | `FATHER`, `MOTHER` |
| `UserRole` | `TEACHER`, `STUDENT`, `ADMIN` |

## Tables

| Table (PG) | Model | Domain | Description |
|------------|-------|--------|-------------|
| `users` | `User` | Auth | Tài khoản đăng nhập, link đến Student nếu role=STUDENT |
| `students` | `Student` | People | Hồ sơ học sinh |
| `parent_infos` | `ParentInfo` | People | Thông tin phụ huynh của học sinh |
| `classes` | `Class` | Class | Lớp học, chứa nhiều học sinh |
| `homeworks` | `Homework` | Homework | Bài tập (gốc), chứa nội dung |
| `homework_parts` | `HomeworkPart` | Homework | Phần của bài Phonics/Speaking |
| `homework_words` | `HomeworkWord` | Homework | Từ trong một part |
| `homework_assignments` | `HomeworkAssignment` | Assignment | Giao bài tập cho lớp, có deadline |
| `homework_assignment_classes` | `HomeworkAssignmentClass` | Assignment | Quan hệ assignment ↔ class (nhiều-nhiều) |
| `homework_sessions` | `Session` | Session | Phiên làm bài của học sinh |
| `speaking_results` | `SpeakingResult` | Result | Kết quả bài Speaking |
| `phonics_item_results` | `PhonicsItemResult` | Result | Kết quả từng từ bài Phonics/Vocabulary |
| `reading_results` | `ReadingResult` | Result | Kết quả bài Reading |
| `listen_item_results` | `ListenItemResult` | Result | Kết quả từng item bài Listen |
| `vocab_items` | `VocabItem` | Content | Từ vựng trong bài Vocabulary |
| `listen_items` | `ListenItem` | Content | Item audio trong bài Listen |
| `reading_activities` | `ReadingActivity` | Content | Activity (MATCH/FILL_BLANK) trong bài Reading |
| `match_pairs` | `MatchPair` | Content | Cặp ảnh-từ trong activity MATCH |
| `fill_blanks` | `FillBlank` | Content | Câu điền từ trong activity FILL_BLANK |
| `fill_blank_choices` | `FillBlankChoice` | Content | Các lựa chọn cho một FillBlank |
| `phonemes` | `Phoneme` | Phonics | Âm vị (IPA symbol) |
| `words` | `Word` | Phonics | Từ phát âm có liên kết âm vị |
| `word_phonemes` | `WordPhoneme` | Phonics | Quan hệ word ↔ phoneme (có thứ tự) |

## Domain Files

- [users-auth.md](users-auth.md) — `users`, `students`, `parent_infos`
- [classes.md](classes.md) — `classes`
- [homework.md](homework.md) — `homeworks`, `homework_parts`, `homework_words`, `homework_assignments`, `homework_assignment_classes`
- [sessions-results.md](sessions-results.md) — `homework_sessions`, `speaking_results`, `phonics_item_results`, `reading_results`, `listen_item_results`
- [content.md](content.md) — `vocab_items`, `listen_items`, `reading_activities`, `match_pairs`, `fill_blanks`, `fill_blank_choices`
- [phonics.md](phonics.md) — `phonemes`, `words`, `word_phonemes`

## Key Relationships

```
User ──(1:1)──► Student ──(N:1)──► Class
                Student ──(1:N)──► ParentInfo
                Student ──(1:N)──► HomeworkSession

Class ──(N:M via HomeworkAssignmentClass)──► HomeworkAssignment
HomeworkAssignment ──(N:1)──► Homework
HomeworkSession ──(N:1)──► HomeworkAssignment
HomeworkSession ──(N:1)──► Student

Homework ──(1:N)──► HomeworkPart ──(1:N)──► HomeworkWord
Homework ──(1:N)──► VocabItem
Homework ──(1:N)──► ListenItem
Homework ──(1:N)──► ReadingActivity ──(1:N)──► MatchPair | FillBlank

HomeworkSession ──(1:1)──► SpeakingResult
HomeworkSession ──(1:N)──► PhonicsItemResult  (link tới HomeworkWord hoặc VocabItem)
HomeworkSession ──(1:1)──► ReadingResult
HomeworkSession ──(1:N)──► ListenItemResult
```
