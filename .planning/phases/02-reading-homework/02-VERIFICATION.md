---
phase: 02-reading-homework
verified: 2026-06-23T00:00:00Z
status: passed
score: 4/4
overrides_applied: 0
---

# Phase 02: Reading Homework — Verification Report

**Phase Goal:** Teacher creates a reading homework mixing image-word matching and fill-in-blank activities; student completes on tablet; score stored on submission.
**Verified:** 2026-06-23
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Teacher creates a homework with at least one matching activity and one fill-in-blank activity in a custom sequence | VERIFIED | `ReadingCreationPage.tsx` implements both `MatchingActivityEditor` and `FillBlankActivityEditor` with DnD reorder via `@dnd-kit/sortable`. UAT plan 02-05 confirmed PASS. |
| SC-2 | Student completes image-word matching by clicking pairs — correct pairs highlighted, incorrect shaken | VERIFIED | `MatchingActivityRenderer` in `/student/reading/[id]/page.tsx` implements 4-state border styling (idle/selected/locked/shaking), 400ms shake timeout, 500ms celebration auto-advance. Code verified. |
| SC-3 | Student completes fill-in-blank by selecting from choices — all gaps filled before submission allowed | VERIFIED | `FillBlankActivityRenderer` uses one-shot `chosenChoiceId` guard per item; `advanceActivity` calls `finishSession` only after last activity completes. All items answered before submission. |
| SC-4 | Score calculated and stored on submission; student sees result screen | VERIFIED | `saveReadingResult` → `completeSession` chain in `finishSession()`. `ReadingResult` stored via `repo.saveReadingResult` upsert. `ResultsState` renders score via `scoreHexColor(score)`. UAT PASS. |

**Score: 4/4 truths verified**

---

### Requirements Coverage

| Requirement | Plan(s) | Description | Status | Evidence |
|-------------|---------|-------------|--------|----------|
| READ-01 | 02-01, 02-03 | Teacher can create image-word matching activity (upload images, assign word labels) | SATISFIED | `MatchingActivityEditor` in `ReadingCreationPage.tsx`: bulk file upload via `uploadSpeakingImage`, filename prefill, 2-6 pairs limit enforced, editable word labels. UAT PASS. |
| READ-02 | 02-01, 02-03 | Teacher can create fill-in-blank activity (paragraph/sentence with gaps, multiple-choice word options) | SATISFIED | `FillBlankActivityEditor` in `ReadingCreationPage.tsx`: segment-based tokenizer, click-to-toggle blanks, distractor inputs, validated. UAT PASS. |
| READ-03 | 02-03 | Teacher can freely sequence matching and fill-in-blank activities within one homework | SATISFIED | `DndContext + SortableContext + useSortable` in `ReadingCreationPage.tsx` with `PointerSensor activationConstraint: { distance: 8 }`. UAT PASS. |
| READ-04 | 02-04 | Student completes image-word matching by click-to-pair | SATISFIED | `MatchingActivityRenderer` — image click selects, word click tests correctness; locked state on correct, shake+reset on incorrect. UAT PASS. |
| READ-05 | 02-04 | Student answers fill-in-blank by selecting from provided word choices | SATISFIED | `FillBlankActivityRenderer` — one-shot selection; correct/wrong flash; `currentItemIndex` advances after 400ms; auto-complete after last item. UAT PASS. |
| READ-06 | 02-01, 02-04 | System scores reading activities deterministically and stores result | SATISFIED | Server computes `totalItems` from session's reading activities; `score = Math.round(correctItems/totalItems*100)`; stored via `readingResult.upsert`. UAT PASS. |

