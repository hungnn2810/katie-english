---
plan: 04-01
phase: 04-student-ux-polish
status: complete
completed: 2026-05-14
commit: 7dc63f51201d0a369db82669cfd7b310fa4e5d94
---

## Summary

Two surgical edits to `frontend/app/game/homework/page.tsx` closing the final two v1 requirements (STUDENT-01, STUDENT-02). No other files changed.

## What Was Built

**Edit 1 — endDate-ascending sort (line 43):**
Replaced `.then(setAssignments)` with `.then((data) => setAssignments([...data].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())))`. Sort happens once at fetch time per D-03.

**Edit 2 — Overdue badge text branch (line 185):**
Added `daysLeft < 0 ? 'Overdue' :` prefix branch and tightened `daysLeft <= 0` to `daysLeft === 0` for "Due today". className expression (`daysLeft <= 1 ? 'bg-highlight text-white' : ...`) unchanged — negative values already satisfy `<= 1`.

## Decisions Honored

| Decision | Code Location | Verified |
|---|---|---|
| D-01: laptop/PC only, minWidth: 1024 | line 61 style prop | ✓ preserved |
| D-02: sort by endDate ascending | line 43 .then() | ✓ |
| D-03: sort at fetch time, not render | inside useEffect .then() | ✓ |
| D-04: Overdue badge for daysLeft < 0 | line 185 text expression | ✓ |
| D-05: completed cards mixed by date | no separate section | ✓ |

## Requirements Closed

- **STUDENT-01**: Homework list renders in ascending endDate order; overdue items show red "Overdue" badge.
- **STUDENT-02**: Device scope revised to laptop/PC only (D-01); minWidth: 1024 preserved, no responsive work introduced.

All 21 v1 requirements now implemented across phases 1–4.

## Diff Scope

- Files changed: 1 (`frontend/app/game/homework/page.tsx`)
- Commit: `7dc63f5` — feat(04-01)
- Pre-existing staged changes to the file were included in the diff count; the two functional edits are at the locations specified in 04-PATTERNS.md.

## Human Verification

User approved via checkpoint selection. All badge variants and sort order confirmed correct.

## Self-Check: PASSED
