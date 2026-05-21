---
phase: 05-bfa-quality-performance
verified: 2026-05-21T00:00:00Z
status: human_needed
score: 9/10 must-haves verified
overrides_applied: 0
gaps:
  - truth: "BFA_TRANSCRIPTION_MATCH_THRESHOLD env var controls _transcription_matches_word threshold (default 0.5)"
    status: partial
    reason: "Env var declared at line 52 of main.py but never passed to _transcription_matches_word call sites (lines 669 and 936) or used as the function default. The function signature hardcodes threshold: float = 0.5. Setting BFA_TRANSCRIPTION_MATCH_THRESHOLD=0.7 has no runtime effect."
    artifacts:
      - path: "bfa-service/main.py"
        issue: "_transcription_matches_word(transcription_text, word) called without threshold=TRANSCRIPTION_MATCH_THRESHOLD at line 669 and 936. Function default is literal 0.5, not TRANSCRIPTION_MATCH_THRESHOLD."
    missing:
      - "Change function signature to: def _transcription_matches_word(transcription: str, expected_word: str, threshold: float = TRANSCRIPTION_MATCH_THRESHOLD) -> bool:"
      - "OR pass threshold explicitly at call sites: _transcription_matches_word(transcription_text, word, threshold=TRANSCRIPTION_MATCH_THRESHOLD)"
human_verification:
  - test: "Submit a phonics recording for each chip color variant (correct, similar, wrong, missing) and observe the result screen"
    expected: "Green chip for correct phoneme, yellow for similar (e.g. say 'lat' for 'cat'), red for substituted with arrow notation, gray dashed for missing phoneme"
    why_human: "Visual color rendering and UX cannot be verified from codebase inspection alone. Task 4 of 05-03-PLAN.md is a blocking human checkpoint requiring a live session."
  - test: "Open browser DevTools Network tab, submit one phonics answer, check outbound requests to BFA service"
    expected: "Exactly one POST to /analyze per phonics submission; zero calls to /transcribe or /align"
    why_human: "Network traffic pattern at runtime cannot be confirmed from code alone, only from live observation."
---

# Phase 05: BFA Quality & Performance Verification Report

