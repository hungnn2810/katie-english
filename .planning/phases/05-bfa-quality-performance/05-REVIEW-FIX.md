---
phase: 05-bfa-quality-performance
fixed_at: 2026-05-21T00:00:00Z
review_path: .planning/phases/05-bfa-quality-performance/05-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-05-21
**Source review:** .planning/phases/05-bfa-quality-performance/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (CR-01, CR-02, WR-01, WR-02, WR-03, WR-04)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Thread-pool deadlock when `BFA_CONCURRENCY` > 1

**Files modified:** `bfa-service/main.py`
**Commit:** 9b8ed8d
**Applied fix:** Added `_THREAD_POOL_WORKERS = int(os.getenv("BFA_THREAD_POOL_WORKERS", str(BFA_CONCURRENCY * 2)))` after reading `BFA_CONCURRENCY`. Emits a startup `logger.warning` when the configured value is below `BFA_CONCURRENCY * 2`. `THREAD_POOL` is now created with `max_workers=_THREAD_POOL_WORKERS` instead of the hardcoded `2`.

---

### CR-02: `HTTPException` raised inside `_transcribe_sync` — will not produce a 400 response

**Files modified:** `bfa-service/main.py`
**Commit:** c457696
**Applied fix:** Changed `_transcribe_sync` to `return {"error": f"Audio conversion failed: ..."}` on ffmpeg failure instead of raising `HTTPException`. Updated `_transcribe_impl` to check `if "error" in result: raise HTTPException(status_code=400, detail=result["error"])` before returning the result to the caller.

---

### WR-01: `_partition_flat_alignment` rounding can assign zero phonemes to every word

**Files modified:** `bfa-service/main.py`
**Commit:** 3503300
**Applied fix:** Replaced `round(...)` with `max(1, round(...))` so no non-last word receives zero phonemes. The last word in the loop now always receives `len(content) - pos` (all remaining content), preventing phonemes from being silently discarded by cumulative banker's-rounding drift. Loop variable changed from `for word, expected in word_expected` to `for i, (word, expected) in enumerate(word_expected)` to enable the last-word check.

---

### WR-02: `BfaService` mock omits `analyzeSpeaking` — all speaking tests silently skip real BFA integration

**Files modified:** `backend/src/game/game.service.spec.ts`
**Commit:** 4093bae
**Applied fix:** Added `analyzeSpeaking: jest.fn()` to all five `BfaService` mock objects across every `beforeEach` block. Added a new `describe('GameService.saveSpeakingResult')` block with six tests covering: SCRIPT_MATCH BFA success path (score from `bfaResult.overall_score`), SCRIPT_MATCH BFA error fallback to transcribe, FREE_SPEAK mode (transcribe only, no `analyzeSpeaking`), session not found (NotFoundException), session already completed (BadRequestException), and no audio provided (score 0, BFA not called).

---

### WR-03: `expected_phonemes` array items are not validated as strings

**Files modified:** `bfa-service/main.py`
**Commit:** b03f329
**Applied fix:** Added `if not all(isinstance(p, str) for p in expected): raise HTTPException(status_code=400, detail="expected_phonemes elements must be strings")` immediately after the `isinstance(expected, list)` check in both `_align_impl` (line ~407) and `_analyze_impl` (line ~624).

---

### WR-04: Unvalidated `audio.filename` suffix can contain arbitrary bytes

**Files modified:** `bfa-service/main.py`
**Commit:** bd6ca31
**Applied fix:** Added `_safe_suffix(filename: str | None) -> str` helper after `normalize_ipa`. The function uses `re.fullmatch(r'\.[a-zA-Z0-9]{1,10}', raw)` to whitelist clean extensions and falls back to `.webm` for anything else. Replaced all four `Path(audio.filename or "audio.webm").suffix or ".webm"` callsites in `_align_impl`, `_transcribe_impl`, `_analyze_impl`, and `_analyze_speaking_impl` with `_safe_suffix(audio.filename)`.

---

_Fixed: 2026-05-21_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
