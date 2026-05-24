'use client';
import { useEffect, useState } from 'react';
import {
  getAdminStudents, getStudentResults, deleteAdminSession,
  AdminStudentItem, AdminStudentResultItem,
} from '@/lib/admin-portal-api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CheckCircle2 } from 'lucide-react';

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

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
  const [confirmDelete, setConfirmDelete] = useState<AdminStudentResultItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteAdminSession(confirmDelete.id);
      setResults((prev) => prev.filter((r) => r.id !== confirmDelete.id));
      setConfirmDelete(null);
      showToast('Session deleted.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete session. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

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
      {/* Delete session confirm dialog */}
      {confirmDelete !== null && (
        <Dialog open onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
          <DialogContent className="max-w-md rounded-3xl p-0" showCloseButton={false}>
            <DialogHeader className="px-8 pt-7 pb-5 border-b border-border">
              <DialogTitle className="text-xl font-black text-textPrimary">Delete session?</DialogTitle>
            </DialogHeader>
            <div className="px-8 py-5">
              <p className="text-sm text-textSecondary">
                Delete session? This will permanently remove the student&apos;s submission and score.
              </p>
            </div>
            <DialogFooter className="px-8 pb-7 pt-2 gap-3 flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50"
              >
                Keep session
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold bg-destructive text-white hover:opacity-90 disabled:opacity-60 gap-2"
              >
                {deleting && <Spinner />}
                {deleting ? 'Deleting...' : 'Delete session'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-textPrimary text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl animate-slide-up flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" /> {toast}
        </div>
      )}

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
                <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} aria-label="Loading...">
                      <TableCell colSpan={5} className="px-5 py-3">
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
                      <TableCell className="px-5 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(r)}
                          className="text-xs font-semibold text-red-500 hover:bg-red-50 h-auto py-1.5 px-3 rounded-lg"
                        >
                          Delete
                        </Button>
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
