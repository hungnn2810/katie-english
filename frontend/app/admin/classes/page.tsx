'use client';
import { useEffect, useState } from 'react';
import {
  getAdminClasses,
  getTeachers,
  updateAdminClass,
  deleteAdminClass,
  AdminClassItem,
  AdminUpdateClassInput,
  TeacherItem,
  ScheduleSlot,
  ClassStatus,
} from '@/lib/admin-portal-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { CheckCircle2 } from 'lucide-react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };
const DEFAULT_DURATION = 1.5;

const STATUS_BADGE: Record<ClassStatus, { label: string; className: string }> = {
  PENDING:    { label: 'Pending',     className: 'bg-amber-50 text-amber-700' },
  INPROGRESS: { label: 'In Progress', className: 'bg-emerald-50 text-emerald-700' },
  ENDED:      { label: 'Ended',       className: 'bg-slate-100 text-slate-500' },
};

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EditClassModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: AdminClassItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AdminUpdateClassInput>({
    name: editing.name,
    code: editing.code,
    startDate: editing.startDate.slice(0, 10),
    endDate: editing.endDate.slice(0, 10),
    status: editing.status,
    scheduleSlots: Array.isArray(editing.scheduleSlots) ? editing.scheduleSlots : [],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function setField<K extends keyof AdminUpdateClassInput>(k: K, v: AdminUpdateClassInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleDay(day: string) {
    const slots = form.scheduleSlots ?? [];
    setField(
      'scheduleSlots',
      slots.find((s) => s.day === day)
        ? slots.filter((s) => s.day !== day)
        : [...slots, { day, time: '', duration: DEFAULT_DURATION }],
    );
  }

  function setSlotTime(day: string, time: string) {
    setField('scheduleSlots', (form.scheduleSlots ?? []).map((s) => (s.day === day ? { ...s, time } : s)));
  }

  function setSlotDuration(day: string, duration: number) {
    setField('scheduleSlots', (form.scheduleSlots ?? []).map((s) => (s.day === day ? { ...s, duration } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await updateAdminClass(editing.id, form);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const slots = form.scheduleSlots ?? [];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl rounded-3xl p-0" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between px-8 pt-7 pb-5 border-b border-border gap-0">
          <div>
            <DialogTitle className="text-xl font-black text-textPrimary">Edit Class</DialogTitle>
            <p className="text-xs text-textSecondary mt-1">Update class details and schedule.</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}
            className="text-textSecondary hover:bg-gray-100 rounded-xl">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class Name</Label>
                <Input className="input-base h-auto" value={form.name ?? ''} onChange={(e) => setField('name', e.target.value)} required />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class Code</Label>
                <Input className="input-base h-auto" value={form.code ?? ''} onChange={(e) => setField('code', e.target.value)} required />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Start Date</Label>
                <DatePicker value={form.startDate ?? ''} onChange={(v) => setField('startDate', v)} />
              </div>
              <div>
                <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">End Date</Label>
                <DatePicker value={form.endDate ?? ''} onChange={(v) => setField('endDate', v)} />
              </div>
            </div>

            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">Status</Label>
              <div className="flex gap-2">
                {(['PENDING', 'INPROGRESS', 'ENDED'] as ClassStatus[]).map((s) => {
                  const badge = STATUS_BADGE[s];
                  const active = form.status === s;
                  return (
                    <Button key={s} type="button" variant="outline" size="sm"
                      onClick={() => setField('status', s)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 h-auto rounded-xl text-xs font-semibold border-2 transition-all ${active ? badge.className + ' border-current' : 'border-border text-textSecondary bg-white'}`}>
                      {badge.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-2 uppercase tracking-wide">Schedule</Label>
              <div className="flex gap-2 flex-wrap mb-3">
                {DAYS.map((day) => {
                  const active = !!slots.find((s) => s.day === day);
                  return (
                    <Button key={day} type="button" variant="outline" size="sm"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 h-auto rounded-lg text-xs font-bold border-2 transition-all ${active ? 'bg-blue-50 text-blue-600 border-blue-400' : 'border-border text-textSecondary bg-white'}`}>
                      {DAY_LABELS[day]}
                    </Button>
                  );
                })}
              </div>
              {slots.length > 0 && (
                <div className="space-y-3 bg-background rounded-xl p-4 border border-border">
                  <div className="grid grid-cols-[36px_1fr_100px] gap-2 mb-1">
                    <span />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary px-1">Start time</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary px-1">Duration</span>
                  </div>
                  {DAYS.filter((d) => slots.find((s) => s.day === d)).map((day) => {
                    const slot = slots.find((s) => s.day === day)!;
                    return (
                      <div key={day} className="grid grid-cols-[36px_1fr_100px] items-center gap-2">
                        <span className="text-xs font-bold text-blue-600">{DAY_LABELS[day]}</span>
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
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">
                Keep class
              </Button>
              <Button type="submit" disabled={loading}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 gap-2 bg-blue-500">
                {loading && <Spinner />}
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  cls,
  onClose,
  onDeleted,
}: {
  cls: AdminClassItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await deleteAdminClass(cls.id);
      onDeleted();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete class. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md rounded-3xl p-0" showCloseButton={false}>
        <DialogHeader className="px-8 pt-7 pb-5 border-b border-border">
          <DialogTitle className="text-xl font-black text-textPrimary">Delete class?</DialogTitle>
        </DialogHeader>
        <div className="px-8 py-5">
          <p className="text-sm text-textSecondary">
            Delete class? All homework and sessions in this class will be permanently deleted.
          </p>
          {error && (
            <p className="text-sm text-red-500 mt-3">{error}</p>
          )}
        </div>
        <DialogFooter className="px-8 pb-7 pt-2 gap-3 flex-row">
          <Button type="button" variant="outline" onClick={onClose}
            className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">
            Keep class
          </Button>
          <Button type="button" onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold bg-destructive text-white hover:opacity-90 disabled:opacity-60 gap-2">
            {deleting && <Spinner />}
            {deleting ? 'Deleting...' : 'Delete class'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<AdminClassItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminClassItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminClassItem | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function loadClasses(filter: string) {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminClasses(filter === 'ALL' ? undefined : Number(filter));
      setClasses(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  }

  // Load teachers once on mount
  useEffect(() => {
    getTeachers()
      .then(setTeachers)
      .catch(() => {});
  }, []);

  // Reload classes whenever filter changes (including on mount)
  useEffect(() => {
    loadClasses(teacherFilter);
  }, [teacherFilter]);

  return (
    <div className="animate-fade-in">
      {editing && (
        <EditClassModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { loadClasses(teacherFilter); showToast('Class updated.'); }}
        />
      )}

      {confirmDelete && (
        <DeleteConfirmDialog
          cls={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onDeleted={() => { loadClasses(teacherFilter); showToast('Class deleted.'); }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-textPrimary text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl animate-slide-up flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-5">
        <Label className="text-xs font-semibold text-textSecondary uppercase tracking-wide whitespace-nowrap">
          Filter by teacher
        </Label>
        <div className="w-48">
          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All teachers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All teachers</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name ?? t.upn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500 mb-4">{error}</div>
      )}

      {/* Table */}
      {!loading && classes.length === 0 ? (
        <div className="text-center py-20 text-textSecondary">
          {teacherFilter === 'ALL' ? (
            <>
              <div className="font-semibold text-textPrimary text-lg mb-2">No classes yet</div>
              <div className="text-sm">Classes are created by teachers from their dashboard.</div>
            </>
          ) : (
            <>
              <div className="font-semibold text-textPrimary text-lg mb-2">No classes for this teacher</div>
              <div className="text-sm">This teacher has not created any classes yet.</div>
            </>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 bg-white">
              <TableHead className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Class Name</TableHead>
              <TableHead className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Teacher</TableHead>
              <TableHead className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Students</TableHead>
              <TableHead className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((c) => {
              const badge = STATUS_BADGE[c.status];
              return (
                <TableRow key={c.id} className="hover:bg-slate-50">
                  <TableCell className="font-semibold text-sm text-textPrimary">
                    <div>{c.name}</div>
                    <div className="text-xs text-textSecondary font-mono">{c.code}</div>
                  </TableCell>
                  <TableCell className="text-sm text-textSecondary">
                    {c.teacher ? (c.teacher.name ?? c.teacher.upn) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-textSecondary">
                    {c._count.students}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm"
                        className="text-xs font-semibold text-blue-600 hover:bg-blue-50 h-auto py-1.5 px-3 rounded-lg"
                        onClick={() => setEditing(c)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm"
                        className="text-xs font-semibold text-red-500 hover:bg-red-50 h-auto py-1.5 px-3 rounded-lg"
                        onClick={() => setConfirmDelete(c)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
