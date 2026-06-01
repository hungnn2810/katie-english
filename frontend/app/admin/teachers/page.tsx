'use client';
import { useEffect, useState } from 'react';
import {
  getTeachers, createTeacher, updateTeacher, disableTeacher, enableTeacher,
  TeacherItem, CreateTeacherInput, UpdateTeacherInput,
} from '@/lib/admin-portal-api';
import { CheckCircle2 } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Chip from '@mui/material/Chip';
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
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import CloseIcon from '@mui/icons-material/Close';

const ACCENT = '#4F9DFF';

// â”€â”€â”€ Teacher Modal (Create / Edit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TeacherModal({ editing, onClose, onSaved }: {
  editing: TeacherItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [email, setEmail] = useState(editing?.upn ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6" fontWeight={900}>{editing ? 'Edit Teacher' : 'Create Teacher'}</Typography>
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

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
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

// â”€â”€â”€ Disable / Enable Confirm Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ConfirmDialog({ target, onClose, onConfirmed }: {
  target: TeacherItem;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isDisabling = !target.disabled;

  async function handleConfirm() {
    setError('');
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
      setError(err instanceof Error ? err.message : 'Failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={900}>{isDisabling ? 'Disable teacher?' : 'Enable teacher?'}</Typography>
      </DialogTitle>
      <DialogContent sx={{ px: 4, py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {isDisabling
            ? `Disable teacher? ${target.name ?? target.upn} will no longer be able to log in until re-enabled.`
            : `Enable teacher? ${target.name ?? target.upn} will be able to log in again.`}
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
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

// â”€â”€â”€ Teachers Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeacherItem | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<TeacherItem | null>(null);
  const [toast, setToast] = useState('');

  async function loadTeachers() {
    setLoading(true);
    setError('');
    try {
      const data = await getTeachers();
      setTeachers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTeachers(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

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

      {/* Toast */}
      {toast && (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1500, bgcolor: '#0F172A', color: 'white', fontSize: 14, fontWeight: 600, px: 2.5, py: 1.5, borderRadius: 4, boxShadow: 8, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle2 style={{ width: 16, height: 16, color: '#4ADE80' }} /> {toast}
        </Box>
      )}

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {loading ? 'Loading...' : `${teachers.length} teacher${teachers.length !== 1 ? 's' : ''}`}
        </Typography>
        <Button
          onClick={() => setCreating(true)}
          variant="contained"
          sx={{ color: 'white', fontWeight: 700, borderRadius: 3, px: 2.5, py: 1.25, bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 } }}
        >
          Create Teacher
        </Button>
      </Box>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>{error}</Alert>}

      {/* Table */}
      {!loading && teachers.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 1 }}>No teachers yet</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>Create the first teacher account to get started.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 0, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {['Name', 'Email', 'Phone', 'Status', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ px: 2.5, py: 1.5, fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {teachers.map((t) => (
                <TableRow key={t.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                  <TableCell sx={{ px: 2.5, py: 1.5, fontWeight: 500, color: t.disabled ? 'text.disabled' : 'text.primary' }}>
                    {t.name ?? <Box component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>No name</Box>}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5, color: t.disabled ? 'text.disabled' : 'text.primary' }}>{t.upn}</TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5, color: t.disabled ? 'text.disabled' : 'text.primary' }}>
                    {t.phone ?? <Box component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>â€”</Box>}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5 }}>
                    {t.disabled
                      ? <Chip label="Disabled" size="small" sx={{ bgcolor: 'grey.100', color: '#64748B' }} />
                      : <Chip label="Active" size="small" sx={{ bgcolor: '#F0FDF4', color: '#15803D' }} />}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button variant="text" size="small" onClick={() => setEditing(t)}
                        sx={{ fontSize: 12, fontWeight: 600, borderRadius: 2, px: 1.5, py: 0.75, minWidth: 0 }}>
                        Edit
                      </Button>
                      <Button variant="text" size="small" onClick={() => setConfirmTarget(t)}
                        sx={{ fontSize: 12, fontWeight: 600, borderRadius: 2, px: 1.5, py: 0.75, minWidth: 0,
                          color: t.disabled ? 'success.main' : 'error.main',
                          '&:hover': { bgcolor: t.disabled ? '#F0FDF4' : '#FEF2F2' } }}>
                        {t.disabled ? 'Enable' : 'Disable'}
                      </Button>
                    </Box>
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
