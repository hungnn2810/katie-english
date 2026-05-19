# Phase 5: BFA Quality & Performance — Context

**Gathered:** 2026-05-19 (updated 2026-05-19)
**Status:** Ready for planning
**Source:** Direct codebase review (review session 2026-05-19) + discussion session 2026-05-19

<domain>
## Phase Boundary

This phase targets the BFA (Bounded Forced Alignment) pipeline: the Python FastAPI service at `bfa-service/main.py`, the NestJS bridge at `backend/src/bfa/bfa.service.ts`, and the student phonics result UI in `frontend/`. It does NOT touch other homework types (speaking, reading), authentication, or the teacher dashboard.

Deliverables:
- 3 bug fixes in the Python BFA service ✓ DONE (Plan 05-01)
- 1 Prisma schema change (phonemes column on Word) ✓ DONE (Plan 05-02)
- 1 new Python endpoint + TS client update ✓ DONE (Plans 05-01 + 05-02)
- 1 frontend phoneme feedback component (Plan 05-03)
- 1 teacher sessions overview page — folded in as bonus deliverable (Plan 05-03)
- Unit test coverage for BFA pipeline — Python pytest + NestJS Jest (Plan 05-04)

**Implementation status (as of 2026-05-19):**
- Plan 05-01 (Python BFA): COMPLETE
- Plan 05-02 (NestJS bridge + DB): COMPLETE (DB push deferred — Docker paused)
- Plan 05-03 (Frontend): NOT STARTED
- Plan 05-04 (Unit tests): NOT STARTED

</domain>

<decisions>
## Implementation Decisions

### D-01: Fix `similar` timestamp assignment (BFA-01)
Add `"similar"` to the `if op["status"] in (...)` check at `bfa-service/main.py:465`.
Currently `similar` ops — which come from a diagonal DP move (consuming one aligned phoneme) — never receive `start`/`end`/`duration`. This is a one-line fix.
**LOCKED. DONE.**

### D-02: Phoneme DB column on Word model (BFA-02)
Add nullable `String` field `phonemes` (serialized JSON array of simplified phoneme symbols) to the `Word` model in `prisma/schema.prisma`. Populate via `espeak_phonemes()` call during word creation/update. Game service passes the stored array to `bfa.align()` instead of `[]`.
- Field type: `String?` (nullable — words added before this migration have null; game service falls back to `[]` → espeak if null)
- No backfill migration required at phase boundary; espeak fallback remains functional
**LOCKED. DONE.** (DB push pending — run `npx prisma db push && npx prisma db seed` when Docker unpaused)

### D-03: Model warm-up on startup (BFA-03)
On FastAPI startup, call `get_whisperx_model()` and `get_aligner()` eagerly using FastAPI `lifespan` context manager (not deprecated `@app.on_event`). Added threading `Lock` around `_whisperx_model` global to prevent race on `BFA_CONCURRENCY > 1`.
`/health` returns `"aligner": get_aligner.cache_info().currsize > 0` in addition to whisperx status.
**LOCKED. DONE.**

### D-04: New `/analyze` endpoint (BFA-04)
New endpoint `POST /analyze` in the Python service accepts `audio`, `word`, `expected_phonemes` (same as `/align`) plus runs WhisperX transcription internally — returns combined result with both `transcription.text` and the existing align fields (`phonemes`, `score`, `feedback`, `word`).
NestJS `BfaService.analyze()` replaces the two sequential calls (`transcribe` + `align`). Game service phonics handler (`submitPhonicsAnswer`) calls `bfa.analyze()` once.
Alignment logic extracted to `_run_alignment()` shared helper (no duplication between `/align` and `/analyze`).
Keep `/align` and `/transcribe` intact for backward compatibility.
**LOCKED. DONE.**

### D-05: Frontend phoneme feedback chips (BFA-05)
Student phonics result screen adds a `PhonemeChips` component below the score display. Each chip shows the phoneme `symbol` and is colored:
- Green (`correct`) — `bg-green-100 text-green-800`
- Yellow (`similar`) — `bg-yellow-100 text-yellow-800`
- Red (`substituted`, `extra`) — `bg-red-100 text-red-800`
- Gray dashed (`missing`) — `border-2 border-dashed border-gray-400 text-gray-400`
- `error` status — SKIPPED (service-level failure, not phoneme-level)
Arrow notation: ASCII `->` (NOT Unicode `→`) for substituted chips.
Data source: `bfa` field on the phonics submit response.
**LOCKED. PENDING (Plan 05-03).**

### D-06: BfaAlignResult DTO update
Add `espeak_fallback?: boolean` to `BfaAlignResult` in `backend/src/bfa/bfa.dto.ts`. Add new `BfaAnalyzeResult` interface extending `BfaAlignResult` with `transcription: { text: string }`.
**LOCKED. DONE.**

### D-07: Teacher sessions overview page (bonus deliverable)
`frontend/app/teacher/sessions/page.tsx` (already built, untracked) is folded into Phase 5 as a bonus deliverable. Commit it alongside Plan 05-03.
- Filter by student + assignment, expandable rows, shows phonics word results + speaking results + score badges
- Nav wiring: ALREADY DONE — `TeacherShell.tsx` line 13 has `{ href: '/teacher/sessions', label: 'Sessions', icon: '🎬' }` and `layout.tsx` has `/teacher/sessions` in TITLES map
- No additional nav changes required — just commit the page file
**LOCKED. PENDING (commit with Plan 05-03).**

