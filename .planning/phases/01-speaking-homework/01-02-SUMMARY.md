---
phase: "01"
plan: "02"
subsystem: bfa-service
tags:
  - bfa
  - python
  - fastapi
  - whisperx
  - performance
  - security
dependency_graph:
  requires: []
  provides:
    - bfa-service/main.py (simplified /transcribe, async espeak)
    - backend/src/bfa/bfa.dto.ts (WhisperXResult.words optional)
  affects:
    - backend/src/bfa/bfa.service.ts (caller of /transcribe — reads .text only)
    - backend/src/game/game.service.ts (downstream consumer of WhisperXResult)
tech_stack:
  added: []
  patterns:
    - asyncio.to_thread() for blocking subprocess in async FastAPI handler
    - FastAPI UploadFile content read + size gate before disk write
    - ffmpeg -t 300 decode-time cap
key_files:
  created: []
  modified:
    - bfa-service/main.py
    - backend/src/bfa/bfa.dto.ts
decisions:
  - "D-20: Removed whisperx.align() from /transcribe; returns {text: string} only"
  - "D-21: 100MB upload cap (HTTP 413) + 5-minute ffmpeg -t 300 decode cap"
  - "D-23: espeak_phonemes() wrapped in asyncio.to_thread() via espeak_phonemes_async()"
  - "WhisperXResult.words made optional (words?) — no backend consumer reads .words"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-14T15:22:53Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
---

# Phase 01 Plan 02: BFA Service Improvements Summary

**One-liner:** Removed whisperx.align() from /transcribe (saves ~300-800ms/req), added 100MB/5min upload caps, and wrapped espeak_phonemes subprocess in asyncio.to_thread() for non-blocking /align.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| T-01 | Remove whisperx.align(), add 100MB/5min caps, drop align globals | 20db633 | bfa-service/main.py |
| T-02 | Wrap espeak_phonemes in asyncio.to_thread; WhisperXResult.words optional | 20db633 | bfa-service/main.py, backend/src/bfa/bfa.dto.ts |
| T-03 | Commit all BFA changes | 20db633 | bfa-service/main.py, backend/src/bfa/bfa.dto.ts |

Note: T-01, T-02, and T-03 were committed as a single atomic commit (20db633) per the plan's T-03 instruction to create one commit covering all three files. The Dockerfile was already tracked and clean (committed in a prior commit `4c76384`) — no changes required.

## Diff Scope

```
 backend/src/bfa/bfa.dto.ts |  2 +-
 bfa-service/main.py        | 49 +++++++++++++++-------------------------------
 2 files changed, 17 insertions(+), 34 deletions(-)
```

## Decision-to-Code Mapping

### D-20: Remove whisperx.align() from /transcribe

- Removed lines: `model_a, metadata = get_whisperx_align_model()`, `result = whisperx.align(...)`, entire `words[]` build loop, `"words": words` from return value.
- Removed globals: `_whisperx_align_model = None`, `_whisperx_metadata = None`
- Removed function: `def get_whisperx_align_model()` (7 lines)
- New return: `return {"text": text.strip()}` — no `words` key
- Silence path: `return {"text": ""}` — consistent shape, no `words` key
- Location after edits: `/transcribe` endpoint starting at line ~331 in `bfa-service/main.py`

### D-21: File Size and Duration Cap

- Constant added: `MAX_TRANSCRIBE_SIZE = 100 * 1024 * 1024  # 100 MB cap per D-21` (after `_WHISPERX_COMPUTE_TYPE`)
- Size gate: `content = await audio.read()` then `if len(content) > MAX_TRANSCRIBE_SIZE: raise HTTPException(status_code=413, detail="File exceeds 100MB limit")`
- Duration cap: `"-t", "300"` inserted in ffmpeg argv between input flags and `-y`
- Full ffmpeg argv: `["ffmpeg", "-i", str(raw_path), "-ar", "16000", "-ac", "1", "-t", "300", "-y", str(wav_path)]`
- File write now uses `raw_path.write_bytes(content)` (single read, no second `await audio.read()`)

