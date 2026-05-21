---
phase: 05-bfa-quality-performance
reviewed: 2026-05-21T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - backend/prisma/schema.prisma
  - backend/prisma/seed.ts
  - backend/src/bfa/bfa.dto.ts
  - backend/src/bfa/bfa.service.spec.ts
  - backend/src/bfa/bfa.service.ts
  - backend/src/game/game.module.ts
  - backend/src/game/game.service.spec.ts
  - backend/src/game/game.service.ts
  - backend/src/word/word.module.ts
  - backend/src/word/word.repository.ts
  - bfa-service/main.py
  - bfa-service/test_bfa.py
  - frontend/app/game/session/[id]/_components/PhonemeChips.tsx
  - frontend/app/game/session/[id]/page.tsx
  - frontend/lib/admin-api.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: fixed
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-21
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This phase hardens the BFA (Bounnemouth Forced Aligner) service with shared thread-pool execution,
configurable operational thresholds, and input length validation. The Python service and its NestJS
proxy are broadly well-structured. Two blockers were found: a thread-pool deadlock that can be
triggered by a documented environment variable, and an `HTTPException` raised inside a synchronous
thread function where it will not be handled as intended. Four warnings address a rounding defect
in the flat-alignment partitioner, an incomplete BFA mock in the test suite, an unvalidated
phoneme-item type, and an unsafe file-suffix that can contain arbitrary bytes. Three informational
items cover dead code paths, magic numbers, and a type-assertion anti-pattern.

---

## Critical Issues

### CR-01: Thread-pool deadlock when `BFA_CONCURRENCY` > 1

**File:** `bfa-service/main.py:48-56`

**Issue:** `THREAD_POOL` is hardcoded to `max_workers=2`. Each call to `_analyze_sync` and
`_analyze_speaking_sync` submits exactly **two** blocking tasks to `THREAD_POOL`
(`_transcribe_wav` + `_run_alignment` / `_run_speaking_alignment`) and then blocks the caller
thread on `.result()` for both. `BFA_CONCURRENCY` is a documented, user-configurable environment
variable with no stated upper bound.

If `BFA_CONCURRENCY >= 2`, the semaphore allows two concurrent outer requests. Each outer request
runs its sync body inside `asyncio.to_thread` (a different executor) and then occupies all 2
`THREAD_POOL` workers via `.submit()`. The second request's two submitted tasks queue inside
`THREAD_POOL`, but the first request's thread is blocked waiting on `.result()` for its two tasks.
With `max_workers=2`, both workers are busy — the queued tasks can never start — the first request
never releases its workers — **complete deadlock**.

The default `BFA_CONCURRENCY=1` is safe; the defect is latent but ships with no guard to prevent
it being triggered.

**Fix:** Enforce that `THREAD_POOL.max_workers >= BFA_CONCURRENCY * 2` at startup, or expose the
pool size as an env var and document the constraint clearly:

```python
# At module initialisation, after reading BFA_CONCURRENCY:
_THREAD_POOL_WORKERS = int(os.getenv("BFA_THREAD_POOL_WORKERS", str(BFA_CONCURRENCY * 2)))
if _THREAD_POOL_WORKERS < BFA_CONCURRENCY * 2:
    logger.warning(json.dumps({
        "event": "config_warning",
        "message": f"BFA_THREAD_POOL_WORKERS ({_THREAD_POOL_WORKERS}) < BFA_CONCURRENCY*2 "
                   f"({BFA_CONCURRENCY * 2}); deadlock possible under load",
    }))
THREAD_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=_THREAD_POOL_WORKERS)
```

---

### CR-02: `HTTPException` raised inside `_transcribe_sync` — will not produce a 400 response

**File:** `bfa-service/main.py:572`

**Issue:** `_transcribe_sync` is executed via `asyncio.to_thread`. When the `ffmpeg` conversion
fails, the function raises `HTTPException(status_code=400, ...)`. Although `asyncio.to_thread`
propagates exceptions back to the awaiting coroutine, **FastAPI's exception handler catches
`HTTPException` only when it is raised inside a *route coroutine*, not when it is propagated out
of `to_thread`**. The unhandled exception propagates through the caller as a generic exception and
is caught by the global `unhandled_exception_handler`, which returns HTTP 500 with
`"Internal server error"`, not the intended 400. The caller receives an opaque error rather than
actionable feedback.

