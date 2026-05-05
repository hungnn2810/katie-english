'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import { getHomework, HomeworkDetail } from '@/lib/admin-api';

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

export default function HomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const hwId = Number(id);
  const [hw, setHw] = useState<HomeworkDetail | null>(null);

  useEffect(() => { getHomework(hwId).then(setHw).catch(() => {}); }, [hwId]);

  return (
    <AuthGate requiredRole="TEACHER">
      {() => {
        if (!hw) return <main className="p-8 text-gray-400">Loading...</main>;
        const sessions = hw.sessions ?? [];

        return (
          <main className="max-w-2xl mx-auto p-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Student Results</h1>
              <Link href="/admin/homework" className="text-sm text-gray-400 hover:text-gray-600">← Homework</Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
              {hw.class && <span className="text-primary font-medium">{hw.class.name}</span>}
              <span>Assigned: {new Date(hw.dayAssigned).toLocaleDateString()}</span>
              <span>Closes: {new Date(hw.closedDatetime).toLocaleString()}</span>
              <span>{hw.timeInSeconds}s / word</span>
              <span className="w-full text-xs text-gray-400">
                Words: {hw.words.map((w) => w.word.text).join(', ')}
              </span>
            </div>

            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Submissions ({sessions.length})
            </h2>

            {sessions.length === 0 ? (
              <p className="text-gray-400 text-sm">No submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/homework/${hwId}/session/${s.id}`}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-primary/60 hover:shadow-sm transition"
                  >
                    <div>
                      <div className="font-medium text-gray-800 text-sm">
                        {s.student?.fullname ?? `Student #${s.studentId}`}
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {s.completedAt
                          ? `Completed ${new Date(s.completedAt).toLocaleString()}`
                          : `Started ${new Date(s.startedAt).toLocaleString()} · in progress`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {s.score != null ? (
                        <span className={`font-bold text-lg ${scoreColor(s.score)}`}>
                          {Math.round(s.score)}%
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                      <span className="text-gray-300 text-xs">›</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
        );
      }}
    </AuthGate>
  );
}
