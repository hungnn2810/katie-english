# Katie English — Homework Platform

## What This Is

Web platform for English homework targeted at young children (5–10). Teachers create and assign three types of homework (Phonics, Speaking, Reading), students complete them on tablet via a game-like interface, and AI (WhisperX + BFA forced aligner) scores audio-based submissions automatically.

## Core Value

A student can receive a homework assignment, complete it on a tablet, and get an immediate AI-scored result — without the teacher needing to manually grade anything.

## Requirements

### Validated

- ✓ Teacher/student authentication (login, JWT, role-based access) — existing
- ✓ Class management (create class, join code, schedule, status lifecycle) — existing
- ✓ Student management (profile, parent contact info, class enrollment) — existing
- ✓ Phonics homework creation (words + images, organized into parts) — existing
- ✓ Homework assignment to classes with due dates — existing
- ✓ Student phonics game session (play words, record pronunciation) — existing
- ✓ BFA pronunciation scoring (WhisperX transcription + phoneme alignment) — existing
- ✓ Audio/image storage via MinIO — existing
- ✓ Student homework list: sorted by endDate ascending, overdue badge (red "Overdue"), laptop/PC scope — Validated in Phase 04

### Active

- [ ] Speaking homework end-to-end: student uploads audio recording; teacher sets either free-speak (image prompt) or script-matching mode; WhisperX/BFA scores result
- [ ] Reading homework: teacher composes a sequence of activities — image-word matching (click-to-pair) and/or fill-in-blank (multiple choice); system scores deterministically
- [ ] Teacher dashboard complete: create all homework types, assign to classes, review per-student session results
- [ ] Tablet-friendly student game UI: large touch targets, audio cues, works on phone/tablet for 5–10 year olds

### Out of Scope

- LLM-based scoring (GPT/Claude) — keep BFA/WhisperX pipeline only
- Adult/desktop-primary UX — target is young children on tablet
- Reading comprehension questions (post-read Q&A) — not requested
- Student self-registration — teacher creates student accounts

## Context

- Stack: Next.js 14 (frontend) · NestJS 10 + Prisma 5 (backend) · FastAPI + WhisperX + BFA (scoring service) · PostgreSQL · MinIO
- Phonics homework is the most mature flow; speaking is partially built; reading does not exist yet
- Teacher dashboard has create/assign/review gaps
- Docker Compose for local dev; all services containerized
- Single teacher account (seeded via env vars); multi-student

## Constraints

- **Platform**: Tablet/phone first — UI decisions must work on touch with no hover states
- **AI scoring**: WhisperX + BFA only — no external LLM API calls for grading
- **Auth**: Single teacher role (no admin, no multi-teacher yet)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Reading activities are free-form sequences (not fixed structure) | Teacher needs flexibility to mix matching + fill-in-blank in any order | — Pending |
| Speaking supports both free-speak and script-matching modes | Teachers use both depending on lesson goal | — Pending |
| Deterministic scoring for reading (no AI) | Click-to-match and multiple-choice have objective right/wrong answers | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-14 — Phase 04 complete. All 21 v1 requirements implemented.*