### D-23: espeak async fix

- New async wrapper added after `espeak_phonemes` definition:
  ```python
  async def espeak_phonemes_async(word: str) -> List[str]:
      """Run espeak_phonemes in a worker thread to avoid blocking the event loop (D-23)."""
      return await asyncio.to_thread(espeak_phonemes, word)
  ```
- Call site in `/align` changed from `expected = espeak_phonemes(word)` to `expected = await espeak_phonemes_async(word)`
- Sync helper `espeak_phonemes` retained — the async wrapper delegates to it
- `import asyncio` added at top of file (alphabetically, before `import json`)

### D-20 Backend Complement (bfa.dto.ts)

- `WhisperXResult.words: WhisperXWord[]` changed to `words?: WhisperXWord[]` (optional)
- `WhisperXWord` interface retained (no consumers depend on its removal)
- Confirmed: no backend code reads `.words` from `WhisperXResult` — `game.service.ts` reads only `.text`

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c 'whisperx.align(' bfa-service/main.py` | 0 |
| `grep -c 'get_whisperx_align_model' bfa-service/main.py` | 0 |
| `grep -c '_whisperx_align_model' bfa-service/main.py` | 0 |
| `grep -c '_whisperx_metadata' bfa-service/main.py` | 0 |
| `grep -c 'MAX_TRANSCRIBE_SIZE = 100 * 1024 * 1024' bfa-service/main.py` | 1 |
| `grep -c 'status_code=413' bfa-service/main.py` | 1 |
| `grep -c '"-t", "300"' bfa-service/main.py` | 1 |
| `grep -c '"words":' bfa-service/main.py` | 0 |
| `grep -c 'return {"text"' bfa-service/main.py` | 2 |
| `grep -c '^import asyncio' bfa-service/main.py` | 1 |
| `grep -c 'async def espeak_phonemes_async' bfa-service/main.py` | 1 |
| `grep -c 'asyncio.to_thread(espeak_phonemes' bfa-service/main.py` | 1 |
| `grep -c 'await espeak_phonemes_async(word)' bfa-service/main.py` | 1 |
| `grep -c 'words?: WhisperXWord\[\]' backend/src/bfa/bfa.dto.ts` | 1 |
| `python3 -c "import ast; ast.parse(...)"` | exits 0 |
| `git status --porcelain` (three BFA paths) | empty (clean) |

Note: TypeScript baseline has pre-existing errors in `student/` and `word/` modules (missing `node_modules` in worktree). Zero new errors reference `bfa.dto.ts`. These pre-existing errors are out-of-scope for this plan.

## Deviations from Plan

None — plan executed exactly as written.

The only deviation from the literal T-03 instruction is that `bfa-service/Dockerfile` was already tracked (not untracked as the plan expected). It had been committed in a prior commit (`4c76384 up`) and had no pending changes. Staging it produced no diff entry, which is correct behavior. The plan's intent (ensure Dockerfile is committed) was already satisfied.

## Performance Impact

- WhisperX cold-start time reduced: align model (`whisperx.load_align_model`) is no longer lazy-loaded on first `/transcribe` call — alignment model was ~300-800ms to load and run.
- `/transcribe` endpoint now returns after model inference only (no align pass).
- `/align` endpoint no longer blocks the FastAPI event loop during espeak-ng subprocess calls.

## Known Stubs

None.

## Threat Flags

No new threat surface introduced. All mitigations from the plan's threat model were applied:
- 100MB upload cap (T-01): guards against DoS via oversized uploads
- ffmpeg -t 300 (T-01): guards against CPU exhaustion via long audio
- asyncio.to_thread (T-02): guards against event-loop starvation under concurrent /align calls
- words? optional typing (T-02): guards against type drift at BFA response boundary

## Self-Check: PASSED

- `bfa-service/main.py` exists and parses: FOUND + PARSE OK
- `backend/src/bfa/bfa.dto.ts` exists with optional words: FOUND
- Commit 20db633 exists: FOUND (`git log --oneline -1` confirms)
- All source assertions pass: FOUND (verified above)
