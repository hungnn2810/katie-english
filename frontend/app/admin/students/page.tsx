'use client';
import { useEffect, useState } from 'react';
import {
  getAdminStudents, getStudentResults, deleteAdminSession,
  AdminStudentItem, AdminStudentResultItem,
} from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import { Search } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import TableShell, { TableRow } from '@/components/ui/TableShell';

// ─── ScoreBadge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return <Typography component="span" sx={{ color: 'text.secondary' }}>—</Typography>;
  const pct = Math.round(score);
  const sx = pct >= 80
    ? { bgcolor: '#DCFCE7', color: '#15803D' }
    : pct >= 50
      ? { bgcolor: '#FEF9C3', color: '#92400E' }
      : { bgcolor: '#FEE2E2', color: '#991B1B' };
  return <Chip label={`${pct}%`} size="small" sx={{ ...sx, fontWeight: 700 }} />;
}

// ─── StudentResults ──────────────────────────────────────────────────────────

function StudentResults({ student, onBack }: { student: AdminStudentItem; onBack: () => void }) {
  const { showToast } = useToast();
  const [results, setResults] = useState<AdminStudentResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<AdminStudentResultItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteAdminSession(confirmDelete.id);
      setResults((prev) => prev.filter((r) => r.id !== confirmDelete.id));
      setConfirmDelete(null);
      showToast('Session deleted.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete session. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    getStudentResults(student.id)
      .then(setResults)
      .catch((err: unknown) => {
        showToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.', 'error');
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  const RESULT_COLS = [
    { label: 'Homework', width: '2fr' },
    { label: 'Score', width: '0.8fr' },
    { label: 'Started', width: '1.4fr' },
    { label: 'Completed', width: '1.4fr' },
    { label: '', width: '0.8fr' },
  ];

  return (
    <Box>
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

      <Box
        component="button"
        onClick={onBack}
        sx={{ fontSize: 14, color: 'text.secondary', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.75, mb: 3, p: 0, '&:hover': { color: 'text.primary' } }}
      >
        ← Back to Students
      </Box>

      <Typography sx={{ fontWeight: 700, lineHeight: 1, mb: 3, fontSize: 26 }}>
        {student.fullname} — Homework Results
      </Typography>

      {!loading && results.length === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>No homework submissions yet.</Typography>
        </Box>
      )}

      {(loading || results.length > 0) && (
        <TableShell columns={RESULT_COLS}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} columns={RESULT_COLS} last={i === 2}
                  cells={RESULT_COLS.map((_, ci) => (
                    <Box key={ci} sx={{ height: 16, bgcolor: 'grey.100', borderRadius: 1, width: '80%', animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                  ))}
                />
              ))
            : results.map((r, i) => (
                <TableRow key={r.id} columns={RESULT_COLS} last={i === results.length - 1}
                  cells={[
                    <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{r.assignment.homework.name ?? r.assignment.homework.type}</Typography>,
                    <ScoreBadge score={r.score} />,
                    <Typography sx={{ fontSize: 14 }}>{new Date(r.startedAt).toLocaleString()}</Typography>,
                    <Typography sx={{ fontSize: 14 }}>{r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</Typography>,
                    <Button variant="text" size="small" onClick={() => setConfirmDelete(r)}
                      sx={{ fontSize: 12, fontWeight: 600, color: 'error.main', borderRadius: 2, px: 1.5, py: 0.75, minWidth: 0, '&:hover': { bgcolor: '#FEF2F2' } }}>
                      Delete
                    </Button>,
                  ]}
                />
              ))}
        </TableShell>
      )}
    </Box>
  );
}

// ─── Students list columns ───────────────────────────────────────────────────

const STUDENT_COLS = [
  { label: '', width: '0.3fr' },
  { label: 'Student', width: '1.8fr' },
  { label: 'Class', width: '1.2fr' },
  { label: 'Parent', width: '1.4fr' },
  { label: 'Status', width: '1fr' },
];

function StudentStatusChip({ student }: { student: AdminStudentItem }) {
  // Students with a class are considered enrolled (Approved); others are Pending
  if (student.class) {
    return <Chip label="Approved" size="small" sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontWeight: 700, fontSize: 12, borderRadius: 999 }} />;
  }
  return <Chip label="Pending" size="small" sx={{ bgcolor: '#FFFBEB', color: '#92400E', fontWeight: 700, fontSize: 12, borderRadius: 999 }} />;
}

// ─── Students Page ───────────────────────────────────────────────────────────

export default function StudentsPage() {
  const { showToast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentItem | null>(null);
  const [students, setStudents] = useState<AdminStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    getAdminStudents()
      .then(setStudents)
      .catch((err: unknown) => {
        showToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.', 'error');
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (selectedStudent) {
    return <StudentResults student={selectedStudent} onBack={() => setSelectedStudent(null)} />;
  }

  // Build unique class list for filter dropdown
  const classes = Array.from(
    new Map(
      students
        .filter((s) => s.class)
        .map((s) => [s.class!.id, s.class!.name])
    ).entries()
  );

  const filtered = students.filter((s) => {
    const matchSearch = !search || s.fullname.toLowerCase().includes(search.toLowerCase());
    const matchClass = classFilter === 'ALL' || (s.class && String(s.class.id) === classFilter);
    return matchSearch && matchClass;
  });

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField
            placeholder="Search students…"
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
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            size="small"
            displayEmpty
            sx={{ borderRadius: 2, fontSize: 13, minWidth: 160, '& fieldset': { borderWidth: '1.5px', borderColor: '#E2E8F0' } }}
          >
            <MenuItem value="ALL">All classes</MenuItem>
            {classes.map(([id, name]) => (
              <MenuItem key={id} value={String(id)}>{name}</MenuItem>
            ))}
          </Select>
        </Box>
        <Button
          variant="contained"
          disabled={selected.size === 0}
          sx={{ fontWeight: 600, borderRadius: 2, px: 2, py: 1.125, fontSize: 14 }}
        >
          + Bulk approve
        </Button>
      </Box>

      {!loading && filtered.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 1 }}>No students yet</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Students are added to classes by teachers.</Typography>
        </Box>
      ) : (
        <TableShell columns={STUDENT_COLS}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} columns={STUDENT_COLS} last={i === 4}
                  cells={STUDENT_COLS.map((_, ci) => (
                    <Box key={ci} sx={{ height: 16, bgcolor: 'grey.100', borderRadius: 1, width: '80%', animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                  ))}
                />
              ))
            : filtered.map((s, i) => (
                <TableRow
                  key={s.id}
                  columns={STUDENT_COLS}
                  last={i === filtered.length - 1}
                  cells={[
                    /* Checkbox */
                    <Box
                      onClick={() => toggleSelect(s.id)}
                      sx={{
                        width: 16, height: 16, borderRadius: '4px',
                        border: selected.has(s.id) ? '1.5px solid #4F9DFF' : '1.5px solid #CBD5E1',
                        bgcolor: selected.has(s.id) ? '#4F9DFF' : 'transparent',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    />,
                    /* Student name — clickable to view results */
                    <Button variant="text" size="small" onClick={() => setSelectedStudent(s)}
                      sx={{ fontSize: 14, fontWeight: 600, p: 0, minWidth: 0, color: 'text.primary', textAlign: 'left', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
                      {s.fullname}
                    </Button>,
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{s.class ? s.class.name : '—'}</Typography>,
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                      {s.class?.teacher ? (s.class.teacher.name ?? s.class.teacher.upn) : '—'}
                    </Typography>,
                    <StudentStatusChip student={s} />,
                  ]}
                />
              ))}
        </TableShell>
      )}
    </Box>
  );
}
