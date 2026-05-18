---
phase: 03-teacher-dashboard
plan: "04"
subsystem: homework
tags: [reading, matching, prisma, api-client, frontend]
dependency_graph:
  requires: ["03-01", "03-03"]
  provides: ["reading-create-endpoint", "matching-editor-ui"]
  affects: ["03-05", "03-06", "03-07"]
tech_stack:
  added: []
  patterns:
    - "Prisma nested create via buildReadingActivitiesCreate helper (mirrors buildPartsCreate)"
    - "Delete-and-recreate update pattern for readingActivity rows (cascade handles child rows)"
    - "req<T> API client pattern with Content-Type header for JSON bodies"
    - "Per-pair image upload with individual spinner state (uploadPairImage)"
key_files:
  modified:
    - backend/src/homework/homework.repository.ts
    - backend/src/homework/homework.service.ts
    - frontend/lib/admin-api.ts
    - frontend/app/teacher/homework/create/reading/page.tsx
decisions:
  - "Used pairCount < 2 variable (not inline pairs.length) for D-06 enforcement — semantically equivalent"
  - "buildReadingActivitiesCreate uses segments for FILL_BLANK (DTO shape); maps to fillBlanks.sentence + choices"
  - "MatchingActivityEditor rewritten from bulk-file-upload to per-pair slot UX to match plan acceptance criteria"
  - "FILL_BLANK editor left intact (FillBlankActivityEditor from prior plan); Plan 05 owns the new endpoint wiring"
  - "CreateReadingHomeworkInput reuses existing CreateReadingActivityInput (which has pairs? + items?) — no duplicate interface"
  - "req<T> calls for reading endpoints include explicit Content-Type: application/json header"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-18"
  tasks_completed: 3
  files_modified: 4
---

# Phase 03 Plan 04: Reading Homework Create — Real Persistence Summary

Real Prisma persistence for reading homework (MATCH activities) end-to-end: backend repository stubs replaced, API client functions added, frontend wired to new endpoint.

## What Was Built

### Task 1 — Backend: Repository + Service (commit c087f7f)

**`buildReadingActivitiesCreate` helper** added to `homework.repository.ts`:
- For `MATCH` activities: nested `matchPairs.create` with `{ imageUrl, word, order: pIdx }`.
- For `FILL_BLANK` activities: reconstructs sentence string from segments (replaces blank segments with `___`), creates one `FillBlank` row with choices from blank segment `correctWord` + `distractors`.

**`createReadingHomework(dto)`** — real Prisma nested create:
```
prisma.homework.create({
  data: { type: 'READING', name: dto.name, readingActivities: buildReadingActivitiesCreate(dto.activities) },
  include: { ...readingActivitiesInclude, assignments: { include: assignmentInclude } },
})
```

**`findReadingById(id)`** — now includes `readingActivitiesInclude` (matchPairs + fillBlanks ordered) and assignments.

**`updateReadingHomework(id, dto)`** — delete-and-recreate pattern:
```
await prisma.readingActivity.deleteMany({ where: { homeworkId: id } });
// then prisma.homework.update with readingActivities: buildReadingActivitiesCreate(...)
```

**Service validation** (`validateReadingActivities`):
- Name required (non-empty trim).
- At least 1 activity, max 50 (T-03-13).
- MATCH: min 2 pairs (D-06), max 30 pairs (T-03-13).
- FILL_BLANK: min 1 segment, max 200 segments, at least one blank segment, blankIndex contiguity validated (D-12 / Pitfall 3).
- `BadRequestException` thrown for all violations.

### Task 2 — Frontend API Client (commit 8b36280)

Added to `frontend/lib/admin-api.ts`:

```typescript
// New interfaces
export interface CreateReadingPairInput { imageUrl: string; word: string; }
export interface CreateReadingHomeworkInput { name: string; activities: CreateReadingActivityInput[]; }
export interface UpdateReadingHomeworkInput { name?: string; activities?: CreateReadingActivityInput[]; }

// Three API client functions
export const createReadingHomework = (data) => req<ReadingHomeworkDetail>('/homework/reading', { method: 'POST', ... });
export const getReadingHomework = (id) => req<ReadingHomeworkDetail>(`/homework/reading/${id}`);
export const updateReadingHomework = (id, data) => req<ReadingHomeworkDetail>(`/homework/reading/${id}`, { method: 'PUT', ... });
```

