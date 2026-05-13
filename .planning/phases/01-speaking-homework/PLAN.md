# Phase 1: Speaking Homework — Execution Plan

**Phase:** 1 — Speaking Homework
**Goal:** Teacher creates speaking homework (FREE_SPEAK or SCRIPT_MATCH), student uploads video/audio file, system transcribes + scores via WhisperX, teacher views score + transcript.
**Requirements:** SPEAK-01, SPEAK-02, SPEAK-03, SPEAK-04, SPEAK-05, SPEAK-06, SPEAK-07
**Mode:** mvp

---

## Tasks

### T-01: Add `speakingMode` enum + field to Prisma schema
**Requirement:** SPEAK-01, SPEAK-02 (mode distinction)
**Files:** `backend/prisma/schema.prisma`

Add `SpeakingMode` enum and `speakingMode` optional field to `Homework` model.

```prisma
enum SpeakingMode {
  FREE_SPEAK
  SCRIPT_MATCH
}
// Add to Homework model:
speakingMode SpeakingMode?
```

---

### T-02: Create Prisma migration for `speakingMode`
**Requires:** T-01
**Files:** `backend/prisma/migrations/20260510000001_add_speaking_mode/`

Run: `cd backend && npx prisma migrate dev --name add_speaking_mode`

---

### T-03: Add `speakingMode` to backend DTOs
**Requires:** T-01
**Files:** `backend/src/homework/homework.dto.ts`

Add `speakingMode?: 'FREE_SPEAK' | 'SCRIPT_MATCH'` to `CreateHomeworkDto` and `UpdateHomeworkDto`. Also add `SpeakingMode` type export.

---

### T-04: Add `calcFreeSpeak` scoring function
**Files:** `backend/src/game/game.scoring.ts`

```typescript
export function calcFreeSpeak(
  transcript: string,
  keywords: string,
): { score: number; matchedWords: number; totalWords: number } {
  const kws = keywords
    .split(',')
    .map((k) => k.toLowerCase().trim())
    .filter(Boolean);
  if (kws.length === 0) return { score: 0, matchedWords: 0, totalWords: 0 };
  const text = transcript.toLowerCase();
  const matched = kws.filter((kw) => text.includes(kw)).length;
  return {
    score: Math.round((matched / kws.length) * 100),
    matchedWords: matched,
    totalWords: kws.length,
  };
}
```

---

### T-05: Update `saveSpeakingResult` to branch on speaking mode
**Requires:** T-01, T-04
**Files:** `backend/src/game/game.service.ts`

In `saveSpeakingResult`, after fetching homework:
- If `hw.speakingMode === 'FREE_SPEAK'`: call `calcFreeSpeak(transcribedText, hw.speakingText)`
- Otherwise (SCRIPT_MATCH or null/undefined): call existing `calcSpeakingScore(transcribedText, hw.speakingText)`

Also update MinIO key in `completeSession` from `sessions/{sessionId}/recording.{ext}` to `speaking/{sessionId}/recording.{ext}` for SPEAKING type.

---

### T-06: Update homework service/repository to persist `speakingMode`
**Requires:** T-01, T-03
**Files:** `backend/src/homework/homework.service.ts`, `backend/src/homework/homework.repository.ts`

Ensure `createHomework` and `updateHomework` pass `speakingMode` through to Prisma. Add `speakingMode` to Prisma `create`/`update` data objects.

---

### T-07: Update `admin-api.ts` to include `speakingMode`
**Files:** `frontend/lib/admin-api.ts`

- Add `speakingMode?: 'FREE_SPEAK' | 'SCRIPT_MATCH'` to `CreateHomeworkInput` interface
- Add `speakingMode?: 'FREE_SPEAK' | 'SCRIPT_MATCH'` to `Homework` interface (for teacher display)

---

### T-08: Add speaking mode selector to teacher creation modal
**Requires:** T-07
**Files:** `frontend/app/teacher/homework/page.tsx`

