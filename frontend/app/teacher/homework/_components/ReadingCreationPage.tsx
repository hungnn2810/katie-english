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
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';

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
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">{pairs.length} / 6 pairs</Typography>
      </Box>

      {pairs.length === 0 ? (
        <Typography variant="caption" color="text.secondary" fontStyle="italic" display="block" mb={1.5}>
          No pairs yet — click &quot;+ Add pair&quot; to start.
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
          {pairs.map((pair, i) => (
            <Box key={i} sx={{ bgcolor: 'background.default', borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 1.5 }}>
              {pair.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pair.imageUrl}
                  alt={pair.word}
                  style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', marginBottom: 8, display: 'block', margin: '0 auto 8px' }}
                />
              ) : (
                <Box component="label" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: 2, border: '2px dashed', borderColor: 'secondary.light', bgcolor: 'secondary.50', mb: 1, mx: 'auto', cursor: 'pointer', '&:hover': { bgcolor: 'secondary.100' }, position: 'relative' }}>
                  {uploadingIdx === i ? (
                    <CircularProgress size={20} color="secondary" />
                  ) : (
                    <svg style={{ width: 24, height: 24, color: '#64748B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
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
                </Box>
              )}
              <TextField
                size="small"
                fullWidth
                placeholder="Word label"
                value={pair.word}
                onChange={(e) => updatePairWord(i, e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 14 } }}
              />
              <Button
                type="button"
                size="small"
                onClick={() => removePair(i)}
                aria-label="Remove pair"
                fullWidth
                sx={{ mt: 0.5, fontSize: 12, color: 'error.light', '&:hover': { color: 'error.main', bgcolor: 'error.50' } }}
              >
                ✕
              </Button>
            </Box>
          ))}
        </Box>
      )}

      {pairs.length < 6 ? (
        <Button
          type="button"
          size="small"
          onClick={addPair}
          sx={{ fontSize: 14, fontWeight: 700, color: 'secondary.main', '&:hover': { textDecoration: 'underline' }, px: 0 }}
        >
          + Add pair
        </Button>
      ) : (
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ opacity: 0.6 }}>
          Maximum 6 pairs reached
        </Typography>
      )}

      {pairs.length === 1 && (
        <Typography variant="caption" color="error.main" display="block" mt={1}>
          Add at least 2 image-word pairs.
        </Typography>
      )}
    </Box>
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
    <Box>
      {/* Sentence textarea */}
      <Box mb={1.5}>
        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.5 }}>
          Sentence
        </Typography>
        {hasExistingBlanks && (
          <Typography variant="caption" sx={{ color: '#d97706', display: 'block', mb: 0.5 }}>
            Editing the sentence will clear existing blanks.
          </Typography>
        )}
        <TextField
          multiline
          rows={2}
          fullWidth
          size="small"
          placeholder="Type a sentence, then click words below to mark them as blanks"
          value={sentenceText}
          onChange={(e) => setSentence(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
      </Box>

      {/* Word chips */}
      {segments.length > 0 && (
        <Box mb={2}>
          <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 1 }}>
            Click a word to make it a blank
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {segments.map((s, i) => {
              if (s.text.trim() === '') {
                return <Box key={i} component="span" sx={{ display: 'inline-block', width: 8 }} aria-hidden />;
              }
              if (s.blank) {
                return (
                  <Button
                    key={i}
                    type="button"
                    size="small"
                    onClick={() => toggleSegmentBlank(i)}
                    aria-label={`Remove blank for "${s.text}"`}
                    sx={{ bgcolor: 'primary.main', color: 'white', px: 1.25, py: 0.5, borderRadius: 2, fontSize: 14, fontWeight: 600, gap: 0.5, minWidth: 0, '&:hover': { bgcolor: 'primary.dark' } }}
                  >
                    ___
                    <Box component="span" sx={{ fontSize: 12, opacity: 0.8 }}>×</Box>
                  </Button>
                );
              }
              return (
                <Button
                  key={i}
                  type="button"
                  size="small"
                  onClick={() => toggleSegmentBlank(i)}
                  aria-label={`Make "${s.text}" a blank`}
                  sx={{ bgcolor: 'grey.100', color: 'text.primary', px: 1.25, py: 0.5, borderRadius: 2, fontSize: 14, cursor: 'pointer', minWidth: 0, '&:hover': { bgcolor: 'primary.50' } }}
                >
                  {s.text}
                </Button>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Distractor inputs — one row per blank */}
      {blanks.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.5 }}>
            Distractors per blank
          </Typography>
          {blanks.map((b) => (
            <Box key={b.blankIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', flexShrink: 0, width: 96 }}>
                Blank {(b.blankIndex ?? 0) + 1}: &quot;{b.correctWord}&quot;
              </Typography>
              <TextField
                size="small"
                fullWidth
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 14 } }}
              />
            </Box>
          ))}
        </Box>
      )}

      {segments.length === 0 && (
        <Typography variant="caption" color="text.secondary" fontStyle="italic">
          Type a sentence above to get started.
        </Typography>
      )}
    </Box>
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
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={isDragging ? 4 : 1}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isDragging ? 'primary.main' : 'divider',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
        <IconButton
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Drag to reorder"
          size="small"
          sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' }, borderRadius: 2, color: 'text.secondary' }}
        >
          <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </IconButton>

        {activity.type === 'MATCH' ? (
          <Chip label="Matching" size="small" sx={{ bgcolor: 'secondary.50', color: 'secondary.main', fontWeight: 700 }} />
        ) : (
          <Chip label="Fill in the Blank" size="small" sx={{ bgcolor: '#FFF8E1', color: '#B45309', fontWeight: 700 }} />
        )}

        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ ml: 'auto' }}>
          Activity {index + 1}
        </Typography>

        <Button
          type="button"
          size="small"
          onClick={onRemove}
          aria-label="Remove activity"
          sx={{ fontSize: 12, fontWeight: 700, color: 'error.light', '&:hover': { color: 'error.main', bgcolor: 'error.50' }, minWidth: 0, px: 1 }}
        >
          Remove
        </Button>
      </Box>

      <Box sx={{ px: 2.5, py: 2 }}>
        {activity.type === 'MATCH' ? (
          <MatchingActivityEditor activity={activity} onUpdate={onUpdate} onUploadError={onUploadError} />
        ) : (
          <FillInBlankActivityEditor activity={activity} onUpdate={onUpdate} />
        )}
      </Box>
    </Paper>
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
      <Box sx={{ maxWidth: 768, mx: 'auto', px: 4, py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 256 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
          <CircularProgress size={20} color="inherit" />
          <Typography variant="body2">Loading…</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 768, mx: 'auto', px: 4, py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Box component={Link} href="/teacher/homework" sx={{ fontSize: 14, color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'text.primary' } }}>
            ← Back
          </Box>
          <Typography variant="h5" fontWeight={900} mt={0.5}>
            {editMode ? 'Edit Reading Homework' : 'New Reading Homework'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {editMode && editId && (
            <Button
              type="button"
              variant="contained"
              onClick={() => router.push(`/teacher/homework/${editId}/try`)}
              sx={{ borderRadius: 3, gap: 0.75, bgcolor: '#F0623A', '&:hover': { bgcolor: '#F0623A', opacity: 0.9 } }}
            >
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              Try
            </Button>
          )}
          <Button
            type="button"
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            sx={{ borderRadius: 3, gap: 1, flexShrink: 0, background: gradients.greenSecondary, '&:hover': { background: gradients.greenSecondary, opacity: 0.9 }, '&:disabled': { opacity: 0.6 } }}
          >
            {loading && <CircularProgress size={16} sx={{ color: 'white' }} />}
            {loading ? 'Saving…' : editMode ? 'Update' : 'Create'}
          </Button>
        </Box>
      </Box>

      {/* Homework name */}
      <Box mb={3}>
        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 1 }}>
          Homework Name
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="e.g. Animals – Unit 3 Reading"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
      </Box>

      {/* Error display */}
      {error && <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>{error}</Alert>}
      {uploadError && <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>{uploadError}</Alert>}

      {/* Activities section */}
      <Box>
        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 1.5 }}>
          Activities
        </Typography>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activities.map((a) => a.clientId)} strategy={verticalListSortingStrategy}>
            {activities.length === 0 ? (
              <Box sx={{ borderRadius: 3, border: '2px dashed', borderColor: 'divider', bgcolor: 'background.default', py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No activities yet. Use the buttons below to add a Matching or Fill-in-blank activity.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              </Box>
            )}
          </SortableContext>
        </DndContext>

        {/* Add activity buttons */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1.5 }}>
          <Button
            type="button"
            variant="outlined"
            onClick={addMatchingActivity}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, borderRadius: 3, fontWeight: 700, border: '2px dashed', borderColor: 'secondary.main', color: 'secondary.main', '&:hover': { bgcolor: 'secondary.50', border: '2px dashed' } }}
          >
            + Add Matching Activity
          </Button>
          <Button
            type="button"
            variant="outlined"
            onClick={addFillBlankActivity}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, borderRadius: 3, fontWeight: 700, border: '2px dashed', borderColor: 'warning.main', color: '#d97706', '&:hover': { bgcolor: 'warning.50', border: '2px dashed' } }}
          >
            + Add Fill-in-blank Activity
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
