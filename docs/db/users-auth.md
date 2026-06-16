# Users & Auth

## `users` (model: `User`)

Tài khoản đăng nhập hệ thống. Role `STUDENT` thì có `studentId` link đến bảng `students`.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `upn` | `String` | UNIQUE | Username/UPN đăng nhập |
| `email` | `String?` | UNIQUE, nullable | Email |
| `name` | `String?` | nullable | Tên hiển thị |
| `phone` | `String?` | nullable | Số điện thoại |
| `disabled` | `Boolean` | default `false` | Tài khoản bị vô hiệu hóa |
| `password` | `String` | | Mật khẩu (hashed) |
| `role` | `UserRole` | | `TEACHER` / `STUDENT` / `ADMIN` |
| `approved` | `Boolean` | default `false` | Đã được admin duyệt chưa |
| `studentId` | `Int?` | UNIQUE, nullable, FK → `students.id` | Chỉ có khi role=STUDENT |
| `registrationData` | `Json?` | nullable | Dữ liệu đăng ký thô (form data) |
| `passwordResetRequested` | `Boolean` | default `false` | Học sinh/phụ huynh đã request reset pw |
| `createdAt` | `DateTime` | default `now()` | |

**Relations:** `student` (→ Student), `classes` (→ Class[], qua "TeacherClasses")

---

## `students` (model: `Student`)

Hồ sơ học sinh, độc lập với tài khoản (`User`). Một học sinh có thể chưa có tài khoản.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `fullname` | `String` | | Họ và tên |
| `sex` | `Sex` | | `MALE` / `FEMALE` |
| `dateOfBirth` | `DateTime` | | Ngày sinh |
| `classId` | `Int?` | nullable, FK → `classes.id` | Lớp hiện tại (nullable = chưa vào lớp) |
| `createdAt` | `DateTime` | default `now()` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Relations:** `class` (→ Class?), `parents` (→ ParentInfo[]), `sessions` (→ HomeworkSession[]), `user` (→ User?)

---

## `parent_infos` (model: `ParentInfo`)

Thông tin phụ huynh của học sinh. Một học sinh có thể có nhiều phụ huynh.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | `Int` | PK, autoincrement | |
| `name` | `String` | | Tên phụ huynh |
| `phoneNumber` | `String` | | Số điện thoại |
| `type` | `ParentType` | | `FATHER` / `MOTHER` |
| `studentId` | `Int` | FK → `students.id` (Cascade delete) | |

**Relations:** `student` (→ Student)
