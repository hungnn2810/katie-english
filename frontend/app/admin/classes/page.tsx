'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getClasses, createClass, deleteClass, ClassItem } from '@/lib/admin-api';

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');

  const load = () => getClasses().then(setClasses).catch(() => {});

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createClass({ name, description: desc || undefined });
      setName(''); setDesc('');
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this class?')) return;
    await deleteClass(id);
    load();
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Classes</h1>
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
      </div>

      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex gap-3 flex-wrap">
        <input
          className="border rounded-lg px-3 py-2 flex-1 min-w-32 text-sm"
          placeholder="Class name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="border rounded-lg px-3 py-2 flex-1 min-w-40 text-sm"
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Add Class
        </button>
        {error && <p className="w-full text-red-500 text-sm">{error}</p>}
      </form>

      <div className="space-y-2">
        {classes.length === 0 && <p className="text-gray-400 text-sm">No classes yet.</p>}
        {classes.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
            <div>
              <Link href={`/admin/classes/${c.id}`} className="font-medium text-blue-600 hover:underline">
                {c.name}
              </Link>
              {c.description && <div className="text-sm text-gray-400">{c.description}</div>}
              <div className="text-xs text-gray-300 mt-0.5">
                {c._count.students} students · {c._count.homeworks} homework
              </div>
            </div>
            <button
              onClick={() => handleDelete(c.id)}
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
