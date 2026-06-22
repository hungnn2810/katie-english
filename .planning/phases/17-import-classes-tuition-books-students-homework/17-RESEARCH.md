# Phase 17: Import — Classes + Students + Homework - Research

**Researched:** 2026-06-22
**Domain:** NestJS file upload, xlsx parsing, Prisma bulk create, Next.js MUI file upload UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** Phonics homework only. SPEAKING/READING/VOCAB/LISTEN are out of scope.
- **D-02** Flat row structure: one Excel row = one HomeworkWord. Group by `homework_name` → Homework, `part_name` → HomeworkPart, row → HomeworkWord.
- **D-03** Homework created unassigned. No class/due-date columns in Homework sheet.
- **D-04** Single `.xlsx` file with three optional sheets: `Classes`, `Students`, `Homework`.
- **D-05** Backend serves `GET /import/template` returning a pre-formatted `.xlsx` template.
- **D-06** Collect-all-errors strategy: parse entire file, collect all validation errors, if any errors exist return full list and import nothing.
- **D-07** Duplicate = error. Class duplicate on `name`; Student duplicate on `fullname + classId`.
- **D-08** Both Admin (`/admin/import`) and Teacher (`/teacher/import`) can use the feature. Same backend logic.

### Claude's Discretion

- Excel parsing library choice (xlsx vs exceljs — xlsx is lighter, exceljs has more formatting control)
- Exact column order in the template
- Frontend UX details: drag-and-drop vs click-to-upload, progress state, error table display
- Transaction strategy (single Prisma transaction wrapping all three entity creations)
- Whether to inject the backend logic into existing modules or create a new `ImportModule`

### Deferred Ideas (OUT OF SCOPE)

- Bulk homework assignment (assign imported homework to class + due date in same file)
- Import SPEAKING/READING homework (requires image upload alongside Excel)
- Update/merge mode (overwrite existing records instead of erroring on duplicates)
- Auto-generate TuitionRecords for the current month after class import
- CSV format support
</user_constraints>

---

## Summary

Phase 17 adds a bulk import feature to the Katie English admin/teacher portals. The implementation has three distinct slices: (1) a NestJS `ImportModule` with two endpoints — `POST /import/upload` and `GET /import/template` — protected by `TeacherOrAdminGuard`; (2) Excel parsing with `xlsx` (SheetJS) to read three named sheets, validate all rows before writing any data, and return row-level error objects; (3) a simple upload page in both `/admin/import` and `/teacher/import` using MUI components with click-to-upload, a visible error table on failure, and a download-template button.

The codebase already has all needed scaffolding: `@types/multer` is installed, `FileInterceptor` is used in `homework.controller.ts`, `PrismaService` is injectable, and `TeacherOrAdminGuard` exists. The only new package required is `xlsx` (SheetJS) for parsing and template generation.

Key architectural observation: the import service does NOT call the existing `ClassService` / `StudentService` / `HomeworkService` — it bypasses them and writes directly via `PrismaService` inside a single `$transaction`. This avoids re-implementing the individual service validation (which requires field-by-field DTOs) and gives the import service full control over the "collect-all, import-nothing-on-error" strategy. Duplicate checking happens before the transaction.

