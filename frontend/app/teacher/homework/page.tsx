'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHomeworkList, createHomework, updateHomework, deleteHomework, getClasses, getWords, HomeworkItem, ClassItem, CreateHomeworkInput, HomeworkType } from '@/lib/admin-api';
import { cardGradients, gradients, colors } from '@/lib/colors';

const HOMEWORK_TYPES: { value: HomeworkType; label: string }[] = [
  { value: 'PHONICS', label: 'Phonics' },
  { value: 'READING', label: 'Reading' },
  { value: 'SPELLING', label: 'Spelling' },
  { value: 'VOCABULARY', label: 'Vocabulary' },
];

const emptyForm = (): CreateHomeworkInput => ({
  type: 'PHONICS', dayAssigned: '', closedDatetime: '', timeInSeconds: 30, classId: 0, wordIds: [],
});

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HomeworkPage() {
  const [list, setList] = useState<HomeworkItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [words, setWords] = useState<{ id: number; text: string; difficulty: number }[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = () => getHomeworkList().then(setList).catch(() => {});
  useEffect(() => { load(); getClasses().then(setClasses); getWords().then(setWords); }, []);

  function toggleWord(id: number) {
    setForm((f) => ({
      ...f,
      wordIds: f.wordIds.includes(id) ? f.wordIds.filter((x) => x !== id) : [...f.wordIds, id],
    }));
  }

  function startEdit(h: HomeworkItem) {
    setEditingId(h.id);
    setForm({
      type: h.type,
      dayAssigned: new Date(h.dayAssigned).toISOString().slice(0, 10),
      closedDatetime: toLocalDatetimeValue(h.closedDatetime),
      timeInSeconds: h.timeInSeconds,
      classId: h.classId,
      wordIds: h.words.map((w) => w.word.id),
    });
    setShowForm(true);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!form.classId) { setError('Select a class'); return; }
    if (form.wordIds.length === 0) { setError('Select at least one word'); return; }
    try {
      if (editingId !== null) {
        await updateHomework(editingId, form);
      } else {
        await createHomework(form);
      }
      cancelForm(); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <button onClick={() => { if (showForm && editingId === null) { cancelForm(); } else { cancelForm(); setShowForm(true); } }}
          className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
          style={{ background: gradients.primarySecondary }}>
          {showForm && editingId === null ? 'Cancel' : '+ New Homework'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-textPrimary">
              {editingId !== null ? `Edit Homework #${editingId}` : 'Create Homework'}
            </h3>
            {editingId !== null && (
              <button type="button" onClick={cancelForm} className="text-xs text-textSecondary hover:text-textPrimary">
                Cancel
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Type</label>
                <select className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as HomeworkType }))} required>
                  {HOMEWORK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Class</label>
                <select className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  value={form.classId || ''} onChange={(e) => setForm((f) => ({ ...f, classId: Number(e.target.value) }))} required>
                  <option value="">Select class...</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Time per word (seconds)</label>
                <input type="number" min={5} max={120}
                  className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  value={form.timeInSeconds} onChange={(e) => setForm((f) => ({ ...f, timeInSeconds: Number(e.target.value) }))} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Day Assigned</label>
                <input type="date"
                  className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  value={form.dayAssigned} onChange={(e) => setForm((f) => ({ ...f, dayAssigned: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Closes At</label>
                <input type="datetime-local"
                  className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  value={form.closedDatetime} onChange={(e) => setForm((f) => ({ ...f, closedDatetime: e.target.value }))} required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">
                Words <span className="normal-case text-primary font-normal">({form.wordIds.length} selected)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {words.length === 0 && <p className="text-textSecondary text-sm">No words in database yet.</p>}
                {words.map((w) => (
                  <button key={w.id} type="button" onClick={() => toggleWord(w.id)}
                    className="px-4 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all"
                    style={form.wordIds.includes(w.id)
                      ? { background: gradients.primarySecondary, color: 'white', borderColor: 'transparent' }
                      : { borderColor: colors.border, color: colors.textSecondary, background: 'white' }}>
                    {w.text}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="text-highlight text-sm bg-highlight/10 px-4 py-2 rounded-xl">{error}</div>}
            <button type="submit"
              className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: gradients.primarySecondary }}>
              {editingId !== null ? 'Update Homework' : 'Create Homework'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {list.length === 0 && (
          <div className="col-span-3 text-center py-16 text-textSecondary">No homework yet. Create your first assignment.</div>
        )}
        {list.map((h, i) => {
          const g = cardGradients[i % cardGradients.length];
          const wordList = h.words.map((w) => w.word.text);
          const isClosed = new Date(h.closedDatetime) < new Date();
          return (
            <div key={h.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${editingId === h.id ? 'border-primary' : 'border-border'}`}>
              <div className="h-2" style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }} />
              <Link href={`/teacher/homework/${h.id}`} className="block p-5 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-textPrimary">{h.class?.name ?? `Class #${h.classId}`}</div>
                    <div className="text-xs text-textSecondary mt-0.5">{new Date(h.dayAssigned).toLocaleDateString()}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isClosed ? 'bg-gray-100 text-textSecondary' : 'bg-brand-green/15 text-brand-green'}`}>
                      {isClosed ? 'Closed' : 'Open'}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary capitalize">
                      {h.type.charAt(0) + h.type.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {wordList.slice(0, 6).map((w) => (
                    <span key={w} className="text-xs px-2 py-0.5 rounded-lg font-medium"
                      style={{ background: `${g.from}22`, color: g.from }}>
                      {w}
                    </span>
                  ))}
                  {wordList.length > 6 && (
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 text-textSecondary">+{wordList.length - 6}</span>
                  )}
                </div>

                <div className="text-xs text-textSecondary">
                  {h.timeInSeconds}s per word · Closes {new Date(h.closedDatetime).toLocaleString()}
                </div>
              </Link>
              <div className="px-5 pb-4 pt-3 border-t border-border flex items-center gap-4">
                <button onClick={() => startEdit(h)}
                  className="text-xs text-primary hover:text-primary/70 font-semibold">
                  Edit
                </button>
                <button onClick={async () => { if (confirm('Delete this homework?')) { await deleteHomework(h.id); load(); } }}
                  className="text-xs text-highlight hover:text-red-600 font-semibold">
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
