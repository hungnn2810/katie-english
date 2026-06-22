# Phase 17: Import — Classes (Tuition + Books) + Students + Homework - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Bulk import feature allowing admin/teacher to upload a single Excel file to create:
1. **Classes** — with name, code, dates, schedule, and tuition config (pricePerSession, bookFee, dueDayOfMonth)
2. **Students** — with fullname, sex, dateOfBirth, class assignment, parent contact info
3. **Phonics Homework** — word lists organized into parts (flat-row format; no images)

Includes:
- Downloadable Excel template (pre-formatted with headers + example rows)
- Upload endpoint that validates entire file before importing anything
- Error report returned to UI (row-by-row validation errors)

**Not included:**
- SPEAKING / READING / VOCAB / LISTEN homework import (require images)
- Homework assignment to classes (teacher assigns manually after import)
- Update/overwrite of existing records
- CSV format (Excel only)
- Automatic homework assignment during import

</domain>

<decisions>
## Implementation Decisions

### D-01: Homework Import Scope — Phonics Only
Only PHONICS homework type is importable. SPEAKING/READING/VOCAB/LISTEN require image uploads which cannot be done from a spreadsheet. Phonics word lists (text + highlight) map cleanly to flat Excel rows.

### D-02: Homework — Flat Row Structure
Each row in the "Homework" sheet = one word:
```
homework_name | part_name | word_text | word_highlight
Phonics Bài 1 | Part 1    | cat       | c
Phonics Bài 1 | Part 1    | car       | c
Phonics Bài 1 | Part 2    | red       | r
```
Groups by `homework_name` to create `Homework` records; groups by `part_name` to create `HomeworkPart` records; each row = one `HomeworkWord`.

### D-03: Homework — Created Unassigned
Import only creates the homework. Assignment to classes (with due date) is done separately via the existing assignment flow. No class/due-date columns in the Homework sheet.

### D-04: File Format — Single Excel (.xlsx), Multiple Sheets
One `.xlsx` file with three sheets:
- Sheet `Classes` — class data + tuition config
- Sheet `Students` — student + parent data
- Sheet `Homework` — phonics word list (flat rows)

All three sheets are optional — teacher can fill any combination and leave others empty. The backend parses only non-empty sheets.

### D-05: Downloadable Template
Backend serves a `GET /import/template` endpoint returning a pre-formatted `.xlsx` file with:
- Correct sheet names and column headers
- One example row per sheet
- Column notes (e.g., sex = M/F, date format = YYYY-MM-DD)

Teacher downloads, fills in, uploads back.

### D-06: Error Strategy — Collect All, Import Nothing
Parse entire file first. Collect all validation errors across all sheets and rows. If any errors exist, return the full error list and do NOT import anything. Teacher fixes file and re-uploads. No partial state.

### D-07: Duplicate Handling — Treat as Error
- **Class**: duplicate if class with same `name` already exists → error
- **Student**: duplicate if student with same `fullname` + `classId` already exists → error
Both flagged in the error report before any import occurs.

### D-08: Access — Admin and Teacher Both
Both admin (via `/admin/import`) and teacher (via `/teacher/import`) can use the import feature. Same backend logic, separate frontend pages.

### Claude's Discretion
- Excel parsing library choice (xlsx vs exceljs — xlsx is lighter, exceljs has more formatting control)
- Exact column order in the template
- Frontend UX details: drag-and-drop vs click-to-upload, progress state, error table display
- Transaction strategy (single Prisma transaction wrapping all three entity creations)
- Whether to inject the backend logic into existing modules or create a new `ImportModule`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prisma Schema
- `backend/prisma/schema.prisma` — Class, Student, ParentInfo, Homework, HomeworkPart, HomeworkWord, TuitionConfig models
- `docs/db/classes.md` — Class model + scheduleSlots JSON structure
- `docs/db/users-auth.md` — Student, ParentInfo models
- `docs/db/homework.md` — Homework, HomeworkPart, HomeworkWord models

### Existing Backend Patterns
- `backend/src/admin/admin-classes.controller.ts` — Admin controller pattern (guards, DTOs)
- `backend/src/admin/admin-students.controller.ts` — Admin service/repository pattern
- `backend/src/student/student.service.ts` — Student creation pattern (for import service to mirror)
- `backend/src/class/class.service.ts` — Class creation pattern

### Frontend Patterns
- `frontend/app/admin/` — Admin portal pages (MUI, AdminShell, blue #6366F1 accent)
- `frontend/app/teacher/` — Teacher portal pages (MUI, TeacherShell, blue #3B82F6 accent)
- `frontend/lib/colors.ts` — Color system (teacherAccent, adminAccent)

### Tuition Config
- `backend/src/tuition/` — TuitionConfig module (see config creation pattern)
- `docs/db/README.md` — DB overview, TuitionStatus enum

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Multer (`@types/multer` already installed): use `FileInterceptor` for the file upload endpoint
- MUI `DataGrid` or `Table`: show error list in UI after failed import
- Existing admin/teacher page layouts (AdminShell, TeacherShell): add "Import" nav item

### Established Patterns
- NestJS modules: one `ImportModule` (or add to existing admin/teacher modules) with controller + service
- Prisma transactions: use `prisma.$transaction([...])` to wrap class + student + homework creation atomically
- Class code generation: existing `class.service.ts` generates unique class codes — import service must call the same or similar logic

### Integration Points
- Import uses the same Prisma service as existing modules
- Class import sets `teacherId` from the authenticated teacher's JWT
- Student import sets `classId` by looking up the class name from the imported classes (or from existing classes)

</code_context>

<specifics>
## Specific Ideas

### Classes sheet columns (example)
```
name | code | startDate | endDate | scheduleSlots | pricePerSession | bookFee | dueDayOfMonth
Lớp A | LA01 | 2026-01-01 | 2026-06-30 | Mon,Wed,Fri | 100000 | 50000 | 5
```
- `code`: optional — auto-generate if blank
- `scheduleSlots`: comma-separated day abbreviations parsed to JSON scheduleSlots array
- `bookFee`: optional — leave blank if no book fee
- Tuition columns optional — skip TuitionConfig creation if pricePerSession is blank

### Students sheet columns (example)
```
fullname | sex | dateOfBirth | className | parentName | parentPhone | parentType
Nguyễn Văn A | M | 2018-05-10 | Lớp A | Nguyễn Văn B | 0912345678 | FATHER
```
- `className`: matched to a class from the Classes sheet OR existing class in DB

### Homework sheet columns (example)
```
homework_name | part_name | word_text | word_highlight
Bài âm er | Part 1: er | her | er
Bài âm er | Part 1: er | bird | ir
```

</specifics>

<deferred>
## Deferred Ideas

- Bulk homework assignment (assign imported homework to class + due date in same file)
- Import SPEAKING/READING homework (requires image upload alongside Excel)
- Update/merge mode (overwrite existing records instead of erroring on duplicates)
- Auto-generate TuitionRecords for the current month after class import
- CSV format support

</deferred>

---

*Phase: 17-import-classes-tuition-books-students-homework*
*Context gathered: 2026-06-22*
