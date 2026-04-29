'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStudents, createStudent, deleteStudent, getClasses, Student, ClassItem, CreateStudentInput } from '@/lib/admin-api';

const emptyParent = { name: '', phoneNumber: '', type: 'FATHER' as const };
const emptyForm = (): CreateStudentInput => ({
  fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }],
});

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');

  const load = () => getStudents().then(setStudents).catch(() => {});
  useEffect(() => { load(); getClasses().then(setClasses); }, []);

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
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Students</h1>
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
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
  );
}
