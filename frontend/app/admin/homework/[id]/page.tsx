'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getHomework, fetchPhonemes, updateHomework, HomeworkDetail } from '@/lib/admin-api';

export default function HomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const hwId = Number(id);

  const [hw, setHw] = useState<HomeworkDetail | null>(null);
  const [phonemes, setPhonemes] = useState<{ id: number; symbol: string; type: string }[]>([]);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const load = () => getHomework(hwId).then((data) => {
    setHw(data);
    setSelectedIds(data.phonemes.map((p) => p.phoneme.id));
  });

  useEffect(() => {
    load();
    fetchPhonemes().then(setPhonemes);
  }, [hwId]);

  function togglePhoneme(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    await updateHomework(hwId, { phonemeIds: selectedIds });
    setEditing(false);
    load();
  }

  if (!hw) return <main className="p-8 text-gray-400">Loading...</main>;

  const byType = phonemes.reduce<Record<string, typeof phonemes>>((acc, p) => {
    (acc[p.type] ??= []).push(p);
    return acc;
  }, {});

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">{hw.title}</h1>
        <Link href="/admin/homework" className="text-sm text-gray-400 hover:text-gray-600">← Homework</Link>
      </div>
      {hw.description && <p className="text-gray-400 text-sm mb-4">{hw.description}</p>}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-700">
          Phonemes ({hw.phonemes.length})
        </h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setSelectedIds(hw.phonemes.map((p) => p.phoneme.id)); }}
              className="text-gray-400 text-sm hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="flex flex-wrap gap-2 mb-6">
          {hw.phonemes.length === 0 && <p className="text-gray-400 text-sm">No phonemes.</p>}
          {hw.phonemes.map(({ orderIndex, phoneme }) => (
            <span
              key={phoneme.id}
              className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-sm font-mono text-blue-700"
            >
              <span className="text-gray-400 text-xs mr-1">{orderIndex + 1}.</span>
              {phoneme.symbol}
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-6 space-y-2">
          <p className="text-sm text-gray-500">{selectedIds.length} selected (order = selection order)</p>
          {Object.entries(byType).map(([type, ps]) => (
            <div key={type}>
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
      )}

      {hw.classes && hw.classes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Assigned to</h2>
          <div className="flex flex-wrap gap-2">
            {hw.classes.map(({ class: cls }) => (
              <Link
                key={cls.id}
                href={`/admin/classes/${cls.id}`}
                className="px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
              >
                {cls.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
