---
phase: 08-vocabulary-image
plan: "03"
subsystem: frontend/teacher-creation
tags: [nextjs, mui, dnd-kit, vocabulary, admin-api, typescript]
dependency_graph:
  requires: ["08-02"]
  provides:
    - VOCABULARY HomeworkType in admin-api.ts
    - VocabItem / VocabHomeworkDetail / CreateVocabHomeworkInput types
    - createVocabHomework / getVocabHomework / updateVocabHomework CRUD functions
    - saveVocabResult (multipart POST /game/session/:id/vocab-result)
    - GameSession.vocabItems field
    - PhonicsItemResult.vocabItem / vocabItemId fields (nullable wordId/word)
    - VOCABULARY option in TypePickerModal (4-col grid, orange #FFB26B, redirect panel)
    - VocabCreationPage component at /teacher/homework/create/vocabulary
  affects:
    - frontend/lib/admin-api.ts
    - frontend/app/teacher/homework/page.tsx
    - frontend/app/teacher/homework/_components/VocabCreationPage.tsx
    - frontend/app/teacher/homework/create/vocabulary/page.tsx
    - frontend/app/game/homework/page.tsx (exhaustiveness fix)
    - frontend/app/teacher/homework/[id]/page.tsx (exhaustiveness fix)
tech_stack:
  added: []
  patterns:
    - Named export component pattern (VocabCreationPage) matching ReadingCreationPage
    - DnD reorder via @dnd-kit PointerSensor(distance:4) + KeyboardSensor + arrayMove
    - uploadSpeakingImage reuse for vocab image upload (same MinIO endpoint)
    - crypto.randomUUID() as stable DnD clientId per item
    - Redirect panel pattern (dashed border box + CTA button) matching READING branch
key_files:
  created:
    - frontend/app/teacher/homework/_components/VocabCreationPage.tsx
    - frontend/app/teacher/homework/create/vocabulary/page.tsx
  modified:
    - frontend/lib/admin-api.ts
    - frontend/app/teacher/homework/page.tsx
    - frontend/app/game/homework/page.tsx
    - frontend/app/teacher/homework/[id]/page.tsx
decisions:
  - "VocabCreationPage uses router.back() (not Link href) for back link per UI-SPEC"
  - "slotProps.htmlInput used instead of inputProps for maxLength — MUI v5 API"
  - "VOCABULARY exhaustiveness fix applied to game/homework/page.tsx and [id]/page.tsx as Rule 1 auto-fix"
  - "PhonicsItemResult.wordId and .word made optional (nullable) to match backend schema from 08-01"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-06-02"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 6
---

# Phase 8 Plan 03: Vocabulary Teacher Creation Slice Summary

Vocab API contract centralized in admin-api.ts (CRUD + saveVocabResult + session types) and teacher creation UI delivered: VOCABULARY joins the type picker as a 4th option (orange #FFB26B, 4-col grid, redirect panel), and VocabCreationPage provides image upload + word label + DnD reorder for up to 10 items at /teacher/homework/create/vocabulary.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | API client vocab support + TypePickerModal VOCABULARY option | 5566ae2 | admin-api.ts, homework/page.tsx, game/homework/page.tsx, [id]/page.tsx |
| 2 | VocabCreationPage component + route | 332817f | VocabCreationPage.tsx, create/vocabulary/page.tsx |

## What Was Built

### Task 1: admin-api.ts Vocab Contract

**New types added:**

```typescript
export interface VocabItem {
  id: number;
  homeworkId: number;
  imageUrl: string;
  word: string;
  phonemes?: string | null;
  order: number;
}

export interface CreateVocabItemInput { imageUrl: string; word: string; phonemes?: string[]; }
export interface CreateVocabHomeworkInput { name: string; items: CreateVocabItemInput[]; }
export interface UpdateVocabHomeworkInput { name?: string; items?: CreateVocabItemInput[]; }

export interface VocabHomeworkDetail {
  id: number; name: string | null; type: 'VOCABULARY';
  vocabItems: VocabItem[]; assignments: AssignmentItem[]; createdAt: string;
}
```

**HomeworkItem extended:** `vocabItems?: VocabItem[]`

**GameSession extended:** `vocabItems?: VocabItem[]`

**PhonicsItemResult extended (for 08-04/08-05 consumers):**
```typescript
wordId?: number | null;   // was: wordId: number (now nullable — vocab rows have no wordId)
word?: HomeworkWord | null;  // was: word: HomeworkWord
vocabItemId?: number | null;
vocabItem?: VocabItem | null;
```

**New CRUD functions:**
```typescript
createVocabHomework(data: CreateVocabHomeworkInput) → POST /homework/vocab → VocabHomeworkDetail
getVocabHomework(id: number) → GET /homework/vocab/:id → VocabHomeworkDetail
updateVocabHomework(id, data: UpdateVocabHomeworkInput) → PUT /homework/vocab/:id → VocabHomeworkDetail
```

**saveVocabResult signature (contract for 08-04):**
```typescript
export async function saveVocabResult(
  sessionId: number,
  vocabItemId: number,
  audio?: Blob,
): Promise<PhonicsItemResult>
// Posts multipart FormData {vocabItemId, audio?} to /game/session/:id/vocab-result
// Returns PhonicsItemResult with vocabItem and bfa fields populated
```

### Task 1: homework/page.tsx TypePickerModal Extension

- `TYPE_META.VOCABULARY = { label: 'Vocabulary', icon: ImageIcon, color: '#FFB26B', bg: '#FFB26B18' }`
- Type-selector grid: `repeat(3, 1fr)` → `repeat(4, 1fr)`
- VOCABULARY redirect panel added (dashed border box, "Vocabulary homework is created in the dedicated editor.", CTA "Open Vocabulary Editor" → `/teacher/homework/create/vocabulary`)
- Modal submit button guard: `form.type !== 'READING'` → `form.type !== 'READING' && form.type !== 'VOCABULARY'`
- `onNavigateToVocab` prop wired from HomeworkPage (`router.push('/teacher/homework/create/vocabulary')`)
- `counts` object: added `VOCABULARY: 0` key
- Filter tabs: added `{ key: 'VOCABULARY', label: 'Vocabulary', icon: null }` entry
- Card render: added VOCABULARY branch showing `{n} item(s)` chip
- `openEdit`: early-return for VOCABULARY (no modal edit in Phase 8)

### Task 2: VocabCreationPage

**Location:** `frontend/app/teacher/homework/_components/VocabCreationPage.tsx`

**Key behaviors:**

| Feature | Implementation |
|---------|---------------|
| Back link | `← Back to Homework` (onClick: router.back()) — first element, above heading |
| Heading | `"New · Vocabulary"` — "New ·" in text.secondary, "Vocabulary" in #FFB26B |
| Homework name | TextField, label "Homework name", placeholder "e.g. Animals — Unit 3" |
| Items caption | `"Items (up to 10)"` uppercase |
| DnD | DndContext + SortableContext verticalListSortingStrategy, PointerSensor(distance:4) + KeyboardSensor |
| Image zone | 160×160px, dashed #E2E8F0 idle / solid #4F9DFF hover, ImageIcon + "Upload image" idle, img objectFit cover uploaded |
| Image upload | accept image/*, 5MB client-side guard ("Image must be under 5MB."), CircularProgress 24px, uploadSpeakingImage() |
| Word field | TextField label="Word" size="small" placeholder="e.g. apple" slotProps.htmlInput.maxLength=32 |
| Remove button | IconButton X(16) size="small" color="error" aria-label="Remove item {N}" |
| Add button | Button variant="outlined" startIcon=Plus(16) "Add Image", disabled at 10 items |
| Validation | "Add at least one item." / "Each item needs an image." / "Each item needs a word label." |
| Save | createVocabHomework -> router.push('/teacher/homework') — no toast (matches reading) |
| Save button | variant="contained" "Save Vocabulary Homework" / "Saving…" full width large |

**Route:** `frontend/app/teacher/homework/create/vocabulary/page.tsx` — thin wrapper rendering `<VocabCreationPage />`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript exhaustiveness: VOCABULARY missing from TYPE_META in two existing files**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** `frontend/app/game/homework/page.tsx` and `frontend/app/teacher/homework/[id]/page.tsx` both define `Record<HomeworkType, ...>` that became exhaustiveness errors when VOCABULARY was added to the union
- **Fix:** Added `VOCABULARY: { label: 'Vocabulary', icon: BookOpen/BookOpen, color: '#FFB26B', bg: '#FFB26B18' }` to each file's local TYPE_META
- **Files modified:** frontend/app/game/homework/page.tsx, frontend/app/teacher/homework/[id]/page.tsx
- **Commit:** 5566ae2

**2. [Rule 1 - Bug] MUI v5 slotProps API: inputProps deprecated for TextField maxLength**
- **Found during:** Task 2 TypeScript check
- **Issue:** `inputProps={{ maxLength: 32 }}` caused TS2322 type error on the Word TextField in VocabCreationPage
- **Fix:** Replaced with `slotProps={{ htmlInput: { maxLength: 32 } }}` (correct MUI v5 API)
- **Files modified:** VocabCreationPage.tsx
- **Commit:** 332817f

## Known Stubs

None — all implemented features are fully wired:
- `createVocabHomework` calls the real `/homework/vocab` endpoint (implemented in 08-02)
- `uploadSpeakingImage` calls the real `/homework/image` endpoint (existing)
- `saveVocabResult` calls the real `/game/session/:id/vocab-result` endpoint (implemented in 08-02)
- VOCABULARY badge in the homework list shows `vocabItems.length` from the API response

## Threat Flags

No new threat surface beyond the plan's threat model. Applied mitigations:
- T-08-08 (DoS — image size): 5MB client-side guard in handleImageUpload (`file.size > 5 * 1024 * 1024`)
- T-08-09 (Tampering — malicious file): `accept="image/*"` on the hidden file input
- T-08-10 (Spoofing — unauthenticated): uploadSpeakingImage and createVocabHomework both send Bearer token via authHeaders()

## Self-Check: PASSED

Files confirmed to exist:
- `frontend/lib/admin-api.ts` — contains VOCABULARY, createVocabHomework, saveVocabResult, VocabItem, GameSession.vocabItems, PhonicsItemResult.vocabItem
- `frontend/app/teacher/homework/page.tsx` — contains repeat(4, 1fr), Open Vocabulary Editor, #FFB26B, form.type !== 'READING' && form.type !== 'VOCABULARY'
- `frontend/app/teacher/homework/_components/VocabCreationPage.tsx` — contains Back to Homework, router.back(), Save Vocabulary Homework, createVocabHomework, 5 * 1024 * 1024, verticalListSortingStrategy
- `frontend/app/teacher/homework/create/vocabulary/page.tsx` — renders VocabCreationPage

Commits confirmed:
- 5566ae2: `feat(08-03): vocab API contract + VOCABULARY type picker`
- 332817f: `feat(08-03): VocabCreationPage + /teacher/homework/create/vocabulary route`

Build: `npm run build` — PASSED (0 errors, /teacher/homework/create/vocabulary 5.53 kB)
TypeScript: `npx tsc --noEmit` — PASSED (0 errors)
