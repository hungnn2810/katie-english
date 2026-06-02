'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  createVocabHomework,
  uploadSpeakingImage,
} from '@/lib/admin-api';
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
import IconButton from '@mui/material/IconButton';
import { GripVertical, ImageIcon, Plus, X } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type VocabItemDraft = {
  clientId: string;
  imageUrl: string;
  word: string;
};

// ── SortableVocabItemCard ────────────────────────────────────────────────────

function SortableVocabItemCard({
  item,
  index,
  onRemove,
  onWordChange,
  onImageUpload,
  onImageRemove,
  uploading,
}: {
  item: VocabItemDraft;
  index: number;
  onRemove: () => void;
  onWordChange: (word: string) => void;
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
  uploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageHover, setImageHover] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.clientId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onImageUpload(file);
    e.target.value = '';
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={isDragging ? 6 : 1}
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isDragging ? 'primary.main' : 'divider',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Drag handle */}
      <IconButton
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        aria-label="Drag to reorder"
        size="small"
        sx={{
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
          color: 'text.secondary',
          flexShrink: 0,
          p: 0.5,
        }}
      >
        <GripVertical size={20} />
      </IconButton>

      {/* Image upload zone — 160x160 */}
      <Box
        role="button"
        aria-label={`Upload image for item ${index + 1}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onMouseEnter={() => setImageHover(true)}
        onMouseLeave={() => setImageHover(false)}
        sx={{
          width: 160,
          height: 160,
          borderRadius: 2,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 0.75,
          cursor: uploading ? 'default' : 'pointer',
          border: item.imageUrl
            ? '2px solid #E2E8F0'
            : imageHover
            ? '2px solid #4F9DFF'
            : '2px dashed #E2E8F0',
          bgcolor: item.imageUrl ? 'transparent' : 'background.default',
          transition: 'border-color 0.15s',
        }}
      >
        {uploading ? (
          <CircularProgress size={24} />
        ) : item.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.word || `Item ${index + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Remove overlay on hover */}
            {imageHover && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onImageRemove();
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: 'white', fontWeight: 700, fontSize: 13 }}
                >
                  Remove
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <>
            <ImageIcon size={32} style={{ color: '#94A3B8' }} />
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>
              Upload image
            </Typography>
          </>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />

      {/* Word TextField */}
      <Box sx={{ flex: 1 }}>
        <TextField
          label="Word"
          size="small"
          fullWidth
          placeholder="e.g. apple"
          value={item.word}
          onChange={(e) => onWordChange(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 32 } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      {/* Remove button */}
      <IconButton
        type="button"
        size="small"
        color="error"
        aria-label={`Remove item ${index + 1}`}
        onClick={onRemove}
        sx={{ flexShrink: 0 }}
      >
        <X size={16} />
      </IconButton>
    </Paper>
  );
}

// ── VocabCreationPage ─────────────────────────────────────────────────────────

export function VocabCreationPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [items, setItems] = useState<VocabItemDraft[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function addItem() {
    if (items.length >= 10) return;
    setItems((prev) => [
      ...prev,
      { clientId: crypto.randomUUID(), imageUrl: '', word: '' },
    ]);
  }

  function removeItem(clientId: string) {
    setItems((prev) => prev.filter((it) => it.clientId !== clientId));
  }

  function updateWord(clientId: string, word: string) {
    setItems((prev) =>
      prev.map((it) => (it.clientId === clientId ? { ...it, word } : it))
    );
  }

  function removeImage(clientId: string) {
    setItems((prev) =>
      prev.map((it) => (it.clientId === clientId ? { ...it, imageUrl: '' } : it))
    );
  }

  async function handleImageUpload(clientId: string, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.');
      return;
    }
    setUploadError('');
    setUploadingId(clientId);
    try {
      const url = await uploadSpeakingImage(file);
      setItems((prev) =>
        prev.map((it) => (it.clientId === clientId ? { ...it, imageUrl: url } : it))
      );
    } catch (err: unknown) {
      setUploadError('Upload failed. Check file and try again.');
    } finally {
      setUploadingId(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIdx = prev.findIndex((it) => it.clientId === active.id);
        const newIdx = prev.findIndex((it) => it.clientId === over.id);
        if (oldIdx < 0 || newIdx < 0) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  function validate(): string | null {
    if (items.length === 0) return 'Add at least one item.';
    for (const item of items) {
      if (!item.imageUrl) return 'Each item needs an image.';
      if (!item.word.trim()) return 'Each item needs a word label.';
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
    try {
      await createVocabHomework({
        name: name.trim(),
        items: items.map(({ clientId: _clientId, ...rest }) => rest),
      });
      router.push('/teacher/homework');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setLoading(false);
    }
  }

  const atCap = items.length >= 10;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: 4, py: 4 }}>

      {/* Back link — FIRST, above heading (UI-SPEC Page 2 section 1) */}
      <Box
        component="span"
        onClick={() => router.back()}
        sx={{
          fontSize: 14,
          color: 'text.secondary',
          cursor: 'pointer',
          display: 'inline-block',
          mb: 1.5,
          '&:hover': { color: 'text.primary' },
        }}
      >
        ← Back to Homework
      </Box>

      {/* Page heading */}
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 3 }}>
        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          New ·{' '}
        </Box>
        <Box component="span" sx={{ color: '#FFB26B' }}>
          Vocabulary
        </Box>
      </Typography>

      {/* Homework name field */}
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Homework name"
          fullWidth
          required
          placeholder="e.g. Animals — Unit 3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
      </Box>

      {/* Items section heading */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'text.secondary',
          display: 'block',
          mb: 1.5,
        }}
      >
        Items (up to 10)
      </Typography>

      {/* DnD sortable item list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((it) => it.clientId)}
          strategy={verticalListSortingStrategy}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
            {items.map((item, idx) => (
              <SortableVocabItemCard
                key={item.clientId}
                item={item}
                index={idx}
                onRemove={() => removeItem(item.clientId)}
                onWordChange={(word) => updateWord(item.clientId, word)}
                onImageUpload={(file) => handleImageUpload(item.clientId, file)}
                onImageRemove={() => removeImage(item.clientId)}
                uploading={uploadingId === item.clientId}
              />
            ))}
          </Box>
        </SortableContext>
      </DndContext>

      {/* Add item button */}
      <Button
        type="button"
        variant="outlined"
        fullWidth
        disabled={atCap}
        startIcon={<Plus size={16} />}
        onClick={addItem}
        sx={{ borderRadius: 3, fontWeight: 700, mb: atCap ? 0.5 : 2 }}
      >
        Add Image
      </Button>

      {atCap && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Maximum 10 items reached.
        </Typography>
      )}

      {/* Upload error */}
      {uploadError && (
        <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>
          {uploadError}
        </Alert>
      )}

      {/* Validation error — above save button */}
      {error && (
        <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Save button */}
      <Box sx={{ mt: 5 }}>
        <Button
          type="button"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          onClick={handleSave}
          sx={{
            borderRadius: 3,
            fontWeight: 700,
            bgcolor: '#FFB26B',
            '&:hover': { bgcolor: '#FFB26B', opacity: 0.9 },
            '&:disabled': { opacity: 0.6 },
            gap: 1,
          }}
        >
          {loading && <CircularProgress size={16} sx={{ color: 'white' }} />}
          {loading ? 'Saving…' : 'Save Vocabulary Homework'}
        </Button>
      </Box>
    </Box>
  );
}