**Primary recommendation:** Create a standalone `ImportModule` (controller + service) registered in `AppModule`. Use `xlsx` for both parsing and template generation. Use `prisma.$transaction` with interactive transactions (callback form) to atomically insert all entities. Serve template via `GET /import/template` streaming the buffer as `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Excel file upload | API / Backend | Browser / Client | File processing is server-side; browser only selects and POSTs the file |
| Excel parsing and validation | API / Backend | — | Server owns data integrity; client never parses the file |
| Duplicate detection | API / Backend | — | Requires DB lookup; cannot be done client-side reliably |
| Prisma bulk insert (transaction) | API / Backend | — | Direct DB write |
| Template generation and download | API / Backend | Browser / Client | Server generates .xlsx bytes; browser triggers download via URL |
| Error report display | Browser / Client | — | Rendering row-by-row errors is a UI concern |
| File picker UI | Browser / Client | — | MUI input / drag-drop |
| Auth guard | API / Backend | — | `TeacherOrAdminGuard` applied to both endpoints |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xlsx` (SheetJS) | 0.18.5 | Parse `.xlsx` upload; generate template buffer | De facto Node.js Excel library; used since 2013; Apache-2.0; no native deps; works in memory buffers — ideal for NestJS [VERIFIED: npm registry] |
| `@nestjs/platform-express` | 10.x (already installed) | `FileInterceptor`, `multer` integration | Already in project; provides `UploadedFile` decorator [VERIFIED: codebase] |
| `@types/multer` | 2.1.0 (already installed) | TypeScript types for `Express.Multer.File` | Already installed in backend [VERIFIED: codebase] |
| `PrismaService` | 5.22.0 (already installed) | Bulk create inside `$transaction` | Already injectable across all modules [VERIFIED: codebase] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `class-validator` | 0.15.1 (already installed) | DTO validation for import endpoints | Already used project-wide [VERIFIED: codebase] |
| `TeacherOrAdminGuard` | n/a (already in codebase) | Auth guard shared by teacher + admin | Identical guard used in TuitionController — same pattern applies [VERIFIED: codebase] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `xlsx` | `exceljs` | exceljs 4.4.0 has richer styling API for templates, but is larger and async-heavy; xlsx is simpler for read/write buffer ops which is all we need |

**Installation (backend only):**
```bash
cd backend && npm install xlsx
```
No frontend install required — template download is a plain URL, file upload uses native `fetch` + `FormData`.

---

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `xlsx` | npm | ~11 years (2013-12-06) | github.com/SheetJS/sheetjs | OK (slopcheck blocked by sandbox — assessed manually) | Approved — SheetJS is the canonical xlsx library for Node.js, published by `sheetjs` npm user, Apache-2.0, last published 2024-10-22 |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck execution was blocked by the auto-mode sandbox. Manual verification: SheetJS (`xlsx`) is the canonical Node.js spreadsheet library, over 11 years old, sourced from github.com/SheetJS/sheetjs, Apache-2.0 license. Confirmed via npm registry metadata and official homepage sheetjs.com. Treat as [OK].*

---

## Architecture Patterns

### System Architecture Diagram

```
Teacher/Admin Browser
        |
        |  POST /import/upload  (multipart/form-data, field: "file")
        |  GET  /import/template
        v
 ImportController  ←── TeacherOrAdminGuard
        |
        v
 ImportService
   ├── parseClassesSheet()  ─────────────► xlsx.utils.sheet_to_json()
   ├── parseStudentsSheet()  ────────────► xlsx.utils.sheet_to_json()
   ├── parseHomeworkSheet()  ────────────► xlsx.utils.sheet_to_json()
   ├── validateAll()  ───────────────────► collect ImportError[]
   │      ├── required-field checks
   │      ├── enum checks (Sex, ParentType)
   │      ├── date format checks
   │      └── duplicate checks  ─────────► PrismaService.class.findMany / student.findMany
   └── importAll()  (only if errors=[])
          └── prisma.$transaction(async tx => {
                  create Class records  ── tx.class.create()
                  create TuitionConfig  ── tx.tuitionConfig.create()   (if pricePerSession present)
                  create Student records ─ tx.student.create() + tx.parentInfo.createMany()
                  create Homework records ─ tx.homework.create() + parts + words (nested create)
              })
        |
        |  GET /import/template  ──────► xlsx workbook buffer  ──► StreamableFile / Buffer response
        v
   ImportResult { imported: { classes, students, homework } }
     OR
   ImportErrorResult { errors: ImportError[] }
```

### Recommended Project Structure

```
backend/src/import/
├── import.module.ts         — declares controller + service, imports PrismaModule + AuthModule
├── import.controller.ts     — POST /import/upload, GET /import/template
├── import.service.ts        — parse, validate, import logic
├── import.dto.ts            — ImportError type, ImportResult type
└── import.service.spec.ts   — unit tests for parse + validate logic
```

Frontend:
```
frontend/app/admin/import/
└── page.tsx                 — Admin import page
frontend/app/teacher/import/
└── page.tsx                 — Teacher import page
frontend/lib/
└── import-api.ts            — uploadImportFile(), downloadTemplate() helpers
```

### Pattern 1: NestJS File Upload with FileInterceptor

