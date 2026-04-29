'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import { getHomework, HomeworkDetail } from '@/lib/admin-api';

export default function HomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const hwId = Number(id);
  const [hw, setHw] = useState<HomeworkDetail | null>(null);

  const load = () => getHomework(hwId).then(setHw).catch(() => {});
  useEffect(() => { load(); }, [hwId]);

  return (
    <AuthGate requiredRole="TEACHER">
      {() => {
        if (!hw) return <main className="p-8 text-gray-400">Loading...</main>;
        return (
          <main className="max-w-2xl mx-auto p-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Homework Detail</h1>
            <Link href="/admin/homework" className="text-sm text-gray-400 hover:text-gray-600">← Homework</Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 text-sm text-gray-600 space-y-1">
            <div>Assigned: {new Date(hw.dayAssigned).toLocaleDateString()}</div>
            <div>Closes: {new Date(hw.closedDatetime).toLocaleString()}</div>
            <div>Time per word: {hw.timeInSeconds}s</div>
            {hw.class && <div>Class: <span className="text-blue-600">{hw.class.name}</span></div>}
          </div>

          <h2 className="text-lg font-semibold text-gray-700 mb-3">Words ({hw.words.length})</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {hw.words.length === 0 && <p className="text-gray-400 text-sm">No words.</p>}
            {hw.words.map(({ orderIndex, word }) => (
              <span key={word.id} className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <span className="text-gray-400 text-xs mr-1">{orderIndex + 1}.</span>
                {word.text}
              </span>
            ))}
          </div>

          {hw.sessions && hw.sessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Sessions ({hw.sessions.length})</h2>
              <div className="space-y-2">
                {hw.sessions.map((s) => (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">Student #{s.studentId}</span>
                      {s.score != null && (
                        <span className={`font-bold ${s.score >= 80 ? 'text-green-600' : s.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {s.score}%
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 text-xs mt-0.5">
                      Started: {new Date(s.startedAt).toLocaleString()}
                      {s.completedAt && <> · Completed: {new Date(s.completedAt).toLocaleString()}</>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </main>
        );
      }}
    </AuthGate>
  );
}
