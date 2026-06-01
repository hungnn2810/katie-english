'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getStudents, createStudent, deleteStudent, updateStudent, getClasses,
  Student, ClassItem, CreateStudentInput,
  getPendingStudents, approveStudent, ApproveStudentInput, PendingStudent,
  getPasswordResetRequests, resetStudentPassword, PasswordResetRequest,
} from '@/lib/admin-api';
import { colors } from '@/lib/colors';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Search, Plus, User, Users, Clock, KeyRound, CheckCircle2, UserMinus, Pencil, X } from 'lucide-react';
import { formatDate } from '@/lib/datetime';

const ACCENT = '#F0623A';

const emptyParent = { name: '', phoneNumber: '', type: 'FATHER' as const };
const emptyCreate = (): CreateStudentInput => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }], upn: '', password: '' });
type EditForm = Omit<CreateStudentInput, 'upn' | 'password'>;
type ApproveForm = { fullname: string; sex: 'MALE' | 'FEMALE'; dateOfBirth: string; classId: number | undefined; parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[] };
const emptyApprove = (): ApproveForm => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }] });

function Modal({ title, subtitle, onClose, children }: { title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4, maxHeight: '90vh' } }}>
      <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>{title}</Typography>
          {subtitle && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', mt: -0.5 }}><X size={16} /></IconButton>
      </DialogTitle>
      {children}
    </Dialog>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>{msg}</Alert>;
}

function SexToggle({ value, onChange }: { value: 'MALE' | 'FEMALE'; onChange: (v: 'MALE' | 'FEMALE') => void }) {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {(['MALE', 'FEMALE'] as const).map((s) => (
        <Button key={s} type="button" variant="outlined" size="small"
          onClick={() => onChange(s)}
          sx={{ flex: 1, borderRadius: 3, fontSize: 12, fontWeight: 600, gap: 0.75, border: '2px solid',
            ...(value === s
              ? { bgcolor: s === 'MALE' ? '#EFF6FF' : '#FDF2F8', color: s === 'MALE' ? '#3B82F6' : '#EC4899', borderColor: s === 'MALE' ? '#3B82F6' : '#EC4899', '&:hover': { bgcolor: s === 'MALE' ? '#EFF6FF' : '#FDF2F8' } }
              : { bgcolor: 'white', color: 'text.secondary', borderColor: 'divider' }) }}>
          <User size={14} />
          {s === 'MALE' ? 'Male' : 'Female'}
        </Button>
      ))}
    </Box>
  );
}

function ParentFields({ parents, onChange }: {
  parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[];
  onChange: (parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[]) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {parents.slice(0, 1).map((p, i) => (
        <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
          <TextField size="small" placeholder="Parent name" value={p.name}
            onChange={(e) => { const ps = [...parents]; ps[i] = { ...ps[i], name: e.target.value }; onChange(ps); }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
          <TextField size="small" placeholder="Phone number" value={p.phoneNumber}
            onChange={(e) => { const ps = [...parents]; ps[i] = { ...ps[i], phoneNumber: e.target.value }; onChange(ps); }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
          <FormControl size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
            <MuiSelect value={p.type} onChange={(e) => { const ps = [...parents]; ps[i] = { ...ps[i], type: e.target.value as 'FATHER' | 'MOTHER' }; onChange(ps); }}>
              <MenuItem value="FATHER">Father</MenuItem>
              <MenuItem value="MOTHER">Mother</MenuItem>
            </MuiSelect>
          </FormControl>
        </Box>
      ))}
    </Box>
  );
}

function CreateModal({ classes, onClose, onSaved }: { classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(emptyCreate());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const phone = form.parents[0]?.phoneNumber?.trim();
    if (!phone) { setError('Parent phone is required (used as student login).'); return; }
    setLoading(true);
    try { await createStudent({ ...form, upn: phone, classId: form.classId || undefined }); onSaved(); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to add student.'); }
    finally { setLoading(false); }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Modal title="Add Student" subtitle="Parent phone number will be used as the login." onClose={onClose}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ px: 4, py: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box sx={{ gridColumn: '1/-1' }}>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Full Name</FormLabel>
                <TextField size="small" fullWidth required value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} placeholder="Student's full name" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              </Box>
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Sex</FormLabel>
                <SexToggle value={form.sex} onChange={(s) => setForm((f) => ({ ...f, sex: s }))} />
              </Box>
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Date of Birth</FormLabel>
                <DatePicker value={form.dateOfBirth ? new Date(form.dateOfBirth) : null} onChange={(v: Date | null) => setForm((f) => ({ ...f, dateOfBirth: v ? v.toISOString().split('T')[0] : '' }))} slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }} />
              </Box>
              <Box sx={{ gridColumn: '1/-1' }}>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Class</FormLabel>
                <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                  <MuiSelect value={String(form.classId ?? '')} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                    <MenuItem value="">No class assigned</MenuItem>
                    {classes.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</MenuItem>)}
                  </MuiSelect>
                </FormControl>
              </Box>
            </Box>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Parent / Guardian</Typography>
              <ParentFields parents={form.parents} onChange={(ps) => setForm((f) => ({ ...f, parents: ps }))} />
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Initial Password</FormLabel>
                <TextField type="password" size="small" fullWidth required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" inputProps={{ minLength: 6 }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              </Box>
            </Paper>
          </DialogContent>
          <DialogActions sx={{ px: 4, pb: 3.5, pt: 2, borderTop: '1px solid', borderColor: 'divider', flexDirection: 'column', gap: 1, alignItems: 'stretch' }}>
            {error && <ErrorBanner msg={error} />}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" onClick={onClose} sx={{ flex: 1, borderRadius: 3 }}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={loading} sx={{ flex: 1, borderRadius: 3, bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, gap: 1 }}>
                {loading && <CircularProgress size={14} sx={{ color: 'white' }} />}{loading ? 'Adding…' : 'Add Student'}
              </Button>
            </Box>
          </DialogActions>
        </Box>
      </Modal>
    </LocalizationProvider>
  );
}

