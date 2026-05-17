# Phase 3: Teacher Dashboard - Pattern Map

**Mapped:** 2026-05-15
**Files analyzed:** 13 new/modified files
**Analogs found:** 13 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/app/teacher/homework/page.tsx` | component (modify) | request-response | itself | exact (self-mod) |
| `frontend/app/teacher/homework/[id]/page.tsx` | component (modify) | request-response | itself | exact (self-mod) |
| `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx` | component (modify) | request-response | itself | exact (self-mod) |
| `frontend/app/teacher/homework/create/reading/page.tsx` | component (new) | request-response | `frontend/app/teacher/homework/page.tsx` HomeworkModal section | role-match |
| `frontend/app/teacher/homework/[id]/edit/page.tsx` | component (new) | request-response | `frontend/app/teacher/homework/create/reading/page.tsx` | exact (same component, edit mode) |
| `frontend/app/teacher/homework/[id]/try/page.tsx` | component (modify) | event-driven | itself | exact (self-mod) |
| `frontend/lib/admin-api.ts` | utility (modify) | request-response | itself | exact (self-mod) |
| `backend/prisma/schema.prisma` | config (modify) | — | itself | exact (self-mod) |
| `backend/src/homework/homework.dto.ts` | model (modify) | — | itself | exact (self-mod) |
| `backend/src/homework/homework.repository.ts` | service (modify) | CRUD | itself | exact (self-mod) |
| `backend/src/homework/homework.service.ts` | service (modify) | CRUD | itself | exact (self-mod) |
| `backend/src/homework/homework.controller.ts` | controller (modify) | request-response | itself | exact (self-mod) |
| `backend/src/game/game.service.ts` | service (modify) | request-response | itself | exact (self-mod) |
| `backend/src/game/game.repository.ts` | service (modify) | CRUD | itself | exact (self-mod) |

---

## Pattern Assignments

### `frontend/app/teacher/homework/page.tsx` (modify — TypePickerModal + submission count + READING tab)

**Analog:** itself (lines 12-15, 163-183, 562-585)

**TYPE_META extension** (lines 12-15 — add READING entry):
```typescript
const TYPE_META: Record<HomeworkType, { label: string; emoji: string; color: string; bg: string }> = {
  PHONICS:  { label: 'Phonics',  emoji: '🔤', color: '#A78BFA', bg: '#A78BFA18' },
  SPEAKING: { label: 'Speaking', emoji: '🎤', color: '#FF9BD2', bg: '#FF9BD218' },
  READING:  { label: 'Reading',  emoji: '📖', color: '#34D399', bg: '#34D39918' }, // add
};
```

**Type picker section inside HomeworkModal** (lines 163-183 — extract into TypePickerModal):
```typescript
// The type selector block (lines 163-183) in HomeworkModal is the template for TypePickerModal.
// TypePickerModal renders three cards: PHONICS → openHomeworkModal, SPEAKING → openHomeworkModal,
// READING → router.push('/teacher/homework/create/reading')
// Reuse the button style: border-2, active uses m.color bg, inactive uses white bg with m.color border
{(Object.keys(TYPE_META) as HomeworkType[]).map((t) => {
  const m = TYPE_META[t];
  const active = form.type === t;
  return (
    <button key={t} type="button"
      onClick={() => setForm((f) => ({ ...f, type: t, ... }))}
      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 transition-all"
      style={active
        ? { background: m.color, color: 'white', borderColor: m.color }
        : { background: 'white', color: m.color, borderColor: m.color + '55' }}>
      <span>{m.emoji}</span>{m.label}
    </button>
  );
})}
```

**openCreate split** (lines 534 — replace openCreate to open TypePickerModal instead of HomeworkModal directly):
```typescript
// Before: function openCreate() { setEditingId(null); setForm(emptyForm()); setShowModal(true); }
// After: function openCreate() { setShowTypePicker(true); }
// TypePickerModal: PHONICS/SPEAKING → setShowModal(true) as before; READING → router.push('/teacher/homework/create/reading')
```

**Filter tabs** (lines 562-576 — add READING tab):
```typescript
{([
  { key: 'ALL', label: 'All' },
  { key: 'PHONICS', label: '🔤 Phonics' },
  { key: 'SPEAKING', label: '🎤 Speaking' },
  { key: 'READING', label: '📖 Reading' },  // add
] as const).map((t) => (
  <button key={t.key} onClick={() => setTypeFilter(t.key)}
    className="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all"
    style={typeFilter === t.key
      ? { background: '#F0F9FF', color: colors.primary, borderColor: colors.primary }
      : { background: 'white', color: colors.textSecondary, borderColor: colors.border }}>
    {t.label}
  </button>
))}
```

**Submission count badge on list card** (lines 670-674 — extend with X/Y enrolled):
```typescript
// Existing:
{totalSessions > 0 && (
  <div className="text-xs text-textSecondary">
    {totalSessions} submission{totalSessions !== 1 ? 's' : ''} total
  </div>
)}
// Pattern for new X/Y badge (same pill style as Open/Closed, lines 627-633):
<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
  {completedSessions} / {totalEnrolled} submitted
