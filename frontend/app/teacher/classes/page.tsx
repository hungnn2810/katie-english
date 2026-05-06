'use client';
import { useEffect, useState } from 'react';
import { getClasses, createClass, deleteClass, updateClass, ClassItem, ClassStatus, ScheduleSlot } from '@/lib/admin-api';
import { gradients, colors } from '@/lib/colors';

const STATUS_CONFIG: Record<ClassStatus, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pending',     color: '#92400E', bg: '#FEF9C3' },
  INPROGRESS: { label: 'In Progress', color: '#065F46', bg: '#DCFCE7' },
  ENDED:      { label: 'Ended',       color: '#6B7280', bg: '#F3F4F6' },
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

const emptyForm = { name: '', code: '', startDate: '', endDate: '', status: 'PENDING' as ClassStatus, scheduleSlots: [] as ScheduleSlot[] };

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = () => getClasses().then(setClasses).catch(() => {});
  useEffect(() => { load(); }, []);

  const setField = (k: keyof Omit<typeof emptyForm, 'scheduleSlots'>, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function toggleDay(day: string) {
    setForm((f) => {
      const exists = f.scheduleSlots.find((s) => s.day === day);
      return {
        ...f,
        scheduleSlots: exists
          ? f.scheduleSlots.filter((s) => s.day !== day)
          : [...f.scheduleSlots, { day, time: '' }],
      };
    });
  }

  function setSlotTime(day: string, time: string) {
    setForm((f) => ({
      ...f,
      scheduleSlots: f.scheduleSlots.map((s) => s.day === day ? { ...s, time } : s),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      if (editing) { await updateClass(editing, form); setEditing(null); }
      else await createClass(form);
      setForm(emptyForm); setShowForm(false); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  }

  function startEdit(c: ClassItem) {
    setEditing(c.id);
    setForm({
      name: c.name, code: c.code,
      startDate: c.startDate.slice(0, 10), endDate: c.endDate.slice(0, 10),
      status: c.status,
      scheduleSlots: Array.isArray(c.scheduleSlots) ? c.scheduleSlots : [],
    });
    setShowForm(true);
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm); }}
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
                <input className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={form.name} onChange={(e) => setField('name', e.target.value)} required placeholder="e.g. English Beginners" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Class Code</label>
                <input className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={form.code} onChange={(e) => setField('code', e.target.value)} required placeholder="e.g. ENG-01" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Start Date</label>
                <input type="date" className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">End Date</label>
                <input type="date" className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">Schedule</label>
              <div className="flex gap-2 flex-wrap mb-3">
                {DAYS.map((day) => {
                  const active = !!form.scheduleSlots.find((s) => s.day === day);
                  return (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                      style={active
                        ? { background: `${colors.primary}22`, color: colors.primary, borderColor: colors.primary }
                        : { borderColor: colors.border, color: colors.textSecondary }}>
                      {DAY_LABELS[day]}
                    </button>
                  );
                })}
              </div>
              {form.scheduleSlots.length > 0 && (
                <div className="flex flex-col gap-2">
                  {DAYS.filter((d) => form.scheduleSlots.find((s) => s.day === d)).map((day) => {
                    const slot = form.scheduleSlots.find((s) => s.day === day)!;
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <span className="w-10 text-xs font-bold text-textSecondary">{DAY_LABELS[day]}</span>
                        <input type="time" required
                          className="border-2 border-border rounded-lg px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                          value={slot.time}
                          onChange={(e) => setSlotTime(day, e.target.value)} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Status</label>
              <div className="flex gap-3">
                {(['PENDING','INPROGRESS','ENDED'] as ClassStatus[]).map((s) => (
                  <button key={s} type="button" onClick={() => setField('status', s)}
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
          const slots: ScheduleSlot[] = Array.isArray(c.scheduleSlots) ? c.scheduleSlots : [];
          return (
            <div key={c.id} className="bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${colors.primary}22` }}>🏫</div>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
              </div>
              <h3 className="font-bold text-textPrimary text-lg mb-1">{c.name}</h3>
              <p className="text-textSecondary text-sm font-mono mb-3">{c.code}</p>
              <p className="text-textSecondary text-xs mb-2">{new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}</p>
              {slots.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
                  {DAYS.filter((d) => slots.find((s) => s.day === d)).map((day) => {
                    const slot = slots.find((s) => s.day === day)!;
                    return (
                      <span key={day} className="text-xs text-textSecondary">
                        <strong>{DAY_LABELS[day]}</strong> {slot.time}
                      </span>
                    );
                  })}
                </div>
              )}
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
