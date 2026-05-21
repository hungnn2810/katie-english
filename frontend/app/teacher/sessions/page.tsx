'use client';
import React, { useEffect, useState } from 'react';
import {
  getSessionResults, getSession, getStudents, getHomeworkList,
  GameSession, Student, HomeworkItem,
} from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronDown, AlignLeft, Mic } from 'lucide-react';

function ScoreBadge({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return <span className="text-textSecondary">—</span>;
  const pct = Math.round(score * 100);
  const cls = pct >= 80
    ? 'bg-green-100 text-green-700'
    : pct >= 50
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{pct}%</span>;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [studentFilter, setStudentFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, GameSession>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getStudents().then(setStudents).catch(() => {});
    getHomeworkList().then(setHomeworks).catch(() => {});
  }, []);

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSessionResults(
        assignmentFilter ? Number(assignmentFilter) : undefined,
        studentFilter ? Number(studentFilter) : undefined,
      );
      setSessions(data);
      setExpanded(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!details[id]) {
      try {
        const d = await getSession(id);
        setDetails(prev => ({ ...prev, [id]: d }));
      } catch {}
    }
  };

  const assignments = homeworks.flatMap(hw =>
    hw.assignments.map(a => ({
      id: a.id,
      label: `${hw.name ?? hw.type} — due ${new Date(a.endDate).toLocaleDateString()}`,
    }))
  );

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-semibold text-textSecondary mb-1">Student</label>
          <Select value={studentFilter} onValueChange={(v) => setStudentFilter(v ?? '')}>
            <SelectTrigger className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30">
              <SelectValue placeholder="All students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All students</SelectItem>
              {students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.fullname}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-textSecondary mb-1">Assignment</label>
          <Select value={assignmentFilter} onValueChange={(v) => setAssignmentFilter(v ?? '')}>
            <SelectTrigger className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30">
              <SelectValue placeholder="All assignments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All assignments</SelectItem>
              {assignments.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={search}
          disabled={loading}
          className="px-5 py-2 h-auto rounded-xl text-sm font-bold text-white disabled:opacity-60"
          style={{ background: '#F0623A' }}
        >
          {loading ? 'Loading…' : 'Search'}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
      )}

      {sessions.length === 0 && !loading && (
        <div className="text-center py-16 text-textSecondary text-sm">
          Apply filters and click Search to view sessions.
        </div>
      )}

      <div className="space-y-3">
        {sessions.map(s => {
          const isOpen = expanded === s.id;
          const detail = details[s.id];
          const hw = s.assignment?.homework;
          const isPhonics = hw?.type === 'PHONICS';

          return (
            <div key={s.id} className="bg-white rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => toggleExpand(s.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isPhonics ? '#4F9DFF22' : '#A78BFA22' }}
                >
                  {isPhonics
                    ? <AlignLeft className="w-5 h-5" style={{ color: '#4F9DFF' }} />
                    : <Mic className="w-5 h-5" style={{ color: '#A78BFA' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-textPrimary truncate">
                    {s.student?.fullname ?? `Student #${s.studentId}`}
                  </p>
                  <p className="text-xs text-textSecondary">
                    {hw?.name ?? hw?.type ?? 'Unknown'} · {new Date(s.startedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {s.completedAt
                    ? <ScoreBadge score={s.score} />
                    : <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">In progress</span>
                  }
                  <ChevronDown
                    className={`w-4 h-4 text-textSecondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border px-5 py-4 space-y-4">
                  {!detail && (
                    <div className="flex items-center gap-2 text-sm text-textSecondary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading details…
                    </div>
                  )}

                  {detail && (
                    <>
                      {detail.videoUrl && (
                        <div>
                          <p className="text-xs font-semibold text-textSecondary mb-2">Recording</p>
                          <video
                            src={detail.videoUrl}
                            controls
                            className="rounded-xl w-full max-w-lg"
                          />
                        </div>
                      )}

                      {isPhonics && detail.phonicsResults && detail.phonicsResults.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-textSecondary mb-2">Word Results</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-textSecondary border-b border-border">
                                  <th className="text-left pb-2 font-semibold pr-4">Word</th>
                                  <th className="text-left pb-2 font-semibold pr-4">Transcribed</th>
                                  <th className="text-left pb-2 font-semibold">Score</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {detail.phonicsResults.map(r => (
                                  <tr key={r.id}>
                                    <td className="py-2 pr-4 font-medium">{r.word?.text ?? `#${r.wordId}`}</td>
                                    <td className="py-2 pr-4 text-textSecondary">{r.transcribedText || '—'}</td>
                                    <td className="py-2"><ScoreBadge score={r.score} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {!isPhonics && detail.speakingResults && detail.speakingResults.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-textSecondary mb-2">Speaking Result</p>
                          {detail.speakingResults.map(r => (
                            <div key={r.id} className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                              <p>
                                <span className="text-textSecondary">Transcribed: </span>
                                {r.transcribedText || '—'}
                              </p>
                              <p>
                                <span className="text-textSecondary">Matched words: </span>
                                {r.matchedWords} / {r.totalWords}
                              </p>
                              <div className="pt-1"><ScoreBadge score={r.score} /></div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!detail.videoUrl && !detail.phonicsResults?.length && !detail.speakingResults?.length && (
                        <p className="text-sm text-textSecondary">No results recorded yet.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
