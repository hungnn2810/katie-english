---
phase: 02
slug: reading-homework
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-14
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 |
| **Config file** | `backend/package.json` (jest key) |
| **Quick run command** | `cd backend && npx jest game.service.spec.ts --no-coverage` |
| **Full suite command** | `cd backend && npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest game.service.spec.ts --no-coverage`
- **After every plan wave:** Run `cd backend && npx jest --no-coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-xx-01 | schema | 1 | READ-06 | — | N/A | unit | `cd backend && npx jest game.service.spec.ts --no-coverage -t "reading"` | Wave 0 | ⬜ pending |
| 02-xx-02 | game | 2 | READ-06 | — | N/A | unit | `cd backend && npx jest game.service.spec.ts --no-coverage -t "completeSession READING"` | Wave 0 | ⬜ pending |
| 02-xx-03 | frontend-match | 3 | READ-04 | — | N/A | manual | — | manual-only | ⬜ pending |
| 02-xx-04 | frontend-fill | 3 | READ-05 | — | N/A | manual | — | manual-only | ⬜ pending |
| 02-xx-05 | teacher-create | 3 | READ-01 | — | N/A | manual | — | manual-only | ⬜ pending |
| 02-xx-06 | teacher-create | 3 | READ-03 | — | N/A | manual | — | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/game/game.service.spec.ts` — extend with READING session fixtures and tests for `saveReadingResult` and `completeSession` READING branch

*Existing infrastructure covers backend validation; Wave 0 only extends the existing spec file.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Matching pair lock: correct pair turns green and locks, wrong pair shakes and resets | READ-04 | DOM pointer interaction | Load reading homework with matching activity; click a correct image→word pair; verify green + locked; click wrong pair; verify shake + deselect |
| Fill-blank one-shot: wrong answer advances without retry | READ-05 | DOM interaction | Load fill-blank activity; click wrong choice; verify item marked incorrect + auto-advance (no retry) |
| Bulk image upload creates pair cards | READ-01 | File picker API (non-automatable in Jest) | Upload 3+ images at once on teacher creation page; verify pair cards created with filename pre-filled |
| Activity drag reorder changes sequence | READ-03 | Pointer drag event | Create 2+ activities; drag second activity above first; verify new order persists on save |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