`CreateReadingHomeworkInput` reuses the existing `CreateReadingActivityInput` (which already has `pairs?` + `items?`) — no duplicate interface created.

### Task 3 — Frontend Reading Creation Page (commit cc0774a)

**Import change**: `createHomework` replaced with `createReadingHomework`; `CreateHomeworkInput` replaced with `CreateReadingHomeworkInput`.

**`handleSave` updated**: now calls `POST /homework/reading` with `{ name: name.trim(), activities }` payload. Inline name-required guard added. Redirects to `/teacher/homework` per D-03 (no AssignModal auto-open).

**`MatchingActivityEditor` rewritten** to per-pair slot UX:
- `addPair()` — appends `{ imageUrl: '', word: '' }` slot (max 6).
- `removePair(idx)` — filters out pair at index.
- `updatePairWord(idx, word)` — updates word label.
- `uploadPairImage(idx, file)` — calls `uploadSpeakingImage`, updates `imageUrl` in that slot; shows spinner on uploading pair.
- Empty slot shows dashed-border image placeholder with file picker on click.
- `+ Add pair` button (max 6 enforced in UI with "Maximum 6 pairs reached" message).

**`FillBlankActivityEditor`** unchanged (Plan 05 owns new endpoint wiring for FILL_BLANK).

## CreateReadingHomeworkInput Shape

```typescript
{
  name: string;                    // required, non-empty (enforced client + server)
  activities: {
    type: 'MATCH' | 'FILL_BLANK';
    pairs?: { imageUrl: string; word: string; }[];   // MATCH: min 2, max 6 (UI) / 30 (server)
    items?: { sentence: string; choices: { word: string; isCorrect: boolean; }[] }[];  // FILL_BLANK (Plan 05)
  }[];
}
```

## Validation Rules (Server-Side)

| Rule | Condition | Error |
|------|-----------|-------|
| Name required | `dto.name.trim() === ''` | `'Name is required'` |
| Min activities | `dto.activities.length === 0` | `'At least one activity is required'` |
| Max activities | `dto.activities.length > 50` | `'Too many activities (max 50)'` |
| MATCH min pairs | `pairs.length < 2` | `'Matching activities require at least 2 pairs'` |
| MATCH max pairs | `pairs.length > 30` | `'Too many pairs (max 30)'` |
| FILL_BLANK min segment | `segments.length === 0` | `'Fill-in-blank activities require at least one segment'` |
| FILL_BLANK max segments | `segments.length > 200` | `'Too many segments (max 200)'` |
| FILL_BLANK has blank | no segment with `blank: true` | `'Fill-in-blank activities require at least one blank segment'` |
| blankIndex contiguous | indices not `[0,1,...,n-1]` | `'Fill-in-blank blankIndex values must be contiguous starting at 0'` |

## Deviations from Plan

### Auto-adapted: Schema model names differ from plan docs

**Found during:** Task 1 read phase
**Issue:** Plan docs reference `MATCHING`/`FILL_IN_BLANK` enum values and `matchingPairs`/`fillInBlank` relations. Actual schema uses `MATCH`/`FILL_BLANK` enum values and `matchPairs`/`fillBlanks` relations.
**Fix:** All implementation uses actual schema names from `backend/prisma/schema.prisma`.
**Impact:** None — existing Phase 2 code already used correct schema names.

### Auto-adapted: DTO uses `segments` (not `items`) for FILL_BLANK in new endpoint

