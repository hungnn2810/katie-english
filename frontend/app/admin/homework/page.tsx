'use client';
import { useEffect, useState } from 'react';
import {
  getAdminHomework,
  deleteAdminHomework,
  AdminHomeworkItem,
} from '@/lib/admin-portal-api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2 } from 'lucide-react';

const TYPE_BADGE: Record<string, string> = {
  PHONICS: 'bg-slate-100 text-slate-700',
  SPEAKING: 'bg-slate-100 text-slate-700',
  READING: 'bg-slate-100 text-slate-700',
};

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function HomeworkPage() {
  const [homeworks, setHomeworks] = useState<AdminHomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AdminHomeworkItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    getAdminHomework()
      .then(setHomeworks)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteAdminHomework(confirmDelete.id);
      setHomeworks((prev) => prev.filter((h) => h.id !== confirmDelete.id));
      setConfirmDelete(null);
      showToast('Homework deleted.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete homework. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Delete confirm dialog */}
      {confirmDelete !== null && (
        <Dialog open onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
          <DialogContent className="max-w-md rounded-3xl p-0" showCloseButton={false}>
            <DialogHeader className="px-8 pt-7 pb-5 border-b border-border">
              <DialogTitle className="text-xl font-black text-textPrimary">Delete homework?</DialogTitle>
            </DialogHeader>
            <div className="px-8 py-5">
              <p className="text-sm text-textSecondary">
                Delete homework? This will permanently remove the homework template and every assignment, session, and result derived from it.
              </p>
            </div>
            <DialogFooter className="px-8 pb-7 pt-2 gap-3 flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-semibold text-textSecondary border-border hover:bg-gray-50"
              >
                Keep homework
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 h-auto rounded-xl text-sm font-bold bg-destructive text-white hover:opacity-90 disabled:opacity-60 gap-2"
              >
                {deleting && <Spinner />}
                {deleting ? 'Deleting...' : 'Delete homework'}
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

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && homeworks.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-bold text-textPrimary mb-2">No homework yet</h3>
          <p className="text-sm text-textSecondary">Homework templates are created by teachers from their dashboard.</p>
        </div>
      )}

      {/* Table */}
      {(loading || homeworks.length > 0) && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 sticky top-0">
                <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Name
                </TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Type
                </TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Assignments
                </TableHead>
                <TableHead className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Submissions
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
                : homeworks.map((h) => (
                    <TableRow key={h.id} className="hover:bg-slate-50">
                      <TableCell className="px-5 py-3 font-medium text-sm">
                        {h.name ?? '—'}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[h.type] ?? 'bg-slate-100 text-slate-700'}`}>
                          {h.type}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        {h._count.assignments}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm">
                        {h.submissionCount}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(h)}
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
