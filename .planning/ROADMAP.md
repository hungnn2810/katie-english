# Roadmap: Katie English

**Milestone:** v1 — Complete Homework Platform | v2 — Enhanced Assessment Quality
**Project Mode:** Vertical MVP (end-to-end feature slices)
**Requirements:** 26 v1 requirements (phases 1–6) + 15 v2 requirements (phases 7–9)

---

## Phase Overview

| # | Phase | Goal | Milestone | Status |
|---|-------|------|-----------|--------|
| 1 | Speaking Homework | Teacher creates, student records, system scores | v1 | ✅ Complete 2026-05-13 |
| 2 | Reading Homework | Matching + fill-in-blank, score stored | v1 | 🔄 In progress |
| 3 | Teacher Dashboard | Unified creation, assignment, results review | v1 | ✅ Complete |
| 4 | Student Page UI/UX | Kid-friendly polish, due-date ordering | v1 | ✅ Complete |
| 5 | BFA Quality & Performance | Pipeline fixes, Groq ASR, phoneme feedback | v1 | 🔄 In progress (plan 07) |
| 6 | Admin Portal | Super-admin: teachers, classes, results mgmt | v1 | 📋 Planned |
| 7 | BFA Robustness & Audio Gates | Zero silent failures, audio quality validation | v2 | ✅ Complete 2026-05-31 |
| 8 | Vocabulary by Image Exercise | Image → student speaks word → phoneme feedback | v2 | 📋 Planned |
| 9 | Listen & Answer Exercise | 5/5 | Complete   | 2026-06-03 |
| 10 | Azure PA Engine | Replace Groq+espeak with Azure Pronunciation Assessment | v2 | 📋 Planned |
| 11 | Frontend React MUI Refactor | 5/5 | Complete    | 2026-06-05 |
| 12 | Multi-Subdomain Split | 3/3 | Complete   | 2026-06-02 |
| 13 | Landing Page | 1/3 | In Progress|  |
| 14 | Game Responsive Layout | 0/3 | Pending |  |
| 15 | Tuition Management | 1/4 | In Progress|  |

---

### Phase 1: Speaking Homework

**Goal:** Teacher creates speaking homework in either mode, student uploads audio recording, system transcribes and scores, teacher views result.
**Mode:** mvp

**Requirements:**

- SPEAK-01: Teacher can create speaking homework in free-speak mode (image prompt)
- SPEAK-02: Teacher can create speaking homework in script-matching mode (target text)
- SPEAK-03: Student uploads audio recording for speaking homework
- SPEAK-04: System submits recording to WhisperX, stores transcript
- SPEAK-05: System scores transcript against expected result and stores score
- SPEAK-06: Teacher can view speaking session result (score + transcript)

**Success Criteria:**

1. Teacher creates a speaking homework in free-speak mode with an image prompt and it appears in the assigned class's homework list.
2. Student opens speaking homework, uploads an audio recording, submits — system generates and stores a score without manual intervention.
3. Teacher opens the assignment results page and sees per-student score and transcript for speaking submissions.

---

### Phase 2: Reading Homework

**Goal:** Teacher creates a reading homework mixing image-word matching and fill-in-blank activities; student completes on tablet; score stored on submission.
**Mode:** mvp

**Requirements:**

- READ-01: Teacher can create image-word matching activity (upload images, assign word labels)
- READ-02: Teacher can create fill-in-blank activity (paragraph/sentence with gaps, multiple-choice options)
- READ-03: Teacher can freely sequence matching and fill-in-blank activities within one homework
- READ-04: Student completes image-word matching by click-to-pair
- READ-05: Student answers fill-in-blank by selecting from provided word choices
- READ-06: System scores reading activities deterministically and stores result

**Success Criteria:**

1. Teacher creates a homework with at least one matching activity and one fill-in-blank activity in a custom sequence.
2. Student opens reading homework, completes image-word matching by clicking pairs — correct pairs highlighted, incorrect shaken.
3. Student completes fill-in-blank by selecting from choices — all gaps filled before submission allowed.
4. Score calculated and stored on submission; student sees result screen.

**Plans:**

- [x] 02-01-PLAN.md — Backend data spine: Prisma schema + migration + DTOs + repositories + service scoring + REST endpoint (Wave 1)
- [x] 02-02-PLAN.md — Frontend API contract: types + saveReadingResult + student routing + teacher entry points (Wave 1)
- [x] 02-03-PLAN.md — Teacher creation page: image-word matching + fill-in-blank + sequence reorder via @dnd-kit (Wave 2)
- [x] 02-04-PLAN.md — Student reading game: matching click-to-pair + fill-in-blank + scoring + result screen (Wave 2)
- [ ] 02-05-PLAN.md — Human verification checkpoint (Wave 3)

