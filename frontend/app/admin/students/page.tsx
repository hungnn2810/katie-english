'use client';
import { useEffect, useState } from 'react';
import {
  getAdminStudents, getStudentResults,
  AdminStudentItem, AdminStudentResultItem,
} from '@/lib/admin-portal-api';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ─── ScoreBadge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return <span className="text-textSecondary">—</span>;
  const pct = Math.round(score);
  const cls = pct >= 80
    ? 'bg-green-100 text-green-700'
    : pct >= 50
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{pct}%</span>;
}

// ─── StudentsTable ────────────────────────────────────────────────────────────

function StudentsTable({ onViewResults }: { onViewResults: (s: AdminStudentItem) => void }) {
  const [students, setStudents] = useState<AdminStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getAdminStudents()
      .then(setStudents)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!loading && students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-bold text-textPrimary mb-2">No students yet</h3>
        <p className="text-sm text-textSecondary">Students are added to classes by teachers.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 sticky top-0">
            <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
              Student Name
            </TableHead>
            <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
              Class
            </TableHead>
            <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
              Teacher
            </TableHead>
            <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
              Homeworks
            </TableHead>
            <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} aria-label="Loading...">
                  <TableCell colSpan={5} className="px-5 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                  </TableCell>
                </TableRow>
              ))
            : students.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50">
                  <TableCell className="px-5 py-3 font-medium text-sm">{s.fullname}</TableCell>
                  <TableCell className="px-5 py-3 text-sm">
                    {s.class ? s.class.name : '—'}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-sm">
                    {s.class?.teacher
                      ? (s.class.teacher.name ?? s.class.teacher.upn)
                      : '—'}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-sm">{s._count.sessions}</TableCell>
                  <TableCell className="px-5 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewResults(s)}
                      className="h-auto py-1.5 px-3 text-xs font-semibold rounded-lg hover:bg-slate-100"
                    >
                      View Results
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── StudentResults ───────────────────────────────────────────────────────────

function StudentResults({
  student,
  onBack,
}: {
  student: AdminStudentItem;
  onBack: () => void;
}) {
  const [results, setResults] = useState<AdminStudentResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getStudentResults(student.id)
      .then(setResults)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [student.id]);

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-textSecondary hover:text-textPrimary flex items-center gap-1.5 mb-6"
      >
        ← Back to Students
      </button>

      {/* Heading */}
      <h1
        className="font-bold leading-none mb-6"
        style={{ fontSize: 26 }}
      >
        {student.fullname} — Homework Results
      </h1>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-textSecondary">No homework submissions yet.</p>
        </div>
      )}

      {/* Results table */}
      {(loading || results.length > 0) && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Homework
                </TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Score
                </TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Started
                </TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Completed
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} aria-label="Loading...">
                      <TableCell colSpan={4} className="px-5 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : results.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50">
                      <TableCell className="px-5 py-3 text-sm font-medium">
                        {r.assignment.homework.name ?? r.assignment.homework.type}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        <ScoreBadge score={r.score} />
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        {new Date(r.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        {r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── StudentsPage (two-view) ──────────────────────────────────────────────────

export default function StudentsPage() {
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentItem | null>(null);

  if (selectedStudent) {
    return (
      <StudentResults
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page heading */}
      <h1
        className="font-bold leading-none mb-6"
        style={{ fontSize: 26 }}
      >
        Students
      </h1>
      <StudentsTable onViewResults={setSelectedStudent} />
    </div>
  );
}
