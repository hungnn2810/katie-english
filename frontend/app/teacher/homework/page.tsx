'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getHomeworkList, createHomework, updateHomework, deleteHomework,
  getClasses, createAssignment, uploadSpeakingImage,
  HomeworkItem, ClassItem, CreateHomeworkInput, UpdateHomeworkInput,
  CreateAssignmentInput, HomeworkType, SpeakingMode, CreatePartInput,
} from '@/lib/admin-api';
import { cardGradients, colors } from '@/lib/colors';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import { Plus, X, Loader2, AlignLeft, Mic, Hash, BookOpen, ImageIcon, Search, CheckCircle2 } from 'lucide-react';
import { parseApiDateTime } from '@/lib/datetime';

const TYPE_META: Record<HomeworkType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  PHONICS:  { label: 'Phonics',  icon: Hash,     color: '#A78BFA', bg: '#A78BFA18' },
  SPEAKING: { label: 'Speaking', icon: Mic,      color: '#FF9BD2', bg: '#FF9BD218' },
  READING:  { label: 'Reading',  icon: BookOpen, color: '#6ED6C1', bg: '#6ED6C118' },
};

// â”€â”€ Homework form modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function HomeworkModal({
  editingId, form, setForm, onClose, onSaved, onNavigateToReading,
}: {
  editingId: number | null;
  form: CreateHomeworkInput;
  setForm: React.Dispatch<React.SetStateAction<CreateHomeworkInput>>;
  onClose: () => void;
  onSaved: () => void;
  onNavigateToReading: () => void;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newWordTexts, setNewWordTexts] = useState<Record<number, string>>({});
  const [wordUploading, setWordUploading] = useState<string | null>(null);
  const [speakUploading, setSpeakUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const speakFileRef = useRef<HTMLInputElement>(null);
  const wordFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const meta = TYPE_META[form.type];
  const parts: CreatePartInput[] = form.parts ?? [];

  function setParts(fn: (prev: CreatePartInput[]) => CreatePartInput[]) {
    setForm((f) => ({ ...f, parts: fn(f.parts ?? []) }));
  }

  function addPart() {
    const name = newPartName.trim();
    if (!name) return;
    setParts((prev) => [...prev, { name, words: [] }]);
    setNewPartName('');
  }

  function removePart(pIdx: number) {
    setParts((prev) => prev.filter((_, i) => i !== pIdx));
  }

  function addWord(pIdx: number) {
    const text = newWordTexts[pIdx]?.trim();
    if (!text) return;
    const highlight = parts[pIdx]?.name ?? '';
    setParts((prev) => prev.map((p, i) =>
      i !== pIdx ? p : { ...p, words: [...p.words, { text, highlight, imageUrl: '' }] }
    ));
    setNewWordTexts((prev) => ({ ...prev, [pIdx]: '' }));
  }

  function removeWord(pIdx: number, wIdx: number) {
    setParts((prev) => prev.map((p, i) =>
      i !== pIdx ? p : { ...p, words: p.words.filter((_, j) => j !== wIdx) }
    ));
  }

  async function uploadWordImage(pIdx: number, wIdx: number, file: File) {
    const key = `${pIdx}-${wIdx}`;
    setWordUploading(key);
    setUploadError('');
    try {
      const url = await uploadSpeakingImage(file);
      setParts((prev) => prev.map((p, i) =>
        i !== pIdx ? p : {
          ...p,
          words: p.words.map((w, j) => j !== wIdx ? w : { ...w, imageUrl: url }),
        }
      ));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setWordUploading(null);
    }
  }

  async function handleSpeakFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setSpeakUploading(true);
    try {
      const url = await uploadSpeakingImage(file);
      setForm((f) => ({ ...f, speakingPictureUrl: url }));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSpeakUploading(false);
      if (speakFileRef.current) speakFileRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.type === 'PHONICS') {
      if (parts.length === 0) { setError('Add at least one part.'); return; }
      if (parts.some((p) => p.words.length === 0)) { setError('Each part needs at least one word.'); return; }
    }
    if (form.type === 'SPEAKING' && !form.speakingText?.trim()) {
      setError(form.speakingMode === 'FREE_SPEAK' ? 'Enter keywords (comma-separated).' : 'Enter the text to speak.');
      return;
    }
    setLoading(true);
    try {
      if (editingId !== null) {
        const update: UpdateHomeworkInput = {
          speakingMode: form.speakingMode,
          name: form.name,
          parts: form.parts,
          speakingPictureUrl: form.speakingPictureUrl,
          speakingText: form.speakingText,
        };
        await updateHomework(editingId, update);
      } else {
        await createHomework(form);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setLoading(false);
    }
  }

  const headingName = editingId !== null ? (form.name || meta.label) : meta.label;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4, maxHeight: '90vh' } } }}>
      <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.3 }}>
              <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {editingId !== null ? 'Edit Â· ' : 'New Â· '}
              </Box>
              <Box component="span" sx={{ color: meta.color }}>{headingName}</Box>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Reusable template â€” assign to classes separately.
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', mt: 0.5 }}>
            <X size={16} />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 4, py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Type selector â€” create mode only */}
            {editingId === null && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 1.5, display: 'block' }}>
                  Type
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                  {(Object.keys(TYPE_META) as HomeworkType[]).map((t) => {
                    const m = TYPE_META[t];
                    const active = form.type === t;
                    return (
                      <Button key={t} type="button"
                        onClick={() => setForm((f) => ({ ...f, type: t, speakingMode: 'SCRIPT_MATCH', name: '', parts: [], speakingText: '', speakingPictureUrl: '' }))}
                        sx={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                          py: 2, borderRadius: 3, border: '2px solid', fontSize: 14, fontWeight: 700,
                          ...(active
                            ? { background: m.color, color: 'white', borderColor: m.color }
                            : { background: m.bg, color: m.color, borderColor: m.color + '40' }),
                        }}>
                        <m.icon size={20} />
                        {m.label}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* READING redirect */}
            {form.type === 'READING' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 5, borderRadius: 3, border: '2px dashed', borderColor: meta.color + '55', background: meta.bg }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.color + '22' }}>
                  <BookOpen size={28} style={{ color: meta.color }} />
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Reading homework uses a dedicated editor</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Build activities, set sequences, and preview inline.</Typography>
                </Box>
                <Button type="button" variant="contained"
                  sx={{ px: 3, borderRadius: 3, fontWeight: 700, bgcolor: meta.color, '&:hover': { bgcolor: meta.color, opacity: 0.9 } }}
                  onClick={() => { onClose(); onNavigateToReading(); }}>
                  Open Reading Editor
                </Button>
              </Box>
            )}

            {/* PHONICS form */}
            {form.type === 'PHONICS' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 1, display: 'block' }}>
                    Homework Name
                  </Typography>
                  <TextField size="small" fullWidth type="text"
                    placeholder="e.g. er, r, ou"
                    value={form.name ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                      Parts{' '}
                      <Box component="span" sx={{ fontWeight: 400, textTransform: 'none', color: meta.color }}>
                        ({parts.length} part{parts.length !== 1 ? 's' : ''}, {parts.reduce((s, p) => s + p.words.length, 0)} words)
                      </Box>
                    </Typography>
                  </Box>

                  {/* Parts list */}
                  {parts.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 1.5 }}>
                      {parts.map((part, pIdx) => (
                        <Box key={pIdx} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', background: meta.bg + '50' }}>
                          {/* Part header */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Chip label={part.name} size="small" sx={{ bgcolor: meta.color, color: 'white', fontWeight: 700, borderRadius: '999px' }} />
                            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                              {part.words.length} word{part.words.length !== 1 ? 's' : ''}
                            </Typography>
                            <Button type="button" size="small" onClick={() => removePart(pIdx)}
                              sx={{ fontSize: 12, color: 'error.light', '&:hover': { color: 'error.main', bgcolor: 'error.50' }, minWidth: 0, px: 1 }}>
                              Remove
                            </Button>
                          </Box>

                          {/* Words */}
                          <Box sx={{ px: 2, py: 1.5 }}>
                            {part.words.length > 0 && (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                                {part.words.map((word, wIdx) => {
                                  const uploadKey = `${pIdx}-${wIdx}`;
                                  return (
                                    <Box key={wIdx} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: 'white', borderRadius: 3, px: 1.5, py: 0.75, border: '1px solid', borderColor: 'divider' }}>
                                      {word.imageUrl ? (
                                        <Box sx={{ position: 'relative' }}>
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={word.imageUrl} alt={word.text}
                                            style={{ width: 24, height: 24, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0' }} />
                                          <Box component="button" type="button"
                                            onClick={() => setParts((prev) => prev.map((p, i) =>
                                              i !== pIdx ? p : { ...p, words: p.words.map((w, j) => j !== wIdx ? w : { ...w, imageUrl: '' }) }
                                            ))}
                                            sx={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', p: 0 }}>
                                            <X size={8} />
                                          </Box>
                                        </Box>
                                      ) : (
                                        <>
                                          <IconButton size="small"
                                            onClick={() => wordFileRefs.current[uploadKey]?.click()}
                                            disabled={wordUploading === uploadKey}
                                            sx={{ width: 20, height: 20, color: 'text.disabled', p: 0 }}>
                                            {wordUploading === uploadKey
                                              ? <CircularProgress size={12} />
                                              : <ImageIcon size={12} />}
                                          </IconButton>
                                          <input type="file" accept="image/*" hidden
                                            ref={(el) => { wordFileRefs.current[uploadKey] = el; }}
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) uploadWordImage(pIdx, wIdx, file);
                                              e.target.value = '';
                                            }} />
                                        </>
                                      )}
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{word.text}</Typography>
                                      <Box component="button" type="button" onClick={() => removeWord(pIdx, wIdx)}
                                        sx={{ border: 'none', background: 'none', cursor: 'pointer', p: 0, color: 'text.disabled', display: 'flex', '&:hover': { color: 'error.main' } }}>
                                        <X size={12} />
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            )}

                            {/* Add word */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <TextField size="small" sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: 14 } }}
                                placeholder={`Add word (e.g. paper) â€” Enter to add`}
                                value={newWordTexts[pIdx] ?? ''}
                                onChange={(e) => setNewWordTexts((prev) => ({ ...prev, [pIdx]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord(pIdx); } }} />
                              <Button type="button" variant="contained" onClick={() => addWord(pIdx)}
                                sx={{ borderRadius: 3, fontWeight: 700, flexShrink: 0, bgcolor: meta.color, '&:hover': { bgcolor: meta.color, opacity: 0.9 } }}>
                                + Add
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Add part row */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField size="small" sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                      placeholder="New part name (e.g. er)"
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPart(); } }} />
                    <Button type="button" variant="contained" onClick={addPart}
                      sx={{ borderRadius: 3, fontWeight: 700, flexShrink: 0, bgcolor: meta.color, '&:hover': { bgcolor: meta.color, opacity: 0.9 } }}>
                      + Part
                    </Button>
                  </Box>
                  {uploadError && <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>{uploadError}</Typography>}
                </Box>
              </Box>
            )}

            {/* SPEAKING form */}
            {form.type === 'SPEAKING' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 1, display: 'block' }}>
                    Mode
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {([
                      { value: 'SCRIPT_MATCH' as SpeakingMode, label: 'Script Match', desc: 'Student reads target text' },
                      { value: 'FREE_SPEAK' as SpeakingMode, label: 'Free Speak', desc: 'Student speaks from image prompt' },
                    ]).map(({ value, label, desc }) => {
                      const active = (form.speakingMode ?? 'SCRIPT_MATCH') === value;
                      return (
                        <Button key={value} type="button"
                          onClick={() => setForm((f) => ({ ...f, speakingMode: value }))}
                          sx={{
                            flex: 1, py: 1.5, px: 2, borderRadius: 3, border: '2px solid',
                            textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start',
                            ...(active
                              ? { background: meta.color, borderColor: meta.color, color: 'white' }
                              : { background: meta.bg, borderColor: meta.color + '40', color: 'text.secondary' }),
                          }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{label}</Typography>
                          <Typography variant="caption" sx={{ fontSize: 10, opacity: 0.8 }}>{desc}</Typography>
                        </Button>
                      );
                    })}
                  </Box>
                </Box>

                {(form.speakingMode ?? 'SCRIPT_MATCH') === 'FREE_SPEAK' && (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 1, display: 'block' }}>
                      Image Prompt <Box component="span" sx={{ fontWeight: 400, textTransform: 'none' }}>(optional)</Box>
                    </Typography>
                    {form.speakingPictureUrl ? (
                      <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', maxHeight: 160 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.speakingPictureUrl} alt="Speaking picture" style={{ width: '100%', objectFit: 'cover', maxHeight: 160 }} />
                        <IconButton size="small"
                          onClick={() => setForm((f) => ({ ...f, speakingPictureUrl: '' }))}
                          sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }, borderRadius: 2 }}>
                          <X size={14} />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box component="button" type="button" onClick={() => speakFileRef.current?.click()} disabled={speakUploading}
                        sx={{ width: '100%', borderRadius: 3, border: '2px dashed', borderColor: meta.color + '55', background: meta.bg, py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, cursor: 'pointer', '&:disabled': { opacity: 0.6 }, '&:hover': { opacity: 0.8 } }}>
                        {speakUploading
                          ? <Typography variant="caption" sx={{ fontWeight: 600, color: meta.color }}>Uploading…</Typography>
                          : <>
                            <ImageIcon size={20} style={{ color: meta.color }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: meta.color }}>Click to upload picture</Typography>
                          </>}
                      </Box>
                    )}
                    <input ref={speakFileRef} type="file" accept="image/*" hidden onChange={handleSpeakFile} />
                    {uploadError && <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>{uploadError}</Typography>}
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 1, display: 'block' }}>
                    {(form.speakingMode ?? 'SCRIPT_MATCH') === 'FREE_SPEAK' ? 'Keywords (comma-separated)' : 'Target Text'}
                  </Typography>
                  <TextField multiline rows={3} fullWidth size="small"
                    placeholder={(form.speakingMode ?? 'SCRIPT_MATCH') === 'FREE_SPEAK'
                      ? 'e.g. cat, sits, mat, fluffy'
                      : 'Enter the sentence the student should say…'}
                    value={form.speakingText ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, speakingText: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                  {(form.speakingMode ?? 'SCRIPT_MATCH') === 'FREE_SPEAK' && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Student gets credit for each keyword found in their recording.
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 4, pb: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
          {error && <Alert severity="error" sx={{ borderRadius: 3, mb: 1.5 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button type="button" variant="outlined" onClick={onClose}
              sx={{ flex: 1, borderRadius: 3, color: 'text.secondary', borderColor: 'divider' }}>
              Cancel
            </Button>
            {form.type !== 'READING' && (
              <Button type="submit" variant="contained" disabled={loading}
                sx={{ flex: 1, borderRadius: 3, bgcolor: colors.teacherAccent, '&:hover': { bgcolor: colors.teacherAccent, opacity: 0.9 }, gap: 1 }}>
                {loading && <CircularProgress size={14} sx={{ color: 'white' }} />}
                {loading ? 'Saving…' : editingId !== null ? 'Update' : 'Create'}
              </Button>
            )}
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// â”€â”€ Assign modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AssignModal({
  homework, classes, onClose, onSaved,
}: {
  homework: HomeworkItem;
  classes: ClassItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const nowLocalValue = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [endDate, setEndDate] = useState(nowLocalValue);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleClass(id: number) {
    setSelectedClassIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (selectedClassIds.length === 0) { setError('Select at least one class.'); return; }
    if (!endDate) { setError('Set an end date.'); return; }
    setLoading(true);
    try {
      const input: CreateAssignmentInput = { homeworkId: homework.id, classIds: selectedClassIds, endDate };
      await createAssignment(input);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign.');
    } finally {
      setLoading(false);
    }
  }

  const meta = TYPE_META[homework.type];
  const assignHeading = homework.name || (homework.speakingText ? homework.speakingText.slice(0, 30) + (homework.speakingText.length > 30 ? '…' : '') : meta.label);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.3 }}>
              <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>Assign Â· </Box>
              <Box component="span" sx={{ color: meta.color }}>{assignHeading}</Box>
            </Typography>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <meta.icon size={14} style={{ color: meta.color }} />
              <Typography variant="caption" sx={{ color: meta.color }}>{meta.label}</Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', mt: 0.5 }}>
            <X size={16} />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 4, py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 1.5, display: 'block' }}>
                Classes
              </Typography>
              {classes.length === 0
                ? <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>No classes found.</Typography>
                : <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {classes.map((c) => {
                    const active = selectedClassIds.includes(c.id);
                    return (
                      <Button key={c.id} type="button" variant="outlined" size="small"
                        onClick={() => toggleClass(c.id)}
                        sx={{
                          px: 1.75, py: 0.75, borderRadius: 3, fontWeight: 600, border: '2px solid',
                          ...(active
                            ? { bgcolor: colors.primary, color: 'white', borderColor: colors.primary }
                            : { bgcolor: 'white', color: colors.textSecondary, borderColor: colors.border }),
                        }}>
                        {c.name}
                      </Button>
                    );
                  })}
                </Box>
              }
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 1, display: 'block' }}>
                End Date
              </Typography>
              <TextField
                type="datetime-local"
                required
                fullWidth
                size="small"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 4, pb: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
          {error && <Alert severity="error" sx={{ borderRadius: 3, mb: 1.5 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button type="button" variant="outlined" onClick={onClose}
              sx={{ flex: 1, borderRadius: 3, color: 'text.secondary', borderColor: 'divider' }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading}
              sx={{ flex: 1, borderRadius: 3, bgcolor: colors.teacherAccent, '&:hover': { bgcolor: colors.teacherAccent, opacity: 0.9 }, gap: 1 }}>
              {loading && <CircularProgress size={14} sx={{ color: 'white' }} />}
              {loading ? 'Assigning…' : 'Assign'}
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const emptyForm = (): CreateHomeworkInput => ({ type: 'PHONICS', speakingMode: 'SCRIPT_MATCH', name: '', parts: [], speakingPictureUrl: '', speakingText: '' });

export default function HomeworkPage() {
  const router = useRouter();
  const [list, setList] = useState<HomeworkItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assigningHw, setAssigningHw] = useState<HomeworkItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<HomeworkType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3000);
  }

  const load = () => getHomeworkList().then(setList).catch(() => {});
  useEffect(() => { load(); getClasses().then(setClasses); }, []);

  function openCreate() { setForm(emptyForm()); setShowModal(true); }
  function openEdit(h: HomeworkItem) {
    if (h.type === 'READING') return;
    setEditingId(h.id);
    setForm({
      type: h.type,
      speakingMode: h.speakingMode ?? 'SCRIPT_MATCH',
      name: h.name ?? '',
      parts: h.type === 'PHONICS' ? (h.parts ?? []).map((p) => ({
        name: p.name,
        words: p.words.map((w) => ({ text: w.text, highlight: w.highlight ?? '', imageUrl: w.imageUrl ?? '' })),
      })) : [],
      speakingPictureUrl: h.speakingPictureUrl ?? '',
      speakingText: h.speakingText ?? '',
    });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditingId(null); }

  const now = new Date();
  const counts = { ALL: list.length, PHONICS: 0, SPEAKING: 0, READING: 0 };
  list.forEach((h) => { counts[h.type]++; });
  const q = search.toLowerCase();
  const filtered = list.filter((h) => {
    if (typeFilter !== 'ALL' && h.type !== typeFilter) return false;
    if (q && !h.name?.toLowerCase().includes(q) && !h.speakingText?.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <Box>
      {showModal && (
        <HomeworkModal
          editingId={editingId}
          form={form}
          setForm={setForm}
          onClose={closeModal}
          onSaved={() => { load(); showToast(editingId !== null ? 'Homework updated!' : 'Homework created!'); }}
          onNavigateToReading={() => router.push('/teacher/homework/create/reading')}
        />
      )}
      {assigningHw && <AssignModal homework={assigningHw} classes={classes} onClose={() => setAssigningHw(null)} onSaved={() => { load(); showToast('Homework assigned!'); }} />}

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search homework…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 208, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          slotProps={{ input: { startAdornment: (
              <InputAdornment position="start">
                <Search size={14} style={{ color: colors.textSecondary, opacity: 0.5 }} />
              </InputAdornment>
            ) } }}
        />
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {([
            { key: 'ALL', label: 'All', icon: null },
            { key: 'PHONICS', label: 'Phonics', icon: AlignLeft },
            { key: 'SPEAKING', label: 'Speaking', icon: Mic },
            { key: 'READING', label: 'Reading', icon: null },
          ] as const).map((t) => (
            <Button key={t.key} variant="outlined" size="small" onClick={() => setTypeFilter(t.key)}
              sx={{
                px: 1.75, py: 1, borderRadius: 3, fontSize: 12, fontWeight: 600, border: '1px solid', gap: 0.75,
                ...(typeFilter === t.key
                  ? { bgcolor: '#F0F9FF', color: colors.primary, borderColor: colors.primary }
                  : { bgcolor: 'white', color: colors.textSecondary, borderColor: colors.border }),
              }}>
              {t.icon && <t.icon size={14} />}
              {t.label}
              <Box component="span" sx={{ opacity: 0.6 }}>({counts[t.key]})</Box>
            </Button>
          ))}
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={openCreate}
          sx={{ bgcolor: colors.teacherAccent, '&:hover': { bgcolor: colors.teacherAccent, opacity: 0.9 }, borderRadius: 3, gap: 1, flexShrink: 0 }}>
          <Plus size={16} />
          New Homework
        </Button>
      </Box>

      {/* Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {list.length === 0 && (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 10, color: 'text.secondary' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
              <Box sx={{ width: 64, height: 64, bgcolor: 'grey.100', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={32} style={{ color: '#94A3B8' }} />
              </Box>
            </Box>
            <Typography sx={{ fontWeight: 500 }}>No homework yet</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>Create a reusable homework template</Typography>
          </Box>
        )}
        {list.length > 0 && filtered.length === 0 && (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
              <Box sx={{ width: 64, height: 64, bgcolor: 'grey.100', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={32} style={{ color: '#94A3B8' }} />
              </Box>
            </Box>
            <Typography sx={{ fontWeight: 500 }}>No homework matches filter</Typography>
          </Box>
        )}
        {filtered.map((h, i) => {
          const g = cardGradients[i % cardGradients.length];
          const meta = TYPE_META[h.type];
          const activeAssignments = h.assignments.filter((a) => {
            const endDate = parseApiDateTime(a.endDate);
            return endDate ? endDate >= now : false;
          });
          const submittedStudentIds = new Set<number>();
          for (const assignment of h.assignments) {
            for (const session of assignment.sessions ?? []) {
              submittedStudentIds.add(session.studentId);
            }
          }
          const submittedStudents = submittedStudentIds.size;
          const totalEnrolled = h.assignments.reduce(
            (sum, a) => sum + a.classes.reduce((s, ac) => s + (ac.class._count?.students ?? 0), 0),
            0,
          );

          return (
            <Card key={h.id} sx={{ overflow: 'hidden', borderRadius: 4, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', boxShadow: 1, '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
              <Box sx={{ height: 4, flexShrink: 0, background: `linear-gradient(90deg, ${g.from}, ${g.to})` }} />

              <Box component={Link} href={`/teacher/homework/${h.id}`} sx={{ display: 'block', p: 2.5, pb: 1.5, flex: 1, textDecoration: 'none', color: 'inherit' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        icon={<meta.icon size={14} style={{ color: meta.color }} />}
                        label={meta.label}
                        size="small"
                        sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, border: 0, '& .MuiChip-icon': { ml: 0.5 } }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Created {new Date(h.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
                    {activeAssignments.length > 0 ? (
                      <Chip label={`${activeAssignments.length} active`} size="small" sx={{ bgcolor: '#ecfdf5', color: '#059669', fontWeight: 600, border: 0 }} />
                    ) : (
                      <Chip label="Unassigned" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                    )}
                  </Box>
                </Box>

                <Box sx={{ mb: 1.5 }}>
                  {h.type === 'PHONICS' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {h.name && (
                        <Typography variant="caption" sx={{ fontWeight: 700, color: meta.color }}>{h.name}</Typography>
                      )}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(h.parts ?? []).slice(0, 4).map((part) => (
                          <Chip key={part.id} label={`${part.name} (${part.words.length})`} size="small"
                            sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, border: 0, borderRadius: 2 }} />
                        ))}
                        {(h.parts ?? []).length > 4 && (
                          <Chip label={`+${h.parts.length - 4}`} size="small" variant="outlined" sx={{ borderRadius: 2 }} />
                        )}
                        {(h.parts ?? []).length === 0 && (
                          <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>No parts yet</Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                  {h.type === 'SPEAKING' && (
                    <Typography variant="body2" color="text.secondary"
                      sx={{ fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {h.speakingText || <Box component="span" sx={{ opacity: 0.6 }}>No text set</Box>}
                    </Typography>
                  )}
                  {h.type === 'READING' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {h.name && (<Typography variant="caption" sx={{ fontWeight: 700, color: meta.color }}>{h.name}</Typography>)}
                      {(h.readingActivities ?? []).length === 0 ? (
                        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>No activities yet</Typography>
                      ) : (
                        <Chip label={`${(h.readingActivities ?? []).length} activit${(h.readingActivities ?? []).length !== 1 ? 'ies' : 'y'}`}
                          size="small" sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, border: 0, borderRadius: 2, alignSelf: 'flex-start' }} />
                      )}
                    </Box>
                  )}
                </Box>

                {h.assignments.length > 0 && (
                  <Chip
                    label={`${submittedStudents} / ${totalEnrolled} submitted`}
                    size="small"
                    sx={{ fontWeight: 600, border: 0, borderRadius: '999px', ...(submittedStudents > 0 ? { bgcolor: '#ecfdf5', color: '#059669' } : { bgcolor: 'grey.100', color: 'text.secondary' }) }}
                  />
                )}
              </Box>

              <CardActions sx={{ px: 2.5, py: 1.5, bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider', gap: 0.5, borderRadius: 0 }}>
                {deletingId === h.id ? (
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">Delete homework?</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button size="small" onClick={() => setDeletingId(null)}
                        sx={{ px: 1.5, py: 0.5, borderRadius: 2, fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
                        Cancel
                      </Button>
                      <Button size="small" variant="contained" color="error" onClick={async () => {
                        await deleteHomework(h.id);
                        setDeletingId(null);
                        load();
                        showToast('Homework deleted.');
                      }}
                        sx={{ px: 1.5, py: 0.5, borderRadius: 2, fontSize: 12, fontWeight: 600 }}>
                        Delete
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <>
                    <Button size="small" onClick={() => setAssigningHw(h)}
                      sx={{ flex: 1, py: 0.75, borderRadius: 2, fontSize: 12, fontWeight: 600, color: '#059669', '&:hover': { bgcolor: '#ecfdf5' } }}>
                      Assign
                    </Button>
                    <Button size="small" onClick={() => h.type === 'READING' ? router.push(`/teacher/homework/${h.id}/edit`) : openEdit(h)}
                      sx={{ flex: 1, py: 0.75, borderRadius: 2, fontSize: 12, fontWeight: 600, color: 'primary.main', '&:hover': { bgcolor: '#EFF6FF' } }}>
                      Edit
                    </Button>
                    <Box component={Link} href={`/teacher/homework/${h.id}/try`}
                      sx={{ flex: 1, py: 0.75, borderRadius: 2, fontSize: 12, fontWeight: 600, textAlign: 'center', color: '#A855F7', textDecoration: 'none', display: 'block', '&:hover': { bgcolor: '#F5F3FF' } }}>
                      Try
                    </Box>
                    <Button size="small" onClick={() => setDeletingId(h.id)}
                      sx={{ flex: 1, py: 0.75, borderRadius: 2, fontSize: 12, fontWeight: 600, color: 'error.main', '&:hover': { bgcolor: '#FEF2F2' } }}>
                      Delete
                    </Button>
                  </>
                )}
              </CardActions>
            </Card>
          );
        })}
      </Box>

      {toast && (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white', border: '1px solid', borderColor: 'divider', borderRadius: 4, boxShadow: 4, px: 2, py: 1.5, fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
          <CheckCircle2 size={16} style={{ color: '#10b981' }} />
          {toast}
        </Box>
      )}
    </Box>
  );
}
