'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getHomework, deleteAssignment, HomeworkDetail, HomeworkType } from '@/lib/admin-api';
import { gradients, colors } from '@/lib/colors';
import { Hash, Mic, BookOpen, Eye, Users, CheckCircle2, Clock, BarChart3, Headphones } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { formatDate, parseApiDateTime } from '@/lib/datetime';

const TYPE_META: Record<HomeworkType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  PHONICS:    { label: 'Phonics',    icon: Hash,       color: '#A78BFA', bg: '#A78BFA18' },
  SPEAKING:   { label: 'Speaking',   icon: Mic,        color: '#FF9BD2', bg: '#FF9BD218' },
  READING:    { label: 'Reading',    icon: BookOpen,   color: '#6ED6C1', bg: '#6ED6C118' },
  VOCABULARY: { label: 'Vocabulary', icon: BookOpen,   color: '#FFB26B', bg: '#FFB26B18' },
  LISTEN:     { label: 'Listen',     icon: Headphones, color: '#60A5FA', bg: '#60A5FA18' },
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
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<number | null>(null);

  const load = () => getHomework(hwId).then(setHw).catch(() => {});
  useEffect(() => { load(); }, [hwId]);

  if (!hw) return (
    <Typography sx={{ color: 'text.secondary', py: 8, textAlign: 'center' }}>Loading...</Typography>
  );

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
    <Box sx={{ maxWidth: 672 }}>
      {/* Breadcrumb + action */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 14 }}>
          <Box component={Link} href="/teacher/homework" sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'text.primary' }, transition: 'color 0.15s' }}>
            Homework
          </Box>
          <Typography sx={{ color: 'divider' }}>/</Typography>
          <Typography sx={{ color: 'text.primary', fontWeight: 500, fontSize: 14 }}>{hw.name || meta.label}</Typography>
        </Box>
        <Button
          onClick={() => router.push(`/teacher/homework/${hwId}/try`)}
          variant="contained"
          startIcon={<Eye style={{ width: 16, height: 16 }} />}
          sx={{ px: 2, py: 1, borderRadius: 3, fontSize: 14, fontWeight: 600, color: 'white', background: gradients.primaryPurple, '&:hover': { background: gradients.primaryPurple, opacity: 0.9 } }}
        >
          Try
        </Button>
      </Box>

      {/* Homework info card */}
      <Box sx={{ bgcolor: 'white', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 1, p: 2.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: meta.bg }}>
            <meta.icon style={{ width: 24, height: 24, color: meta.color }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                label={meta.label}
                size="small"
                sx={{ fontSize: 12, fontWeight: 700, px: 0.5, bgcolor: meta.bg, color: meta.color, border: 'none', height: 'auto', py: 0.5 }}
              />
              {hw.name && <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{hw.name}</Typography>}
            </Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Created {new Date(hw.createdAt).toLocaleDateString()}</Typography>
            {hw.type === 'PHONICS' && (hw.parts ?? []).length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {(hw.parts ?? []).map((part) => (
                  <Chip key={part.id} label={`${part.name} (${part.words.length})`} size="small"
                    sx={{ fontSize: 12, fontWeight: 700, bgcolor: meta.bg, color: meta.color, border: 'none', height: 'auto', py: 0.5 }} />
                ))}
              </Box>
            )}
            {hw.type === 'SPEAKING' && hw.speakingText && (
              <Typography sx={{ fontSize: 14, color: 'text.secondary', fontStyle: 'italic', mt: 0.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                &quot;{hw.speakingText}&quot;
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Stats bar */}
      {hw.assignments.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 3 }}>
          {([
            { icon: BarChart3,    label: 'Assignments', value: hw.assignments.length, color: colors.primary },
            { icon: Clock,        label: 'Active',      value: activeAssignments.length, color: '#10B981' },
            { icon: Users,        label: 'Enrolled',    value: totalEnrolled, color: colors.purple },
            { icon: CheckCircle2, label: 'Submitted',   value: submittedCount, color: '#22C55E' },
          ] as const).map(({ icon: Icon, label, value, color }) => (
            <Box key={label} sx={{ bgcolor: 'white', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 1, p: 1.5, textAlign: 'center' }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 0.75, bgcolor: color + '18' }}>
                <Icon style={{ width: 16, height: 16, color }} />
              </Box>
              <Typography sx={{ fontSize: 22, fontWeight: 900, color: 'text.primary' }}>{value}</Typography>
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Assignments */}
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
        Assignments{' '}
        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>({hw.assignments.length})</Box>
      </Typography>

      {hw.assignments.length === 0 ? (
        <Box sx={{ color: 'text.secondary', fontSize: 14, py: 6, textAlign: 'center', bgcolor: 'white', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ width: 48, height: 48, bgcolor: 'grey.100', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
            <Users style={{ width: 24, height: 24, color: '#94A3B8' }} />
          </Box>
          No assignments yet. Click &quot;Assign&quot; on the homework list to assign this to a class.
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
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
              <Box key={a.id} sx={{ bgcolor: 'white', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 1, overflow: 'hidden' }}>
                {/* Assignment header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <ProgressRing pct={aPct} size={52} stroke={5} color={ringColor} />
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 900, color: ringColor }}>{aPct}%</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={isOpen ? 'Open' : 'Closed'}
                        size="small"
                        sx={{ fontSize: 12, fontWeight: 600, bgcolor: isOpen ? '#ECFDF5' : 'grey.100', color: isOpen ? '#059669' : 'text.secondary' }}
                      />
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{classNames}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 12, color: 'text.secondary' }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{submittedStudentIds.size} / {aEnrolled} submitted</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>·</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Due {formatDate(a.endDate)}</Typography>
                    </Box>
                  </Box>
                  {deletingAssignmentId === a.id ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Remove?</Typography>
                      <Button size="small" onClick={() => setDeletingAssignmentId(null)} sx={{ fontSize: 12, borderRadius: 2, color: 'text.secondary', minWidth: 0, px: 1 }}>Cancel</Button>
                      <Button size="small" variant="contained" onClick={async () => { try { await deleteAssignment(a.id); setDeletingAssignmentId(null); load(); } catch { setDeletingAssignmentId(null); } }} sx={{ fontSize: 12, borderRadius: 2, bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' }, minWidth: 0, px: 1 }}>Yes</Button>
                    </Box>
                  ) : (
                    <Box
                      component="button"
                      onClick={() => setDeletingAssignmentId(a.id)}
                      sx={{ fontSize: 12, fontWeight: 600, color: '#FF7B7B', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, '&:hover': { opacity: 0.7 } }}
                    >
                      Remove
                    </Box>
                  )}
                </Box>

                {/* Sessions list */}
                {sessions.length === 0 ? (
                  <Typography sx={{ px: 2.5, py: 2, fontSize: 14, color: 'rgba(100,116,139,0.6)', fontStyle: 'italic' }}>No submissions yet.</Typography>
                ) : (
                  <Box sx={{ '& > *:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                    {sessions.map((s) => (
                      <Box key={s.id}
                        component={Link}
                        href={`/teacher/homework/${hwId}/session/${s.id}`}
                        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, textDecoration: 'none', '&:hover': { bgcolor: 'rgba(247,249,252,0.6)' }, transition: 'background-color 0.15s' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'white', bgcolor: colors.primary }}>
                            {(s.student?.fullname ?? `S${s.studentId}`).charAt(0).toUpperCase()}
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: 14 }}>
                              {s.student?.fullname ?? `Student #${s.studentId}`}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                              {s.completedAt
                                ? `Completed ${new Date(s.completedAt).toLocaleString()}`
                                : `Started ${new Date(s.startedAt).toLocaleString()} · in progress`}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                          {s.score != null ? (
                            <Typography sx={{ fontWeight: 900, fontSize: 18, fontVariantNumeric: 'tabular-nums', color: scoreColor(s.score) }}>
                              {Math.round(s.score)}%
                            </Typography>
                          ) : (
                            <Typography sx={{ color: 'rgba(100,116,139,0.5)', fontSize: 14 }}>—</Typography>
                          )}
                          <Typography sx={{ color: 'rgba(100,116,139,0.4)', fontSize: 12 }}>›</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Not-submitted chips */}
                {notSubmitted.length > 0 && (
                  <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'rgba(247,249,252,0.4)' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
                      Not submitted ({notSubmitted.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {notSubmitted.map((s) => (
                        <Chip key={s.id} label={s.fullname} size="small"
                          sx={{ fontSize: 12, fontWeight: 500, bgcolor: 'grey.100', color: 'text.secondary' }} />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