**All 6 phase requirements satisfied.**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/prisma/schema.prisma` | READING enum, ReadingActivityType enum, 5 new models, relations | VERIFIED | Contains `READING` in `HomeworkType`, `ReadingActivityType { MATCH FILL_BLANK }`, `ReadingActivity`, `MatchPair`, `FillBlank`, `FillBlankChoice`, `ReadingResult` models. `Homework.readingActivities` and `HomeworkSession.readingResult` relations present. |
| `backend/prisma/migrations/20260517000001_add_reading_homework/` | Migration SQL for 5 new tables | VERIFIED | Contains `CREATE TYPE "ReadingActivityType"`, `CREATE TABLE "reading_activities"`, `"match_pairs"`, `"fill_blanks"`, `"fill_blank_choices"`, `"reading_results"` with correct PKs, FKs, unique constraints. Note: `ALTER TYPE "HomeworkType" ADD VALUE 'READING'` not present — READING was already in the enum from migration `20260506000002_add_homework_type`. |
| `backend/src/homework/homework.dto.ts` | READING in HomeworkType, CreateReadingActivityDto, CreateMatchPairDto, CreateFillBlankChoiceDto, CreateFillBlankItemDto, readingActivities? on CreateHomeworkDto | VERIFIED | `HomeworkType` includes `'READING'`; `ReadingActivityType`; `CreateMatchPairDto`, `CreateFillBlankChoiceDto`, `CreateFillBlankItemDto`, `CreateLegacyReadingActivityDto`; `readingActivities?` on `CreateHomeworkDto`. Also contains extended `CreateReadingActivityDto` (segment-based) added in Phase 3. |
| `backend/src/homework/homework.repository.ts` | createReading(), $transaction, readingActivitiesInclude | VERIFIED | `readingActivitiesInclude` constant; `createReading()` uses `$transaction(async tx => ...)` with tx.homework.create, tx.readingActivity.create, tx.matchPair.createMany, tx.fillBlank.create, tx.fillBlankChoice.createMany; `create()` delegates to `createReading` for type READING. |
| `backend/src/homework/homework.service.ts` | validateReadingDto() private method | VERIFIED | `validateReadingDto()` validates MATCH (2-6 pairs), FILL_BLANK (≥2 choices per item, exactly 1 isCorrect=true). Both error messages present: `'Matching activity must have 2 to 6 pairs'`, `'Each fill-blank item must have exactly one isCorrect=true choice'`. |
| `backend/src/game/game.dto.ts` | SaveReadingResultDto with correctItems and totalItems | PARTIAL | `SaveReadingResultDto` only has `correctItems: number`. `totalItems` is NOT in the DTO — the backend computes it server-side from the session's reading activities. This is a deliberate, more secure design. Frontend sends `{ correctItems, totalItems }` but backend ignores the client-supplied `totalItems`. |
| `backend/src/game/game.repository.ts` | readingResult: true in sessionInclude, readingActivitiesInclude, saveReadingResult(), getReadingResult() | VERIFIED | `readingActivitiesInclude` in homeworkInclude; `readingResult: true` in sessionInclude; `saveReadingResult()` upsert; `getReadingResult()` finder. All present. |
| `backend/src/game/game.service.ts` | saveReadingResult() with guards and score computation; READING branch in completeSession | VERIFIED | `saveReadingResult()`: getSession guard → completedAt guard → type guard → `correctItems < 0` check → server-computed totalItems → `correctItems > totalItems` check → `Math.round(correctItems/totalItems*100)`. `completeSession` READING branch calls `getReadingResult` to read score. |
| `backend/src/game/game.controller.ts` | @Post('session/:id/reading-result') endpoint | VERIFIED | `@Post('session/:id/reading-result')` with `@Body() dto: SaveReadingResultDto` and student identity guard. No FileInterceptor (JSON POST). |
| `backend/src/game/game.service.spec.ts` | READING fixtures, saveReadingResult tests, completeSession READING tests | VERIFIED | `mockReadingSession` fixture; `describe('saveReadingResult')` with 6 tests (NotFoundException, completedAt guard, wrong type, exceeds server total, negative, happy path); `describe('completeSession READING')` with 2 tests (score present and score missing). All pass. |
| `frontend/lib/admin-api.ts` | READING in HomeworkType, all Reading interfaces, saveReadingResult() | VERIFIED | `HomeworkType` includes `'READING'`; `ReadingActivityType`, `MatchPair`, `FillBlankChoice`, `FillBlank`, `ReadingActivity`, `ReadingResult` interfaces; `CreateMatchPairInput`, `CreateFillBlankChoiceInput`, `CreateFillBlankItemInput`, `CreateReadingActivityInput`; `readingActivities?` on `CreateHomeworkInput` and `HomeworkItem`; `readingResult?` on `GameSession`; `saveReadingResult()` function. |
| `frontend/app/student/homework/page.tsx` (was `game/homework`) | READING entry in TYPE_META, routing to /student/reading/ | VERIFIED | `TYPE_META` includes `READING: { label: 'Đọc', icon: BookOpen }`; `handleStart()` branches on `hwType === 'READING'` → `router.push('/student/reading/${session.id}')`. |
| `frontend/app/teacher/homework/page.tsx` | READING in TYPE_META, Reading filter tab, navigation to creation page | VERIFIED | `TYPE_META` includes `READING: { label: 'Reading', icon: BookOpen, color: '#6ED6C1', bg: '#6ED6C118' }`; `{ key: 'READING', label: 'Reading' }` filter tab; modal redirects to `/teacher/homework/create/reading` when type=READING. Note: implementation uses modal-redirect pattern instead of standalone "New Reading" button; functionally equivalent. |
| `frontend/app/teacher/homework/create/reading/page.tsx` | Teacher reading creation page | VERIFIED | Thin wrapper delegating to `ReadingCreationPage` shared component. Full implementation in `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx` (~700+ lines). All acceptance criteria met. |
| `frontend/app/student/reading/[id]/page.tsx` (was `game/reading/[id]`) | Student reading game page | VERIFIED | 600+ lines. Contains `AuthGate requiredRole="STUDENT"`, state machine (`loading/error/playing/submitting/results`), `fetchSession`, `shuffle`, `MatchingActivityRenderer`, `FillBlankActivityRenderer`, `finishSession` calling `saveReadingResult` then `completeSession`, `ResultsState` with per-activity breakdown. |
| `frontend/tailwind.config.js` (shake animation) | shake keyframe | VERIFIED (different approach) | Project migrated to MUI — no `tailwind.config.js`. Shake animation implemented via MUI `keyframes` in `frontend/lib/theme.ts` and imported in the reading game page as `import { shake } from '@/lib/theme'`. Functionally equivalent. |
| `frontend/package.json` | @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities | VERIFIED | All three packages present in dependencies at specified versions. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `game.controller.ts` | `game.service.ts` | `saveReadingResult(id, dto, requestingStudentId)` call | VERIFIED | Line 154 in controller calls `this.service.saveReadingResult(id, dto, requestingStudentId)` |
| `game.service.ts` | `game.repository.ts` | `this.repo.saveReadingResult / this.repo.getReadingResult` | VERIFIED | `saveReadingResult` calls `this.repo.saveReadingResult(sessionId, totalItems, dto.correctItems, score)`; `completeSession` READING branch calls `this.repo.getReadingResult(sessionId)` |
| `homework.repository.ts` | `schema.prisma` | `prisma.$transaction(async tx => ...)` creating ReadingActivity, MatchPair, FillBlank, FillBlankChoice | VERIFIED | Lines 173-204 in `createReading()`: `tx.homework.create`, `tx.readingActivity.create`, `tx.matchPair.createMany`, `tx.fillBlank.create`, `tx.fillBlankChoice.createMany` |
| `student/reading/[id]/page.tsx` | `admin-api.ts` | `saveReadingResult, completeSession, GameSession, ReadingActivity, MatchPair, FillBlank, FillBlankChoice` imports | VERIFIED | Lines 7-14: named imports from `@/lib/admin-api` |
| `student/reading/[id]/page.tsx` | backend `GET /game/session/:id` | `fetchSession(sessionId)` in `useEffect[sessionId]` | VERIFIED | Lines 27-30: `fetchSession` helper; called in `useEffect` on mount |
| `student/reading/[id]/page.tsx` | backend `POST /game/session/:id/reading-result + complete` | `finishSession()` awaiting `saveReadingResult` then `completeSession` | VERIFIED | Lines 488-509: `await saveReadingResult(sessionId, { correctItems: correct, totalItems: total })` then `await completeSession(sessionId)` |
| `student/homework/page.tsx` | `student/reading/[id]/page.tsx` | `router.push('/student/reading/${session.id}')` when `hwType === 'READING'` | VERIFIED | Line 89 in `handleStart()` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `student/reading/[id]/page.tsx` | `activityStates` (MatchPairState[], FillBlankItemState[]) | `fetchSession(sessionId)` → `hw.readingActivities` | Yes — DB query in `game.repository.ts` `getSession()` includes `readingActivitiesInclude` | FLOWING |
| `student/reading/[id]/page.tsx` | `finalResult.score` | `completeSession(sessionId)` → `repo.completeSession` → `HomeworkSession.score` | Yes — `completeSession` reads `getReadingResult(sessionId).score` | FLOWING |
| `ReadingCreationPage.tsx` | homework form state | `getReadingHomework(id)` in edit mode | Yes — `findReadingById(id)` DB query with `readingActivitiesInclude` | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Check | Status |
|----------|-------|--------|
| `saveReadingResult` guards and score computation | Jest spec tests: `game.service.spec.ts` covers 6 paths for `saveReadingResult` | PASS (per SUMMARY: 39 tests pass) |
| `completeSession` READING branch reads stored score | Jest spec: `completeSession READING` describe block covers score-present and score-missing | PASS |
| Frontend sends `correctItems` to backend | `saveReadingResult` in `admin-api.ts` sends `{ correctItems, totalItems }` body | PASS (extra `totalItems` field harmlessly ignored by backend) |
| Student routing to `/student/reading/` | `handleStart()` in `student/homework/page.tsx` branches on `hwType === 'READING'` | VERIFIED in code |

Step 7b: Behavioral spot-checks — full app server not running during verification; functional verification via code analysis and Jest spec evidence.

---

### Probe Execution

Step 7c: No probe scripts declared in PLANs for this phase. Conventional probe discovery found no `probe-*.sh` files for phase 02. Skipped.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `backend/src/game/game.dto.ts` | `SaveReadingResultDto` is missing `totalItems` field — frontend sends it but backend ignores it | Info | No functional impact; backend computes `totalItems` server-side which is more secure. Potential confusion for API consumers expecting symmetric DTO. Not a blocker. |
| `backend/prisma/migrations/20260517000001_add_reading_homework/migration.sql` | Missing `ALTER TYPE "HomeworkType" ADD VALUE 'READING'` | Info | Not a defect — `READING` was already in `HomeworkType` enum from migration `20260506000002_add_homework_type`. Migration is correct as-is. |

No `TBD`, `FIXME`, or `XXX` markers found in phase-modified files.

No stubs detected — all component implementations are substantive with real logic.

---

### Architectural Deviations (Non-Blocking)

These are intentional deviations from plan specifications. They are documented for audibility but do not affect goal achievement.

| Deviation | Plan Said | Actual | Impact |
|-----------|-----------|--------|--------|
| `SaveReadingResultDto` fields | `{ correctItems: number; totalItems: number }` | `{ correctItems: number }` only; server computes `totalItems` | More secure; UAT confirmed working |
| Animation implementation | Add `shake` keyframe to `tailwind.config.js` | `shake` keyframe via MUI `keyframes` in `frontend/lib/theme.ts` | Project migrated to MUI; functionally equivalent |
| Student route paths | `/game/homework`, `/game/reading/[id]`, `/game/session/[id]` | `/student/homework`, `/student/reading/[id]`, `/student/session/[id]` | Phase 11 (Frontend MUI Refactor) restructured routes; functionally correct |
| Teacher creation entry point | Standalone "New Reading" button in toolbar | Modal-redirect: selecting READING type in "Create Homework" modal shows redirect to reading editor | Phase 3 unified creation flow; functionally meets READ-01..03 |
| FillBlank representation | `items: CreateFillBlankItemInput[]` with `choices` per item | Segment-based tokenizer with `blank` toggles and `distractors` | Phase 3 redesigned fill-blank for richer editing; backend stores same structure |
| Reading creation page location | `frontend/app/teacher/homework/create/reading/page.tsx` (full implementation) | Thin wrapper delegating to `frontend/app/teacher/homework/_components/ReadingCreationPage.tsx` | Phase 3 refactored to shared component for edit mode reuse |

---

### Human Verification Required

All human verification (UAT Plan 02-05) was completed by the user on 2026-06-23. All 6 READ-* requirements confirmed PASS. No remaining human verification items.

---

## Gaps Summary

No gaps. All 4 ROADMAP success criteria are verified. All 6 requirements (READ-01 through READ-06) are satisfied. UAT completed with all items PASS.

The architectural deviations noted above are intentional improvements made during Phase 2 execution and subsequent Phase 3 refinement. They do not constitute failures — the phase goal is fully achieved.

---

_Verified: 2026-06-23T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
