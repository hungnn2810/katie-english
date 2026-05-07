'use client';
import { useEffect, useState } from 'react';
import { getClasses, createClass, deleteClass, updateClass, ClassItem, ClassStatus, ScheduleSlot } from '@/lib/admin-api';
import { gradients, colors } from '@/lib/colors';

const STATUS_CONFIG: Record<ClassStatus, { label: string; color: string; bg: string; dot: string }> = {
  PENDING:    { label: 'Pending',     color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  INPROGRESS: { label: 'In Progress', color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  ENDED:      { label: 'Ended',       color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

const emptyForm = () => ({ name: '', code: '', startDate: '', endDate: '', status: 'PENDING' as ClassStatus, scheduleSlots: [] as ScheduleSlot[] });

function ClassModal({ editing, initial, onClose, onSaved }: {
  editing: ClassItem | null;
  initial: ReturnType<typeof emptyForm>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (k: keyof Omit<ReturnType<typeof emptyForm>, 'scheduleSlots'>, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      scheduleSlots: f.scheduleSlots.find((s) => s.day === day)
        ? f.scheduleSlots.filter((s) => s.day !== day)
        : [...f.scheduleSlots, { day, time: '' }],
    }));
  }

  function setSlotTime(day: string, time: string) {
    setForm((f) => ({ ...f, scheduleSlots: f.scheduleSlots.map((s) => s.day === day ? { ...s, time } : s) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (editing) { await updateClass(editing.id, form); }
      else { await createClass(form); }
      onSaved(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save class');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto"
      style={{ background: 'rgba(15,12,41,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-slide-up mb-10">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-black text-textPrimary">{editing ? `Edit ${editing.name}` : 'New Class'}</h2>
            <p className="text-xs text-textSecondary mt-0.5">{editing ? 'Update class details and schedule.' : 'Create a new class for your students.'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-textSecondary hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class Name</label>
                <input className="input-base" value={form.name} onChange={(e) => setField('name', e.target.value)} required placeholder="e.g. English Beginners" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class Code</label>
                <input className="input-base" value={form.code} onChange={(e) => setField('code', e.target.value)} required placeholder="e.g. ENG-01" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Start Date</label>
                <input type="date" className="input-base" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">End Date</label>
                <input type="date" className="input-base" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">Status</label>
              <div className="flex gap-2">
                {(['PENDING', 'INPROGRESS', 'ENDED'] as ClassStatus[]).map((s) => {
                  const sc = STATUS_CONFIG[s];
                  const active = form.status === s;
                  return (
                    <button key={s} type="button" onClick={() => setField('status', s)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border-2 transition-all"
                      style={active
                        ? { background: sc.bg, color: sc.color, borderColor: sc.dot }
                        : { borderColor: colors.border, color: colors.textSecondary, background: 'white' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? sc.dot : colors.border }} />
                      {sc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">Schedule</label>
              <div className="flex gap-2 flex-wrap mb-3">
                {DAYS.map((day) => {
                  const active = !!form.scheduleSlots.find((s) => s.day === day);
                  return (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all"
                      style={active
                        ? { background: `${colors.primary}15`, color: colors.primary, borderColor: colors.primary }
                        : { borderColor: colors.border, color: colors.textSecondary, background: 'white' }}>
                      {DAY_LABELS[day]}
                    </button>
                  );
                })}
              </div>
              {form.scheduleSlots.length > 0 && (
                <div className="space-y-2 bg-background rounded-xl p-3 border border-border">
                  {DAYS.filter((d) => form.scheduleSlots.find((s) => s.day === d)).map((day) => {
                    const slot = form.scheduleSlots.find((s) => s.day === day)!;
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <span className="w-9 text-xs font-bold text-primary">{DAY_LABELS[day]}</span>
                        <input type="time" required className="input-base flex-1" value={slot.time} onChange={(e) => setSlotTime(day, e.target.value)} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pb-6">
            {error && (
              <div className="flex items-start gap-2 text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-4">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-textSecondary border border-border hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: gradients.primaryPurple }}>
                {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>}
                {loading ? (editing ? 'Updating…' : 'Creating…') : (editing ? 'Update Class' : 'Create Class')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_GRADIENT: Record<ClassStatus, string> = {
  PENDING:    'linear-gradient(135deg, #F59E0B, #FCD34D)',
  INPROGRESS: 'linear-gradient(135deg, #10B981, #6EE7B7)',
  ENDED:      'linear-gradient(135deg, #9CA3AF, #D1D5DB)',
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [initialForm, setInitialForm] = useState(emptyForm());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClassStatus>('ALL');

  const load = () => getClasses().then(setClasses).catch(() => {});
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setInitialForm(emptyForm()); setShowModal(true); }
  function openEdit(c: ClassItem) {
    setEditing(c);
    setInitialForm({ name: c.name, code: c.code, startDate: c.startDate.slice(0, 10), endDate: c.endDate.slice(0, 10), status: c.status, scheduleSlots: Array.isArray(c.scheduleSlots) ? c.scheduleSlots : [] });
    setShowModal(true);
  }

  const counts = { ALL: classes.length, PENDING: 0, INPROGRESS: 0, ENDED: 0 } as Record<string, number>;
  classes.forEach((c) => { counts[c.status] = (counts[c.status] ?? 0) + 1; });

  const filtered = classes.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filterTabs: { key: 'ALL' | ClassStatus; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'INPROGRESS', label: 'In Progress' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'ENDED', label: 'Ended' },
  ];

  return (
    <div className="animate-fade-in">
      {showModal && (
        <ClassModal editing={editing} initial={initialForm} onClose={() => setShowModal(false)} onSaved={load} />
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input className="input-base pl-10" placeholder="Search classes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-1">
          {filterTabs.map((t) => {
            const active = statusFilter === t.key;
            const sc = t.key !== 'ALL' ? STATUS_CONFIG[t.key] : null;
            return (
              <button key={t.key} onClick={() => setStatusFilter(t.key)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border"
                style={active
                  ? { background: sc ? sc.bg : '#F0F9FF', color: sc ? sc.color : colors.primary, borderColor: sc ? sc.dot : colors.primary }
                  : { background: 'white', color: colors.textSecondary, borderColor: colors.border }}>
                {sc && <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />}
                {t.label}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? (sc ? sc.dot + '25' : colors.primary + '20') : '#F3F4F6', color: active ? (sc ? sc.color : colors.primary) : colors.textSecondary }}>
                  {counts[t.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0" style={{ background: gradients.primaryPurple }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Class
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {classes.length === 0 && (
          <div className="col-span-3 text-center py-20 text-textSecondary">
            <div className="text-4xl mb-3">🏫</div>
            <div className="font-medium">No classes yet</div>
            <div className="text-sm mt-1">Create your first class to get started</div>
          </div>
        )}
        {classes.length > 0 && filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-textSecondary">
            <div className="text-3xl mb-3">🔍</div>
            <div className="font-medium">No classes match</div>
          </div>
        )}
        {filtered.map((c) => {
          const sc = STATUS_CONFIG[c.status];
          const slots: ScheduleSlot[] = Array.isArray(c.scheduleSlots) ? c.scheduleSlots : [];
          const activeDays = DAYS.filter((d) => slots.find((s) => s.day === d));
          const initials = c.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
          return (
            <div key={c.id} className="card overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
              {/* Gradient header */}
              <div className="px-5 pt-5 pb-4" style={{ background: STATUS_GRADIENT[c.status] }}>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white font-black text-lg">{initials}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-white/30 text-white backdrop-blur-sm">
                    {sc.label}
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="font-black text-white text-[15px] leading-tight">{c.name}</h3>
                  <p className="text-white/70 text-xs font-mono mt-0.5 tracking-wider">{c.code}</p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col gap-3">
                {/* Date range */}
                <div className="flex items-center gap-1.5 text-xs text-textSecondary">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                </div>

                {/* Schedule */}
                {activeDays.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {activeDays.map((day) => {
                      const slot = slots.find((s) => s.day === day)!;
                      return (
                        <span key={day} className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                          style={{ background: `${colors.primary}12`, color: colors.primary }}>
                          {DAY_LABELS[day]}{slot.time ? ` ${slot.time}` : ''}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Stats */}
                {c._count && (
                  <div className="flex gap-3 mt-auto pt-2 border-t border-border/60">
                    <div className="flex-1 text-center">
                      <div className="text-xl font-black text-textPrimary">{c._count.students}</div>
                      <div className="text-[10px] text-textSecondary font-medium uppercase tracking-wide">Students</div>
                    </div>
                    <div className="w-px bg-border/60" />
                    <div className="flex-1 text-center">
                      <div className="text-xl font-black text-textPrimary">{c._count.homeworks}</div>
                      <div className="text-[10px] text-textSecondary font-medium uppercase tracking-wide">Homework</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-background/50 border-t border-border flex gap-1">
                <button onClick={() => openEdit(c)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/8 transition-colors">
                  Edit
                </button>
                <button onClick={async () => { if (confirm('Delete this class?')) { await deleteClass(c.id); load(); } }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-highlight hover:bg-highlight/8 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
