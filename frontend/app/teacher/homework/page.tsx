'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHomeworkList, createHomework, updateHomework, deleteHomework, getClasses, getWords, HomeworkItem, ClassItem, CreateHomeworkInput, CreateHomeworkPartInput, HomeworkType } from '@/lib/admin-api';
import { cardGradients, gradients, colors } from '@/lib/colors';

const TYPE_META: Record<HomeworkType, { label: string; emoji: string; color: string; bg: string }> = {
  PHONICS:    { label: 'Phonics',    emoji: '🔤', color: '#A78BFA', bg: '#A78BFA18' },
  READING:    { label: 'Reading',    emoji: '📖', color: '#4F9DFF', bg: '#4F9DFF18' },
  SPELLING:   { label: 'Spelling',   emoji: '✍️',  color: '#7BD88F', bg: '#7BD88F18' },
  VOCABULARY: { label: 'Vocabulary', emoji: '📝', color: '#FFB26B', bg: '#FFB26B18' },
  SPEAKING:   { label: 'Speaking',   emoji: '🎤', color: '#FF9BD2', bg: '#FF9BD218' },
};

const ALL_TYPES = Object.keys(TYPE_META) as HomeworkType[];

const emptyPart = (): CreateHomeworkPartInput => ({ type: 'PHONICS', wordIds: [], phonicsItems: [] });
const emptyForm = (): CreateHomeworkInput => ({ dayAssigned: '', closedDatetime: '', classId: 0, parts: [emptyPart()] });

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PartEditor({
  part, index, total, words,
  onChange, onRemove,
}: {
  part: CreateHomeworkPartInput;
  index: number;
  total: number;
  words: { id: number; text: string; difficulty: number }[];
  onChange: (p: CreateHomeworkPartInput) => void;
  onRemove: () => void;
}) {
  const [phonicsInput, setPhonicsInput] = useState('');
  const meta = TYPE_META[part.type];
  const itemCount = part.type === 'PHONICS'
    ? (part.phonicsItems ?? []).length
    : (part.wordIds ?? []).length;

  function toggleWord(id: number) {
    const ids = part.wordIds ?? [];
    onChange({ ...part, wordIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  }

  function addPhonicsItem() {
    const text = phonicsInput.trim();
    if (!text) return;
    onChange({ ...part, phonicsItems: [...(part.phonicsItems ?? []), text] });
    setPhonicsInput('');
  }

  function removePhonicsItem(idx: number) {
    onChange({ ...part, phonicsItems: (part.phonicsItems ?? []).filter((_, i) => i !== idx) });
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-white">
      {/* Part header bar */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: meta.bg, borderBottom: `1px solid ${meta.color}28` }}>
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">{meta.emoji}</span>
          <span className="text-sm font-bold" style={{ color: meta.color }}>Part {index + 1}</span>
          {itemCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: meta.color + '22', color: meta.color }}>
              {itemCount} {part.type === 'PHONICS' ? 'items' : 'words'}
            </span>
          )}
        </div>
        {total > 1 && (
          <button type="button" onClick={onRemove}
            className="text-xs font-semibold text-textSecondary hover:text-highlight transition-colors px-2 py-1 rounded-lg hover:bg-highlight/10">
            Remove
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Type pill selector */}
        <div>
          <p className="text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">Type</p>
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => {
              const m = TYPE_META[t];
              const active = part.type === t;
              return (
                <button
                  key={t} type="button"
                  onClick={() => onChange({ ...part, type: t, wordIds: [], phonicsItems: [] })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={active
                    ? { background: m.color, color: 'white', borderColor: m.color }
                    : { background: 'white', color: m.color, borderColor: m.color + '55' }}>
                  <span className="text-xs leading-none">{m.emoji}</span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        {part.type === 'PHONICS' ? (
          <div>
            <p className="text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">
              Phonics Items
              {(part.phonicsItems ?? []).length > 0 && (
                <span className="ml-1.5 normal-case font-normal" style={{ color: meta.color }}>
                  ({(part.phonicsItems ?? []).length} added)
                </span>
              )}
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                className="input-base flex-1"
                placeholder="Type a sound, e.g. sh, ch, th, oo…"
                value={phonicsInput}
                onChange={(e) => setPhonicsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhonicsItem(); } }}
              />
              <button type="button" onClick={addPhonicsItem}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: meta.color }}>
                Add
              </button>
            </div>
            {(part.phonicsItems ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(part.phonicsItems ?? []).map((item, idx) => (
                  <span key={idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border"
                    style={{ background: meta.bg, color: meta.color, borderColor: meta.color + '40' }}>
                    {item}
                    <button type="button" onClick={() => removePhonicsItem(idx)}
                      className="transition-opacity hover:opacity-60 text-xs leading-none">✕</button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-textSecondary/60 italic">No items added yet. Type and press Enter or Add.</p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">
              Words
              {(part.wordIds ?? []).length > 0 && (
                <span className="ml-1.5 normal-case font-normal" style={{ color: meta.color }}>
                  ({(part.wordIds ?? []).length} selected)
                </span>
              )}
            </p>
            {words.length === 0 ? (
              <p className="text-sm text-textSecondary/60 italic">No words in database yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {words.map((w) => {
                  const selected = (part.wordIds ?? []).includes(w.id);
                  return (
                    <button key={w.id} type="button" onClick={() => toggleWord(w.id)}
                      className="px-3.5 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all"
                      style={selected
                        ? { background: meta.color, color: 'white', borderColor: meta.color }
                        : { background: 'white', color: colors.textSecondary, borderColor: colors.border }}>
                      {w.text}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function HomeworkModal({
  editingId, form, setForm, classes, words, onClose, onSaved,
}: {
  editingId: number | null;
  form: CreateHomeworkInput;
  setForm: React.Dispatch<React.SetStateAction<CreateHomeworkInput>>;
  classes: ClassItem[];
  words: { id: number; text: string; difficulty: number }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updatePart(index: number, part: CreateHomeworkPartInput) {
    setForm((f) => ({ ...f, parts: f.parts.map((p, i) => i === index ? part : p) }));
  }

  function removePart(index: number) {
    setForm((f) => ({ ...f, parts: f.parts.filter((_, i) => i !== index) }));
  }

  function addPart() {
    setForm((f) => ({ ...f, parts: [...f.parts, emptyPart()] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.classId) { setError('Please select a class.'); return; }
    for (let i = 0; i < form.parts.length; i++) {
      const p = form.parts[i];
      if (p.type === 'PHONICS') {
        if ((p.phonicsItems ?? []).length === 0) { setError(`Part ${i + 1}: add at least one phonics item.`); return; }
      } else {
        if ((p.wordIds ?? []).length === 0) { setError(`Part ${i + 1}: select at least one word.`); return; }
      }
    }
    setLoading(true);
    try {
      if (editingId !== null) {
        await updateHomework(editingId, form);
      } else {
        await createHomework(form);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save homework.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto"
      style={{ background: 'rgba(15,12,41,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-slide-up mb-10">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-black text-textPrimary">
              {editingId !== null ? `Edit Homework #${editingId}` : 'New Homework'}
            </h2>
            <p className="text-xs text-textSecondary mt-0.5">
              {editingId !== null ? 'Update assignment details and parts.' : 'Set up an assignment with one or more parts.'}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-textSecondary hover:text-textPrimary hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-6">
            {/* Assignment info */}
            <div>
              <p className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-3">Assignment Info</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">Class</label>
                  <select className="input-base"
                    value={form.classId || ''}
                    onChange={(e) => setForm((f) => ({ ...f, classId: Number(e.target.value) }))}
                    required>
                    <option value="">Select a class…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">Day Assigned</label>
                  <input type="date" className="input-base"
                    value={form.dayAssigned}
                    onChange={(e) => setForm((f) => ({ ...f, dayAssigned: e.target.value }))}
                    required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">Closes At</label>
                  <input type="datetime-local" className="input-base"
                    value={form.closedDatetime}
                    onChange={(e) => setForm((f) => ({ ...f, closedDatetime: e.target.value }))}
                    required />
                </div>
              </div>
            </div>

            {/* Parts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-textSecondary uppercase tracking-wide">
                  Parts
                  <span className="ml-1.5 normal-case font-normal text-primary">({form.parts.length})</span>
                </p>
                <button type="button" onClick={addPart}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-xl hover:bg-primary/8">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Part
                </button>
              </div>
              <div className="space-y-3">
                {form.parts.map((part, i) => (
                  <PartEditor
                    key={i}
                    part={part}
                    index={i}
                    total={form.parts.length}
                    words={words}
                    onChange={(p) => updatePart(i, p)}
                    onRemove={() => removePart(i)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            {error && (
              <div className="flex items-start gap-2.5 text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-4">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-textSecondary border border-border hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: gradients.primarySecondary }}>
                {loading && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                {loading
                  ? (editingId !== null ? 'Updating…' : 'Creating…')
                  : (editingId !== null ? 'Update Homework' : 'Create Homework')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomeworkPage() {
  const [list, setList] = useState<HomeworkItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [words, setWords] = useState<{ id: number; text: string; difficulty: number }[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  const load = () => getHomeworkList().then(setList).catch(() => {});
  useEffect(() => { load(); getClasses().then(setClasses); getWords().then(setWords); }, []);

  function openCreate() { setEditingId(null); setForm(emptyForm()); setShowModal(true); }
  function openEdit(h: HomeworkItem) {
    setEditingId(h.id);
    setForm({ dayAssigned: new Date(h.dayAssigned).toISOString().slice(0, 10), closedDatetime: toLocalDatetimeValue(h.closedDatetime), classId: h.classId, parts: h.parts.map((p) => ({ type: p.type, wordIds: p.words.map((w) => w.word.id), phonicsItems: p.phonicsItems ?? [] })) });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditingId(null); }

  const now = new Date();
  const filtered = list.filter((h) => {
    if (classFilter !== 'ALL' && h.classId !== classFilter) return false;
    const closed = new Date(h.closedDatetime) < now;
    if (statusFilter === 'OPEN' && closed) return false;
    if (statusFilter === 'CLOSED' && !closed) return false;
    return true;
  });
  const openCount = list.filter((h) => new Date(h.closedDatetime) >= now).length;
  const closedCount = list.length - openCount;

  return (
    <div className="animate-fade-in">
      {showModal && <HomeworkModal editingId={editingId} form={form} setForm={setForm} classes={classes} words={words} onClose={closeModal} onSaved={load} />}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Class filter */}
        <select
          className="input-base w-auto text-sm"
          value={classFilter === 'ALL' ? '' : classFilter}
          onChange={(e) => setClassFilter(e.target.value ? Number(e.target.value) : 'ALL')}>
          <option value="">All Classes ({list.length})</option>
          {classes.map((c) => {
            const cnt = list.filter((h) => h.classId === c.id).length;
            return <option key={c.id} value={c.id}>{c.name} ({cnt})</option>;
          })}
        </select>

        {/* Status tabs */}
        <div className="flex gap-1.5 flex-1">
          {([
            { key: 'ALL', label: 'All', count: list.length },
            { key: 'OPEN', label: '🟢 Open', count: openCount },
            { key: 'CLOSED', label: 'Closed', count: closedCount },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all"
              style={statusFilter === t.key
                ? { background: '#F0F9FF', color: colors.primary, borderColor: colors.primary }
                : { background: 'white', color: colors.textSecondary, borderColor: colors.border }}>
              {t.label}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: statusFilter === t.key ? colors.primary + '20' : '#F3F4F6', color: statusFilter === t.key ? colors.primary : colors.textSecondary }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <button onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0" style={{ background: gradients.primarySecondary }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Homework
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {list.length === 0 && (
          <div className="col-span-3 text-center py-20 text-textSecondary">
            <div className="text-4xl mb-3">📚</div>
            <div className="font-medium">No homework yet</div>
            <div className="text-sm mt-1">Create your first assignment to get started</div>
          </div>
        )}
        {list.length > 0 && filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-textSecondary">
            <div className="text-3xl mb-3">🔍</div>
            <div className="font-medium">No homework matches filters</div>
          </div>
        )}
        {filtered.map((h, i) => {
          const g = cardGradients[i % cardGradients.length];
          const isClosed = new Date(h.closedDatetime) < now;
          const dueMs = new Date(h.closedDatetime).getTime() - now.getTime();
          const daysLeft = Math.ceil(dueMs / 86400000);
          const urgent = !isClosed && daysLeft <= 1;

          return (
            <div key={h.id}
              className={`card overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col ${editingId === h.id && showModal ? 'ring-2 ring-primary/40' : ''}`}>

              {/* Gradient bar */}
              <div className="h-1" style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }} />

              <Link href={`/teacher/homework/${h.id}`} className="block p-5 pb-3 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-textPrimary text-[15px] truncate">{h.class?.name ?? `Class #${h.classId}`}</div>
                    <div className="text-xs text-textSecondary mt-0.5">
                      Assigned {new Date(h.dayAssigned).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {isClosed ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-textSecondary">Closed</span>
                    ) : urgent ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-600">
                        {daysLeft <= 0 ? 'Due today' : '1 day left'}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                        Open · {daysLeft}d left
                      </span>
                    )}
                  </div>
                </div>

                {/* Parts row */}
                <div className="flex gap-1 flex-wrap mb-3">
                  {h.parts.map((p, pi) => {
                    const m = TYPE_META[p.type];
                    const itemCount = p.type === 'PHONICS' ? (p.phonicsItems ?? []).length : p.words.length;
                    return (
                      <span key={pi} className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: m.bg, color: m.color }}>
                        <span className="text-[10px] leading-none">{m.emoji}</span>
                        {m.label}
                        <span className="opacity-60">·{itemCount}</span>
                      </span>
                    );
                  })}
                </div>

                {/* Item preview — grouped per part */}
                <div className="space-y-1.5 mb-3">
                  {h.parts.map((p, pi) => {
                    const items = p.type === 'PHONICS' ? (p.phonicsItems ?? []) : p.words.map((w) => w.word.text);
                    if (items.length === 0) return null;
                    return (
                      <div key={pi} className="flex flex-wrap gap-1">
                        {items.slice(0, 4).map((w) => (
                          <span key={w} className="text-xs px-2 py-0.5 rounded-lg font-medium"
                            style={{ background: `${g.from}18`, color: g.from }}>
                            {w}
                          </span>
                        ))}
                        {items.length > 4 && (
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 text-textSecondary">+{items.length - 4}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Close time */}
                <div className={`text-xs font-medium ${urgent ? 'text-orange-500' : 'text-textSecondary'}`}>
                  {isClosed ? `Closed ${new Date(h.closedDatetime).toLocaleDateString()}` : `Closes ${new Date(h.closedDatetime).toLocaleString()}`}
                </div>
              </Link>

              <div className="px-5 py-3 bg-background/50 border-t border-border flex items-center gap-1">
                <button onClick={() => openEdit(h)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/8 transition-colors">Edit</button>
                <Link href={`/teacher/homework/${h.id}/try`}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center text-purple-500 hover:bg-purple-500/8 transition-colors">Try</Link>
                <button onClick={async () => { if (confirm('Delete this homework?')) { await deleteHomework(h.id); load(); } }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-highlight hover:bg-highlight/8 transition-colors">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