Already proven in `homework.controller.ts`. Reuse the same pattern:

```typescript
// Source: backend/src/homework/homework.controller.ts (verified in codebase)
@Post('upload')
@UseGuards(TeacherOrAdminGuard)
@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
async upload(@UploadedFile() file?: Express.Multer.File, @Req() req: Request) {
  if (!file) throw new BadRequestException('No file uploaded');
  if (!file.originalname.endsWith('.xlsx')) throw new BadRequestException('Only .xlsx files accepted');
  return this.importService.processUpload(file.buffer, (req as any).user);
}
```

### Pattern 2: xlsx Parse from Buffer

```typescript
// Source: SheetJS official docs — sheetjs.com/docs/api/parse-options
import * as XLSX from 'xlsx';

const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
const sheet = workbook.Sheets['Classes'];
if (!sheet) return []; // sheet is optional per D-04
const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
```

Key option: `cellDates: true` tells xlsx to parse date cells into JS Date objects rather than Excel serial numbers. This avoids the date-parsing pitfall (see Pitfall 1).

### Pattern 3: xlsx Template Generation (Buffer)

```typescript
// Source: SheetJS official docs — sheetjs.com/docs/api/utilities
import * as XLSX from 'xlsx';

const wb = XLSX.utils.book_new();
const classesData = [
  { name: 'Lớp A', code: 'LA01', startDate: '2026-01-01', endDate: '2026-06-30',
    scheduleSlots: 'Mon,Wed,Fri', pricePerSession: 100000, bookFee: 50000, dueDayOfMonth: 5 },
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classesData), 'Classes');
// ... repeat for Students, Homework sheets
const buffer: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
```

Serving the template:
```typescript
// Source: NestJS docs — res.setHeader pattern [ASSUMED - verify NestJS StreamableFile API]
@Get('template')
@UseGuards(TeacherOrAdminGuard)
async getTemplate(@Res() res: Response) {
  const buffer = this.importService.generateTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="import-template.xlsx"');
  res.end(buffer);
}
```

Alternative: Return `{ buffer: base64 }` JSON and let frontend decode. The `res.end(buffer)` approach is simpler and works with `window.location.href` or `<a href>` download.

### Pattern 4: Prisma Interactive Transaction for Multi-Entity Import

```typescript
// Source: existing codebase — student.service.ts uses prisma.$transaction(async tx => {...})
await this.prisma.$transaction(async (tx) => {
  // 1. Create classes
  const classMap = new Map<string, number>(); // className -> classId
  for (const row of classRows) {
    const cls = await tx.class.create({ data: { ... } });
    if (row.pricePerSession) {
      await tx.tuitionConfig.create({ data: { classId: cls.id, ... } });
    }
    classMap.set(row.name, cls.id);
  }
  // 2. Create students (resolve classId from classMap or DB lookup)
  for (const row of studentRows) {
    const classId = classMap.get(row.className) ?? await resolveExistingClass(tx, row.className);
    const student = await tx.student.create({ data: { fullname: row.fullname, ..., classId } });
    if (row.parentName) {
      await tx.parentInfo.create({ data: { studentId: student.id, name: row.parentName, ... } });
    }
  }
  // 3. Create homework (group by homework_name → part_name → words)
  for (const [hwName, parts] of homeworkGroups) {
    const hw = await tx.homework.create({ data: { type: 'PHONICS', name: hwName } });
    let partOrder = 1;
    for (const [partName, words] of parts) {
      const part = await tx.homeworkPart.create({ data: { homeworkId: hw.id, name: partName, order: partOrder++ } });
      let wordOrder = 1;
      for (const word of words) {
        await tx.homeworkWord.create({ data: { partId: part.id, text: word.text, highlight: word.highlight || null, order: wordOrder++ } });
      }
    }
  }
});
```

### Pattern 5: scheduleSlots Mapping

The `classes.md` doc shows `scheduleSlots` stores objects with `dayOfWeek` (int 0-6), `startTime`, `endTime`. The CONTEXT.md example uses comma-separated day abbreviations (`Mon,Wed,Fri`). The import service must map between them:

