# Requirements: Katie English

**Defined:** 2026-05-13
**Core Value:** A student can receive a homework assignment, complete it on a tablet, and get an immediate AI-scored result — without the teacher needing to manually grade anything.

## v1 Requirements

### Speaking Homework

- [ ] **SPEAK-01**: Teacher can create speaking homework in free-speak mode (image prompt, student speaks freely)
- [ ] **SPEAK-02**: Teacher can create speaking homework in script-matching mode (target text shown, student reads/repeats)
- [ ] **SPEAK-03**: Student can record video submission for speaking homework
- [ ] **SPEAK-04**: Student can record audio-only as alternative to video
- [ ] **SPEAK-05**: System submits recording to WhisperX, stores transcript
- [ ] **SPEAK-06**: System scores transcript against expected result and stores score
- [ ] **SPEAK-07**: Teacher can view speaking session result (score + transcript)

### Reading Homework

- [ ] **READ-01**: Teacher can create image-word matching activity (upload images, assign word labels)
- [ ] **READ-02**: Teacher can create fill-in-blank activity (paragraph/sentence with gaps, multiple-choice word options)
- [ ] **READ-03**: Teacher can freely sequence matching and fill-in-blank activities within one homework
- [ ] **READ-04**: Student completes image-word matching by click-to-pair (click image, click word)
- [ ] **READ-05**: Student answers fill-in-blank by selecting from provided word choices
- [ ] **READ-06**: System scores reading activities deterministically and stores result
- [ ] **READ-07**: Teacher can view reading session score breakdown per activity

### Teacher Dashboard

- [ ] **TEACH-01**: Teacher can create any homework type (phonics/speaking/reading) from a unified creation flow
- [ ] **TEACH-02**: Teacher can assign homework to one or more classes with a due date
- [ ] **TEACH-03**: Teacher can view homework list with submission counts and assignment status
- [ ] **TEACH-04**: Teacher can see per-student session results for any homework assignment
- [ ] **TEACH-05**: Teacher can review individual student attempt (score breakdown + recording playback for audio types)

### Student UX

- [ ] **STUDENT-01**: Student homework list shows assignments ordered by due date
- [ ] **STUDENT-02**: All student game screens function correctly on tablet/phone (touch-first, minimum 44px touch targets)

## v2 Requirements

### Progress & Analytics

- **ANALYTICS-01**: Teacher can view class-level score trends over time
- **ANALYTICS-02**: Teacher can export student results as CSV

### Gamification

- **GAME-01**: Student earns stars/points on homework completion
- **GAME-02**: Student can view personal progress history

### Notifications

- **NOTIF-01**: Student receives notification when new homework is assigned
- **NOTIF-02**: Teacher receives notification when student completes homework

## Out of Scope

| Feature | Reason |
|---------|--------|
| LLM-based scoring (GPT/Claude) | Keep existing WhisperX + BFA pipeline; LLM adds cost/latency with no clear accuracy benefit for phonics |
| Multi-teacher accounts | Single teacher for now; multi-teacher adds auth complexity not needed yet |
| Parent portal | Not requested; parents receive info through teacher |
| Student self-registration | Teacher manages all student accounts |
| Reading comprehension Q&A | Not requested; reading homework is matching + fill-in-blank only |
| Desktop-primary UI | Target is young children on tablet; desktop can work but is not optimized |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPEAK-01 | — | Pending |
| SPEAK-02 | — | Pending |
| SPEAK-03 | — | Pending |
| SPEAK-04 | — | Pending |
| SPEAK-05 | — | Pending |
| SPEAK-06 | — | Pending |
| SPEAK-07 | — | Pending |
| READ-01 | — | Pending |
| READ-02 | — | Pending |
| READ-03 | — | Pending |
| READ-04 | — | Pending |
| READ-05 | — | Pending |
| READ-06 | — | Pending |
| READ-07 | — | Pending |
| TEACH-01 | — | Pending |
| TEACH-02 | — | Pending |
| TEACH-03 | — | Pending |
| TEACH-04 | — | Pending |
| TEACH-05 | — | Pending |
| STUDENT-01 | — | Pending |
| STUDENT-02 | — | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 0 (updated during roadmap creation)
- Unmapped: 21 ⚠️

---
*Requirements defined: 2026-05-13*
*Last updated: 2026-05-13 after initial definition*
