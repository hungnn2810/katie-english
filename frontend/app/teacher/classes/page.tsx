'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getClasses, createClass, deleteClass, updateClass, ClassItem, ClassStatus, ScheduleSlot } from '@/lib/admin-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import InputAdornment from '@mui/material/InputAdornment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Search, Plus, Calendar, Pencil, Trash2, Users, CheckCircle2, X } from 'lucide-react';
import { formatDate } from '@/lib/datetime';
import TableShell, { TableRow as TableShellRow } from '@/components/ui/TableShell';

const ACCENT = '#F0623A';

const STATUS_CONFIG: Record<ClassStatus, { label: string; color: string; bg: string; dot: string }> = {
  PENDING:    { label: 'Pending',     color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  INPROGRESS: { label: 'In Progress', color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  ENDED:      { label: 'Ended',       color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
};

const STATUS_AVATAR_BG: Record<ClassStatus, string> = {
  PENDING:    '#FEF3C7',
  INPROGRESS: '#D1FAE5',
  ENDED:      '#F3F4F6',
};
const STATUS_AVATAR_COLOR: Record<ClassStatus, string> = {
  PENDING:    '#D97706',
  INPROGRESS: '#059669',
  ENDED:      '#9CA3AF',
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

const emptyForm = () => ({ name: '', code: '', startDate: '', endDate: '', status: 'PENDING' as ClassStatus, scheduleSlots: [] as ScheduleSlot[] });
const DEFAULT_DURATION = 1.5;

function ClassModal({ editing, initial, onClose, onSaved }: {
  editing: ClassItem | null;
  initial: ReturnType<typeof emptyForm>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (k: keyof Omit<ReturnType<typeof emptyForm>, 'scheduleSlots'>, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      scheduleSlots: f.scheduleSlots.find((s) => s.day === day)
        ? f.scheduleSlots.filter((s) => s.day !== day)
        : [...f.scheduleSlots, { day, time: '', duration: DEFAULT_DURATION }],
    }));
  }

  function setSlotTime(day: string, time: string) {
    setForm((f) => ({ ...f, scheduleSlots: f.scheduleSlots.map((s) => s.day === day ? { ...s, time } : s) }));
  }

  function setSlotDuration(day: string, duration: number) {
    setForm((f) => ({ ...f, scheduleSlots: f.scheduleSlots.map((s) => s.day === day ? { ...s, duration } : s) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (editing) { await updateClass(editing.id, form); }
      else { await createClass(form); }
      onSaved(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save class');
    } finally { setLoading(false); }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {editing
                ? <><Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>Edit </Box><Box component="span" sx={{ color: ACCENT }}>{editing.name}</Box></>
                : 'New Class'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{editing ? 'Update class details and schedule.' : 'Create a new class for your students.'}</Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', mt: -0.5 }}><X size={16} /></IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ px: 4, py: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Class Name</FormLabel>
                <TextField size="small" fullWidth required value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. English Beginners" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              </Box>
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Class Code</FormLabel>
                <TextField size="small" fullWidth required value={form.code} onChange={(e) => setField('code', e.target.value)} placeholder="e.g. ENG-01" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              </Box>
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Start Date</FormLabel>
                <DatePicker
                  value={form.startDate ? new Date(form.startDate) : null}
                  onChange={(v: Date | null) => setField('startDate', v ? v.toISOString().split('T')[0] : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }}
                />
              </Box>
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>End Date</FormLabel>
                <DatePicker
                  value={form.endDate ? new Date(form.endDate) : null}
                  onChange={(v: Date | null) => setField('endDate', v ? v.toISOString().split('T')[0] : '')}
                  slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 1 }}>Status</FormLabel>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {(['PENDING', 'INPROGRESS', 'ENDED'] as ClassStatus[]).map((s) => {
                  const sc = STATUS_CONFIG[s];
                  const active = form.status === s;
                  return (
                    <Button key={s} type="button" variant="outlined" size="small"
                      onClick={() => setField('status', s)}
                      sx={{ borderRadius: 3, fontSize: 12, fontWeight: 600, gap: 0.75, border: '2px solid',
                        ...(active ? { bgcolor: sc.bg, color: sc.color, borderColor: sc.dot, '&:hover': { bgcolor: sc.bg } }
                          : { bgcolor: 'white', color: 'text.secondary', borderColor: 'divider' }) }}>
                      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: active ? sc.dot : 'divider', display: 'inline-block' }} />
                      {sc.label}
                    </Button>
                  );
                })}
              </Box>
            </Box>

            <Box>
              <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 1 }}>Schedule</FormLabel>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                {DAYS.map((day) => {
                  const active = !!form.scheduleSlots.find((s) => s.day === day);
                  return (
                    <Button key={day} type="button" variant="outlined" size="small"
                      onClick={() => toggleDay(day)}
                      sx={{ borderRadius: 2, fontSize: 12, fontWeight: 700, minWidth: 0, px: 1.5, border: '2px solid',
                        ...(active ? { bgcolor: '#FFF2EF', color: ACCENT, borderColor: ACCENT, '&:hover': { bgcolor: '#FFF2EF' } }
                          : { bgcolor: 'white', color: 'text.secondary', borderColor: 'divider' }) }}>
                      {DAY_LABELS[day]}
                    </Button>
                  );
                })}
              </Box>
              {form.scheduleSlots.length > 0 && (
                <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: 'background.default' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px', gap: 1, mb: 1 }}>
                    <Box />
                    <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', px: 0.5 }}>Start time</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', px: 0.5 }}>Duration</Typography>
                  </Box>
                  {DAYS.filter((d) => form.scheduleSlots.find((s) => s.day === d)).map((day) => {
                    const slot = form.scheduleSlots.find((s) => s.day === day)!;
                    return (
                      <Box key={day} sx={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{DAY_LABELS[day]}</Typography>
                        <TextField type="time" required size="small" value={slot.time} onChange={(e) => setSlotTime(day, e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                        <TextField
                          type="number" required size="small"
                          slotProps={{ htmlInput: { min: 0.5, max: 8, step: 0.5 }, input: { endAdornment: <InputAdornment position="end">h</InputAdornment> } }}
                          value={slot.duration ?? DEFAULT_DURATION}
                          onChange={(e) => setSlotDuration(day, parseFloat(e.target.value) || DEFAULT_DURATION)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                      </Box>
                    );
                  })}
                </Paper>
              )}
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 4, pb: 3.5, pt: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1.5 }}>
            {error && <Alert severity="error" sx={{ borderRadius: 3, flex: 1, mr: 'auto' }}>{error}</Alert>}
            <Button variant="outlined" onClick={onClose} sx={{ flex: 1, borderRadius: 3 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading} sx={{ flex: 1, borderRadius: 3, bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, gap: 1 }}>
              {loading && <CircularProgress size={14} sx={{ color: 'white' }} />}
              {loading ? (editing ? 'Updating…' : 'Creating…') : (editing ? 'Update Class' : 'Create Class')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </LocalizationProvider>
  );
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [initialForm, setInitialForm] = useState(emptyForm());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClassStatus>('ALL');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const load = () => getClasses().then(setClasses).catch(() => {});
  useEffect(() => { load(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3000);
  }

  function openCreate() { setEditing(null); setInitialForm(emptyForm()); setShowModal(true); }
  function openEdit(c: ClassItem) {
    setEditing(c);
    setInitialForm({ name: c.name, code: c.code, startDate: c.startDate.slice(0, 10), endDate: c.endDate.slice(0, 10), status: c.status, scheduleSlots: Array.isArray(c.scheduleSlots) ? c.scheduleSlots : [] });
    setShowModal(true);
  }

  const counts = { ALL: classes.length, PENDING: 0, INPROGRESS: 0, ENDED: 0 } as Record<string, number>;
  classes.forEach((c) => { counts[c.status] = (counts[c.status] ?? 0) + 1; });

  const filtered = classes.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filterTabs: { key: 'ALL' | ClassStatus; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'INPROGRESS', label: 'In Progress' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'ENDED', label: 'Ended' },
  ];

  return (
    <Box>
      {showModal && (
        <ClassModal
          editing={editing}
          initial={initialForm}
          onClose={() => setShowModal(false)}
          onSaved={() => { load(); showToast(editing ? 'Class updated!' : 'Class created!'); }}
        />
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        message={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircle2 size={16} color="#4ade80" />{toast}</Box>}
      />

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <TextField
          size="small"
          placeholder="Search classes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} color="#94A3B8" /></InputAdornment> } }}
        />
        <Box sx={{ display: 'flex', gap: 0.75, flex: 1 }}>
          {filterTabs.map((t) => {
            const active = statusFilter === t.key;
            const sc = t.key !== 'ALL' ? STATUS_CONFIG[t.key] : null;
            return (
              <Button key={t.key} variant="outlined" size="small" onClick={() => setStatusFilter(t.key)}
                sx={{ borderRadius: 3, fontSize: 12, fontWeight: 600, gap: 0.75, border: '1px solid',
                  ...(active
                    ? { bgcolor: sc ? sc.bg : '#FFF2EF', color: sc ? sc.color : ACCENT, borderColor: sc ? sc.dot : ACCENT, '&:hover': { bgcolor: sc ? sc.bg : '#FFF2EF' } }
                    : { bgcolor: 'white', color: 'text.secondary', borderColor: 'divider' }) }}>
                {sc && <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sc.dot, display: 'inline-block' }} />}
                {t.label}
                <Box component="span" sx={{ fontSize: 10, fontWeight: 700, px: 0.75, py: 0.25, borderRadius: '99px',
                  bgcolor: active ? (sc ? sc.dot + '25' : '#FFF2EF') : '#F3F4F6',
                  color: active ? (sc ? sc.color : ACCENT) : 'text.secondary' }}>
                  {counts[t.key] ?? 0}
                </Box>
              </Button>
            );
          })}
        </Box>
        <Button variant="contained" onClick={openCreate} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, borderRadius: 3, gap: 1, flexShrink: 0 }}>
          <Plus size={16} />
          New Class
        </Button>
      </Box>

      {/* Table */}
      {classes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary', bgcolor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <Box sx={{ width: 64, height: 64, bgcolor: 'grey.100', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <Users size={28} color="#94A3B8" />
          </Box>
          <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>No classes yet</Typography>
          <Typography sx={{ fontSize: 14, mt: 0.5 }}>Create your first class to get started</Typography>
        </Box>
      ) : (
        <TableShell columns={[
          { label: 'Class', width: '2fr' },
          { label: 'Code', width: '1fr' },
          { label: 'Students', width: '1fr' },
          { label: 'Schedule', width: '1.4fr' },
          { label: 'Status', width: '1fr' },
        ]}>
          {filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <Typography sx={{ fontWeight: 500, fontSize: 14 }}>No classes match filter</Typography>
            </Box>
          ) : (
            filtered.map((c, i) => {
              const sc = STATUS_CONFIG[c.status];
              const slots: ScheduleSlot[] = Array.isArray(c.scheduleSlots) ? c.scheduleSlots : [];
              const activeDays = DAYS.filter((d) => slots.find((s) => s.day === d));
              const isDeleting = deletingId === c.id;
              const scheduleText = activeDays.length > 0
                ? activeDays.map((day) => {
                    const slot = slots.find((s) => s.day === day)!;
                    return `${DAY_LABELS[day]}${slot.time ? ` ${slot.time}` : ''}`;
                  }).join(' · ')
                : 'Not scheduled';

              const statusChip = c.status === 'INPROGRESS'
                ? <Chip label="Active" size="small" sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontWeight: 700, height: 22 }} />
                : c.status === 'PENDING'
                  ? <Chip label="Pending" size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 700, height: 22 }} />
                  : <Chip label="Ended" size="small" sx={{ bgcolor: '#F3F4F6', color: '#6B7280', fontWeight: 700, height: 22 }} />;

              return (
                <TableShellRow
                  key={c.id}
                  columns={[
                    { label: 'Class', width: '2fr' },
                    { label: 'Code', width: '1fr' },
                    { label: 'Students', width: '1fr' },
                    { label: 'Schedule', width: '1.4fr' },
                    { label: 'Status', width: '1fr' },
                  ]}
                  last={i === filtered.length - 1}
                  cells={[
                    /* Class */
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: STATUS_AVATAR_BG[c.status] }}>
                        <Typography sx={{ fontWeight: 900, fontSize: 12, color: STATUS_AVATAR_COLOR[c.status] }}>
                          {c.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{c.name}</Typography>
                    </Box>,
                    /* Code */
                    <Typography sx={{ fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.04em', color: '#64748B' }}>{c.code}</Typography>,
                    /* Students */
                    <Typography sx={{ fontSize: 14, color: '#0F172A' }}>{c._count?.students ?? 0}</Typography>,
                    /* Schedule */
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography sx={{ fontSize: 13, color: activeDays.length > 0 ? '#0F172A' : '#94A3B8' }}>{scheduleText}</Typography>
                      {c.startDate && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Calendar size={11} color="#94A3B8" />
                          <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(c.startDate)} – {formatDate(c.endDate)}</Typography>
                        </Box>
                      )}
                    </Box>,
                    /* Status */
                    isDeleting ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Delete?</Typography>
                        <Button size="small" onClick={() => setDeletingId(null)} sx={{ fontSize: 11, borderRadius: 1.5, color: 'text.secondary', minWidth: 0, px: 0.75 }}>No</Button>
                        <Button size="small" variant="contained" onClick={async () => { try { await deleteClass(c.id); setDeletingId(null); load(); showToast('Class deleted.'); } catch { setDeletingId(null); } }}
                          sx={{ fontSize: 11, borderRadius: 1.5, bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' }, minWidth: 0, px: 0.75 }}>Yes</Button>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {statusChip}
                        <Box sx={{ display: 'flex', gap: 0.25, ml: 0.5 }}>
                          <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: ACCENT, width: 26, height: 26 }} title="Edit">
                            <Pencil size={13} />
                          </IconButton>
                          <IconButton size="small" component={Link} href={`/teacher/students?classId=${c.id}`} sx={{ color: '#8B5CF6', width: 26, height: 26 }} title="Students">
                            <Users size={13} />
                          </IconButton>
                          <IconButton size="small" onClick={() => setDeletingId(c.id)} sx={{ color: 'error.main', width: 26, height: 26 }} title="Delete">
                            <Trash2 size={13} />
                          </IconButton>
                        </Box>
                      </Box>
                    ),
                  ]}
                />
              );
            })
          )}
        </TableShell>
      )}
    </Box>
  );
}