```typescript
// [ASSUMED] — mapping table for day abbreviations
const DAY_MAP: Record<string, number> = {
  'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6,
};
// Parse "Mon,Wed,Fri" → [{ dayOfWeek: 1 }, { dayOfWeek: 3 }, { dayOfWeek: 5 }]
// startTime/endTime are not in the Excel row → default to empty strings or omit
```

**Important:** The existing `ScheduleSlot` DTO in `class.dto.ts` uses `{ day: string, time: string, duration?: number }` but the DB JSON stores `{ dayOfWeek: number, startTime: string, endTime: string }` (per `docs/db/classes.md` and `session-counter.util.ts`). The import service should write the DB format directly (bypass the DTO layer).

### Pattern 6: Frontend FormData Upload (no Content-Type header override)

```typescript
// Source: existing admin-api.ts — savePhonicsResult pattern
async function uploadImportFile(file: File, role: 'admin' | 'teacher'): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const token = role === 'admin'
    ? localStorage.getItem('admin_token')
    : localStorage.getItem('token');
  const res = await fetch(`${API_URL}/import/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },  // NO Content-Type — let browser set multipart boundary
    body: formData,
  });
  if (!res.ok) return parseApiError(res);
  return res.json();
}
```

### Anti-Patterns to Avoid

- **Setting `Content-Type: application/json` on FormData requests:** The browser must set the multipart boundary automatically. Overriding Content-Type breaks the upload (seen in `admin-api.ts` which already handles this correctly).
- **Using `sheet_to_json` without `defval: ''`:** Missing cells return `undefined` by default, causing `row.name === undefined` checks to fail silently. Always set `defval: ''` to normalize missing cells to empty string.
- **Parsing date cells as strings then calling `new Date()`:** Without `cellDates: true`, xlsx returns Excel serial numbers (e.g., 46000) for date columns. Always pass `{ cellDates: true }` to `XLSX.read()`.
- **Calling existing ClassService/StudentService from import:** Those services use DTOs + throw on first error. The import service needs "collect all errors" behavior. Write directly via `PrismaService`.
- **Partial imports on transaction failure:** Use the interactive transaction form (callback), not the `prisma.$transaction([...])` array form. The callback form allows async operations and resolves within the same DB transaction.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel file parsing | Custom binary parser | `xlsx` SheetJS | xlsx handles OOXML spec complexity, compressed archives, cell types, date serial numbers |
| Excel template generation | Manual string building | `xlsx` `json_to_sheet` + `book_append_sheet` | Header alignment, column widths, correct MIME type metadata |
| Atomic multi-entity write | Manual rollback | `prisma.$transaction(async tx => ...)` | Prisma handles all savepoints and rollback on throw |
| Date validation from strings | Custom regex | `new Date(str); isNaN(date.getTime())` | Handles ISO 8601 and localized formats; simple and reliable |

**Key insight:** The biggest complexity in this phase is NOT the parsing — it's the collect-all-errors validation. Every check must complete before any write. Building this as pure data transformation (parse → validate → collect → conditionally write) makes it testable without DB.

---

## Common Pitfalls

### Pitfall 1: Excel Date Serial Numbers
**What goes wrong:** xlsx by default returns date cells as Excel serial numbers (e.g., `46000`) instead of JS Date objects. `new Date(46000)` is 1970-01-01 not 2026-01-01.
**Why it happens:** Excel stores dates as floating-point numbers counting days since 1900-01-01. xlsx does NOT auto-convert unless told to.
**How to avoid:** Always pass `{ cellDates: true }` to `XLSX.read()`. Then convert: `new Date(row.dateOfBirth as any)`.
**Warning signs:** `dateOfBirth` showing as a 5-digit integer in parsed row data.

### Pitfall 2: Student classId Resolution Order
**What goes wrong:** A student row references a class that exists in the same file's Classes sheet. If duplicate detection queries the DB before the transaction, the new classes don't exist yet.
**Why it happens:** Classes are not yet in the DB at validation time.
**How to avoid:** Build an in-memory `importedClassNames` Set during Classes sheet parsing. During student validation, check `importedClassNames.has(row.className) || (await existingClassNames.has(row.className))`. During import, resolve classId from the already-inserted classes (via the `classMap` built in step 1 of the transaction).

### Pitfall 3: Missing Sheet Does Not Mean Empty Array
**What goes wrong:** `workbook.Sheets['Classes']` returns `undefined` if the sheet doesn't exist (user left it out). Passing `undefined` to `sheet_to_json()` throws.
**Why it happens:** xlsx returns undefined for missing sheet names, not an empty sheet.
**How to avoid:** Always guard: `if (!sheet) return [];` before calling `sheet_to_json`.

### Pitfall 4: Homework Part Order Must Be Unique
**What goes wrong:** `HomeworkPart` has `@@unique([homeworkId, order])`. If two parts within the same homework have the same auto-assigned order, the insert throws a Prisma unique constraint violation.
**Why it happens:** The import service must assign stable, sequential `order` values when grouping by `part_name`. Using a counter per homework group is required.
**How to avoid:** Maintain `partOrder` and `wordOrder` counters inside the grouping loops. Test with two words in the same part.

### Pitfall 5: scheduleSlots Format Mismatch
**What goes wrong:** The existing `class.dto.ts` `ScheduleSlot` type uses `{ day: string, time: string, duration?: number }` but the DB stores `{ dayOfWeek: number, startTime: string, endTime: string }` (confirmed in `docs/db/classes.md` and `session-counter.util.ts`). Importing using the DTO format would produce invalid JSON that breaks `countSessionsInMonth`.
**Why it happens:** The teacher UI populates scheduleSlots in the DTO format and the repository stores it as-is — there may be inconsistency between existing data and the utility's expectation. The import service should write the correct DB format.
**How to avoid:** In the import service, convert day abbreviations directly to `{ dayOfWeek: number, startTime: '', endTime: '' }` objects and write them to the DB, bypassing the DTO layer entirely.

### Pitfall 6: Multer Memory Storage Limit
**What goes wrong:** Large Excel files fail silently or with ECONNRESET if the multer file size limit is not set or is too low.
**Why it happens:** Default multer has a 1MB limit in some configurations.
**How to avoid:** Set `limits: { fileSize: 10 * 1024 * 1024 }` (10 MB) in `FileInterceptor` options — same as the audio upload in `homework.controller.ts`.

### Pitfall 7: AdminShell / TeacherShell Nav and TITLES Map
**What goes wrong:** Navigation highlight doesn't activate, or the page title shows "Admin Portal" / "Teacher Portal" fallback instead of "Import".
**Why it happens:** `AdminShell.tsx` and `TeacherShell.tsx` both have hardcoded nav arrays and TITLES maps. Adding a new page requires editing both the nav item list AND the TITLES/layout map.
**How to avoid:** Add the import nav item to `NAV_GROUPS` in both `AdminShell.tsx` and `TeacherShell.tsx`. Add entries to the TITLES maps in `admin/layout.tsx` and `teacher/layout.tsx`.

---

## Code Examples

### Grouping flat homework rows into the nested structure

```typescript
// Group flat rows: { homework_name, part_name, word_text, word_highlight } → nested Map
type HomeworkRow = { homework_name: string; part_name: string; word_text: string; word_highlight?: string };

