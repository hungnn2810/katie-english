'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getHomework, deleteAssignment, HomeworkDetail, HomeworkType } from '@/lib/admin-api';
import { gradients, colors } from '@/lib/colors';
import { Hash, Mic, BookOpen, Eye, Users, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, parseApiDateTime } from '@/lib/datetime';

const TYPE_META: Record<HomeworkType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  PHONICS:  { label: 'Phonics',  icon: Hash,     color: '#A78BFA', bg: '#A78BFA18' },
  SPEAKING: { label: 'Speaking', icon: Mic,      color: '#FF9BD2', bg: '#FF9BD218' },
  READING:  { label: 'Reading',  icon: BookOpen, color: '#6ED6C1', bg: '#6ED6C118' },
};

function scoreColor(score: number) {
  if (score >= 80) return '#22C55E';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function ProgressRing({ pct, size = 52, stroke = 5, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" />
    </svg>
  );
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

  const totalEnrolled = hw.assignments.reduce(
    (sum, a) => sum + a.classes.reduce((s, ac) => s + (ac.class._count?.students ?? 0), 0), 0,
  );
  const allSubmittedIds = new Set<number>();
  for (const a of hw.assignments) {
    for (const s of a.sessions ?? []) allSubmittedIds.add(s.studentId);
  }
  const submittedCount = allSubmittedIds.size;
  const activeAssignments = hw.assignments.filter((a) => {
    const endDate = parseApiDateTime(a.endDate);
    return endDate ? endDate >= now : false;
  });

  return (
    <div className="max-w-2xl animate-fade-in">
      {/* Breadcrumb + action */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/teacher/homework" className="text-textSecondary hover:text-textPrimary transition-colors">
            Homework
          </Link>
          <span className="text-border">/</span>
          <span className="text-textPrimary font-medium">{hw.name || meta.label}</span>
        </div>
        <Button
          onClick={() => router.push(`/teacher/homework/${hwId}/try`)}
          className="flex items-center gap-1.5 h-auto px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: gradients.primaryPurple }}>
          <Eye className="w-4 h-4" /> Try
        </Button>
      </div>

      {/* Homework info card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
            <meta.icon className="w-6 h-6" style={{ color: meta.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="text-xs font-bold px-2.5 py-1 rounded-full h-auto border-0"
                style={{ background: meta.bg, color: meta.color }}>
                {meta.label}
              </Badge>
              {hw.name && <span className="text-sm font-bold text-textPrimary">{hw.name}</span>}
            </div>
            <p className="text-xs text-textSecondary">Created {new Date(hw.createdAt).toLocaleDateString()}</p>
            {hw.type === 'PHONICS' && (hw.parts ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(hw.parts ?? []).map((part) => (
                  <Badge key={part.id} className="text-xs px-2 py-0.5 rounded-lg font-bold h-auto border-0"
                    style={{ background: meta.bg, color: meta.color }}>
                    {part.name} ({part.words.length})
                  </Badge>
                ))}
              </div>
            )}
            {hw.type === 'SPEAKING' && hw.speakingText && (
              <p className="text-sm text-textSecondary italic mt-1 line-clamp-2">"{hw.speakingText}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {hw.assignments.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {([
            { icon: BarChart3,    label: 'Assignments', value: hw.assignments.length, color: colors.primary },
            { icon: Clock,        label: 'Active',      value: activeAssignments.length, color: '#10B981' },
            { icon: Users,        label: 'Enrolled',    value: totalEnrolled, color: colors.purple },
            { icon: CheckCircle2, label: 'Submitted',   value: submittedCount, color: '#22C55E' },
          ] as const).map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-border shadow-sm p-3 text-center">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                style={{ background: color + '18' }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="text-xl font-black text-textPrimary">{value}</div>
              <div className="text-[10px] font-semibold text-textSecondary uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Assignments */}
      <h2 className="text-base font-bold text-textPrimary mb-3">
        Assignments{' '}
        <span className="text-textSecondary font-normal">({hw.assignments.length})</span>
      </h2>

      {hw.assignments.length === 0 ? (
        <div className="text-textSecondary text-sm py-12 text-center bg-white rounded-2xl border border-border">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          No assignments yet. Click &quot;Assign&quot; on the homework list to assign this to a class.
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {hw.assignments.map((a) => {
            const endDate = parseApiDateTime(a.endDate);
            const isOpen = endDate ? endDate >= now : false;
            const classNames = a.classes.map((ac) => ac.class.name).join(', ');
            const sessions = a.sessions ?? [];
            const aEnrolled = a.classes.reduce((sum, ac) => sum + (ac.class._count?.students ?? 0), 0);
            const submittedStudentIds = new Set(sessions.map((s) => s.studentId));
            const enrolledStudents = a.classes.flatMap((ac) => ac.class.students ?? []);
            const dedupedEnrolled = Array.from(new Map(enrolledStudents.map((s) => [s.id, s])).values());
            const notSubmitted = dedupedEnrolled.filter((s) => !submittedStudentIds.has(s.id));
            const aPct = aEnrolled > 0 ? Math.round((submittedStudentIds.size / aEnrolled) * 100) : 0;
            const ringColor = aPct >= 80 ? '#22C55E' : aPct >= 40 ? '#F59E0B' : '#EF4444';

            return (
              <div key={a.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Assignment header */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
                  <div className="relative shrink-0">
                    <ProgressRing pct={aPct} size={52} stroke={5} color={ringColor} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black" style={{ color: ringColor }}>{aPct}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${isOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-textSecondary'}`}>
                        {isOpen ? 'Open' : 'Closed'}
                      </span>
                      <span className="text-sm font-bold text-textPrimary truncate">{classNames}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-textSecondary">
                      <span>{submittedStudentIds.size} / {aEnrolled} submitted</span>
                      <span>·</span>
                      <span>Due {formatDate(a.endDate)}</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('Remove this assignment?')) { await deleteAssignment(a.id); load(); }
                    }}
                    className="text-xs font-semibold text-highlight hover:text-highlight/70 transition-colors shrink-0">
                    Remove
                  </button>
                </div>

                {/* Sessions list */}
                {sessions.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-textSecondary/60 italic">No submissions yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {sessions.map((s) => (
                      <Link key={s.id}
                        href={`/teacher/homework/${hwId}/session/${s.id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-background/60 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                            style={{ background: colors.primary }}>
                            {(s.student?.fullname ?? `S${s.studentId}`).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-textPrimary text-sm">
                              {s.student?.fullname ?? `Student #${s.studentId}`}
                            </div>
                            <div className="text-textSecondary text-xs">
                              {s.completedAt
                                ? `Completed ${new Date(s.completedAt).toLocaleString()}`
                                : `Started ${new Date(s.startedAt).toLocaleString()} · in progress`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.score != null ? (
                            <span className="font-black text-lg tabular-nums" style={{ color: scoreColor(s.score) }}>
                              {Math.round(s.score)}%
                            </span>
                          ) : (
                            <span className="text-textSecondary/50 text-sm">—</span>
                          )}
                          <span className="text-textSecondary/40 text-xs group-hover:text-textSecondary/70 transition-colors">›</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Not-submitted chips */}
                {notSubmitted.length > 0 && (
                  <div className="px-5 py-3 border-t border-border bg-background/40">
                    <p className="text-[10px] font-bold text-textSecondary uppercase tracking-wide mb-2">
                      Not submitted ({notSubmitted.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {notSubmitted.map((s) => (
                        <span key={s.id}
                          className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-textSecondary">
                          {s.fullname}
                        </span>
                      ))}
                    </div>
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
