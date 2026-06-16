# Classes

## `classes` (model: `Class`)

Lớp học. Một lớp có một giáo viên (`User` role=TEACHER) và nhiều học sinh (`Student`).

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `name` | `String` | | Tên lớp (vd: "Lớp 3A") |
| `code` | `String` | UNIQUE | Mã lớp ngắn để join (vd: "CLS001") |
| `startDate` | `DateTime` | | Ngày khai giảng |
| `endDate` | `DateTime` | | Ngày kết thúc |
| `status` | `ClassStatus` | default `PENDING` | `PENDING` / `INPROGRESS` / `ENDED` |
| `scheduleSlots` | `Json` | default `[]` | Lịch học (mảng JSON) |
| `teacherId` | `Int?` | nullable, FK → `users.id` | Giáo viên phụ trách |
| `createdAt` | `DateTime` | default `now()` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Relations:** `teacher` (→ User?), `students` (→ Student[]), `assignments` (→ HomeworkAssignmentClass[])

### `scheduleSlots` JSON structure

Mảng các slot lịch học, ví dụ:
```json
[
  { "dayOfWeek": 1, "startTime": "08:00", "endTime": "09:30" },
  { "dayOfWeek": 3, "startTime": "08:00", "endTime": "09:30" }
]
```
`dayOfWeek`: 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7.
