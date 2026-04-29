'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStudents, createStudent, deleteStudent, Student } from '@/lib/admin-api';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const load = () => getStudents().then(setStudents).catch(() => {});

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createStudent({ name, email });
      setName(''); setEmail('');
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create student');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this student?')) return;
    await deleteStudent(id);
    load();
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Students</h1>
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
      </div>

      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex gap-3 flex-wrap">
        <input
          className="border rounded-lg px-3 py-2 flex-1 min-w-32 text-sm"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="border rounded-lg px-3 py-2 flex-1 min-w-40 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Add Student
        </button>
        {error && <p className="w-full text-red-500 text-sm">{error}</p>}
      </form>

      <div className="space-y-2">
        {students.length === 0 && <p className="text-gray-400 text-sm">No students yet.</p>}
        {students.map((s) => (
          <div key={s.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
            <div>
              <div className="font-medium text-gray-800">{s.name}</div>
              <div className="text-sm text-gray-400">{s.email}</div>
            </div>
            <button
              onClick={() => handleDelete(s.id)}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
