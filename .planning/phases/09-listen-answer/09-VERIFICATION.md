---
phase: 09-listen-answer
verified: 2026-06-03T00:00:00Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Teacher creates a LISTEN homework end-to-end via /teacher/homework/create/listen"
    expected: "Audio upload zone accepts mp3/wav/webm, uploads file, shows Headphones icon + filename. Save Homework creates homework and redirects to /teacher/homework."
    why_human: "Audio file input, upload zone state transitions (empty/uploading/uploaded), and redirect cannot be verified by grep alone."
  - test: "Student plays a LISTEN session at /game/listen/[id]"
    expected: "Audio prompt auto-plays on load (or shows Play button if browser blocks autoplay). Mic button records, stops, triggers scoring. Transcript + matched keyword chips + composite score appear."
    why_human: "MediaRecorder, audio auto-play, and visual feedback sequence require a running browser environment."
  - test: "D-09 amber banner shown when semantic score is below 0.2"
    expected: "Banner text 'hãy thử lại, nghe kỹ câu hỏi nhé' appears in amber box; Try Again button offered."
    why_human: "Requires live scoring response with semanticScore < 0.2 to trigger the UI path."
  - test: "Results screen shows 72px final score, per-item cards with Semantic/Pronunciation breakdown"
    expected: "Each card shows transcript, keyword chips, and 'Semantic: X% · Pronunciation: Y%' row."
    why_human: "Requires completing a full session to reach the results screen."
  - test: "bfa-service /score-semantic endpoint responds correctly"
    expected: "POST with student_text, expected_text, keywords returns semantic_score float and matched_keywords list; all-MiniLM-L6-v2 model loaded."
    why_human: "Requires Docker compose stack running; model download (~80MB) needed on first build."
---

# Phase 09: Listen & Answer Verification Report

