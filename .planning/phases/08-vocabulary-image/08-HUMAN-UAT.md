---
status: partial
phase: 08-vocabulary-image
source: [08-VERIFICATION.md]
started: 2026-06-02T00:00:00Z
updated: 2026-06-02T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Teacher creation flow end-to-end
expected: Type picker shows 4-column grid with orange Vocabulary option. Clicking Vocabulary suppresses the modal submit button and shows a redirect panel. Clicking "Open Vocabulary Editor" navigates to /teacher/homework/create/vocabulary. Teacher can upload images (up to 10), type word labels, drag-reorder items, and save — homework appears in the list with an orange VOCABULARY badge.
result: [pending]

### 2. Student vocab game — recording, BFA feedback, animations
expected: Starting a VOCABULARY assignment routes to /game/vocab/[sessionId]. Student sees full image card with word hint chip. Tap-to-record works. After scoring: phoneme chips fade in. Phonetically-close substitutions (e.g. cat→cap) render as yellow "similar" chips (VOCAB-04). BFA error shows amber message + re-record option + image card shake animation. Student advances item-by-item and reaches results screen with per-item scores.
result: [pending]

### 3. Teacher session detail — VOCABULARY results section
expected: Opening a VOCABULARY student session shows a "Vocabulary" section with orange ImageIcon heading. Each submitted item shows a 48×48 image thumbnail + word + phoneme chips + color-coded score badge. The Phonics section is suppressed (not double-rendered). Empty sessions show "No submissions yet."
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
