'use client';
import { useEffect, useState } from 'react';
import { getClasses, createClass, deleteClass, updateClass, ClassItem, ClassStatus, ScheduleSlot } from '@/lib/admin-api';
import { gradients, colors } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, Calendar, Pencil, Trash2 } from 'lucide-react';

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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg rounded-3xl p-0" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-border gap-0">
          <div>
            <DialogTitle className="text-lg font-black text-textPrimary">{editing ? `Edit ${editing.name}` : 'New Class'}</DialogTitle>
            <p className="text-xs text-textSecondary mt-0.5">{editing ? 'Update class details and schedule.' : 'Create a new class for your students.'}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}
            className="text-textSecondary hover:bg-gray-100 rounded-xl">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class Name</Label>
                <Input className="input-base h-auto" value={form.name} onChange={(e) => setField('name', e.target.value)} required placeholder="e.g. English Beginners" />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class Code</Label>
                <Input className="input-base h-auto" value={form.code} onChange={(e) => setField('code', e.target.value)} required placeholder="e.g. ENG-01" />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Start Date</Label>
                <Input type="date" className="input-base h-auto" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} required />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">End Date</Label>
                <Input type="date" className="input-base h-auto" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} required />
              </div>
            </div>

            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">Status</Label>
              <div className="flex gap-2">
                {(['PENDING', 'INPROGRESS', 'ENDED'] as ClassStatus[]).map((s) => {
                  const sc = STATUS_CONFIG[s];
                  const active = form.status === s;
                  return (
                    <Button key={s} type="button" variant="outline" size="sm"
                      onClick={() => setField('status', s)}
                      className="flex items-center gap-1.5 px-3.5 py-2 h-auto rounded-xl text-xs font-semibold border-2 transition-all"
                      style={active
                        ? { background: sc.bg, color: sc.color, borderColor: sc.dot }
                        : { borderColor: colors.border, color: colors.textSecondary, background: 'white' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? sc.dot : colors.border }} />
                      {sc.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">Schedule</Label>
              <div className="flex gap-2 flex-wrap mb-3">
                {DAYS.map((day) => {
                  const active = !!form.scheduleSlots.find((s) => s.day === day);
                  return (
                    <Button key={day} type="button" variant="outline" size="sm"
                      onClick={() => toggleDay(day)}
                      className="px-3 py-1.5 h-auto rounded-lg text-xs font-bold border-2 transition-all"
                      style={active
                        ? { background: `${colors.primary}15`, color: colors.primary, borderColor: colors.primary }
                        : { borderColor: colors.border, color: colors.textSecondary, background: 'white' }}>
                      {DAY_LABELS[day]}
                    </Button>
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
                        <Input type="time" required className="input-base flex-1 h-auto" value={slot.time} onChange={(e) => setSlotTime(day, e.target.value)} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pb-6 pt-4 border-t border-border">
            {error && (
              <div className="flex items-start gap-2 text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-3">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
              <Button type="submit" disabled={loading}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 gap-2"
                style={{ background: gradients.primaryPurple }}>
                {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>}
                {loading ? (editing ? 'Updating…' : 'Creating…') : (editing ? 'Update Class' : 'Create Class')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
          <Input className="input-base pl-10 h-auto" placeholder="Search classes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-1">
          {filterTabs.map((t) => {
            const active = statusFilter === t.key;
            const sc = t.key !== 'ALL' ? STATUS_CONFIG[t.key] : null;
            return (
              <Button key={t.key} variant="outline" size="sm" onClick={() => setStatusFilter(t.key)}
                className="flex items-center gap-1.5 px-3.5 py-2 h-auto rounded-xl text-xs font-semibold transition-all border"
                style={active
                  ? { background: sc ? sc.bg : '#F0F9FF', color: sc ? sc.color : colors.primary, borderColor: sc ? sc.dot : colors.primary }
                  : { background: 'white', color: colors.textSecondary, borderColor: colors.border }}>
                {sc && <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />}
                {t.label}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? (sc ? sc.dot + '25' : colors.primary + '20') : '#F3F4F6', color: active ? (sc ? sc.color : colors.primary) : colors.textSecondary }}>
                  {counts[t.key] ?? 0}
                </span>
              </Button>
            );
          })}
        </div>
        <Button onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0 h-auto" style={{ background: gradients.primaryPurple }}>
          <Plus className="w-4 h-4" />
          New Class
        </Button>
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
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
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
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-background/50 border-t border-border flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}
                  className="flex-1 py-1.5 h-auto rounded-lg text-xs font-semibold text-primary hover:bg-primary/8 gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={async () => { if (confirm('Delete this class?')) { await deleteClass(c.id); load(); } }}
                  className="flex-1 py-1.5 h-auto rounded-lg text-xs font-semibold text-highlight hover:bg-highlight/8 gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
