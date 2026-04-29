'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import { getStudents, createStudent, deleteStudent, getClasses, Student, ClassItem, CreateStudentInput, getPendingStudents, approveStudent, PendingStudent } from '@/lib/admin-api';

const emptyParent = { name: '', phoneNumber: '', type: 'FATHER' as const };
const emptyForm = (): CreateStudentInput => ({
  fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }],
});

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingStudent[]>([]);
  const [pendingError, setPendingError] = useState('');
  const [pendingLoading, setPendingLoading] = useState(false);

  const load = () => getStudents().then(setStudents).catch(() => {});
  const loadPending = () => {
    setPendingLoading(true);
    setPendingError('');
    return getPendingStudents()
      .then(setPending)
      .catch((err: unknown) => setPendingError(err instanceof Error ? err.message : 'Failed to load pending students'))
      .finally(() => setPendingLoading(false));
  };
  useEffect(() => { load(); getClasses().then(setClasses); loadPending(); }, []);

  function setParent(i: number, k: string, v: string) {
    setForm((f) => { const p = [...f.parents]; p[i] = { ...p[i], [k]: v }; return { ...f, parents: p }; });
  }
  function addParent() { setForm((f) => ({ ...f, parents: [...f.parents, { ...emptyParent }] })); }
  function removeParent(i: number) { setForm((f) => ({ ...f, parents: f.parents.filter((_, x) => x !== i) })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await createStudent({ ...form, classId: form.classId || undefined });
      setForm(emptyForm()); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  }

  return (
    <AuthGate requiredRole="TEACHER">
      {() => (
        <main className="max-w-3xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Students</h1>
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Pending Approvals</h2>
              <button onClick={() => loadPending()} className="text-sm text-gray-400 hover:text-gray-600">
                Refresh
              </button>
            </div>
            {pendingLoading && <p className="text-gray-400 text-sm">Loading pending accounts...</p>}
            {pendingError && <p className="text-red-500 text-sm">{pendingError}</p>}
            {!pendingLoading && pending.length === 0 && !pendingError && (
              <p className="text-gray-400 text-sm">No pending students.</p>
            )}
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <div>
                  <div className="font-medium text-gray-800">{p.email}</div>
                  <div className="text-xs text-gray-400">Requested: {new Date(p.createdAt).toLocaleString()}</div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await approveStudent(p.id);
                      loadPending();
                    } catch (err: unknown) {
                      setPendingError(err instanceof Error ? err.message : 'Failed to approve');
                    }
                  }}
                  className="text-sm font-semibold text-green-600 hover:text-green-700"
                >
                  Approve
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2 text-sm col-span-2" placeholder="Full name" value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} required />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Sex</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as 'MALE' | 'FEMALE' }))}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Date of birth</label>
                <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs text-gray-400">Class (optional)</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={form.classId ?? ''} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                  <option value="">No class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Parents</p>
                <button type="button" onClick={addParent} className="text-xs text-blue-500 hover:underline">+ Add parent</button>
              </div>
              {form.parents.map((p, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                  <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Parent name" value={p.name} onChange={(e) => setParent(i, 'name', e.target.value)} required />
                  <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Phone number" value={p.phoneNumber} onChange={(e) => setParent(i, 'phoneNumber', e.target.value)} required />
                  <div className="flex gap-1">
                    <select className="border rounded-lg px-3 py-2 text-sm flex-1" value={p.type} onChange={(e) => setParent(i, 'type', e.target.value)}>
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                    </select>
                    {form.parents.length > 1 && (
                      <button type="button" onClick={() => removeParent(i)} className="text-red-400 px-2">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Add Student</button>
          </form>

          <div className="space-y-2">
            {students.length === 0 && <p className="text-gray-400 text-sm">No students yet.</p>}
            {students.map((s) => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-xl px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-800">{s.fullname}</span>
                    <span className="ml-2 text-xs text-gray-400">{s.sex === 'MALE' ? 'M' : 'F'} · {new Date(s.dateOfBirth).toLocaleDateString()}</span>
                    {s.class && <span className="ml-2 text-xs text-blue-500">{s.class.name}</span>}
                  </div>
                  <button onClick={async () => { if (confirm('Delete?')) { await deleteStudent(s.id); load(); } }} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
                </div>
                {s.parents.length > 0 && (
                  <div className="mt-1 flex gap-3">
                    {s.parents.map((p) => (
                      <span key={p.id} className="text-xs text-gray-400">{p.type === 'FATHER' ? 'Dad' : 'Mom'}: {p.name} {p.phoneNumber}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      )}
    </AuthGate>
  );
}