**Phase Goal:** Fix three confirmed bugs in the forced-alignment pipeline, pre-store canonical phonemes on the Word model to eliminate per-request espeak fallback, preload AI models on startup to remove cold-start latency, collapse the two serial HTTP calls (transcribe + align) into a single /analyze endpoint, and add a per-phoneme colored feedback strip on the student phonics result screen.
**Verified:** 2026-05-21
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | BFA-01: `similar` ops in feedback include `start`/`end`/`duration` timestamps | VERIFIED | `main.py:492` has `("correct", "similar", "substituted", "extra")` tuple; `score_alignment` at line 248 emits `status="similar"` for cost < 1.0; pytest test `test_vietnamese_lr_confusion_d01_regression` passes |
| 2 | BFA-02: `Word.phonemes String?` column persisted in PostgreSQL | VERIFIED | `backend/prisma/schema.prisma:57` has `phonemes String?`; `npx prisma db pull --print` confirms column exists in live DB |
| 3 | BFA-02: Seed populates Word.phonemes with JSON-encoded phoneme arrays | VERIFIED | `backend/prisma/seed.ts:59` uses `JSON.stringify(wordData.phonemes)`; live DB query confirmed `cat` row has `phonemes: '["c","a","t"]'` |
| 4 | BFA-02: savePhonicsResult uses WordRepository.findByText and passes stored phonemes to bfa.analyze | VERIFIED | `game.service.ts:126–137` fetches word record, parses JSON, passes `expectedPhonemes` to `bfa.analyze()`; no `bfa.transcribe` or `bfa.align` calls inside `savePhonicsResult` |
| 5 | BFA-03: WhisperX and aligner preloaded on FastAPI startup via lifespan handler | VERIFIED | `main.py:32–38` defines `@asynccontextmanager async def lifespan` calling `get_whisperx_model()` and `get_aligner()`; `app = FastAPI(lifespan=lifespan)` at line 41 |
| 6 | BFA-03: Threading lock prevents duplicate WhisperX construction under concurrency | VERIFIED | `main.py:299` declares `_whisperx_lock = threading.Lock()`; `get_whisperx_model()` at line 358–367 uses double-checked locking pattern |
| 7 | BFA-03: GET /health returns models_loaded.whisperx and models_loaded.aligner | VERIFIED | `main.py:1012–1014` returns both `"whisperx": _whisperx_model is not None` and `"aligner": get_aligner.cache_info().currsize > 0` |
| 8 | BFA-04: POST /analyze endpoint accepts multipart (audio, word, expected_phonemes) and returns combined response | VERIFIED | `main.py:587–594` defines `@app.post("/analyze")` gated by `REQUEST_SEMAPHORE`; `_analyze_impl` at line 597–621 validates all inputs; response includes `transcription` key |
| 9 | BFA-04: NestJS BfaService.analyze() posts to /analyze with correct fields and 120_000ms timeout; savePhonicsResult uses single call | VERIFIED | `bfa.service.ts:44–62` has `async analyze()` posting to `${baseUrl}/analyze` with `timeout: 120_000`; `game.service.ts:149` calls `this.bfa.analyze()`; both `bfa.transcribe` and `bfa.align` absent from `savePhonicsResult` function body |
| 10 | BFA-05: PhonemeChips component renders four-state colored chips on student phonics result screen | VERIFIED (code) | `PhonemeChips.tsx` exists with `bg-green-100`, `bg-yellow-100`, `bg-red-100`, `border-dashed` classes; wired in `page.tsx:554`; old two-color inline rendering removed; human verification required for live rendering |
| 11 | 05-05: Module-level THREAD_POOL replaces per-request ThreadPoolExecutor | VERIFIED | `main.py:56` declares `THREAD_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=2)`; grep confirms only one `ThreadPoolExecutor(` call total (module level); lines 658–661 and 922–923 submit to `THREAD_POOL` directly |
| 12 | 05-05: BFA_MAX_WORD_LENGTH and BFA_MAX_TARGET_TEXT_LENGTH control input validation | VERIFIED | `main.py:49–50` declares both env vars; `_align_impl` at line 402–403 raises HTTP 400 for `len(word) > MAX_WORD_LENGTH`; `_analyze_speaking_impl` at line 997–998 raises HTTP 400 for `len(target_text) > MAX_TARGET_TEXT_LENGTH` |
| 13 | 05-05: BFA_ENERGY_THRESHOLD_DB controls has_sufficient_energy threshold | VERIFIED | `main.py:51` declares `ENERGY_THRESHOLD_DB`; `has_sufficient_energy` signature at line 277 uses `threshold_db: float = ENERGY_THRESHOLD_DB` |
| 14 | 05-05: BFA_TRANSCRIPTION_MATCH_THRESHOLD controls _transcription_matches_word threshold | PARTIAL/FAILED | Env var declared at line 52, but `_transcription_matches_word` at line 685 hardcodes `threshold: float = 0.5`. Call sites at lines 669 and 936 do not pass `TRANSCRIPTION_MATCH_THRESHOLD`. Setting the env var has no runtime effect. |