---

### Phase 3: Teacher Dashboard

**Goal:** Teacher can create any homework type from a single flow, assign to classes, and drill into per-student results.
**Mode:** mvp

**Requirements:**

- READ-07: Teacher can view reading session score breakdown per activity
- TEACH-01: Teacher can create any homework type (phonics/speaking/reading) from a unified creation flow
- TEACH-02: Teacher can assign homework to one or more classes with a due date
- TEACH-03: Teacher can view homework list with submission counts and assignment status
- TEACH-04: Teacher can see per-student session results for any homework assignment
- TEACH-05: Teacher can review individual student attempt (score breakdown + transcript)

**Success Criteria:**

1. Teacher reaches homework creation from one entry point and can select phonics, speaking, or reading type.
2. Teacher assigns a homework to two classes simultaneously with a single action.
3. Homework list page shows submission count (e.g., "5/12 submitted") for each assignment.
4. Teacher opens a student's attempt and sees per-item score breakdown with transcript.

**Plans:**

- [x] 03-01-PLAN.md — Schema foundation: extend Prisma + push DB + sync HomeworkType across DTO/admin-api + backend reading stubs (Wave 1)
- [x] 03-02-PLAN.md — Submission count slice + TEACH-02 regression: assignmentInclude student count, X/Y pill on list+detail, non-submitted list, AssignModal multi-class verification (Wave 2)
- [x] 03-03-PLAN.md — TypePickerModal entry point + Reading creation page skeleton + READING filter tab (Wave 3)
- [x] 03-04-PLAN.md — Reading CRUD backend + matching-activity creation slice (image upload reuse, create+save end-to-end) (Wave 4)
- [x] 03-05-PLAN.md — @dnd-kit install + FillInBlank editor (tokenizer + chip toggle + distractors) + drag-and-drop activity reorder (Wave 5)
- [x] 03-06-PLAN.md — Edit mode route + Try/Preview button + interactive client-side READING preview branch in try page (Wave 6)
- [x] 03-07-PLAN.md — completeSession READING branch + sessionInclude reading results + session detail page Reading section (collapsible activity cards, per-item rows) (Wave 7)
- [ ] 03-09-PLAN.md — Create Homework UI/UX upgrade: merge TypePickerModal into HomeworkModal, max-w-2xl + px-8 spacing, type-colored headings, collapsible PHONICS parts, better word entry, AssignModal upgrade (Wave 9)

---

### Phase 4: Student Page UI/UX

**Goal:** Student homework page UI/UX polish — ordered list, clear urgency badges, laptop/PC-first layout, and kid-friendly visuals for ages 6–12.
**Mode:** mvp

**Requirements:**

- STUDENT-01: Student homework list shows assignments ordered by due date
- STUDENT-02: All student game screens function correctly on tablet/phone (touch-first, minimum 44px touch targets)
- STUDENT-03: Student homework page uses kid-friendly visuals for ages 6–12 (larger type, gentle colors, playful icons, cute buttons)

> **Phase-context note (2026-05-14, per 04-CONTEXT.md D-01):** Student device target is **laptop/PC only**. STUDENT-02 is satisfied by retaining the existing `minWidth: 1024` constraint on the student page; no tablet/phone or touch-target work is performed in this phase. The implementation contract is in `.planning/phases/04-student-page-ui-ux/04-CONTEXT.md`.

**Plans:**

- [x] 04-01-PLAN.md — Sort student homework list by endDate ascending and add Overdue badge variant

**Success Criteria:**

1. Homework list orders assignments by ascending due date; overdue items show a red "Overdue" badge.
2. Student homework page retains laptop/PC layout (`minWidth: 1024`) with no responsive/touch changes.
3. Completed assignments remain mixed by due date; best-score badge remains visible.
4. Homework page styling is kid-friendly: larger typography, playful icons, and colorful, rounded primary buttons.

---

### Phase 5: BFA Quality & Performance

**Goal:** Fix confirmed bugs in the forced-alignment pipeline, pre-store canonical phonemes, collapse serial HTTP calls into single `/analyze` endpoint, add per-phoneme colored feedback strip, harden service with input validation and configurable thresholds, replace Azure PA SDK with self-hosted Groq ASR + local phonemizer scoring.
**Mode:** mvp
**Depends on:** Phase 4

**Requirements:**

- BFA-01: Fix `similar` phoneme ops missing timestamps
- BFA-02: Store canonical espeak phonemes on the `Word` model; game service passes stored phonemes instead of `[]`
- BFA-03: Preload models on startup; `/health` reports model load status
- BFA-04: New `/analyze` endpoint combines transcription + alignment in one request
- BFA-05: Student phonics result screen shows per-phoneme colored chips (green/yellow/red/gray)

