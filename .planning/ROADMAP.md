# Roadmap: Katie English

**Milestone:** v1 — Complete Homework Platform
**Project Mode:** Vertical MVP (end-to-end feature slices)
**Requirements:** 21 v1 requirements across 4 phases

---

## Phase Overview

| # | Phase | Goal | Requirements | Criteria |
|---|-------|------|--------------|----------|
| 1 | Speaking Homework | 1/1 | Complete    | 2026-05-13 |
| 2 | Reading Homework | Student matches + fills blanks, score stored | READ-01–06 | 4 |
| 3 | Teacher Dashboard | Unified creation, assignment, results review | READ-07, TEACH-01–05 | 4 |
| 4 | Student Page UI/UX | Student homework page UI/UX polish | STUDENT-01–02 | 3 |

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
**Plans:** 7 plans

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
**Plans:** 1 plan

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

**Goal:** Fix three confirmed bugs in the forced-alignment pipeline, pre-store canonical phonemes on the Word model to eliminate per-request espeak fallback, preload AI models on startup to remove cold-start latency, collapse the two serial HTTP calls (transcribe + align) into a single `/analyze` endpoint, and add a per-phoneme colored feedback strip on the student phonics result screen.
**Mode:** mvp
**Depends on:** Phase 4
**Plans:** 3 plans

**Requirements:**
- BFA-01: Fix `similar` phoneme ops missing timestamps (feedback loop includes "similar" in timestamp assignment)
- BFA-02: Store canonical espeak phonemes on the `Word` model; game service passes stored phonemes instead of `[]`
- BFA-03: Preload WhisperX and PhonemeTimestampAligner on startup; `/health` reports model load status
- BFA-04: New `/analyze` endpoint combines transcription + alignment in one request; TS client updated; game service collapses two calls into one
- BFA-05: Student phonics result screen shows per-phoneme colored chips (green=correct, yellow=similar, red=wrong/missing) using timestamps from `/analyze`

**Success Criteria:**
1. Submitting a phonics recording where a phoneme is acoustically "similar" (e.g. /l/ for /r/) returns that op with `start`/`end`/`duration` populated and `status: "similar"`.
2. Word creation endpoint pre-computes and stores espeak phonemes; `/align` (or `/analyze`) never hits espeak at request time for words already in DB.
3. First `/analyze` request after cold start completes in under 5 seconds (models pre-warmed at startup).
4. Phonics game flow makes exactly one HTTP call to BFA service (not two).
5. Student sees phoneme feedback chips on the result screen — each chip labeled with the phoneme symbol and colored by correctness status.

**Plans:**
- [ ] 05-01-PLAN.md — Python BFA service: fix similar-timestamp bug (D-01/BFA-01) + startup warm-up & threading lock (D-03/BFA-03) + new POST /analyze endpoint (D-04/BFA-04) (Wave 1)
- [ ] 05-02-PLAN.md — Prisma Word.phonemes column + db push [BLOCKING] + BfaAnalyzeResult DTO + BfaService.analyze + savePhonicsResult single-call rewrite + spec update (D-02/D-04/D-06, BFA-02/BFA-04) (Wave 2)
- [ ] 05-03-PLAN.md — Frontend PhonemeChips component (correct/similar/wrong/missing) + session/[id] results wiring + human verification (D-05/BFA-05) (Wave 3)

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

---

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPEAK-01 | Phase 1 | Pending |
| SPEAK-02 | Phase 1 | Pending |
| SPEAK-03 | Phase 1 | Pending |
| SPEAK-04 | Phase 1 | Pending |
| SPEAK-05 | Phase 1 | Pending |
| SPEAK-06 | Phase 1 | Pending |
| SPEAK-07 | Phase 1 | Pending |
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
| STUDENT-01 | Phase 4 | Pending |
| STUDENT-02 | Phase 4 | Pending |
| BFA-01 | Phase 5 | Pending |
| BFA-02 | Phase 5 | Pending |
| BFA-03 | Phase 5 | Pending |
| BFA-04 | Phase 5 | Pending |
| BFA-05 | Phase 5 | Pending |

**Coverage:** 26/26 v1 requirements mapped ✓

---
*Roadmap created: 2026-05-13*
*Last updated: 2026-05-19 — Phase 5 plans (05-01/05-02/05-03) registered*
