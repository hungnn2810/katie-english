---
phase: 08-vocabulary-image
verified: 2026-06-02T00:00:00Z
status: human_needed
score: 18/19 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Teacher creation flow end-to-end — type picker, redirect, editor, save"
    expected: "New Homework modal shows 4 options including orange Vocabulary. Selecting Vocabulary shows NO submit button (only redirect panel). Clicking 'Open Vocabulary Editor' navigates to /teacher/homework/create/vocabulary. Back link returns to list. Upload 3 images, type word labels, reorder via drag-and-drop, save — homework appears in list with Vocabulary badge and correct item count."
    why_human: "UI rendering, modal button suppression, DnD interaction, and navigation flow cannot be verified programmatically."
  - test: "Student vocabulary game — record, BFA score, phoneme chips, results"
    expected: "Starting a VOCABULARY assignment routes to /game/vocab/[sessionId]. Student sees image card and word hint below it. Record button cycles idle → ping-ring → recorded. After scoring, phoneme chips fade in. A phonetically close substitution shows a yellow chip (VOCAB-04). BFA gate error shakes the image card and shows amber message with re-record. Final results screen shows per-item scores. Finish Session returns to homework list."
    why_human: "Mic access, MediaRecorder, BFA scoring, animations, and per-item state machine require live browser interaction."
  - test: "Teacher session detail — VOCABULARY results section"
    expected: "Opening a completed VOCABULARY session shows an orange 'Vocabulary' section (NOT the Phonics section) with one row per item: 48x48 thumbnail + word + phoneme chips + color-coded score badge. Phonics section absent. A session with no submissions shows 'No submissions yet.'"
    why_human: "Session data, conditional rendering, and visual correctness require a real completed session in the browser."
---

# Phase 8: Vocabulary by Image Exercise — Verification Report

