'use client';
import { useEffect, useState } from 'react';
import {
  getAdminClasses,
  getTeachers,
  updateAdminClass,
  deleteAdminClass,
  AdminClassItem,
  AdminUpdateClassInput,
  TeacherItem,
  ScheduleSlot,
  ClassStatus,
} from '@/lib/admin-portal-api';
import { CheckCircle2 } from 'lucide-react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };
const DEFAULT_DURATION = 1.5;

const STATUS_BADGE: Record<ClassStatus, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pending',     color: '#92400E', bg: '#FFFBEB' },
  INPROGRESS: { label: 'In Progress', color: '#15803D', bg: '#F0FDF4' },
  ENDED:      { label: 'Ended',       color: '#64748B', bg: 'grey.100' },
};

function EditClassModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: AdminClassItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AdminUpdateClassInput>({
    name: editing.name,
    code: editing.code,
    startDate: editing.startDate.slice(0, 10),
    endDate: editing.endDate.slice(0, 10),
    status: editing.status,
    scheduleSlots: Array.isArray(editing.scheduleSlots) ? editing.scheduleSlots : [],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function setField<K extends keyof AdminUpdateClassInput>(k: K, v: AdminUpdateClassInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleDay(day: string) {
    const slots = form.scheduleSlots ?? [];
    setField(
      'scheduleSlots',
      slots.find((s) => s.day === day)
        ? slots.filter((s) => s.day !== day)
        : [...slots, { day, time: '', duration: DEFAULT_DURATION }],
    );
  }

  function setSlotTime(day: string, time: string) {
    setField('scheduleSlots', (form.scheduleSlots ?? []).map((s) => (s.day === day ? { ...s, time } : s)));
  }

  function setSlotDuration(day: string, duration: number) {
    setField('scheduleSlots', (form.scheduleSlots ?? []).map((s) => (s.day === day ? { ...s, duration } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await updateAdminClass(editing.id, form);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const slots = form.scheduleSlots ?? [];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Edit Class</Typography>
            <Typography variant="caption" color="text.secondary">Update class details and schedule.</Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', mt: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ px: 4, py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Name + Code row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>Class Name</FormLabel>
                <TextField size="small" fullWidth required value={form.name ?? ''} onChange={(e) => setField('name', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              </Box>
              <Box>
                <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>Class Code</FormLabel>
                <TextField size="small" fullWidth required value={form.code ?? ''} onChange={(e) => setField('code', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              </Box>
              <Box>
                <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>Start Date</FormLabel>
                <DatePicker
                  value={form.startDate ? new Date(form.startDate) : null}
                  onChange={(v) => setField('startDate', v ? v.toISOString().split('T')[0] : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }}
                />
              </Box>
              <Box>
                <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>End Date</FormLabel>
                <DatePicker
                  value={form.endDate ? new Date(form.endDate) : null}
                  onChange={(v) => setField('endDate', v ? v.toISOString().split('T')[0] : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }}
                />
              </Box>
            </Box>

            {/* Status */}
            <Box>
              <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>Status</FormLabel>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {(['PENDING', 'INPROGRESS', 'ENDED'] as ClassStatus[]).map((s) => {
                  const badge = STATUS_BADGE[s];
                  const active = form.status === s;
                  return (
                    <Button key={s} type="button" variant="outlined" size="small"
                      onClick={() => setField('status', s)}
                      sx={{ fontSize: 12, fontWeight: 600, borderRadius: 3, px: 1.75, py: 1, borderWidth: 2,
                        ...(active
                          ? { color: badge.color, bgcolor: badge.bg, borderColor: badge.color, '&:hover': { bgcolor: badge.bg, borderColor: badge.color } }
                          : { color: 'text.secondary', bgcolor: 'white', borderColor: 'divider', '&:hover': { bgcolor: 'grey.50' } }) }}>
                      {badge.label}
                    </Button>
                  );
                })}
              </Box>
            </Box>

            {/* Schedule */}
            <Box>
              <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>Schedule</FormLabel>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                {DAYS.map((day) => {
                  const active = !!slots.find((s) => s.day === day);
                  return (
                    <Button key={day} type="button" variant="outlined" size="small"
                      onClick={() => toggleDay(day)}
                      sx={{ fontSize: 12, fontWeight: 700, borderRadius: 2, px: 1.5, py: 0.75, borderWidth: 2,
                        ...(active
                          ? { color: '#2563EB', bgcolor: '#EFF6FF', borderColor: '#60A5FA', '&:hover': { bgcolor: '#EFF6FF', borderColor: '#60A5FA' } }
                          : { color: 'text.secondary', bgcolor: 'white', borderColor: 'divider', '&:hover': { bgcolor: 'grey.50' } }) }}>
                      {DAY_LABELS[day]}
                    </Button>
                  );
                })}
              </Box>

              {slots.length > 0 && (
                <Box sx={{ borderRadius: 3, p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px', gap: 1, mb: 0.5 }}>
                    <Box />
                    <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', px: 0.5 }}>Start time</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', px: 0.5 }}>Duration</Typography>
                  </Box>
                  {DAYS.filter((d) => slots.find((s) => s.day === d)).map((day) => {
                    const slot = slots.find((s) => s.day === day)!;
                    return (
                      <Box key={day} sx={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>{DAY_LABELS[day]}</Typography>
                        <TextField type="time" required size="small" value={slot.time} onChange={(e) => setSlotTime(day, e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                        <Box sx={{ position: 'relative' }}>
                          <TextField
                            type="number" required size="small"
                            slotProps={{ htmlInput: { min: 0.5, max: 8, step: 0.5 } }}
                            value={slot.duration ?? DEFAULT_DURATION}
                            onChange={(e) => setSlotDuration(day, parseFloat(e.target.value) || DEFAULT_DURATION)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 }, '& input': { pr: 4 } }}
                          />
                          <Typography sx={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'text.secondary', fontWeight: 500, pointerEvents: 'none' }}>h</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 4, pb: 3.5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider', flexDirection: 'column', gap: 0 }}>
            {error && <Alert severity="error" sx={{ borderRadius: 2, mb: 1.5, width: '100%' }}>{error}</Alert>}
            <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
              <Button type="button" variant="outlined" onClick={onClose} sx={{ flex: 1, borderRadius: 3, fontWeight: 600 }}>Keep class</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
                sx={{ flex: 1, borderRadius: 3, fontWeight: 700, bgcolor: '#3B82F6', '&:hover': { bgcolor: '#2563EB' } }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </DialogActions>
        </Box>
      </Dialog>
    </LocalizationProvider>
  );
}

function DeleteConfirmDialog({
  cls,
  onClose,
  onDeleted,
}: {
  cls: AdminClassItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await deleteAdminClass(cls.id);
      onDeleted();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete class. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Delete class?</Typography>
      </DialogTitle>
      <DialogContent sx={{ px: 4, py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Delete class? All homework and sessions in this class will be permanently deleted.
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 4, pb: 3.5, gap: 1.5 }}>
        <Button variant="outlined" onClick={onClose} sx={{ flex: 1, borderRadius: 3, fontWeight: 600 }}>Keep class</Button>
        <Button
          variant="contained"
          color="error"
          disabled={deleting}
          onClick={handleDelete}
          startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ flex: 1, borderRadius: 3, fontWeight: 700 }}
        >
          {deleting ? 'Deleting...' : 'Delete class'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<AdminClassItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminClassItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminClassItem | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function loadClasses(filter: string) {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminClasses(filter === 'ALL' ? undefined : Number(filter));
      setClasses(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  }

  // Load teachers once on mount
  useEffect(() => {
    getTeachers()
      .then(setTeachers)
      .catch(() => {});
  }, []);

  // Reload classes whenever filter changes (including on mount)
  useEffect(() => {
    loadClasses(teacherFilter);
  }, [teacherFilter]);

  return (
    <Box>
      {editing && (
        <EditClassModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { loadClasses(teacherFilter); showToast('Class updated.'); }}
        />
      )}

      {confirmDelete && (
        <DeleteConfirmDialog
          cls={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onDeleted={() => { loadClasses(teacherFilter); showToast('Class deleted.'); }}
        />
      )}

      {toast && (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1500, bgcolor: '#0F172A', color: 'white', fontSize: 14, fontWeight: 600, px: 2.5, py: 1.5, borderRadius: 4, boxShadow: 8, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle2 style={{ width: 16, height: 16, color: '#4ADE80' }} /> {toast}
        </Box>
      )}

      {/* Filter row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          Filter by teacher
        </Typography>
        <FormControl size="small" sx={{ minWidth: 192 }}>
          <InputLabel>All teachers</InputLabel>
          <Select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            label="All teachers"
            sx={{ borderRadius: 3 }}
          >
            <MenuItem value="ALL">All teachers</MenuItem>
            {teachers.map((t) => (
              <MenuItem key={t.id} value={String(t.id)}>
                {t.name ?? t.upn}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>{error}</Alert>}

      {/* Table */}
      {!loading && classes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          {teacherFilter === 'ALL' ? (
            <>
              <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: 18, mb: 1 }}>No classes yet</Typography>
              <Typography sx={{ fontSize: 14 }}>Classes are created by teachers from their dashboard.</Typography>
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: 18, mb: 1 }}>No classes for this teacher</Typography>
              <Typography sx={{ fontSize: 14 }}>This teacher has not created any classes yet.</Typography>
            </>
          )}
        </Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow sx={{ position: 'sticky', top: 0, bgcolor: 'white' }}>
              {['Class Name', 'Teacher', 'Students', 'Status', 'Actions'].map((h) => (
                <TableCell key={h} sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map((c) => {
              const badge = STATUS_BADGE[c.status];
              return (
                <TableRow key={c.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{c.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontFamily: 'monospace' }}>{c.code}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 14, color: 'text.secondary' }}>
                    {c.teacher ? (c.teacher.name ?? c.teacher.upn) : 'â€”'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 14, color: 'text.secondary' }}>{c._count.students}</TableCell>
                  <TableCell>
                    <Chip label={badge.label} size="small" sx={{ bgcolor: badge.bg, color: badge.color, fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="text" size="small"
                        sx={{ fontSize: 12, fontWeight: 600, color: '#2563EB', borderRadius: 2, px: 1.5, py: 0.75, minWidth: 0, '&:hover': { bgcolor: '#EFF6FF' } }}
                        onClick={() => setEditing(c)}>
                        Edit
                      </Button>
                      <Button variant="text" size="small"
                        sx={{ fontSize: 12, fontWeight: 600, color: 'error.main', borderRadius: 2, px: 1.5, py: 0.75, minWidth: 0, '&:hover': { bgcolor: '#FEF2F2' } }}
                        onClick={() => setConfirmDelete(c)}>
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