**Phase Goal:** Build the Listen & Answer exercise — LISTEN homework type with audio prompts, student game page, semantic scoring via sentence-transformers, pronunciation scoring via BFA, and teacher creation UI.
**Verified:** 2026-06-03
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | HomeworkType enum contains LISTEN variant | VERIFIED | `schema.prisma` line 21: `LISTEN` present in enum |
| 2 | ListenItem model with audioUrl, keywords, expectedText, order fields | VERIFIED | `schema.prisma` lines 306-320: all required fields present with Cascade delete and `@@index([homeworkId])` |
| 3 | ListenItemResult model with semanticScore, pronScore, compositeScore, transcript, bfaFeedback fields | VERIFIED | `schema.prisma` lines 321-336: all D-03 field names exact (transcript, pronScore, bfaFeedback) |
| 4 | Homework.listenItems and HomeworkSession.listenResults back-relations | VERIFIED | `schema.prisma` lines 133, 201: both back-relations present |
| 5 | POST /score-semantic endpoint exists in bfa-service/main.py with all-MiniLM-L6-v2 | VERIFIED | `bfa-service/main.py`: score-semantic (3 matches), minilm_loaded, all-MiniLM-L6-v2 — all present; sentence-transformers==2.7.0 in requirements.txt |
| 6 | bfa-service wired in docker-compose.yml; backend depends on it with BFA_SERVICE_URL | VERIFIED | `docker-compose.yml`: 4 bfa-service matches; BFA_SERVICE_URL env var present |
| 7 | POST /homework/listen, GET /homework/listen/:id, PUT /homework/listen/:id routes | VERIFIED | `homework.controller.ts` lines 65-67: all three routes present and delegate to service |
| 8 | POST /game/session/:id/listen-result scores and upserts ListenItemResult | VERIFIED | `game.controller.ts` line 99: route present; `game.service.ts` line 396: saveListenResult implemented |
| 9 | Composite formula: semanticScore * 0.7 + (pronScore / 100) * 0.3 | VERIFIED | `game.service.ts` line 468: exact formula present |
| 10 | D-09: BFA analyzeSpeaking only called when semanticScore >= 0.2 | VERIFIED | `game.service.ts` line 448: `if (semanticScore >= 0.2 && matchedKeywords.length > 0)` |
| 11 | Teacher creation page at /teacher/homework/create/listen with ListenCreationPage | VERIFIED | Both files exist; createListenHomework, uploadAudio, useSortable, Add Question, Save Homework all present in ListenCreationPage.tsx |
| 12 | Student game page at /game/listen/[id] with audio auto-play, transcript, keyword chips, composite score, D-09 amber banner | VERIFIED | `game/listen/[id]/page.tsx`: saveListenResult, audioRef (4 hits), audio.play(), semanticScore < 0.2 amber banner, hãy thử lại text, Semantic·Pronunciation breakdown, compositeScore*100 rendering — all present |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/prisma/schema.prisma` | LISTEN enum + 2 models | VERIFIED | LISTEN enum, ListenItem, ListenItemResult all present |
| `bfa-service/main.py` | FastAPI /score-semantic + /health | VERIFIED | score-semantic, minilm_loaded, all-MiniLM-L6-v2 found |
| `bfa-service/requirements.txt` | sentence-transformers==2.7.0 | VERIFIED | Present |
| `bfa-service/Dockerfile` | FROM python:3.11-slim | VERIFIED | File exists |
| `docker-compose.yml` | bfa-service service + BFA_SERVICE_URL | VERIFIED | 4 bfa-service matches + BFA_SERVICE_URL |
| `backend/src/homework/homework.dto.ts` | CreateListenHomeworkDto, CreateListenItemDto | VERIFIED | Present |
| `backend/src/homework/homework.repository.ts` | findListenById, createListenHomework, updateListenHomework | VERIFIED | All three methods present |
| `backend/src/homework/homework.service.ts` | LISTEN CRUD service methods | VERIFIED | createListenHomework, findListenById, updateListenHomework, CreateListenHomeworkDto import |
| `backend/src/homework/homework.controller.ts` | POST/GET/PUT /homework/listen + POST /homework/audio | VERIFIED | Lines 52, 65-67 |
| `backend/src/game/game.dto.ts` | SaveListenResultDto | VERIFIED | Present |
| `backend/src/game/game.repository.ts` | saveListenResult upsert + listenItemsInclude | VERIFIED | Lines 23, 36, 54, 169 |
| `backend/src/game/game.service.ts` | saveListenResult + LISTEN branch in completeSession | VERIFIED | Lines 396, 502 |
| `backend/src/game/game.controller.ts` | POST /game/session/:id/listen-result | VERIFIED | Line 99 |
| `backend/src/bfa/bfa.service.ts` | scoreSemantic method | VERIFIED | Lines 233, 238 |
| `frontend/lib/admin-api.ts` | ListenItem, createListenHomework, uploadAudio, saveListenResult, listenItems on GameSession/HomeworkItem | VERIFIED | Lines 298, 348, 382, 391, 435, 641, 760 |
| `frontend/app/teacher/homework/_components/ListenCreationPage.tsx` | Full creation component | VERIFIED | createListenHomework, uploadAudio, useSortable, Add Question, Save Homework all present |
| `frontend/app/teacher/homework/create/listen/page.tsx` | Next.js page route | VERIFIED | File exists |
| `frontend/app/teacher/homework/page.tsx` | LISTEN in TYPE_META, HomeworkModal LISTEN redirect | VERIFIED | Headphones import, TYPE_META LISTEN entry, onNavigateToListen, create/listen path — all present |
| `frontend/app/game/listen/[id]/page.tsx` | Full student game page | VERIFIED | saveListenResult, audioRef, audio.play, hãy thử lại, Semantic·Pronunciation, compositeScore*100, AuthGate |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ListenItem` | `Homework` | homeworkId FK with Cascade | VERIFIED | schema.prisma: `@relation("ListenItems"...)` onDelete: Cascade |
| `ListenItemResult` | `HomeworkSession` | sessionId FK with Cascade | VERIFIED | schema.prisma: sessionId relation with Cascade |
| `game.controller.ts /listen-result` | `game.service.ts saveListenResult` | `this.service.saveListenResult` | VERIFIED | game.controller.ts line 114 |
| `game.service.ts saveListenResult` | `bfa.service.ts scoreSemantic` | `this.bfa.scoreSemantic` | VERIFIED | game.service.ts line 396+; scoreSemantic in bfa.service.ts |
| `game.service.ts saveListenResult` | `game.repository.ts saveListenResult` | `this.repo.saveListenResult` | VERIFIED | game.service.ts line 471 |
| `game.repository.ts sessionInclude` | `listenResults` | listenItemsInclude spread | VERIFIED | game.repository.ts line 36, 54 |
| `ListenCreationPage` | `createListenHomework` | handleSave calls createListenHomework | VERIFIED | ListenCreationPage.tsx line 356 |
| `ListenCreationPage audio zone` | `uploadAudio` | handleAudioUpload | VERIFIED | ListenCreationPage.tsx line 314 |
| `homework/page.tsx HomeworkModal` | `/teacher/homework/create/listen` | onNavigateToListen router.push | VERIFIED | page.tsx line 702 |
| `game/listen/[id]/page.tsx` | `saveListenResult` | handleStopAndScore | VERIFIED | game/listen/[id]/page.tsx line 179 |
| `game/listen/[id]/page.tsx AudioRef` | `item.audioUrl` | useEffect auto-plays audio | VERIFIED | page.tsx lines 158-165 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| LISTEN-01 | 09-01 | LISTEN HomeworkType enum variant in schema | VERIFIED | schema.prisma LISTEN enum |
| LISTEN-02 | 09-01 | ListenItem model with required fields | VERIFIED | schema.prisma model ListenItem |
| LISTEN-03 | 09-01 | ListenItemResult model with scoring fields | VERIFIED | schema.prisma model ListenItemResult |
| LISTEN-04 | 09-02 | bfa-service /score-semantic endpoint with sentence-transformers | VERIFIED | bfa-service/main.py |
| LISTEN-05 | 09-03 | POST/GET/PUT /homework/listen CRUD API | VERIFIED | homework.controller.ts + service + repo |
| LISTEN-06 | 09-03 | POST /game/session/:id/listen-result scoring pipeline | VERIFIED | game.controller.ts + game.service.ts |
| LISTEN-07 | 09-04 | Teacher creation UI at /teacher/homework/create/listen | VERIFIED | ListenCreationPage.tsx + page.tsx |
| LISTEN-08 | 09-05 | Student game page at /game/listen/[id] | VERIFIED | game/listen/[id]/page.tsx |
| LISTEN-09 | 09-03, 09-05 | D-09: BFA gated by semanticScore >= 0.2; amber banner in UI | VERIFIED | game.service.ts line 448; game/listen page line 614 |
| LISTEN-10 | 09-02 | docker-compose bfa-service wired with backend dependency | VERIFIED | docker-compose.yml |