function EditModal({ student, classes, onClose, onSaved }: { student: Student; classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditForm>({
    fullname: student.fullname, sex: student.sex, dateOfBirth: student.dateOfBirth.slice(0, 10), classId: student.classId,
    parents: student.parents.length > 0 ? student.parents.map((p) => ({ name: p.name, phoneNumber: p.phoneNumber, type: p.type })) : [{ ...emptyParent }],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await updateStudent(student.id, form); onSaved(); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save changes.'); }
    finally { setLoading(false); }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Modal title={<><Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>Edit </Box><Box component="span" sx={{ color: ACCENT }}>{student.fullname}</Box></>} subtitle="Update student info and class assignment." onClose={onClose}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ px: 4, py: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box sx={{ gridColumn: '1/-1' }}>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Full Name</FormLabel>
                <TextField size="small" fullWidth required value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              </Box>
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Sex</FormLabel>
                <SexToggle value={form.sex} onChange={(s) => setForm((f) => ({ ...f, sex: s }))} />
              </Box>
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Date of Birth</FormLabel>
                <DatePicker value={form.dateOfBirth ? new Date(form.dateOfBirth) : null} onChange={(v: Date | null) => setForm((f) => ({ ...f, dateOfBirth: v ? v.toISOString().split('T')[0] : '' }))} slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }} />
              </Box>
              <Box sx={{ gridColumn: '1/-1' }}>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Class</FormLabel>
                <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                  <MuiSelect value={String(form.classId ?? '')} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                    <MenuItem value="">No class assigned</MenuItem>
                    {classes.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</MenuItem>)}
                  </MuiSelect>
                </FormControl>
              </Box>
            </Box>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Parent / Guardian</Typography>
              <ParentFields parents={form.parents} onChange={(ps) => setForm((f) => ({ ...f, parents: ps }))} />
            </Paper>
          </DialogContent>
          <DialogActions sx={{ px: 4, pb: 3.5, pt: 2, borderTop: '1px solid', borderColor: 'divider', flexDirection: 'column', gap: 1, alignItems: 'stretch' }}>
            {error && <ErrorBanner msg={error} />}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" onClick={onClose} sx={{ flex: 1, borderRadius: 3 }}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={loading} sx={{ flex: 1, borderRadius: 3, bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, gap: 1 }}>
                {loading && <CircularProgress size={14} sx={{ color: 'white' }} />}{loading ? 'Saving…' : 'Save Changes'}
              </Button>
            </Box>
          </DialogActions>
        </Box>
      </Modal>
    </LocalizationProvider>
  );
}