**Success Criteria:**

1. `similar` phoneme ops return `start`/`end`/`duration` populated.
2. Word creation pre-computes and stores espeak phonemes; no espeak at request time for known words.
3. Phonics game flow makes exactly one HTTP call to BFA service.
4. Student sees phoneme feedback chips colored by correctness status.
5. BFA service uses Groq Whisper API for ASR + local phonemizer — no GPU required.

**Plans:**

- [x] 05-01-PLAN.md — Python BFA service: fix similar-timestamp bug + startup warm-up + `/analyze` endpoint (Wave 1)
- [x] 05-02-PLAN.md — Prisma Word.phonemes + BfaAnalyzeResult DTO + BfaService.analyze + single-call rewrite (Wave 2)
- [x] 05-03-PLAN.md — Frontend PhonemeChips component (4 states) + session results wiring + /analyze parallelization (Wave 3)
- [x] 05-04-PLAN.md — pytest unit tests (pure functions) + NestJS Jest spec (axios mock) (Wave 4)
- [x] 05-05-PLAN.md — Input validation + shared ThreadPoolExecutor + configurable operational thresholds (Wave 5)
- [x] 05-06-PLAN.md — Replace BFA engine with Azure Pronunciation Assessment SDK (Wave 6)
- [ ] 05-07-PLAN.md — Rebuild BFA service: revert Azure → Groq ASR + local phonemizer/espeak scoring, zero GPU (Wave 7)

---

### Phase 6: Admin Portal

**Goal:** Super-admin can log in via a separate /admin route, manage all teacher accounts (create/edit/disable), and view/manage all classes, homeworks, sessions, and student results across the entire platform.
**Mode:** mvp

**Requirements:**

- ADMIN-01: Single admin account seeded via env vars (ADMIN_EMAIL, ADMIN_PASSWORD), login via POST /admin/auth/login, separate JWT
- ADMIN-02: Admin can create teacher accounts (email, password, name, phone number)
- ADMIN-03: Admin can edit and disable/enable teacher accounts
- ADMIN-04: Admin can view all classes across all teachers, edit class info, delete class
- ADMIN-05: Admin can delete any homework or session
- ADMIN-06: Admin can view all students and their homework results across the platform
- ADMIN-07: Admin dashboard shows platform-wide stats (teacher count, class count, student count, submission count)

**Success Criteria:**

1. Admin logs in at /admin/login with env-seeded credentials; sees dashboard with platform stats.
2. Admin creates a new teacher account with name, email, phone, password — teacher can immediately log in.
3. Admin disables a teacher account — that teacher cannot log in until re-enabled.
4. Admin views all classes filtered by teacher; edits a class name; deletes a class.
5. Admin views all students and can drill into any student's homework result.

**Plans:**

- [ ] 06-01-PLAN.md — Schema: ADMIN role + User.email/name/phone/disabled + Class.teacherId + AdminGuard + ensureAdminUser seed (Wave 1)
- [ ] 06-02-PLAN.md — POST /admin/auth/login endpoint + frontend /admin/login page + middleware guard (Wave 1)
- [ ] 06-03-PLAN.md — Teacher CRUD: GET/POST/PATCH /admin/teachers + frontend teacher management page (Wave 2)
- [ ] 06-04-PLAN.md — Classes view: GET /admin/classes (filter by teacher) + PATCH/DELETE + frontend page (Wave 3)
- [ ] 06-05-PLAN.md — Students view: GET /admin/students drill-in to results + frontend page (Wave 3)
- [ ] 06-06-PLAN.md — Homework/session delete: DELETE /admin/homework/:id + DELETE /admin/students/sessions/:id (Wave 4)

---

## Milestone v2 — Enhanced Assessment Quality

> **Source:** STATEGY.MD technical report (May 2026) — Vietnamese elementary English assessment stack.
> Phases 7–9 address the three highest-ROI gaps between current MVP and production-quality assessment.

---

### Phase 7: BFA Robustness & Audio Quality Gates

**Goal:** Eliminate silent failures — every submission either scores correctly or returns a meaningful, actionable error message instead of score 0. Address STATEGY.MD §2 "Missing Requirements" and §12 Critical Risk.
**Mode:** mvp
**Depends on:** Phase 5 (plan 07 complete)

**Requirements:**

