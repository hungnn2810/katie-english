'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getHomeworkList, createHomework, updateHomework, deleteHomework,
  getClasses, createAssignment, uploadSpeakingImage,
  HomeworkItem, ClassItem, CreateHomeworkInput, UpdateHomeworkInput,
  CreateAssignmentInput, HomeworkType, SpeakingMode, CreatePartInput, CreateWordInput,
} from '@/lib/admin-api';
import { cardGradients, gradients, colors } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, X, Loader2, AlignLeft, Mic } from 'lucide-react';

const TYPE_META: Record<HomeworkType, { label: string; emoji: string; color: string; bg: string }> = {
  PHONICS:  { label: 'Phonics',  emoji: '🔤', color: '#A78BFA', bg: '#A78BFA18' },
  SPEAKING: { label: 'Speaking', emoji: '🎤', color: '#FF9BD2', bg: '#FF9BD218' },
  READING:  { label: 'Reading',  emoji: '📖', color: '#6ED6C1', bg: '#6ED6C118' },
};

// ── Homework form modal ───────────────────────────────────────────────────────

function HomeworkModal({
  editingId, form, setForm, onClose, onSaved,
}: {
  editingId: number | null;
  form: CreateHomeworkInput;
  setForm: React.Dispatch<React.SetStateAction<CreateHomeworkInput>>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newWordInputs, setNewWordInputs] = useState<Record<number, { text: string; highlight: string }>>({});
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
    const inp = newWordInputs[pIdx];
    const text = inp?.text?.trim();
    if (!text) return;
    const highlight = inp?.highlight?.trim() || (parts[pIdx]?.name ?? '');
    setParts((prev) => prev.map((p, i) =>
      i !== pIdx ? p : { ...p, words: [...p.words, { text, highlight, imageUrl: '' }] }
    ));
    setNewWordInputs((prev) => ({ ...prev, [pIdx]: { text: '', highlight: '' } }));
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

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-0" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-border gap-0">
          <div>
            <DialogTitle className="text-lg font-black text-textPrimary">
              {editingId !== null ? 'Edit Homework' : 'New Homework'}
            </DialogTitle>
            <p className="text-xs text-textSecondary mt-0.5">Reusable template — assign to classes separately.</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}
            className="text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded-xl">
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {editingId === null && (
              <div>
                <p className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-2">Type</p>
                <div className="flex gap-3">
                  {(Object.keys(TYPE_META) as HomeworkType[]).map((t) => {
                    const m = TYPE_META[t];
                    const active = form.type === t;
                    return (
                      <Button key={t} type="button" variant="outline"
                        onClick={() => setForm((f) => ({ ...f, type: t, speakingMode: 'SCRIPT_MATCH', name: '', parts: [], speakingText: '', speakingPictureUrl: '' }))}
                        className="flex-1 gap-2 py-3 h-auto rounded-xl text-sm font-bold border-2 transition-all"
                        style={active
                          ? { background: m.color, color: 'white', borderColor: m.color }
                          : { background: 'white', color: m.color, borderColor: m.color + '55' }}>
                        <span>{m.emoji}</span>{m.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {form.type === 'PHONICS' ? (
              <div className="space-y-4">
                {/* Homework name */}
                <div>
                  <Label className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-2 block">
                    Homework Name
                  </Label>
                  <Input type="text" className="input-base"
                    placeholder="e.g. er, r, ou"
                    value={form.name ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>

                {/* Parts */}
                <div>
                  <p className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-3">
                    Parts
                    <span className="ml-1.5 normal-case font-normal" style={{ color: meta.color }}>
                      ({parts.length} part{parts.length !== 1 ? 's' : ''}, {parts.reduce((s, p) => s + p.words.length, 0)} words)
                    </span>
                  </p>

                  <div className="space-y-4">
                    {parts.map((part, pIdx) => (
                      <div key={pIdx} className="rounded-2xl border border-border p-4"
                        style={{ background: meta.bg + '60' }}>
                        {/* Part header */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                            style={{ background: meta.color }}>
                            Part {pIdx + 1}
                          </span>
                          <span className="text-sm font-bold" style={{ color: meta.color }}>{part.name}</span>
                          <div className="flex-1" />
                          <Button type="button" variant="ghost" size="sm" onClick={() => removePart(pIdx)}
                            className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 h-auto px-2 py-1">
                            Remove part
                          </Button>
                        </div>

                        {/* Words list */}
                        {part.words.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {part.words.map((word, wIdx) => {
                              const uploadKey = `${pIdx}-${wIdx}`;
                              return (
                                <div key={wIdx} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-border">
                                  <span className="text-sm font-bold text-textPrimary flex-1">{word.text}</span>
                                  {word.highlight && (
                                    <Badge className="text-xs px-2 py-0.5 rounded-lg font-semibold h-auto border-0"
                                      style={{ background: meta.bg, color: meta.color }}>
                                      _{word.highlight}_
                                    </Badge>
                                  )}
                                  {/* Word image */}
                                  {word.imageUrl ? (
                                    <div className="relative">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={word.imageUrl} alt={word.text}
                                        className="w-8 h-8 rounded-lg object-cover border border-border" />
                                      <button type="button"
                                        onClick={() => setParts((prev) => prev.map((p, i) =>
                                          i !== pIdx ? p : { ...p, words: p.words.map((w, j) => j !== wIdx ? w : { ...w, imageUrl: '' }) }
                                        ))}
                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">✕</button>
                                    </div>
                                  ) : (
                                    <>
                                      <Button type="button" variant="outline" size="xs"
                                        onClick={() => wordFileRefs.current[uploadKey]?.click()}
                                        disabled={wordUploading === uploadKey}
                                        className="text-xs px-2 py-1 h-auto rounded-lg border-dashed text-textSecondary">
                                        {wordUploading === uploadKey ? '…' : '🖼️'}
                                      </Button>
                                      <input type="file" accept="image/*" className="hidden"
                                        ref={(el) => { wordFileRefs.current[uploadKey] = el; }}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) uploadWordImage(pIdx, wIdx, file);
                                          e.target.value = '';
                                        }} />
                                    </>
                                  )}
                                  <Button type="button" variant="ghost" size="icon-xs"
                                    onClick={() => removeWord(pIdx, wIdx)}
                                    className="text-textSecondary hover:text-red-500 ml-1">✕</Button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add word row */}
                        <div className="flex gap-2">
                          <Input type="text" className="input-base flex-1 text-sm py-1.5 h-auto"
                            placeholder={`Word (e.g. paper)`}
                            value={newWordInputs[pIdx]?.text ?? ''}
                            onChange={(e) => setNewWordInputs((prev) => ({ ...prev, [pIdx]: { ...prev[pIdx], text: e.target.value } }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord(pIdx); } }} />
                          <Input type="text" className="input-base w-20 text-sm py-1.5 h-auto"
                            placeholder={`_${part.name}_`}
                            value={newWordInputs[pIdx]?.highlight ?? ''}
                            onChange={(e) => setNewWordInputs((prev) => ({ ...prev, [pIdx]: { ...prev[pIdx], highlight: e.target.value } }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord(pIdx); } }} />
                          <Button type="button" size="sm" onClick={() => addWord(pIdx)}
                            className="px-3 rounded-xl text-xs font-semibold text-white shrink-0 h-auto py-1.5"
                            style={{ background: meta.color }}>
                            + Word
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add part row */}
                  <div className="flex gap-2 mt-3">
                    <Input type="text" className="input-base flex-1"
                      placeholder="Part name (e.g. er)"
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPart(); } }} />
                    <Button type="button" size="sm" onClick={addPart}
                      className="px-4 rounded-xl text-sm font-semibold text-white shrink-0 h-auto py-2"
                      style={{ background: meta.color }}>
                      + Part
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mode selector */}
                <div>
                  <p className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-2">Mode</p>
                  <div className="flex gap-2">
                    {([
                      { value: 'SCRIPT_MATCH' as SpeakingMode, label: 'Script Match', desc: 'Student reads target text' },
                      { value: 'FREE_SPEAK' as SpeakingMode, label: 'Free Speak', desc: 'Student speaks from image prompt' },
                    ]).map(({ value, label, desc }) => {
                      const active = (form.speakingMode ?? 'SCRIPT_MATCH') === value;
                      return (
                        <Button key={value} type="button" variant="outline"
                          onClick={() => setForm((f) => ({ ...f, speakingMode: value }))}
                          className="flex-1 h-auto py-3 px-3 rounded-xl border-2 text-left flex-col items-start transition-all"
                          style={active
                            ? { background: meta.color, borderColor: meta.color, color: 'white' }
                            : { background: 'white', borderColor: meta.color + '55', color: '#6B7280' }}>
                          <div className="text-xs font-bold">{label}</div>
                          <div className="text-[10px] mt-0.5 opacity-80">{desc}</div>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Image prompt — always shown for FREE_SPEAK, optional for SCRIPT_MATCH */}
                {(form.speakingMode ?? 'SCRIPT_MATCH') === 'FREE_SPEAK' && (
                  <div>
                    <p className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-2">Image Prompt (optional)</p>
                    {form.speakingPictureUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-border" style={{ maxHeight: 160 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.speakingPictureUrl} alt="Speaking picture" className="w-full object-cover" style={{ maxHeight: 160 }} />
                        <Button type="button" variant="ghost" size="icon-sm"
                          onClick={() => setForm((f) => ({ ...f, speakingPictureUrl: '' }))}
                          className="absolute top-2 right-2 bg-black/60 text-white hover:bg-black/80 rounded-lg">✕</Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => speakFileRef.current?.click()} disabled={speakUploading}
                        className="w-full h-auto rounded-xl border-2 border-dashed py-6 flex flex-col items-center gap-1.5 disabled:opacity-60"
                        style={{ borderColor: meta.color + '55', background: meta.bg }}>
                        {speakUploading
                          ? <span className="text-xs font-semibold" style={{ color: meta.color }}>Uploading…</span>
                          : <><span className="text-xl">🖼️</span><span className="text-xs font-semibold" style={{ color: meta.color }}>Click to upload picture</span></>}
                      </Button>
                    )}
                    <input ref={speakFileRef} type="file" accept="image/*" className="hidden" onChange={handleSpeakFile} />
                    {uploadError && <p className="text-xs text-highlight mt-1">{uploadError}</p>}
                  </div>
                )}

                {/* Text field — label changes based on mode */}
                <div>
                  <Label className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-2 block">
                    {(form.speakingMode ?? 'SCRIPT_MATCH') === 'FREE_SPEAK' ? 'Keywords (comma-separated)' : 'Target Text'}
                  </Label>
                  <textarea className="input-base resize-none" rows={3}
                    placeholder={(form.speakingMode ?? 'SCRIPT_MATCH') === 'FREE_SPEAK'
                      ? 'e.g. cat, sits, mat, fluffy'
                      : 'Enter the sentence the student should say…'}
                    value={form.speakingText ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, speakingText: e.target.value }))} />
                  {(form.speakingMode ?? 'SCRIPT_MATCH') === 'FREE_SPEAK' && (
                    <p className="text-[10px] text-textSecondary mt-1">Student gets credit for each keyword found in their recording.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-4 border-t border-border">
            {error && <div className="text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-3">{error}</div>}
            {uploadError && form.type === 'PHONICS' && <div className="text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-3">{uploadError}</div>}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
              <Button type="submit" disabled={loading}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white disabled:opacity-60 gap-2"
                style={{ background: gradients.primarySecondary }}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Saving…' : editingId !== null ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Assign modal ──────────────────────────────────────────────────────────────

function AssignModal({
  homework, classes, onClose, onSaved,
}: {
  homework: HomeworkItem;
  classes: ClassItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [endDate, setEndDate] = useState('');
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

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md rounded-3xl p-0" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-border gap-0">
          <div>
            <DialogTitle className="text-lg font-black text-textPrimary">Assign Homework</DialogTitle>
            <p className="text-xs text-textSecondary mt-0.5">
              <span style={{ color: meta.color }}>{meta.emoji} {meta.label}</span>
              {homework.type === 'PHONICS' && homework.name && ` · ${homework.name}`}
              {homework.type === 'SPEAKING' && homework.speakingText && ` · "${homework.speakingText.slice(0, 40)}${homework.speakingText.length > 40 ? '…' : ''}"`}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}
            className="text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded-xl">
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            <div>
              <p className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-2">Classes</p>
              {classes.length === 0
                ? <p className="text-sm text-textSecondary/60 italic">No classes found.</p>
                : <div className="flex flex-wrap gap-2">
                  {classes.map((c) => {
                    const active = selectedClassIds.includes(c.id);
                    return (
                      <Button key={c.id} type="button" variant="outline" size="sm"
                        onClick={() => toggleClass(c.id)}
                        className="px-3.5 py-1.5 h-auto rounded-xl text-sm font-semibold border-2 transition-all"
                        style={active
                          ? { background: colors.primary, color: 'white', borderColor: colors.primary }
                          : { background: 'white', color: colors.textSecondary, borderColor: colors.border }}>
                        {c.name}
                      </Button>
                    );
                  })}
                </div>
              }
            </div>
            <div>
              <Label className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-2 block">End Date</Label>
              <Input type="datetime-local" className="input-base h-auto"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required />
            </div>
          </div>

          <div className="px-6 pb-6 pt-4 border-t border-border">
            {error && <div className="text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-3">{error}</div>}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
              <Button type="submit" disabled={loading}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white disabled:opacity-60 gap-2"
                style={{ background: gradients.primarySecondary }}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Assigning…' : 'Assign'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── TypePickerModal ───────────────────────────────────────────────────────────

function TypePickerModal({
  onClose,
  onPickInline,
  onPickReading,
}: {
  onClose: () => void;
  onPickInline: (type: 'PHONICS' | 'SPEAKING') => void;
  onPickReading: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md rounded-3xl p-0" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-border gap-0">
          <div>
            <DialogTitle className="text-lg font-black text-textPrimary">New Homework</DialogTitle>
            <p className="text-xs text-textSecondary mt-0.5">Choose the type of homework to create.</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}
            className="text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded-xl">
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(TYPE_META) as HomeworkType[]).map((t) => {
              const m = TYPE_META[t];
              return (
                <Button key={t} type="button" variant="outline"
                  onClick={() => {
                    if (t === 'READING') {
                      onPickReading();
                    } else {
                      onPickInline(t as 'PHONICS' | 'SPEAKING');
                      onClose();
                    }
                  }}
                  className="flex-col h-auto gap-2 py-5 rounded-xl text-sm font-bold border-2 transition-all hover:shadow-md hover:scale-105"
                  style={{ background: 'white', color: m.color, borderColor: m.color + '55' }}>
                  <span className="text-2xl">{m.emoji}</span>
                  <span>{m.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const emptyForm = (): CreateHomeworkInput => ({ type: 'PHONICS', speakingMode: 'SCRIPT_MATCH', name: '', parts: [], speakingPictureUrl: '', speakingText: '' });

export default function HomeworkPage() {
  const router = useRouter();
  const [list, setList] = useState<HomeworkItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [showModal, setShowModal] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assigningHw, setAssigningHw] = useState<HomeworkItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<HomeworkType | 'ALL'>('ALL');

  const load = () => getHomeworkList().then(setList).catch(() => {});
  useEffect(() => { load(); getClasses().then(setClasses); }, []);

  function openCreate() { setShowTypePicker(true); }
  function openEdit(h: HomeworkItem) {
    if (h.type === 'READING') return; /* editing deferred to Phase 3 */
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
  const filtered = typeFilter === 'ALL' ? list : list.filter((h) => h.type === typeFilter);

  return (
    <div className="animate-fade-in">
      {showModal && <HomeworkModal editingId={editingId} form={form} setForm={setForm} onClose={closeModal} onSaved={load} />}
      {assigningHw && <AssignModal homework={assigningHw} classes={classes} onClose={() => setAssigningHw(null)} onSaved={load} />}
      {showTypePicker && (
        <TypePickerModal
          onClose={() => setShowTypePicker(false)}
          onPickInline={(t) => { setForm({ ...emptyForm(), type: t }); setShowModal(true); }}
          onPickReading={() => router.push('/teacher/homework/create/reading')}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1.5">
          {([
            { key: 'ALL', label: 'All', icon: null },
            { key: 'PHONICS', label: 'Phonics', icon: AlignLeft },
            { key: 'SPEAKING', label: 'Speaking', icon: Mic },
            { key: 'READING', label: 'Reading', icon: null },
          ] as const).map((t) => (
            <Button key={t.key} variant="outline" size="sm" onClick={() => setTypeFilter(t.key)}
              className="px-3.5 py-2 h-auto rounded-xl text-xs font-semibold border transition-all gap-1.5"
              style={typeFilter === t.key
                ? { background: '#F0F9FF', color: colors.primary, borderColor: colors.primary }
                : { background: 'white', color: colors.textSecondary, borderColor: colors.border }}>
              {t.icon && <t.icon className="w-3.5 h-3.5" />}
              {t.label}
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={openCreate} aria-expanded={showTypePicker}
          className="btn-primary flex items-center gap-2 shrink-0 h-auto"
          style={{ background: gradients.primarySecondary }}>
          <Plus className="w-4 h-4" />
          + Create
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {list.length === 0 && (
          <div className="col-span-3 text-center py-20 text-textSecondary">
            <div className="text-4xl mb-3">📚</div>
            <div className="font-medium">No homework yet</div>
            <div className="text-sm mt-1">Create a reusable homework template</div>
          </div>
        )}
        {list.length > 0 && filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-textSecondary">
            <div className="text-3xl mb-3">🔍</div>
            <div className="font-medium">No homework matches filter</div>
          </div>
        )}
        {filtered.map((h, i) => {
          const g = cardGradients[i % cardGradients.length];
          const meta = TYPE_META[h.type];
          const activeAssignments = h.assignments.filter((a) => new Date(a.endDate) >= now);
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
            <Card key={h.id} className="overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-0 py-0 rounded-2xl border-border shadow-card">
              <div className="h-1 shrink-0" style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }} />

              <Link href={`/teacher/homework/${h.id}`} className="block p-5 pb-3 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-xs font-bold px-2.5 py-1 rounded-full h-auto border-0"
                        style={{ background: meta.bg, color: meta.color }}>
                        {meta.emoji} {meta.label}
                      </Badge>
                    </div>
                    <div className="text-xs text-textSecondary mt-1">
                      Created {new Date(h.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {activeAssignments.length > 0 ? (
                      <Badge className="text-xs font-semibold px-2.5 py-1 rounded-full h-auto bg-emerald-50 text-emerald-600 border-0">
                        {activeAssignments.length} active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-full h-auto border-0">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Content preview */}
                <div className="mb-3">
                  {h.type === 'PHONICS' && (
                    <div className="space-y-1">
                      {h.name && (
                        <p className="text-xs font-bold" style={{ color: meta.color }}>{h.name}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {(h.parts ?? []).slice(0, 4).map((part) => (
                          <Badge key={part.id} className="text-xs px-2 py-0.5 rounded-lg font-bold h-auto border-0"
                            style={{ background: meta.bg, color: meta.color }}>
                            {part.name} ({part.words.length})
                          </Badge>
                        ))}
                        {(h.parts ?? []).length > 4 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-lg h-auto border-0">
                            +{h.parts.length - 4}
                          </Badge>
                        )}
                        {(h.parts ?? []).length === 0 && (
                          <span className="text-xs text-textSecondary/60 italic">No parts yet</span>
                        )}
                      </div>
                    </div>
                  )}
                  {h.type === 'SPEAKING' && (
                    <p className="text-sm text-textSecondary line-clamp-2 italic">
                      {h.speakingText || <span className="text-textSecondary/60">No text set</span>}
                    </p>
                  )}
                  {h.type === 'READING' && (
                    <div className="space-y-1">
                      {h.name && (<p className="text-xs font-bold" style={{ color: meta.color }}>{h.name}</p>)}
                      {(h.readingActivities ?? []).length === 0 ? (
                        <span className="text-xs text-textSecondary/60 italic">No activities yet</span>
                      ) : (
                        <Badge className="text-xs px-2 py-0.5 rounded-lg font-bold h-auto border-0" style={{ background: meta.bg, color: meta.color }}>
                          {(h.readingActivities ?? []).length} activit{(h.readingActivities ?? []).length !== 1 ? 'ies' : 'y'}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {h.assignments.length > 0 && (
                  <Badge className={`text-xs font-semibold px-2.5 py-1 rounded-full h-auto border-0 ${submittedStudents > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                    {submittedStudents} / {totalEnrolled} submitted
                  </Badge>
                )}
              </Link>

              <CardFooter className="px-5 py-3 bg-background/50 border-t border-border flex items-center gap-1 rounded-none">
                <Button variant="ghost" size="sm" onClick={() => setAssigningHw(h)}
                  className="flex-1 py-1.5 h-auto rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50">
                  Assign
                </Button>
                <Button variant="ghost" size="sm" onClick={() => h.type === 'READING' ? router.push(`/teacher/homework/${h.id}/edit`) : openEdit(h)}
                  className="flex-1 py-1.5 h-auto rounded-lg text-xs font-semibold text-primary hover:bg-primary/8">
                  Edit
                </Button>
                <Link href={`/teacher/homework/${h.id}/try`}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center text-purple-500 hover:bg-purple-500/8 transition-colors">
                  Try
                </Link>
                <Button variant="ghost" size="sm" onClick={async () => {
                  if (confirm('Delete this homework and all its assignments?')) {
                    await deleteHomework(h.id); load();
                  }
                }}
                  className="flex-1 py-1.5 h-auto rounded-lg text-xs font-semibold text-highlight hover:bg-highlight/8">
                  Delete
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