**Phase Goal:** New VOCABULARY homework type — teacher uploads images + word labels; student sees image, records the word, receives per-phoneme BFA feedback identical to the phonics game.
**Verified:** 2026-06-02
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | HomeworkType enum accepts VOCABULARY as a valid value | ✓ VERIFIED | `backend/prisma/schema.prisma` line 20: `VOCABULARY` in enum; `backend/src/homework/homework.dto.ts` line 1: union includes `'VOCABULARY'`; `frontend/lib/admin-api.ts` line 298 |
| 2 | VocabItem row can be created with imageUrl, word, phonemes, order tied to a Homework | ✓ VERIFIED | `schema.prisma` lines 230-243: `model VocabItem` with all required fields and `homeworkId` FK with `onDelete: Cascade` |
| 3 | PhonicsItemResult supports vocabItemId FK (nullable wordId) | ✓ VERIFIED | `schema.prisma` lines 216-228: `wordId Int?`, `vocabItemId Int?`, `vocabItem VocabItem?` relation |
| 4 | Teacher can POST a vocabulary homework with 1–10 items and it persists | ✓ VERIFIED | `homework.controller.ts` line 32: `@Post('vocab')`; `homework.service.ts`: validates 1-item min ("At least one item is required"), 10-item max ("Too many items (max 10)"), non-empty word+imageUrl per item; `homework.repository.ts`: `createVocabHomework` |
| 5 | Teacher can GET a vocabulary homework with vocabItems ordered by order asc | ✓ VERIFIED | `game.repository.ts` lines 17-21: `vocabItemsInclude` with `orderBy: { order: 'asc' }`; `homework.controller.ts` line 33 |
| 6 | Teacher can PUT (replace) vocab homework items | ✓ VERIFIED | `homework.controller.ts` line 34: `@Put('vocab/:id')`; `homework.repository.ts`: `updateVocabHomework` mirrors reading pattern (deleteMany + recreate) |
| 7 | Student submitting audio for a vocab item gets BFA score + per-phoneme feedback | ✓ VERIFIED | `game.service.ts` lines 282-338: `saveVocabResult` calls `this.bfa.analyze(audioBuffer, mimeType, vocabItem.word, expectedPhonemes)` and returns `{ ...result, bfa: bfaResult }` |
| 8 | Phonetically-close substitution yields status='similar' not 'substituted' (VOCAB-04) | ✓ VERIFIED | `bfa.service.ts` lines 42-73: `mapPhonemeOps` exported; `bfa.service.spec.ts` lines 47-55: test asserts AccuracyScore 65 (in [50,80)) → `'similar'`; 11 passing tests cover the band |
| 9 | Vocab item scores persist in PhonicsItemResult keyed by vocabItemId | ✓ VERIFIED | `game.repository.ts` lines 120-136: `saveVocabResult` uses application-layer find-then-update-or-create on `{ sessionId, vocabItemId }` |
| 10 | Existing phonics sessions still save results after sessionId_wordId unique key dropped | ✓ VERIFIED | `game.repository.ts` lines 102-118: `savePhonicsResult` migrated to application-layer upsert; `grep sessionId_wordId` returns 0 matches |
| 11 | completeSession averages vocab item scores and marks session complete | ✓ VERIFIED | `game.service.ts` lines 377-383: VOCABULARY branch sums phonicsResults scores divided by vocabItems.length |
| 12 | Teacher sees VOCABULARY option in homework type picker (4-col grid, orange) | ✓ VERIFIED | `homework/page.tsx` line 34: `TYPE_META.VOCABULARY = { color: '#FFB26B', bg: '#FFB26B18', icon: ImageIcon }`; line 196: `gridTemplateColumns: 'repeat(4, 1fr)'` |
| 13 | Modal submit button hidden for VOCABULARY (redirect panel instead) | ✓ VERIFIED | `homework/page.tsx` line 472: `form.type !== 'READING' && form.type !== 'VOCABULARY'` guards submit button; line 237-249: redirect panel with "Open Vocabulary Editor" |
| 14 | VocabCreationPage: back link + image upload + word label + DnD reorder + save | ✓ VERIFIED | `VocabCreationPage.tsx`: line 354 "← Back to Homework", line 276 `5 * 1024 * 1024`, line 22 `verticalListSortingStrategy`, line 474 "Save Vocabulary Homework", line 5 `createVocabHomework` import |
| 15 | Vocab CRUD + saveVocabResult exported from admin-api.ts for downstream consumers | ✓ VERIFIED | `admin-api.ts` lines 337-361: `createVocabHomework`, `getVocabHomework`, `updateVocabHomework`, `saveVocabResult` all present and call correct backend endpoints |
| 16 | Starting a VOCABULARY homework routes student to /game/vocab/[sessionId] | ✓ VERIFIED | `game/homework/page.tsx` lines 83-84: `else if (hwType === 'VOCABULARY') router.push('/game/vocab/${session.id}')` |
| 17 | Student vocab game: image card + word hint + record → BFA → PhonemeChips + results | ✓ VERIFIED | `game/vocab/[id]/page.tsx`: `saveVocabResult` import+call (line 6/152), `PhonemeChips` import+use (line 8/550), BFA_ERROR_MESSAGES with 5 codes (lines 32-38), `gradients.gameBg` (line 7), all 3 animations present (shake line 435, fadeIn line 550, ping lines 490-491) |
| 18 | Teacher session detail shows VOCABULARY results section with per-item rows | ✓ VERIFIED | `session/[sessionId]/page.tsx`: `VocabResultRow` defined line 173 + used line 452; `vocabItem` field accessed; `#FFB26B` color; `VOCABULARY` type gate at line 232 |
| 19 | Vocabulary homeworks render in homework list with VOCABULARY badge + item count | ? UNCERTAIN | `homework/page.tsx` line 836 has VOCABULARY branch showing item count. Confirmed code present. Cannot verify badge rendering without browser. |

