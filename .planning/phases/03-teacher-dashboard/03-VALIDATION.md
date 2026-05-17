---
phase: 03
slug: teacher-dashboard
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-17
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2 + ts-jest (backend) |
| **Config file** | `backend/package.json` → `"jest"` key |
| **Quick run command** | `cd backend && npx jest --testPathPattern="homework\|game" --no-coverage` |
| **Full suite command** | `cd backend && npx jest --no-coverage` |
| **Estimated runtime** | ~15s quick, ~60s full |

No frontend test framework configured. Frontend validated by `cd frontend && npx tsc --noEmit` + manual browser verification.

---

## Sampling Rate

- **After every task commit:** `cd backend && npx jest --testPathPattern="homework|game" --no-coverage`
- **After every plan wave:** `cd backend && npx jest --no-coverage`
- **Before `/gsd-verify-work`:** Full backend suite green + `cd frontend && npx tsc --noEmit` passes
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | TEACH-01 | T-03-01 | sentenceSegments JSON validated before persist | unit | `cd backend && npx jest homework.service --no-coverage` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | TEACH-01 | — | DB migration idempotent | manual | `cd backend && npx prisma migrate dev --name add_reading_homework` | — | ⬜ pending |
| 03-01-03 | 01 | 1 | TEACH-01 | — | HomeworkType enum synced across 3 files | source | `grep -r "READING" backend/prisma/schema.prisma backend/src/homework/homework.dto.ts frontend/lib/admin-api.ts` | — | ⬜ pending |
| 03-01-04 | 01 | 1 | TEACH-01 | — | Stub specs compile | unit | `cd backend && npx jest homework.service homework.repository game.service --no-coverage` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | TEACH-03 | T-03-09 | Student count query returns correct denominator | unit | `cd backend && npx jest homework.repository --no-coverage` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | TEACH-03 | — | Frontend sum formula correct | source | `grep "ac.class._count?.students" frontend/app/teacher/homework/page.tsx` | — | ⬜ pending |
| 03-02-03 | 02 | 2 | TEACH-04 | — | Non-submitted list renders | manual | Open homework detail, verify non-submitted student names visible | — | ⬜ pending |
| 03-03-01 | 03 | 3 | TEACH-01 | T-03-10 | TypePickerModal renders 3 type cards | source | `grep -r "TypePickerModal" frontend/app/teacher/homework/` | — | ⬜ pending |
| 03-03-02 | 03 | 3 | TEACH-01 | — | Route to /create/reading exists | source | `ls frontend/app/teacher/homework/create/reading/page.tsx` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 4 | TEACH-01 | T-03-11 | createReadingHomework validates min 2 pairs | unit | `cd backend && npx jest homework.service --no-coverage` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 4 | READ-07 | — | Backend returns readingActivities in homework GET | unit | `cd backend && npx jest homework.service --no-coverage` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 4 | TEACH-01 | T-03-12 | Image upload reuses existing endpoint | source | `grep "uploadSpeakingImage\|POST /homework/image" frontend/app/teacher/homework/create/reading/page.tsx` | — | ⬜ pending |
| 03-05-01 | 05 | 5 | TEACH-01 | — | @dnd-kit installed | source | `grep "@dnd-kit/core" frontend/package.json` | — | ⬜ pending |
| 03-05-02 | 05 | 5 | TEACH-01 | T-03-15 | blankIndex sequential after unblank | unit | `cd backend && npx jest homework.service --no-coverage` | ❌ W0 | ⬜ pending |
| 03-05-03 | 05 | 5 | TEACH-01 | — | Drag reorder persists to activities array | manual | Open reading creation, drag activity card, verify order changes | — | ⬜ pending |
| 03-06-01 | 06 | 6 | TEACH-01 | — | Edit page prefills from GET | manual | Navigate to /teacher/homework/[id]/edit, verify fields populated | — | ⬜ pending |
| 03-06-02 | 06 | 6 | TEACH-01 | T-03-20 | Try page client-side only, no API calls | source | `grep -v "fetch\|axios\|req<" frontend/app/teacher/homework/\[id\]/try/page.tsx` | — | ⬜ pending |
| 03-07-01 | 07 | 7 | READ-07 | T-03-25 | completeSession READING computes avg score | unit | `cd backend && npx jest game.service --no-coverage` | ❌ W0 | ⬜ pending |
| 03-07-02 | 07 | 7 | TEACH-04 | — | sessionInclude includes readingActivityResults | source | `grep "readingActivityResults" backend/src/game/game.repository.ts` | — | ⬜ pending |
| 03-07-03 | 07 | 7 | TEACH-05 | T-03-28 | Session detail shows collapsible reading cards | manual | Open student session, verify reading activities expand/collapse | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/homework/homework.service.spec.ts` — stubs for TEACH-01 (createReadingHomework, min-2-pairs validation, blankIndex re-index)
- [ ] `backend/src/homework/homework.repository.spec.ts` — stubs for TEACH-03 (assignmentInclude student count)
- [ ] Extend `backend/src/game/game.service.spec.ts` — add READING session mock + completeSession READING branch test (READ-07, TEACH-04/05)
- [ ] `frontend/app/teacher/homework/create/reading/` directory + stub `page.tsx`
- [ ] Install `@dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2` in `frontend/`
- [ ] Prisma migration: `cd backend && npx prisma migrate dev --name add_reading_homework`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop activity reorder feels smooth | TEACH-01 | Visual/interaction quality — no test harness | Open `/teacher/homework/create/reading`, drag activity handle (≡), verify order updates |
| Image upload via MinIO succeeds | TEACH-01 | External service in dev environment | Upload matching-pair image, verify URL persists + image renders in editor |
| Recording playback inline | TEACH-05 | Browser audio API — no test harness | Open student attempt with audio type, click play, verify playback |
| Non-submitted student list accuracy | TEACH-04 | Requires live class enrollment data | Create homework, assign to class with 3 students, have 1 submit; verify 2 shown as not submitted |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
