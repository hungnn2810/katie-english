'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStudents, getAvailableHomework, startSession, Student, HomeworkItem } from '@/lib/admin-api';

export default function HomeworkSelectPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getStudents().then(setStudents).catch(() => {}); }, []);

  async function handleStudentSelect(id: number) {
    const s = students.find((x) => x.id === id) ?? null;
    setSelectedStudent(s);
    setHomework([]);
    if (!id) return;
    setLoading(true);
    try {
      const hw = await getAvailableHomework(id);
      setHomework(hw);
    } catch {
      setError('Failed to load homework');
    } finally { setLoading(false); }
  }

  async function handleStartHomework(homeworkId: number) {
    if (!selectedStudent) return;
    setLoading(true); setError('');
    try {
      const session = await startSession(selectedStudent.id, homeworkId);
      router.push(`/game/session/${session.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setLoading(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-600">Homework</h1>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Home</Link>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-2">Who are you?</label>
        <select
          className="w-full border rounded-xl px-4 py-3 text-sm"
          onChange={(e) => handleStudentSelect(Number(e.target.value))}
          defaultValue=""
        >
          <option value="">Select your name...</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.fullname}</option>)}
        </select>
      </div>

      {loading && <p className="text-gray-400 text-sm text-center py-4">Loading...</p>}
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {selectedStudent && !loading && (
        <div>
          {homework.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No available homework right now.</p>
          ) : (
            <div className="space-y-3">
              {homework.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleStartHomework(h.id)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-400 hover:shadow transition"
                >
                  <div className="font-medium text-gray-800">
                    {h.words.map((w) => w.word.text).join(', ')}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {h.timeInSeconds}s per word · Due {new Date(h.closedDatetime).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
