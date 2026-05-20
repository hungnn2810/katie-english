'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getClasses, getStudents, getHomeworkList, ClassItem, ScheduleSlot } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { ArrowRight, RefreshCw, School, Users, BookOpen, Video, ChevronRight } from 'lucide-react';

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

  useEffect(() => { loadDashboard(); }, []);

  const todayCount = upcomingClasses.filter((c) => c.nextAt.toDateString() === new Date().toDateString()).length;

  return (
    <div className="animate-fade-in">
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-red-600">{error}</div>
          <Button onClick={loadDashboard} size="sm" className="text-xs font-semibold text-white" style={{ background: ACCENT }}>
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.key}
              href={card.href}
              className="group bg-white rounded-2xl border border-border shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 p-6"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <ArrowRight className="w-4 h-4 text-textSecondary/25 group-hover:text-textSecondary/50 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-3xl font-black tracking-tight mb-1" style={{ color: loading ? undefined : card.color }}>
                {loading ? <div className="h-8 w-10 bg-slate-100 rounded-lg animate-pulse" /> : stats[card.key]}
              </div>
              <div className="text-sm text-textSecondary font-medium">{card.label}</div>
            </Link>
          );
        })}
      </div>

      {/* Body: upcoming classes + quick links */}
      <div className="grid grid-cols-3 gap-5">
        {/* Upcoming classes — 2 cols wide */}
        <div className="col-span-2 bg-white rounded-2xl border border-border shadow-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h3 className="font-bold text-textPrimary text-sm">Upcoming Classes</h3>
              {!loading && (
                <p className="text-xs text-textSecondary mt-0.5">{todayCount} class{todayCount !== 1 ? 'es' : ''} today</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={loadDashboard} className="w-7 h-7 rounded-lg flex items-center justify-center text-textSecondary hover:bg-background transition-colors" title="Refresh">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/teacher/classes" className="text-xs font-semibold hover:opacity-70 transition-opacity flex items-center gap-1" style={{ color: ACCENT }}>
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="px-6 py-2">
            {loading ? (
              <div className="space-y-3 py-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : upcomingClasses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <School className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm text-textSecondary font-medium">No upcoming classes</p>
                <p className="text-xs text-textSecondary/60 mt-1">Add schedule slots to your classes</p>
              </div>
            ) : (
              <div>
                {upcomingClasses.slice(0, 6).map((cls, i) => {
                  const isToday = cls.nextAt.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={cls.id}
                      className={`flex items-center gap-4 py-3.5 ${i < upcomingClasses.slice(0, 6).length - 1 ? 'border-b border-border/60' : ''}`}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: isToday ? '#FFF2EF' : '#F8FAFC' }}
                      >
                        <School className="w-4 h-4" style={{ color: isToday ? ACCENT : '#94A3B8' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-textPrimary truncate">{cls.name}</div>
                        <div className="text-xs text-textSecondary mt-0.5">{cls.code}</div>
                      </div>
                      <div
                        className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={isToday
                          ? { background: '#FFF2EF', color: ACCENT }
                          : { background: '#F1F5F9', color: '#64748B' }}
                      >
                        {formatRelativeTime(cls.nextAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick links — 1 col */}
        <div className="bg-white rounded-2xl border border-border shadow-card">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-bold text-textPrimary text-sm">Quick Links</h3>
          </div>
          <div className="px-4 py-3 space-y-1">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-background transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${link.color}18` }}>
                    <Icon className="w-4 h-4" style={{ color: link.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-textPrimary truncate">{link.label}</div>
                    <div className="text-xs text-textSecondary truncate">{link.desc}</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-textSecondary/30 group-hover:text-textSecondary/60 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
