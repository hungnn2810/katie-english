'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getSession, GameSession, SpeakingResult, PhonicsItemResult,
  ReadingActivityResult, MatchingItemResult, FillInBlankItemResult, SentenceSegment,
} from '@/lib/admin-api';
import { getToken } from '@/lib/auth';
import { Check, X, ChevronDown, ChevronRight, Hash, Mic, BookOpen } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function scoreHex(score: number) {
  if (score >= 80) return '#22C55E';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function scoreBg(score: number) {
  if (score >= 80) return '#F0FDF4';
  if (score >= 50) return '#FFFBEB';
  return '#FEF2F2';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Great';
  if (score >= 50) return 'OK';
  return 'Needs work';
}

// ── MatchingResultRow ─────────────────────────────────────────────────────────

function MatchingResultRow({ r }: { r: MatchingItemResult }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {r.pair?.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.pair.imageUrl} alt={r.pair.word}
          className="w-9 h-9 rounded-lg object-cover border border-border shrink-0" />
      )}
      <div className="flex-1 text-sm text-textPrimary">
        <span className="text-textSecondary text-xs">chose </span>
        <span className="font-semibold">&quot;{r.studentChosenWord}&quot;</span>
      </div>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${r.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
        {r.isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      </span>
    </div>
  );
}

// ── FillInBlankResultRow ──────────────────────────────────────────────────────

