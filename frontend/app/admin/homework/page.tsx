'use client';
import { useEffect, useState } from 'react';
import {
  getAdminHomework,
  deleteAdminHomework,
  AdminHomeworkItem,
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
    <Box>
      {/* Delete confirm dialog */}
      {confirmDelete !== null && (
        <Dialog open onClose={() => setConfirmDelete(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
          <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Delete homework?</Typography>
          </DialogTitle>
          <DialogContent sx={{ px: 4, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Delete homework? This will permanently remove the homework template and every assignment, session, and result derived from it.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 4, pb: 3.5, gap: 1.5 }}>
            <Button variant="outlined" onClick={() => setConfirmDelete(null)} sx={{ flex: 1, borderRadius: 3, fontWeight: 600 }}>
              Keep homework
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={deleting}
              onClick={handleConfirmDelete}
              startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ flex: 1, borderRadius: 3, fontWeight: 700 }}
            >
              {deleting ? 'Deleting...' : 'Delete homework'}
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

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>{error}</Alert>}

      {/* Empty state */}
      {!loading && homeworks.length === 0 && !error && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 1 }}>No homework yet</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Homework templates are created by teachers from their dashboard.</Typography>
        </Box>
      )}

      {/* Table */}
      {(loading || homeworks.length > 0) && (
        <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 0, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50', position: 'sticky', top: 0 }}>
                {['Name', 'Type', 'Assignments', 'Submissions', 'Actions'].map((h) => (
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
                : homeworks.map((h) => (
                    <TableRow key={h.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                      <TableCell sx={{ px: 2.5, py: 1.5, fontSize: 14, fontWeight: 500 }}>
                        {h.name ?? 'â€”'}
                      </TableCell>
                      <TableCell sx={{ px: 2.5, py: 1.5 }}>
                        <Chip label={h.type} size="small" sx={{ bgcolor: 'grey.100', color: '#475569', fontWeight: 600, fontSize: 12 }} />
                      </TableCell>
                      <TableCell sx={{ px: 2.5, py: 1.5, fontSize: 14 }}>{h._count.assignments}</TableCell>
                      <TableCell sx={{ px: 2.5, py: 1.5, fontSize: 14 }}>{h.submissionCount}</TableCell>
                      <TableCell sx={{ px: 2.5, py: 1.5 }}>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => setConfirmDelete(h)}
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
