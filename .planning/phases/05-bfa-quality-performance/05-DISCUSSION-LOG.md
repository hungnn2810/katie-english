# Phase 5: BFA Quality & Performance — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 05-bfa-quality-performance
**Areas discussed:** Phase 5 verification gate, Plan 05-03 readiness, Teacher sessions page

---

## Phase 5 Verification Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Block on live test | Execute 05-03 code tasks, then pause at Task 4 human checkpoint. Don't mark complete until Docker stack is up and all 4 chip variants verified live. | ✓ |
| Ship code, defer live test | Execute 05-03 code tasks, mark phase done when tsc + build pass. Skip Docker checkpoint — flag as known-untested. | |

**User's choice:** Block on live test
**Notes:** Phase completion requires live verification of all four chip color variants (correct/similar/substituted+extra/missing). DB push + seed runs during Task 4 session when Docker is back up.

---

## Plan 05-03 Readiness

### DB Push Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Run DB push before executing 05-03 | Start Docker, run npx prisma db push + db seed first. | |
| Execute 05-03 without DB push | Run 05-03 Tasks 1-3 now (tsc + build). DB push deferred to human checkpoint session. | ✓ |

**User's choice:** Execute 05-03 without DB push first
**Notes:** Frontend code does not depend on DB state. DB push happens during live Task 4 verification.

### Arrow Notation Style

| Option | Description | Selected |
|--------|-------------|----------|
| ASCII `->` (Plan 05-03) | Safer across fonts. Plan explicitly chose this over Unicode. | ✓ |
| Unicode `→` (current page.tsx) | Matches existing inline chip code. More visually polished. | |

**User's choice:** ASCII `->` as specified in Plan 05-03
**Notes:** Consistency with the plan decision. Current page.tsx inline uses `→` but that code is being replaced.

---

## Teacher Sessions Page

### Disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Commit standalone, outside Phase 5 | Standalone feat(teacher) commit. Phase 5 plans unchanged. | |
| Fold into Phase 5 as bonus deliverable | Commit as part of 05-03 execution. Update CONTEXT.md scope. | ✓ |
| Leave untracked for now | Don't commit yet — work in progress. | |

**User's choice:** Fold into Phase 5 as bonus deliverable
**Notes:** The page is complete and functional. Commits alongside Plan 05-03.

### Nav Wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, wire into nav now | Add 'Sessions' link to teacher nav. | ✓ |
| No, direct URL is fine for now | Skip nav wiring — accessible at /teacher/sessions. | |

**User's choice:** Yes, wire into nav
**Notes:** Discovered during discussion that nav is ALREADY wired — TeacherShell.tsx line 13 has the Sessions entry and layout.tsx has the title. No additional work required.

---

## Claude's Discretion

- PhonemeChips file naming: `PhonemeChips.tsx` (follows plan spec exactly)
- Tailwind class literals must be static strings for JIT detection (per plan)
- `'use client'` not needed on PhonemeChips (inherits from parent page.tsx)
- Named + default export on PhonemeChips (per plan's established convention)

## Deferred Ideas

- Phoneme audio playback (tap chip to hear) — future v2
- Backfilling existing Word rows with espeak phonemes — espeak fallback covers it
- Sentence-level BFA (multi-word alignment) — separate future phase