- BFA-06: Audio length gate — reject clips shorter than 0.5s or longer than 15s; client shows specific "recording too short/long" error
- BFA-07: Audio gain normalization — normalize input audio to consistent loudness level before ASR to handle cheap tablet vs. good mic variance
- BFA-08: Energy/noise gate — if RMS energy or SNR below threshold, return `"recording_too_noisy"` error; client shows "mic quá ồn, thử lại" instead of score 0
- BFA-09: ASR confidence gate — if Groq returns empty transcript or gibberish (no recognizable words), return `"speech_not_detected"`; client shows "không nghe rõ, nói lại nhé"
- BFA-10: Language mixing detection — if transcribed text contains >50% non-English tokens (langdetect), return `"wrong_language"`; client shows "please speak in English"

**Success Criteria:**

1. Submitting a 0.3s clip returns HTTP 400 with `error: "audio_too_short"` — no score computed.
2. Submitting audio recorded in a noisy environment (SNR < 10dB) returns `"recording_too_noisy"` — student sees actionable message, not 0/100.
3. Submitting silence returns `"speech_not_detected"` — no score stored.
4. Submitting Vietnamese speech returns `"wrong_language"` — student sees language prompt.
5. All existing passing phonics tests still pass after audio gates added.

**Plans:** 2 plans

- [x] 07-01-PLAN.md — bfa-service: all 5 audio gates (length / loudnorm / RMS / ASR confidence / langdetect) + pytest suite (Wave 1)
- [x] 07-02-PLAN.md — Backend BFA error forwarding (DTO + axios 400 catch) + frontend amber error display per gate code (Wave 2)

---

### Phase 8: Vocabulary by Image Exercise

**Goal:** Teacher creates vocabulary homework with image prompts; student sees the image and says the word; system scores pronunciation using the existing BFA phonics pipeline and stores per-word phoneme feedback.
**Mode:** mvp
**Depends on:** Phase 5, Phase 7
**Source:** STATEGY.MD Exercise 4 — Vocabulary by Image

**Requirements:**

- VOCAB-01: Teacher can create a Vocabulary homework: upload one image per item, assign the expected word label per image
- VOCAB-02: Teacher can sequence multiple image-word items (up to 10) in one homework
- VOCAB-03: Student opens vocab homework, sees image, presses record, speaks the word, receives phoneme feedback chips identical to phonics game
- VOCAB-04: System distinguishes phonetically close confusions (e.g., "cat" vs "cap") — `similar` phonemes shown in yellow, not green
- VOCAB-05: Teacher views per-student per-item score breakdown in results page

**Success Criteria:**

1. Teacher creates a vocabulary homework with 3 images and assigns word labels — homework appears in class list with type VOCABULARY.
2. Student completes all items in sequence; result screen shows per-word score + phoneme chips.
3. Score stored per item in DB; teacher sees which images each student struggled with.
4. Phonetically close substitution (cat→cap: /k æ t/ vs /k æ p/) shows `p` as yellow (similar to `t`), not red.

**Plans:**

- [ ] 08-01-PLAN.md — Schema: HomeworkType.VOCABULARY + VocabItem model (imageUrl, word, phonemes) + Prisma migration (Wave 1)
- [ ] 08-02-PLAN.md — Backend: VOCAB CRUD endpoints + game service VOCAB branch (reuse BFA analyze pipeline) + result storage (Wave 2)
- [ ] 08-03-PLAN.md — Teacher creation page: VOCABULARY type picker + image upload + word label per item + sequence reorder (Wave 3)
- [ ] 08-04-PLAN.md — Student game: image display → record → phoneme feedback chips (reuse PhonemeChips component) → next item flow (Wave 4)
- [ ] 08-05-PLAN.md — Teacher results: per-item score breakdown + phoneme detail drill-in (Wave 5)

---

### Phase 9: Listen & Answer Exercise

**Goal:** Teacher creates Q&A homework with audio prompts; student listens then records an answer; system scores semantic correctness against expected keywords and pronunciation on key words; composite score stored.
**Mode:** mvp
**Depends on:** Phase 5, Phase 7
**Source:** STATEGY.MD Exercise 2 — Listen and Answer

**Requirements:**

- LISTEN-01: Teacher creates Q&A homework: upload or generate audio prompt + specify expected keywords/answer
- LISTEN-02: Teacher can sequence multiple Q&A items (up to 10) per homework
- LISTEN-03: Student listens to audio prompt, records answer, submits
- LISTEN-04: System transcribes student answer via Groq ASR
- LISTEN-05: System scores semantic similarity between student answer and expected keywords using sentence-transformers (all-MiniLM-L6-v2, CPU, <50ms)
- LISTEN-06: System scores pronunciation on matched key words via BFA pipeline
- LISTEN-07: Composite score = semantic × 0.7 + pronunciation × 0.3, stored per item
- LISTEN-08: Teacher views per-student transcript + semantic score + pronunciation score breakdown