**Note:** LISTEN-01 through LISTEN-10 requirement IDs are used consistently in plan frontmatter but do **not appear in `.planning/REQUIREMENTS.md`**. REQUIREMENTS.md only defines SPEAK-*, READ-*, TEACH-*, STUDENT-*, BFA-* IDs mapped to Phases 1-5. The LISTEN-* IDs appear to be phase-local identifiers defined in the context doc (09-CONTEXT.md) rather than project-level requirements. This is an informational gap — the LISTEN homework feature is implemented in full, but the REQUIREMENTS.md traceability table does not include Phase 09 or LISTEN-* IDs. No implementation gap; documentation gap only.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| No blockers found | — | — | — |

No `TBD`, `FIXME`, `XXX` debt markers found in phase-modified files. No stub returns (empty arrays/objects passed to rendering without data source). All scoring, upload, and CRUD paths call real APIs.

---

### Human Verification Required

#### 1. Teacher LISTEN Homework Creation Flow

**Test:** Log in as teacher, navigate to /teacher/homework, click + New Homework, select LISTEN type, click "Open Listen Editor". On the creation page: add a question, click the audio upload zone, upload an mp3/wav/webm file under 10MB.
**Expected:** Zone transitions empty → CircularProgress → Headphones + filename. Fill in Expected Answer and Keywords fields. Click "Save Homework". Homework created; page redirects to /teacher/homework showing new LISTEN card with Headphones icon.
**Why human:** Audio file input onChange, upload zone state machine transitions, and redirect require a running Next.js dev server and real browser interaction.

#### 2. Student LISTEN Game Session

**Test:** Assign a LISTEN homework to a student. Log in as student, go to homework list, open the LISTEN assignment. Play through the game: observe audio auto-play; press mic button; speak; press stop.
**Expected:** Audio prompt plays automatically on each question load. Mic circle transitions: idle (grey) → recording (red with ping ring) → scoring (spinner) → recorded (green check). After scoring: transcript appears in italic, matched keyword chips shown in green, composite score shown at 48px.
**Why human:** MediaRecorder, audio element autoplay, and recording state transitions require a real browser with mic access and a running compose stack.

#### 3. D-09 Amber Banner

**Test:** In a live game session, submit an audio response with poor/wrong answer that gets semanticScore < 0.2 from bfa-service.
**Expected:** Amber banner appears: "hãy thử lại, nghe kỹ câu hỏi nhé". "Try Again" button shown. No keyword chips displayed. Score shows 0% or very low.
**Why human:** Requires live scoring with a genuinely low-confidence response to trigger the < 0.2 path.

#### 4. Results Screen Layout

**Test:** Complete all items in a LISTEN session and reach the results screen.
**Expected:** 72px final score at top. Per-item cards each show: "Question N" label, transcript in italic, matched keyword chips (if any), "Semantic: X% · Pronunciation: Y%" breakdown row. Finish button navigates to /game/homework.
**Why human:** Requires completing a full session to render the results screen.

#### 5. bfa-service Docker Container

**Test:** `docker compose up bfa-service`. After startup, `curl http://localhost:8001/health`.
**Expected:** Returns `{"status": "ok", "minilm_loaded": true}`. Then: `curl -X POST http://localhost:8001/score-semantic -F "student_text=The cat is red" -F "expected_text=The cat is red" -F 'keywords=["red","cat"]'` returns `{"semantic_score": >0.9, "matched_keywords": ["red","cat"]}`.
**Why human:** Requires Docker and ~80MB model download to build the image and load all-MiniLM-L6-v2 at startup.

---

### Gaps Summary

No automated gaps found. All 12 must-have truths are VERIFIED in the codebase:
- DB schema fully extended (LISTEN enum, ListenItem, ListenItemResult models)
- bfa-service created with /score-semantic endpoint and docker-compose wiring
- NestJS backend: full CRUD for LISTEN homework, scoring pipeline with composite formula, D-09 threshold, session completion branch
- Frontend: admin-api.ts extended, ListenCreationPage component, teacher homework page wired, student game page complete

The only outstanding items are human-testable runtime behaviors (audio playback, MediaRecorder, live scoring) that cannot be verified by static code analysis.

---

_Verified: 2026-06-03_
_Verifier: Claude (gsd-verifier)_
