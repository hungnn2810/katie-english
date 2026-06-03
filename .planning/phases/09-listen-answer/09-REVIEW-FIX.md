---
phase: 09
fixed_at: 2026-06-03T00:00:00Z
review_path: .planning/phases/09-listen-answer/09-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 9
skipped: 1
status: partial
---

# Phase 09: Code Review Fix Report

**Fixed at:** 2026-06-03
**Source review:** .planning/phases/09-listen-answer/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (CR-01 through CR-04, WR-01 through WR-06)
- Fixed: 9
- Skipped: 1

## Fixed Issues

### CR-01: startSession has no student-ownership guard

**Files modified:** `backend/src/game/game.controller.ts`
**Commit:** 96aa221
**Applied fix:** Added `@Req() req: Request` parameter to `startSession`, extracted `callerStudentId` from the JWT payload, and throws `ForbiddenException('Cannot start a session for another student')` when the caller's studentId is absent or does not match `dto.studentId`. Also added `ForbiddenException` to the NestJS imports.

---

### CR-02: requestingStudentId defaults to 0 when JWT lacks studentId

**Files modified:** `backend/src/game/game.controller.ts`
**Commit:** 96aa221
**Applied fix:** In both `saveVocabResult` and `saveListenResult`, changed `const requestingStudentId: number = (req as any).user?.studentId ?? 0` to `const requestingStudentId: number | undefined = (req as any).user?.studentId` followed by an immediate `if (!requestingStudentId) throw new ForbiddenException('Student identity required')`. This prevents the unsafe `0` fallback from bypassing the ownership guard.

---

### CR-03: HomeworkType union in homework.dto.ts is missing 'LISTEN'

**Files modified:** `backend/src/homework/homework.dto.ts`
**Commit:** 1cca2d7
**Applied fix:** Added `| 'LISTEN'` to the `HomeworkType` union type so it now reads `'PHONICS' | 'SPEAKING' | 'READING' | 'VOCABULARY' | 'LISTEN'`. This aligns the server type with the client type in `admin-api.ts` and eliminates the compile-time inconsistency.

---

### CR-04: keywords field stored without validating it is a valid JSON array

**Files modified:** `backend/src/homework/homework.service.ts`
**Commit:** dbe994d
**Applied fix:** In `createListenHomework`, after the existing non-empty keywords check, added a `JSON.parse` + `Array.isArray` + `every(typeof k === 'string')` validation block. If keywords fails any of these checks, a `BadRequestException` is thrown with a helpful message including an example. This prevents malformed keywords from being persisted silently.

---

### WR-02: Race condition in application-layer upsert methods

**Files modified:** `backend/src/game/game.repository.ts`
**Commit:** 5bd0edb
**Applied fix:** Wrapped each of the three application-layer upsert methods (`savePhonicsResult`, `saveVocabResult`, `saveListenResult`) in a `this.prisma.$transaction(async (tx) => { ... })` block. Inside each transaction, the `findFirst` and subsequent `create`/`update` now operate on the same transaction context `tx`, serialising the find+write pair and preventing duplicate-row races on concurrent submissions.

---

### WR-03: bfa-service /score-semantic has no input length guards

**Files modified:** `bfa-service/main.py`
**Commit:** 75c29b0
**Applied fix:** Added a `MAX_TEXT_LEN = 2000` constant and an early-return guard that returns `{"semantic_score": 0.0, "matched_keywords": []}` when either `student_text` or `expected_text` exceeds 2000 characters. This prevents OOM in `SentenceTransformer.encode()` for unbounded inputs.

---

### WR-04: bfa-service /score-semantic does not validate keywords is a JSON array

**Files modified:** `bfa-service/main.py`
**Commit:** 75c29b0
**Applied fix:** Replaced the bare `kw_list: list[str] = json.loads(keywords)` with a `try/except json.JSONDecodeError` block that falls back to `kw_list = []`. Also added an `isinstance(kw_list, list)` check so a valid JSON non-array (e.g. a JSON string or object) also degrades gracefully to an empty list rather than causing a downstream error.

---

### WR-05: completeSession score calculation may produce NaN from Prisma Decimal

**Files modified:** `backend/src/game/game.service.ts`
**Commit:** 395a6e7
**Applied fix:** Changed the reduce callback type from `r: { compositeScore: number }` to `r: { compositeScore: unknown }` and wrapped the accumulation as `Number(r.compositeScore)`. This coerces any `Prisma.Decimal` object to a plain JavaScript number before arithmetic, guarding against `NaN` propagation that would be silently stored as `0` after `Math.round`.

---

### WR-06: Frontend ListenCreationPage does not validate expectedText before save

**Files modified:** `frontend/app/teacher/homework/_components/ListenCreationPage.tsx`
**Commit:** a9f1083
**Applied fix:** Added `if (!item.expectedText.trim()) return 'Each question needs an expected answer.';` inside the `validate()` for-loop, immediately after the keywords check. This surfaces the missing-expected-answer error client-side before the API call rather than after.

---

## Skipped Issues

### WR-01: listSessions endpoint double-guard pattern (redundant AuthGuard + TeacherGuard)

**File:** `backend/src/game/game.controller.ts:136-145`
**Reason:** The fix requires either (a) removing the class-level `@UseGuards(AuthGuard)` from `GameController` and adding explicit guards to every other method, or (b) merging `AuthGuard` and `TeacherGuard` into a single guard. Both approaches are broader refactors that go beyond the scope of a targeted fix and carry risk of regressions across all non-teacher routes. The current behaviour is functionally correct — the double DB lookup is a performance concern, not a security defect. Marked for human review.
**Original issue:** `GET /game/sessions` runs AuthGuard (class-level) then TeacherGuard (method-level), causing two identical DB lookups per request — a timing side-channel and unnecessary query overhead.

---

_Fixed: 2026-06-03_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
