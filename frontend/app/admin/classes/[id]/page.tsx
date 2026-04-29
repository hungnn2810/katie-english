'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getClass, getStudents, getHomeworkList,
  addStudentToClass, removeStudentFromClass,
  assignHomeworkToClass, removeHomeworkFromClass,
  ClassDetail, Student, HomeworkItem,
} from '@/lib/admin-api';

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const classId = Number(id);

  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allHomework, setAllHomework] = useState<HomeworkItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedHomework, setSelectedHomework] = useState('');
  const [dueDate, setDueDate] = useState('');

  const load = () => getClass(classId).then(setCls).catch(() => {});

  useEffect(() => {
    load();
    getStudents().then(setAllStudents);
    getHomeworkList().then(setAllHomework);
  }, [classId]);

  if (!cls) return <main className="p-8 text-gray-400">Loading...</main>;

  const enrolledIds = new Set(cls.students.map((s) => s.student.id));
  const assignedIds = new Set(cls.homeworks.map((h) => h.homework.id));
  const availableStudents = allStudents.filter((s) => !enrolledIds.has(s.id));
  const availableHomework = allHomework.filter((h) => !assignedIds.has(h.id));

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    await addStudentToClass(classId, Number(selectedStudent));
    setSelectedStudent('');
    load();
  }

  async function handleAddHomework(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHomework) return;
    await assignHomeworkToClass(classId, Number(selectedHomework), dueDate || undefined);
    setSelectedHomework(''); setDueDate('');
    load();
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">{cls.name}</h1>
        <Link href="/admin/classes" className="text-sm text-gray-400 hover:text-gray-600">← Classes</Link>
      </div>
      {cls.description && <p className="text-gray-400 text-sm mb-6">{cls.description}</p>}

      {/* Students */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Students ({cls.students.length})</h2>
        <div className="space-y-2 mb-3">
          {cls.students.length === 0 && <p className="text-gray-400 text-sm">No students enrolled.</p>}
          {cls.students.map(({ student, joinedAt }) => (
            <div key={student.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2">
              <div>
                <span className="font-medium text-gray-800">{student.name}</span>
                <span className="text-gray-400 text-sm ml-2">{student.email}</span>
              </div>
              <button
                onClick={async () => { await removeStudentFromClass(classId, student.id); load(); }}
                className="text-red-400 hover:text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {availableStudents.length > 0 && (
          <form onSubmit={handleAddStudent} className="flex gap-2">
            <select
              className="border rounded-lg px-3 py-2 text-sm flex-1"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">Select student...</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
              ))}
            </select>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Enroll
            </button>
          </form>
        )}
      </section>

      {/* Homework */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Homework ({cls.homeworks.length})</h2>
        <div className="space-y-2 mb-3">
          {cls.homeworks.length === 0 && <p className="text-gray-400 text-sm">No homework assigned.</p>}
          {cls.homeworks.map(({ homework, dueDate, assignedAt }) => (
            <div key={homework.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2">
              <div>
                <Link href={`/admin/homework/${homework.id}`} className="font-medium text-blue-600 hover:underline">
                  {homework.title}
                </Link>
                <div className="text-xs text-gray-400">
                  {homework.phonemes.length} phonemes
                  {dueDate && <> · Due {new Date(dueDate).toLocaleDateString()}</>}
                </div>
              </div>
              <button
                onClick={async () => { await removeHomeworkFromClass(classId, homework.id); load(); }}
                className="text-red-400 hover:text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {availableHomework.length > 0 && (
          <form onSubmit={handleAddHomework} className="flex gap-2 flex-wrap">
            <select
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-40"
              value={selectedHomework}
              onChange={(e) => setSelectedHomework(e.target.value)}
            >
              <option value="">Select homework...</option>
              {availableHomework.map((h) => (
                <option key={h.id} value={h.id}>{h.title}</option>
              ))}
            </select>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="Due date (optional)"
            />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Assign
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
