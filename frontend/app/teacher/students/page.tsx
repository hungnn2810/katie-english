'use client';
import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import TeacherShell from '@/components/TeacherShell';
import { getStudents, createStudent, deleteStudent, getClasses, Student, ClassItem, CreateStudentInput } from '@/lib/admin-api';
import { AuthUser } from '@/lib/auth';

const emptyParent = { name: '', phoneNumber: '', type: 'FATHER' as const };
const emptyForm = (): CreateStudentInput => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }] });

function PageContent({ user }: { user: AuthUser }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = () => getStudents().then(setStudents).catch(() => {});
  useEffect(() => { load(); getClasses().then(setClasses); }, []);

  function setParent(i: number, k: string, v: string) {
    setForm((f) => { const p = [...f.parents]; p[i] = { ...p[i], [k]: v }; return { ...f, parents: p }; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await createStudent({ ...form, classId: form.classId || undefined });
      setForm(emptyForm()); setShowForm(false); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  }

  const filtered = students.filter((s) => s.fullname.toLowerCase().includes(search.toLowerCase()));

  return (
    <TeacherShell user={user} title="Students" subtitle={`${students.length} students enrolled`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md"
          style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">New Student</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Full Name</label>
                <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-pink-400 focus:outline-none" value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} required placeholder="Student's full name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Sex</label>
                <select className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-pink-400 focus:outline-none" value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as 'MALE' | 'FEMALE' }))}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Date of Birth</label>
                <input type="date" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-pink-400 focus:outline-none" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Class</label>
                <select className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-pink-400 focus:outline-none" value={form.classId ?? ''} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                  <option value="">No class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parents / Guardians</label>
                <button type="button" onClick={() => setForm((f) => ({ ...f, parents: [...f.parents, { ...emptyParent }] }))}
                  className="text-xs text-pink-500 font-semibold hover:underline">+ Add</button>
              </div>
              {form.parents.map((p, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                  <input className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm col-span-1" placeholder="Name" value={p.name} onChange={(e) => setParent(i, 'name', e.target.value)} required />
                  <input className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Phone" value={p.phoneNumber} onChange={(e) => setParent(i, 'phoneNumber', e.target.value)} required />
                  <select className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm" value={p.type} onChange={(e) => setParent(i, 'type', e.target.value)}>
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                  </select>
                  {form.parents.length > 1 && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, parents: f.parents.filter((_, x) => x !== i) }))}
                      className="text-red-400 text-sm hover:text-red-600">Remove</button>
                  )}
                </div>
              ))}
            </div>

            {error && <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</div>}
            <button type="submit" className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
              Add Student
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wide">Student</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wide">Sex</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wide">Date of Birth</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wide">Class</th>
              <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wide">Parents</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No students found.</td></tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: s.sex === 'MALE' ? 'linear-gradient(135deg, #4facfe, #00f2fe)' : 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
                      {s.fullname[0]}
                    </div>
                    <span className="font-semibold text-gray-800">{s.fullname}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.sex === 'MALE' ? '👦 Male' : '👧 Female'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(s.dateOfBirth).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  {s.class ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: '#ede9fe', color: '#7c3aed' }}>{s.class.name}</span>
                  ) : <span className="text-gray-300 text-sm">—</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    {s.parents.map((p) => (
                      <span key={p.id} className="text-xs text-gray-500">{p.type === 'FATHER' ? '👨' : '👩'} {p.name} · {p.phoneNumber}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button onClick={async () => { if (confirm('Delete student?')) { await deleteStudent(s.id); load(); } }}
                    className="text-xs text-red-400 hover:text-red-600 font-semibold">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TeacherShell>
  );
}

export default function StudentsPage() {
  return <AuthGate requiredRole="TEACHER">{(user) => <PageContent user={user} />}</AuthGate>;
}
