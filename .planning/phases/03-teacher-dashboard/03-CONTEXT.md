# Phase 3: Teacher Dashboard - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Add READING homework type end-to-end on the teacher side: dedicated creation page with multi-activity editor, unified type-picker entry point, edit/try modes, and result review with expandable per-item breakdown. Also surface submission counts (X/Y enrolled students submitted) on homework list and detail pages. Backend adds READING type with reading activity schema, scoring, and result storage.

Student-side reading gameplay is Phase 2's scope. Phase 3 only covers teacher creation, assignment (already built — multi-class AssignModal), and result review.

</domain>

<decisions>
## Implementation Decisions

### Reading Creation Flow
- **D-01:** Reading homework is created on a **dedicated page** (`/teacher/homework/create/reading`), not inside the existing HomeworkModal. The modal is too small for multi-activity composition.
- **D-02:** Entry point: the existing `+ Create` button opens a **type-picker modal** (Phonics / Speaking / Reading). Phonics and Speaking stay as before (inline HomeworkModal). Reading navigates to the dedicated creation page.
- **D-03:** After saving, teacher is redirected to `/teacher/homework` (homework list). No auto-open of AssignModal.
- **D-04:** Edit mode uses the **same creation page** with prefilled data, routed as `/teacher/homework/[id]/edit`. The Edit button on the homework list/detail page navigates there.
- **D-05:** Reading homework creation page has a **Try/Preview button** — same purpose as the Try button on phonics/speaking detail pages. Teacher sees the student experience (scored, not saved to DB).

### Reading Activity Editor
- **D-06:** Image-word matching pairs are **added dynamically** — teacher clicks "+ Add pair", uploads an image, types the word label. No fixed count. Minimum 2 pairs to save.
- **D-07:** Fill-in-blank input: teacher **writes the full sentence, then clicks/highlights individual words to mark them as blanks**. Selected words become answer slots; teacher then types 2–3 distractor options for each blank manually.
- **D-08:** Each blank has teacher-defined distractors (free-text input per blank, e.g. "dog, bird"). System does NOT auto-generate distractors.
- **D-09:** Activities within a reading homework are **reordered via drag-and-drop**. Use `@dnd-kit/core` (lightweight, no external CSS). Up/down arrows not sufficient for UX.
- **D-10:** Reading homework requires a **required name** field (same as phonics). Auto-focus on save validation.
- **D-11:** Image uploads for matching pairs reuse `uploadSpeakingImage()` from `frontend/lib/admin-api.ts` — same MinIO endpoint (`POST /homework/image`). No new backend upload route needed.