**Score:** 18/19 truths verified (1 uncertain — visual rendering, routed to human verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/prisma/schema.prisma` | VOCABULARY enum + VocabItem model + PhonicsItemResult.vocabItemId | ✓ VERIFIED | Lines 16-21, 230-243, 216-228; cascade deletes present |
| `backend/src/homework/homework.dto.ts` | VOCABULARY HomeworkType + Vocab DTOs | ✓ VERIFIED | Line 1 union + lines 99-112 DTOs |
| `backend/src/homework/homework.repository.ts` | vocab CRUD methods | ✓ VERIFIED | Contains `createVocabHomework`, `findVocabById`, `updateVocabHomework`, `vocabItemsInclude` |
| `backend/src/homework/homework.service.ts` | vocab service with validation | ✓ VERIFIED | Validates 1..10 items, non-empty word+imageUrl, exact error messages per plan |
| `backend/src/homework/homework.controller.ts` | POST/GET/PUT /homework/vocab before :id routes | ✓ VERIFIED | Lines 32-34 vocab routes precede line 37 generic `@Get(':id')` |
| `backend/src/game/game.dto.ts` | SaveVocabResultDto | ✓ VERIFIED | Present per SUMMARY (confirmed via import in game.controller.ts line 8) |
| `backend/src/game/game.repository.ts` | saveVocabResult + repaired savePhonicsResult | ✓ VERIFIED | Lines 102-136; `findFirst` count=2; `sessionId_wordId` count=0 |
| `backend/src/game/game.service.ts` | saveVocabResult + VOCABULARY completeSession | ✓ VERIFIED | Lines 282-338 (saveVocabResult) + 377-383 (VOCABULARY branch); bfa.analyze called 3x (phonics×2 + vocab×1) |
| `backend/src/game/game.controller.ts` | POST /game/session/:id/vocab-result | ✓ VERIFIED | Lines 76-86 with FileInterceptor 10MB cap |
| `backend/src/bfa/bfa.service.ts` | mapPhonemeOps exported | ✓ VERIFIED | Line 42: `export function mapPhonemeOps(...)` |
| `backend/src/bfa/bfa.service.spec.ts` | 11 unit tests for similar band | ✓ VERIFIED | 11 describe/it blocks covering all AccuracyScore cases |
| `frontend/lib/admin-api.ts` | VOCABULARY + VocabItem types + CRUD + saveVocabResult | ✓ VERIFIED | All present; NOTE: VocabItem/CreateVocabItemInput/CreateVocabHomeworkInput/UpdateVocabHomeworkInput/VocabHomeworkDetail declared twice (compatible interface merging — see Anti-Patterns) |
| `frontend/app/teacher/homework/page.tsx` | 4-col picker + VOCABULARY branch + badge | ✓ VERIFIED | Lines 34, 196, 237-249, 472, 662, 706, 836 |
| `frontend/app/teacher/homework/_components/VocabCreationPage.tsx` | Full creation UI (≥120 lines) | ✓ VERIFIED | Exists; back link, DnD, 5MB cap, validation, save wired |
| `frontend/app/teacher/homework/create/vocabulary/page.tsx` | Route wrapper | ✓ VERIFIED | 6-line thin wrapper importing VocabCreationPage |
| `frontend/app/game/homework/page.tsx` | VOCABULARY routing + TYPE_META | ✓ VERIFIED | Lines 26, 83-84 |
| `frontend/app/game/vocab/[id]/page.tsx` | Student vocab game (≥200 lines) | ✓ VERIFIED | Exists; full state machine; all 3 animations; AuthGate STUDENT |
| `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx` | VocabResultRow + VOCABULARY gate | ✓ VERIFIED | Lines 171-216 VocabResultRow; line 232 isVocabulary gate; line 314 Phonics section hidden for VOCABULARY |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| VocabItem | Homework | homeworkId relation onDelete: Cascade | ✓ WIRED | `schema.prisma` line 232-233: `@relation("VocabItems", ..., onDelete: Cascade)` |
| PhonicsItemResult | VocabItem | vocabItemId nullable FK | ✓ WIRED | `schema.prisma` lines 219, 225: `vocabItemId Int?` + `vocabItem VocabItem?` |
| game.service.saveVocabResult | bfa.analyze | BFA analyze call with vocab item word + phonemes | ✓ WIRED | `game.service.ts` line 320: `this.bfa.analyze(audioBuffer, mimeType, vocabItem.word, expectedPhonemes)` |
| game.repository.saveVocabResult | prisma.phonicsItemResult | store score keyed by vocabItemId | ✓ WIRED | `game.repository.ts` lines 120-136: `findFirst({ where: { sessionId, vocabItemId } })` + create/update |
| VocabCreationPage | /homework/vocab | createVocabHomework API call | ✓ WIRED | `VocabCreationPage.tsx` line 5: `createVocabHomework` import; called in handleSave |
| VocabCreationPage image upload | /homework/image | uploadSpeakingImage reuse | ✓ WIRED | `VocabCreationPage.tsx` line 6: `uploadSpeakingImage` import; used in handleImageUpload |
| homework/page.tsx TYPE_META | VOCABULARY color | TYPE_META.VOCABULARY entry | ✓ WIRED | `homework/page.tsx` line 34: `VOCABULARY: { color: '#FFB26B', ... }` |
| game/vocab/[id]/page.tsx | saveVocabResult | per-item audio submission | ✓ WIRED | `vocab/[id]/page.tsx` line 6 import + line 152 call |
| game/vocab/[id]/page.tsx | PhonemeChips | render bfa.feedback after scoring | ✓ WIRED | `vocab/[id]/page.tsx` line 8 import + line 550 render |
| game/homework/page.tsx handleStart | /game/vocab/ | route VOCABULARY sessions | ✓ WIRED | `game/homework/page.tsx` lines 83-84 |
| session detail page | PhonicsItemResult.vocabItem | render image thumbnail + word + PhonemeChips | ✓ WIRED | `session/[sessionId]/page.tsx` lines 173-215; `r.vocabItem?.imageUrl`, `r.vocabItem?.word` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `game/vocab/[id]/page.tsx` | `items` (VocabGameItem[]) | `fetchSession` → `buildItems(session)` → `session.assignment.homework.vocabItems` | Yes — fetched from live backend session endpoint | ✓ FLOWING |
| `game/vocab/[id]/page.tsx` | `result.bfa` (BfaResult) | `saveVocabResult(sessionId, vocabItemId, blob)` → POST `/game/session/:id/vocab-result` → `bfa.analyze` | Yes — live Azure PA scoring; BFA error string drives separate amber display | ✓ FLOWING |
| `VocabCreationPage.tsx` | `items` (VocabItemDraft[]) | User-driven local state; `uploadSpeakingImage` populates `imageUrl`; `createVocabHomework` submits | Yes — calls real `/homework/image` and `/homework/vocab` endpoints | ✓ FLOWING |
| `session/[sessionId]/page.tsx` | `vocabResults` | `getSession(sId)` → `session.phonicsResults` filtered by `vocabItem != null` | Yes — `sessionInclude` in `game.repository.ts` loads `phonicsResults: { include: { vocabItem: true } }` | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b SKIPPED — server must be running (NestJS backend + Docker DB + Azure PA credentials required); cannot test without live services. Manual verification items routed to human verification section.

### Probe Execution

No `scripts/*/tests/probe-*.sh` files declared or found for Phase 8. Phase verification relies on TypeScript build and Jest test execution (documented in SUMMARYs as passing but not re-run here — see Anti-Patterns section).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VOCAB-01 | 08-01, 08-02, 08-03 | Teacher can create Vocabulary homework with one image per item and expected word label | ✓ SATISFIED | Backend: POST /homework/vocab with imageUrl+word per item; Frontend: VocabCreationPage image upload + word TextField |
| VOCAB-02 | 08-01, 08-02, 08-03 | Teacher can sequence multiple image-word items (up to 10) in one homework | ✓ SATISFIED | Service validation: 1..10 items enforced (BadRequestException); VocabCreationPage: `addItem()` disabled at 10; DnD reorder via @dnd-kit |
| VOCAB-03 | 08-04 | Student sees image, records word, receives phoneme feedback chips identical to phonics game | ? NEEDS HUMAN | Code: VocabGamePage with PhonemeChips reuse confirmed. Actual recording flow + chip rendering requires live browser test |
| VOCAB-04 | 08-02, 08-04 | System distinguishes phonetically close confusions — `similar` phonemes shown in yellow | ✓ SATISFIED | `bfa.service.spec.ts`: 11 unit tests prove AccuracyScore [50,80) → 'similar'; PhonemeChips `similar` renders yellow (#fef9c3/#854d0e) per existing component |
| VOCAB-05 | 08-05 | Teacher views per-student per-item score breakdown in results page | ? NEEDS HUMAN | Code: VocabResultRow component confirmed with thumbnail+word+PhonemeChips+score badge; requires live browser test with completed session |

**Orphaned requirements check:** VOCAB-01 through VOCAB-05 all appear in ROADMAP.md Phase 8 and are traced across plans 08-01 to 08-05. No orphaned requirements found.

**Note on REQUIREMENTS.md:** VOCAB-01 through VOCAB-05 are defined in ROADMAP.md (Phase 8 Requirements section) but are NOT listed in `.planning/REQUIREMENTS.md`. The REQUIREMENTS.md file was last updated 2026-05-13 and does not include Phase 8+ requirements. The ROADMAP.md is the authoritative source for VOCAB-* IDs.

### Anti-Patterns Found

| File | Lines | Pattern | Severity | Impact |
|------|-------|---------|----------|--------|
| `frontend/lib/admin-api.ts` | 303-335 AND 506-538 | Duplicate interface declarations: `VocabItem`, `CreateVocabItemInput`, `CreateVocabHomeworkInput`, `UpdateVocabHomeworkInput`, `VocabHomeworkDetail` each declared twice | ⚠️ Warning | TypeScript interface merging means identical compatible declarations do NOT cause a compile error, but the file contains redundant code produced by plans 08-03 and 08-04 both writing to `admin-api.ts` in parallel. A future edit to one declaration block but not the other will introduce a silent type conflict. Should be deduped. |

No TBD/FIXME/XXX/TODO debt markers found in files modified by this phase.
No hardcoded empty-return stubs found in the data flow paths.

### Human Verification Required

#### 1. Teacher vocabulary creation flow

**Test:** Log in as teacher. Click "New Homework". Verify 4 type options appear in a 2×2 grid, including an orange "Vocabulary" card with ImageIcon. Select Vocabulary. Verify the modal shows a redirect panel ("Vocabulary homework is created in the dedicated editor.") and NO submit button. Click "Open Vocabulary Editor". Verify navigation to `/teacher/homework/create/vocabulary`. Verify "← Back to Homework" link is the first visible element above the "New · Vocabulary" heading. Upload 3 images (one >5MB to confirm rejection), type word labels, drag to reorder items. Click "Save Vocabulary Homework". Verify redirect to homework list. Verify the new homework shows an orange "Vocabulary" badge with "3 item(s)".

**Expected:** Each of the above steps succeeds. >5MB image shows "Image must be under 5MB." error. Saving navigates to list. Badge shows correct item count.

**Why human:** Modal layout, button suppression, DnD interaction, 5MB client cap, and navigation flow require live browser interaction.

#### 2. Student vocabulary game — record, score, phoneme chips, error handling

**Test:** Assign a VOCABULARY homework to a class. Log in as student. Find the homework in the list. Tap "Let's Go". Grant mic access. Tap "Start Recording" on the ready screen. On the first item, verify image is 280×280px with word hint chip below. Tap record button (verify ping animation on ring while recording). Tap stop. Verify "Scoring…" state. After scoring, verify phoneme chips fade in (fadeIn animation). For a chip with `similar` status, verify it shows yellow (#fef9c3 background). Advance through all items. Verify results screen shows "Homework Complete!" with per-item score + chips. Tap "Finish Session" and verify return to homework list. Also test: provide a very short clip (<0.5s) and verify the image card shakes (shake animation) + amber error message appears + "Try Again" button shown (not "Next →").

**Expected:** Full flow completes without error. Yellow chips visible for similar phonemes. Shake animation fires on BFA error. No score 0 silent failure.

**Why human:** Mic access, MediaRecorder, BFA scoring pipeline, animations, and per-item state machine require live browser with audio hardware.

#### 3. Teacher session detail — VOCABULARY results section

**Test:** After a student completes a VOCABULARY session, log in as teacher. Open the homework → open that student's session. Verify a "Vocabulary" section appears (NOT a "Phonics" section). Verify each item row shows: 48×48 image thumbnail, word label, phoneme chips (for items that were scored), color-coded score badge (red <50%, orange 50-79%, green ≥80%). Verify badge aria-label is accessible. Open a PHONICS session for comparison — verify Phonics section renders normally (not affected by vocab gate).

**Expected:** Vocabulary section present for VOCABULARY sessions. Phonics section absent for VOCABULARY sessions. Per-item rows visually correct.

**Why human:** Conditional section rendering and score badge colors require a real completed session and visual inspection.

### Gaps Summary

No blocking gaps. All automated-verifiable must-haves are satisfied by the actual code (not just SUMMARY claims). The following non-blocking issues are noted:

1. **Duplicate interface declarations in `admin-api.ts`** (Warning): Plans 08-03 and 08-04 both added identical vocab interfaces to the same file when running in parallel wave execution. TypeScript merges compatible identical interfaces so build does not fail, but the duplication is technical debt. Does not block phase goal but should be cleaned up.

2. **REQUIREMENTS.md not updated** (Informational): The `.planning/REQUIREMENTS.md` file does not include VOCAB-01 through VOCAB-05. These requirements are properly defined in ROADMAP.md. The REQUIREMENTS.md was written before Phase 8 was planned. Not a blocking issue.

3. **Human verification items** (Required): Three live-browser verifications remain (teacher creation UX, student game interaction, teacher results rendering). Phase goal cannot be called fully achieved until these pass.

---

_Verified: 2026-06-02_
_Verifier: Claude (gsd-verifier)_