</span>
```

**Edit button for READING** (lines 683-685 — READING navigates, PHONICS/SPEAKING opens modal):
```typescript
// Current: onClick={() => openEdit(h)
// After: READING → router.push(`/teacher/homework/${h.id}/edit`)
//        PHONICS/SPEAKING → openEdit(h) as before
<button onClick={() => h.type === 'READING'
  ? router.push(`/teacher/homework/${h.id}/edit`)
  : openEdit(h)}
  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/8 transition-colors">
  Edit
</button>
```

---

### `frontend/app/teacher/homework/[id]/page.tsx` (modify — submission count + non-submitted list)

**Analog:** itself (lines 96-166)

**Submission count** (lines 104-110 — extend assignment header with X/Y enrolled):
```typescript
// Existing isOpen + classNames pattern (lines 97-99):
const isOpen = new Date(a.endDate) >= now;
const classNames = a.classes.map((ac) => ac.class.name).join(', ');
const sessions = a.sessions ?? [];
const completed = sessions.filter((s) => s.completedAt);

// Add after existing lines:
const totalEnrolled = a.classes.reduce(
  (sum, ac) => sum + (ac.class._count?.students ?? 0), 0
);
// Display: same pill style as Open/Closed badge (lines 106-109):
<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
  {completed.length} / {totalEnrolled} submitted
</span>
```

**Non-submitted student list** (extend assignment card — after session list):
```typescript
// Students who submitted: sessions.map(s => s.studentId)
// Non-submitted: enrolled students NOT in that set
// Data source: ac.class.students (extend findById include)
// Display pattern: same divide-y list as sessions (lines 128-155), but no link, just name + "Not submitted" label
```

**TYPE_META** (lines 8-11 — add READING):
```typescript
const TYPE_META: Record<HomeworkType, { label: string; emoji: string; color: string }> = {
  PHONICS:  { label: 'Phonics',  emoji: '🔤', color: '#A78BFA' },
  SPEAKING: { label: 'Speaking', emoji: '🎤', color: '#FF9BD2' },
  READING:  { label: 'Reading',  emoji: '📖', color: '#34D399' }, // add
};
```

---

### `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx` (modify — reading results section)

**Analog:** itself (lines 89-162)

**scoreColor / scoreHex helpers** (lines 10-20 — reuse directly for activity scores):
```typescript
function scoreColor(score: number) {
  if (score >= 80) return 'text-brand-green';
  if (score >= 50) return 'text-accent';
  return 'text-highlight';
}
function scoreHex(score: number) {
  if (score >= 80) return '#22C55E';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}
```

**Phonics results section pattern** (lines 89-111 — mirror for reading activity cards):
```typescript
// Section header + space-y-2 card list pattern:
{phonicsResults.length > 0 && (
  <div className="mb-6">
    <h2 className="text-base font-bold text-textPrimary mb-3">Phonics ({phonicsResults.length})</h2>
    <div className="space-y-2">
      {phonicsResults.map((r, i) => (
        <div key={r.id} className="bg-white border border-border rounded-2xl px-5 py-3 shadow-sm">
          ...
        </div>
      ))}
    </div>
  </div>
)}
// Reading section: replace with collapsible activity cards.
// Each card: header shows "Matching: 75%" or "Fill in Blank: 60%".
// Expand toggle: useState per activityId, chevron icon.
// Expanded content: per-item rows (matching: image + "chose X" + badge; fill-in-blank: highlighted sentence)
```

**Speaking results card pattern** (lines 113-162 — reuse score display + progress bar for activity score):
```typescript
// Score display at top-right of activity card header:
<div className="text-2xl font-black tabular-nums" style={{ color: scoreHex(pct) }}>{pct}%</div>
// Progress bar (lines 152-155):
<div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
  <div className="h-full rounded-full transition-all"
    style={{ width: `${score}%`, background: scoreHex(score) }} />
