'use client';
import { useCallback, useEffect, useState } from 'react';
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
import { useToast } from '@/lib/toast-context';
import { Search } from 'lucide-react';
import { DATE_FORMAT } from '@/lib/datetime';
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
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import TableShell, { TableRow } from '@/components/ui/TableShell';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };
const DEFAULT_DURATION = 1.5;

const STATUS_BADGE: Record<ClassStatus, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pending',     color: '#92400E', bg: '#FFFBEB' },
  INPROGRESS: { label: 'In Progress', color: '#15803D', bg: '#F0FDF4' },
  ENDED:      { label: 'Ended',       color: '#64748B', bg: '#F1F5F9' },
};

const COLUMNS = [
  { label: 'Class', width: '1.6fr' },
  { label: 'Code', width: '0.9fr' },
  { label: 'Teacher', width: '1.4fr' },
  { label: 'Students', width: '0.9fr' },
  { label: '', width: '1fr' },
];

// ─── EditClassModal ──────────────────────────────────────────────────────────

function EditClassModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: AdminClassItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<AdminUpdateClassInput>({
    name: editing.name,
    code: editing.code,
    startDate: editing.startDate.slice(0, 10),
    endDate: editing.endDate.slice(0, 10),
    status: editing.status,
    scheduleSlots: Array.isArray(editing.scheduleSlots) ? editing.scheduleSlots : [],
  });
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
    setLoading(true);
    try {
      await updateAdminClass(editing.id, form);
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.', 'error');
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
                <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>Start Date ({DATE_FORMAT})</FormLabel>
                <DatePicker
                  format={DATE_FORMAT}
                  value={form.startDate ? new Date(form.startDate) : null}
                  onChange={(v) => setField('startDate', v ? v.toISOString().split('T')[0] : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }}
                />
              </Box>
              <Box>
                <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>End Date ({DATE_FORMAT})</FormLabel>
                <DatePicker
                  format={DATE_FORMAT}
                  value={form.endDate ? new Date(form.endDate) : null}
                  onChange={(v) => setField('endDate', v ? v.toISOString().split('T')[0] : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }}
                />
              </Box>
            </Box>

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

// ─── DeleteConfirmDialog ─────────────────────────────────────────────────────

function DeleteConfirmDialog({
  cls,
  onClose,
  onDeleted,
}: {
  cls: AdminClassItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAdminClass(cls.id);
      onDeleted();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete class. Please try again.', 'error');
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

// ─── ClassesPage ─────────────────────────────────────────────────────────────

export default function ClassesPage() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<AdminClassItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [search, setSearch] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminClassItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminClassItem | null>(null);

  const loadClasses = useCallback(async (filter: string) => {
    setLoading(true);
    try {
      const data = await getAdminClasses(filter === 'ALL' ? undefined : Number(filter));
      setClasses(data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load classes.', 'error');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => {
    getTeachers().then(setTeachers).catch(() => {});
  }, []);

  useEffect(() => {
    loadClasses(teacherFilter);
  }, [teacherFilter, loadClasses]);

  const filtered = classes.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

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

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField
            placeholder="Search classes…"
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
          <FormControl size="small" sx={{ minWidth: 192 }}>
            <InputLabel>All teachers</InputLabel>
            <Select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              label="All teachers"
              sx={{ borderRadius: 2, '& fieldset': { borderWidth: '1.5px', borderColor: '#E2E8F0' } }}
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
        <Button
          variant="contained"
          sx={{ fontWeight: 600, borderRadius: 2, px: 2, py: 1.125, fontSize: 14 }}
        >
          + New Class
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
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
        <TableShell columns={COLUMNS}>
          {filtered.map((c, i) => {
            const badge = STATUS_BADGE[c.status];
            const hasTeacher = !!c.teacher;
            return (
              <TableRow
                key={c.id}
                columns={COLUMNS}
                last={i === filtered.length - 1}
                cells={[
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{c.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontFamily: 'monospace' }}>{c.code}</Typography>
                  </Box>,
                  <Typography sx={{ fontSize: 14, color: 'text.secondary', fontFamily: 'monospace' }}>{c.code}</Typography>,
                  <Typography sx={{ fontSize: 14, color: hasTeacher ? 'text.primary' : '#94A3B8' }}>
                    {hasTeacher ? (c.teacher!.name ?? c.teacher!.upn) : 'Unassigned'}
                  </Typography>,
                  <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{c._count.students}</Typography>,
                  hasTeacher ? (
                    <Button variant="text" size="small" onClick={() => setEditing(c)}
                      sx={{ fontSize: 13, fontWeight: 600, p: 0, minWidth: 0, color: '#6366F1' }}>
                      Reassign
                    </Button>
                  ) : (
                    <Button variant="contained" size="small" onClick={() => setEditing(c)}
                      sx={{ fontSize: 13, fontWeight: 600, borderRadius: 2, px: '12px', py: '6px', minWidth: 0 }}>
                      Assign teacher
                    </Button>
                  ),
                ]}
              />
            );
          })}
        </TableShell>
      )}
    </Box>
  );
}
