---
phase: "02"
plan: "02"
subsystem: frontend
tags: [frontend, api-types, routing, teacher-homework, student-homework, reading]
dependency_graph:
  requires: [02-01]
  provides: [admin-api READING types, saveReadingResult, student READING routing, teacher READING entry point]
  affects: [02-03, 02-04]
tech_stack:
  added: []
  patterns: [Record<HomeworkType,...> exhaustiveness, req<T> JSON helper, Next.js Link for toolbar CTA]
key_files:
  created: []
  modified:
    - frontend/lib/admin-api.ts
    - frontend/app/game/homework/page.tsx
    - frontend/app/teacher/homework/page.tsx
    - frontend/app/teacher/homework/[id]/page.tsx
decisions:
  - "saveReadingResult uses req<T> JSON helper (not raw fetch/FormData) — matches plain JSON POST pattern"
  - "openEdit guard returns early for READING items — editing deferred to Phase 3"
  - "TYPE_META in [id]/page.tsx also updated to fix Record<HomeworkType,...> exhaustiveness"
metrics:
  duration: "3m 39s"
  completed: "2026-05-17T14:15:51Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 02 Plan 02: Frontend Reading Type Contract Summary

**One-liner:** READING added to HomeworkType union with full type vocabulary, saveReadingResult function, student routing branch to /game/reading/, and teacher dashboard entry point (filter tab + New Reading button + card preview).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | admin-api.ts type additions and saveReadingResult | 82bbfab | frontend/lib/admin-api.ts |
| 2 | Student routing + Teacher dashboard READING entry | aafd0f3 | frontend/app/game/homework/page.tsx, frontend/app/teacher/homework/page.tsx, frontend/app/teacher/homework/[id]/page.tsx |

## Exported Types and Functions

### Types added to `frontend/lib/admin-api.ts`

- `HomeworkType` — extended from `'PHONICS' | 'SPEAKING'` to `'PHONICS' | 'SPEAKING' | 'READING'`
- `ReadingActivityType = 'MATCH' | 'FILL_BLANK'`
- `MatchPair` — `{ id, activityId, imageUrl, word, order }`
- `FillBlankChoice` — `{ id, blankId, word, isCorrect }`
- `FillBlank` — `{ id, activityId, sentence, order, choices: FillBlankChoice[] }`
- `ReadingActivity` — `{ id, homeworkId, type, order, matchPairs?, fillBlanks? }`
- `ReadingResult` — `{ id, sessionId, totalItems, correctItems, score }`
- `CreateMatchPairInput` — `{ imageUrl, word }`
- `CreateFillBlankChoiceInput` — `{ word, isCorrect }`
- `CreateFillBlankItemInput` — `{ sentence, choices }`
- `CreateReadingActivityInput` — `{ type, pairs?, items? }`
- `CreateHomeworkInput.readingActivities?` — `CreateReadingActivityInput[]`
- `HomeworkItem.readingActivities?` — `ReadingActivity[]`
- `GameSession.readingResult?` — `ReadingResult`

### Function added

```ts
export async function saveReadingResult(
  sessionId: number,
  data: { correctItems: number; totalItems: number },
): Promise<ReadingResult>
```

Calls `POST /game/session/:id/reading-result` via the existing `req<T>` JSON helper.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extended TYPE_META in teacher/homework/[id]/page.tsx**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Adding `'READING'` to `HomeworkType` made the `Record<HomeworkType, ...>` in the homework detail page (`/teacher/homework/[id]/page.tsx`) incomplete, causing a TS2741 compile error.
- **Fix:** Added `READING: { label: 'Reading', emoji: '📖', color: '#6ED6C1' }` to that file's `TYPE_META`.
- **Files modified:** `frontend/app/teacher/homework/[id]/page.tsx`
- **Commit:** aafd0f3

## Known Stubs

None — this plan adds type vocabulary and routing glue only; no data rendering stubs introduced. The `readingActivities ?? []` fallback correctly renders empty state ("No activities yet") until Plan 03 creates actual READING homework items.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. All changes are frontend-only type and routing additions consistent with the existing trust boundary patterns.

## Self-Check: PASSED

- [x] `frontend/lib/admin-api.ts` modified and committed (82bbfab)
- [x] `frontend/app/game/homework/page.tsx` modified and committed (aafd0f3)
- [x] `frontend/app/teacher/homework/page.tsx` modified and committed (aafd0f3)
- [x] `frontend/app/teacher/homework/[id]/page.tsx` modified and committed (aafd0f3)
- [x] All acceptance criteria verified via grep
- [x] No TYPE_META exhaustiveness errors remain
- [x] SUMMARY.md created at correct path