function FillInBlankResultRow({ r }: { r: FillInBlankItemResult }) {
  const sentence = r.blank ? `Blank ${r.blank.blankIndex ?? '?'}` : '—';
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-textSecondary text-xs shrink-0">{sentence}</span>
        <span className={`font-semibold px-1.5 py-0.5 rounded-lg text-xs ${r.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {r.studentChosenWord}
        </span>
      </div>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${r.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
        {r.isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      </span>
    </div>
  );
}

// ── ActivityResultCard ────────────────────────────────────────────────────────

function ActivityResultCard({ activityResult }: { activityResult: ReadingActivityResult }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(activityResult.score);
  const isMatching = activityResult.activity?.type === 'MATCH';
  const label = isMatching ? 'Matching' : 'Fill in Blank';
  const color = scoreHex(pct);
  const bg = scoreBg(pct);

  const renderFillInBlankSegments = (segments: SentenceSegment[], results: FillInBlankItemResult[]) => {
    const fillByBlankIdx = new Map<number, FillInBlankItemResult>();
    for (const res of results) {
      if (res.blank?.blankIndex != null) fillByBlankIdx.set(res.blank.blankIndex, res);
    }
    return segments.map((seg, idx) => {
      if (!seg.blank) return <span key={idx}>{seg.text}</span>;
      const result = fillByBlankIdx.get(seg.blankIndex!);
      return (
        <span key={idx}
          className={`font-semibold px-1.5 py-0.5 rounded-lg mx-0.5 ${result?.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {result?.studentChosenWord ?? '___'}
        </span>
      );
    });
  };

  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
      <button type="button" onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-background/60 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
            <BookOpen className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="font-semibold text-sm text-textPrimary">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black text-base tabular-nums" style={{ color }}>{pct}%</span>
          {expanded ? <ChevronDown className="w-4 h-4 text-textSecondary" /> : <ChevronRight className="w-4 h-4 text-textSecondary" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-3">
          {isMatching ? (
            <div className="divide-y divide-border/50">
              {(activityResult.matchingResults ?? []).map((r) => (
                <MatchingResultRow key={r.id} r={r} />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {(() => {
                const segments = (activityResult.activity as { sentenceSegments?: SentenceSegment[] })?.sentenceSegments;
                const fillResults = activityResult.fillInBlankResults ?? [];
                if (segments && segments.length > 0) {
                  return (
                    <p className="text-sm text-textPrimary leading-relaxed py-1.5">
                      {renderFillInBlankSegments(segments, fillResults)}
                    </p>
                  );
                }
                return fillResults.map((r) => <FillInBlankResultRow key={r.id} r={r} />);
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
  const readingActivityResults: ReadingActivityResult[] = session.readingActivityResults ?? [];

  const score = session.score != null ? Math.round(session.score) : null;
  const scoreColor = score != null ? scoreHex(score) : '#6B7280';
  const scoreBgColor = score != null ? scoreBg(score) : '#F8FAFC';
  const studentName = session.student?.fullname ?? `Student #${session.studentId}`;
  const initials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="max-w-2xl animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link href="/teacher/homework" className="text-textSecondary hover:text-textPrimary transition-colors">Homework</Link>
        <span className="text-border">/</span>
        <Link href={`/teacher/homework/${hwId}`} className="text-textSecondary hover:text-textPrimary transition-colors">Detail</Link>
        <span className="text-border">/</span>
        <span className="text-textPrimary font-medium">{studentName}</span>
      </div>

      {/* Score hero */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-lg font-black text-white"
            style={{ background: 'linear-gradient(135deg, #4F9DFF, #A78BFA)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-textPrimary text-lg">{studentName}</div>
            <div className="text-textSecondary text-xs mt-0.5">
              Started {new Date(session.startedAt).toLocaleString()}
              {session.completedAt && (
                <> · Completed {new Date(session.completedAt).toLocaleString()}</>
              )}
            </div>
            {!session.completedAt && (
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                In progress
              </span>
            )}
          </div>
          {score != null && (
            <div className="shrink-0 text-right">
              <div className="text-4xl font-black tabular-nums leading-none" style={{ color: scoreColor }}>
                {score}%
              </div>
              <div className="text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full inline-block"
                style={{ background: scoreBgColor, color: scoreColor }}>
                {scoreLabel(score)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recording */}
      {session.videoUrl && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-slate-500" />
            </span>
            Recording
          </h2>
          {videoSrc
            ? <video src={videoSrc} controls playsInline className="w-full rounded-2xl border border-border bg-black shadow-sm" />
            : <div className="w-full h-28 rounded-2xl border border-border bg-background flex items-center justify-center text-textSecondary text-sm">Loading video...</div>
          }
        </div>
      )}

      {/* Phonics */}
      {phonicsResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#A78BFA18' }}>
              <Hash className="w-3.5 h-3.5" style={{ color: '#A78BFA' }} />
            </span>
            Phonics
            <span className="text-textSecondary font-normal">({phonicsResults.length})</span>
          </h2>
          <div className="space-y-2">
            {phonicsResults.map((r, i) => {
              const pct = r.score;
              const color = scoreHex(pct);
              const bg = scoreBg(pct);
              return (
                <div key={r.id} className="bg-white border border-border rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-textSecondary/50 text-xs shrink-0 w-5 text-right">{i + 1}.</span>
                      <span className="font-bold text-textPrimary shrink-0">{r.word?.text}</span>
                      {r.transcribedText ? (
                        <span className="text-textSecondary text-sm truncate">
                          &quot;{r.transcribedText}&quot;
                        </span>
                      ) : (
                        <span className="text-textSecondary/50 text-sm italic">no answer</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="font-bold text-sm tabular-nums w-10 text-right"
                        style={{ color, background: bg, padding: '2px 8px', borderRadius: 99 }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Speaking */}
      {speakingResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#FF9BD218' }}>
              <Mic className="w-3.5 h-3.5" style={{ color: '#FF9BD2' }} />
            </span>
            Speaking
            {session.assignment?.homework?.speakingMode && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: session.assignment.homework.speakingMode === 'FREE_SPEAK' ? '#FF9BD218' : '#A78BFA18',
                  color: session.assignment.homework.speakingMode === 'FREE_SPEAK' ? '#FF9BD2' : '#A78BFA',
                }}>
                {session.assignment.homework.speakingMode === 'FREE_SPEAK' ? 'Free Speak' : 'Script Match'}
              </span>
            )}
          </h2>
          <div className="space-y-3">
            {speakingResults.map((r) => {
              const pct = Math.round(r.score);
              const color = scoreHex(pct);
              const bg = scoreBg(pct);
              return (
                <div key={r.id} className="bg-white border border-border rounded-2xl px-5 py-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {r.transcribedText ? (
                        <p className="text-sm text-textPrimary">
                          Said: <span className="font-medium">&quot;{r.transcribedText}&quot;</span>
                        </p>
                      ) : (
                        <p className="text-sm text-textSecondary/60 italic">No answer recorded</p>
                      )}
                      <p className="text-xs mt-1 font-medium" style={{ color }}>
                        {r.matchedWords} of {r.totalWords} words matched
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-black tabular-nums" style={{ color }}>{pct}%</div>
                      <div className="text-[10px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full inline-block"
                        style={{ background: bg, color }}>
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

      {/* Reading */}
      {readingActivityResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#6ED6C118' }}>
              <BookOpen className="w-3.5 h-3.5" style={{ color: '#6ED6C1' }} />
            </span>
            Reading
            <span className="text-textSecondary font-normal">({readingActivityResults.length})</span>
          </h2>
          <div className="space-y-2">
            {readingActivityResults.map((ar) => (
              <ActivityResultCard key={ar.id} activityResult={ar} />
            ))}
          </div>
        </div>
      )}

      {phonicsResults.length === 0 && speakingResults.length === 0 && readingActivityResults.length === 0 && !session.videoUrl && (
        <div className="text-textSecondary text-sm py-10 text-center bg-white rounded-2xl border border-border">
          No results recorded yet.
        </div>
      )}
    </div>
  );
}