Note: the same pattern also appears in `_align_sync` and `_analyze_sync`/`_analyze_speaking_sync`,
but those functions return an `error_payload` dict on failure rather than raising — only
`_transcribe_sync` is affected.

**Fix:** Do not raise `HTTPException` inside synchronous thread functions. Return an error-shaped
dict and let the async wrapper translate it:

```python
def _transcribe_sync(raw_bytes: bytes, suffix: str):
    ...
    if conv.returncode != 0:
        return {"error": f"Audio conversion failed: {conv.stderr.decode()[:200]}"}
    ...
    return {"text": text.strip()}

async def _transcribe_impl(audio: UploadFile):
    ...
    result = await asyncio.to_thread(_transcribe_sync, raw_bytes, suffix)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
```

---

## Warnings

### WR-01: `_partition_flat_alignment` rounding can assign zero phonemes to every word

**File:** `bfa-service/main.py:800-805`

**Issue:** Phoneme slices are apportioned using `round(len(expected) / total_expected * len(content))`.
Python's `round()` uses banker's rounding (rounds 0.5 to nearest even). When `content` has fewer
phonemes than words — a realistic edge case for short or partially-aligned audio — the formula
produces `count=0` for every word. For example: two target words each with 1 expected phoneme and
only 1 aligned content phoneme — both words receive `count = round(0.5) = 0`, and the single
available phoneme is never distributed to either word. Both words score 0 with "No phonemes in
slice" error feedback even though alignment data exists. The `pos` counter also fails to advance,
so all words slice the same empty region.

**Fix:** Use a `max(1, ...)` floor to guarantee at least one phoneme per word, and use
`ceil`/greedy-allocation to distribute the remainder:

```python
from math import ceil

# Proportional allocation with ceil — ensures last word gets residual phonemes
pos = 0
for i, (word, expected) in enumerate(word_expected):
    if i == len(word_expected) - 1:
        # Last word gets all remaining content
        count = len(content) - pos
    elif total_expected > 0:
        count = max(1, round(len(expected) / total_expected * len(content)))
    else:
        count = max(1, len(content) // len(target_words)) if target_words else 0
    slice_ = content[pos: pos + count]
    pos += count
    ...
```

---

### WR-02: `BfaService` mock in `game.service.spec.ts` omits `analyzeSpeaking` — all speaking tests silently skip real BFA integration

**File:** `backend/src/game/game.service.spec.ts:214`

**Issue:** The `BfaService` mock is defined as
`{ align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn() }` across all five test suites.
`analyzeSpeaking` is missing. `GameService.saveSpeakingResult` calls `this.bfa.analyzeSpeaking()`
for `SCRIPT_MATCH` mode — but there are **zero tests** for `saveSpeakingResult` in the spec file.
A future test that exercises the speaking SCRIPT_MATCH path would call `undefined()` and throw
`TypeError: this.bfa.analyzeSpeaking is not a function`, crashing rather than asserting. The
omission masks the fact that the most complex path in `GameService` — the BFA-backed speaking
result — has no unit test coverage whatsoever.

**Fix:** Add `analyzeSpeaking: jest.fn()` to the mock and add tests:

```typescript
{ provide: BfaService, useValue: {
    align: jest.fn(), transcribe: jest.fn(),
    analyze: jest.fn(), analyzeSpeaking: jest.fn(),
}}
```

Add a `describe('GameService.saveSpeakingResult')` block covering at minimum:
- BFA success path (SCRIPT_MATCH, score from `bfaResult.overall_score`)
- BFA error → fallback transcribe path
- FREE_SPEAK mode path
- Session not found / already completed guards

---

### WR-03: `expected_phonemes` array items are not validated as strings — type mismatch crashes scoring

**File:** `bfa-service/main.py:396-400`

**Issue:** The validation at line 396 checks `isinstance(expected, list)` but does not verify that
each element is a string. If a caller sends `["c", 1, null]`, the list passes validation and
reaches `score_alignment` / `_phoneme_cost`. `_phoneme_cost` calls `frozenset({a, b})`, which
requires hashable items — `None` is hashable but type-inconsistent. More critically, when
`a == b` is evaluated with `a=1` and `b="c"`, Python will not crash but will return the wrong
result (1 != "c"). The `frozenset` lookup will fail silently (no match in `_SIMILAR_PAIRS`) and
return cost 1.0 for every comparison, producing incorrect scores without any error signal.

**Fix:** Add element type validation after the list check:

