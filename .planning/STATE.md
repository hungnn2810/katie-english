---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Executing Phase 17
last_updated: "2026-06-22T09:03:16.571Z"
progress:
  total_phases: 17
  completed_phases: 15
  total_plans: 72
  completed_plans: 69
  percent: 88
---

# Project State: Katie English

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** Student completes homework on tablet, gets AI-scored result immediately — no manual teacher grading.
**Current focus:** Phase 17 — import-classes-tuition-books-students-homework

## Current Phase

**Phase 3: Teacher Dashboard** — Wave 7 complete (7/7 plans done)

| Plan | Status |
|------|--------|
| 03-01 Sessions list + backend | ✓ Complete |
| 03-02 Submission count vertical slice | ✓ Complete |
| 03-03 Reading creation page scaffold | ✓ Complete |
| 03-04 Reading create persistence | ✓ Complete |
| 03-05 FillInBlank editor + DnD reorder | ✓ Complete |
| 03-06 Edit reading homework | ✓ Complete |
| 03-07 Reading session result slice | ✓ Complete |

## Phase Progress

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: Speaking Homework | Complete | 2026-05-13 | 2026-05-17 |
| Phase 2: Reading Homework | In Progress | 2026-05-17 | — |
| Phase 3: Teacher Dashboard | Complete | 2026-05-18 | 2026-05-18 |
| Phase 4: Student UX Polish | Not started | — | — |
| Phase 5: BFA Quality & Performance | In Progress | 2026-05-19 | — |

## Decisions

- Shake animation: 400ms ease-in-out, 5-stop translateX keyframe (tailwind.config.js)
- Shuffle-once-on-mount via useEffect[sessionId] stored in ActivityState (not useMemo)
- Functional setState pattern in setTimeout closures for stale-closure safety
- Combined Tasks 1+2 into single commit — both renderers built immediately
- TypePickerModal placed inline in homework/page.tsx as standalone component (consistent with HomeworkModal pattern)
- ReadingActivityDraft is the canonical draft type (alias for CreateReadingActivityInput + clientId) — Plans 04/05 must not redefine
- clientId used as stable DnD id (equivalent to plan's draftId — same crypto.randomUUID strategy)
- FillInBlankActivityEditor uses segments format (SentenceSegment[]) to match /homework/reading endpoint
- tokenizeSentence splits on /\S+|\s+/g preserving whitespace tokens for layout fidelity
- ReadingCreationPage extracted to _components/ as named export (Next.js cross-route import requirement)
- ReadingHomeworkDetail.readingActivities (not activities) — matches Prisma field name (bug fixed Plan 06)
- Try button hidden in create mode (no DB row yet) — intentional UX decision
- Used FastAPI lifespan context manager (not deprecated on_event) for eager model warm-up
- Extracted _run_alignment shared helper to avoid duplicating alignment logic between _align_sync and _analyze_sync
- Transcription failure in _analyze_sync is non-fatal: alignment still runs, transcription.text returns empty string
- JSON.stringify/JSON.parse for Word.phonemes round-trip (not join/split)
- findByText uses findUnique+select (text is @unique, no eager relation load)
- BfaAnalyzeResult extends BfaAlignResult + transcription field (single /analyze call replaces transcribe+align)
- WordRepository exported via WordModule.exports (not added directly to GameModule providers)
- trySpeakingHomework injects PrismaService directly — no session intermediary
- completeSession refactored to 1-arg (video upload stripped by linter)
- Cast Buffer as unknown as ArrayBuffer for Azure SDK pushStream.write — SDK types declare ArrayBuffer but Node Buffer works at runtime
- Use manual jest.mock factory for Azure Speech SDK — auto-mock triggers SDK init crash

## Session Log

- **2026-05-13**: Project initialized. PROJECT.md, REQUIREMENTS.md, ROADMAP.md created.
- **2026-05-17**: Phase 2 execution started. Wave 1 (02-01 + 02-02) complete. Wave 2 in progress.
- **2026-05-18**: Plan 02-03 complete. Teacher reading creation page live at /teacher/homework/create/reading. @dnd-kit installed. npm run build passing.
- **2026-05-18**: Plan 02-04 complete. Student reading game page live at /game/reading/[id]. Full state machine, matching + fill-blank renderers, submission flow, results screen.
- **2026-05-18**: Plan 03-05 complete. FillInBlankActivityEditor with chip-toggle/reindexBlanks/distractor inputs + DnD keyboard sensor + isDragging feedback. FILL_BLANK now serializes segments format to backend.
- **2026-05-18**: Plan 03-06 complete. ReadingCreationPage extracted to _components/, edit mode + edit route live, READING branch in try page with interactive matching+fill-in-blank preview (no DB writes).
- **2026-05-18**: Plan 03-07 complete. READING completeSession spec block (4 tests); repository sessionInclude documents per-activity gap; session detail page extended with ActivityResultCard/MatchingResultRow/FillInBlankResultRow (D-15/D-16/D-17). Phase 3 all 7 plans done.
- **2026-05-19**: Phase 5 BFA Quality & Performance added. Review identified 3 bugs (similar timestamps, empty expected phonemes, thread-unsafe model init) + 2 improvements (phoneme DB, combined /analyze endpoint, per-phoneme UI). Requirements BFA-01–05 added.
- **2026-05-19**: Plan 05-02 complete. Word.phonemes column added, BfaService.analyze() wired, savePhonicsResult collapsed to single /analyze call, 110 backend tests passing. DB push deferred (Docker Desktop paused — run npx prisma db push + db seed when unpaused).

## Accumulated Context

### Roadmap Evolution

- Phase 5 added: BFA Quality & Performance (BFA-01–05)
- Phase 17 added: Import: classes (tuition + books) + students + homework

---
*State updated: 2026-05-19*

**Planned Phase:** 14 (game-responsive) — 3 plans — 2026-06-17T00:00:00.000Z

- **2026-06-19**: Phase 15 tuition management complete. Plans 15-02 (backend), 15-03 (UI forms), 15-04 (TuitionReportTable) all done. Human verify checkpoint approved. TUITION-07 delivered.
- **2026-06-21**: Phase 16 plan 16-04 complete. admin/page.tsx, admin/teachers/page.tsx ACCENT updated to '#6366F1'; admin/classes 'Reassign' button and admin/students checkbox colors patched. Human visual checkpoint approved. Phase 16 all 4 plans done — Teacher/Admin UI Redesign complete.
