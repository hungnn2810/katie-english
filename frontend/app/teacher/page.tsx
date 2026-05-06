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
    { href: '/teacher/classes', label: 'Manage Classes', desc: 'Create and schedule classes', icon: '🏫', color: colors.primary },
    { href: '/teacher/students', label: 'Manage Students', desc: 'Add students and parent contacts', icon: '👦', color: colors.highlight },
    { href: '/teacher/homework', label: 'Assign Homework', desc: 'Create word-list homework for classes', icon: '📚', color: colors.secondary },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-6 mb-8">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}
            className="rounded-2xl p-6 text-white hover:scale-105 transition-transform shadow-lg"
            style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
            <div className="text-4xl mb-3">{c.icon}</div>
            <div className="text-4xl font-black mb-1">{c.value}</div>
            <div className="text-white text-opacity-80 font-medium">{c.label}</div>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 mb-8">
        {actions.map((a) => (
          <Link key={a.href} href={a.href}
            className="bg-white rounded-2xl p-6 border-2 border-transparent hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-2xl"
              style={{ background: `${a.color}22` }}>
              {a.icon}
            </div>
            <div className="font-bold text-textPrimary mb-1">{a.label}</div>
            <div className="text-textSecondary text-sm">{a.desc}</div>
          </Link>
        ))}
      </div>

      {upcomingClasses.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <h2 className="font-bold text-textPrimary mb-4">Upcoming Classes</h2>
          <div className="divide-y divide-border">
            {upcomingClasses.map((c) => {
              const isToday = c.nextAt.toDateString() === new Date().toDateString();
              const dayLabel = isToday ? 'Today' : DAY_LABELS[DAY_ORDER[c.nextAt.getDay()]];
              const timeLabel = c.nextAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: `${colors.primary}22` }}>🏫</div>
                    <div>
                      <div className="font-semibold text-sm text-textPrimary">{c.name}</div>
                      <div className="text-xs text-textSecondary font-mono">{c.code}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: isToday ? colors.primary : colors.textPrimary }}>{dayLabel}</div>
                    <div className="text-xs text-textSecondary">{timeLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
