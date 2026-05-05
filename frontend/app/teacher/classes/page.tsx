'use client';
import { useEffect, useState } from 'react';
import { getClasses, createClass, deleteClass, updateClass, ClassItem, ClassStatus } from '@/lib/admin-api';
import { gradients, colors } from '@/lib/colors';

const STATUS_CONFIG: Record<ClassStatus, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pending',     color: '#92400E', bg: '#FEF9C3' },
  INPROGRESS: { label: 'In Progress', color: '#065F46', bg: '#DCFCE7' },
  ENDED:      { label: 'Ended',       color: '#6B7280', bg: '#F3F4F6' },
};

const empty = { name: '', code: '', startDate: '', endDate: '', status: 'PENDING' as ClassStatus };

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = () => getClasses().then(setClasses).catch(() => {});
  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      if (editing) { await updateClass(editing, form); setEditing(null); }
      else await createClass(form);
      setForm(empty); setShowForm(false); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  }

  function startEdit(c: ClassItem) {
    setEditing(c.id);
    setForm({ name: c.name, code: c.code, startDate: c.startDate.slice(0,10), endDate: c.endDate.slice(0,10), status: c.status });
    setShowForm(true);
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(empty); }}
          className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
          style={{ background: gradients.primaryPurple }}>
          {showForm ? 'Cancel' : '+ New Class'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-border">
          <h3 className="font-bold text-textPrimary mb-4">{editing ? 'Edit Class' : 'New Class'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Class Name</label>
                <input className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="e.g. English Beginners" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Class Code</label>
                <input className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={form.code} onChange={(e) => set('code', e.target.value)} required placeholder="e.g. ENG-01" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Start Date</label>
                <input type="date" className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">End Date</label>
                <input type="date" className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Status</label>
              <div className="flex gap-3">
                {(['PENDING','INPROGRESS','ENDED'] as ClassStatus[]).map((s) => (
                  <button key={s} type="button" onClick={() => set('status', s)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                    style={form.status === s ? { background: STATUS_CONFIG[s].bg, color: STATUS_CONFIG[s].color, borderColor: STATUS_CONFIG[s].color } : { borderColor: colors.border, color: colors.textSecondary }}>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="text-highlight text-sm bg-highlight/10 px-4 py-2 rounded-xl">{error}</div>}
            <button type="submit" className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: gradients.primaryPurple }}>
              {editing ? 'Update Class' : 'Create Class'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {classes.length === 0 && <div className="col-span-3 text-center py-16 text-textSecondary">No classes yet. Create your first class.</div>}
        {classes.map((c) => {
          const sc = STATUS_CONFIG[c.status];
          return (
            <div key={c.id} className="bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${colors.primary}22` }}>🏫</div>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
              </div>
              <h3 className="font-bold text-textPrimary text-lg mb-1">{c.name}</h3>
              <p className="text-textSecondary text-sm font-mono mb-3">{c.code}</p>
              <p className="text-textSecondary text-xs mb-4">{new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}</p>
              {c._count && (
                <div className="flex gap-4 mb-4">
                  <span className="text-xs text-textSecondary"><strong>{c._count.students}</strong> students</span>
                  <span className="text-xs text-textSecondary"><strong>{c._count.homeworks}</strong> homework</span>
                </div>
              )}
              <div className="flex gap-2 pt-3 border-t border-border">
                <button onClick={() => startEdit(c)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors">Edit</button>
                <button onClick={async () => { if (confirm('Delete this class?')) { await deleteClass(c.id); load(); } }} className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-highlight hover:bg-highlight/10 transition-colors">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
