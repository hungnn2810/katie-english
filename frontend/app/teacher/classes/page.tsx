'use client';
import { useEffect, useState } from 'react';
import { getClasses, createClass, deleteClass, updateClass, ClassItem, ClassStatus, ScheduleSlot } from '@/lib/admin-api';
import { colors } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Calendar, Pencil, Trash2, Users } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

const ACCENT = '#F0623A';

const STATUS_CONFIG: Record<ClassStatus, { label: string; color: string; bg: string; dot: string }> = {
  PENDING:    { label: 'Pending',     color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  INPROGRESS: { label: 'In Progress', color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  ENDED:      { label: 'Ended',       color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
};

const STATUS_AVATAR_BG: Record<ClassStatus, string> = {
  PENDING:    '#FEF3C7',
  INPROGRESS: '#D1FAE5',
  ENDED:      '#F3F4F6',
};
const STATUS_AVATAR_COLOR: Record<ClassStatus, string> = {
  PENDING:    '#D97706',
  INPROGRESS: '#059669',
  ENDED:      '#9CA3AF',
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

const emptyForm = () => ({ name: '', code: '', startDate: '', endDate: '', status: 'PENDING' as ClassStatus, scheduleSlots: [] as ScheduleSlot[] });
const DEFAULT_DURATION = 1.5;

function Spinner() {
  return <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
}

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
        : [...f.scheduleSlots, { day, time: '', duration: DEFAULT_DURATION }],
    }));
  }

  function setSlotTime(day: string, time: string) {
    setForm((f) => ({ ...f, scheduleSlots: f.scheduleSlots.map((s) => s.day === day ? { ...s, time } : s) }));
  }

  function setSlotDuration(day: string, duration: number) {
    setForm((f) => ({ ...f, scheduleSlots: f.scheduleSlots.map((s) => s.day === day ? { ...s, duration } : s) }));
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
      <DialogContent className="max-w-2xl rounded-3xl p-0" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between px-8 pt-7 pb-5 border-b border-border gap-0">
          <div>
            <DialogTitle className="text-xl font-black text-textPrimary">
              {editing
                ? <><span className="text-textSecondary font-semibold">Edit </span><span style={{ color: ACCENT }}>{editing.name}</span></>
                : 'New Class'}
            </DialogTitle>
            <p className="text-xs text-textSecondary mt-1">{editing ? 'Update class details and schedule.' : 'Create a new class for your students.'}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}
            className="text-textSecondary hover:bg-gray-100 rounded-xl">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
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
                <DatePicker value={form.startDate} onChange={(v) => setField('startDate', v)} />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">End Date</Label>
                <DatePicker value={form.endDate} onChange={(v) => setField('endDate', v)} />
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
                        ? { background: '#FFF2EF', color: ACCENT, borderColor: ACCENT }
                        : { borderColor: colors.border, color: colors.textSecondary, background: 'white' }}>
                      {DAY_LABELS[day]}
                    </Button>
                  );
                })}
              </div>
              {form.scheduleSlots.length > 0 && (
                <div className="space-y-3 bg-background rounded-xl p-4 border border-border">
                  <div className="grid grid-cols-[36px_1fr_100px] gap-2 mb-1">
                    <span />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary px-1">Start time</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary px-1">Duration</span>
                  </div>
                  {DAYS.filter((d) => form.scheduleSlots.find((s) => s.day === d)).map((day) => {
                    const slot = form.scheduleSlots.find((s) => s.day === day)!;
                    return (
                      <div key={day} className="grid grid-cols-[36px_1fr_100px] items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: ACCENT }}>{DAY_LABELS[day]}</span>
                        <Input type="time" required className="input-base h-auto" value={slot.time} onChange={(e) => setSlotTime(day, e.target.value)} />
                        <div className="relative">
                          <Input
                            type="number" required min={0.5} max={8} step={0.5}
                            className="input-base h-auto pr-6"
                            value={slot.duration ?? DEFAULT_DURATION}
                            onChange={(e) => setSlotDuration(day, parseFloat(e.target.value) || DEFAULT_DURATION)}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-textSecondary font-medium pointer-events-none">h</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-8 pb-7 pt-5 border-t border-border">
            {error && (
              <div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-3">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
              <Button type="submit" disabled={loading}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 gap-2"
                style={{ background: ACCENT }}>
                {loading && <Spinner />}
                {loading ? (editing ? 'Updating…' : 'Creating…') : (editing ? 'Update Class' : 'Create Class')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
                  ? { background: sc ? sc.bg : '#FFF2EF', color: sc ? sc.color : ACCENT, borderColor: sc ? sc.dot : ACCENT }
                  : { background: 'white', color: colors.textSecondary, borderColor: colors.border }}>
                {sc && <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />}
                {t.label}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? (sc ? sc.dot + '25' : '#FFF2EF') : '#F3F4F6', color: active ? (sc ? sc.color : ACCENT) : colors.textSecondary }}>
                  {counts[t.key] ?? 0}
                </span>
              </Button>
            );
          })}
        </div>
        <Button onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0 h-auto text-white hover:opacity-90" style={{ background: ACCENT }}>
          <Plus className="w-4 h-4" />
          New Class
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {classes.length === 0 && (
          <div className="col-span-3 text-center py-20 text-textSecondary">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
            </div>
            <div className="font-semibold text-textPrimary">No classes yet</div>
            <div className="text-sm mt-1">Create your first class to get started</div>
          </div>
        )}
        {classes.length > 0 && filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-textSecondary">
            <div className="font-medium">No classes match</div>
          </div>
        )}
        {filtered.map((c) => {
          const sc = STATUS_CONFIG[c.status];
          const slots: ScheduleSlot[] = Array.isArray(c.scheduleSlots) ? c.scheduleSlots : [];
          const activeDays = DAYS.filter((d) => slots.find((s) => s.day === d));
          const initials = c.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-border shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
              {/* Card header */}
              <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: STATUS_AVATAR_BG[c.status] }}
                  >
                    <span className="font-black text-sm" style={{ color: STATUS_AVATAR_COLOR[c.status] }}>{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-textPrimary text-[15px] leading-tight truncate">{c.name}</h3>
                    <p className="text-textSecondary text-xs font-mono tracking-wider mt-0.5">{c.code}</p>
                  </div>
                </div>
                <span
                  className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5"
                  style={{ background: sc.bg, color: sc.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                  {sc.label}
                </span>
              </div>

              <div className="px-5 pb-4 flex-1 flex flex-col gap-3 border-t border-border/60">
                {/* Date range */}
                <div className="flex items-center gap-1.5 text-xs text-textSecondary pt-3">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                </div>

                {/* Schedule chips */}
                {activeDays.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {activeDays.map((day) => {
                      const slot = slots.find((s) => s.day === day)!;
                      const durationLabel = slot.duration ? ` · ${slot.duration}h` : '';
                      return (
                        <span key={day} className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                          style={{ background: '#FFF2EF', color: ACCENT }}>
                          {DAY_LABELS[day]}{slot.time ? ` ${slot.time}` : ''}{durationLabel}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Student count */}
                {c._count && (
                  <div className="flex items-center gap-1.5 text-xs text-textSecondary mt-auto pt-2 border-t border-border/60">
                    <Users className="w-3.5 h-3.5" />
                    <span className="font-semibold text-textPrimary">{c._count.students}</span> student{c._count.students !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 bg-background/60 border-t border-border flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}
                  className="flex-1 py-1.5 h-auto rounded-lg text-xs font-semibold gap-1.5"
                  style={{ color: ACCENT }}>
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
