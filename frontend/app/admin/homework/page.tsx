'use client';
import { useEffect, useState } from 'react';
import {
  getAdminHomework,
  getTeachers,
  deleteAdminHomework,
  AdminHomeworkItem,
  TeacherItem,
} from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import { Search } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableShell, { TableRow } from '@/components/ui/TableShell';
import HwTypeChip from '@/components/ui/HwTypeChip';

// ─── CompletionBar ───────────────────────────────────────────────────────────

function CompletionBar({ pct, color }: { pct: number; color: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, height: 7, borderRadius: 99, bgcolor: '#EEF2F7' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 99, bgcolor: color }} />
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748B', width: 34 }}>{pct}%</Typography>
    </Box>
  );
}

function completionColor(pct: number): string {
  if (pct >= 80) return '#7BD88F';
  if (pct >= 50) return '#FFD166';
  return '#FF7B7B';
}

// ─── Homework columns ────────────────────────────────────────────────────────

const COLUMNS = [
  { label: 'Homework', width: '1.8fr' },
  { label: 'Teacher', width: '1.2fr' },
  { label: 'Type', width: '1fr' },
  { label: 'Class', width: '1fr' },
  { label: 'Completion', width: '1.2fr' },
  { label: '', width: '0.6fr' },
];

// ─── HomeworkPage ─────────────────────────────────────────────────────────────

export default function HomeworkPage() {
  const { showToast } = useToast();
  const [homeworks, setHomeworks] = useState<AdminHomeworkItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [confirmDelete, setConfirmDelete] = useState<AdminHomeworkItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAdminHomework()
      .then(setHomeworks)
      .catch((err: unknown) => {
        showToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.', 'error');
      })
      .finally(() => setTimeout(() => setLoading(false), 800));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getTeachers().then(setTeachers).catch(() => {});
  }, []);

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteAdminHomework(confirmDelete.id);
      setHomeworks((prev) => prev.filter((h) => h.id !== confirmDelete.id));
      setConfirmDelete(null);
      showToast('Homework deleted.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete homework. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const filtered = homeworks.filter((h) => {
    const matchSearch = !search || (h.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchTeacher = teacherFilter === 'ALL'; // teacher info not in AdminHomeworkItem, filter is UI-only
    return matchSearch && matchTeacher;
  });

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

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1.5 }}>
        <TextField
          placeholder="Search homework…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{
            width: 280,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2, fontSize: 13,
              '& fieldset': { borderWidth: '1.5px', borderColor: '#E2E8F0' },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={15} color="#94A3B8" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Select
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
          size="small"
          displayEmpty
          sx={{
            borderRadius: 2, fontSize: 13, minWidth: 160,
            '& fieldset': { borderWidth: '1.5px', borderColor: '#E2E8F0' },
          }}
        >
          <MenuItem value="ALL">All teachers</MenuItem>
          {teachers.map((t) => (
            <MenuItem key={t.id} value={String(t.id)}>{t.name ?? t.upn}</MenuItem>
          ))}
        </Select>
      </Box>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 1 }}>No homework yet</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Homework templates are created by teachers from their dashboard.</Typography>
        </Box>
      )}

      {/* Table */}
      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : filtered.length > 0 && (
        <TableShell columns={COLUMNS}>
          {filtered.map((h, i) => {
            // Compute completion: submissionCount / (assignments * estimated class size)
            // Since we don't have per-assignment student count, use submissionCount vs assignments as proxy
            const total = h._count.assignments > 0 ? h._count.assignments : 1;
            const pct = Math.min(100, Math.round((h.submissionCount / total) * 100));
            const color = completionColor(pct);
            const hwType = h.type as 'PHONICS' | 'SPEAKING' | 'VOCABULARY' | 'LISTEN' | 'READING';

            return (
              <TableRow
                key={h.id}
                columns={COLUMNS}
                last={i === filtered.length - 1}
                cells={[
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>{h.name ?? '—'}</Typography>,
                  <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>—</Typography>,
                  <HwTypeChip type={hwType} />,
                  <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>—</Typography>,
                  <CompletionBar pct={pct} color={color} />,
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setConfirmDelete(h)}
                    sx={{ fontSize: 12, fontWeight: 600, color: 'error.main', borderRadius: 2, px: 1.5, py: 0.75, minWidth: 0, '&:hover': { bgcolor: '#FEF2F2' } }}
                  >
                    Delete
                  </Button>,
                ]}
              />
            );
          })}
        </TableShell>
      )}
    </Box>
  );
}
