---
status: testing
phase: 01-speaking-homework
source: [SUMMARY.md]
started: 2026-05-14T06:45:37Z
updated: 2026-05-14T06:45:37Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running server/service. Clear ephemeral state. Start backend and frontend from scratch.
  Backend boots without errors, migration completes, and a basic API call returns live data.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state. Start backend and frontend from scratch. Backend boots without errors, migration completes, and a basic API call returns live data.
result: [pending]

### 2. Teacher Creates FREE_SPEAK Homework
expected: In the homework creation modal, selecting SPEAKING type shows a mode selector. Choosing "Free Speak" shows "Keywords (comma-separated)" label for the text field and shows the image prompt field. Form validation message reflects FREE_SPEAK mode. Saving succeeds.
result: [pending]

### 3. Teacher Creates SCRIPT_MATCH Homework
expected: In the homework creation modal, selecting SPEAKING type and choosing "Script Match" shows "Target Text" label and hides the image prompt field. Saving succeeds.
result: [pending]

### 4. Student Session — FREE_SPEAK Upload Flow
expected: Opening a FREE_SPEAK speaking homework session skips the camera/MediaRecorder entirely. Student sees an upload state showing the image prompt. A file picker accepting video/audio files is shown. After selecting a file, the file name and size are displayed. Submitting the file uploads and completes the session.
result: [pending]

### 5. Student Session — SCRIPT_MATCH Upload Flow
expected: Opening a SCRIPT_MATCH speaking homework session skips the camera entirely. Student sees the target text. A file picker accepting video/audio is shown. File name and size display after selection. Submitting completes the session.
result: [pending]

### 6. FREE_SPEAK Keyword Scoring
expected: After a FREE_SPEAK session is submitted, the score reflects keyword matches (case-insensitive). If all keywords appear in the transcript → 100%. Partial matches → proportional score. No matches → 0%.
result: [pending]

### 7. Speaking Mode Badge in Teacher Results
expected: In the teacher's session detail page, FREE_SPEAK sessions show a pink "Free Speak" badge and SCRIPT_MATCH sessions show a purple "Script Match" badge.
result: [pending]

### 8. PHONICS Flow Unchanged
expected: Opening a PHONICS homework session still uses the camera/MediaRecorder flow (no upload UI). The PHONICS session behaves exactly as before Phase 1.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps

[none yet]