</div>
```

**GameSession import extension** (line 5 — add reading result types):
```typescript
import { getSession, GameSession, SpeakingResult, PhonicsItemResult,
  ReadingActivityResult, MatchingItemResult, FillInBlankItemResult  // add
} from '@/lib/admin-api';
```

---

### `frontend/app/teacher/homework/create/reading/page.tsx` (new page)

**Analog:** `frontend/app/teacher/homework/page.tsx` HomeworkModal (lines 19-405) + `frontend/app/teacher/homework/[id]/try/page.tsx` (full-page layout)

**Page shell — use TeacherShell wrapper** (NOT AuthGate — see try/page.tsx lines 200-208 which uses AuthGate for full-screen game; creation page is a normal teacher route):
```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createReadingHomework, uploadSpeakingImage } from '@/lib/admin-api';
import { gradients, colors } from '@/lib/colors';
// No AuthGate wrapper — TeacherShell in the layout already handles auth
```

**Form submission pattern** (HomeworkModal lines 107-138 — mirror structure):
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError('');
  // Validation: name required (D-10), min 2 pairs per matching activity (D-06)
  if (!name.trim()) { setError('Homework name is required.'); nameRef.current?.focus(); return; }
  setLoading(true);
  try {
    await createReadingHomework({ name, activities });
    router.push('/teacher/homework');  // D-03: redirect after save, no AssignModal
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Failed to save.');
  } finally {
    setLoading(false);
  }
}
```

**Save/Cancel button row** (HomeworkModal lines 390-403 — copy exactly):
```typescript
<div className="flex gap-3">
  <button type="button" onClick={() => router.push('/teacher/homework')}
    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-textSecondary border border-border hover:bg-gray-50">Cancel</button>
  <button type="submit" disabled={loading}
    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
    style={{ background: gradients.primarySecondary }}>
    {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">...</svg>}
    {loading ? 'Saving…' : editMode ? 'Update' : 'Create'}
  </button>
</div>
```

**Image upload pattern** (HomeworkModal lines 72-89 — reuse uploadSpeakingImage):
```typescript
async function uploadPairImage(actId: string, pairIdx: number, file: File) {
  setUploading(`${actId}-${pairIdx}`);
  try {
    const url = await uploadSpeakingImage(file);  // reuse: POST /homework/image, same MinIO endpoint
    setActivities(prev => prev.map(a => a.draftId !== actId ? a : {
      ...a,
      pairs: a.pairs.map((p, i) => i !== pairIdx ? p : { ...p, imageUrl: url }),
    }));
  } catch (err: unknown) {
    setUploadError(err instanceof Error ? err.message : 'Upload failed');
  } finally {
    setUploading(null);
  }
}
```

**Error display** (HomeworkModal lines 383-389 — copy style):
```typescript
{error && (
  <div className="text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-4">{error}</div>
)}
```

**DnD activity list** (RESEARCH.md Pattern 2 — @dnd-kit/sortable):
```typescript
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// SortableActivityCard:
function SortableActivityCard({ activity, ... }: ...) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: activity.draftId });  // stable draftId = crypto.randomUUID() at creation
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <button {...listeners} className="cursor-grab active:cursor-grabbing p-2">≡</button>
      {/* card content */}
    </div>
  );
}

// handleDragEnd in page:
function handleDragEnd(event) {
  const { active, over } = event;
  if (active.id !== over?.id) {
    setActivities(prev => {
      const oldIdx = prev.findIndex(a => a.draftId === active.id);
      const newIdx = prev.findIndex(a => a.draftId === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }
}
```

**Try button navigation** (homework list page lines 686-689 — same pattern):
```typescript
// On creation page header: navigate to /teacher/homework/[id]/try after save,
// OR: separate Try button that calls handleSubmit then navigates.
// Style: same as detail page Try button (detail page lines 41-48):
<button onClick={() => router.push(`/teacher/homework/${hwId}/try`)}
  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
  style={{ background: gradients.primaryPurple }}>
  <span>👁️</span> Try
</button>
```

---

### `frontend/app/teacher/homework/[id]/edit/page.tsx` (new — same component as create, edit mode)

**Analog:** `frontend/app/teacher/homework/create/reading/page.tsx` (exact same component)

