'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import { getClass, ClassDetail } from '@/lib/admin-api';

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const classId = Number(id);
  const [cls, setCls] = useState<ClassDetail | null>(null);

  const load = () => getClass(classId).then(setCls).catch(() => {});
  useEffect(() => { load(); }, [classId]);

  return (
    <AuthGate requiredRole="TEACHER">
      {() => {
        if (!cls) return <main className="p-8 text-gray-400">Loading...</main>;
        return (
          <main className="max-w-2xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{cls.name}</h1>
            <Link href="/admin/classes" className="text-sm text-gray-400 hover:text-gray-600">← Classes</Link>
          </div>
          <div className="text-sm text-gray-500 mb-6">
            Code: <span className="font-mono">{cls.code}</span> · Status: {cls.status}
            <br />
            {new Date(cls.startDate).toLocaleDateString()} – {new Date(cls.endDate).toLocaleDateString()}
          </div>

          {/* Students */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Students ({cls.students.length})</h2>
            <div className="space-y-2">
              {cls.students.length === 0 && <p className="text-gray-400 text-sm">No students enrolled.</p>}
              {cls.students.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2">
                  <div>
                    <span className="font-medium text-gray-800">{s.fullname}</span>
                    <span className="text-gray-400 text-sm ml-2">{s.sex === 'MALE' ? 'M' : 'F'} · {new Date(s.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Homework */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Homework ({cls.homeworks.length})</h2>
            <div className="space-y-2">
              {cls.homeworks.length === 0 && <p className="text-gray-400 text-sm">No homework assigned.</p>}
              {cls.homeworks.map((h) => (
                <div key={h.id} className="bg-white border border-gray-200 rounded-xl px-4 py-2">
                  <div className="font-medium text-gray-800">
                    {new Date(h.dayAssigned).toLocaleDateString()} · {h.timeInSeconds}s per word
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Words: {h.words.map((w) => w.word.text).join(', ')}
                  </div>
                  <div className="text-xs text-gray-300">Closes: {new Date(h.closedDatetime).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </section>
          </main>
        );
      }}
    </AuthGate>
  );
}
