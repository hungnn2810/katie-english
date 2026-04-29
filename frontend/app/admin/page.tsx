'use client';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';

const sections = [
  { href: '/admin/classes', label: 'Classes', desc: 'Manage class schedules and status' },
  { href: '/admin/students', label: 'Students', desc: 'Manage students and parent contacts' },
  { href: '/admin/homework', label: 'Homework', desc: 'Assign word lists to classes' },
];

export default function AdminPage() {
  return (
    <AuthGate requiredRole="TEACHER">
      {() => (
        <main className="max-w-2xl mx-auto p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Panel</h1>
          <p className="text-gray-500 mb-8">Manage classes, students, and homework.</p>
          <div className="grid gap-4">
            {sections.map((s) => (
              <Link key={s.href} href={s.href}
                className="block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow transition">
                <div className="font-semibold text-lg text-blue-600">{s.label}</div>
                <div className="text-gray-500 text-sm mt-1">{s.desc}</div>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back to app</Link>
          </div>
        </main>
      )}
    </AuthGate>
  );
}
