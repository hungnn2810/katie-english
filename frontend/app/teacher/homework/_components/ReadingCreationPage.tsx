'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createReadingHomework,
  updateReadingHomework,
  getReadingHomework,
  uploadSpeakingImage,
} from '@/lib/admin-api';
import type {
  CreateReadingActivityInput,
  CreateReadingHomeworkInput,
  ReadingActivityType,
  SentenceSegment,
} from '@/lib/admin-api';
import { gradients } from '@/lib/colors';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ────────────────────────────────────────────────────────────────────

type ReadingActivityDraft = CreateReadingActivityInput & { clientId: string };

// ── Sentence tokenizer helpers (module-scope, no React deps) ─────────────────

function tokenizeSentence(sentence: string): SentenceSegment[] {
  const tokens = sentence.match(/\S+|\s+/g) ?? [];
  return tokens.map((text) => ({ text, blank: false }));
}

function reindexBlanks(segments: SentenceSegment[]): SentenceSegment[] {
  let idx = 0;
  return segments.map((s) => (s.blank ? { ...s, blankIndex: idx++ } : s));
}

function toggleBlankAt(segments: SentenceSegment[], i: number): SentenceSegment[] {
  const seg = segments[i];
  if (!seg || seg.text.trim() === '') return segments; // skip whitespace tokens
  const next = segments.map((s, j) => {
    if (j !== i) return s;
    if (s.blank) return { text: s.text, blank: false };
    return { text: s.text, blank: true, correctWord: s.text, distractors: [] };
  });
  return reindexBlanks(next);
}

// ── FillBlank → SentenceSegment reconstruction (for edit-mode prefill) ───────
// The backend stores FillBlank as one row per FILL_BLANK activity with:
//   sentence: "The ___ sat on ___" (blanks replaced with ___)
//   choices:  [correctWord0, ...distractors0, correctWord1, ...distractors1, ...]
// We reconstruct segment tokens from the sentence text + choice groupings.

interface FillBlankChoiceShape { word: string; isCorrect: boolean }
interface FillBlankShape { sentence: string; choices: FillBlankChoiceShape[] }

function reconstructSegments(fillBlanks: FillBlankShape[]): SentenceSegment[] {
  if (!fillBlanks?.length) return [];
  const fb = fillBlanks[0]; // one row per activity
  const { sentence, choices } = fb;

  // Group choices into per-blank groups: each isCorrect:true starts a new group
  const blankGroups: { correctWord: string; distractors: string[] }[] = [];
  let current: { correctWord: string; distractors: string[] } | null = null;
  for (const c of choices) {
    if (c.isCorrect) {
      if (current) blankGroups.push(current);
      current = { correctWord: c.word, distractors: [] };
    } else if (current) {
      current.distractors.push(c.word);
    }
  }
  if (current) blankGroups.push(current);

  // Split sentence by ___ to get text parts
  const parts = sentence.split('___');
  // parts.length === blankGroups.length + 1

  const segments: SentenceSegment[] = [];
  let blankIdx = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // Tokenize the text part into word/whitespace tokens
    if (part) {
      const tokens = part.match(/\S+|\s+/g) ?? [];
      for (const text of tokens) {
        segments.push({ text, blank: false });
      }
    }
    // Insert blank segment for this position (except after the last part)
    if (i < blankGroups.length) {
      const g = blankGroups[i];
      segments.push({
        text: g.correctWord,
        blank: true,
        blankIndex: blankIdx++,
        correctWord: g.correctWord,
        distractors: g.distractors,
      });
    }
  }
  return segments;
}

// ── MatchingActivityEditor ────────────────────────────────────────────────────