```python
if not isinstance(expected, list):
    raise HTTPException(status_code=400, detail="expected_phonemes must be a JSON array")
if not all(isinstance(p, str) for p in expected):
    raise HTTPException(status_code=400, detail="expected_phonemes elements must be strings")
```

Apply the same check to the `/analyze` endpoint (line 607).

---

### WR-04: Unvalidated `audio.filename` suffix can contain arbitrary bytes and create files with unexpected names in temp directories

**File:** `bfa-service/main.py:405, 550, 616, 1000`

**Issue:** The filename suffix is extracted with `Path(audio.filename or "audio.webm").suffix`.
`audio.filename` is a client-supplied string with no sanitisation. A filename such as
`file.wav; injected` produces suffix `".wav; injected"` (Python's `Path.suffix` returns everything
after the last `.` including spaces and semicolons). This suffix is then used to construct a
temporary file path: `work_dir / f"input{suffix}"`, creating a file named
`input.wav; injected` in the temp directory. While `subprocess.run` uses a list (not `shell=True`)
so no shell command injection is possible, the unexpected characters in the path could:
1. Cause `open(raw_path, "wb")` to fail with `OSError` on some OS configurations.
2. Leave oddly-named files if `shutil.rmtree` fails (e.g., on permission errors).
3. Potentially confuse ffmpeg or aligner libraries that receive the path as a string argument.

**Fix:** Whitelist acceptable suffix characters:

```python
import re

def _safe_suffix(filename: str | None) -> str:
    raw = Path(filename or "audio.webm").suffix or ".webm"
    # Allow only alphanumeric + dot; reject anything else
    if re.fullmatch(r'\.[a-zA-Z0-9]{1,10}', raw):
        return raw
    return ".webm"

# Usage (all four callsites):
suffix = _safe_suffix(audio.filename)
```

---

## Info

### IN-01: `speakingMode` access uses unsafe type assertion instead of typed repository shape

**File:** `backend/src/game/game.service.ts:46`

**Issue:** `speakingMode` is accessed via `(hw as { speakingMode?: 'FREE_SPEAK' | 'SCRIPT_MATCH' }).speakingMode`.
The Prisma schema defines `speakingMode` as `SpeakingMode?` on the `Homework` model, so the
repository already returns this field with correct typing. The type assertion bypasses TypeScript's
type checker and would silently accept any future type change to the Homework model without a
compile error. The correct approach is to type `hw` with the full Prisma-generated type or an
explicit interface that includes `speakingMode`.

**Fix:** Use the `Homework` type from Prisma client or extend the `GameSession` query's return type
to include `speakingMode`, removing the need for the cast.

---

### IN-02: `get_aligner()` uses unbounded `@lru_cache` — cache info used in health check inconsistently

**File:** `bfa-service/main.py:370-373, 1014`

**Issue:** `get_aligner` is decorated with `@lru_cache` (no `maxsize`), which is equivalent to
`maxsize=None` (unbounded). Since the function has no arguments it will always cache exactly one
entry, so this is functionally correct. However, the health check at line 1014 reads
`get_aligner.cache_info().currsize > 0` to determine if the aligner is loaded. The `@lru_cache`
decorator on a no-argument function caches the result after the first call, but the cache
`currsize` could be 0 if the lifespan warmup has not yet completed and a concurrent `/health`
request arrives. A boolean module-level sentinel (as used for `_whisperx_model`) would be more
explicit and match the existing pattern.

---

### IN-03: `console.error` calls are the only error reporting in `finishSession` and `processItem`

**File:** `frontend/app/game/session/[id]/page.tsx:338, 351`

**Issue:** Errors during BFA scoring (`savePhonicsResult`, `saveSpeakingResult`) and session
completion (`completeSession`) are silently swallowed except for `console.error`. The student
sees a partially-scored result screen with no indication that individual items failed to save. The
`saveError` state flag (line 351) is only set when `completeSession` fails, not when individual
phonics/speaking results fail. If three out of five phonics items fail to upload, the student sees
0% for those items with no explanation. The loop at lines 326-340 does not update `saveError` even
though an item save failure directly affects the displayed score.

**Fix:** Track per-item save failures and surface them in the results UI:

```typescript
const [failedItems, setFailedItems] = useState<number[]>([]);
// Inside finishSession loop:
} catch (err) {
  console.error(`[score] item="${item.text}"`, err);
  setFailedItems(prev => [...prev, i]);
}
```

---

_Reviewed: 2026-05-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
