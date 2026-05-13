'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, GameSession, SpeakingResult, PhonicsItemResult } from '@/lib/admin-api';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function scoreColor(score: number) {
  if (score >= 80) return 'text-brand-green';
  if (score >= 50) return 'text-accent';
  return 'text-highlight';
}

function scoreHex(score: number) {
  if (score >= 80) return '#22C55E';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
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

  const speakingResults: SpeakingResult[] = session.speakingResults ?? [];
  const phonicsResults: PhonicsItemResult[] = session.phonicsResults ?? [];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/teacher/homework" className="text-sm text-textSecondary hover:text-textPrimary">← Homework</Link>
        <span className="text-border">/</span>
        <Link href={`/teacher/homework/${hwId}`} className="text-sm text-textSecondary hover:text-textPrimary">Detail</Link>
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

      {phonicsResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-bold text-textPrimary mb-3">Phonics ({phonicsResults.length})</h2>
          <div className="space-y-2">
            {phonicsResults.map((r, i) => (
              <div key={r.id} className="bg-white border border-border rounded-2xl px-5 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-textSecondary/50 text-xs shrink-0">{i + 1}.</span>
                    <span className="font-bold text-textPrimary shrink-0">{r.word?.text}</span>
                    {r.transcribedText ? (
                      <span className="text-textSecondary text-sm truncate">"{r.transcribedText}"</span>
                    ) : (
                      <span className="text-textSecondary/50 text-sm italic">no answer</span>
                    )}
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${scoreColor(r.score)}`}>{r.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {speakingResults.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-bold text-textPrimary">Speaking</h2>
            {session.assignment?.homework?.speakingMode && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: session.assignment.homework.speakingMode === 'FREE_SPEAK' ? '#FF9BD218' : '#A78BFA18',
                  color: session.assignment.homework.speakingMode === 'FREE_SPEAK' ? '#FF9BD2' : '#A78BFA',
                }}>
                {session.assignment.homework.speakingMode === 'FREE_SPEAK' ? 'Free Speak' : 'Script Match'}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {speakingResults.map((r) => {
              const pct = Math.round(r.score);
              const color = scoreHex(pct);
              return (
                <div key={r.id} className="bg-white border border-border rounded-2xl px-5 py-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {r.transcribedText ? (
                        <p className="text-sm text-textPrimary">
                          Said: <span className="font-medium">"{r.transcribedText}"</span>
                        </p>
                      ) : (
                        <p className="text-sm text-textSecondary/60 italic">No answer recorded</p>
                      )}
                      <p className="text-xs mt-1" style={{ color }}>
                        {r.matchedWords} of {r.totalWords} words matched
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-black tabular-nums" style={{ color }}>{pct}%</div>
                      <div className="text-[10px] font-semibold mt-0.5" style={{ color }}>
                        {r.matchedWords}/{r.totalWords}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${r.totalWords > 0 ? (r.matchedWords / r.totalWords) * 100 : 0}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {phonicsResults.length === 0 && speakingResults.length === 0 && !session.videoUrl && (
        <p className="text-textSecondary text-sm">No results recorded yet.</p>
      )}
    </div>
  );
}
