'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getClasses, getStudents, getHomeworkList } from '@/lib/admin-api';
import { cardGradients, colors } from '@/lib/colors';

export default function TeacherDashboard() {
  const [stats, setStats] = useState({ classes: 0, students: 0, homework: 0 });

  useEffect(() => {
    Promise.all([getClasses(), getStudents(), getHomeworkList()])
      .then(([c, s, h]) => setStats({ classes: c.length, students: s.length, homework: h.length }))
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
      <div className="grid grid-cols-3 gap-6">
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
    </>
  );
}
