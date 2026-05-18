'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createHomework,
  uploadSpeakingImage,
} from '@/lib/admin-api';
import type {
  CreateReadingActivityInput,
  CreateMatchPairInput,
  CreateFillBlankItemInput,
  CreateFillBlankChoiceInput,
  ReadingActivityType,
  CreateHomeworkInput,
} from '@/lib/admin-api';
import { gradients } from '@/lib/colors';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ────────────────────────────────────────────────────────────────────

type ReadingActivityDraft = CreateReadingActivityInput & { clientId: string };

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
  const [uploading, setUploading] = useState(false);
  const pairs = activity.pairs ?? [];

  function setPair(idx: number, patch: Partial<CreateMatchPairInput>) {
    const next = pairs.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onUpdate({ pairs: next });
  }

  function removePair(idx: number) {
    onUpdate({ pairs: pairs.filter((_, i) => i !== idx) });
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = 6 - pairs.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;
    setUploading(true);
    onUploadError('');
    const newPairs: CreateMatchPairInput[] = [...pairs];
    for (const file of toUpload) {
      try {
        const url = await uploadSpeakingImage(file);
        const word = file.name.replace(/\.[^.]+$/, '');
        newPairs.push({ imageUrl: url, word });
      } catch (err: unknown) {
        onUploadError(err instanceof Error ? err.message : 'Image upload failed');
        break;
      }
    }
    onUpdate({ pairs: newPairs });
    setUploading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-textSecondary">{pairs.length} / 6 pairs</span>
        {uploading && <span className="text-xs text-textSecondary">Uploading…</span>}
      </div>

      {pairs.length === 0 ? (
        <label className="block rounded-xl border-2 border-dashed border-secondary/50 bg-secondary/5 py-8 flex flex-col items-center gap-2 cursor-pointer">
          <span className="text-2xl">🖼️</span>
          <span className="text-sm font-bold text-secondary">Click to upload images</span>
          <span className="text-xs text-textSecondary">Each image becomes a matching pair</span>
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = ''; }}
          />
        </label>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {pairs.map((pair, i) => (
              <div key={i} className="bg-background rounded-xl border border-border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pair.imageUrl}
                  alt={pair.word}
                  className="w-20 h-20 rounded-lg object-cover mb-2 mx-auto"
                />
                <input
                  className="input-base text-sm py-2"
                  placeholder="Word label"
                  value={pair.word}
                  onChange={(e) => setPair(i, { word: e.target.value })}
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
          {pairs.length < 6 ? (
            <label className="text-xs font-bold text-secondary hover:underline cursor-pointer">
              + Add images
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = ''; }}
              />
            </label>
          ) : (
            <span className="text-xs font-bold text-textSecondary opacity-60">Maximum 6 pairs reached</span>
          )}
        </>
      )}
      {pairs.length === 1 && (
        <p className="text-xs text-highlight mt-2">Add at least 2 image-word pairs.</p>
      )}
    </div>
  );
}

// ── FillBlankActivityEditor ───────────────────────────────────────────────────