**Success Criteria:**

1. Teacher creates homework with 2 Q&A items — each has audio prompt and expected keywords.
2. Student hears prompt, records "Red." for expected "The cat is red." — semantic similarity score > 0.6 (accepts truncated child answers).
3. Student hears prompt, records entirely wrong answer — score < 0.3.
4. Teacher sees per-item breakdown: transcript, semantic score, pronunciation score, composite.
5. sentence-transformers model loads on bfa-service startup; no cold-start penalty after first request.

**Plans:**

5/5 plans complete

- [x] 09-02-PLAN.md — bfa-service: add sentence-transformers MiniLM + `/score-semantic` endpoint + composite scoring logic (Wave 2)
- [x] 09-03-PLAN.md — Backend: LISTEN CRUD endpoints + game service LISTEN branch (transcribe → semantic score → BFA pronunciation) + result storage (Wave 3)
- [x] 09-04-PLAN.md — Teacher creation page: LISTEN type picker + audio upload/TTS + keyword field + sequence reorder (Wave 4)
- [x] 09-05-PLAN.md — Student game: audio player → record answer → submit → composite result screen (Wave 5)
- [ ] 09-06-PLAN.md — Teacher results: transcript + semantic + pronunciation + composite per item (Wave 6)

---

### Phase 10: Azure Pronunciation Assessment Engine

**Goal:** Replace Groq ASR + espeak G2P scoring in bfa-service with Azure Pronunciation Assessment REST API.
Delivers real per-phoneme timestamps from forced acoustic alignment and acoustically-calibrated accuracy scores.
All audio gates (Phase 7), NestJS BfaService, and frontend unchanged — same DTO shapes.
**Mode:** mvp
**Depends on:** Phase 5, Phase 7

**Why now:** Phase 8 (Vocabulary) and Phase 9 (Listen & Answer) both rely on phoneme feedback quality.
Azure PA gives higher accuracy than text-based G2P comparison before those exercises ship.

**Comparison: Groq+espeak (current) vs Azure PA (new)**

| Dimension | Groq+espeak | Azure PA |
|-----------|-------------|----------|
| Phoneme scores | Text edit-distance heuristic | Acoustic model (actual audio) |
| Timestamps | Estimated (evenly distributed) | Real forced alignment |
| Phonetic similarity | Custom `_SIMILAR_PAIRS` list | AccuracyScore 50–79 |
| Cost | ~$0.01/hr Groq | ~$1/hr Azure |
| Dependencies | phonemizer + espeak-ng | requests only (REST) |

**Requirements:**

- BFA-11: Azure PA REST API replaces Groq ASR + espeak G2P; per-phoneme AccuracyScore maps to correct/similar/substituted/missing
- BFA-12: All 5 audio gates (BFA-06 through BFA-10) preserved unchanged
- BFA-13: DTO shapes for /analyze, /analyze-speaking, /transcribe unchanged — NestJS and frontend zero changes

**Success Criteria:**

1. Student says "cat" correctly — all phoneme chips green; score ≥ 80 from Azure acoustic model.
2. Student says "cap" for "cat" — `t` phoneme chip shows yellow or red based on Azure score; score < 80.
3. All 5 audio gate errors still fire (too short, too long, noisy, not detected, wrong language).
4. `cd bfa-service && pytest test_bfa.py` passes with mocked Azure calls.
5. `GROQ_API_KEY` removed from bfa-service; `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` added.

**Plans:**

- [x] 10-01-PLAN.md — bfa-service: Azure PA REST client + score mapping + remove Groq/espeak + update tests

---

### Phase 11: Frontend Refactor with React MUI

**Goal:** Refactor frontend UI layer to a standardized React + Material UI architecture for consistency, maintainability, and faster feature delivery across teacher, student, and admin surfaces.
**Mode:** mvp
**Depends on:** Phase 3, Phase 4, Phase 6

**Requirements:**

- FE-01: Introduce shared Material UI theme (palette, typography, spacing, component variants) and apply globally
- FE-02: Replace ad-hoc core UI primitives (buttons, inputs, dialogs, tables, badges) with reusable MUI-based shared components
- FE-03: Refactor key teacher flows (homework creation, assignment, dashboard tables) to MUI components without behavior regressions
- FE-04: Refactor student homework list and gameplay shell layouts to MUI while preserving current UX rules
- FE-05: Refactor admin portal pages to MUI data-entry and table patterns with consistent validation/error states

**Success Criteria:**

1. Frontend has a single source of truth theme and no duplicated page-level styling tokens for core primitives.
2. Existing teacher, student, and admin core flows remain functionally equivalent after migration.
3. All migrated pages pass existing lint/build checks and manual smoke test checklist.
4. New screens can be scaffolded from shared MUI components without introducing one-off style systems.

