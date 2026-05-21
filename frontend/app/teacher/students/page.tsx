'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getStudents, createStudent, deleteStudent, updateStudent, getClasses,
  Student, ClassItem, CreateStudentInput,
  getPendingStudents, approveStudent, ApproveStudentInput, PendingStudent,
  getPasswordResetRequests, resetStudentPassword, PasswordResetRequest,
} from '@/lib/admin-api';
import { colors } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, User, Users, Clock, KeyRound, CheckCircle2, UserMinus, Pencil } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

const ACCENT = '#F0623A';

const emptyParent = { name: '', phoneNumber: '', type: 'FATHER' as const };
const emptyCreate = (): CreateStudentInput => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }], upn: '', password: '' });
type EditForm = Omit<CreateStudentInput, 'upn' | 'password'>;
type ApproveForm = { fullname: string; sex: 'MALE' | 'FEMALE'; dateOfBirth: string; classId: number | undefined; parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[] };
const emptyApprove = (): ApproveForm => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }] });

function Modal({ title, subtitle, onClose, children }: { title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl rounded-3xl p-0 max-h-[90vh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between px-8 pt-7 pb-5 border-b border-border gap-0">
          <div>
            <DialogTitle className="text-xl font-black text-textPrimary">{title}</DialogTitle>
            {subtitle && <p className="text-xs text-textSecondary mt-1">{subtitle}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} className="text-textSecondary hover:bg-gray-100 rounded-xl">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </Button>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4">
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
      {msg}
    </div>
  );
}

function Spinner() {
  return <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
}

function SexToggle({ value, onChange }: { value: 'MALE' | 'FEMALE'; onChange: (v: 'MALE' | 'FEMALE') => void }) {
  return (
    <div className="flex gap-2">
      {(['MALE', 'FEMALE'] as const).map((s) => (
        <Button key={s} type="button" variant="outline" size="sm"
          onClick={() => onChange(s)}
          className="flex-1 py-2 h-auto rounded-xl text-xs font-semibold border-2 transition-all gap-1.5"
          style={value === s
            ? { background: s === 'MALE' ? '#EFF6FF' : '#FDF2F8', color: s === 'MALE' ? '#3B82F6' : '#EC4899', borderColor: s === 'MALE' ? '#3B82F6' : '#EC4899' }
            : { borderColor: colors.border, color: colors.textSecondary, background: 'white' }}>
          <User className="w-3.5 h-3.5" />
          {s === 'MALE' ? 'Male' : 'Female'}
        </Button>
      ))}
    </div>
  );
}

function ParentFields({ parents, onChange }: {
  parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[];
  onChange: (parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[]) => void;
}) {
  return (
    <div className="space-y-2">
      {parents.slice(0, 1).map((p, i) => (
        <div key={i} className="grid grid-cols-3 gap-2">
          <Input className="input-base h-auto" placeholder="Parent name" value={p.name}
            onChange={(e) => { const ps = [...parents]; ps[i] = { ...ps[i], name: e.target.value }; onChange(ps); }} />
          <Input className="input-base h-auto" placeholder="Phone number" value={p.phoneNumber}
            onChange={(e) => { const ps = [...parents]; ps[i] = { ...ps[i], phoneNumber: e.target.value }; onChange(ps); }} />
          <Select value={p.type} onValueChange={(v) => { const ps = [...parents]; ps[i] = { ...ps[i], type: v as 'FATHER' | 'MOTHER' }; onChange(ps); }}>
            <SelectTrigger className="input-base h-auto"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FATHER">Father</SelectItem>
              <SelectItem value="MOTHER">Mother</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

function CreateModal({ classes, onClose, onSaved }: { classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(emptyCreate());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const phone = form.parents[0]?.phoneNumber?.trim();
    if (!phone) { setError('Parent phone is required (used as student login).'); return; }
    setLoading(true);
    try { await createStudent({ ...form, upn: phone, classId: form.classId || undefined }); onSaved(); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to add student.'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Add Student" subtitle="Parent phone number will be used as the login." onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="px-8 py-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Full Name</Label>
              <Input className="input-base h-auto" value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} required placeholder="Student's full name" />
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Sex</Label>
              <SexToggle value={form.sex} onChange={(s) => setForm((f) => ({ ...f, sex: s }))} />
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Date of Birth</Label>
              <DatePicker value={form.dateOfBirth} onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))} />
            </div>
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class</Label>
              <Select value={String(form.classId ?? '')} onValueChange={(v) => setForm((f) => ({ ...f, classId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="input-base h-auto"><SelectValue placeholder="No class assigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No class assigned</SelectItem>
                  {classes.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-xl border border-border p-4 space-y-3 bg-background/50">
            <p className="text-xs font-bold text-textSecondary uppercase tracking-wide">Parent / Guardian</p>
            <ParentFields parents={form.parents} onChange={(ps) => setForm((f) => ({ ...f, parents: ps }))} />
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Initial Password</Label>
              <Input type="password" className="input-base h-auto" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required placeholder="Min 6 characters" minLength={6} />
            </div>
          </div>
        </div>
        <div className="px-8 pb-7">
          {error && <ErrorBanner msg={error} />}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white gap-2 disabled:opacity-60 hover:opacity-90" style={{ background: ACCENT }}>
              {loading && <Spinner />}{loading ? 'Adding…' : 'Add Student'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({ student, classes, onClose, onSaved }: { student: Student; classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditForm>({
    fullname: student.fullname, sex: student.sex, dateOfBirth: student.dateOfBirth.slice(0, 10), classId: student.classId,
    parents: student.parents.length > 0 ? student.parents.map((p) => ({ name: p.name, phoneNumber: p.phoneNumber, type: p.type })) : [{ ...emptyParent }],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await updateStudent(student.id, form); onSaved(); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save changes.'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={<><span className="text-textSecondary font-semibold">Edit </span><span style={{ color: ACCENT }}>{student.fullname}</span></>} subtitle="Update student info and class assignment." onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="px-8 py-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Full Name</Label>
              <Input className="input-base h-auto" value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} required />
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Sex</Label>
              <SexToggle value={form.sex} onChange={(s) => setForm((f) => ({ ...f, sex: s }))} />
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Date of Birth</Label>
              <DatePicker value={form.dateOfBirth} onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))} />
            </div>
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class</Label>
              <Select value={String(form.classId ?? '')} onValueChange={(v) => setForm((f) => ({ ...f, classId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="input-base h-auto"><SelectValue placeholder="No class assigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No class assigned</SelectItem>
                  {classes.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-xl border border-border p-4 space-y-3 bg-background/50">
            <p className="text-xs font-bold text-textSecondary uppercase tracking-wide">Parent / Guardian</p>
            <ParentFields parents={form.parents} onChange={(ps) => setForm((f) => ({ ...f, parents: ps }))} />
          </div>
        </div>
        <div className="px-8 pb-7">
          {error && <ErrorBanner msg={error} />}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white gap-2 disabled:opacity-60 hover:opacity-90" style={{ background: ACCENT }}>
              {loading && <Spinner />}{loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ApproveModal({ pending, classes, onClose, onSaved }: { pending: PendingStudent; classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ApproveForm>(() => {
    if (pending.registrationData) {
      const r = pending.registrationData;
      return { fullname: r.fullname, sex: r.sex, dateOfBirth: r.dateOfBirth.slice(0, 10), classId: r.classId ?? undefined, parents: r.parents.length > 0 ? r.parents : [{ ...emptyParent, phoneNumber: pending.upn }] };
    }
    return { ...emptyApprove(), parents: [{ ...emptyParent, phoneNumber: pending.upn }] };
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!form.fullname || !form.dateOfBirth) { setError('Full name and date of birth are required.'); return; }
    setLoading(true);
    try {
      const payload: ApproveStudentInput = { userId: pending.id, fullname: form.fullname, sex: form.sex, dateOfBirth: form.dateOfBirth, classId: form.classId, parents: form.parents.filter((p) => p.name) };
      await approveStudent(payload); onSaved(); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to approve.'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={<><span className="text-textSecondary font-semibold">Approve </span><span style={{ color: '#10B981' }}>Registration</span></>} subtitle={`Confirm student info for ${pending.upn}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="px-8 py-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
            <strong>Login:</strong> {pending.upn} · Registered {new Date(pending.createdAt).toLocaleDateString()}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Full Name *</Label>
              <Input className="input-base h-auto" value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} required placeholder="Student's full name" />
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Sex</Label>
              <SexToggle value={form.sex} onChange={(s) => setForm((f) => ({ ...f, sex: s }))} />
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Date of Birth *</Label>
              <DatePicker value={form.dateOfBirth} onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))} />
            </div>
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class</Label>
              <Select value={String(form.classId ?? '')} onValueChange={(v) => setForm((f) => ({ ...f, classId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="input-base h-auto"><SelectValue placeholder="No class assigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No class assigned</SelectItem>
                  {classes.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-xl border border-border p-4 space-y-3 bg-background/50">
            <p className="text-xs font-bold text-textSecondary uppercase tracking-wide">Parent / Guardian</p>
            <ParentFields parents={form.parents} onChange={(ps) => setForm((f) => ({ ...f, parents: ps }))} />
          </div>
        </div>
        <div className="px-8 pb-7">
          {error && <ErrorBanner msg={error} />}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white gap-2 disabled:opacity-60 hover:opacity-90" style={{ background: '#10B981' }}>
              {loading && <Spinner />}{loading ? 'Approving…' : 'Confirm Approval'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ResetModal({ request, onClose, onSaved }: { request: PasswordResetRequest; onClose: () => void; onSaved: () => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (pw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try { await resetStudentPassword(request.id, pw); onSaved(); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to reset password.'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={<><span className="text-textSecondary font-semibold">Reset </span><span style={{ color: '#3B82F6' }}>Password</span></>} subtitle={`Set a new password for ${request.student?.fullname ?? request.upn}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="px-8 py-6 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-blue-800">
            <strong>Account:</strong> {request.upn}
          </div>
          <div>
            <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">New Password</Label>
            <Input type="password" className="input-base h-auto" placeholder="Min 6 characters" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} autoFocus />
          </div>
        </div>
        <div className="px-8 pb-7">
          {error && <ErrorBanner msg={error} />}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white gap-2 disabled:opacity-60 hover:opacity-90" style={{ background: ACCENT }}>
              {loading && <Spinner />}{loading ? 'Updating…' : 'Set Password'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

type ModalState = { kind: 'create' } | { kind: 'edit'; student: Student } | { kind: 'approve'; pending: PendingStudent } | { kind: 'reset'; request: PasswordResetRequest } | null;

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [pending, setPending] = useState<PendingStudent[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>(() => searchParams.get('classId') ?? '');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback((cid?: number) => {
    getStudents(cid).then(setStudents).catch(() => {});
  }, []);

  const loadPending = () => getPendingStudents().then(setPending).catch(() => {});
  const loadResets = () => getPasswordResetRequests().then(setResetRequests).catch(() => {});

  useEffect(() => {
    getClasses().then(setClasses);
    loadPending();
    loadResets();
  }, []);

  useEffect(() => {
    load(classFilter ? Number(classFilter) : undefined);
  }, [classFilter, load]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const filtered = students.filter((s) => s.fullname.toLowerCase().includes(search.toLowerCase()));
  const activeClassName = classes.find((c) => String(c.id) === classFilter)?.name;

  return (
    <div className="animate-fade-in">
      {modal?.kind === 'create' && <CreateModal classes={classes} onClose={() => setModal(null)} onSaved={() => { load(classFilter ? Number(classFilter) : undefined); showToast('Student added!'); }} />}
      {modal?.kind === 'edit' && <EditModal student={modal.student} classes={classes} onClose={() => setModal(null)} onSaved={() => { load(classFilter ? Number(classFilter) : undefined); showToast('Changes saved!'); }} />}
      {modal?.kind === 'approve' && <ApproveModal pending={modal.pending} classes={classes} onClose={() => setModal(null)} onSaved={() => { load(classFilter ? Number(classFilter) : undefined); loadPending(); showToast('Student approved!'); }} />}
      {modal?.kind === 'reset' && <ResetModal request={modal.request} onClose={() => setModal(null)} onSaved={() => { loadResets(); showToast('Password updated!'); }} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-textPrimary text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl animate-slide-up flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
          <Input className="input-base pl-10 h-auto" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-52">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="input-base h-auto">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {students.length > 0 && (
          <span className="text-sm text-textSecondary font-medium">
            {filtered.length} of {students.length}
            {activeClassName && <span className="ml-1 text-primary font-semibold">· {activeClassName}</span>}
          </span>
        )}
        <Button onClick={() => setModal({ kind: 'create' })} className="btn-primary flex items-center gap-2 h-auto text-white hover:opacity-90" style={{ background: ACCENT }}>
          <Plus className="w-4 h-4" /> Add Student
        </Button>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h3 className="font-bold text-amber-900 text-sm">Pending Approvals</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">{pending.length}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={loadPending} className="text-xs text-amber-700 hover:text-amber-900 font-semibold h-auto px-2 py-1">Refresh</Button>
          </div>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100 shadow-sm">
                <div>
                  <div className="font-semibold text-textPrimary text-sm">{p.registrationData?.fullname ?? p.upn}</div>
                  <div className="text-xs text-textSecondary mt-0.5">{p.upn} · {new Date(p.createdAt).toLocaleString()}</div>
                </div>
                <Button size="sm" onClick={() => setModal({ kind: 'approve', pending: p })}
                  className="text-xs font-bold px-4 py-2 h-auto rounded-xl text-white hover:opacity-90" style={{ background: '#10B981' }}>
                  Review & Approve
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Password resets */}
      {resetRequests.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <h3 className="font-bold text-blue-900 text-sm">Password Reset Requests</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-800">{resetRequests.length}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={loadResets} className="text-xs text-blue-700 hover:text-blue-900 font-semibold h-auto px-2 py-1">Refresh</Button>
          </div>
          <div className="space-y-2">
            {resetRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-blue-100 shadow-sm">
                <div>
                  <div className="font-semibold text-textPrimary text-sm">{r.student?.fullname ?? r.upn}</div>
                  <div className="text-xs text-textSecondary mt-0.5">{r.upn}</div>
                </div>
                <Button size="sm" onClick={() => setModal({ kind: 'reset', request: r })}
                  className="text-xs font-bold px-4 py-2 h-auto rounded-xl text-white hover:opacity-90" style={{ background: ACCENT }}>
                  Set Password
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {students.length === 0 ? (
          <div className="text-center py-20 text-textSecondary">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-slate-400" />
            </div>
            <div className="font-semibold text-textPrimary">No students yet</div>
            <div className="text-sm mt-1">Add your first student to get started</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-background/70 border-b border-border">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-textSecondary uppercase tracking-wide">Student</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-textSecondary uppercase tracking-wide">Date of Birth</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-textSecondary uppercase tracking-wide">Class</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-textSecondary uppercase tracking-wide">Parent</th>
                <th className="px-5 py-3.5 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-textSecondary text-sm">No students match your search.</td></tr>
              )}
              {filtered.map((s) => {
                const isDeleting = deletingId === s.id;
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-background/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ background: s.sex === 'MALE' ? '#3B82F6' : '#EC4899' }}>
                          {s.fullname[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-textPrimary text-sm">{s.fullname}</div>
                          <div className="text-xs text-textSecondary flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {s.sex === 'MALE' ? 'Male' : 'Female'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-textSecondary">{new Date(s.dateOfBirth).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      {s.class
                        ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#EDE9FE', color: colors.purple }}>{s.class.name}</span>
                        : <span className="text-textSecondary/40 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {s.parents.length > 0
                        ? <div className="text-xs text-textSecondary leading-relaxed space-y-0.5">
                            {s.parents.map((p) => (
                              <div key={p.id} className="flex items-center gap-1.5">
                                <User className="w-3 h-3 shrink-0" />
                                {p.type === 'FATHER' ? 'Father' : 'Mother'}: {p.name} · {p.phoneNumber}
                              </div>
                            ))}
                          </div>
                        : <span className="text-textSecondary/40 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {isDeleting ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-textSecondary">Sure?</span>
                          <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}
                            className="text-xs px-2 py-1 h-auto rounded-lg text-textSecondary hover:bg-gray-100">No</Button>
                          <Button variant="ghost" size="sm"
                            onClick={async () => { await deleteStudent(s.id); setDeletingId(null); load(classFilter ? Number(classFilter) : undefined); showToast('Student removed.'); }}
                            className="text-xs px-2 py-1 h-auto rounded-lg text-white bg-red-500 hover:bg-red-600">Yes</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => setModal({ kind: 'edit', student: s })}
                            className="text-xs font-semibold px-2 py-1 h-auto rounded-lg gap-1" style={{ color: ACCENT }}>
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeletingId(s.id)}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 px-2 py-1 h-auto rounded-lg hover:bg-red-50 gap-1">
                            <UserMinus className="w-3 h-3" /> Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