This is the same ReadingCreationPage component with `editMode = true`. Prefill pattern mirrors `openEdit` in `page.tsx` (lines 535-549):
```typescript
// openEdit pattern (page.tsx lines 535-549):
setForm({
  type: h.type,
  name: h.name ?? '',
  parts: h.type === 'PHONICS' ? (h.parts ?? []).map((p) => ({
    name: p.name,
    words: p.words.map((w) => ({ text: w.text, highlight: w.highlight ?? '', imageUrl: w.imageUrl ?? '' })),
  })) : [],
  ...
});
// Mirror: fetch getReadingHomework(id) on mount, map to local draft state, set editMode=true
```

---

### `frontend/app/teacher/homework/[id]/try/page.tsx` (modify — add READING branch)

**Analog:** itself (lines 99-111 — the PHONICS/SPEAKING item-list construction)

**Homework type branch** (lines 99-111 — add READING case):
```typescript
// Current pattern:
const list: ItemEntry[] = h.type === 'PHONICS'
  ? (h.parts ?? []).flatMap((part) =>
      part.words.map((word) => ({ text: word.text, transcribed: '', score: 0, state: 'waiting' as ItemState }))
    )
  : h.speakingText
    ? [{ text: h.speakingText, transcribed: '', score: 0, state: 'waiting' as ItemState }]
    : [];

// Add READING branch: return from getReadingHomework(id), render activities
// READING try page is fully interactive client-side (no API save on complete — same as existing preview mode)
// Page state machine (lines 8-9) already handles 'loading'|'cam-check'|...|'results' — add READING render path
```

**Full-screen game layout** (lines 302-394 — reuse exactly for READING try):
```typescript
// Wrap in AuthGate requiredRole="TEACHER" (lines 300-394 pattern)
// gameBgAlt gradient for background
// Progress bar chips at top (lines 307-313)
// Camera panel left (lines 320-334) + content panel right (lines 336-389)
// Preview Mode badge (lines 305-306)
```

---

### `frontend/lib/admin-api.ts` (modify — HomeworkType, reading types, API functions)

**Analog:** itself (lines 239-389)

**HomeworkType extension** (line 239):
```typescript
// Before:
export type HomeworkType = 'PHONICS' | 'SPEAKING';
// After:
export type HomeworkType = 'PHONICS' | 'SPEAKING' | 'READING';
```

**New type definitions** (mirror HomeworkItem interface, lines 316-326, and GameSession, lines 341-353):
```typescript
// Segment type (D-12 canonical storage format):
export interface SentenceSegment {
  text: string;
  blank: boolean;
  blankIndex?: number;
  correctWord?: string;
  distractors?: string[];
}

export interface ReadingMatchingPair {
  id: number;
  activityId: number;
  imageUrl: string;
  word: string;
  order: number;
}

export interface FillInBlankBlank {
  id: number;
  activityId: number;
  blankIndex: number;
  correctWord: string;
  distractors: string[];
}

export interface ReadingActivity {
  id: number;
  homeworkId: number;
  type: 'MATCHING' | 'FILL_IN_BLANK';
  order: number;
  matchingPairs?: ReadingMatchingPair[];
  fillInBlank?: { id: number; sentenceSegments: SentenceSegment[]; blanks: FillInBlankBlank[] } | null;
}

export interface ReadingHomeworkDetail {
  id: number;
  name: string | null;
  type: 'READING';
  activities: ReadingActivity[];
  assignments: AssignmentItem[];
  createdAt: string;
}

// Result types (for session detail page):
export interface MatchingItemResult {
  id: number;
  activityResultId: number;
  pairId: number;
  studentChosenWord: string;
  isCorrect: boolean;
  pair?: ReadingMatchingPair;
}

export interface FillInBlankItemResult {
  id: number;
  activityResultId: number;
  blankId: number;
  studentChosenWord: string;
  isCorrect: boolean;
  blank?: FillInBlankBlank;
}

export interface ReadingActivityResult {
  id: number;
  sessionId: number;
  activityId: number;
  score: number;
  activity?: ReadingActivity;
  matchingResults?: MatchingItemResult[];
  fillInBlankResults?: FillInBlankItemResult[];
}
```

**GameSession extension** (lines 341-353 — add readingActivityResults):
```typescript
export interface GameSession {
  id: number;
  studentId: number;
  assignmentId: number;
  videoUrl?: string;
  score?: number;
  completedAt?: string;
  startedAt: string;
  assignment?: AssignmentItem;
  student?: Student;
  speakingResults?: SpeakingResult[];
  phonicsResults?: PhonicsItemResult[];
  readingActivityResults?: ReadingActivityResult[];  // add
}
```

