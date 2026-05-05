'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import { getSession, GameSession } from '@/lib/admin-api';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

export default function SessionDetailPage() {
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

  return (
    <AuthGate requiredRole="TEACHER">
      {() => {
        if (!session) return <main className="p-8 text-gray-400">Loading...</main>;
        const words = session.wordResults ?? [];

        return (
          <main className="max-w-2xl mx-auto p-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Session Result</h1>
              <Link href={`/admin/homework/${hwId}`} className="text-sm text-gray-400 hover:text-gray-600">
                ← Homework
              </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800 text-base">
                    {session.student?.fullname ?? `Student #${session.studentId}`}
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    Started: {new Date(session.startedAt).toLocaleString()}
                    {session.completedAt && (
                      <> · Completed: {new Date(session.completedAt).toLocaleString()}</>
                    )}
                  </div>
                </div>
                {session.score != null && (
                  <span className={`text-3xl font-bold ${scoreColor(session.score)}`}>
                    {Math.round(session.score)}%
                  </span>
                )}
              </div>
            </div>

            {session.videoUrl && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Recording</h2>
                {videoSrc
                  ? <video src={videoSrc} controls playsInline className="w-full rounded-xl border border-gray-200 bg-black" />
                  : <div className="w-full h-32 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Loading video...</div>
                }
              </div>
            )}

            {words.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">
                  Words ({words.length})
                </h2>
                <div className="space-y-2">
                  {words.map((r, i) => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="text-gray-400 text-xs shrink-0">{i + 1}.</span>
                          <span className="font-medium text-gray-800 shrink-0">
                            {r.word?.text ?? `Word #${r.wordId}`}
                          </span>
                          {r.transcribedText ? (
                            <span className="text-gray-400 text-sm truncate">
                              "{r.transcribedText}"
                            </span>
                          ) : (
                            <span className="text-gray-300 text-sm italic">no answer</span>
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
              <p className="text-gray-400 text-sm">No results recorded yet.</p>
            )}
          </main>
        );
      }}
    </AuthGate>
  );
}
