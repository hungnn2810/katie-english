'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import { getClasses, createClass, deleteClass, updateClass, ClassItem, ClassStatus } from '@/lib/admin-api';

const STATUS_LABELS: Record<ClassStatus, string> = { PENDING: 'Pending', INPROGRESS: 'In Progress', ENDED: 'Ended' };
const STATUS_COLORS: Record<ClassStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  INPROGRESS: 'bg-green-100 text-green-700',
  ENDED: 'bg-gray-100 text-gray-500',
};

const empty = { name: '', code: '', startDate: '', endDate: '', status: 'PENDING' as ClassStatus };

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = () => getClasses().then(setClasses).catch(() => {});
  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      if (editing) { await updateClass(editing, form); setEditing(null); }
      else await createClass(form);
      setForm(empty); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  }

  function startEdit(c: ClassItem) {
    setEditing(c.id);
    setForm({ name: c.name, code: c.code, startDate: c.startDate.slice(0,10), endDate: c.endDate.slice(0,10), status: c.status });
  }

  return (
    <AuthGate requiredRole="TEACHER">
      {() => (
        <main className="max-w-3xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Classes</h1>
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Class name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Code (e.g. ENG-01)" value={form.code} onChange={(e) => set('code', e.target.value)} required />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Start date</label>
                <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">End date</label>
                <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} required />
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="PENDING">Pending</option>
                <option value="INPROGRESS">In Progress</option>
                <option value="ENDED">Ended</option>
              </select>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                {editing ? 'Update' : 'Add Class'}
              </button>
              {editing && <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="text-gray-400 text-sm hover:text-gray-600">Cancel</button>}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>

          <div className="space-y-2">
            {classes.length === 0 && <p className="text-gray-400 text-sm">No classes yet.</p>}
            {classes.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{c.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{c.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                    {c._count && <> · {c._count.students} students · {c._count.homeworks} homework</>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => startEdit(c)} className="text-blue-400 hover:text-blue-600 text-sm">Edit</button>
                  <button onClick={async () => { if (confirm('Delete?')) { await deleteClass(c.id); load(); } }} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
    </AuthGate>
  );
}