**AssignmentClass extension** (lines 281-286 — add _count.students for D-13):
```typescript
export interface AssignmentClass {
  id: number;
  assignmentId: number;
  classId: number;
  class: ClassItem & { _count?: { students: number } };  // extend
}
```

**New API functions** (mirror createHomework/updateHomework/getHomework pattern, lines 92-98):
```typescript
// Mirror the req<T> helper pattern used throughout:
export const createReadingHomework = (data: CreateReadingHomeworkInput) =>
  req<ReadingHomeworkDetail>('/homework/reading', { method: 'POST', body: JSON.stringify(data) });
export const getReadingHomework = (id: number) =>
  req<ReadingHomeworkDetail>(`/homework/reading/${id}`);
export const updateReadingHomework = (id: number, data: UpdateReadingHomeworkInput) =>
  req<ReadingHomeworkDetail>(`/homework/reading/${id}`, { method: 'PUT', body: JSON.stringify(data) });
```

---

### `backend/prisma/schema.prisma` (modify — READING enum + 7 new models)

**Analog:** itself — existing models follow the same cascade/relation patterns

**HomeworkType enum extension** (line 16-19):
```prisma
enum HomeworkType {
  PHONICS
  SPEAKING
  READING  // add
}
```

**Cascade relation pattern** (HomeworkPart lines 131-136, HomeworkWord lines 138-150 — mirror for all new child models):
```prisma
// Established cascade pattern to replicate:
model HomeworkPart {
  homework   Homework   @relation(fields: [homeworkId], references: [id], onDelete: Cascade)
  words      HomeworkWord[]
  @@unique([homeworkId, order])
  @@map("homework_parts")
}
model HomeworkWord {
  part       HomeworkPart  @relation(fields: [partId], references: [id], onDelete: Cascade)
  @@unique([partId, order])
  @@map("homework_words")
}
// Apply onDelete: Cascade to ALL new child relations (ReadingActivity, MatchingPair,
// FillInBlankActivity, FillInBlankBlank, ReadingActivityResult, MatchingItemResult, FillInBlankItemResult)
```

**Result table pattern** (SpeakingResult lines 192-201, PhonicsItemResult lines 203-214 — mirror):
```prisma
// Established result table pattern:
model PhonicsItemResult {
  @@unique([sessionId, wordId])
  session  HomeworkSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  word     HomeworkWord    @relation(fields: [wordId], references: [id], onDelete: Cascade)
  @@map("phonics_item_results")
}
// New result tables follow same: @@unique([sessionId, activityId]) on ReadingActivityResult
// @@unique([activityResultId, pairId]) on MatchingItemResult, etc.
```

**HomeworkSession relation extension** (lines 175-189 — add readingActivityResults):
```prisma
model HomeworkSession {
  // existing...
  speakingResults SpeakingResult[]
  phonicsResults  PhonicsItemResult[]
  readingActivityResults ReadingActivityResult[]  // add
  @@map("homework_sessions")
}
```

**JSON column pattern** (Class.scheduleSlots line 75 — same approach for sentenceSegments):
```prisma
scheduleSlots Json @default("[]")
// Mirror: sentenceSegments Json  (no default; required on FillInBlankActivity)
//         distractors      Json  (no default; required on FillInBlankBlank)
```

---

### `backend/src/homework/homework.dto.ts` (modify — add READING DTOs)

**Analog:** itself (lines 1-41)

**Type extension** (line 1):
```typescript
// Before:
export type HomeworkType = 'PHONICS' | 'SPEAKING';
// After:
export type HomeworkType = 'PHONICS' | 'SPEAKING' | 'READING';
export type ReadingActivityType = 'MATCHING' | 'FILL_IN_BLANK';
```

**DTO class pattern** (lines 4-30 — mirror class-style DTOs):
```typescript
// Existing pattern: plain classes, no decorators (class-validator not used yet in this file)
export class CreateReadingPairDto {
  imageUrl: string;
  word: string;
}

export class CreateReadingActivityDto {
  type: ReadingActivityType;
  pairs?: CreateReadingPairDto[];          // for MATCHING
  segments?: SentenceSegmentDto[];         // for FILL_IN_BLANK (D-12 format)
}

export class CreateReadingHomeworkDto {
  name: string;
  activities: CreateReadingActivityDto[];
}

export class UpdateReadingHomeworkDto {
  name?: string;
  activities?: CreateReadingActivityDto[];
}
```

