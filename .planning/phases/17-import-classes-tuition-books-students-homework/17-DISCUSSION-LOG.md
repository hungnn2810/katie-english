# Phase 17: Import — Classes + Students + Homework - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-22
**Phase:** 17-import-classes-tuition-books-students-homework
**Areas discussed:** Homework import scope, Import file format, Error & duplicate strategy

---

## Homework import scope

| Option | Description | Selected |
|--------|-------------|----------|
| Phonics only | Import phonics homework: name + parts + words. No images needed. | ✓ |
| All homework types | Import any type including SPEAKING/READING — needs separate image upload step | |
| No homework import | Only import classes + students | |

**User's choice:** Phonics only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Flat rows: homework_name, part_name, word_text, word_highlight | One row per word. Simple to fill out. | ✓ |
| Multi-sheet: 1 sheet per homework | Each sheet = one phonics homework | |

**User's choice:** Flat rows

---

| Option | Description | Selected |
|--------|-------------|----------|
| Just create homework (unassigned) | Import creates the homework. Teacher assigns later via normal flow. | ✓ |
| Create + assign in import | Import includes class_name and due_date columns | |

**User's choice:** Just create homework unassigned

---

## Import file format

| Option | Description | Selected |
|--------|-------------|----------|
| Excel (.xlsx), single file, multiple sheets | One file: sheets for Classes, Students, Homework. Needs xlsx library. | ✓ |
| CSV, separate files per entity | Three separate CSV uploads. No extra library. | |
| Excel but import each sheet separately | Single template, separate upload buttons per entity | |

**User's choice:** Excel single file, multiple sheets

---

| Option | Description | Selected |
|--------|-------------|----------|
| Downloadable template | Backend serves GET /import/template with pre-formatted .xlsx | ✓ |
| User creates own file | Teacher creates Excel from scratch following docs | |

**User's choice:** Downloadable template

---

## Error & duplicate strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Collect all errors, import nothing | Full validation pass, return all errors before importing | ✓ |
| Partial success | Import valid rows, skip invalid | |
| Fail-fast on first error | Stop at first error | |

**User's choice:** Collect all errors, import nothing

---

| Option | Description | Selected |
|--------|-------------|----------|
| Treat duplicate student as error | Flag in error report before import | ✓ |
| Skip silently | Skip duplicate rows | |
| Update existing record | Overwrite existing student data | |

**User's choice:** Treat as error

---

| Option | Description | Selected |
|--------|-------------|----------|
| Treat duplicate class name as error | Flag in error report | ✓ |
| Skip silently | Skip if class name exists | |

**User's choice:** Treat as error

---

## Claude's Discretion

- Excel parsing library (xlsx vs exceljs)
- Exact column order in the template
- Frontend UX details (drag-and-drop, progress state, error table)
- Transaction strategy (single Prisma transaction vs per-entity)
- New ImportModule vs adding to existing modules

## Deferred Ideas

- Bulk homework assignment (assign + class + due date in same file)
- SPEAKING/READING homework import (requires images)
- Update/merge mode for existing records
- Auto-generate TuitionRecords after class import
- CSV format support
