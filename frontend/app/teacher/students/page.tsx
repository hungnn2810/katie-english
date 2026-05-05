'use client';
import React, { useEffect, useState } from 'react';
import { getStudents, createStudent, deleteStudent, updateStudent, getClasses, Student, ClassItem, CreateStudentInput, getPendingStudents, approveStudent, ApproveStudentInput, PendingStudent } from '@/lib/admin-api';
import { gradients, colors } from '@/lib/colors';

const emptyParent = { name: '', phoneNumber: '', type: 'FATHER' as const };
const emptyForm = (): CreateStudentInput => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }], upn: '', password: '' });
type ApproveInfoState = { fullname: string; sex: 'MALE' | 'FEMALE'; dateOfBirth: string; classId: number | undefined; parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[] };
const emptyApproveInfo = (): ApproveInfoState => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }] });

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [pending, setPending] = useState<PendingStudent[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pendingError, setPendingError] = useState('');
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [approveInfo, setApproveInfo] = useState(emptyApproveInfo());
  const [approveError, setApproveError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Omit<CreateStudentInput, 'upn' | 'password'>>({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }] });
  const [editError, setEditError] = useState('');

  const load = () => getStudents().then(setStudents).catch(() => {});
  const loadPending = () => getPendingStudents().then(setPending).catch((e: unknown) => setPendingError(e instanceof Error ? e.message : 'Failed'));
  useEffect(() => { load(); getClasses().then(setClasses); loadPending(); }, []);

  function setParent(i: number, k: string, v: string) {
    setForm((f) => { const p = [...f.parents]; p[i] = { ...p[i], [k]: v }; return { ...f, parents: p }; });
  }
  function setApproveParent(i: number, k: string, v: string) {
    setApproveInfo((f) => { const p = [...f.parents]; p[i] = { ...p[i], [k]: v }; return { ...f, parents: p }; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await createStudent({ ...form, classId: form.classId || undefined });
      setForm(emptyForm()); setShowForm(false); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  }

  function openEdit(s: Student) {
    setEditingId(s.id);
    setEditError('');
    setEditForm({
      fullname: s.fullname,
      sex: s.sex,
      dateOfBirth: s.dateOfBirth.slice(0, 10),
      classId: s.classId,
      parents: s.parents.length > 0 ? s.parents.map((p) => ({ name: p.name, phoneNumber: p.phoneNumber, type: p.type })) : [{ ...emptyParent }],
    });
  }

  async function handleEdit(id: number) {
    setEditError('');
    try {
      await updateStudent(id, editForm);
      setEditingId(null);
      load();
    } catch (err: unknown) { setEditError(err instanceof Error ? err.message : 'Failed'); }
  }

  async function handleApprove(userId: number) {
    setApproveError('');
    if (!approveInfo.fullname || !approveInfo.dateOfBirth) {
      setApproveError('Full name and date of birth are required');
      return;
    }
    try {
      const payload: ApproveStudentInput = {
        userId,
        fullname: approveInfo.fullname,
        sex: approveInfo.sex,
        dateOfBirth: approveInfo.dateOfBirth,
        classId: approveInfo.classId,
        parents: approveInfo.parents.filter((p) => p.name),
      };
      await approveStudent(payload);
      setApprovingId(null);
      setApproveInfo(emptyApproveInfo());
      loadPending(); load();
    } catch (err: unknown) { setApproveError(err instanceof Error ? err.message : 'Failed'); }
  }

  const filtered = students.filter((s) => s.fullname.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary text-sm">🔍</span>
          <input className="w-full border-2 border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:outline-none" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md"
          style={{ background: gradients.pinkHighlight }}>
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {/* Pending approvals */}
      {(pending.length > 0 || pendingError) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-amber-800">Pending Approvals ({pending.length})</h3>
            <button onClick={loadPending} className="text-xs text-amber-600 hover:text-amber-800">Refresh</button>
          </div>
          {pendingError && <p className="text-highlight text-sm mb-2">{pendingError}</p>}
          <div className="space-y-3">
            {pending.map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                  <div>
                    <div className="font-semibold text-textPrimary text-sm">{p.upn}</div>
                    <div className="text-xs text-textSecondary">Requested {new Date(p.createdAt).toLocaleString()}</div>
                  </div>
                  <button
                    onClick={() => {
                      setApprovingId(approvingId === p.id ? null : p.id);
                      if (p.registrationData) {
                        setApproveInfo({
                          fullname: p.registrationData.fullname,
                          sex: p.registrationData.sex,
                          dateOfBirth: p.registrationData.dateOfBirth.slice(0, 10),
                          classId: p.registrationData.classId ?? undefined,
                          parents: p.registrationData.parents.length > 0 ? p.registrationData.parents : [{ ...emptyParent, phoneNumber: p.upn }],
                        });
                      } else {
                        setApproveInfo({ ...emptyApproveInfo(), parents: [{ ...emptyParent, phoneNumber: p.upn }] });
                      }
                      setApproveError('');
                    }}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ background: approvingId === p.id ? colors.textSecondary : gradients.greenSecondary }}>
                    {approvingId === p.id ? 'Cancel' : 'Approve →'}
                  </button>
                </div>

                {approvingId === p.id && (
                  <div className="bg-white border border-amber-200 rounded-xl p-4 mt-1 space-y-3">
                    <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Fill in student info to approve</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-3">
                        <label className="block text-xs text-textSecondary mb-1">Full Name *</label>
                        <input className="w-full border-2 border-border rounded-xl px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                          value={approveInfo.fullname} onChange={(e) => setApproveInfo((f) => ({ ...f, fullname: e.target.value }))} placeholder="Student's full name" />
                      </div>
                      <div>
                        <label className="block text-xs text-textSecondary mb-1">Sex</label>
                        <select className="w-full border-2 border-border rounded-xl px-3 py-2 text-sm"
                          value={approveInfo.sex} onChange={(e) => setApproveInfo((f) => ({ ...f, sex: e.target.value as 'MALE' | 'FEMALE' }))}>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-textSecondary mb-1">Date of Birth *</label>
                        <input type="date" className="w-full border-2 border-border rounded-xl px-3 py-2 text-sm"
                          value={approveInfo.dateOfBirth} onChange={(e) => setApproveInfo((f) => ({ ...f, dateOfBirth: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs text-textSecondary mb-1">Class</label>
                        <select className="w-full border-2 border-border rounded-xl px-3 py-2 text-sm"
                          value={approveInfo.classId ?? ''} onChange={(e) => setApproveInfo((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                          <option value="">No class</option>
                          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-textSecondary block mb-2">Parent</label>
                      {approveInfo.parents.slice(0, 1).map((pp, i) => (
                        <div key={i} className="grid grid-cols-3 gap-2 mb-1">
                          <input className="border-2 border-border rounded-xl px-3 py-1.5 text-sm" placeholder="Name" value={pp.name} onChange={(e) => setApproveParent(i, 'name', e.target.value)} />
                          <input className="border-2 border-border rounded-xl px-3 py-1.5 text-sm" placeholder="Phone" value={pp.phoneNumber} onChange={(e) => setApproveParent(i, 'phoneNumber', e.target.value)} />
                          <select className="border-2 border-border rounded-xl px-3 py-1.5 text-sm" value={pp.type} onChange={(e) => setApproveParent(i, 'type', e.target.value)}>
                            <option value="FATHER">Father</option>
                            <option value="MOTHER">Mother</option>
                          </select>
                          {false && (
                            <button type="button" className="hidden">Remove</button>
                          )}
                        </div>
                      ))}
                    </div>
                    {approveError && <p className="text-highlight text-xs">{approveError}</p>}
                    <button onClick={() => handleApprove(p.id)}
                      className="px-5 py-2 rounded-xl text-white text-sm font-bold"
                      style={{ background: gradients.greenSecondary }}>
                      Confirm Approval
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add student form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-border">
          <h3 className="font-bold text-textPrimary mb-4">New Student</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Full Name</label>
                <input className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-brand-pink focus:outline-none" value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} required placeholder="Student's full name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Sex</label>
                <select className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm" value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as 'MALE' | 'FEMALE' }))}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Date of Birth</label>
                <input type="date" className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Class</label>
                <select className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm" value={form.classId ?? ''} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                  <option value="">No class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Login (Email or Phone) *</label>
                <input className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={form.upn} onChange={(e) => setForm((f) => ({ ...f, upn: e.target.value }))} required placeholder="email or phone" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">Initial Password *</label>
                <input type="password" className="w-full border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required placeholder="Set student password" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-textSecondary uppercase tracking-wide block mb-2">Parent / Guardian</label>
              {form.parents.slice(0, 1).map((p, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                  <input className="border-2 border-border rounded-xl px-3 py-2 text-sm" placeholder="Name" value={p.name} onChange={(e) => setParent(i, 'name', e.target.value)} required />
                  <input className="border-2 border-border rounded-xl px-3 py-2 text-sm" placeholder="Phone" value={p.phoneNumber} onChange={(e) => setParent(i, 'phoneNumber', e.target.value)} required />
                  <select className="border-2 border-border rounded-xl px-3 py-2 text-sm" value={p.type} onChange={(e) => setParent(i, 'type', e.target.value)}>
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                  </select>
                </div>
              ))}
            </div>

            {error && <div className="text-highlight text-sm bg-highlight/10 px-4 py-2 rounded-xl">{error}</div>}
            <button type="submit" className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: gradients.pinkHighlight }}>
              Add Student
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wide">Student</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wide">Sex</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wide">Date of Birth</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wide">Class</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-textSecondary uppercase tracking-wide">Parents</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-textSecondary">No students found.</td></tr>
            )}
            {filtered.map((s) => (
              <React.Fragment key={s.id}>
              <tr className="border-b border-border/50 hover:bg-background transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: s.sex === 'MALE' ? gradients.primarySecondary : gradients.pinkHighlight }}>
                      {s.fullname[0]}
                    </div>
                    <span className="font-semibold text-textPrimary">{s.fullname}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-textSecondary">{s.sex === 'MALE' ? '👦 Male' : '👧 Female'}</td>
                <td className="px-6 py-4 text-sm text-textSecondary">{new Date(s.dateOfBirth).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  {s.class ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: '#EDE9FE', color: colors.purple }}>{s.class.name}</span>
                  ) : <span className="text-textSecondary/50 text-sm">—</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    {s.parents.map((p) => (
                      <span key={p.id} className="text-xs text-textSecondary">{p.type === 'FATHER' ? '👨' : '👩'} {p.name} · {p.phoneNumber}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <button onClick={() => editingId === s.id ? setEditingId(null) : openEdit(s)}
                      className="text-xs font-semibold text-primary hover:text-[#3B8AEA]">
                      {editingId === s.id ? 'Cancel' : 'Edit'}
                    </button>
                    <button onClick={async () => { if (confirm('Delete student?')) { await deleteStudent(s.id); load(); } }}
                      className="text-xs text-highlight hover:text-red-600 font-semibold">Delete</button>
                  </div>
                </td>
              </tr>
              {editingId === s.id && (
                <tr className="bg-primary/5">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-primary uppercase tracking-wide">Edit Student</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3">
                          <label className="block text-xs text-textSecondary mb-1">Full Name *</label>
                          <input className="w-full border-2 border-border rounded-xl px-3 py-2 text-sm focus:border-primary focus:outline-none"
                            value={editForm.fullname} onChange={(e) => setEditForm((f) => ({ ...f, fullname: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs text-textSecondary mb-1">Sex</label>
                          <select className="w-full border-2 border-border rounded-xl px-3 py-2 text-sm"
                            value={editForm.sex} onChange={(e) => setEditForm((f) => ({ ...f, sex: e.target.value as 'MALE' | 'FEMALE' }))}>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-textSecondary mb-1">Date of Birth *</label>
                          <input type="date" className="w-full border-2 border-border rounded-xl px-3 py-2 text-sm"
                            value={editForm.dateOfBirth} onChange={(e) => setEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs text-textSecondary mb-1">Class</label>
                          <select className="w-full border-2 border-border rounded-xl px-3 py-2 text-sm"
                            value={editForm.classId ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                            <option value="">No class</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-textSecondary block mb-2">Parent</label>
                        {editForm.parents.slice(0, 1).map((p, i) => (
                          <div key={i} className="grid grid-cols-3 gap-2 mb-1">
                            <input className="border-2 border-border rounded-xl px-3 py-1.5 text-sm" placeholder="Name" value={p.name}
                              onChange={(e) => setEditForm((f) => { const ps = [...f.parents]; ps[i] = { ...ps[i], name: e.target.value }; return { ...f, parents: ps }; })} />
                            <input className="border-2 border-border rounded-xl px-3 py-1.5 text-sm" placeholder="Phone" value={p.phoneNumber}
                              onChange={(e) => setEditForm((f) => { const ps = [...f.parents]; ps[i] = { ...ps[i], phoneNumber: e.target.value }; return { ...f, parents: ps }; })} />
                            <select className="border-2 border-border rounded-xl px-3 py-1.5 text-sm" value={p.type}
                              onChange={(e) => setEditForm((f) => { const ps = [...f.parents]; ps[i] = { ...ps[i], type: e.target.value as 'FATHER' | 'MOTHER' }; return { ...f, parents: ps }; })}>
                              <option value="FATHER">Father</option>
                              <option value="MOTHER">Mother</option>
                            </select>
                          </div>
                        ))}
                      </div>
                      {editError && <p className="text-highlight text-xs">{editError}</p>}
                      <button onClick={() => handleEdit(s.id)}
                        className="px-5 py-2 rounded-xl text-white text-sm font-bold"
                        style={{ background: gradients.primarySecondary }}>
                        Save Changes
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