function ApproveModal({ pending, classes, onClose, onSaved }: { pending: PendingStudent; classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ApproveForm>(() => {
    if (pending.registrationData) {
      const r = pending.registrationData;
      return { fullname: r.fullname, sex: r.sex, dateOfBirth: r.dateOfBirth.slice(0, 10), classId: r.classId ?? undefined, parents: r.parents.length > 0 ? r.parents : [{ ...emptyParent, phoneNumber: pending.upn }] };
    }
    return { ...emptyApprove(), parents: [{ ...emptyParent, phoneNumber: pending.upn }] };
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!form.fullname || !form.dateOfBirth) { setError('Full name and date of birth are required.'); return; }
    setLoading(true);
    try {
      const payload: ApproveStudentInput = { userId: pending.id, fullname: form.fullname, sex: form.sex, dateOfBirth: form.dateOfBirth, classId: form.classId, parents: form.parents.filter((p) => p.name) };
      await approveStudent(payload); onSaved(); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to approve.'); }
    finally { setLoading(false); }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Modal title={<><Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>Approve </Box><Box component="span" sx={{ color: '#10B981' }}>Registration</Box></>} subtitle={`Confirm student info for ${pending.upn}`} onClose={onClose}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ px: 4, py: 3 }}>
            <Alert severity="warning" sx={{ borderRadius: 3, mb: 2, fontSize: 13 }}>
              <strong>Login:</strong> {pending.upn} · Registered {new Date(pending.createdAt).toLocaleDateString()}
            </Alert>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box sx={{ gridColumn: '1/-1' }}>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Full Name *</FormLabel>
                <TextField size="small" fullWidth required value={form.fullname} onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))} placeholder="Student's full name" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              </Box>
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Sex</FormLabel>
                <SexToggle value={form.sex} onChange={(s) => setForm((f) => ({ ...f, sex: s }))} />
              </Box>
              <Box>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Date of Birth *</FormLabel>
                <DatePicker value={form.dateOfBirth ? new Date(form.dateOfBirth) : null} onChange={(v: Date | null) => setForm((f) => ({ ...f, dateOfBirth: v ? v.toISOString().split('T')[0] : '' }))} slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }} />
              </Box>
              <Box sx={{ gridColumn: '1/-1' }}>
                <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>Class</FormLabel>
                <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                  <MuiSelect value={String(form.classId ?? '')} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                    <MenuItem value="">No class assigned</MenuItem>
                    {classes.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</MenuItem>)}
                  </MuiSelect>
                </FormControl>
              </Box>
            </Box>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Parent / Guardian</Typography>
              <ParentFields parents={form.parents} onChange={(ps) => setForm((f) => ({ ...f, parents: ps }))} />
            </Paper>
          </DialogContent>
          <DialogActions sx={{ px: 4, pb: 3.5, pt: 2, borderTop: '1px solid', borderColor: 'divider', flexDirection: 'column', gap: 1, alignItems: 'stretch' }}>
            {error && <ErrorBanner msg={error} />}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" onClick={onClose} sx={{ flex: 1, borderRadius: 3 }}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={loading} sx={{ flex: 1, borderRadius: 3, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, gap: 1 }}>
                {loading && <CircularProgress size={14} sx={{ color: 'white' }} />}{loading ? 'Approving…' : 'Confirm Approval'}
              </Button>
            </Box>
          </DialogActions>
        </Box>
      </Modal>
    </LocalizationProvider>
  );
}

function ResetModal({ request, onClose, onSaved }: { request: PasswordResetRequest; onClose: () => void; onSaved: () => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (pw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try { await resetStudentPassword(request.id, pw); onSaved(); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to reset password.'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={<><Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>Reset </Box><Box component="span" sx={{ color: '#3B82F6' }}>Password</Box></>} subtitle={`Set a new password for ${request.student?.fullname ?? request.upn}`} onClose={onClose}>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 4, py: 3 }}>
          <Alert severity="info" sx={{ borderRadius: 3, mb: 2, fontSize: 13 }}>
            <strong>Account:</strong> {request.upn}
          </Alert>
          <FormLabel sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 }}>New Password</FormLabel>
          <TextField type="password" size="small" fullWidth required placeholder="Min 6 characters" value={pw} onChange={(e) => setPw(e.target.value)} inputProps={{ minLength: 6 }} autoFocus sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 4, pb: 3.5, pt: 2, borderTop: '1px solid', borderColor: 'divider', flexDirection: 'column', gap: 1, alignItems: 'stretch' }}>
          {error && <ErrorBanner msg={error} />}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" onClick={onClose} sx={{ flex: 1, borderRadius: 3 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading} sx={{ flex: 1, borderRadius: 3, bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, gap: 1 }}>
              {loading && <CircularProgress size={14} sx={{ color: 'white' }} />}{loading ? 'Updating…' : 'Set Password'}
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </Modal>
  );
}

