'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getClasses, getStudents, getHomeworkList, getPendingStudents, getPasswordResetRequests, ClassItem, ScheduleSlot } from '@/lib/admin-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import { RefreshCw, School, Users, BookOpen, Video, ChevronRight, AlertTriangle } from 'lucide-react';
import { useToast } from '@/lib/toast-context';
import StatCard from '@/components/ui/StatCard';
import { colors } from '@/lib/colors';

const ACCENT = colors.teacherAccent;
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
  { key: 'classes' as const, label: 'Total Classes', icon: School, color: ACCENT, bgColor: '#FFF2EF', href: '/teacher/classes' },
  { key: 'students' as const, label: 'Total Students', icon: Users, color: '#6ED6C1', bgColor: '#F0FDFB', href: '/teacher/students' },
  { key: 'homework' as const, label: 'Homework Sets', icon: BookOpen, color: '#A78BFA', bgColor: '#F5F3FF', href: '/teacher/homework' },
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
  const { showToast } = useToast();

  async function loadDashboard() {
    setLoading(true);
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
      showToast(err instanceof Error ? err.message : 'Failed to load dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const todayCount = upcomingClasses.filter((c) => c.nextAt.toDateString() === new Date().toDateString()).length;

  return (
    <Box>
      {/* Pending actions banner */}
      {(pendingCount > 0 || resetCount > 0) && (
        <Box sx={{ mb: '20px', borderRadius: '12px', border: '1px solid #FCD34D', bgcolor: '#FFFBEB', px: '16px', py: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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

      {/* Stat cards — 3 columns, gap 18px */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '18px', mb: '22px' }}>
        {STAT_CARDS.map((card) => (
          <Link key={card.key} href={card.href} style={{ textDecoration: 'none' }}>
            <StatCard
              icon={card.icon}
              value={loading ? '—' : stats[card.key]}
              label={card.label}
              color={card.color}
              bgColor={card.bgColor}
            />
          </Link>
        ))}
      </Box>

      {/* Body: upcoming classes (2fr) + quick links (1fr) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
        {/* Upcoming classes */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: '22px', py: '16px', borderBottom: '1px solid #E2E8F0' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>Upcoming Classes</Typography>
              {!loading && (
                <Typography sx={{ fontSize: 12, color: '#64748B', mt: '2px' }}>{todayCount} class{todayCount !== 1 ? 'es' : ''} today</Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button size="small" onClick={loadDashboard} sx={{ minWidth: 28, width: 28, height: 28, p: 0, borderRadius: 2, color: '#64748B' }} title="Refresh">
                <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : undefined }} />
              </Button>
              <Link href="/teacher/classes" style={{ fontSize: 12, fontWeight: 600, color: ACCENT, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                View all <ChevronRight size={12} />
              </Link>
            </Box>
          </Box>

          <Box sx={{ px: '22px', py: '4px' }}>
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: '12px' }}>
                {[1, 2, 3].map((i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '12px', py: '8px' }}>
                    <CircularProgress size={20} sx={{ color: 'grey.200' }} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ height: 14, width: 128, bgcolor: 'grey.100', borderRadius: 1, mb: '6px' }} />
                      <Box sx={{ height: 12, width: 80, bgcolor: 'grey.100', borderRadius: 1 }} />
                    </Box>
                    <Box sx={{ height: 12, width: 64, bgcolor: 'grey.100', borderRadius: 1 }} />
                  </Box>
                ))}
              </Box>
            ) : upcomingClasses.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: '48px' }}>
                <Box sx={{ width: 48, height: 48, bgcolor: 'grey.100', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: '12px' }}>
                  <School size={20} color="#94A3B8" />
                </Box>
                <Typography sx={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>No upcoming classes</Typography>
                <Typography sx={{ fontSize: 12, color: '#94A3B8', mt: '4px' }}>Add schedule slots to your classes</Typography>
              </Box>
            ) : (
              <Box>
                {upcomingClasses.slice(0, 6).map((cls, i) => {
                  const isToday = cls.nextAt.toDateString() === new Date().toDateString();
                  return (
                    <Box key={cls.id} sx={{ display: 'flex', alignItems: 'center', gap: '16px', py: '14px', borderBottom: i < Math.min(upcomingClasses.length, 6) - 1 ? '1px solid #E2E8F0' : 'none' }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: isToday ? '#FFF2EF' : '#F8FAFC' }}>
                        <School size={16} color={isToday ? ACCENT : '#94A3B8'} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#64748B', mt: '2px' }}>{cls.code}</Typography>
                      </Box>
                      <Box sx={{ fontSize: 12, fontWeight: 700, px: '10px', py: '4px', borderRadius: '999px', flexShrink: 0, bgcolor: isToday ? '#FFF2EF' : '#F1F5F9', color: isToday ? ACCENT : '#64748B' }}>
                        {formatRelativeTime(cls.nextAt)}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Card>

        {/* Quick links */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: '22px', py: '16px', borderBottom: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>Quick Links</Typography>
          </Box>
          <Box sx={{ px: '14px', py: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', px: '12px', py: '12px', borderRadius: '12px', '&:hover': { bgcolor: '#F7F9FC' }, cursor: 'pointer' }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: `${link.color}18` }}>
                      <Icon size={16} color={link.color} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.label}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.desc}</Typography>
                    </Box>
                    <ChevronRight size={14} color="#CBD5E1" style={{ flexShrink: 0 }} />
                  </Box>
                </Link>
              );
            })}
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