function MatchingActivityEditor({
  activity,
  onUpdate,
  onUploadError,
}: {
  activity: ReadingActivityDraft;
  onUpdate: (patch: Partial<ReadingActivityDraft>) => void;
  onUploadError: (msg: string) => void;
}) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const pairs = activity.pairs ?? [];

  function addPair() {
    if (pairs.length >= 6) return;
    onUpdate({ pairs: [...pairs, { imageUrl: '', word: '' }] });
  }

  function removePair(idx: number) {
    onUpdate({ pairs: pairs.filter((_, i) => i !== idx) });
  }

  function updatePairWord(idx: number, word: string) {
    onUpdate({ pairs: pairs.map((p, i) => (i === idx ? { ...p, word } : p)) });
  }

  async function uploadPairImage(idx: number, file: File) {
    setUploadingIdx(idx);
    onUploadError('');
    try {
      const url = await uploadSpeakingImage(file);
      onUpdate({ pairs: pairs.map((p, i) => (i === idx ? { ...p, imageUrl: url } : p)) });
    } catch (err: unknown) {
      onUploadError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingIdx(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-textSecondary">{pairs.length} / 6 pairs</span>
      </div>

      {pairs.length === 0 ? (
        <p className="text-xs text-textSecondary italic mb-3">No pairs yet — click &quot;+ Add pair&quot; to start.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {pairs.map((pair, i) => (
            <div key={i} className="bg-background rounded-xl border border-border p-3">
              {pair.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pair.imageUrl}
                  alt={pair.word}
                  className="w-20 h-20 rounded-lg object-cover mb-2 mx-auto"
                />
              ) : (
                <label className="flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-secondary/40 bg-secondary/5 mb-2 mx-auto cursor-pointer hover:bg-secondary/10 relative">
                  {uploadingIdx === i ? (
                    <svg className="w-5 h-5 animate-spin text-secondary" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      if (e.target.files?.[0]) uploadPairImage(i, e.target.files[0]);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              )}
              <input
                className="input-base text-sm py-2"
                placeholder="Word label"
                value={pair.word}
                onChange={(e) => updatePairWord(i, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removePair(i)}
                aria-label="Remove pair"
                className="block text-center mt-1 text-xs text-highlight hover:text-red-600 w-full"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {pairs.length < 6 ? (
        <button
          type="button"
          onClick={addPair}
          className="text-sm font-bold text-secondary hover:underline"
        >
          + Add pair
        </button>
      ) : (
        <span className="text-xs font-bold text-textSecondary opacity-60">Maximum 6 pairs reached</span>
      )}

      {pairs.length === 1 && (
        <p className="text-xs text-highlight mt-2">Add at least 2 image-word pairs.</p>
      )}
    </div>
  );
}

// ── FillInBlankActivityEditor ─────────────────────────────────────────────────

function FillInBlankActivityEditor({
  activity,
  onUpdate,
}: {
  activity: ReadingActivityDraft;
  onUpdate: (patch: Partial<ReadingActivityDraft>) => void;
}) {
  const segments = activity.segments ?? [];
  const sentenceText = segments.map((s) => s.text).join('');
  const hasExistingBlanks = segments.some((s) => s.blank);

  function setSentence(sentence: string) {
    onUpdate({ segments: tokenizeSentence(sentence) });
  }

  function toggleSegmentBlank(segIdx: number) {
    onUpdate({ segments: toggleBlankAt(segments, segIdx) });
  }

  function updateDistractors(blankIndex: number, distractors: string[]) {
    const next = segments.map((s) =>
      s.blank && s.blankIndex === blankIndex ? { ...s, distractors } : s
    );
    onUpdate({ segments: next });
  }

  const blanks = segments
    .filter((s) => s.blank)
    .sort((a, b) => (a.blankIndex ?? 0) - (b.blankIndex ?? 0));

  return (
    <div>
      {/* Sentence textarea */}
      <div className="mb-3">
        <label className="block text-xs font-bold text-textSecondary uppercase tracking-wide mb-1">
          Sentence
        </label>
        {hasExistingBlanks && (
          <p className="text-xs text-amber-600 mb-1">
            Editing the sentence will clear existing blanks.
          </p>
        )}
        <textarea
          rows={2}
          className="input-base resize-none"
          placeholder="Type a sentence, then click words below to mark them as blanks"
          value={sentenceText}
          onChange={(e) => setSentence(e.target.value)}
        />
      </div>

      {/* Word chips */}
      {segments.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-2">
            Click a word to make it a blank
          </div>
          <div className="flex flex-wrap gap-1.5">
            {segments.map((s, i) => {
              if (s.text.trim() === '') {
                // Whitespace token — render as non-interactive spacer
                return <span key={i} className="inline-block w-2" aria-hidden />;
              }
              if (s.blank) {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSegmentBlank(i)}
                    className="bg-primary text-white px-2.5 py-1 rounded-lg text-sm font-semibold flex items-center gap-1"
                    aria-label={`Remove blank for "${s.text}"`}
                  >
                    ___
                    <span className="text-xs opacity-80">×</span>
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleSegmentBlank(i)}
                  className="bg-gray-100 text-textPrimary px-2.5 py-1 rounded-lg text-sm hover:bg-primary/10 cursor-pointer"
                  aria-label={`Make "${s.text}" a blank`}
                >
                  {s.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Distractor inputs — one row per blank */}
      {blanks.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-1">
            Distractors per blank
          </div>
          {blanks.map((b) => (
            <div key={b.blankIndex} className="flex items-center gap-2">
              <span className="text-xs font-mono text-textSecondary shrink-0 w-24">
                Blank {(b.blankIndex ?? 0) + 1}: &quot;{b.correctWord}&quot;
              </span>
              <input
                className="flex-1 px-3 py-1.5 rounded-lg border border-border text-sm"
                value={(b.distractors ?? []).join(', ')}
                onChange={(e) =>
                  updateDistractors(
                    b.blankIndex!,
                    e.target.value
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="Comma-separated distractors (e.g. dog, bird)"
              />
            </div>
          ))}
        </div>
      )}

      {segments.length === 0 && (
        <p className="text-xs text-textSecondary italic">
          Type a sentence above to get started.
        </p>
      )}
    </div>
  );
}

// ── SortableActivityCard ──────────────────────────────────────────────────────

function SortableActivityCard({
  id,
  index,
  activity,
  onRemove,
  onUpdate,
  onUploadError,
}: {
  id: string;
  index: number;
  activity: ReadingActivityDraft;
  onRemove: () => void;
  onUpdate: (patch: Partial<ReadingActivityDraft>) => void;
  onUploadError: (msg: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="card overflow-hidden bg-white rounded-2xl border border-border shadow-card">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background/50">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Drag to reorder"
          className="cursor-grab active:cursor-grabbing p-3 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5 text-textSecondary" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </button>

        {activity.type === 'MATCH' ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary/15 text-secondary">
            Matching
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-accent/20 text-amber-700">
            Fill in the Blank
          </span>
        )}

        <span className="text-xs font-bold text-textSecondary ml-auto">Activity {index + 1}</span>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove activity"
          className="text-xs font-bold text-highlight hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
        >
          Remove
        </button>
      </div>

      <div className="px-5 py-4">
        {activity.type === 'MATCH' ? (
          <MatchingActivityEditor activity={activity} onUpdate={onUpdate} onUploadError={onUploadError} />
        ) : (
          <FillInBlankActivityEditor activity={activity} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  );
}

// ── ReadingCreationPage ───────────────────────────────────────────────────────

export function ReadingCreationPage({ editId }: { editId?: number }) {
  const router = useRouter();
  const editMode = typeof editId === 'number';

  const [name, setName] = useState('');
  const [activities, setActivities] = useState<ReadingActivityDraft[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [initialLoading, setInitialLoading] = useState(editMode);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Edit-mode prefill: fetch existing homework and populate form state
  useEffect(() => {
    if (!editMode || !editId) return;
    (async () => {
      try {
        const hw = await getReadingHomework(editId);
        setName(hw.name ?? '');
        const drafts: ReadingActivityDraft[] = (hw.readingActivities ?? []).map((a) => {
          if (a.type === 'MATCH') {
            return {
              clientId: crypto.randomUUID(),
              type: 'MATCH' as ReadingActivityType,
              pairs: (a.matchPairs ?? []).map((p) => ({ imageUrl: p.imageUrl, word: p.word })),
            };
          } else {
            // FILL_BLANK: reconstruct SentenceSegment[] from fillBlanks DB shape
            const segs = reconstructSegments(
              (a.fillBlanks ?? []) as FillBlankShape[]
            );
            return {
              clientId: crypto.randomUUID(),
              type: 'FILL_BLANK' as ReadingActivityType,
              segments: segs,
            };
          }
        });
        setActivities(drafts);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load homework.');
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [editId, editMode]);

  function addMatchingActivity() {
    setActivities((prev) => [
      ...prev,
      { clientId: crypto.randomUUID(), type: 'MATCH' as ReadingActivityType, pairs: [] },
    ]);
  }

  function addFillBlankActivity() {
    setActivities((prev) => [
      ...prev,
      { clientId: crypto.randomUUID(), type: 'FILL_BLANK' as ReadingActivityType, segments: [] },
    ]);
  }

  function removeActivity(clientId: string) {
    setActivities((prev) => prev.filter((a) => a.clientId !== clientId));
  }

  function updateActivity(clientId: string, patch: Partial<ReadingActivityDraft>) {
    setActivities((prev) =>
      prev.map((a) => (a.clientId === clientId ? { ...a, ...patch } : a))
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setActivities((prev) => {
        const oldIdx = prev.findIndex((a) => a.clientId === active.id);
        const newIdx = prev.findIndex((a) => a.clientId === over.id);
        if (oldIdx < 0 || newIdx < 0) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  function validate(): string | null {
    if (!name.trim()) return 'Homework name is required.';
    if (activities.length === 0) return 'Add at least one activity.';

    for (let idx = 0; idx < activities.length; idx++) {
      const activity = activities[idx];
      if (activity.type === 'MATCH') {
        const pairCount = activity.pairs?.length ?? 0;
        if (pairCount < 2 || pairCount > 6) {
          return `Matching activity ${idx + 1}: add 2 to 6 image-word pairs.`;
        }
        const emptyWord = (activity.pairs ?? []).some((p) => !p.word.trim());
        if (emptyWord) {
          return `Matching activity ${idx + 1}: every pair needs a word label.`;
        }
      } else {
        // FILL_BLANK — segment-based validation
        const segs = activity.segments ?? [];
        if (!segs.length || !segs.some((s) => s.blank)) {
          return `Fill-in-blank activity ${idx + 1}: needs at least one blank.`;
        }
        // Verify contiguous blankIndex sequence 0..n-1 (Pitfall 3 defense)
        const blanks = segs.filter((s) => s.blank).sort((a, b) => (a.blankIndex ?? 0) - (b.blankIndex ?? 0));
        for (let i = 0; i < blanks.length; i++) {
          if (blanks[i].blankIndex !== i) {
            return `Fill-in-blank activity ${idx + 1}: internal blank index out of sequence — try toggling one blank again.`;
          }
        }
        // Require at least 1 distractor per blank (D-08)
        if (blanks.some((b) => !(b.distractors?.length ?? 0))) {
          return `Fill-in-blank activity ${idx + 1}: each blank needs at least one distractor.`;
        }
      }
    }

    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);

    const payload: CreateReadingHomeworkInput = {
      name: name.trim(),
      activities: activities.map(({ clientId: _clientId, ...rest }) => rest),
    };

    try {
      if (editMode && editId) {
        await updateReadingHomework(editId, payload);
      } else {
        await createReadingHomework(payload);
      }
      router.push('/teacher/homework');  // D-03: no AssignModal auto-open
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setLoading(false);
    }
  }

  // Show loading placeholder while fetching existing homework in edit mode
  if (initialLoading) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto px-8 py-8 flex items-center justify-center min-h-64">
        <div className="flex items-center gap-3 text-textSecondary">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/teacher/homework" className="text-sm text-textSecondary hover:text-textPrimary">
            ← Back
          </Link>
          <h1 className="text-2xl font-black text-textPrimary mt-1">
            {editMode ? 'Edit Reading Homework' : 'New Reading Homework'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Try button (D-05) — only visible in edit mode when a DB row exists */}
          {editMode && editId && (
            <button
              type="button"
              onClick={() => router.push(`/teacher/homework/${editId}/try`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#F0623A' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg> Try
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex items-center gap-2 shrink-0 disabled:opacity-60"
            style={{ background: gradients.greenSecondary }}
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {loading ? 'Saving…' : editMode ? 'Update' : 'Create'}
          </button>
        </div>
      </div>

      {/* Homework name */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-textSecondary uppercase tracking-wide mb-2">
          Homework Name
        </label>
        <input
          className="input-base"
          placeholder="e.g. Animals – Unit 3 Reading"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="text-sm bg-highlight/10 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}
      {uploadError && (
        <div className="text-sm bg-highlight/10 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-4">
          {uploadError}
        </div>
      )}

      {/* Activities section */}
      <div>
        <div className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-3">Activities</div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activities.map((a) => a.clientId)} strategy={verticalListSortingStrategy}>
            {activities.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border bg-background/50 py-12 text-center text-sm text-textSecondary">
                No activities yet. Use the buttons below to add a Matching or Fill-in-blank activity.
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((a, idx) => (
                  <SortableActivityCard
                    key={a.clientId}
                    id={a.clientId}
                    index={idx}
                    activity={a}
                    onRemove={() => removeActivity(a.clientId)}
                    onUpdate={(patch) => updateActivity(a.clientId, patch)}
                    onUploadError={setUploadError}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>

        {/* Add activity buttons */}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={addMatchingActivity}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 border-dashed border-secondary text-secondary hover:bg-secondary/10"
          >
            + Add Matching Activity
          </button>
          <button
            type="button"
            onClick={addFillBlankActivity}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 border-dashed border-accent text-amber-600 hover:bg-accent/10"
          >
            + Add Fill-in-blank Activity
          </button>
        </div>
      </div>
    </div>
  );
}