function groupHomeworkRows(rows: HomeworkRow[]): Map<string, Map<string, HomeworkRow[]>> {
  const result = new Map<string, Map<string, HomeworkRow[]>>();
  for (const row of rows) {
    if (!result.has(row.homework_name)) result.set(row.homework_name, new Map());
    const parts = result.get(row.homework_name)!;
    if (!parts.has(row.part_name)) parts.set(row.part_name, []);
    parts.get(row.part_name)!.push(row);
  }
  return result;
}
```

### Structured error object

```typescript
// import.dto.ts
export interface ImportError {
  sheet: 'Classes' | 'Students' | 'Homework';
  row: number;           // 1-based row number (row 1 = first data row after header)
  column: string;        // column name as it appears in the sheet header
  message: string;       // human-readable error message
}

export interface ImportResult {
  imported: {
    classes: number;
    students: number;
    homework: number;   // count of Homework records (not words)
  };
}

export interface ImportErrorResult {
  errors: ImportError[];
}
```

### Frontend file upload with download template button

```typescript
// Pattern — frontend/lib/import-api.ts
export async function downloadTemplate(authHeaders: HeadersInit): Promise<void> {
  const res = await fetch(`${API_URL}/import/template`, { headers: authHeaders });
  if (!res.ok) throw new Error('Failed to download template');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'import-template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual CSV parsing with `split(',')` | `xlsx` SheetJS with `sheet_to_json` | Handles quoted commas, multi-byte chars, date cells correctly |
| One-at-a-time service calls | Single Prisma `$transaction` for all entities | Atomic — either everything succeeds or nothing is written |

---

## Existing Codebase Integration Points

| Integration | Detail |
|-------------|--------|
| Auth guards | `TeacherOrAdminGuard` already in `auth/auth.guard.ts` — import both teacher and admin endpoints |
| PrismaModule | Already exported — import into `ImportModule` via `imports: [PrismaModule, AuthModule]` |
| AppModule | Add `ImportModule` to `imports` array in `app.module.ts` |
| AdminShell nav | Add `{ href: '/admin/import', label: 'Import', icon: Upload }` to `NAV_GROUPS` in `AdminShell.tsx` |
| TeacherShell nav | Add `{ href: '/teacher/import', label: 'Import', icon: Upload }` to `NAV_GROUPS` in `TeacherShell.tsx` |
| Admin layout TITLES | Add `'/admin/import': { title: 'Import', subtitle: 'Bulk import classes, students, and homework' }` |
| Teacher layout TITLES | Add `'/teacher/import': 'Import'` |
| Frontend auth | Admin pages use `adminAuthHeaders()` from `lib/admin-auth.ts`; Teacher pages use `authHeaders()` from `lib/auth.ts` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | scheduleSlots in the Excel template uses comma-separated day abbreviations (Mon,Wed,Fri) mapped to `{ dayOfWeek, startTime: '', endTime: '' }` without time info | Architecture Patterns — Pattern 5 | If teachers expect time slots in the template, the session counter will return 0 for their imported classes; low impact since tuition generation is separate |
| A2 | `GET /import/template` uses `res.end(buffer)` with `@Res()` decorator to stream the xlsx binary | Architecture Patterns — Pattern 3 | NestJS StreamableFile could also be used; either works but one must be chosen consistently |
| A3 | No `upn`/`password` columns are required for students in the import (unlike manual student creation which requires them) | Standard Stack — Integration | If a Student user account is needed at import time, the create logic is more complex; per CONTEXT.md "Students" sheet only has profile fields, no auth fields |

---

## Open Questions (RESOLVED)

1. **Student accounts at import time**
   - What we know: Existing `student.service.ts` creates both a `Student` record AND a `User` record (with `upn` + hashed password) in the same transaction.
   - What's unclear: Should imported students get auto-generated `User` accounts? The CONTEXT.md student sheet columns do not include `upn` or `password` columns.
   - Recommendation: Import creates `Student` + `ParentInfo` only, no `User` account. This matches the existing "Student can register themselves" flow or admin-approval flow. If accounts are needed, a separate "generate accounts" step would be added post-import.
   - RESOLVED: ImportService creates `Student` + `ParentInfo` only — no `User` account created at import time.

2. **Class code auto-generation when blank**
   - What we know: `Class.code` is `@unique` in the schema. The CONTEXT.md says `code` is optional and auto-generated if blank.
   - What's unclear: The existing `ClassRepository.create()` does not auto-generate codes — the caller must provide them.
   - Recommendation: ImportService generates a code when the cell is blank: e.g., `CLS${Date.now().toString(36).toUpperCase()}` or sequential `CLS001`, `CLS002`.
   - RESOLVED: ImportService generates code as `CLS${Date.now().toString(36).toUpperCase()}` when the `code` cell is blank.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `xlsx` processing | Yes (assumed) | n/a | — |
| `xlsx` npm package | Excel parsing | Not yet installed | 0.18.5 | No fallback — must install |
| `@types/multer` | File upload types | Yes | 2.1.0 | Already installed |
| PostgreSQL | Prisma writes | Yes (assumed, existing) | n/a | — |

**Missing dependencies with no fallback:**
- `xlsx` — must be installed: `cd backend && npm install xlsx`

**Missing dependencies with fallback:** none.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.x + ts-jest |
| Config file | `backend/package.json` `jest` key |
| Quick run command | `cd backend && npx jest --testPathPattern import --no-coverage` |
| Full suite command | `cd backend && npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMPORT-01 | `processUpload` returns errors when required class fields missing | unit | `npx jest import.service --no-coverage` | Wave 0 |
| IMPORT-02 | `processUpload` returns error on duplicate class name | unit | `npx jest import.service --no-coverage` | Wave 0 |
| IMPORT-03 | `processUpload` returns error on duplicate student (fullname+className) | unit | `npx jest import.service --no-coverage` | Wave 0 |
| IMPORT-04 | `processUpload` imports nothing if any error exists (D-06) | unit | `npx jest import.service --no-coverage` | Wave 0 |
| IMPORT-05 | Flat homework rows grouped correctly into Homework → Part → Word hierarchy | unit | `npx jest import.service --no-coverage` | Wave 0 |
| IMPORT-06 | `GET /import/template` returns valid .xlsx buffer | unit | `npx jest import.controller --no-coverage` | Wave 0 |
| IMPORT-07 | `POST /import/upload` rejects non-.xlsx files | unit | `npx jest import.controller --no-coverage` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && npx jest --testPathPattern import --no-coverage`
- **Per wave merge:** `cd backend && npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/import/import.service.spec.ts` — covers IMPORT-01 through IMPORT-05
- [ ] `backend/src/import/import.controller.spec.ts` — covers IMPORT-06, IMPORT-07

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `TeacherOrAdminGuard` on both endpoints |
| V4 Access Control | yes | `TeacherOrAdminGuard` — neither endpoint is public |
| V5 Input Validation | yes | All Excel cell values validated (required fields, enum values, date format, string length) before any DB write |
| V6 Cryptography | no | No crypto needed; no passwords created at import time |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed .xlsx file (zip bomb / XXE) | Tampering | xlsx SheetJS parses without executing macros; set `fileSize: 10MB` limit in `FileInterceptor` |
| Unauthenticated bulk DB write | Elevation of privilege | `TeacherOrAdminGuard` on all import endpoints |
| Path traversal via filename | Tampering | File is processed in-memory (buffer) — no disk write, filename is never used for fs operations |
| Mass assignment via import (e.g., setting classId to arbitrary value) | Tampering | Import service whitelists specific columns; unrecognized columns are ignored |

---

## Sources

### Primary (HIGH confidence)

- `backend/src/homework/homework.controller.ts` — verified `FileInterceptor` + `@UploadedFile()` pattern in this project
- `backend/src/student/student.service.ts` — verified `prisma.$transaction(async tx => ...)` interactive transaction pattern
- `backend/prisma/schema.prisma` — exact field names, types, constraints for Class, Student, ParentInfo, Homework, HomeworkPart, HomeworkWord, TuitionConfig
- `docs/db/classes.md` — scheduleSlots JSON structure (`{ dayOfWeek, startTime, endTime }`)
- `backend/src/tuition/session-counter.util.ts` — confirmed scheduleSlots runtime format
- `backend/src/auth/auth.guard.ts` — `TeacherOrAdminGuard` confirmed
- `backend/package.json` — confirmed `@types/multer` installed, `xlsx` is NOT installed
- npm registry (`npm view xlsx`) — confirmed version 0.18.5, Apache-2.0, SheetJS/sheetjs repo, last published 2024-10-22

### Secondary (MEDIUM confidence)

- SheetJS homepage (sheetjs.com) — confirmed xlsx API: `XLSX.read(buffer, { type: 'buffer', cellDates: true })`, `sheet_to_json`, `json_to_sheet`, `book_append_sheet`, `XLSX.write`

### Tertiary (LOW confidence)

- NestJS `StreamableFile` vs `@Res() res.end(buffer)` — both patterns work; StreamableFile is the "NestJS way" but `res.end()` is simpler and proven for binary responses [ASSUMED]

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified in the codebase or npm registry
- Architecture: HIGH — mirrors existing patterns in student.service.ts and homework.controller.ts exactly
- Pitfalls: HIGH — date serial pitfall and duplicate classId resolution are well-known xlsx issues; scheduleSlots format mismatch confirmed by reading both schema and utility
- Validation: HIGH — test framework and patterns confirmed from existing spec files

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (stable stack)
