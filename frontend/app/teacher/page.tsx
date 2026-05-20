'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getClasses, getStudents, getHomeworkList, ClassItem, ScheduleSlot } from '@/lib/admin-api';
import { cardGradients, colors } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, RefreshCw } from 'lucide-react';

const DAY_ORDER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatRelativeTime(date: Date): string {
  const now = new Date().getTime();
  const diffMs = date.getTime() - now;
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${Math.max(mins, 1)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
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

export default function TeacherDashboard() {
  const [stats, setStats] = useState({ classes: 0, students: 0, homework: 0 });
  const [upcomingClasses, setUpcomingClasses] = useState<(ClassItem & { nextAt: Date })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const [c, s, h] = await Promise.all([getClasses(), getStudents(), getHomeworkList()]);
      setStats({ classes: c.length, students: s.length, homework: h.length });
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

  useEffect(() => {
    loadDashboard();
  }, []);

  const cards = [
    { label: 'Classes', value: stats.classes, icon: '🏫', href: '/teacher/classes', ...cardGradients[0] },
    { label: 'Students', value: stats.students, icon: '👦', href: '/teacher/students', ...cardGradients[1] },
    { label: 'Homework', value: stats.homework, icon: '📚', href: '/teacher/homework', ...cardGradients[2] },
  ];

  const actions = [
    { href: '/teacher/classes', label: 'Manage Classes', desc: 'Create and schedule classes', icon: '🏫', color: colors.primary, bg: '#EFF6FF' },
    { href: '/teacher/students', label: 'Manage Students', desc: 'Add students and parent contacts', icon: '👦', color: colors.highlight, bg: '#FFF1F1' },
    { href: '/teacher/homework', label: 'Assign Homework', desc: 'Create word-list homework for classes', icon: '📚', color: colors.secondary, bg: '#F0FDF9' },
  ];

  const nextClass = upcomingClasses[0];
  const todayCount = upcomingClasses.filter((c) => c.nextAt.toDateString() === new Date().toDateString()).length;

  return (
    <div className="animate-fade-in">
      <div className="mb-5 bg-white rounded-2xl border border-border shadow-card px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary mb-1">Overview</p>
          {loading ? (
            <div className="h-5 w-56 bg-slate-100 rounded animate-pulse" />
          ) : nextClass ? (
            <p className="text-sm font-semibold text-textPrimary">
              Next class: <span style={{ color: colors.primary }}>{nextClass.name}</span> {formatRelativeTime(nextClass.nextAt)}
            </p>
          ) : (
            <p className="text-sm font-semibold text-textPrimary">No scheduled class yet</p>
          )}
          {!loading && <p className="text-xs text-textSecondary mt-1">{todayCount} class{todayCount !== 1 ? 'es' : ''} scheduled today</p>}
        </div>
        <Button
          onClick={loadDashboard}
          size="sm"
          className="self-start sm:self-auto text-xs font-semibold text-white hover:opacity-90"
          style={{ background: colors.primary }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh data
        </Button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-highlight/25 bg-highlight/8 px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-highlight">{error}</div>
          <Button
            onClick={loadDashboard}
            size="sm"
            className="text-xs font-semibold text-white"
            style={{ background: colors.highlight }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-7">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group rounded-2xl p-6 text-white hover:scale-[1.02] hover:shadow-card-hover transition-all duration-200 shadow-card"
            style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
                {c.icon}
              </div>
              <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-3xl font-black mb-1 tracking-tight">{loading ? '—' : c.value}</div>
            <div className="text-white/75 text-sm font-medium">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-7">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="group">
            <Card className="p-5 border-border shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer gap-0">
              <CardContent className="p-0">
                <div
                  className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center text-xl transition-transform group-hover:scale-110 duration-200"
                  style={{ background: a.bg }}
                >
                  {a.icon}
                </div>
                <div className="font-semibold text-textPrimary text-[15px] mb-1">{a.label}</div>
                <div className="text-textSecondary text-sm leading-relaxed">{a.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

    </div>
  );
}