function FillBlankActivityEditor({
  activity,
  onUpdate,
}: {
  activity: ReadingActivityDraft;
  onUpdate: (patch: Partial<ReadingActivityDraft>) => void;
}) {
  const items = activity.items ?? [];

  function addItem() {
    onUpdate({
      items: [
        ...items,
        {
          sentence: '',
          choices: [
            { word: '', isCorrect: true },
            { word: '', isCorrect: false },
          ],
        },
      ],
    });
  }

  function removeItem(idx: number) {
    onUpdate({ items: items.filter((_, i) => i !== idx) });
  }

  function setItem(idx: number, patch: Partial<CreateFillBlankItemInput>) {
    onUpdate({ items: items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  }

  function setChoice(itemIdx: number, choiceIdx: number, patch: Partial<CreateFillBlankChoiceInput>) {
    const it = items[itemIdx];
    setItem(itemIdx, {
      choices: it.choices.map((c, j) => (j === choiceIdx ? { ...c, ...patch } : c)),
    });
  }

  function markCorrect(itemIdx: number, choiceIdx: number) {
    const it = items[itemIdx];
    setItem(itemIdx, {
      choices: it.choices.map((c, j) => ({ ...c, isCorrect: j === choiceIdx })),
    });
  }

  function addChoice(itemIdx: number) {
    const it = items[itemIdx];
    setItem(itemIdx, { choices: [...it.choices, { word: '', isCorrect: false }] });
  }

  function removeChoice(itemIdx: number, choiceIdx: number) {
    const it = items[itemIdx];
    const next = it.choices.filter((_, j) => j !== choiceIdx);
    if (next.length > 0 && !next.some((c) => c.isCorrect)) next[0].isCorrect = true;
    setItem(itemIdx, { choices: next });
  }

  return (
    <div>
      {items.length === 0 && (
        <p className="text-xs text-textSecondary italic mb-3">No sentences yet — click &quot;+ Add sentence&quot; to start.</p>
      )}
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-border p-4 bg-background/50">
            <div className="text-xs font-bold text-textSecondary mb-2">Sentence {i + 1}</div>
            <textarea
              rows={2}
              className="input-base resize-none"
              placeholder="Type the sentence, use ___ for the blank (e.g. The cat sat on the ___)"
              value={item.sentence}
              onChange={(e) => setItem(i, { sentence: e.target.value })}
            />
            {item.sentence.length > 0 && !item.sentence.includes('___') && (
              <p className="text-xs text-highlight mt-1">Each sentence must contain ___ for the blank.</p>
            )}

            <div className="mt-3">
              <div className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-2">Word choices</div>
              {item.choices.map((c, j) => (
                <div key={j} className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    aria-label="Mark as correct answer"
                    checked={c.isCorrect}
                    onChange={() => markCorrect(i, j)}
                    className="w-4 h-4 accent-primary"
                  />
                  <input
                    className="input-base flex-1 py-2"
                    placeholder="Word option"
                    value={c.word}
                    onChange={(e) => setChoice(i, j, { word: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeChoice(i, j)}
                    aria-label="Remove choice"
                    className="text-highlight text-sm hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addChoice(i)}
                className="mt-2 text-xs font-bold text-primary hover:underline"
              >
                + Add choice
              </button>
            </div>

            {item.choices.length < 2 && (
              <p className="text-xs text-highlight mt-2">Add at least 2 word choices.</p>
            )}
            {item.choices.length >= 2 && item.choices.filter((c) => c.isCorrect).length !== 1 && (
              <p className="text-xs text-highlight mt-1">Mark one choice as correct.</p>
            )}

            <button
              type="button"
              onClick={() => removeItem(i)}
              className="text-xs font-bold text-highlight hover:text-red-600 mt-2"
            >
              Remove sentence
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-3 text-xs font-bold text-amber-700 hover:underline"
      >
        + Add sentence
      </button>
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
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

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
            📷 Matching
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-accent/20 text-amber-700">
            ✏️ Fill in the Blank
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
          <FillBlankActivityEditor activity={activity} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReadingCreationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [activities, setActivities] = useState<ReadingActivityDraft[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function addMatchingActivity() {
    setActivities((prev) => [
      ...prev,
      { clientId: crypto.randomUUID(), type: 'MATCH' as ReadingActivityType, pairs: [] },
    ]);
  }

  function addFillBlankActivity() {
    setActivities((prev) => [
      ...prev,
      { clientId: crypto.randomUUID(), type: 'FILL_BLANK' as ReadingActivityType, items: [] },
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
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  function validate(): string | null {
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
        const itemCount = activity.items?.length ?? 0;
        if (itemCount < 1) {
          return `Fill-in-blank activity ${idx + 1}: add at least 1 sentence.`;
        }
        for (let j = 0; j < (activity.items ?? []).length; j++) {
          const item = activity.items![j];
          if (!item.sentence.includes('___')) {
            return `Fill-in-blank activity ${idx + 1} sentence ${j + 1}: must contain ___ for the blank.`;
          }
          if ((item.choices?.length ?? 0) < 2) {
            return `Fill-in-blank activity ${idx + 1} sentence ${j + 1}: add at least 2 word choices.`;
          }
          if (item.choices.filter((c) => c.isCorrect).length !== 1) {
            return `Fill-in-blank activity ${idx + 1} sentence ${j + 1}: mark one choice as correct.`;
          }
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

    const payload: CreateHomeworkInput = {
      type: 'READING',
      name: name.trim() || undefined,
      readingActivities: activities.map(({ clientId: _clientId, ...rest }) => rest),
    };

    try {
      await createHomework(payload);
      router.push('/teacher/homework');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/teacher/homework" className="text-sm text-textSecondary hover:text-textPrimary">
            ← Back
          </Link>
          <h1 className="text-2xl font-black text-textPrimary mt-1">New Reading Homework</h1>
        </div>
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
          {loading ? 'Saving…' : 'Save Homework'}
        </button>
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
