'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  createListenHomework,
  updateListenHomework,
  getListenHomework,
  uploadAudio,
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
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import { GripVertical, Headphones, Plus, X } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type ListenItemDraft = {
  clientId: string;
  audioUrl: string;
  audioFilename: string;   // display name for uploaded file
  keywords: string;
  expectedText: string;
};

// ── SortableListenItemCard ────────────────────────────────────────────────────

function SortableListenItemCard({
  item,
  index,
  onRemove,
  onKeywordsChange,
  onExpectedTextChange,
  onAudioUpload,
  onAudioRemove,
  uploading,
  uploadError,
}: {
  item: ListenItemDraft;
  index: number;
  onRemove: () => void;
  onKeywordsChange: (value: string) => void;
  onExpectedTextChange: (value: string) => void;
  onAudioUpload: (file: File) => void;
  onAudioRemove: () => void;
  uploading: boolean;
  uploadError: string;
}) {
  const t = useTranslations('teacher.listenCreate.itemCard');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    onAudioUpload(file);
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
        alignItems: 'flex-start',
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
        aria-label={t('dragToReorder')}
        size="small"
        sx={{
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
          color: 'text.secondary',
          flexShrink: 0,
          p: 0.5,
          mt: 0.5,
        }}
      >
        <GripVertical size={20} />
      </IconButton>

      {/* Item number chip */}
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          bgcolor: '#60A5FA22',
          color: '#60A5FA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          mt: 0.5,
        }}
      >
        {index + 1}
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Audio upload zone */}
        <Box
          role="button"
          aria-label={t('uploadAudioAria', { index: index + 1 })}
          onClick={() => !uploading && fileInputRef.current?.click()}
          sx={{
            flex: 1,
            border: item.audioUrl ? '2px solid #E2E8F0' : '2px dashed #E2E8F0',
            borderRadius: 2,
            p: 2,
            textAlign: 'center',
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            cursor: uploading ? 'default' : 'pointer',
            bgcolor: 'background.default',
          }}
        >
          {uploading ? (
            <CircularProgress size={24} />
          ) : item.audioUrl ? (
            // Uploaded state: headphones icon + filename + remove button
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Headphones size={20} style={{ color: '#1976d2', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 14, flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {item.audioFilename || t('audioFileFallback')}
              </Typography>
              <IconButton
                size="small"
                aria-label={t('removeQuestionAria')}
                onClick={(e) => { e.stopPropagation(); onAudioRemove(); }}
                sx={{ flexShrink: 0 }}
              >
                <X size={14} />
              </IconButton>
            </Box>
          ) : (
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              {t('uploadAudioPrompt')}
            </Typography>
          )}
        </Box>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={handleFileChange}
        />

        {/* Upload error */}
        {uploadError && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {t('fileTooLargeError')}
          </Alert>
        )}

        {/* Expected answer field */}
        <TextField
          label={t('expectedAnswerLabel')}
          size="small"
          fullWidth
          placeholder={t('expectedAnswerPlaceholder')}
          value={item.expectedText}
          onChange={(e) => onExpectedTextChange(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        {/* Keywords field */}
        <TextField
          label={t('keywordsLabel')}
          size="small"
          fullWidth
          placeholder={t('keywordsPlaceholder')}
          value={item.keywords}
          onChange={(e) => onKeywordsChange(e.target.value)}
          helperText={t('keywordsHelperText')}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      {/* Remove button */}
      <IconButton
        type="button"
        size="small"
        color="error"
        aria-label={t('removeItemAria', { index: index + 1 })}
        onClick={onRemove}
        sx={{ flexShrink: 0, mt: 0.5 }}
      >
        <X size={16} />
      </IconButton>
    </Paper>
  );
}

// ── ListenCreationPage ─────────────────────────────────────────────────────────

export function ListenCreationPage({ editId }: { editId?: number }) {
  const t = useTranslations('teacher.listenCreate.page');
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [items, setItems] = useState<ListenItemDraft[]>([]);
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editId) return;
    getListenHomework(editId)
      .then((hw) => {
        setName(hw.name ?? '');
        setItems(
          hw.listenItems.map((li) => {
            let keywords = li.keywords;
            try {
              const arr = JSON.parse(li.keywords);
              if (Array.isArray(arr)) keywords = arr.join(', ');
            } catch {}
            return {
              clientId: crypto.randomUUID(),
              audioUrl: li.audioUrl,
              audioFilename: li.audioUrl.split('/').pop() ?? 'audio file',
              keywords,
              expectedText: li.expectedText,
            };
          })
        );
      })
      .catch(() => showToast(t('toasts.load_error'), 'error'));
  }, [editId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function addItem() {
    if (items.length >= 10) return;
    setItems((prev) => [
      ...prev,
      { clientId: crypto.randomUUID(), audioUrl: '', audioFilename: '', keywords: '', expectedText: '' },
    ]);
  }

  function removeItem(clientId: string) {
    setItems((prev) => prev.filter((it) => it.clientId !== clientId));
    setUploadErrors((prev) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
  }

  function updateKeywords(clientId: string, keywords: string) {
    setItems((prev) =>
      prev.map((it) => (it.clientId === clientId ? { ...it, keywords } : it))
    );
  }

  function updateExpectedText(clientId: string, expectedText: string) {
    setItems((prev) =>
      prev.map((it) => (it.clientId === clientId ? { ...it, expectedText } : it))
    );
  }

  function removeAudio(clientId: string) {
    setItems((prev) =>
      prev.map((it) => (it.clientId === clientId ? { ...it, audioUrl: '', audioFilename: '' } : it))
    );
  }

  async function handleAudioUpload(clientId: string, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setUploadErrors((prev) => ({ ...prev, [clientId]: t('errors.fileTooLarge') }));
      return;
    }
    setUploadErrors((prev) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
    setUploadingId(clientId);
    try {
      const url = await uploadAudio(file);
      setItems((prev) =>
        prev.map((it) => (it.clientId === clientId ? { ...it, audioUrl: url, audioFilename: file.name } : it))
      );
    } catch {
      setUploadErrors((prev) => ({ ...prev, [clientId]: t('errors.uploadFailed') }));
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
    if (!name.trim()) return t('validation.nameRequired');
    if (items.length === 0) return t('validation.questionRequired');
    for (const item of items) {
      if (!item.audioUrl) return t('validation.audioRequired');
      if (!item.keywords.trim()) return t('validation.keywordsRequired');
      if (!item.expectedText.trim()) return t('validation.expectedTextRequired');
    }
    return null;
  }

  async function handleSave() {
    const vErr = validate();
    if (vErr) {
      setValidationError(vErr);
      return;
    }
    setValidationError('');
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        items: items.map(({ clientId: _clientId, audioFilename: _audioFilename, ...rest }) => ({
          audioUrl: rest.audioUrl,
          keywords: rest.keywords,
          expectedText: rest.expectedText,
        })),
      };
      if (editId) {
        await updateListenHomework(editId, payload);
      } else {
        await createListenHomework(payload);
      }
      router.push('/teacher/homework');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('toasts.save_error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  const atCap = items.length >= 10;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: 4, py: 4 }}>

      {/* Back link — FIRST, above heading */}
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
        {t('backToHomework')}
      </Box>

      {/* Page heading */}
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 3 }}>
        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {editId ? t('editPrefix') : t('newPrefix')} ·{' '}
        </Box>
        <Box component="span" sx={{ color: '#60A5FA' }}>
          {t('listenTitle')}
        </Box>
      </Typography>

      {/* Homework name field */}
      <Box sx={{ mb: 3 }}>
        <TextField
          label={t('homeworkNameLabel')}
          fullWidth
          required
          placeholder={t('homeworkNamePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
      </Box>

      {/* Questions section heading */}
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
        {t('questionsHeading')}
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
              <SortableListenItemCard
                key={item.clientId}
                item={item}
                index={idx}
                onRemove={() => removeItem(item.clientId)}
                onKeywordsChange={(value) => updateKeywords(item.clientId, value)}
                onExpectedTextChange={(value) => updateExpectedText(item.clientId, value)}
                onAudioUpload={(file) => handleAudioUpload(item.clientId, file)}
                onAudioRemove={() => removeAudio(item.clientId)}
                uploading={uploadingId === item.clientId}
                uploadError={uploadErrors[item.clientId] ?? ''}
              />
            ))}
          </Box>
        </SortableContext>
      </DndContext>

      {/* Add Question button */}
      <Button
        type="button"
        variant="outlined"
        fullWidth
        disabled={atCap}
        startIcon={<Plus size={16} />}
        onClick={addItem}
        sx={{ borderRadius: 3, fontWeight: 700, mb: atCap ? 0.5 : 2 }}
      >
        {t('addQuestion')}
      </Button>

      {atCap && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {t('maxQuestionsReached')}
        </Typography>
      )}

      {/* Validation error — above save button */}
      {validationError && (
        <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>
          {validationError}
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
            bgcolor: '#3B82F6',
            '&:hover': { bgcolor: '#3B82F6', opacity: 0.9 },
            '&:disabled': { opacity: 0.6 },
            gap: 1,
          }}
        >
          {loading && <CircularProgress size={16} sx={{ color: 'white' }} />}
          {loading ? t('saving') : t('saveButton')}
        </Button>
      </Box>
    </Box>
  );
}
