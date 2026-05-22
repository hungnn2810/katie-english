---
plan_id: 01-04
phase: "01"
plan: "04"
subsystem: backend-scoring, frontend-session
tags:
  - scoring
  - levenshtein
  - word-boundary
  - frontend
  - tests
  - free-speak
dependency_graph:
  requires:
    - 01-03  # game.service.spec.ts must exist before calcFreeSpeak block appended
  provides:
    - D-05   # calcFreeSpeak word-boundary + fuzzy matching
    - D-16   # FREE_SPEAK student result screen
  affects:
    - backend/src/game/game.scoring.ts
    - backend/src/game/game.service.spec.ts
    - frontend/app/game/session/[id]/page.tsx
tech_stack:
  added: []
  patterns:
    - word-boundary regex with regex-special-char escaping (13 metacharacters)
    - Levenshtein similarity fallback at >= 0.75 threshold
    - per-token fuzzy match using whitespace split
    - conditional JSX rendering by speakingMode
key_files:
  created: []
  modified:
    - backend/src/game/game.scoring.ts
    - backend/src/game/game.service.spec.ts
    - frontend/app/game/session/[id]/page.tsx
decisions:
  - "matchesKeyword uses \\b word-boundary regex (not Unicode lookbehind) per plan spec — simpler, no 'u' flag needed for the simple boundary case"
  - "Fuzzy stage uses transcript.toLowerCase().split(/\\s+/) directly rather than existing tokenize() helper, which strips non-letter chars and would alter kw comparison"
  - "Frontend SessionItem gains optional matchedWords/totalWords; handleSpeakingUpload sources them from SpeakingResult (already had the fields)"
  - "admin-api.ts SpeakingResult already had matchedWords/totalWords — no interface change needed"
metrics:
  duration_seconds: ~600
  completed_date: "2026-05-22"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
  files_created: 0
---

# Phase 01 Plan 04: Wave 2 scoring + result — D-05 calcFreeSpeak word-boundary+fuzzy, D-16 FREE_SPEAK student result screen Summary

**One-liner:** Word-boundary regex + Levenshtein >= 0.75 fuzzy fallback in calcFreeSpeak (closes D-05); FREE_SPEAK result screen now shows speaking image + "Keywords matched: N/N" without leaking the keyword list (closes D-16).

## Tasks Completed

| Task | Title | Commit | Files |
|------|-------|--------|-------|
| T-01 | D-05: matchesKeyword helper + calcFreeSpeak update | `031821d` | `backend/src/game/game.scoring.ts` |
| T-02 | D-05 tests: calcFreeSpeak describe block | `19c98bb` | `backend/src/game/game.service.spec.ts` |
| T-03 | D-16: FREE_SPEAK result screen update | `a72e773` | `frontend/app/game/session/[id]/page.tsx` |

## Diff Stats

- `backend/src/game/game.scoring.ts`: +14 lines, -4 lines (matchesKeyword helper, updated filter)
- `backend/src/game/game.service.spec.ts`: +66 lines, -1 line (calcFreeSpeak import + 9 test cases)
- `frontend/app/game/session/[id]/page.tsx`: +21 lines, -2 lines (SessionItem fields + handleSpeakingUpload + results card)

## Code Locations After Edits

### game.scoring.ts

- `matchesKeyword` helper: lines 65–76 (private, file-scoped, not exported)
- Stage 1 (word-boundary regex): line 67 — `new RegExp(\`\\b${escaped}\\b\`, 'i').test(transcript)`
- Stage 2 (Levenshtein fuzzy): lines 68–74 — `sim >= 0.75` gate
- `calcFreeSpeak` filter update: line 88 — `kws.filter((kw) => matchesKeyword(text, kw))`
- Regex escape: line 66 — `/[.*+?^${}()|[\]\\]/g` covers 13 metacharacters

### frontend/app/game/session/[id]/page.tsx

- `SessionItem` interface (matchedWords/totalWords fields): lines 23–24
- `handleSpeakingUpload` items setter (matchedWords/totalWords): lines 366–367
- Speaking results card (FREE_SPEAK vs SCRIPT_MATCH conditional): lines 557–586 (approximately)
  - Mode label: `"🎤 Speaking · Free Speak"` / `"🎤 Speaking · Script Match"` with `font-bold`
  - FREE_SPEAK picture: `<img src={item.pictureUrl} alt="Speaking prompt" ... />`
  - SCRIPT_MATCH item.text guard: `speakHw?.speakingMode !== 'FREE_SPEAK'` wraps the text div
  - Keywords matched: conditional below transcript for FREE_SPEAK

