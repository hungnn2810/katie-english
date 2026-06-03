---
phase: 09-listen-answer
plan: "04"
subsystem: frontend
tags: [listen-homework, admin-api, teacher-ui, creation-page, type-picker]
dependency_graph:
  requires: ["09-03"]
  provides: [ListenCreationPage, createListenHomework, uploadAudio, ListenItem]
  affects: [frontend/lib/admin-api.ts, frontend/app/teacher/homework/page.tsx, frontend/app/teacher/homework/_components/ListenCreationPage.tsx]
tech_stack:
  added: []
  patterns: [dnd-kit sortable, MUI audio upload zone, Next.js page route, TypeScript discriminated union]
key_files:
  created:
    - frontend/app/teacher/homework/_components/ListenCreationPage.tsx
    - frontend/app/teacher/homework/create/listen/page.tsx
  modified:
    - frontend/lib/admin-api.ts
    - frontend/app/teacher/homework/page.tsx
    - frontend/app/teacher/homework/[id]/page.tsx
    - frontend/app/game/homework/page.tsx
decisions:
  - Used per-item uploadErrors map (Record<string,string>) instead of single uploadError string to allow concurrent error display per card
  - Added Rule 1 fixes to teacher/homework/[id]/page.tsx and game/homework/page.tsx — both had TYPE_META missing LISTEN after HomeworkType was extended
metrics:
  duration: "~25 minutes"
  completed: "2026-06-03"
  tasks_completed: 3
  files_modified: 6
---

# Phase 09 Plan 04: LISTEN Homework Creation Page Summary

Teacher-facing LISTEN homework creation: admin-api.ts extended with ListenItem types and CRUD functions; ListenCreationPage built as structural mirror of VocabCreationPage with audio upload zones; LISTEN wired into the homework type picker, filter bar, and card display.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Extend admin-api.ts with LISTEN types and helpers | 3e39449 | frontend/lib/admin-api.ts |
| 2 | Create ListenCreationPage component and page route | 20121f8 | ListenCreationPage.tsx, create/listen/page.tsx |
| 3 | Wire LISTEN into homework list page type picker | 70687b8 | homework/page.tsx, [id]/page.tsx, game/homework/page.tsx |

## What Was Built

### Task 1: admin-api.ts extensions
- Extended `HomeworkType` union: `'PHONICS' | 'SPEAKING' | 'READING' | 'VOCABULARY' | 'LISTEN'`
- Added `ListenItem`, `CreateListenItemInput`, `CreateListenHomeworkInput`, `UpdateListenHomeworkInput`, `ListenHomeworkDetail` interfaces
- Added `createListenHomework`, `getListenHomework`, `updateListenHomework` functions (POST/GET/PUT `/homework/listen`)
- Added `uploadAudio` function (POST `/homework/audio`, mirrors `uploadSpeakingImage` pattern)
- Added `ListenItemResult` interface for game scoring
- Added `listenItems?: ListenItem[]` to both `HomeworkItem` and `GameSession`

### Task 2: ListenCreationPage
- `SortableListenItemCard` with drag handle, item number chip, audio upload zone, expectedText field, keywords field, remove button
- Audio upload zone: dashed border empty state, CircularProgress while uploading, Headphones icon + filename + remove X when uploaded
- Per-item upload error Alert (10MB limit, mp3/wav/webm formats)
- `ListenCreationPage` with DndContext sortable list (identical to VocabCreationPage pattern)
- `Add Question` button (UI-SPEC copywriting), `Save Homework` button (bgcolor `#F0623A`)
- Page heading color `#60A5FA` (blue) to distinguish from Vocabulary orange
- Validate: name + each item has audioUrl + keywords; calls `createListenHomework`; redirects to `/teacher/homework`
- Page route at `/teacher/homework/create/listen`

### Task 3: homework/page.tsx wiring
- Added `Headphones` import and `LISTEN` entry to `TYPE_META` (color `#60A5FA`, bg `#60A5FA18`)
- Added `onNavigateToListen` prop to `HomeworkModal`
- Added LISTEN redirect block with "Open Listen Editor" button navigating to `/teacher/homework/create/listen`
- Added LISTEN to Save button exclusion, `openEdit` guard, `counts` object, filter bar, card display

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] LISTEN missing from TYPE_META in teacher/homework/[id]/page.tsx**
- **Found during:** Task 3 TypeScript verification
- **Issue:** Extending `HomeworkType` to include `'LISTEN'` caused a TS2741 compile error in `[id]/page.tsx` which has its own `Record<HomeworkType, ...>` TYPE_META
- **Fix:** Added `Headphones` import and `LISTEN: { label: 'Listen', icon: Headphones, color: '#60A5FA', bg: '#60A5FA18' }` entry
- **Files modified:** `frontend/app/teacher/homework/[id]/page.tsx`
- **Commit:** 70687b8

**2. [Rule 1 - Bug] LISTEN missing from TYPE_META in game/homework/page.tsx**
- **Found during:** Task 3 TypeScript verification
- **Issue:** Same TS2741 error — student-facing homework list page also has a `Record<HomeworkType, ...>` TYPE_META
- **Fix:** Added `Headphones` import and `LISTEN` entry
- **Files modified:** `frontend/app/game/homework/page.tsx`
- **Commit:** 70687b8

**3. [Rule 1 - Bug] Implicit-any TypeScript error in ListenCreationPage destructure**
- **Found during:** Task 3 TypeScript verification
- **Issue:** `items.map(({ clientId: _, audioFilename: __, ...rest }) => ...)` produced TS7031 on `_` and `__`
- **Fix:** Renamed to `_clientId` and `_audioFilename` (named unused vars avoid implicit-any)
- **Files modified:** `frontend/app/teacher/homework/_components/ListenCreationPage.tsx`
- **Commit:** 70687b8

## Known Stubs

None — all functions call real API endpoints. `uploadAudio` and `createListenHomework` will return API errors if the backend endpoint is not yet deployed, which is expected (backend is built in plans 09-01/02/03).

## Threat Flags

None — no new network endpoints introduced on the frontend side beyond what the plan's threat model covers (POST /homework/audio and POST /homework/listen are both in the threat register).

## Self-Check: PASSED

- `frontend/app/teacher/homework/_components/ListenCreationPage.tsx` — FOUND
- `frontend/app/teacher/homework/create/listen/page.tsx` — FOUND
- Commit 3e39449 — FOUND (admin-api.ts extensions)
- Commit 20121f8 — FOUND (ListenCreationPage + page route)
- Commit 70687b8 — FOUND (type picker wiring + Rule 1 fixes)
