'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getHomework, HomeworkDetail } from '@/lib/admin-api';

function scoreColor(score: number) {
  if (score >= 80) return 'text-brand-green';
  if (score >= 50) return 'text-accent';
  return 'text-highlight';
}

export default function TeacherHomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const hwId = Number(id);
  const [hw, setHw] = useState<HomeworkDetail | null>(null);

  useEffect(() => { getHomework(hwId).then(setHw).catch(() => {}); }, [hwId]);

  if (!hw) return <div className="text-textSecondary py-16 text-center">Loading...</div>;

  const sessions = hw.sessions ?? [];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/teacher/homework" className="text-sm text-textSecondary hover:text-textPrimary">← Homework</Link>
        <span className="text-border">/</span>
        <span className="text-sm text-textPrimary font-medium">Student Results</span>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6 text-sm text-textSecondary flex flex-wrap gap-x-5 gap-y-1">
        {hw.class && <span className="font-semibold text-primary">{hw.class.name}</span>}
        <span>Assigned: {new Date(hw.dayAssigned).toLocaleDateString()}</span>
        <span>Closes: {new Date(hw.closedDatetime).toLocaleString()}</span>
        <span>{hw.timeInSeconds}s / word</span>
        <span className="w-full text-xs text-textSecondary">
          Words: {hw.words.map((w) => w.word.text).join(', ')}
        </span>
      </div>

      <h2 className="text-base font-bold text-textPrimary mb-3">
        Submissions ({sessions.length})
      </h2>

      {sessions.length === 0 ? (
        <div className="text-textSecondary text-sm py-10 text-center bg-white rounded-2xl border border-border">
          No submissions yet.
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/teacher/homework/${hwId}/session/${s.id}`}
              className="flex items-center justify-between bg-white border border-border rounded-2xl px-5 py-3.5 hover:border-primary/40 hover:shadow-sm transition"
            >
              <div>
                <div className="font-semibold text-textPrimary text-sm">
                  {s.student?.fullname ?? `Student #${s.studentId}`}
                </div>
                <div className="text-textSecondary text-xs mt-0.5">
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
                  <span className="text-textSecondary/50 text-sm">—</span>
                )}
                <span className="text-textSecondary/50 text-xs">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