type ModalState = { kind: 'create' } | { kind: 'edit'; student: Student } | { kind: 'approve'; pending: PendingStudent } | { kind: 'reset'; request: PasswordResetRequest } | null;

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [pending, setPending] = useState<PendingStudent[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>(() => searchParams.get('classId') ?? '');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback((cid?: number) => {
    getStudents(cid).then(setStudents).catch(() => {});
  }, []);

  const loadPending = () => getPendingStudents().then(setPending).catch(() => {});
  const loadResets = () => getPasswordResetRequests().then(setResetRequests).catch(() => {});

  useEffect(() => {
    getClasses().then(setClasses);
    loadPending();
    loadResets();
  }, []);

  useEffect(() => {
    load(classFilter ? Number(classFilter) : undefined);
  }, [classFilter, load]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const filtered = students.filter((s) => s.fullname.toLowerCase().includes(search.toLowerCase()));
  const activeClassName = classes.find((c) => String(c.id) === classFilter)?.name;

  return (
    <Box>
      {modal?.kind === 'create' && <CreateModal classes={classes} onClose={() => setModal(null)} onSaved={() => { load(classFilter ? Number(classFilter) : undefined); showToast('Student added!'); }} />}
      {modal?.kind === 'edit' && <EditModal student={modal.student} classes={classes} onClose={() => setModal(null)} onSaved={() => { load(classFilter ? Number(classFilter) : undefined); showToast('Changes saved!'); }} />}
      {modal?.kind === 'approve' && <ApproveModal pending={modal.pending} classes={classes} onClose={() => setModal(null)} onSaved={() => { load(classFilter ? Number(classFilter) : undefined); loadPending(); showToast('Student approved!'); }} />}
      {modal?.kind === 'reset' && <ResetModal request={modal.request} onClose={() => setModal(null)} onSaved={() => { loadResets(); showToast('Password updated!'); }} />}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        message={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircle2 size={16} color="#4ade80" />{toast}</Box>} />

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 192, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} color="#94A3B8" /></InputAdornment> }} />
        <FormControl size="small" sx={{ width: 208, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
          <MuiSelect value={classFilter} onChange={(e) => setClassFilter(e.target.value)} displayEmpty>
            <MenuItem value="">All classes</MenuItem>
            {classes.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
          </MuiSelect>
        </FormControl>
        {students.length > 0 && (
          <Typography sx={{ fontSize: 14, color: 'text.secondary', fontWeight: 500 }}>
            {filtered.length} of {students.length}
            {activeClassName && <Box component="span" sx={{ ml: 0.5, color: 'primary.main', fontWeight: 600 }}>· {activeClassName}</Box>}
          </Typography>
        )}
        <Button variant="contained" onClick={() => setModal({ kind: 'create' })} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, borderRadius: 3, gap: 1 }}>
          <Plus size={16} /> Add Student
        </Button>
      </Box>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 4, border: '1px solid #FCD34D', bgcolor: '#FFFBEB', p: 2.5, mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 28, height: 28, bgcolor: '#FEF3C7', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={14} color="#D97706" />
              </Box>
              <Typography sx={{ fontWeight: 700, color: '#92400E', fontSize: 14 }}>Pending Approvals</Typography>
              <Chip label={pending.length} size="small" sx={{ bgcolor: '#FDE68A', color: '#92400E', fontWeight: 700, height: 20 }} />
            </Box>
            <Button size="small" onClick={loadPending} sx={{ fontSize: 12, fontWeight: 600, color: '#B45309' }}>Refresh</Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {pending.map((p) => (
              <Paper key={p.id} variant="outlined" sx={{ borderRadius: 3, px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: '#FDE68A' }}>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: 14 }}>{p.registrationData?.fullname ?? p.upn}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{p.upn} · {new Date(p.createdAt).toLocaleString()}</Typography>
                </Box>
                <Button size="small" variant="contained" onClick={() => setModal({ kind: 'approve', pending: p })}
                  sx={{ fontSize: 12, fontWeight: 700, borderRadius: 3, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
                  Review & Approve
                </Button>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}

      {/* Password resets */}
      {resetRequests.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 4, border: '1px solid #BFDBFE', bgcolor: '#EFF6FF', p: 2.5, mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 28, height: 28, bgcolor: '#DBEAFE', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={14} color="#2563EB" />
              </Box>
              <Typography sx={{ fontWeight: 700, color: '#1E3A8A', fontSize: 14 }}>Password Reset Requests</Typography>
              <Chip label={resetRequests.length} size="small" sx={{ bgcolor: '#BFDBFE', color: '#1E40AF', fontWeight: 700, height: 20 }} />
            </Box>
            <Button size="small" onClick={loadResets} sx={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>Refresh</Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {resetRequests.map((r) => (
              <Paper key={r.id} variant="outlined" sx={{ borderRadius: 3, px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: '#BFDBFE' }}>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: 14 }}>{r.student?.fullname ?? r.upn}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{r.upn}</Typography>
                </Box>
                <Button size="small" variant="contained" onClick={() => setModal({ kind: 'reset', request: r })}
                  sx={{ fontSize: 12, fontWeight: 700, borderRadius: 3, bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 } }}>
                  Set Password
                </Button>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}

      {/* Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 4 }}>
        {students.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
            <Box sx={{ width: 56, height: 56, bgcolor: 'grey.100', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <Users size={24} color="#94A3B8" />
            </Box>
            <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>No students yet</Typography>
            <Typography sx={{ fontSize: 14, mt: 0.5 }}>Add your first student to get started</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Student</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Date of Birth</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Class</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Parent</TableCell>
                <TableCell sx={{ width: 112 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: 'text.secondary', fontSize: 14 }}>No students match your search.</TableCell></TableRow>
              )}
              {filtered.map((s) => {
                const isDeleting = deletingId === s.id;
                return (
                  <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'background.default' }, '&:hover .row-actions': { opacity: 1 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0, bgcolor: s.sex === 'MALE' ? '#3B82F6' : '#EC4899' }}>
                          {s.fullname[0].toUpperCase()}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: 14 }}>{s.fullname}</Typography>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <User size={12} />{s.sex === 'MALE' ? 'Male' : 'Female'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 14, color: 'text.secondary' }}>{formatDate(s.dateOfBirth)}</TableCell>
                    <TableCell>
                      {s.class
                        ? <Chip label={s.class.name} size="small" sx={{ bgcolor: '#EDE9FE', color: colors.purple, fontWeight: 600 }} />
                        : <Typography sx={{ color: 'text.disabled', fontSize: 14 }}>—</Typography>}
                    </TableCell>
                    <TableCell>
                      {s.parents.length > 0
                        ? <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            {s.parents.map((p) => (
                              <Typography key={p.id} sx={{ fontSize: 12, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <User size={12} style={{ flexShrink: 0 }} />
                                {p.type === 'FATHER' ? 'Father' : 'Mother'}: {p.name} · {p.phoneNumber}
                              </Typography>
                            ))}
                          </Box>
                        : <Typography sx={{ color: 'text.disabled', fontSize: 14 }}>—</Typography>}
                    </TableCell>
                    <TableCell>
                      {isDeleting ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Sure?</Typography>
                          <Button size="small" onClick={() => setDeletingId(null)} sx={{ fontSize: 12, borderRadius: 2, color: 'text.secondary', minWidth: 0, px: 1 }}>No</Button>
                          <Button size="small" variant="contained" onClick={async () => { await deleteStudent(s.id); setDeletingId(null); load(classFilter ? Number(classFilter) : undefined); showToast('Student removed.'); }}
                            sx={{ fontSize: 12, borderRadius: 2, bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' }, minWidth: 0, px: 1 }}>Yes</Button>
                        </Box>
                      ) : (
                        <Box className="row-actions" sx={{ display: 'flex', gap: 1, opacity: 0, transition: 'opacity 0.15s' }}>
                          <Button size="small" onClick={() => setModal({ kind: 'edit', student: s })}
                            sx={{ fontSize: 12, fontWeight: 600, borderRadius: 2, color: ACCENT, gap: 0.5, minWidth: 0, px: 1 }}>
                            <Pencil size={12} /> Edit
                          </Button>
                          <Button size="small" onClick={() => setDeletingId(s.id)}
                            sx={{ fontSize: 12, fontWeight: 600, borderRadius: 2, color: 'error.main', gap: 0.5, minWidth: 0, px: 1, '&:hover': { bgcolor: 'error.50' } }}>
                            <UserMinus size={12} /> Delete
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
}
