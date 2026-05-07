'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getClasses, getStudents, getHomeworkList, ClassItem, ScheduleSlot } from '@/lib/admin-api';
import { cardGradients, colors } from '@/lib/colors';

const DAY_ORDER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

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

  useEffect(() => {
    Promise.all([getClasses(), getStudents(), getHomeworkList()])
      .then(([c, s, h]) => {
        setStats({ classes: c.length, students: s.length, homework: h.length });
        const withNext = c
          .filter((cls) => cls.status !== 'ENDED')
          .flatMap((cls) => {
            const nextAt = getNextOccurrence(Array.isArray(cls.scheduleSlots) ? cls.scheduleSlots : []);
            return nextAt ? [{ ...cls, nextAt }] : [];
          })
          .sort((a, b) => a.nextAt.getTime() - b.nextAt.getTime());
        setUpcomingClasses(withNext);
      })
      .catch(() => {});
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

  return (
    <div className="animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-5 mb-7">
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
              <svg className="w-4 h-4 text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="text-3xl font-black mb-1 tracking-tight">{c.value}</div>
            <div className="text-white/75 text-sm font-medium">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-5 mb-7">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group bg-white rounded-2xl p-5 border border-border shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            <div
              className="w-11 h-11 rounded-xl mb-4 flex items-center justify-center text-xl transition-transform group-hover:scale-110 duration-200"
              style={{ background: a.bg }}
            >
              {a.icon}
            </div>
            <div className="font-semibold text-textPrimary text-[15px] mb-1">{a.label}</div>
            <div className="text-textSecondary text-sm leading-relaxed">{a.desc}</div>
          </Link>
        ))}
      </div>

      {/* Upcoming classes */}
      {upcomingClasses.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-textPrimary text-[15px]">Upcoming Classes</h2>
          </div>
          <div className="divide-y divide-border/60">
            {upcomingClasses.map((c) => {
              const isToday = c.nextAt.toDateString() === new Date().toDateString();
              const dayLabel = isToday ? 'Today' : DAY_LABELS[DAY_ORDER[c.nextAt.getDay()]];
              const timeLabel = c.nextAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={c.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-background/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: '#EFF6FF' }}>🏫</div>
                    <div>
                      <div className="font-semibold text-sm text-textPrimary">{c.name}</div>
                      <div className="text-xs text-textSecondary font-mono mt-0.5">{c.code}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: isToday ? colors.primary : colors.textPrimary }}>{dayLabel}</div>
                    <div className="text-xs text-textSecondary mt-0.5">{timeLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
