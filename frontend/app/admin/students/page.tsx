'use client';
import { useEffect, useState } from 'react';
import {
  getAdminStudents, getStudentResults, deleteAdminSession,
  AdminStudentItem, AdminStudentResultItem,
} from '@/lib/admin-portal-api';
import { CheckCircle2 } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';

// â”€â”€â”€ ScoreBadge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ScoreBadge({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return <Typography component="span" sx={{ color: 'text.secondary' }}>â€”</Typography>;
  const pct = Math.round(score);
  const sx = pct >= 80
    ? { bgcolor: '#DCFCE7', color: '#15803D' }
    : pct >= 50
      ? { bgcolor: '#FEF9C3', color: '#92400E' }
      : { bgcolor: '#FEE2E2', color: '#991B1B' };
  return <Chip label={`${pct}%`} size="small" sx={{ ...sx, fontWeight: 700 }} />;
}

// â”€â”€â”€ StudentsTable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    return <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>;
  }

  if (!loading && students.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 1 }}>No students yet</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Students are added to classes by teachers.</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 0, overflow: 'hidden' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50', position: 'sticky', top: 0 }}>
            {['Student Name', 'Class', 'Teacher', 'Homeworks', 'Actions'].map((h) => (
              <TableCell key={h} sx={{ px: 2.5, py: 1.5, fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} aria-label="Loading...">
                  <TableCell colSpan={5} sx={{ px: 2.5, py: 1.5 }}>
                    <Box sx={{ height: 16, bgcolor: 'grey.100', borderRadius: 2, width: '100%', animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                  </TableCell>
                </TableRow>
              ))
            : students.map((s) => (
                <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                  <TableCell sx={{ px: 2.5, py: 1.5, fontWeight: 500, fontSize: 14 }}>{s.fullname}</TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5, fontSize: 14 }}>
                    {s.class ? s.class.name : 'â€”'}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5, fontSize: 14 }}>
                    {s.class?.teacher
                      ? (s.class.teacher.name ?? s.class.teacher.upn)
                      : 'â€”'}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5, fontSize: 14 }}>{s._count.sessions}</TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5 }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => onViewResults(s)}
                      sx={{ fontSize: 12, fontWeight: 600, borderRadius: 2, px: 1.5, py: 0.75, minWidth: 0 }}
                    >
                      View Results
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// â”€â”€â”€ StudentResults â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    <Box>
      {/* Delete session confirm dialog */}
      {confirmDelete !== null && (
        <Dialog open onClose={() => setConfirmDelete(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
          <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Delete session?</Typography>
          </DialogTitle>
          <DialogContent sx={{ px: 4, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Delete session? This will permanently remove the student&apos;s submission and score.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 4, pb: 3.5, gap: 1.5 }}>
            <Button variant="outlined" onClick={() => setConfirmDelete(null)} sx={{ flex: 1, borderRadius: 3, fontWeight: 600 }}>
              Keep session
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={deleting}
              onClick={handleConfirmDelete}
              startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ flex: 1, borderRadius: 3, fontWeight: 700 }}
            >
              {deleting ? 'Deleting...' : 'Delete session'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Toast */}
      {toast && (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1500, bgcolor: '#0F172A', color: 'white', fontSize: 14, fontWeight: 600, px: 2.5, py: 1.5, borderRadius: 4, boxShadow: 8, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle2 style={{ width: 16, height: 16, color: '#4ADE80' }} /> {toast}
        </Box>
      )}

      {/* Back link */}
      <Box
        component="button"
        onClick={onBack}
        sx={{ fontSize: 14, color: 'text.secondary', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.75, mb: 3, p: 0, '&:hover': { color: 'text.primary' } }}
      >
        â† Back to Students
      </Box>

      {/* Heading */}
      <Typography sx={{ fontWeight: 700, lineHeight: 1, mb: 3, fontSize: 26 }}>
        {student.fullname} â€” Homework Results
      </Typography>

      {/* Error */}
      {error && <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>{error}</Alert>}

      {/* Empty state */}
      {!loading && !error && results.length === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>No homework submissions yet.</Typography>
        </Box>
      )}

      {/* Results table */}
      {(loading || results.length > 0) && (
        <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 0, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {['Homework', 'Score', 'Started', 'Completed', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ px: 2.5, py: 1.5, fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} aria-label="Loading...">
                      <TableCell colSpan={5} sx={{ px: 2.5, py: 1.5 }}>
                        <Box sx={{ height: 16, bgcolor: 'grey.100', borderRadius: 2, width: '100%', animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                      </TableCell>
                    </TableRow>
                  ))
                : results.map((r) => (
                    <TableRow key={r.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                      <TableCell sx={{ px: 2.5, py: 1.5, fontSize: 14, fontWeight: 500 }}>
                        {r.assignment.homework.name ?? r.assignment.homework.type}
                      </TableCell>
                      <TableCell sx={{ px: 2.5, py: 1.5 }}>
                        <ScoreBadge score={r.score} />
                      </TableCell>
                      <TableCell sx={{ px: 2.5, py: 1.5, fontSize: 14 }}>
                        {new Date(r.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ px: 2.5, py: 1.5, fontSize: 14 }}>
                        {r.completedAt ? new Date(r.completedAt).toLocaleString() : 'â€”'}
                      </TableCell>
                      <TableCell sx={{ px: 2.5, py: 1.5 }}>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => setConfirmDelete(r)}
                          sx={{ fontSize: 12, fontWeight: 600, color: 'error.main', borderRadius: 2, px: 1.5, py: 0.75, minWidth: 0, '&:hover': { bgcolor: '#FEF2F2' } }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// â”€â”€â”€ StudentsPage (two-view) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    <Box>
      {/* Page heading */}
      <Typography sx={{ fontWeight: 700, lineHeight: 1, mb: 3, fontSize: 26 }}>
        Students
      </Typography>
      <StudentsTable onViewResults={setSelectedStudent} />
    </Box>
  );
}
