---
phase: 01
slug: speaking-homework
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-14
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (NestJS backend) |
| **Config file** | `backend/package.json` (jest config) |
| **Quick run command** | `cd backend && npx jest game.service.spec.ts --no-coverage` |
| **Full suite command** | `cd backend && npx jest --no-coverage` |
| **Estimated runtime** | ~30 seconds (quick), ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest game.service.spec.ts --no-coverage`
- **After every plan wave:** Run `cd backend && npx jest --no-coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-02-T-01 | 01-02 | 1 | SPEAK-05, SPEAK-06 | D-21 | 413 rejection on >100MB body before WhisperX runs | manual+assert | `grep -c 'MAX_TRANSCRIBE_SIZE' bfa-service/main.py` returns ≥1 | ✅ | ⬜ pending |
| 01-02-T-02 | 01-02 | 1 | SPEAK-05 | D-23 | espeak runs in thread, event loop not blocked | source assert | `grep -c 'asyncio.to_thread' bfa-service/main.py` returns 1 | ✅ | ⬜ pending |
| 01-03-T-01 | 01-03 | 1 | — | D-22 | MIME mapping returns correct extension per type | source assert | `grep -c 'mimeToExt\|audio/m4a' backend/src/bfa/bfa.service.ts` returns ≥1 | ✅ | ⬜ pending |
| 01-03-T-02 | 01-03 | 1 | — | D-24 | Stale migration folders absent from repo | CLI | `ls backend/prisma/migrations/2026050[7-9]* 2>/dev/null` returns empty | ❌ W0 | ⬜ pending |
| 01-03-T-03 | 01-03 | 1 | — | D-12, D-18 | Untracked files committed and clean | CLI | `git status --porcelain backend/src/homework/image.controller.ts` returns empty | ✅ | ⬜ pending |
| 01-04-T-01 | 01-04 | 2 | SPEAK-06 | D-05 | Word-boundary regex prevents "catapult" matching "cat"; fuzzy catches transcription errors | unit | `cd backend && npx jest game.service.spec.ts -t "calcFreeSpeak" --no-coverage` | ❌ W0 | ⬜ pending |
| 01-04-T-02 | 01-04 | 2 | — | D-05 | Test cases pass for exact, partial, fuzzy, boundary | unit | `cd backend && npx jest game.service.spec.ts -t "calcFreeSpeak" --no-coverage` exits 0 | ❌ W0 | ⬜ pending |
| 01-04-T-03 | 01-04 | 2 | SPEAK-03 | D-16 | FREE_SPEAK result screen shows image prompt + "Keywords matched: N/N" | source assert | `grep -c 'matchedWords\|Keywords matched' frontend/app/game/session/[id]/page.tsx` ≥1 | ✅ | ⬜ pending |
| 01-05-T-01 | 01-05 | 3 | SPEAK-07 | D-13 | POST /game/homework/:id/try-speak endpoint exists with FileInterceptor | source assert | `grep -c 'try-speak' backend/src/game/game.controller.ts` returns ≥1 | ✅ | ⬜ pending |
| 01-05-T-02 | 01-05 | 3 | SPEAK-07 | D-14 | trySpeakingHomework makes 0 DB write calls | unit | `cd backend && npx jest game.service.spec.ts -t "trySpeakingHomework" --no-coverage` exits 0 | ❌ W0 | ⬜ pending |
| 01-05-T-03 | 01-05 | 3 | SPEAK-07 | D-15 | try/page.tsx uses file-upload flow, no SpeechRecognition | source assert | `grep -c 'SpeechRecognition\|webkitSpeechRecognition' frontend/app/teacher/homework/[id]/try/page.tsx` returns 0 | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/game/game.service.spec.ts` — add `describe('calcFreeSpeak', ...)` test cases (D-05 word-boundary, fuzzy, exact, boundary guard)
- [ ] `backend/src/game/game.service.spec.ts` — add `describe('GameService.trySpeakingHomework', ...)` block (D-14 no-DB-write contract)

*`bfa.service.spec.ts` for D-22 MIME mapping is optional — low risk, skip if spec file does not exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| BFA /transcribe returns {text} only (no words[]) | D-20 | No backend unit test for HTTP shape | `curl -X POST .../transcribe -F "audio=@test.wav" \| jq 'has("words")'` must print `false` |
| Teacher try page shows "Preview Mode — Results not saved" banner | D-15 | Frontend UI verification | Open `/teacher/homework/:id/try`, upload a file, confirm banner is visible before and after submission |
| FREE_SPEAK result screen image prompt visible | D-16 | Frontend UI verification | Complete a FREE_SPEAK session, confirm image appears above score on result screen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING (❌) references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
