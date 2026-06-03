---
phase: 09-listen-answer
plan: "03"
subsystem: backend/nestjs
tags: [nestjs, listen-homework, scoring, bfa, prisma]
dependency_graph:
  requires: [LISTEN-enum, ListenItem-model, ListenItemResult-model, bfa-service]
  provides: [LISTEN-CRUD-API, listen-result-scoring, scoreSemantic]
  affects:
    - backend/src/homework/homework.dto.ts
    - backend/src/homework/homework.repository.ts
    - backend/src/homework/homework.service.ts
    - backend/src/homework/homework.controller.ts
    - backend/src/game/game.dto.ts
    - backend/src/game/game.repository.ts
    - backend/src/game/game.service.ts
    - backend/src/game/game.controller.ts
    - backend/src/bfa/bfa.service.ts
tech_stack:
  added: []
  patterns: [nestjs-crud-pattern, upsert-result, composite-scoring, bfa-integration]
key_files:
  created: []
  modified:
    - backend/src/homework/homework.dto.ts
    - backend/src/homework/homework.repository.ts
    - backend/src/homework/homework.service.ts
    - backend/src/homework/homework.controller.ts
    - backend/src/game/game.dto.ts
    - backend/src/game/game.repository.ts
    - backend/src/game/game.service.ts
    - backend/src/game/game.controller.ts
    - backend/src/bfa/bfa.service.ts
decisions:
  - "scoreSemantic uses URLSearchParams (not FormData) — axios compatibility with application/x-www-form-urlencoded"
  - "D-09 honored: pronScore=0 and analyzeSpeaking skipped when semanticScore < 0.2 OR matchedKeywords empty"
  - "completeSession LISTEN branch: compositeScore 0.0-1.0 * 100 = session score 0-100"
  - "TypeScript compilation clean (npx tsc --noEmit exits 0)"
self_check: PASSED
---

## What Was Built

**Task 1: DTOs** — Added `CreateListenItemDto`, `CreateListenHomeworkDto`, `UpdateListenHomeworkDto` to homework.dto.ts; added `SaveListenResultDto` to game.dto.ts.

**Task 2: BFA + Repository** — Added `scoreSemantic` method to `BfaService` (POSTs to `/score-semantic` via URLSearchParams); added `listenItemsInclude` to game.repository.ts; updated `sessionInclude` to include `listenResults`; added `saveListenResult` upsert method.

**Task 3: Homework CRUD** — Added `listenItemsInclude` to homework.repository.ts; added `findListenById`, `createListenHomework`, `updateListenHomework` to repository; extended service with validation and service methods; added `CreateListenHomeworkDto`/`UpdateListenHomeworkDto` imports.

**Task 4: Controllers + Service scoring** — Added `saveListenResult` to `GameService` with full D-05 pipeline (transcribe → semantic → conditional BFA per D-09); added LISTEN branch in `completeSession`; added `listen-result` route to `GameController`; added `uploadAudio` endpoint and LISTEN routes to `HomeworkController`.

## Verification

- `grep "CreateListenHomeworkDto" backend/src/homework/homework.dto.ts` ✓
- `grep "SaveListenResultDto" backend/src/game/game.dto.ts` ✓
- `grep "scoreSemantic" backend/src/bfa/bfa.service.ts` ✓
- `grep "listenItemsInclude" backend/src/game/game.repository.ts` ✓
- `grep "saveListenResult" backend/src/game/game.service.ts` ✓
- `grep "semanticScore \* 0.7" backend/src/game/game.service.ts` ✓ (D-06)
- `grep "semanticScore >= 0.2" backend/src/game/game.service.ts` ✓ (D-09)
- `grep "listen-result" backend/src/game/game.controller.ts` ✓
- `grep "createListen\b" backend/src/homework/homework.controller.ts` ✓
- `cd backend && npx tsc --noEmit` exits 0 ✓