---

### `backend/src/homework/homework.repository.ts` (modify — reading CRUD + assignmentInclude extension)

**Analog:** itself (lines 1-142 — all patterns)

**assignmentInclude extension** (lines 12-15 — D-13):
```typescript
// Before:
const assignmentInclude = {
  classes: { include: { class: true } },
  _count: { select: { sessions: true } },
};
// After (D-13):
const assignmentInclude = {
  classes: {
    include: {
      class: {
        include: { _count: { select: { students: true } } },
      },
    },
  },
  _count: { select: { sessions: true } },
};
```

**buildPartsCreate pattern** (lines 17-33 — mirror for buildReadingActivitiesCreate):
```typescript
// Existing:
function buildPartsCreate(parts: CreateHomeworkDto['parts']) {
  if (!parts || parts.length === 0) return undefined;
  return {
    create: parts.map((part, partIdx) => ({
      name: part.name,
      order: partIdx,
      words: { create: part.words.map((word, wordIdx) => ({ ... order: wordIdx })) },
    })),
  };
}
// Mirror:
function buildReadingActivitiesCreate(activities: CreateReadingActivityDto[]) {
  if (!activities?.length) return undefined;
  return {
    create: activities.map((act, idx) => ({
      type: act.type,
      order: idx,
      ...(act.type === 'MATCHING' ? {
        matchingPairs: { create: act.pairs!.map((p, pIdx) => ({ imageUrl: p.imageUrl, word: p.word, order: pIdx })) },
      } : {
        fillInBlank: {
          create: {
            sentenceSegments: act.segments,
            blanks: {
              create: act.segments!.filter(s => s.blank).map(s => ({
                blankIndex: s.blankIndex!,
                correctWord: s.text,
                distractors: s.distractors ?? [],
              })),
            },
          },
        },
      }),
    })),
  };
}
```

**update delete-and-recreate pattern** (lines 82-96 — mirror for reading update):
```typescript
// Existing: delete HomeworkPart, then recreate via parts: buildPartsCreate(dto.parts)
async update(id: number, dto: UpdateHomeworkDto) {
  if (dto.parts !== undefined) {
    await this.prisma.homeworkPart.deleteMany({ where: { homeworkId: id } });
  }
  return this.prisma.homework.update({ where: { id }, data: { ...buildPartsCreate(dto.parts) }, include: ... });
}
// Mirror for reading:
async updateReadingHomework(id: number, dto: UpdateReadingHomeworkDto) {
  if (dto.activities !== undefined) {
    await this.prisma.readingActivity.deleteMany({ where: { homeworkId: id } });
    // Cascade onDelete handles child records (matchingPairs, fillInBlank, blanks)
  }
  return this.prisma.homework.update({ where: { id }, data: { ..., readingActivities: buildReadingActivitiesCreate(dto.activities) }, include: readingInclude });
}
```

**Repository method shape** (lines 39-101 — mirror for reading methods):
```typescript
// Existing findAll/findById/create/update/delete shape:
findAll()  { return this.prisma.homework.findMany({ ... include: { ...partsInclude, assignments: { include: assignmentInclude } } }); }
findById(id)  { return this.prisma.homework.findUnique({ where: { id }, include: { ... } }); }
create(dto)   { return this.prisma.homework.create({ data: { ... }, include: { ... } }); }
// Mirror: findReadingById, createReadingHomework, updateReadingHomework
// All return the same homework record with full include
```

---

### `backend/src/homework/homework.service.ts` (modify — add reading methods)

**Analog:** itself (lines 1-46)

**Service method pattern** (lines 11-27 — mirror exactly):
```typescript
// Existing:
async findById(id: number) {
  const hw = await this.repo.findById(id);
  if (!hw) throw new NotFoundException(`Homework ${id} not found`);
  return hw;
}
create(dto: CreateHomeworkDto) { return this.repo.create(dto); }
async update(id: number, dto: UpdateHomeworkDto) {
  await this.findById(id);
  return this.repo.update(id, dto);
}
// Mirror:
async findReadingById(id: number) {
  const hw = await this.repo.findReadingById(id);
  if (!hw) throw new NotFoundException(`Reading homework ${id} not found`);
  return hw;
}
createReadingHomework(dto: CreateReadingHomeworkDto) { return this.repo.createReadingHomework(dto); }
async updateReadingHomework(id: number, dto: UpdateReadingHomeworkDto) {
  await this.findReadingById(id);
  return this.repo.updateReadingHomework(id, dto);
}
```

