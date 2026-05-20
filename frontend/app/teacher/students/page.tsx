'use client';
import React, { useEffect, useState } from 'react';
import {
  getStudents, createStudent, deleteStudent, updateStudent, getClasses,
  Student, ClassItem, CreateStudentInput,
  getPendingStudents, approveStudent, ApproveStudentInput, PendingStudent,
  getPasswordResetRequests, resetStudentPassword, PasswordResetRequest,
} from '@/lib/admin-api';
import { gradients, colors } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const emptyParent = { name: '', phoneNumber: '', type: 'FATHER' as const };
const emptyCreate = (): CreateStudentInput => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }], upn: '', password: '' });
type EditForm = Omit<CreateStudentInput, 'upn' | 'password'>;
const emptyEdit = (): EditForm => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }] });
type ApproveForm = { fullname: string; sex: 'MALE' | 'FEMALE'; dateOfBirth: string; classId: number | undefined; parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[] };
const emptyApprove = (): ApproveForm => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }] });

// ── Shared modal shell ────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg rounded-3xl p-0 max-h-[90vh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-border gap-0">
          <div>
            <DialogTitle className="text-lg font-black text-textPrimary">{title}</DialogTitle>
            {subtitle && <p className="text-xs text-textSecondary mt-0.5">{subtitle}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}
            className="text-textSecondary hover:bg-gray-100 rounded-xl">
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
    <div className="flex items-start gap-2 text-sm bg-highlight/8 border border-highlight/25 text-highlight px-4 py-3 rounded-xl mb-4">
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
      {msg}
    </div>
  );
}