**Plans:** 5/5 plans complete

- [x] 11-01-PLAN.md — MUI install + base/student theme + root & game ThemeProviders + remove Tailwind/shadcn + delete components/ui (Wave 1)
- [x] 11-02-PLAN.md — Teacher area: TeacherShell + 10 teacher pages + ReadingCreationPage (dnd-kit wrapper -> Paper) + shake keyframe (Wave 2, depends 11-01)
- [x] 11-03-PLAN.md — Student/game area: 4 game components + 4 game pages + login DatePicker; gradients/minWidth/shake preserved (Wave 2, depends 11-01)
- [x] 11-04-PLAN.md — Admin area: AdminShell + admin login + 5 admin pages (Dialog/Table/Alert) + full build gate (Wave 2, depends 11-01)

---

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPEAK-01 | Phase 1 | Complete |
| SPEAK-02 | Phase 1 | Complete |
| SPEAK-03 | Phase 1 | Complete |
| SPEAK-04 | Phase 1 | Complete |
| SPEAK-05 | Phase 1 | Complete |
| SPEAK-06 | Phase 1 | Complete |
| SPEAK-07 | Phase 1 | Complete |
| READ-01 | Phase 2 | Pending |
| READ-02 | Phase 2 | Pending |
| READ-03 | Phase 2 | Pending |
| READ-04 | Phase 2 | Complete |
| READ-05 | Phase 2 | Complete |
| READ-06 | Phase 2 | Complete |
| READ-07 | Phase 3 | Complete |
| TEACH-01 | Phase 3 | Complete |
| TEACH-02 | Phase 3 | Complete |
| TEACH-03 | Phase 3 | Complete |
| TEACH-04 | Phase 3 | Complete |
| TEACH-05 | Phase 3 | Complete |
| STUDENT-01 | Phase 4 | Complete |
| STUDENT-02 | Phase 4 | Complete |
| STUDENT-03 | Phase 4 | Complete |
| BFA-01 | Phase 5 | Complete |
| BFA-02 | Phase 5 | Complete |
| BFA-03 | Phase 5 | Complete |
| BFA-04 | Phase 5 | Complete |
| BFA-05 | Phase 5 | Complete |
| BFA-06 | Phase 7 | Pending |
| BFA-07 | Phase 7 | Pending |
| BFA-08 | Phase 7 | Pending |
| BFA-09 | Phase 7 | Pending |
| BFA-10 | Phase 7 | Pending |
| VOCAB-01 | Phase 8 | Pending |
| VOCAB-02 | Phase 8 | Pending |
| VOCAB-03 | Phase 8 | Pending |
| VOCAB-04 | Phase 8 | Pending |
| VOCAB-05 | Phase 8 | Pending |
| LISTEN-01 | Phase 9 | Pending |
| LISTEN-02 | Phase 9 | Pending |
| LISTEN-03 | Phase 9 | Pending |
| LISTEN-04 | Phase 9 | Pending |
| LISTEN-05 | Phase 9 | Pending |
| LISTEN-06 | Phase 9 | Pending |
| LISTEN-07 | Phase 9 | Pending |
| LISTEN-08 | Phase 9 | Pending |
| ADMIN-01 | Phase 6 | Pending |
| ADMIN-02 | Phase 6 | Pending |
| ADMIN-03 | Phase 6 | Pending |
| ADMIN-04 | Phase 6 | Pending |
| ADMIN-05 | Phase 6 | Pending |
| ADMIN-06 | Phase 6 | Pending |
| ADMIN-07 | Phase 6 | Pending |

| BFA-11 | Phase 10 | Pending |
| BFA-12 | Phase 10 | Pending |
| BFA-13 | Phase 10 | Pending |

| LAND-01 | Phase 13 | Pending |
| LAND-02 | Phase 13 | Pending |
| LAND-03 | Phase 13 | Pending |
| LAND-04 | Phase 13 | Pending |
| LAND-05 | Phase 13 | Pending |
| LAND-06 | Phase 13 | Pending |
| LAND-07 | Phase 13 | Pending |
| LAND-08 | Phase 13 | Pending |
| LAND-09 | Phase 13 | Pending |
| LAND-10 | Phase 13 | Pending |

**v1 Coverage:** 26/26 requirements mapped ✓
**v2 Coverage:** 18/18 requirements mapped ✓
**v3 Coverage:** 10/10 requirements mapped ✓

---

