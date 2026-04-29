'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import { getHomeworkList, createHomework, deleteHomework, getClasses, getWords, HomeworkItem, ClassItem, CreateHomeworkInput } from '@/lib/admin-api';

const emptyForm = (): CreateHomeworkInput => ({
  dayAssigned: '', closedDatetime: '', timeInSeconds: 30, classId: 0, wordIds: [],
});

export default function HomeworkPage() {
  const [list, setList] = useState<HomeworkItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [words, setWords] = useState<{ id: number; text: string; difficulty: number }[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');

  const load = () => getHomeworkList().then(setList).catch(() => {});
  useEffect(() => { load(); getClasses().then(setClasses); getWords().then(setWords); }, []);

  function toggleWord(id: number) {
    setForm((f) => ({
      ...f,
      wordIds: f.wordIds.includes(id) ? f.wordIds.filter((x) => x !== id) : [...f.wordIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!form.classId) { setError('Select a class'); return; }
    if (form.wordIds.length === 0) { setError('Select at least one word'); return; }
    try {
      await createHomework(form);
      setForm(emptyForm()); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  }

  return (
    <AuthGate requiredRole="TEACHER">
      {() => (
        <main className="max-w-3xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Homework</h1>
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Class</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={form.classId || ''} onChange={(e) => setForm((f) => ({ ...f, classId: Number(e.target.value) }))} required>
                  <option value="">Select class...</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Time per word (seconds)</label>
                <input type="number" min={5} max={120} className="border rounded-lg px-3 py-2 text-sm" value={form.timeInSeconds} onChange={(e) => setForm((f) => ({ ...f, timeInSeconds: Number(e.target.value) }))} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Day assigned</label>
                <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={form.dayAssigned} onChange={(e) => setForm((f) => ({ ...f, dayAssigned: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Closes at</label>
                <input type="datetime-local" className="border rounded-lg px-3 py-2 text-sm" value={form.closedDatetime} onChange={(e) => setForm((f) => ({ ...f, closedDatetime: e.target.value }))} required />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Words ({form.wordIds.length} selected)</p>
              <div className="flex flex-wrap gap-2">
                {words.map((w) => (
                  <button key={w.id} type="button" onClick={() => toggleWord(w.id)}
                    className={`px-3 py-1 rounded-lg text-sm border transition ${
                      form.wordIds.includes(w.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}>
                    {w.text}
                  </button>
                ))}
                {words.length === 0 && <p className="text-gray-400 text-sm">No words in database yet.</p>}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Create Homework</button>
          </form>

          <div className="space-y-2">
            {list.length === 0 && <p className="text-gray-400 text-sm">No homework yet.</p>}
            {list.map((h) => (
              <div key={h.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
                <div>
                  <div className="font-medium text-gray-800">
                    {h.class?.name ?? `Class #${h.classId}`} · {new Date(h.dayAssigned).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-400">
                    Words: {h.words.map((w) => w.word.text).join(', ')} · {h.timeInSeconds}s per word
                  </div>
                  <div className="text-xs text-gray-300">Closes: {new Date(h.closedDatetime).toLocaleString()}</div>
                </div>
                <button onClick={async () => { if (confirm('Delete?')) { await deleteHomework(h.id); load(); } }} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
              </div>
            ))}
          </div>
        </main>
      )}
    </AuthGate>
  );
}
