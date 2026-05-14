'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getHomework, deleteAssignment, HomeworkDetail, HomeworkType } from '@/lib/admin-api';
import { gradients } from '@/lib/colors';

const TYPE_META: Record<HomeworkType, { label: string; emoji: string; color: string }> = {
  PHONICS:  { label: 'Phonics',  emoji: '🔤', color: '#A78BFA' },
  SPEAKING: { label: 'Speaking', emoji: '🎤', color: '#FF9BD2' },
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-brand-green';
  if (score >= 50) return 'text-accent';
  return 'text-highlight';
}

export default function TeacherHomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const hwId = Number(id);
  const router = useRouter();
  const [hw, setHw] = useState<HomeworkDetail | null>(null);

  const load = () => getHomework(hwId).then(setHw).catch(() => {});
  useEffect(() => { load(); }, [hwId]);

  if (!hw) return <div className="text-textSecondary py-16 text-center">Loading...</div>;

  const meta = TYPE_META[hw.type];
  const now = new Date();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/teacher/homework" className="text-sm text-textSecondary hover:text-textPrimary">← Homework</Link>
          <span className="text-border">/</span>
          <span className="text-sm text-textPrimary font-medium">Detail</span>
        </div>
        <button
          onClick={() => router.push(`/teacher/homework/${hwId}/try`)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: gradients.primaryPurple }}
        >
          <span>👁️</span> Try
        </button>
      </div>

      {/* Homework info */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-bold px-3 py-1 rounded-full"
            style={{ background: meta.color + '18', color: meta.color }}>
            {meta.emoji} {meta.label}
          </span>
          <span className="text-xs text-textSecondary">Created {new Date(hw.createdAt).toLocaleDateString()}</span>
        </div>
        {hw.type === 'PHONICS' && (
          <div className="space-y-2">
            {hw.name && <p className="text-sm font-bold" style={{ color: meta.color }}>{hw.name}</p>}
            {(hw.parts ?? []).map((part) => (
              <div key={part.id}>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white mr-2"
                  style={{ background: meta.color }}>{part.name}</span>
                <span className="text-xs text-textSecondary">
                  {part.words.map((w) => w.text).join(', ')}
                </span>
              </div>
            ))}
          </div>
        )}
        {hw.type === 'SPEAKING' && (
          <div className="space-y-2">
            {hw.speakingPictureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hw.speakingPictureUrl} alt="Speaking prompt"
                className="rounded-xl border border-border max-h-40 object-contain" />
            )}
            <p className="text-sm text-textPrimary italic">"{hw.speakingText}"</p>
          </div>
        )}
      </div>

      {/* Assignments */}
      <h2 className="text-base font-bold text-textPrimary mb-3">
        Assignments ({hw.assignments.length})
      </h2>

      {hw.assignments.length === 0 ? (
        <div className="text-textSecondary text-sm py-10 text-center bg-white rounded-2xl border border-border mb-6">
          No assignments yet. Click "Assign" on the homework list to assign this to a class.
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {hw.assignments.map((a) => {
            const isOpen = new Date(a.endDate) >= now;
            const classNames = a.classes.map((ac) => ac.class.name).join(', ');
            const sessions = a.sessions ?? [];
            const completed = sessions.filter((s) => s.completedAt);

            return (
              <div key={a.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-textSecondary'}`}>
                      {isOpen ? 'Open' : 'Closed'}
                    </span>
                    <span className="text-sm font-semibold text-textPrimary">{classNames}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-textSecondary">
                      Due {new Date(a.endDate).toLocaleDateString()}
                    </span>
                    <button
                      onClick={async () => {
                        if (confirm('Remove this assignment?')) { await deleteAssignment(a.id); load(); }
                      }}
                      className="text-xs font-semibold text-highlight hover:text-highlight/70 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>

                {sessions.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-textSecondary/60 italic">No submissions yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {sessions.map((s) => (
                      <Link key={s.id}
                        href={`/teacher/homework/${hwId}/session/${s.id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-background/60 transition-colors">
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

                {sessions.length > 0 && (
                  <div className="px-5 py-2 bg-background/50 border-t border-border text-xs text-textSecondary">
                    {completed.length} / {sessions.length} completed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