function Spinner() {
  return <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
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
            <SelectTrigger className="input-base h-auto">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
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

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateModal({ classes, onClose, onSaved }: { classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(emptyCreate());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const phone = form.parents[0]?.phoneNumber?.trim();
    if (!phone) { setError('Parent phone is required (used as student login).'); return; }
    setLoading(true);
    try {
      await createStudent({ ...form, upn: phone, classId: form.classId || undefined });
      onSaved(); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to add student.'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Add Student" subtitle="Parent phone number will be used as the login." onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Full Name</Label>
              <Input className="input-base h-auto" value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} required placeholder="Student's full name" />
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Sex</Label>
              <div className="flex gap-2">
                {(['MALE', 'FEMALE'] as const).map((s) => (
                  <Button key={s} type="button" variant="outline" size="sm"
                    onClick={() => setForm((f) => ({ ...f, sex: s }))}
                    className="flex-1 py-2 h-auto rounded-xl text-xs font-semibold border-2 transition-all"
                    style={form.sex === s
                      ? { background: s === 'MALE' ? '#EFF6FF' : '#FDF2F8', color: s === 'MALE' ? colors.primary : '#EC4899', borderColor: s === 'MALE' ? colors.primary : '#EC4899' }
                      : { borderColor: colors.border, color: colors.textSecondary, background: 'white' }}>
                    {s === 'MALE' ? '👦 Male' : '👧 Female'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Date of Birth</Label>
              <Input type="date" className="input-base h-auto" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class</Label>
              <Select value={String(form.classId ?? '')} onValueChange={(v) => setForm((f) => ({ ...f, classId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="input-base h-auto">
                  <SelectValue placeholder="No class assigned" />
                </SelectTrigger>
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
        <div className="px-6 pb-6">
          {error && <ErrorBanner msg={error} />}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}
              className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={loading}
              className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white gap-2 disabled:opacity-60 hover:opacity-90"
              style={{ background: gradients.pinkHighlight }}>
              {loading && <Spinner />}
              {loading ? 'Adding…' : 'Add Student'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditModal({ student, classes, onClose, onSaved }: { student: Student; classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditForm>({
    fullname: student.fullname,
    sex: student.sex,
    dateOfBirth: student.dateOfBirth.slice(0, 10),
    classId: student.classId,
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
    <Modal title={`Edit ${student.fullname}`} subtitle="Update student info and class assignment." onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Full Name</Label>
              <Input className="input-base h-auto" value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} required />
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Sex</Label>
              <div className="flex gap-2">
                {(['MALE', 'FEMALE'] as const).map((s) => (
                  <Button key={s} type="button" variant="outline" size="sm"
                    onClick={() => setForm((f) => ({ ...f, sex: s }))}
                    className="flex-1 py-2 h-auto rounded-xl text-xs font-semibold border-2 transition-all"
                    style={form.sex === s
                      ? { background: s === 'MALE' ? '#EFF6FF' : '#FDF2F8', color: s === 'MALE' ? colors.primary : '#EC4899', borderColor: s === 'MALE' ? colors.primary : '#EC4899' }
                      : { borderColor: colors.border, color: colors.textSecondary, background: 'white' }}>
                    {s === 'MALE' ? '👦 Male' : '👧 Female'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Date of Birth</Label>
              <Input type="date" className="input-base h-auto" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class</Label>
              <Select value={String(form.classId ?? '')} onValueChange={(v) => setForm((f) => ({ ...f, classId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="input-base h-auto">
                  <SelectValue placeholder="No class assigned" />
                </SelectTrigger>
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
        <div className="px-6 pb-6">
          {error && <ErrorBanner msg={error} />}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}
              className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={loading}
              className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white gap-2 disabled:opacity-60 hover:opacity-90"
              style={{ background: gradients.primarySecondary }}>
              {loading && <Spinner />}
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Approve modal ─────────────────────────────────────────────────────────────
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
      await approveStudent(payload);
      onSaved(); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to approve.'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Approve Registration" subtitle={`Confirm student info for ${pending.upn}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
            <strong>Login:</strong> {pending.upn} · Registered {new Date(pending.createdAt).toLocaleDateString()}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Full Name *</Label>
              <Input className="input-base h-auto" value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} required placeholder="Student's full name" />
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Sex</Label>
              <div className="flex gap-2">
                {(['MALE', 'FEMALE'] as const).map((s) => (
                  <Button key={s} type="button" variant="outline" size="sm"
                    onClick={() => setForm((f) => ({ ...f, sex: s }))}
                    className="flex-1 py-2 h-auto rounded-xl text-xs font-semibold border-2 transition-all"
                    style={form.sex === s
                      ? { background: s === 'MALE' ? '#EFF6FF' : '#FDF2F8', color: s === 'MALE' ? colors.primary : '#EC4899', borderColor: s === 'MALE' ? colors.primary : '#EC4899' }
                      : { borderColor: colors.border, color: colors.textSecondary, background: 'white' }}>
                    {s === 'MALE' ? '👦' : '👧'} {s === 'MALE' ? 'Male' : 'Female'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Date of Birth *</Label>
              <Input type="date" className="input-base h-auto" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">Class</Label>
              <Select value={String(form.classId ?? '')} onValueChange={(v) => setForm((f) => ({ ...f, classId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="input-base h-auto">
                  <SelectValue placeholder="No class assigned" />
                </SelectTrigger>
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
        <div className="px-6 pb-6">
          {error && <ErrorBanner msg={error} />}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}
              className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={loading}
              className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white gap-2 disabled:opacity-60 hover:opacity-90"
              style={{ background: gradients.greenSecondary }}>
              {loading && <Spinner />}
              {loading ? 'Approving…' : 'Confirm Approval'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Reset password modal ──────────────────────────────────────────────────────
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
    <Modal title="Reset Password" subtitle={`Set a new password for ${request.student?.fullname ?? request.upn}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-blue-800">
            <strong>Account:</strong> {request.upn}
          </div>
          <div>
            <Label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wide">New Password</Label>
            <Input type="password" className="input-base h-auto" placeholder="Min 6 characters" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} autoFocus />
          </div>
        </div>
        <div className="px-6 pb-6">
          {error && <ErrorBanner msg={error} />}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}
              className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={loading}
              className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold text-white gap-2 disabled:opacity-60 hover:opacity-90"
              style={{ background: gradients.primarySecondary }}>
              {loading && <Spinner />}
              {loading ? 'Updating…' : 'Set Password'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type ModalState =
  | { kind: 'create' }
  | { kind: 'edit'; student: Student }
  | { kind: 'approve'; pending: PendingStudent }
  | { kind: 'reset'; request: PasswordResetRequest }
  | null;

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [pending, setPending] = useState<PendingStudent[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const load = () => getStudents().then(setStudents).catch(() => {});
  const loadPending = () => getPendingStudents().then(setPending).catch(() => {});
  const loadResets = () => getPasswordResetRequests().then(setResetRequests).catch(() => {});
  useEffect(() => { load(); getClasses().then(setClasses); loadPending(); loadResets(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const filtered = students.filter((s) => s.fullname.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in">
      {/* Modals */}
      {modal?.kind === 'create' && <CreateModal classes={classes} onClose={() => setModal(null)} onSaved={() => { load(); showToast('Student added!'); }} />}
      {modal?.kind === 'edit' && <EditModal student={modal.student} classes={classes} onClose={() => setModal(null)} onSaved={() => { load(); showToast('Changes saved!'); }} />}
      {modal?.kind === 'approve' && <ApproveModal pending={modal.pending} classes={classes} onClose={() => setModal(null)} onSaved={() => { load(); loadPending(); showToast('Student approved!'); }} />}
      {modal?.kind === 'reset' && <ResetModal request={modal.request} onClose={() => setModal(null)} onSaved={() => { loadResets(); showToast('Password updated!'); }} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-textPrimary text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl animate-slide-up flex items-center gap-2">
          <span className="text-brand-green">✓</span> {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input className="input-base pl-10 h-auto" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {students.length > 0 && (
          <span className="text-sm text-textSecondary font-medium">
            {filtered.length} of {students.length}
          </span>
        )}
        <Button onClick={() => setModal({ kind: 'create' })} className="btn-primary flex items-center gap-2 h-auto" style={{ background: gradients.pinkHighlight }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Student
        </Button>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-base">⏳</span>
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
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 h-auto rounded-xl text-white hover:opacity-90"
                  style={{ background: gradients.greenSecondary }}>
                  Review & Approve →
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
              <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-base">🔑</span>
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
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 h-auto rounded-xl text-white hover:opacity-90"
                  style={{ background: gradients.primarySecondary }}>
                  Set Password
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students table */}
      <div className="card overflow-hidden">
        {students.length === 0 ? (
          <div className="text-center py-20 text-textSecondary">
            <div className="text-4xl mb-3">👦</div>
            <div className="font-medium">No students yet</div>
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
                <th className="px-5 py-3.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-textSecondary text-sm">No students match your search.</td></tr>
              )}
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-background/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: s.sex === 'MALE' ? gradients.primarySecondary : gradients.pinkHighlight }}>
                        {s.fullname[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-textPrimary text-sm">{s.fullname}</div>
                        <div className="text-xs text-textSecondary">{s.sex === 'MALE' ? '👦 Male' : '👧 Female'}</div>
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
                      ? <div className="text-xs text-textSecondary leading-relaxed">
                          {s.parents.map((p) => (
                            <div key={p.id}>{p.type === 'FATHER' ? '👨' : '👩'} {p.name} · {p.phoneNumber}</div>
                          ))}
                        </div>
                      : <span className="text-textSecondary/40 text-sm">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => setModal({ kind: 'edit', student: s })}
                        className="text-xs font-semibold text-primary hover:text-primary/70 px-2 py-1 h-auto rounded-lg hover:bg-primary/8">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={async () => { if (confirm(`Delete ${s.fullname}?`)) { await deleteStudent(s.id); load(); } }}
                        className="text-xs font-semibold text-highlight hover:text-red-600 px-2 py-1 h-auto rounded-lg hover:bg-highlight/8">
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