### Fill-in-Blank Storage Format
- **D-12 (Claude's discretion):** Store the sentence as a JSON segment array: `[{text: "The ", blank: false}, {text: "cat", blank: true, blankIndex: 0}, {text: " sits", blank: false}, ...]`. Each blank entry carries `correctWord` (the original word) and `distractors: string[]`. This is the canonical storage format — downstream agents must use it.

### Submission Count
- **D-13:** Y denominator = **total enrolled students across all classes in the assignment**. Backend change: update `assignmentInclude` in `backend/src/homework/homework.repository.ts` to include `class: { include: { _count: { select: { students: true } } } }` alongside the existing class include. Frontend sums `assignment.classes.reduce((sum, ac) => sum + (ac.class._count?.students ?? 0), 0)`.
- **D-14:** Submission count displayed in **two places**: (a) homework list page — per assignment card "N/M submitted"; (b) homework detail page — prominently + list of students who haven't submitted.

### Reading Session Results
- **D-15:** Session detail page shows reading results as **collapsible activity cards** — each activity shows its score (e.g. "Matching: 75%"), expandable to show per-item rows.
- **D-16:** Matching activity per-item row: image thumbnail + "student chose 'X'" + correct/wrong badge. Store `studentChosenWord` in `ReadingMatchingItemResult`.
- **D-17:** Fill-in-blank per-item row: sentence with blanks highlighted — student's chosen word shown inline (green if correct, red if wrong).
- **D-18:** Overall session score = **average of all activity scores** (unweighted). Consistent with how phonics/speaking store a single `score: Float` on `GameSession`.

### Backend Schema (Claude designs, user approved direction)
- New Prisma models needed: `ReadingActivity` (type enum `MATCHING|FILL_IN_BLANK`, order, homeworkId), `MatchingPair` (activityId, imageUrl, word, order), `FillInBlankActivity` (activityId, sentenceSegments as JSON, order), `FillInBlankBlank` (activityId, blankIndex, correctWord, distractors as JSON), and result tables: `ReadingActivityResult` (sessionId, activityId, score), `MatchingItemResult` (sessionId, pairId, studentChosenWord, isCorrect), `FillInBlankItemResult` (sessionId, blankId, studentChosenWord, isCorrect).
- `HomeworkType` enum gains `READING` value.
- Session overall score computed from activity scores at `completeSession` time.

### Claude's Discretion
- Drag-and-drop library: use `@dnd-kit/core` — smallest footprint, no peer-dep conflicts with Next.js 14.
- Image thumbnail size in matching results: 40×40px, same as word images in phonics results.
- Empty-state display on reading creation page when no activities added yet.
- Fill-in-blank sentence highlight UX: word clicks toggle blank state; already-blank words show as chip with an × remove button.
- Type-picker modal design: extend HomeworkModal's type selector section into a standalone modal before navigating.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend — Teacher Homework
- `frontend/app/teacher/homework/page.tsx` — Homework list + HomeworkModal + AssignModal (add READING filter tab, type-picker split, submission count display)
- `frontend/app/teacher/homework/[id]/page.tsx` — Homework detail (add submission count + non-submitted student list)
- `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx` — Session detail (add reading results section)
- `frontend/lib/admin-api.ts` — `HomeworkType` (add 'READING'), `HomeworkItem`, `AssignmentItem`, API functions (add reading creation, reading results endpoints)
- `frontend/lib/colors.ts` — color tokens and gradients (keep reading type consistent)

### Backend — Homework & Sessions
- `backend/src/homework/homework.repository.ts` — `assignmentInclude` needs class student count (D-13); add READING creation logic
- `backend/prisma/schema.prisma` — add READING to `HomeworkType` enum + all new reading tables
- `backend/src/game/game.service.ts` — `completeSession` needs to handle READING score computation

### Requirements
- `.planning/REQUIREMENTS.md` — READ-07, TEACH-01, TEACH-02, TEACH-03, TEACH-04, TEACH-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HomeworkModal` in `frontend/app/teacher/homework/page.tsx` — type selector logic to extract into `TypePickerModal` for the new Create entry point
- `AssignModal` in same file — already handles multi-class assignment via `classIds[]`; no changes needed for TEACH-02
- `uploadSpeakingImage()` in `frontend/lib/admin-api.ts` — reuse for reading matching-pair image uploads (D-11)
- `scoreColor()` / `scoreHex()` helpers in `[id]/session/[sessionId]/page.tsx` — reuse for activity scores in reading results
- `@dnd-kit/core` — not yet installed; add to `frontend/package.json`

### Established Patterns
- Homework parts/words use a Prisma nested create pattern in `homework.repository.ts` — mirror it for `ReadingActivity` + `MatchingPair`
- `HomeworkType` enum is in `backend/prisma/schema.prisma` and mirrored as `export type HomeworkType` in `frontend/lib/admin-api.ts` — both must be updated
- Session results (phonics/speaking) stored in separate result tables; same pattern for reading
- `_count: { sessions: true }` on `AssignmentItem` already exists; extend to include class student counts (D-13)

### Integration Points
- New page `/teacher/homework/create/reading` — new Next.js route under `frontend/app/teacher/homework/create/reading/page.tsx`
- New page `/teacher/homework/[id]/edit` — `frontend/app/teacher/homework/[id]/edit/page.tsx`
- `frontend/app/teacher/homework/[id]/try/page.tsx` — existing Try page needs a READING branch
- Backend: new NestJS endpoints in homework controller for reading CRUD + game controller for reading result submission

</code_context>

<specifics>
## Specific Ideas

- Type picker: three cards (Phonics 🔤, Speaking 🎤, Reading 📖) in a small modal. Clicking Phonics/Speaking opens HomeworkModal as before. Clicking Reading navigates to `/teacher/homework/create/reading`.
- Fill-in-blank editor: textarea for sentence input, then a tokenized display below where each word is a clickable chip. Clicking a word chip toggles it between normal and blank state. Blank chips show "___" and an × button to unblank.
- Drag-and-drop: each activity card has a drag handle (≡ icon) on the left. Cards reorder vertically.
- "X/Y submitted" badge: same pill style as the "Open / Closed" status badge already on the homework detail page.

</specifics>

<deferred>
## Deferred Ideas

- Student-side reading game UI — Phase 2 scope (READ-01 through READ-06)
- Auto-generated distractors for fill-in-blank — user chose manual input; revisit if teachers report it's too tedious
- Bulk assignment to all classes at once — not requested; TEACH-02 covers multi-select
- Reading analytics (score trends) — v2 roadmap (ANALYTICS-01)

</deferred>

---

*Phase: 3-Teacher Dashboard*
*Context gathered: 2026-05-14*