> **Post-v2 Deferred:** Whisper fine-tuning on Vietnamese children's English data (STATEGY.MD §7 Priority 1). Requires collecting 10–20h labeled audio from school partnerships — non-trivial data effort. Track separately. Expected improvement: WER 35% → 18%.

---

---

### Phase 12: Multi-Subdomain Split

**Goal:** Split the single Next.js app into three subdomain entry points using middleware-based routing: `admin.*` (admin portal), `app.*` (teacher dashboard), `student.*` (student game). Single codebase, three deployment targets with security isolation, separate auth flows, and per-role JS bundles.
**Mode:** mvp
**Depends on:** Phase 6, Phase 11

**Requirements:**

- SUBDOMAIN-01: Next.js middleware reads `Host` header and rewrites routing to admin/teacher/student entry points per subdomain
- SUBDOMAIN-02: Each subdomain serves only the routes appropriate for that role (admin.* cannot serve /teacher routes, etc.)
- SUBDOMAIN-03: Each subdomain has its own login page with role-appropriate auth flow
- SUBDOMAIN-04: JWT cookies are scoped per subdomain to prevent token bleed between roles
- SUBDOMAIN-05: Local development works without real subdomain DNS (configurable fallback)
- SUBDOMAIN-06: Docker Compose updated with subdomain-aware configuration

**Success Criteria:**

1. Visiting `admin.katie.vn` serves the admin portal and rejects teacher/student JWT tokens.
2. Visiting `app.katie.vn` serves the teacher dashboard and rejects admin/student JWT tokens.
3. Visiting `student.katie.vn` serves the student game and rejects admin/teacher JWT tokens.
4. Local dev can access all three entry points without DNS changes.
5. Build and Docker Compose work with no regression on existing functionality.

**Plans:**
3/3 plans complete

- [x] 12-02-PLAN.md — Cookie auth layer: Next.js API routes (teacher/admin/student-login) + dual-write auth libs + backend student game login endpoint (Wave 2, depends 12-01)
- [x] 12-03-PLAN.md — Login pages (teacher-only, student class-code) + 403/404 error pages + game/admin/teacher layout 403 guards (Wave 3, depends 12-02)

---

### Phase 13: Landing Page

**Goal:** Marketing website tại katie.vn giới thiệu lớp tiếng Anh cô Katie cho phụ huynh — tĩnh, tiếng Việt, giao diện xanh blue tươi sáng.
**Mode:** mvp
**Depends on:** Phase 12 (subdomain middleware)

**Requirements:**

- LAND-01: Trang hiển thị tại katie.vn (root domain) qua middleware Phase 12
- LAND-02: Section Hero — tagline, ảnh, mô tả lớp học
- LAND-03: Section Profile giáo viên — ảnh cô Katie, kinh nghiệm, bằng cấp
- LAND-04: Section Kết quả học sinh — before/after stories + điểm thi học kì + danh hiệu cuộc thi
- LAND-05: Section Testimonials — carousel phụ huynh đánh giá (5-6 quotes)
- LAND-06: Section Giới thiệu phần mềm — feature list + screenshots platform
- LAND-07: CTA/Liên hệ — Zalo link + số điện thoại
- LAND-08: Responsive desktop + mobile
- LAND-09: SEO metadata đầy đủ — Next.js metadata API, OpenGraph (Facebook/Zalo preview), sitemap.xml, robots.txt
- LAND-10: Semantic HTML + JSON-LD structured data (EducationalOrganization), ảnh dùng next/image, LCP < 2.5s

**Success Criteria:**

1. Truy cập katie.vn hiển thị landing page (không phải teacher dashboard hay student game).
2. Tất cả 6 sections hiển thị đầy đủ, không lỗi trên desktop và mobile.
3. Testimonials carousel tự động chạy, có thể click chuyển slide.
4. Nút Zalo mở Zalo chat đúng số.
5. Giao diện xanh blue, tươi sáng, không giống corporate.
6. Google Search Console crawl không lỗi; og:image preview đúng khi share link lên Facebook/Zalo.
7. Lighthouse SEO score ≥ 90.

**Plans:** 1/3 plans executed

- [x] 13-01-PLAN.md — Middleware rewrite katie.vn → /marketing + marketing route scaffold + SEO metadata (layout, sitemap, robots, JSON-LD) (Wave 1)
- [ ] 13-02-PLAN.md — Hero, Teacher Profile, Student Results, Testimonials carousel — top half of landing page (Wave 2, depends 13-01)
- [ ] 13-03-PLAN.md — Software section, CTA/Contact banner, wire all 6 sections, dev:marketing script + human verify (Wave 3, depends 13-02)

---

---

### Phase 14: Game Responsive Layout

