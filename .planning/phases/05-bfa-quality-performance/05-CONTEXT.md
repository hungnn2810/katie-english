# Phase 5: BFA Quality & Performance — Context

**Gathered:** 2026-05-19
**Status:** Ready for planning
**Source:** Direct codebase review (review session 2026-05-19)

<domain>
## Phase Boundary

This phase targets the BFA (Bounded Forced Alignment) pipeline: the Python FastAPI service at `bfa-service/main.py`, the NestJS bridge at `backend/src/bfa/bfa.service.ts`, and the student phonics result UI in `frontend/`. It does NOT touch other homework types (speaking, reading), authentication, or the teacher dashboard.

Deliverables:
- 3 bug fixes in the Python BFA service
- 1 Prisma schema change (phonemes column on Word)
- 1 new Python endpoint + TS client update
- 1 frontend phoneme feedback component

</domain>

<decisions>
## Implementation Decisions

### D-01: Fix `similar` timestamp assignment (BFA-01)
Add `"similar"` to the `if op["status"] in (...)` check at `bfa-service/main.py:465`.
Currently `similar` ops — which come from a diagonal DP move (consuming one aligned phoneme) — never receive `start`/`end`/`duration`. This is a one-line fix.
**LOCKED.**

### D-02: Phoneme DB column on Word model (BFA-02)
Add nullable `String` field `phonemes` (serialized JSON array of simplified phoneme symbols) to the `Word` model in `prisma/schema.prisma`. Populate via `espeak_phonemes()` call during word creation/update. Game service passes the stored array to `bfa.align()` instead of `[]`.
- Field type: `String?` (nullable — words added before this migration have null; game service falls back to `[]` → espeak if null)
- No backfill migration required at phase boundary; espeak fallback remains functional
**LOCKED.**

### D-03: Model warm-up on startup (BFA-03)
On FastAPI startup, call `get_whisperx_model()` and `get_aligner()` eagerly using a `@app.on_event("startup")` handler (or `lifespan` pattern for FastAPI ≥0.93). Add a threading `Lock` around the `_whisperx_model` global to prevent race on `BFA_CONCURRENCY > 1`.
`/health` already returns `"whisperx": _whisperx_model is not None` — no change needed there.
**LOCKED.**

### D-04: New `/analyze` endpoint (BFA-04)
New endpoint `POST /analyze` in the Python service accepts `audio`, `word`, `expected_phonemes` (same as `/align`) plus runs WhisperX transcription internally — returns combined result with both `transcription.text` and the existing align fields (`phonemes`, `score`, `feedback`, `word`).
NestJS `BfaService.analyze()` replaces the two sequential calls (`transcribe` + `align`). Game service phonics handler (`submitPhonicsAnswer`) calls `bfa.analyze()` once.
Keep `/align` and `/transcribe` intact for backward compatibility.
**LOCKED.**

### D-05: Frontend phoneme feedback chips (BFA-05)
Student phonics result screen (current location: `frontend/app/game/phonics/` — confirm exact path) adds a `PhonemeChips` component below the score display. Each chip shows the phoneme `symbol` and is colored:
- Green (`correct`) — phoneme matched
- Yellow (`similar`) — acoustically close (e.g. /l/ for /r/)
- Red (`substituted`, `missing`, `extra`) — wrong or absent
Data source: `bfa` field on the phonics submit response (already returned by game service as `{ ...result, bfa: bfaResult }`).
**LOCKED.**

### D-06: BfaAlignResult DTO update
Add `espeak_fallback?: boolean` to `BfaAlignResult` in `backend/src/bfa/bfa.dto.ts`. Add new `BfaAnalyzeResult` interface extending `BfaAlignResult` with `transcription: { text: string }`.
**LOCKED.**

### Claude's Discretion
- Exact wave breakdown and plan count
- Whether to add a `@app.lifespan` context manager or `@app.on_event("startup")` (both acceptable; lifespan preferred for FastAPI ≥0.93)
- Whether `/analyze` runs transcription always or only when `expected_phonemes` is empty
- Component file naming and styling tokens for `PhonemeChips`
- Exact Prisma migration name

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### BFA Python Service
- `bfa-service/main.py` — Full service (546 lines). Bugs at lines 465, 399-401 (espeak fallback), 336-342 (model init). New `/analyze` endpoint goes here.
- `bfa-service/Dockerfile` — Python deps and startup command

### NestJS BFA Bridge
- `backend/src/bfa/bfa.service.ts` — TS client (44 lines). `align()` and `transcribe()` calls.
- `backend/src/bfa/bfa.dto.ts` — `BfaAlignResult`, `WhisperXResult` interfaces
- `backend/src/bfa/bfa.module.ts` — Module wiring

### Game Service (BFA consumer)
- `backend/src/game/game.service.ts` — `submitPhonicsAnswer` at ~line 86 passes `[]` as expected phonemes, calls transcribe + align sequentially
- `backend/src/game/game.service.spec.ts` — Existing BFA mock tests

### Prisma Schema
- `backend/prisma/schema.prisma` — `Word` model (add `phonemes String?`)

### Frontend Phonics Result
- `frontend/app/game/phonics/` — Phonics game screens (confirm exact result page path)
- Existing game screen patterns: `frontend/app/game/reading/` for component style reference

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

### Phoneme chip colors
- `correct` → green (Tailwind: `bg-green-100 text-green-800` or project color tokens)
- `similar` → yellow (`bg-yellow-100 text-yellow-800`)
- `substituted` / `extra` → red (`bg-red-100 text-red-800`)
- `missing` → gray dashed outline (`border-2 border-dashed border-gray-400 text-gray-400`)

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
*Context gathered: 2026-05-19 via direct codebase review*
