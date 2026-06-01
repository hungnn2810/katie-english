'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getClasses, getStudents, getHomeworkList, getPendingStudents, getPasswordResetRequests, ClassItem, ScheduleSlot } from '@/lib/admin-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { ArrowRight, RefreshCw, School, Users, BookOpen, Video, ChevronRight, AlertTriangle } from 'lucide-react';

const ACCENT = '#F0623A';
const DAY_ORDER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatRelativeTime(date: Date): string {
  const now = new Date().getTime();
  const diffMs = date.getTime() - now;
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${Math.max(mins, 1)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function getNextOccurrence(slots: ScheduleSlot[]): Date | null {
  if (!slots.length) return null;
  const now = new Date();
  let nearest: Date | null = null;
  for (const slot of slots) {
    if (!slot.time) continue;
    const [h, m] = slot.time.split(':').map(Number);
    for (let i = 0; i < 8; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      d.setHours(h, m, 0, 0);
      if (DAY_ORDER[d.getDay()] === slot.day && d > now) {
        if (!nearest || d < nearest) nearest = d;
        break;
      }
    }
  }
  return nearest;
}

const STAT_CARDS = [
  { key: 'classes' as const, label: 'Total Classes', icon: School, color: ACCENT, bg: '#FFF2EF', href: '/teacher/classes' },
  { key: 'students' as const, label: 'Total Students', icon: Users, color: '#6ED6C1', bg: '#F0FDFB', href: '/teacher/students' },
  { key: 'homework' as const, label: 'Homework Sets', icon: BookOpen, color: '#A78BFA', bg: '#F5F3FF', href: '/teacher/homework' },
];

const QUICK_LINKS = [
  { href: '/teacher/classes', label: 'Manage Classes', desc: 'Create and schedule classes', icon: School, color: ACCENT },
  { href: '/teacher/students', label: 'Manage Students', desc: 'Add students and parent contacts', icon: Users, color: '#6ED6C1' },
  { href: '/teacher/homework', label: 'Assign Homework', desc: 'Create word-list homework', icon: BookOpen, color: '#A78BFA' },
  { href: '/teacher/sessions', label: 'View Sessions', desc: 'Review completed homework sessions', icon: Video, color: '#64748B' },
];

export default function TeacherDashboard() {
  const [stats, setStats] = useState({ classes: 0, students: 0, homework: 0 });
  const [upcomingClasses, setUpcomingClasses] = useState<(ClassItem & { nextAt: Date })[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [resetCount, setResetCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const [c, s, h, pending, resets] = await Promise.all([
        getClasses(), getStudents(), getHomeworkList(),
        getPendingStudents().catch(() => []),
        getPasswordResetRequests().catch(() => []),
      ]);
      setStats({ classes: c.length, students: s.length, homework: h.length });
      setPendingCount(pending.length);
      setResetCount(resets.length);
      const withNext = c
        .filter((cls) => cls.status !== 'ENDED')
        .flatMap((cls) => {
          const nextAt = getNextOccurrence(Array.isArray(cls.scheduleSlots) ? cls.scheduleSlots : []);
          return nextAt ? [{ ...cls, nextAt }] : [];
        })
        .sort((a, b) => a.nextAt.getTime() - b.nextAt.getTime());
      setUpcomingClasses(withNext);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const todayCount = upcomingClasses.filter((c) => c.nextAt.toDateString() === new Date().toDateString()).length;

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2.5, borderRadius: 3 }}
          action={
            <Button onClick={loadDashboard} size="small" variant="contained"
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, fontSize: 12, gap: 0.5 }}>
              <RefreshCw size={14} />
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Pending actions banner */}
      {(pendingCount > 0 || resetCount > 0) && (
        <Box sx={{ mb: 2.5, borderRadius: 3, border: '1px solid #FCD34D', bgcolor: '#FFFBEB', px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
            {pendingCount > 0 && (
              <Link href="/teacher/students" style={{ color: '#92400E', fontWeight: 600, fontSize: 14 }}>
                {pendingCount} pending registration approval{pendingCount !== 1 ? 's' : ''}
              </Link>
            )}
            {resetCount > 0 && (
              <Link href="/teacher/students" style={{ color: '#92400E', fontWeight: 600, fontSize: 14 }}>
                {resetCount} password reset request{resetCount !== 1 ? 's' : ''}
              </Link>
            )}
          </Box>
        </Box>
      )}

      {/* Stat cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2.5, mb: 3 }}>
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.key} href={card.href} style={{ textDecoration: 'none' }}>
              <Paper variant="outlined" sx={{ borderRadius: 4, p: 3, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: card.bg }}>
                    <Icon size={20} color={card.color} />
                  </Box>
                  <ArrowRight size={16} color="#94A3B8" />
                </Box>
                <Typography sx={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', mb: 0.5, color: loading ? 'text.disabled' : card.color }}>
                  {loading ? '—' : stats[card.key]}
                </Typography>
                <Typography sx={{ fontSize: 14, color: 'text.secondary', fontWeight: 500 }}>{card.label}</Typography>
              </Paper>
            </Link>
          );
        })}
      </Box>

      {/* Body: upcoming classes + quick links */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2.5 }}>
        {/* Upcoming classes */}
        <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14 }}>Upcoming Classes</Typography>
              {!loading && (
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{todayCount} class{todayCount !== 1 ? 'es' : ''} today</Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button size="small" onClick={loadDashboard} sx={{ minWidth: 28, width: 28, height: 28, p: 0, borderRadius: 2, color: 'text.secondary' }} title="Refresh">
                <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : undefined }} />
              </Button>
              <Link href="/teacher/classes" style={{ fontSize: 12, fontWeight: 600, color: ACCENT, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                View all <ChevronRight size={12} />
              </Link>
            </Box>
          </Box>

          <Box sx={{ px: 3, py: 1 }}>
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 1.5 }}>
                {[1, 2, 3].map((i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                    <CircularProgress size={20} sx={{ color: 'grey.200' }} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ height: 14, width: 128, bgcolor: 'grey.100', borderRadius: 1, mb: 0.75 }} />
                      <Box sx={{ height: 12, width: 80, bgcolor: 'grey.100', borderRadius: 1 }} />
                    </Box>
                    <Box sx={{ height: 12, width: 64, bgcolor: 'grey.100', borderRadius: 1 }} />
                  </Box>
                ))}
              </Box>
            ) : upcomingClasses.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Box sx={{ width: 48, height: 48, bgcolor: 'grey.100', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                  <School size={20} color="#94A3B8" />
                </Box>
                <Typography sx={{ fontSize: 14, color: 'text.secondary', fontWeight: 500 }}>No upcoming classes</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', opacity: 0.6, mt: 0.5 }}>Add schedule slots to your classes</Typography>
              </Box>
            ) : (
              <Box>
                {upcomingClasses.slice(0, 6).map((cls, i) => {
                  const isToday = cls.nextAt.toDateString() === new Date().toDateString();
                  return (
                    <Box key={cls.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.75, borderBottom: i < Math.min(upcomingClasses.length, 6) - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: isToday ? '#FFF2EF' : '#F8FAFC' }}>
                        <School size={16} color={isToday ? ACCENT : '#94A3B8'} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{cls.code}</Typography>
                      </Box>
                      <Box sx={{ fontSize: 12, fontWeight: 700, px: 1.25, py: 0.5, borderRadius: '99px', flexShrink: 0, bgcolor: isToday ? '#FFF2EF' : '#F1F5F9', color: isToday ? ACCENT : '#64748B' }}>
                        {formatRelativeTime(cls.nextAt)}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Paper>

        {/* Quick links */}
        <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14 }}>Quick Links</Typography>
          </Box>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.5, borderRadius: 3, '&:hover': { bgcolor: 'background.default' }, cursor: 'pointer' }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: `${link.color}18` }}>
                      <Icon size={16} color={link.color} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.label}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.desc}</Typography>
                    </Box>
                    <ChevronRight size={14} color="#CBD5E1" style={{ flexShrink: 0 }} />
                  </Box>
                </Link>
              );
            })}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
