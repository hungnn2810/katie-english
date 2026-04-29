'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHomeworkList, createHomework, deleteHomework, HomeworkItem } from '@/lib/admin-api';
import { fetchPhonemes } from '@/lib/admin-api';

export default function HomeworkPage() {
  const [list, setList] = useState<HomeworkItem[]>([]);
  const [phonemes, setPhonemes] = useState<{ id: number; symbol: string; type: string }[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState('');

  const load = () => getHomeworkList().then(setList).catch(() => {});

  useEffect(() => {
    load();
    fetchPhonemes().then(setPhonemes);
  }, []);

  function togglePhoneme(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (selectedIds.length === 0) { setError('Select at least one phoneme'); return; }
    try {
      await createHomework({ title, description: desc || undefined, phonemeIds: selectedIds });
      setTitle(''); setDesc(''); setSelectedIds([]);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create homework');
    }
  }

  const byType = phonemes.reduce<Record<string, typeof phonemes>>((acc, p) => {
    (acc[p.type] ??= []).push(p);
    return acc;
  }, {});

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Homework</h1>
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</Link>
      </div>

      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <input
            className="border rounded-lg px-3 py-2 flex-1 min-w-40 text-sm"
            placeholder="Homework title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="border rounded-lg px-3 py-2 flex-1 min-w-40 text-sm"
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">
            Select phonemes ({selectedIds.length} selected)
          </p>
          {Object.entries(byType).map(([type, ps]) => (
            <div key={type} className="mb-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{type}</p>
              <div className="flex flex-wrap gap-2">
                {ps.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePhoneme(p.id)}
                    className={`px-3 py-1 rounded-lg text-sm border font-mono transition ${
                      selectedIds.includes(p.id)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {p.symbol}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Create Homework
        </button>
      </form>

      <div className="space-y-2">
        {list.length === 0 && <p className="text-gray-400 text-sm">No homework yet.</p>}
        {list.map((h) => (
          <div key={h.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
            <div>
              <Link href={`/admin/homework/${h.id}`} className="font-medium text-blue-600 hover:underline">
                {h.title}
              </Link>
              {h.description && <div className="text-sm text-gray-400">{h.description}</div>}
              <div className="text-xs text-gray-300 mt-0.5">
                {h._count.phonemes} phonemes · {h._count.classes} classes
              </div>
            </div>
            <button
              onClick={async () => { if (confirm('Delete this homework?')) { await deleteHomework(h.id); load(); } }}
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
