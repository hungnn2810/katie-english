---
status: partial
phase: 09-listen-answer
source: [09-VERIFICATION.md]
started: 2026-06-03T09:15:00Z
updated: 2026-06-03T09:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Teacher creation flow
expected: Audio upload zone accepts mp3/wav/webm, shows preview, Save Homework creates homework and redirects to homework list
result: [pending]

### 2. Student game session — MediaRecorder + audio auto-play
expected: Audio prompt auto-plays on load, mic circle transitions idle→recording→scoring→recorded correctly
result: [pending]

### 3. D-09 amber banner
expected: When semanticScore < 0.2, amber banner "hãy thử lại, nghe kỹ câu hỏi nhé" appears in results
result: [pending]

### 4. Results screen
expected: After completing all items, results screen shows per-item Semantic: X% · Pronunciation: Y%, composite score, and keyword chips
result: [pending]

### 5. bfa-service Docker container
expected: docker compose up bfa-service starts, downloads all-MiniLM-L6-v2 (~80MB), /health returns minilm_loaded: true
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
