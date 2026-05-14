# Phase 1: Speaking Homework - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13, updated: 2026-05-14
**Phase:** 01-speaking-homework
**Areas discussed:** Recording UX, Free-speak scoring, Session structure, Mode field, Score display, Try page purpose, BFA service quality, Untracked migrations, Student result screen, Scoring improvements, Teacher homework detail changes, Image serving

---

## Recording UX

| Option | Description | Selected |
|--------|-------------|----------|
| Browser MediaRecorder | Live recording via WebRTC/MediaRecorder in session page | |
| File upload | Student records on device, uploads video file to website | ✓ |

**User's choice:** File upload — "student upload video speaking to website"
**Notes:** Student records on phone/tablet camera app, uploads file. Removes browser recording complexity.

---

## Free-speak Scoring

| Option | Description | Selected |
|--------|-------------|----------|
| Teacher provides keyword list | Teacher enters expected words; system checks keywords in transcript | ✓ |
| No scoring — teacher reviews manually | System transcribes, teacher marks done/incomplete | |
| Fluency only | Score by word count vs expected minimum | |

**User's choice:** Teacher provides keyword list
**Notes:** Keywords stored comma-separated in `speakingText` field. Score = keywords found / total keywords × 100.

---

## Session Structure

| Option | Description | Selected |
|--------|-------------|----------|
| One video per session | Single recording for whole speaking homework | ✓ |
| Multiple items per session | Teacher adds multiple sentences, student records per item | |

**User's choice:** One video per session

---

## Mode Field

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit DB field | Add `speakingMode: FREE_SPEAK \| SCRIPT_MATCH` enum to Homework table | ✓ |
| Infer from content | Presence of `speakingPictureUrl` = free-speak | |

**User's choice:** Explicit DB field — clean, no ambiguity, requires migration

---

## Score Display

| Option | Description | Selected |
|--------|-------------|----------|
| Percentage | keywords_hit / total_keywords × 100, shown as % | ✓ (Claude suggested) |
| Raw count | "Found X of Y keywords" | |

**User's choice:** "Research and suggest for me" → Claude recommended percentage (consistent with existing phonics score display)

---

## Claude's Discretion (original)

- Keyword matching algorithm (tokenization, partial match handling — decided case-insensitive + partial accepted)
- Whether to highlight matched keywords in transcript on teacher view

## Deferred Ideas (original)

- Live browser recording (MediaRecorder) — removed in favor of file upload
- Multiple speaking items per session — user decided one per session
- Student re-record before submitting — not discussed, defer to v2

---

## [2026-05-14 UPDATE — post-implementation review]

## Try Page Purpose

| Option | Description | Selected |
|--------|-------------|----------|
| File upload (match student flow) | Same UI as student: pick file, BFA scored | ✓ |
| Live SpeechRecognition (current) | Browser mic + instant local score | |
| Show text only | Just display content, no recording | |

**User's choice:** File upload (match student flow)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, call BFA and show real score | Real WhisperX transcript + BFA score | ✓ |
| No, skip BFA in try mode | Mock result | |

**User's choice:** Yes — real BFA score

| Option | Description | Selected |
|--------|-------------|----------|
| Preview only — no session created | Nothing saved to DB | ✓ |
| Create a real session | Teacher-owned session saved | |

**User's choice:** Preview only

---

## BFA Service Quality

| Question | Options | Selected |
|----------|---------|----------|
| WhisperX model | small / medium / large-v3 | small (keep current) |
| Skip word alignment | Skip / Keep | Skip — saves 300–800ms |
| File cap | 5 min/100MB / No cap | 5 min/100MB |
| Fix MIME mapping | Fix / Leave | Fix (add m4a, mov, ogg, aac) |
| espeak async | Thread pool / Leave | Thread pool (asyncio.to_thread) |

---

## Untracked Migrations

| Option | Description | Selected |
|--------|-------------|----------|
| Delete (recommended) | Remove 5 stale exploratory folders | ✓ |
| Squash into one | Single clean migration | |
| Commit as-is | RISK: drops tables | |

**User's choice:** Delete all 5 (20260507000003 through 20260509000001)

---

## Student Result Screen

| FREE_SPEAK options | Selected |
|---------------------|----------|
| Score + image prompt | ✓ |
| Score + keyword list | |
| Score only | |

| SCRIPT_MATCH options | Selected |
|----------------------|----------|
| Score + transcript (keep current) | ✓ |
| Word-by-word match breakdown | |

---

## Scoring Improvements

| Option | Selected |
|--------|----------|
| Word boundary regex (/\bkw\b/) | ✓ |
| Keep bare substring match | |

| Option | Selected |
|--------|----------|
| Fuzzy fallback at Levenshtein ≥ 0.75 | ✓ |
| Exact only | |

---

## Teacher Detail Changes

**User's choice:** Commit unstaged redesign as Phase 1 (assignment grouping + Open/Closed + delete button + speaking display)

## Image Serving

**User's choice:** Commit `image.controller.ts` as Phase 1

---

## Claude's Discretion (updated)

- Keyword highlight in transcript on teacher view
- Reuse existing `levenshtein()` from `game.scoring.ts` for fuzzy matching
- BFA cap implementation (Content-Length vs read-limit approach)

## Deferred Ideas (updated)

- Larger WhisperX model — upgrade if accuracy complaints arise
- Live browser recording for student — v2 if needed
- Word-by-word SCRIPT_MATCH breakdown for students — deferred
- Student re-record before submit — defer to v2