---

### `backend/src/homework/homework.controller.ts` (modify — add reading endpoints)

**Analog:** itself (lines 1-36)

**Controller route pattern** (lines 26-30 — mirror inline style):
```typescript
// Existing:
@Get()  findAll()   { return this.service.findAll(); }
@Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); }
@Post() create(@Body() dto: CreateHomeworkDto) { return this.service.create(dto); }
@Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHomeworkDto) { return this.service.update(id, dto); }

// Mirror for reading (sub-resource prefix 'reading'):
@Post('reading')    createReading(@Body() dto: CreateReadingHomeworkDto)  { return this.service.createReadingHomework(dto); }
@Get('reading/:id') findReading(@Param('id', ParseIntPipe) id: number)    { return this.service.findReadingById(id); }
@Put('reading/:id') updateReading(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReadingHomeworkDto) { return this.service.updateReadingHomework(id, dto); }
```

**Auth guard** (lines 8-9 — already on class, applies to all new routes automatically):
```typescript
@UseGuards(AuthGuard)
@Controller('homework')
export class HomeworkController { ... }
// All new @Post/@Get/@Put routes inherit AuthGuard — no changes needed
```

**DTO import extension** (lines 4 — add new DTOs):
```typescript
import { CreateHomeworkDto, UpdateHomeworkDto, CreateAssignmentDto, UpdateAssignmentDto,
  CreateReadingHomeworkDto, UpdateReadingHomeworkDto  // add
} from './homework.dto';
```

---

### `backend/src/game/game.service.ts` (modify — completeSession READING branch)

**Analog:** itself (lines 132-159)

**completeSession SPEAKING/PHONICS branch** (lines 148-156 — mirror exactly for READING):
```typescript
// Existing two-branch pattern:
if (hw.type === 'SPEAKING') {
  const sr = session.speakingResults[0];
  avgScore = sr ? sr.score : 0;
} else {
  // PHONICS: scoreSum / totalWords
  const phonicsResults = session.phonicsResults ?? [];
  const totalWords = hw.parts.reduce((s, p) => s + p.words.length, 0);
  const scoreSum = phonicsResults.reduce((s, r) => s + r.score, 0);
  avgScore = totalWords > 0 ? scoreSum / totalWords : 0;
}

// Add READING branch (D-18: average of activity scores):
if (hw.type === 'READING') {
  const activityResults = session.readingActivityResults ?? [];
  const scores = activityResults.map((r: { score: number }) => r.score);
  avgScore = scores.length > 0
    ? scores.reduce((s: number, v: number) => s + v, 0) / scores.length
    : 0;
} else if (hw.type === 'SPEAKING') {
  ...  // existing
} else {
  ...  // existing PHONICS
}
```

**Logger pattern** (lines 11, throughout — keep same):
```typescript
private readonly logger = new Logger(GameService.name);
this.logger.log(`[session=${sessionId}] completeSession type=${hw.type} avgScore=${avgScore}`);
```

---

### `backend/src/game/game.repository.ts` (modify — extend sessionInclude for reading results)

**Analog:** itself (lines 11-21)

**sessionInclude extension** (lines 11-21 — add readingActivityResults):
```typescript
// Existing:
const sessionInclude = {
  assignment: {
    include: {
      homework: { include: homeworkInclude },
      classes: { include: { class: true } },
    },
  },
  student: true,
  speakingResults: true,
  phonicsResults: { include: { word: true } },
};

// After (add reading results):
const sessionInclude = {
  assignment: {
    include: {
      homework: { include: homeworkInclude },
      classes: { include: { class: true } },
    },
  },
  student: true,
  speakingResults: true,
  phonicsResults: { include: { word: true } },
  readingActivityResults: {
    include: {
      activity: true,
      matchingResults: { include: { pair: true } },
      fillInBlankResults: { include: { blank: true } },
    },
    orderBy: { activityId: 'asc' as const },
  },
};
```

**homeworkInclude extension** (lines 4-9 — add readingActivities for completeSession to access hw.type):
```typescript
// readingActivities not needed in homeworkInclude for completeSession —
// game.service.ts only needs hw.type for the READING branch.
// BUT: getAvailableAssignments returns homework; ensure type field is always present (it is — top-level field).
```

---

## Shared Patterns