**Goal:** Make all /game/ pages (homework list, login, phonics/speaking session, reading game, vocab game, listen game) fully responsive for mobile (≥320px), tablet/iPad (≥768px), and desktop (≥1024px), preserving the purple dark-mode aesthetic.
**Mode:** mvp
**Depends on:** Phase 11 (MUI refactor)

**Requirements:**

- RESP-01: /game/homework page is responsive on mobile, iPad, and desktop — centered maxWidth card on desktop, full-width on mobile
- RESP-02: /game/login page is responsive on all viewports (already partially done — verify and fix remaining gaps)
- RESP-03: /game/session/[id] phonics+speaking game layout is responsive on all viewports
- RESP-04: /game/reading/[id] reading game is responsive (match-pair grid, fill-blank layout)
- RESP-05: /game/vocab/[id] vocab game is responsive (image display, record button)
- RESP-06: /game/listen/[id] listen game is responsive (audio player, record section)
- RESP-07: layout.tsx background SVG decoration uses viewport-relative coordinates (no hardcoded 420px cx)
- RESP-08: All interactive elements (buttons, record button, pairs) have ≥44px touch targets on mobile
- RESP-09: Typography and padding scale correctly — no horizontal overflow on 320px viewport

**Success Criteria:**

1. All 6 /game/ pages render without horizontal scroll on a 375px (iPhone) viewport.
2. All 6 /game/ pages render with centered card layout and appropriate padding on a 768px (iPad) viewport.
3. All 6 /game/ pages render with correct desktop centering and maxWidth on a 1440px viewport.
4. Record button and interactive game elements have touch targets ≥44px on mobile.
5. Background SVG adapts to viewport width without clipping.

**Plans:**

- [ ] 14-01-PLAN.md — layout.tsx SVG responsive + homework page responsive layout (Wave 1)
- [ ] 14-02-PLAN.md — session/[id] phonics+speaking + vocab/[id] + listen/[id] responsive layout (Wave 2)
- [ ] 14-03-PLAN.md — reading/[id] responsive layout + login page polish + cross-page smoke test (Wave 2)

---

---

### Phase 15: Tuition Management

**Goal:** Xây dựng hệ thống quản lý học phí — cấu hình học phí theo lớp, tự động tạo phiếu thu hàng tháng, gửi thông báo qua Zalo ZNS, ghi nhận đóng tiền, và báo cáo đóng học phí.
**Mode:** mvp

**Requirements:**

- TUITION-01: Admin/Teacher cấu hình học phí theo lớp (VNĐ/buổi + tiền sách tùy chọn)
- TUITION-02: Hệ thống tính học phí tháng = số buổi trong tháng × đơn giá + tiền sách (nếu có)
- TUITION-03: Admin/Teacher thiết lập hạn đóng học phí (ngày trong tháng)
- TUITION-04: Hệ thống tự động tạo phiếu thu học phí cho từng học sinh theo tháng
- TUITION-05: Admin/Teacher ghi nhận đóng học phí thủ công (PAID / chưa đóng / quá hạn)
- TUITION-06: Hệ thống gửi thông báo qua Zalo ZNS đến phụ huynh (số điện thoại từ ParentInfo)
- TUITION-07: Báo cáo học phí: lọc theo lớp/tháng, trạng thái đóng (đã đóng / chưa đóng / quá hạn)

**Success Criteria:**

1. Admin cấu hình lớp A: 100,000 VNĐ/buổi + 50,000 VNĐ tiền sách — cấu hình lưu và hiển thị đúng.
2. Nhấn "Tạo phiếu thu tháng 7/2026" cho lớp A — hệ thống tạo phiếu cho từng học sinh trong lớp với số tiền = số buổi × 100,000 + 50,000.
3. Admin gửi thông báo ZNS — phụ huynh nhận Zalo message với tên con, số tiền, hạn đóng.
4. Admin đánh dấu học sinh đã đóng — trạng thái chuyển PAID, hiển thị đúng trong báo cáo.
5. Báo cáo tháng 7 lớp A hiển thị danh sách: đã đóng/chưa đóng/quá hạn với tổng tiền.

**Plans:**

1/4 plans executed

- [ ] 15-02-PLAN.md — Backend: TuitionModule (config CRUD, record generation, ZaloZnsService, payment mark, report, unit tests) (Wave 2)
- [ ] 15-03-PLAN.md — Frontend admin/teacher: config form + generate records + payment dialog + ZNS modal (Wave 3)
- [ ] 15-04-PLAN.md — Frontend: TuitionReportTable (filter/totals/status badges) wired into admin + teacher pages (Wave 3)

---

*Roadmap created: 2026-05-13*
*Last updated: 2026-06-19 — Phase 15 added: Tuition Management (Zalo ZNS)*