When `form.type === 'SPEAKING'`:
1. Show mode selector (FREE_SPEAK | SCRIPT_MATCH) before the text/image fields.
2. Default mode: `SCRIPT_MATCH` (keeps backward compat with existing homeworks).
3. Conditional label: FREE_SPEAK → "Image Prompt" + "Keywords (comma-separated, e.g. cat, sits, mat)"; SCRIPT_MATCH → "Target Text".
4. Update form validation: FREE_SPEAK needs `speakingText` (keyword list); SCRIPT_MATCH needs `speakingText` (target text).
5. Include `speakingMode` in `createHomework` / `updateHomework` payload.

---

### T-09: Replace MediaRecorder with file upload in student session page (SPEAKING)
**Requires:** T-07
**Files:** `frontend/app/game/session/[id]/page.tsx`

For SPEAKING homework, skip camera/MediaRecorder entirely. Implement file-upload flow:

1. **Detect mode**: when session homework type === 'SPEAKING', enter upload mode (no camera request).
2. **Upload UI**: 
   - FREE_SPEAK: show `speakingPictureUrl` image (if set) + keyword hint text
   - SCRIPT_MATCH: show target text (`speakingText`)
   - `<input type="file" accept="video/*,audio/*">` labeled "Record on your device, then upload here"
   - Show file name + size after selection
3. **Submit**: call `saveSpeakingResult(sessionId, file)` with the file as blob, then `completeSession(sessionId)` without video (video stored by `saveSpeakingResult` via MinIO).
4. **Progress**: show uploading spinner during API call.
5. **Result screen**: show score % with color, transcript text.

PHONICS flow remains unchanged (still uses MediaRecorder/camera).

---

### T-10: Show speaking mode in teacher results page
**Files:** `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx`

In the speaking results section, add a small badge showing mode:
- `FREE_SPEAK` → "Free Speak" badge
- `SCRIPT_MATCH` → "Script Match" badge (or omit if no mode set, for old homeworks)

Fetch this from `session.assignment.homework.speakingMode`.

---

## Requirement Coverage

| Requirement | Tasks |
|-------------|-------|
| SPEAK-01: Teacher creates free-speak homework | T-01, T-02, T-03, T-06, T-07, T-08 |
| SPEAK-02: Teacher creates script-match homework | T-01, T-02, T-03, T-06, T-07, T-08 |
| SPEAK-03: Student records + uploads video | T-09 |
| SPEAK-04: Student can upload audio-only | T-09 (accept="video/*,audio/*") |
| SPEAK-05: System submits to WhisperX, stores transcript | T-05 |
| SPEAK-06: System scores transcript, stores score | T-04, T-05 |
| SPEAK-07: Teacher views score + transcript | T-10 (already mostly done) |

---

## Decision Coverage

| Decision | Tasks |
|----------|-------|
| D-01: speakingMode enum in DB | T-01, T-02 |
| D-02: FREE_SPEAK — image + keywords | T-04, T-05, T-08, T-09 |
| D-03: SCRIPT_MATCH — target text, calcSpeakingScore unchanged | T-05 |
| D-04: Score formula round(matched/total×100) | T-04 |
| D-05: Case-insensitive, partial match | T-04 |
| D-06: File upload, no MediaRecorder | T-09 |
| D-07: One video per session | T-09 |
| D-08: MinIO key speaking/{sessionId}/recording.{ext} | T-05 |
| D-09: Teacher creation modal mode selector | T-08 |
| D-10: Teacher results — mode, transcript, score, video | T-10 |

---

## Execution Order

```
T-01 → T-02 → T-03 → T-06 (backend DB + service layer)
T-04 → T-05              (scoring logic)
T-07 → T-08 → T-09      (frontend)
T-10                     (teacher results polish)
```

Parallel groups:
- T-01/T-04 can start together
- T-07 can start after T-01 (types only)
- T-08/T-09 after T-07
- T-10 independent

---

*Plan created: 2026-05-13*
