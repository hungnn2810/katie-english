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
| 4 | Student UX Polish | Tablet-first UI, ordered homework list | STUDENT-01–02 | 3 |

---

### Phase 1: Speaking Homework

**Goal:** Teacher creates speaking homework in either mode, student records video/audio, system transcribes and scores, teacher views result.
**Mode:** mvp

**Requirements:**
- SPEAK-01: Teacher can create speaking homework in free-speak mode (image prompt)
- SPEAK-02: Teacher can create speaking homework in script-matching mode (target text)
- SPEAK-03: Student can record video submission for speaking homework
- SPEAK-04: Student can record audio-only as alternative to video
- SPEAK-05: System submits recording to WhisperX, stores transcript
- SPEAK-06: System scores transcript against expected result and stores score
- SPEAK-07: Teacher can view speaking session result (score + transcript)

**Success Criteria:**
1. Teacher creates a speaking homework in free-speak mode with an image prompt and it appears in the assigned class's homework list.
2. Student opens speaking homework, records a video, submits — system generates and stores a score without manual intervention.
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

---

### Phase 3: Teacher Dashboard

**Goal:** Teacher can create any homework type from a single flow, assign to classes, and drill into per-student results including recording playback.
**Mode:** mvp

**Requirements:**
- READ-07: Teacher can view reading session score breakdown per activity
- TEACH-01: Teacher can create any homework type (phonics/speaking/reading) from a unified creation flow
- TEACH-02: Teacher can assign homework to one or more classes with a due date
- TEACH-03: Teacher can view homework list with submission counts and assignment status
- TEACH-04: Teacher can see per-student session results for any homework assignment
- TEACH-05: Teacher can review individual student attempt (score breakdown + recording playback for audio types)

**Success Criteria:**
1. Teacher reaches homework creation from one entry point and can select phonics, speaking, or reading type.
2. Teacher assigns a homework to two classes simultaneously with a single action.
3. Homework list page shows submission count (e.g., "5/12 submitted") for each assignment.
4. Teacher opens a student's attempt and sees per-item score breakdown; for speaking/phonics, audio/video playback is available inline.

---

### Phase 4: Student UX Polish

**Goal:** All student-facing game screens work correctly on tablet/phone with touch-first UI; homework list is properly ordered.
**Mode:** mvp
**Plans:** 1 plan

**Requirements:**
- STUDENT-01: Student homework list shows assignments ordered by due date
- STUDENT-02: All student game screens function correctly on tablet/phone (touch-first, minimum 44px touch targets)

> **Phase-context note (2026-05-14, per 04-CONTEXT.md D-01):** Student device target was revised during the discuss-phase to **laptop/PC only**. STUDENT-02 is satisfied by retaining the existing `minWidth: 1024` constraint on the game screens; no tablet/phone or touch-target work is performed in this phase. The original goal text above is preserved for historical traceability; the implementation contract is in `.planning/phases/04-student-ux-polish/04-CONTEXT.md`.

**Plans:**
- [x] 04-01-PLAN.md — Sort student homework list by endDate ascending and add Overdue badge variant

**Success Criteria:**
1. Homework list orders assignments by ascending due date; overdue items visually distinct.
2. All interactive elements on phonics, speaking, and reading game screens have touch targets ≥ 44px verified on a physical tablet or 768px viewport.
3. No game screen relies on hover-only state for core interactions.

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
| READ-04 | Phase 2 | Pending |
| READ-05 | Phase 2 | Pending |
| READ-06 | Phase 2 | Pending |
| READ-07 | Phase 3 | Pending |
| TEACH-01 | Phase 3 | Pending |
| TEACH-02 | Phase 3 | Pending |
| TEACH-03 | Phase 3 | Pending |
| TEACH-04 | Phase 3 | Pending |
| TEACH-05 | Phase 3 | Pending |
| STUDENT-01 | Phase 4 | Pending |
| STUDENT-02 | Phase 4 | Pending |

**Coverage:** 21/21 v1 requirements mapped ✓

---
*Roadmap created: 2026-05-13*
*Last updated: 2026-05-14 — Phase 4 plans created*
