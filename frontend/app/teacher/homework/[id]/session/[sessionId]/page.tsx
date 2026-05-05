'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, GameSession } from '@/lib/admin-api';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function scoreColor(score: number) {
  if (score >= 80) return 'text-brand-green';
  if (score >= 50) return 'text-accent';
  return 'text-highlight';
}

export default function TeacherSessionDetailPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const hwId = Number(id);
  const sId = Number(sessionId);
  const [session, setSession] = useState<GameSession | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => { getSession(sId).then(setSession).catch(() => {}); }, [sId]);

  useEffect(() => {
    if (!session?.videoUrl) return;
    const token = getToken();
    fetch(`${API_URL}/game/session/${sId}/recording`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((b) => setVideoSrc(URL.createObjectURL(b)))
      .catch(() => {});
    return () => { if (videoSrc) URL.revokeObjectURL(videoSrc); };
  }, [session?.videoUrl]);

  if (!session) return <div className="text-textSecondary py-16 text-center">Loading...</div>;

  const words = session.wordResults ?? [];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/teacher/homework" className="text-sm text-textSecondary hover:text-textPrimary">← Homework</Link>
        <span className="text-border">/</span>
        <Link href={`/teacher/homework/${hwId}`} className="text-sm text-textSecondary hover:text-textPrimary">Results</Link>
        <span className="text-border">/</span>
        <span className="text-sm text-textPrimary font-medium">
          {session.student?.fullname ?? `Student #${session.studentId}`}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-textPrimary">
              {session.student?.fullname ?? `Student #${session.studentId}`}
            </div>
            <div className="text-textSecondary text-xs mt-0.5">
              Started: {new Date(session.startedAt).toLocaleString()}
              {session.completedAt && <> · Completed: {new Date(session.completedAt).toLocaleString()}</>}
            </div>
          </div>
          {session.score != null && (
            <span className={`text-3xl font-black ${scoreColor(session.score)}`}>
              {Math.round(session.score)}%
            </span>
          )}
        </div>
      </div>

      {session.videoUrl && (
        <div className="mb-6">
          <h2 className="text-base font-bold text-textPrimary mb-3">Recording</h2>
          {videoSrc
            ? <video src={videoSrc} controls playsInline className="w-full rounded-2xl border border-border bg-black shadow-sm" />
            : <div className="w-full h-32 rounded-2xl border border-border bg-background flex items-center justify-center text-textSecondary text-sm">Loading video...</div>
          }
        </div>
      )}

      {words.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-textPrimary mb-3">Words ({words.length})</h2>
          <div className="space-y-2">
            {words.map((r, i) => (
              <div key={r.id} className="bg-white border border-border rounded-2xl px-5 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-textSecondary/50 text-xs shrink-0">{i + 1}.</span>
                    <span className="font-semibold text-textPrimary shrink-0">
                      {r.word?.text ?? `Word #${r.wordId}`}
                    </span>
                    {r.transcribedText ? (
                      <span className="text-textSecondary text-sm truncate">"{r.transcribedText}"</span>
                    ) : (
                      <span className="text-textSecondary/50 text-sm italic">no answer</span>
                    )}
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${scoreColor(r.score)}`}>
                    {r.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {words.length === 0 && !session.videoUrl && (
        <p className="text-textSecondary text-sm">No results recorded yet.</p>
      )}
    </div>
  );
}