### D-09: Unit test scope (Plan 05-04)
Python pytest (`bfa-service/test_bfa.py`) covers pure functions only — `score_alignment`, `_phoneme_cost`, `normalize_ipa`, `error_payload`. External deps stubbed via `sys.modules` before `import main` (MagicMock for whisperx, bournemouth_aligner, fastapi, prometheus_client). Runs without Docker.
NestJS Jest (`backend/src/bfa/bfa.service.spec.ts`) covers `analyze()`, `align()`, `transcribe()` — mock axios, verify endpoint URL, timeout, FormData field construction.
D-01 regression guard: `test_score_alignment_similar_status_d01_regression` locks the similar-status fix.
**LOCKED.**

### D-08: Plan 05-03 execution sequencing
- Execute 05-03 Tasks 1-3 (tsc + build validation) WITHOUT waiting for DB push. Frontend code does not depend on DB state.
- After code tasks pass: pause at Task 4 human checkpoint for live Docker verification.
- Phase is NOT marked complete until all 4 chip variants verified live (correct/similar/substituted+extra/missing).
- DB push + seed runs during the Task 4 verification session when Docker Desktop is unpaused.
**LOCKED.**

### Claude's Discretion
- Exact wave breakdown and plan count (original)
- Whether to add a `@app.lifespan` context manager or `@app.on_event("startup")` → chose lifespan (done)
- Component file naming and styling tokens for `PhonemeChips` (follow D-05 Tailwind classes exactly)
- Exact Prisma migration name

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### BFA Python Service
- `bfa-service/main.py` — Full service. Bugs fixed at lines 465, model init. `/analyze` endpoint added. `_run_alignment` shared helper extracted.
- `bfa-service/test_bfa.py` — Python pytest suite (NEW in Plan 05-04). Pure function tests, no external deps.
- `bfa-service/Dockerfile` — Python deps and startup command

### NestJS BFA Bridge
- `backend/src/bfa/bfa.service.ts` — TS client. `align()`, `transcribe()`, and new `analyze()` calls.
- `backend/src/bfa/bfa.dto.ts` — `BfaAlignResult` (+ `espeak_fallback?`), `BfaAnalyzeResult` (+ `transcription`), `WhisperXResult` interfaces
- `backend/src/bfa/bfa.module.ts` — Module wiring
- `backend/src/bfa/bfa.service.spec.ts` — NestJS Jest spec (NEW in Plan 05-04). Mock axios, test analyze/align/transcribe.

### Game Service (BFA consumer)
- `backend/src/game/game.service.ts` — `savePhonicsResult` now calls `bfa.analyze()` once with stored phonemes
- `backend/src/game/game.service.spec.ts` — BFA mock tests updated for single-call flow

### Prisma Schema
- `backend/prisma/schema.prisma` — `Word` model has `phonemes String?`
- `backend/prisma/seed.ts` — Populates cat/dog/ship phonemes via `JSON.stringify`

### Frontend Phonics Result (Plan 05-03)
- `frontend/app/game/session/[id]/page.tsx` — Current inline chip rendering (lines 538-551) to be replaced by `<PhonemeChips>`
- `frontend/app/game/session/[id]/_components/PhonemeChips.tsx` — NEW component (to be created)
- `frontend/lib/admin-api.ts` — `BfaResult` interface (lines 552-558) to gain optional `transcription?` + `espeak_fallback?` fields
- `frontend/app/game/reading/_components/` — Style reference for component co-location pattern

### Teacher Sessions Page (D-07, bonus deliverable)
- `frontend/app/teacher/sessions/page.tsx` — Built, untracked. Commit alongside Plan 05-03.
- `frontend/components/TeacherShell.tsx` — Nav already wired (line 13: Sessions entry). No changes needed.
- `frontend/app/teacher/layout.tsx` — TITLES map already has `/teacher/sessions`. No changes needed.

</canonical_refs>

<specifics>
## Specific Implementation Notes

### Bug D-01 (1 line)
```
# bfa-service/main.py:465
# Change:
if op["status"] in ("correct", "substituted", "extra") and aligned_idx < len(aligned_phonemes):
# To:
if op["status"] in ("correct", "similar", "substituted", "extra") and aligned_idx < len(aligned_phonemes):
```

### `/analyze` response shape
```json
{
  "success": true,
  "transcription": { "text": "cat" },
  "phonemes": [...],
  "score": 85,
  "feedback": [...],
  "word": "cat",
  "espeak_fallback": false
}
```

### Phoneme chip colors (D-05)
- `correct` → green: `bg-green-100 text-green-800`
- `similar` → yellow: `bg-yellow-100 text-yellow-800`
- `substituted` / `extra` → red: `bg-red-100 text-red-800`
- `missing` → gray dashed outline: `border-2 border-dashed border-gray-400 text-gray-400`
- Substituted arrow: ASCII `->` (NOT Unicode `→`)
- `error` status → skip entirely (return null or filter out)

### DB push pending
```bash
cd backend && npx prisma db push && npx prisma db seed
```
Run when Docker Desktop is unpaused, before Task 4 live verification.

</specifics>

<deferred>
## Deferred Ideas

- Sentence-level BFA (multi-word alignment) — out of scope, single word only
- Phoneme audio playback (tap chip to hear the phoneme) — future v2
- Backfilling existing `Word` rows with espeak phonemes — deferred; fallback handles it
- Replacing espeak with a better G2P model — v2
- BFA_CONCURRENCY > 1 production deployment — out of scope for this phase

</deferred>

---

*Phase: 05-bfa-quality-performance*
*Context gathered: 2026-05-19 via direct codebase review + discussion session 2026-05-19*