### Authentication
**Source:** `backend/src/homework/homework.controller.ts` lines 8-9; `backend/src/game/game.controller.ts` lines 13-14
**Apply to:** All new backend routes (reading CRUD endpoints, reading result endpoint)
```typescript
@UseGuards(AuthGuard)
@Controller('homework')
// AuthGuard is class-level — all new methods inherit it automatically
```

### Error Handling (Frontend)
**Source:** `frontend/app/teacher/homework/page.tsx` HomeworkModal lines 107-138
**Apply to:** All new frontend form submissions (creation page, edit page)
```typescript
try {
  await createReadingHomework(...);
  router.push('/teacher/homework');
} catch (err: unknown) {
  setError(err instanceof Error ? err.message : 'Failed to save.');
} finally {
  setLoading(false);
}
```

### Error Display (Frontend)
**Source:** `frontend/app/teacher/homework/page.tsx` lines 383-389
**Apply to:** All new frontend pages with form submission
```typescript
{error && (
  <div className="text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-4">
    {error}
  </div>
)}
```

### NotFoundException Pattern (Backend)
**Source:** `backend/src/homework/homework.service.ts` lines 11-14
**Apply to:** All new service findById methods
```typescript
const hw = await this.repo.findReadingById(id);
if (!hw) throw new NotFoundException(`Reading homework ${id} not found`);
```

### Prisma Cascade Delete Pattern
**Source:** `backend/prisma/schema.prisma` lines 131-136 (HomeworkPart), lines 203-214 (PhonicsItemResult)
**Apply to:** All 7 new Prisma models — every child relation must carry `onDelete: Cascade`
```prisma
homework  Homework  @relation(fields: [homeworkId], references: [id], onDelete: Cascade)
```

### Score Color Helpers
**Source:** `frontend/app/teacher/homework/[id]/session/[sessionId]/page.tsx` lines 10-20
**Apply to:** Reading session results section (activity card scores, per-item badges)
```typescript
function scoreColor(score: number) { if (score >= 80) return 'text-brand-green'; if (score >= 50) return 'text-accent'; return 'text-highlight'; }
function scoreHex(score: number)   { if (score >= 80) return '#22C55E'; if (score >= 50) return '#F59E0B'; return '#EF4444'; }
```

### Image Thumbnail Pattern
**Source:** `frontend/app/teacher/homework/page.tsx` lines 241-249 (word image with × remove)
**Apply to:** Matching pair image display in creation page; matching item result thumbnails in session detail (40×40px per RESEARCH.md)
```typescript
// eslint-disable-next-line @next/next/no-img-element
<img src={imageUrl} alt={word} className="w-10 h-10 rounded-lg object-cover border border-border" />
```

### req<T> API Client Pattern
**Source:** `frontend/lib/admin-api.ts` lines 15-22
**Apply to:** All new admin-api functions (createReadingHomework, getReadingHomework, updateReadingHomework)
```typescript
async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) return parseApiError(res);
  return res.json();
}
// Usage: export const createReadingHomework = (data) => req<ReadingHomeworkDetail>('/homework/reading', { method: 'POST', body: JSON.stringify(data) });
```

### Test Mock Session Pattern
**Source:** `backend/src/game/game.service.spec.ts` lines 11-49
**Apply to:** New `game.service.spec.ts` READING test cases (extend the existing file)
```typescript
const mockReadingSession = (overrides = {}) => ({
  id: 1, studentId: 1, assignmentId: 1, completedAt: null,
  assignment: {
    homework: { type: 'READING', parts: [], speakingText: null },
  },
  speakingResults: [],
  phonicsResults: [],
  readingActivityResults: [],
  ...overrides,
});
// Test completeSession READING branch follows same structure as lines 218-256
```

---

## No Analog Found

All files have strong analogs in the codebase. The only genuinely new patterns are:

| Pattern | Source | Reason |
|---------|--------|--------|
| @dnd-kit/sortable sortable list | RESEARCH.md Pattern 2 (dndkit docs) | No drag-and-drop exists in codebase yet; use documented pattern |
| Fill-in-blank sentence tokenizer | RESEARCH.md Pattern 3 | No tokenized text editor exists; use the `match(/\S+|\s+/g)` + chip toggle pattern |

---

## Metadata

**Analog search scope:** `frontend/app/teacher/homework/`, `frontend/lib/`, `backend/src/homework/`, `backend/src/game/`, `backend/prisma/`
**Files scanned:** 14 files read in full
**Pattern extraction date:** 2026-05-15
