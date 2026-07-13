---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
last_updated: "2026-07-12T13:42:14.762Z"
progress:
  total_phases: 18
  completed_phases: 16
  total_plans: 88
  completed_plans: 81
  percent: 92
---

# Project State: Katie English

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** Student completes homework on tablet, gets AI-scored result immediately — no manual teacher grading.
**Current focus:** Phase 18 — multi-language-support-across-all-pages (6/12 plans done: i18n foundation + dashboard/login/schedule + classes/students + sessions/import + tuition + homework list/create extraction)

**⚠ Known issue introduced by Plan 18-05:** Admin portal's `/admin/tuition` page (TuitionConfigForm/GenerateRecordsModal/TuitionReportTable, shared with Teacher portal) will throw a runtime error ("No intl context found") because `admin/layout.tsx` has no `NextIntlClientProvider` wiring. Accepted risk per plan threat model (T-18-10); needs fixing before/during the Admin portal's own i18n migration. See 18-05-SUMMARY.md.

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
- Phase 18 added: Multi-language support across all pages

---
*State updated: 2026-05-19*

**Planned Phase:** 14 (game-responsive) — 3 plans — 2026-06-17T00:00:00.000Z

- **2026-06-19**: Phase 15 tuition management complete. Plans 15-02 (backend), 15-03 (UI forms), 15-04 (TuitionReportTable) all done. Human verify checkpoint approved. TUITION-07 delivered.
- **2026-06-21**: Phase 16 plan 16-04 complete. admin/page.tsx, admin/teachers/page.tsx ACCENT updated to '#6366F1'; admin/classes 'Reassign' button and admin/students checkbox colors patched. Human visual checkpoint approved. Phase 16 all 4 plans done — Teacher/Admin UI Redesign complete.
- **2026-07-12**: Phase 18 context gathered (18-CONTEXT.md). Scope: cookie-based EN/VI locale (no URL prefix, no schema change), default VI, independent per app. This phase = i18n foundation + full Teacher portal migration + toast/error normalization; Admin/Student/Marketing migrations deferred to follow-up phases. Next: /gsd:plan-phase 18.
- **2026-07-13**: Plan 18-01 complete. next-intl installed; `lib/i18n/{request,actions}.ts` (cookie-based locale, enum-validated, default VI); `teacher/layout.tsx` split into server component + `TeacherLayoutClient.tsx`; `LanguageSwitcher` wired into `TeacherShell` header; `teacher.json` skeleton (nav/shell/common) in both locales. 12/12 unit tests passing, build clean.
- **2026-07-13**: Plan 18-02 complete. Dashboard/login/schedule pages fully translation-driven (`teacher.json` +dashboard/login/schedule namespaces); fixed pre-existing bilingual inconsistency (schedule was VI-only, login/dashboard were EN-only). Follow-up fix: LanguageSwitcher was unreachable on the unauthenticated login page (TeacherShell-only wiring from 18-01 didn't cover it) — now rendered directly on `/teacher/login`. Verified via tsc/tests/build + curl-based locale resolution check (no browser available this session for visual confirmation — flagged as outstanding in 18-02-SUMMARY.md).
- **2026-07-13**: Plan 18-03 complete. Classes/students pages (900+ lines, 7 modal/component functions) fully translation-driven; all 16 showToast call sites catalog-sourced (D-11: 18/38 total). Fixed a `filterTabs.map((t) => ...)` variable-shadowing bug surfaced by introducing the translation function. Same browser-verification caveat as 18-02 — outstanding, flagged in 18-03-SUMMARY.md.
- **2026-07-13**: Plan 18-04 complete. Sessions (filters, results list, phonics/speaking detail panel) and Import (upload flow, results table) pages fully translation-driven; load-error toast and upload-failed fallback catalog-sourced. Same browser-verification caveat outstanding, flagged in 18-04-SUMMARY.md.
- **2026-07-13**: Plan 18-05 complete. Teacher-portal tuition module (previously 100% Vietnamese-only, the CONTEXT.md-flagged inconsistency) now fully bilingual: page + TuitionConfigForm/GenerateRecordsModal/TuitionReportTable. Currency (`toLocaleString('vi-VN')`+VNĐ) and date formatting preserved byte-identical per D-12/D-13. **Introduces a known regression**: these shared components are also rendered by admin/tuition/page.tsx, whose layout has no NextIntlClientProvider — will throw at runtime until Admin's own i18n migration. Accepted per plan threat model T-18-10, flagged above and in 18-05-SUMMARY.md.
- **2026-07-14**: Plan 18-06 complete. homework/page.tsx (985 lines, largest file in phase — HomeworkModal, AssignModal, HwCard, HomeworkPage) and homework/create/page.tsx fully translation-driven; all 12 showToast sites in homework/page.tsx catalog-sourced (D-11: 31/38 total). Fixed two more `.map((t) => ...)` variable-shadowing bugs (same class as 18-03's fix) plus one pre-existing mojibake em-dash. Same browser-verification caveat outstanding.
