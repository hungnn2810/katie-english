# Phase 1: Speaking Homework - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 01-speaking-homework
**Areas discussed:** Recording UX, Free-speak scoring, Session structure, Mode field, Score display

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

## Claude's Discretion

- Keyword matching algorithm (tokenization, partial match handling — decided case-insensitive + partial accepted)
- Whether to highlight matched keywords in transcript on teacher view

## Deferred Ideas

- Live browser recording (MediaRecorder) — removed in favor of file upload
- Multiple speaking items per session — user decided one per session
- Student re-record before submitting — not discussed, defer to v2
