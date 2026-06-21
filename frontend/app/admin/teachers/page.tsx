'use client';
import { useEffect, useState } from 'react';
import {
  getTeachers, createTeacher, updateTeacher, disableTeacher, enableTeacher,
  TeacherItem, CreateTeacherInput, UpdateTeacherInput,
} from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import { Search } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CloseIcon from '@mui/icons-material/Close';
import TableShell, { TableRow } from '@/components/ui/TableShell';

const ACCENT = '#6366F1';

const COLUMNS = [
  { label: 'Teacher', width: '1.8fr' },
  { label: 'Email', width: '1.8fr' },
  { label: 'Classes', width: '0.8fr' },
  { label: 'Status', width: '1fr' },
  { label: '', width: '1.4fr' },
];

// ─── Teacher Modal (Create / Edit) ─────────────────────────────────────────

function TeacherModal({ editing, onClose, onSaved }: {
  editing: TeacherItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(editing?.name ?? '');
  const [email, setEmail] = useState(editing?.upn ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        const data: UpdateTeacherInput = { name, phone };
        if (password) data.password = password;
        await updateTeacher(editing.id, data);
        onSaved('Changes saved.');
      } else {
        const data: CreateTeacherInput = { email, name, phone, password };
        await createTeacher(data);
        onSaved('Teacher account created.');
      }
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>{editing ? 'Edit Teacher' : 'Create Teacher'}</Typography>
          <Typography variant="caption" color="text.secondary">{editing ? 'Update teacher details.' : 'Add a new teacher account.'}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', mt: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 4, py: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <FormLabel htmlFor="teacher-name" sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', display: 'block', mb: 0.5 }}>Name</FormLabel>
            <TextField id="teacher-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
          </Box>
          <Box>
            <FormLabel htmlFor="teacher-email" sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', display: 'block', mb: 0.5 }}>Email</FormLabel>
            <TextField id="teacher-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@example.com" required fullWidth size="small" disabled={!!editing} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
          </Box>
          <Box>
            <FormLabel htmlFor="teacher-phone" sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', display: 'block', mb: 0.5 }}>Phone</FormLabel>
            <TextField id="teacher-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" required fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
          </Box>
          <Box>
            <FormLabel htmlFor="teacher-password" sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', display: 'block', mb: 0.5 }}>
              {editing ? 'New Password' : 'Password'}
            </FormLabel>
            <TextField id="teacher-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editing ? 'Leave blank to keep current' : 'Password'} required={!editing} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 4, pb: 3.5, gap: 1.5 }}>
          <Button type="button" variant="outlined" onClick={onClose} sx={{ flex: 1, borderRadius: 3 }}>Keep teacher</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ flex: 1, borderRadius: 3, bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, fontWeight: 700 }}
          >
            {loading ? 'Saving...' : editing ? 'Save Changes' : 'Create Teacher'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ─── Disable / Enable Confirm Dialog ───────────────────────────────────────

function ConfirmDialog({ target, onClose, onConfirmed }: {
  target: TeacherItem;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const isDisabling = !target.disabled;

  async function handleConfirm() {
    setLoading(true);
    try {
      if (isDisabling) {
        await disableTeacher(target.id);
      } else {
        await enableTeacher(target.id);
      }
      onConfirmed();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed. Please try again.', 'error');
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>{isDisabling ? 'Disable teacher?' : 'Enable teacher?'}</Typography>
      </DialogTitle>
      <DialogContent sx={{ px: 4, py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {isDisabling
            ? `Disable teacher? ${target.name ?? target.upn} will no longer be able to log in until re-enabled.`
            : `Enable teacher? ${target.name ?? target.upn} will be able to log in again.`}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 4, pb: 3.5, gap: 1.5 }}>
        <Button variant="outlined" onClick={onClose} sx={{ flex: 1, borderRadius: 3 }}>Keep teacher</Button>
        {isDisabling ? (
          <Button
            variant="contained"
            color="error"
            disabled={loading}
            onClick={handleConfirm}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ flex: 1, borderRadius: 3, fontWeight: 700 }}
          >
            {loading ? 'Disabling...' : 'Disable account'}
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={loading}
            onClick={handleConfirm}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ flex: 1, borderRadius: 3, fontWeight: 700, bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 } }}
          >
            {loading ? 'Enabling...' : 'Enable account'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Status chip helpers ────────────────────────────────────────────────────

function StatusChip({ teacher }: { teacher: TeacherItem }) {
  if (teacher.disabled) {
    return <Chip label="Inactive" size="small" sx={{ bgcolor: '#FEF2F2', color: '#E11D48', fontWeight: 700, fontSize: 12, borderRadius: 999 }} />;
  }
  return <Chip label="Active" size="small" sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontWeight: 700, fontSize: 12, borderRadius: 999 }} />;
}

function ActionCell({ teacher, onEdit, onConfirm }: {
  teacher: TeacherItem;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  if (teacher.disabled) {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="outlined" size="small" onClick={onEdit}
          sx={{ fontSize: 13, fontWeight: 600, borderRadius: 2, px: 1.5, py: '6px', minWidth: 0 }}>
          Edit
        </Button>
        <Button variant="outlined" size="small" onClick={onConfirm}
          sx={{ fontSize: 13, fontWeight: 600, borderRadius: 2, px: 1.5, py: '6px', minWidth: 0 }}>
          Reactivate
        </Button>
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button variant="outlined" size="small" onClick={onEdit}
        sx={{ fontSize: 13, fontWeight: 600, borderRadius: 2, px: 1.5, py: '6px', minWidth: 0 }}>
        Edit
      </Button>
      <Button variant="outlined" size="small" onClick={onConfirm}
        sx={{
          fontSize: 13, fontWeight: 600, borderRadius: 2, px: 1.5, py: '6px', minWidth: 0,
          color: '#E11D48', borderColor: '#FECACA',
          '&:hover': { bgcolor: '#FEF2F2', borderColor: '#FECACA' },
        }}>
        Deactivate
      </Button>
    </Box>
  );
}

// ─── Teachers Page ──────────────────────────────────────────────────────────

export default function TeachersPage() {
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeacherItem | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<TeacherItem | null>(null);

  async function loadTeachers() {
    setLoading(true);
    try {
      const data = await getTeachers();
      setTeachers(data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load teachers.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTeachers(); }, []);

  const filtered = teachers.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (t.name ?? '').toLowerCase().includes(q) || t.upn.toLowerCase().includes(q);
  });

  return (
    <Box>
      {/* Modals */}
      {(creating || editing) && (
        <TeacherModal
          editing={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(msg) => { loadTeachers(); showToast(msg); }}
        />
      )}
      {confirmTarget && (
        <ConfirmDialog
          target={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onConfirmed={() => { loadTeachers(); showToast('Changes saved.'); }}
        />
      )}

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1.5 }}>
        <TextField
          placeholder="Search teachers…"
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
        <Button
          onClick={() => setCreating(true)}
          variant="contained"
          sx={{ fontWeight: 600, borderRadius: 2, px: 2, py: 1.125, bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, fontSize: 14 }}
        >
          + Add Teacher
        </Button>
      </Box>

      {/* Empty state */}
      {!loading && filtered.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 1 }}>
            {search ? 'No teachers match your search' : 'No teachers yet'}
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {search ? 'Try a different name or email.' : 'Create the first teacher account to get started.'}
          </Typography>
        </Box>
      ) : (
        <TableShell columns={COLUMNS}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow
                  key={i}
                  columns={COLUMNS}
                  last={i === 3}
                  cells={COLUMNS.map((_, ci) => (
                    <Box key={ci} sx={{ height: 16, bgcolor: 'grey.100', borderRadius: 1, width: '80%', animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                  ))}
                />
              ))
            : filtered.map((t, i) => (
                <TableRow
                  key={t.id}
                  columns={COLUMNS}
                  last={i === filtered.length - 1}
                  cells={[
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
                      {t.name ?? <Box component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>No name</Box>}
                    </Typography>,
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t.upn}</Typography>,
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>—</Typography>,
                    <StatusChip teacher={t} />,
                    <ActionCell
                      teacher={t}
                      onEdit={() => setEditing(t)}
                      onConfirm={() => setConfirmTarget(t)}
                    />,
                  ]}
                />
              ))}
        </TableShell>
      )}
    </Box>
  );
}