**Found during:** Task 1 implementation
**Issue:** The new `CreateReadingActivityDto` uses `segments?: SentenceSegmentDto[]` for FILL_BLANK, but the legacy `CreateLegacyReadingActivityDto` uses `items?: CreateFillBlankItemDto[]`. The frontend page still uses `items` format (FillBlankActivityEditor from Plan 03). The new `/homework/reading` endpoint expects `segments`.
**Fix:** `buildReadingActivitiesCreate` maps `segments` to the DB's `FillBlank.sentence` + `FillBlankChoice[]` model. The existing `FillBlankActivityEditor` remains wired to `items` format; Plan 05 will reconcile these when implementing FILL_BLANK end-to-end.
**Impact:** FILL_BLANK activities saved via the new endpoint will need proper `segments` format. The existing `FillBlankActivityEditor` UI is not broken (it stores `items` in draft state but the save will pass that as-is — server will receive `items` not `segments`, resulting in empty fillBlanks. Acceptable for Plan 04 scope since FILL_BLANK is placeholder.)

### Auto-adapted: MatchingActivityEditor UX changed from bulk-upload to per-pair slots

**Found during:** Task 3 assessment
**Issue:** Existing page used bulk file upload (`handleFiles` accepting multiple files at once). Plan acceptance criteria require `addPair`, `updatePairWord`, `removePair`, `uploadPairImage` function names and `+ Add pair` button text.
**Fix:** Rewrote `MatchingActivityEditor` to per-pair slot model: `+ Add pair` adds an empty slot, each slot has its own image picker with spinner, word input, and × remove button.
**Impact:** Better UX alignment with plan spec. Word label no longer auto-populated from filename.

### Auto-adapted: `readingActivitiesInclude` already existed (not added)

**Found during:** Task 1 read
**Issue:** Plan said to define `readingActivitiesInclude` as a new constant. It already existed in the repository (lines 12-23) from Plan 01, with correct Prisma field names (`matchPairs`, `fillBlanks`).
**Fix:** No change needed — existing constant reused in new methods.

## Known Stubs

- **`FillBlankActivityEditor` → `createReadingHomework` path**: The frontend sends `items` format but the new endpoint expects `segments`. FILL_BLANK activities created via the new page will persist with empty `fillBlanks`. Plan 05 resolves this.
- **`updateReadingHomework`**: API client function exists but no UI uses it yet. Plan 06 (edit mode) wires it.
- **`getReadingHomework`**: API client function exists but no UI uses it yet. Plan 06 (edit mode) wires it.

## Threat Surface Scan

No new network endpoints beyond what Plan 01 registered (`POST /homework/reading`, `GET /homework/reading/:id`, `PUT /homework/reading/:id`). AuthGuard inherited from class decorator. No new threat surface introduced.

## Self-Check

- `buildReadingActivitiesCreate` in repository: 3 occurrences (function declaration + 2 usages in create/update) — PASS (plan said ≥2)
- `readingActivitiesInclude` in repository: 12 occurrences (declaration + findReadingById + createReadingHomework + updateReadingHomework + findAll + findById + update + createAssignment + findAssignmentById + updateAssignment + createReading = many) — PASS (plan said ≥3)
- `readingActivity.deleteMany` in repository: 1 — PASS
- `BadRequestException` in service: 15 — PASS (plan said ≥4)
- `pairCount < 2` in service: 2 — PASS (D-06 enforced)
- `export const createReadingHomework` in admin-api.ts: 1 — PASS
- `export const getReadingHomework` in admin-api.ts: 1 — PASS
- `export const updateReadingHomework` in admin-api.ts: 1 — PASS
- 4 interfaces (CreateReadingPairInput, CreateReadingActivityInput, CreateReadingHomeworkInput, UpdateReadingHomeworkInput): 4 — PASS
- `cd backend && npx tsc --noEmit`: exit 0 — PASS
- `cd frontend && npx tsc --noEmit`: exit 0 — PASS
- `uploadSpeakingImage` in reading page: 2 — PASS (≥1)
- `createReadingHomework` in reading page: 2 — PASS (≥1)
- `addPair|updatePairWord|removePair|uploadPairImage` in reading page: 8 — PASS (≥4)
- `+ Add pair` in reading page: 2 — PASS (≥1)
- `router.push('/teacher/homework')` in reading page: 1 — PASS

## Self-Check: PASSED