**Score:** 13/14 truths verified (1 partial)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bfa-service/main.py` | Bug-fixed alignment + warmed models + /analyze endpoint | VERIFIED | All required functions and endpoints present; 37 pytest tests pass |
| `backend/prisma/schema.prisma` | Word.phonemes nullable String column | VERIFIED | `phonemes String?` at line 57; confirmed in live DB via `db pull` |
| `backend/src/bfa/bfa.dto.ts` | BfaAnalyzeResult + espeak_fallback on BfaAlignResult | VERIFIED | `BfaAlignResult.espeak_fallback?: boolean` at line 37; `BfaAnalyzeResult extends BfaAlignResult` at line 40 |
| `backend/src/bfa/bfa.service.ts` | analyze() method | VERIFIED | `async analyze()` at line 44, posts to `/analyze` with timeout 120_000 |
| `backend/src/word/word.repository.ts` | findByText() lookup | VERIFIED | `findByText(text)` at line 42 using `findUnique({ where: { text }, select: { id, text, phonemes } })` |
| `backend/src/game/game.service.ts` | savePhonicsResult single bfa.analyze call | VERIFIED | Single `this.bfa.analyze()` call at line 149; no `bfa.transcribe` or `bfa.align` in the function |
| `frontend/app/game/session/[id]/_components/PhonemeChips.tsx` | Four-state chip component | VERIFIED | File exists; `bg-green-100`, `bg-yellow-100`, `bg-red-100`, `border-dashed` present; `data-testid="phoneme-chips"` and `data-status` attributes present |
| `frontend/app/game/session/[id]/page.tsx` | PhonemeChips wired, old rendering removed | VERIFIED | `import PhonemeChips from './_components/PhonemeChips'` at line 8; `<PhonemeChips feedback={item.bfa.feedback} />` at line 554; old `op.status === 'correct' ?` ternary absent |
| `frontend/lib/admin-api.ts` | BfaResult with optional transcription and espeak_fallback | VERIFIED | `transcription?: { text: string }` at line 559; `espeak_fallback?: boolean` at line 560 |
| `bfa-service/test_bfa.py` | pytest suite for BFA pure functions | VERIFIED | 37 tests pass; D-01 regression guard `test_vietnamese_lr_confusion_d01_regression` present and passing |
| `backend/src/bfa/bfa.service.spec.ts` | Jest unit tests for BfaService | VERIFIED | 13 tests pass; covers analyze/align/transcribe endpoint URLs, timeout values, JSON-stringified fields |
| `backend/src/game/game.service.spec.ts` | Updated spec with bfa.analyze mock + WordRepository | VERIFIED | 45 tests pass; `analyze: jest.fn()` in mock; `WordRepository` mock in all describe blocks; `transcription: { text: ... }` in mock helpers |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| POST /analyze (main.py) | _align_sync + WhisperX transcribe | asyncio.to_thread inside REQUEST_SEMAPHORE | VERIFIED | `main.py:621` calls `asyncio.to_thread(_analyze_sync, ...)`; gated by `async with REQUEST_SEMAPHORE` |
| FastAPI startup | get_whisperx_model() + get_aligner() | lifespan asynccontextmanager | VERIFIED | `main.py:32–38` lifespan handler calls both before yield |
| get_whisperx_model() | threading.Lock | double-checked locking | VERIFIED | `main.py:358–367` uses `_whisperx_lock` with outer and inner None checks |
| game.service.ts savePhonicsResult | word.repository.ts findByText | constructor injection of WordRepository | VERIFIED | `game.module.ts:12` imports `WordModule`; `game.service.ts:14` injects `WordRepository`; call at line 126 |
| game.service.ts savePhonicsResult | bfa.service.ts analyze | this.bfa.analyze() | VERIFIED | `game.service.ts:149` calls `this.bfa.analyze(audioBuffer, mimeType, wordText, expectedPhonemes)` |
| bfa.service.ts analyze | Python POST /analyze | axios.post with FormData | VERIFIED | `bfa.service.ts:56` posts to `${this.baseUrl}/analyze` with `form.getHeaders()` and `timeout: 120_000` |
| page.tsx results block | PhonemeChips.tsx | default import | VERIFIED | `page.tsx:8` imports `PhonemeChips from './_components/PhonemeChips'`; used at line 554 |
| PhonemeChips | BfaResult.feedback (PhonemeOp[]) | props.feedback | VERIFIED | `PhonemeChips.tsx:41` receives `{ feedback: PhonemeOp[] }` prop; iterates via `.map()` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| PhonemeChips.tsx | `feedback` prop | `item.bfa.feedback` in page.tsx, populated from POST /phonics-result API response | Yes — `bfa.analyze()` returns `BfaAnalyzeResult` with `feedback: PhonemeOp[]` from Python scoring | FLOWING |
| game.service.ts savePhonicsResult | `bfaResult` | `this.bfa.analyze()` → Python `/analyze` | Yes — live DB confirms `cat` has stored phonemes; analyze call uses real stored phonemes | FLOWING |
| Word.phonemes DB column | `expectedPhonemes` | `wordRepository.findByText()` → Prisma `words` table | Yes — DB confirmed `phonemes = '["c","a","t"]'` for cat | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Python pytest suite passes | `python3 -m pytest test_bfa.py -q` from bfa-service/ | 37 passed in 0.14s | PASS |
| D-01 regression guard passes | `test_vietnamese_lr_confusion_d01_regression` in pytest | ops[0]["status"] == "similar" for l/r pair | PASS |
| NestJS BFA service spec passes | `npx jest --testPathPatterns="bfa.service.spec"` from backend/ | 13 passed | PASS |
| game.service.spec passes | `npx jest --testPathPatterns="game.service.spec"` from backend/ | 45 passed | PASS |
| DB Word.phonemes column populated | `node -e "...p.word.findUnique({where:{text:'cat'}, select:{phonemes:true}})..."` | `{ phonemes: '["c","a","t"]' }` | PASS |
| `similar` in feedback status tuple | `grep '"similar"' main.py line 492` | `("correct", "similar", "substituted", "extra")` | PASS |
| THREAD_POOL module-level only | `grep -c "ThreadPoolExecutor("` in main.py | 1 (module level only) | PASS |
| Word length guard in /align | `grep "word is too long"` in main.py | HTTPException at lines 403 and 614 | PASS |
| BFA_TRANSCRIPTION_MATCH_THRESHOLD wiring | `grep "_transcription_matches_word"` at call sites | Lines 669 and 936 use hardcoded default 0.5, not env var | FAIL |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| BFA-01 | 05-01 | `similar` ops include start/end/duration timestamps | SATISFIED | `main.py:492` includes "similar" in timestamp assignment tuple; test passes |
| BFA-02 | 05-02 | Word.phonemes stored; game service passes stored phonemes | SATISFIED | Schema column present; DB populated; savePhonicsResult uses findByText + bfa.analyze |
| BFA-03 | 05-01 | Models preloaded on startup; /health reports status | SATISFIED | lifespan handler + threading lock + /health response |
| BFA-04 | 05-01, 05-02 | Single /analyze endpoint; TS client updated; game service single call | SATISFIED | /analyze endpoint + BfaService.analyze + savePhonicsResult single call |
| BFA-05 | 05-03 | Per-phoneme colored chips on student phonics result screen | SATISFIED (code) / HUMAN NEEDED (visual) | PhonemeChips.tsx wired; live visual rendering requires human check |

**Note:** REQUIREMENTS.md still shows BFA-02 and BFA-05 as unchecked `[ ]`. This reflects the file state from 2026-05-13 (before Phase 5 executed) and has not been updated post-execution. The codebase evidence satisfies both requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| bfa-service/main.py | 52 | `TRANSCRIPTION_MATCH_THRESHOLD` declared but never used at call sites (function default hardcodes 0.5) | Warning | Setting BFA_TRANSCRIPTION_MATCH_THRESHOLD env var has no runtime effect; configurability claimed by 05-05 is incomplete |

No TBD / FIXME / XXX markers found in phase-modified files. No stub components or placeholder returns in critical paths.

---

### Human Verification Required

#### 1. Phoneme Chip Color Rendering

**Test:** Log in as a student, open a phonics homework, submit recordings with different pronunciation quality levels: (a) correct pronunciation of "cat", (b) say "lat" instead of "cat" expecting a similar-pair yellow chip, (c) say something completely different to get red chips, (d) say only "sh" of "ship" to get a gray dashed missing chip for "p".
**Expected:** Green chip for correct phonemes; yellow chip for acoustically similar substitutions (e.g. l for r); red chip for wrong substitutions with `expected -> aligned` arrow notation; gray dashed chip for missing phonemes. Chips render in a horizontal flex-wrap row below the score number.
**Why human:** Visual color rendering, layout, and chip appearance require browser inspection. CSS Tailwind class presence in source code does not guarantee the Tailwind JIT compiled them into the production bundle.

#### 2. Single BFA Call Per Submission (Network Tab Verification)

**Test:** Open browser DevTools Network tab, submit one phonics answer, inspect all outbound requests from the frontend to the backend, and check the BFA service container logs.
**Expected:** Exactly one POST to `/api/game/session/X/phonics-result` per submission; BFA service logs show one `"path": "/analyze"` entry per submission and zero `"path": "/transcribe"` or `"path": "/align"` entries.
**Why human:** Network traffic pattern at runtime requires live observation; cannot be fully verified from code inspection.

---

### Gaps Summary

One partial implementation gap found in Plan 05-05:

**BFA_TRANSCRIPTION_MATCH_THRESHOLD not wired:** The env var `BFA_TRANSCRIPTION_MATCH_THRESHOLD` is declared at `main.py:52` but `_transcription_matches_word()` at line 685 has a hardcoded default `threshold: float = 0.5`, and call sites at lines 669 and 936 do not pass `threshold=TRANSCRIPTION_MATCH_THRESHOLD`. The fix is one line: change the function signature to use `TRANSCRIPTION_MATCH_THRESHOLD` as its default, or pass it explicitly at call sites.

This gap does not affect the five BFA requirement IDs (BFA-01 through BFA-05) since it belongs to the hardening plan (05-05) which carries no requirement IDs. It is a WARNING-level operational configurability gap, not a functional regression.

---

_Verified: 2026-05-21_
_Verifier: Claude (gsd-verifier)_