## Test Results

### calcFreeSpeak (9 cases — all pass)

```
cd backend && npx jest game.service.spec.ts -t calcFreeSpeak --no-coverage
Tests: 9 passed, 9 total
```

Test cases:
1. Empty keyword list → score=0, matchedWords=0, totalWords=0
2. Word-boundary exact match ("cat" in "I have a cat at home") → matchedWords=1, score=100
3. FALSE-POSITIVE GUARD: "catapult" does NOT match keyword "cat" → matchedWords=0, score=0
4. Fuzzy hit: "elephnt" vs "elephant" (sim=0.875 >= 0.75) → matchedWords=1
5. Fuzzy miss: "set" vs "sit" (sim=0.666 < 0.75) → matchedWords=0
6. Case-insensitive: "The Cat sat down" vs "cat" → matchedWords=1
7. Regex special char: "cat." keyword does not throw; fuzzy hits at sim=0.75 exactly → matchedWords=1
8. Partial multi-keyword: "cat, sits, mat" in "the cat is on the mat" → matchedWords=2, totalWords=3, score=67
9. Empty transcript with non-empty keywords → matchedWords=0, totalWords=2, score=0

### Full game.service.spec.ts (no regressions)

```
Tests: 59 passed, 59 total
```

### TypeScript

```
cd backend && tsc --noEmit → exit 0 (PASS)
cd frontend && tsc --noEmit → exit 0 (PASS)
```

## Notes on admin-api.ts

`SpeakingResult` interface at `frontend/lib/admin-api.ts` lines 510–517 already had `matchedWords: number` and `totalWords: number` fields. No changes needed. The `SessionItem` interface in `session/[id]/page.tsx` was extended instead with optional `matchedWords?: number` and `totalWords?: number` fields to carry these values to the results card.

## Deviations from Plan

### Minor — Pre-existing Unicode word-boundary implementation replaced

**Found during:** T-01 read-first step

**Issue:** The existing `calcFreeSpeak` already had a Unicode lookbehind regex approach (`(?<![\\p{L}])${escaped}(?![\\p{L}])`) from a previous edit, rather than the bare `text.includes(kw)` described in the plan's context. The plan's `interfaces` section described `text.includes(kw)` as the "broken line" to replace.

**Resolution:** The plan's `must_haves` truths and `matchesKeyword` algorithm specification are the authoritative contract. The implementation uses `\\b${escaped}\\b` with 'i' flag (simpler, no Unicode 'u' flag needed) which satisfies all acceptance criteria: false-positive guard for "catapult" passes (word-boundary stops substring match), test suite passes. The Unicode lookbehind was replaced by the simpler `\b`-based approach which is spec-compliant and passes all 9 test cases.

**Files modified:** `backend/src/game/game.scoring.ts`

**Commit:** `031821d`

## Known Stubs

None — all data flows are fully wired:
- `matchedWords`/`totalWords` flow from `SpeakingResult` → `handleSpeakingUpload` → `SessionItem` → results card
- `pictureUrl` flows from `speakHw.speakingPictureUrl` → `SessionItem` → `<img>` in results card
- `speakHw.speakingMode` is initialized via `useEffect` on session load and available at results time (per RESEARCH.md Pitfall 4 — speakHw state is NOT cleared at results time)

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. The `<img src={item.pictureUrl}>` pattern in the results card is consistent with the existing upload-state rendering at line 407 (same URL, same pattern). React JSX auto-escapes string attributes. No incremental threat surface beyond what the plan's threat model already documented.

## Self-Check

Files created/modified:
- [x] `backend/src/game/game.scoring.ts` — exists with `matchesKeyword` helper
- [x] `backend/src/game/game.service.spec.ts` — exists with `calcFreeSpeak` describe block
- [x] `frontend/app/game/session/[id]/page.tsx` — exists with FREE_SPEAK results card

Commits:
- [x] `031821d` — feat(01-04): D-05 matchesKeyword helper
- [x] `19c98bb` — test(01-04): D-05 calcFreeSpeak tests
- [x] `a72e773` — feat(01-04): D-16 FREE_SPEAK result screen

## Self-Check: PASSED
