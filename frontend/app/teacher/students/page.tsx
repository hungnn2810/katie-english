'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  getStudents, createStudent, deleteStudent, updateStudent, getClasses,
  Student, ClassItem, CreateStudentInput,
  getPendingStudents, approveStudent, ApproveStudentInput, PendingStudent,
  getPasswordResetRequests, resetStudentPassword, PasswordResetRequest,
} from '@/lib/admin-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import FormSection from '@/components/ui/FormSection';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useToast } from '@/lib/toast-context';
import InputAdornment from '@mui/material/InputAdornment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Search, Plus, User, Users, Clock, KeyRound, UserMinus, Pencil, X, CheckCircle2 } from 'lucide-react';
import { DATE_FORMAT } from '@/lib/datetime';
import TableShell, { TableRow as TableShellRow } from '@/components/ui/TableShell';
import { colors } from '@/lib/colors';
import PageLoading, { PAGE_LOADING_DELAY } from '@/components/ui/PageLoading';

const ACCENT = colors.teacherAccent;

const emptyParent = { name: '', phoneNumber: '', type: 'FATHER' as const };
const emptyCreate = (): CreateStudentInput => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }], upn: '', password: '' });
type EditForm = Omit<CreateStudentInput, 'upn' | 'password'>;
type ApproveForm = { fullname: string; sex: 'MALE' | 'FEMALE'; dateOfBirth: string; classId: number | undefined; parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[] };
const emptyApprove = (): ApproveForm => ({ fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [{ ...emptyParent }] });

const fLabelSx = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 0.75 };
const sectionSx = { borderRadius: 3, p: 2, bgcolor: 'background.default', display: 'flex', flexDirection: 'column' as const, gap: 1.5, mb: 2 };
const sectionTitleSx = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'text.secondary' };

function Modal({ title, onClose, children }: { title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', maxHeight: '92vh' } } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3.5, pt: 3, pb: 2 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
        <IconButton size="small" onClick={onClose}
          sx={{ bgcolor: '#F0F2F8', borderRadius: '50%', width: 32, height: 32, '&:hover': { bgcolor: '#E5E8F2' } }}>
          <X size={15} color="#6B7280" />
        </IconButton>
      </Box>
      {children}
    </Dialog>
  );
}

function SexToggle({ value, onChange }: { value: 'MALE' | 'FEMALE'; onChange: (v: 'MALE' | 'FEMALE') => void }) {
  const t = useTranslations('teacher.students');
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {(['MALE', 'FEMALE'] as const).map((s) => (
        <Button key={s} type="button" variant="outlined" size="small"
          onClick={() => onChange(s)}
          sx={{
            flex: 1, borderRadius: 3, fontSize: 12, fontWeight: 600, gap: 0.75, border: '2px solid',
            ...(value === s
              ? { bgcolor: s === 'MALE' ? '#EFF6FF' : '#FDF2F8', color: s === 'MALE' ? '#3B82F6' : '#EC4899', borderColor: s === 'MALE' ? '#3B82F6' : '#EC4899', '&:hover': { bgcolor: s === 'MALE' ? '#EFF6FF' : '#FDF2F8' } }
              : { bgcolor: 'white', color: 'text.secondary', borderColor: 'divider' }),
          }}>
          <User size={14} />
          {s === 'MALE' ? t('sexToggle.male') : t('sexToggle.female')}
        </Button>
      ))}
    </Box>
  );
}

function ParentFields({ parents, onChange }: {
  parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[];
  onChange: (parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[]) => void;
}) {
  const t = useTranslations('teacher.students');
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {parents.map((p, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
            <Box>
              <FormLabel sx={fLabelSx}>{t('parentFields.nameLabel')}</FormLabel>
              <TextField size="small" fullWidth placeholder={t('parentFields.namePlaceholder')} value={p.name}
                onChange={(e) => { const ps = [...parents]; ps[i] = { ...ps[i], name: e.target.value }; onChange(ps); }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
            </Box>
            <Box>
              <FormLabel sx={fLabelSx}>{t('parentFields.phoneLabel')}</FormLabel>
              <TextField size="small" fullWidth placeholder={t('parentFields.phonePlaceholder')} value={p.phoneNumber}
                onChange={(e) => { const ps = [...parents]; ps[i] = { ...ps[i], phoneNumber: e.target.value }; onChange(ps); }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
            </Box>
            <Box>
              <FormLabel sx={fLabelSx}>{t('parentFields.relationshipLabel')}</FormLabel>
              <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                <MuiSelect value={p.type} onChange={(e) => { const ps = [...parents]; ps[i] = { ...ps[i], type: e.target.value as 'FATHER' | 'MOTHER' }; onChange(ps); }}>
                  <MenuItem value="FATHER">{t('parentFields.father')}</MenuItem>
                  <MenuItem value="MOTHER">{t('parentFields.mother')}</MenuItem>
                </MuiSelect>
              </FormControl>
            </Box>
          </Box>
          {parents.length > 1 && (
            <IconButton size="small" type="button" onClick={() => onChange(parents.filter((_, j) => j !== i))} sx={{ mb: 0.5, color: 'error.main' }}>
              <X size={14} />
            </IconButton>
          )}
        </Box>
      ))}
      {parents.length < 2 && (
        <Button type="button" size="small" onClick={() => onChange([...parents, { ...emptyParent }])} sx={{ alignSelf: 'flex-start', fontSize: 12 }}>
          {t('parentFields.addParent')}
        </Button>
      )}
    </Box>
  );
}

function CreateModal({ classes, onClose, onSaved }: { classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations('teacher.students');
  const [form, setForm] = useState(emptyCreate());
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.upn.trim()) { showToast(t('toasts.username_required'), 'error'); return; }
    setLoading(true);
    try {
      await createStudent({ ...form, upn: form.upn.trim(), classId: form.classId || undefined });
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('toasts.add_error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Modal title={t('createModal.title')} onClose={onClose}>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ px: 3.5, py: 0, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

            {/* Section: Auth */}
            <FormSection label={t('form.authLabel')} showPencil={false}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <FormLabel sx={fLabelSx}>{t('form.usernameLabel')}</FormLabel>
                  <TextField size="small" fullWidth required value={form.upn}
                    onChange={(e) => setForm((f) => ({ ...f, upn: e.target.value }))}
                    placeholder={t('form.usernamePlaceholder')}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                </Box>
                <Box>
                  <FormLabel sx={fLabelSx}>{t('form.passwordLabel')}</FormLabel>
                  <TextField type="password" size="small" fullWidth required value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={t('form.passwordPlaceholder')}
                    slotProps={{ htmlInput: { minLength: 6 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                </Box>
              </Box>
            </FormSection>

            {/* Section: Student Info */}
            <FormSection label={t('form.studentInfoLabel')} showPencil={false}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box sx={{ gridColumn: '1/-1' }}>
                  <FormLabel sx={fLabelSx}>{t('form.fullNameLabel')}</FormLabel>
                  <TextField size="small" fullWidth required value={form.fullname}
                    onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))}
                    placeholder={t('form.fullNamePlaceholder')}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                </Box>
                <Box>
                  <FormLabel sx={fLabelSx}>{t('form.sexLabel')}</FormLabel>
                  <SexToggle value={form.sex} onChange={(s) => setForm((f) => ({ ...f, sex: s }))} />
                </Box>
                <Box>
                  <FormLabel sx={fLabelSx}>{t('form.dobLabel', { format: DATE_FORMAT })}</FormLabel>
                  <DatePicker
                    format={DATE_FORMAT}
                    value={form.dateOfBirth ? new Date(form.dateOfBirth) : null}
                    onChange={(v: Date | null) => setForm((f) => ({ ...f, dateOfBirth: v ? v.toISOString().split('T')[0] : '' }))}
                    slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }} />
                </Box>
                <Box sx={{ gridColumn: '1/-1' }}>
                  <FormLabel sx={fLabelSx}>{t('form.classLabel')}</FormLabel>
                  <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                    <MuiSelect
                      value={String(form.classId ?? '')}
                      onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                      <MenuItem value="">{t('form.noClassAssigned')}</MenuItem>
                      {classes.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</MenuItem>)}
                    </MuiSelect>
                  </FormControl>
                </Box>
              </Box>
            </FormSection>

            {/* Section: Parent / Guardian */}
            <FormSection label={t('form.parentGuardianLabel')} showPencil={false}>
              <ParentFields parents={form.parents} onChange={(ps) => setForm((f) => ({ ...f, parents: ps }))} />
            </FormSection>

          </DialogContent>
          <DialogActions sx={{ px: 3.5, pb: 3, pt: 0.5, justifyContent: 'flex-end', gap: 1.5 }}>
            <Button variant="outlined" onClick={onClose} sx={{ borderRadius: '50px', fontWeight: 600, px: 2.5, textTransform: 'none' }}>{t('form.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined} sx={{ borderRadius: '50px', fontWeight: 600, px: 3, textTransform: 'none', bgcolor: '#E8ECF6', color: '#6B7280', boxShadow: 'none', '&:hover': { bgcolor: '#DDE2F0', boxShadow: 'none' } }}>
              {loading ? t('createModal.adding') : t('createModal.addStudent')}
            </Button>
          </DialogActions>
        </Box>
      </Modal>
    </LocalizationProvider>
  );
}

function EditModal({ student, classes, onClose, onSaved }: { student: Student; classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations('teacher.students');
  const [form, setForm] = useState<EditForm>({
    fullname: student.fullname,
    sex: student.sex,
    dateOfBirth: student.dateOfBirth.slice(0, 10),
    classId: student.classId,
    parents: student.parents.length > 0
      ? student.parents.map((p) => ({ name: p.name, phoneNumber: p.phoneNumber, type: p.type }))
      : [{ ...emptyParent }],
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateStudent(student.id, form);
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('toasts.save_error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Modal
        title={<><Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('editModal.titlePrefix')}</Box><Box component="span" sx={{ color: ACCENT }}>{student.fullname}</Box></>}
        subtitle={t('editModal.subtitle')}
        onClose={onClose}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ px: 3.5, py: 0, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

            {/* Section: Auth */}
            <FormSection label={t('form.authLabel')} showPencil={false}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <FormLabel sx={fLabelSx}>{t('form.usernameLabel')}</FormLabel>
                  <TextField size="small" fullWidth disabled value={student.user?.upn ?? ''}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                </Box>
              </Box>
            </FormSection>

            {/* Section: Student Info */}
            <FormSection label={t('form.studentInfoLabel')} showPencil={false}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box sx={{ gridColumn: '1/-1' }}>
                  <FormLabel sx={fLabelSx}>{t('form.fullNameLabel')}</FormLabel>
                  <TextField size="small" fullWidth required value={form.fullname}
                    onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))}
                    placeholder={t('form.fullNamePlaceholder')}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                </Box>
                <Box>
                  <FormLabel sx={fLabelSx}>{t('form.sexLabel')}</FormLabel>
                  <SexToggle value={form.sex} onChange={(s) => setForm((f) => ({ ...f, sex: s }))} />
                </Box>
                <Box>
                  <FormLabel sx={fLabelSx}>{t('form.dobLabel', { format: DATE_FORMAT })}</FormLabel>
                  <DatePicker
                    format={DATE_FORMAT}
                    value={form.dateOfBirth ? new Date(form.dateOfBirth) : null}
                    onChange={(v: Date | null) => setForm((f) => ({ ...f, dateOfBirth: v ? v.toISOString().split('T')[0] : '' }))}
                    slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }} />
                </Box>
                <Box sx={{ gridColumn: '1/-1' }}>
                  <FormLabel sx={fLabelSx}>{t('form.classLabel')}</FormLabel>
                  <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                    <MuiSelect
                      value={String(form.classId ?? '')}
                      onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                      <MenuItem value="">{t('form.noClassAssigned')}</MenuItem>
                      {classes.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</MenuItem>)}
                    </MuiSelect>
                  </FormControl>
                </Box>
              </Box>
            </FormSection>

            {/* Section: Parent / Guardian */}
            <FormSection label={t('form.parentGuardianLabel')} showPencil={false}>
              <ParentFields parents={form.parents} onChange={(ps) => setForm((f) => ({ ...f, parents: ps }))} />
            </FormSection>

          </DialogContent>
          <DialogActions sx={{ px: 3.5, pb: 3, pt: 0.5, justifyContent: 'flex-end', gap: 1.5 }}>
            <Button variant="outlined" onClick={onClose} sx={{ borderRadius: '50px', fontWeight: 600, px: 2.5, textTransform: 'none' }}>{t('form.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined} sx={{ borderRadius: '50px', fontWeight: 600, px: 3, textTransform: 'none', bgcolor: '#E8ECF6', color: '#6B7280', boxShadow: 'none', '&:hover': { bgcolor: '#DDE2F0', boxShadow: 'none' } }}>
              {loading ? t('editModal.saving') : t('editModal.saveChanges')}
            </Button>
          </DialogActions>
        </Box>
      </Modal>
    </LocalizationProvider>
  );
}

function ApproveModal({ pending, classes, onClose, onSaved }: { pending: PendingStudent; classes: ClassItem[]; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations('teacher.students');
  const [form, setForm] = useState<ApproveForm>(() => {
    if (pending.registrationData) {
      const r = pending.registrationData;
      return {
        fullname: r.fullname, sex: r.sex, dateOfBirth: r.dateOfBirth.slice(0, 10),
        classId: r.classId ?? undefined,
        parents: r.parents.length > 0 ? r.parents : [{ ...emptyParent, phoneNumber: pending.upn }],
      };
    }
    return { ...emptyApprove(), parents: [{ ...emptyParent, phoneNumber: pending.upn }] };
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullname || !form.dateOfBirth) { showToast(t('toasts.name_dob_required'), 'error'); return; }
    setLoading(true);
    try {
      const payload: ApproveStudentInput = {
        userId: pending.id, fullname: form.fullname, sex: form.sex,
        dateOfBirth: form.dateOfBirth, classId: form.classId,
        parents: form.parents.filter((p) => p.name),
      };
      await approveStudent(payload);
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('toasts.approve_error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Modal
        title={<><Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('approveModal.titlePrefix')}</Box><Box component="span" sx={{ color: '#10B981' }}>{t('approveModal.titleAccent')}</Box></>}
        subtitle={t('approveModal.subtitle', { upn: pending.upn })}
        onClose={onClose}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ px: 3.5, py: 0, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Alert severity="warning" sx={{ borderRadius: 3, mb: 2, fontSize: 13 }}>
              <strong>{t('approveModal.loginLabel')}</strong> {pending.upn} &middot; {t('approveModal.registeredPrefix')} {new Date(pending.createdAt).toLocaleDateString()}
            </Alert>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box sx={{ gridColumn: '1/-1' }}>
                <FormLabel sx={fLabelSx}>{t('form.fullNameRequiredLabel')}</FormLabel>
                <TextField size="small" fullWidth required value={form.fullname}
                  onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))}
                  placeholder={t('form.fullNamePlaceholder')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              </Box>
              <Box>
                <FormLabel sx={fLabelSx}>{t('form.sexLabel')}</FormLabel>
                <SexToggle value={form.sex} onChange={(s) => setForm((f) => ({ ...f, sex: s }))} />
              </Box>
              <Box>
                <FormLabel sx={fLabelSx}>{t('form.dobRequiredLabel', { format: DATE_FORMAT })}</FormLabel>
                <DatePicker
                  value={form.dateOfBirth ? new Date(form.dateOfBirth) : null}
                  onChange={(v: Date | null) => setForm((f) => ({ ...f, dateOfBirth: v ? v.toISOString().split('T')[0] : '' }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }} />
              </Box>
              <Box sx={{ gridColumn: '1/-1' }}>
                <FormLabel sx={fLabelSx}>{t('form.classLabel')}</FormLabel>
                <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                  <MuiSelect value={String(form.classId ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value ? Number(e.target.value) : undefined }))}>
                    <MenuItem value="">{t('form.noClassAssigned')}</MenuItem>
                    {classes.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</MenuItem>)}
                  </MuiSelect>
                </FormControl>
              </Box>
            </Box>
            <FormSection label={t('form.parentGuardianLabel')} showPencil={false}>
              <ParentFields parents={form.parents} onChange={(ps) => setForm((f) => ({ ...f, parents: ps }))} />
            </FormSection>
          </DialogContent>
          <DialogActions sx={{ px: 3.5, pb: 3, pt: 0.5, justifyContent: 'flex-end', gap: 1.5 }}>
            <Button variant="outlined" onClick={onClose} sx={{ borderRadius: '50px', fontWeight: 600, px: 2.5, textTransform: 'none' }}>{t('form.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined} sx={{ borderRadius: '50px', fontWeight: 600, px: 3, textTransform: 'none', bgcolor: '#E8ECF6', color: '#6B7280', boxShadow: 'none', '&:hover': { bgcolor: '#DDE2F0', boxShadow: 'none' } }}>
              {loading ? t('approveModal.approving') : t('approveModal.confirmApproval')}
            </Button>
          </DialogActions>
        </Box>
      </Modal>
    </LocalizationProvider>
  );
}

function ResetModal({ request, onClose, onSaved }: { request: PasswordResetRequest; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations('teacher.students');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) { showToast(t('toasts.password_too_short'), 'error'); return; }
    setLoading(true);
    try {
      await resetStudentPassword(request.id, pw);
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('toasts.reset_error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title={<><Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('resetModal.titlePrefix')}</Box><Box component="span" sx={{ color: '#3B82F6' }}>{t('resetModal.titleAccent')}</Box></>}
      subtitle={t('resetModal.subtitle', { name: request.student?.fullname ?? request.upn })}
      onClose={onClose}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 4, py: 3 }}>
          <Alert severity="info" sx={{ borderRadius: 3, mb: 2, fontSize: 13 }}>
            <strong>{t('resetModal.accountLabel')}</strong> {request.upn}
          </Alert>
          <FormLabel sx={fLabelSx}>{t('resetModal.newPasswordLabel')}</FormLabel>
          <TextField type="password" size="small" fullWidth required placeholder={t('form.passwordPlaceholder')}
            value={pw} onChange={(e) => setPw(e.target.value)}
            slotProps={{ htmlInput: { minLength: 6 } }} autoFocus
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3.5, pb: 3, pt: 0.5, justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" onClick={onClose} sx={{ borderRadius: '50px', fontWeight: 600, px: 2.5, textTransform: 'none' }}>{t('form.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined} sx={{ borderRadius: '50px', fontWeight: 600, px: 3, textTransform: 'none', bgcolor: '#E8ECF6', color: '#6B7280', boxShadow: 'none', '&:hover': { bgcolor: '#DDE2F0', boxShadow: 'none' } }}>
            {loading ? t('resetModal.updating') : t('resetModal.setPassword')}
          </Button>
        </DialogActions>
      </Box>
    </Modal>
  );
}

type ModalState =
  | { kind: 'create' }
  | { kind: 'edit'; student: Student }
  | { kind: 'approve'; pending: PendingStudent }
  | { kind: 'reset'; request: PasswordResetRequest }
  | null;

export default function StudentsPage() {
  const t = useTranslations('teacher.students');
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [pending, setPending] = useState<PendingStudent[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>(() => searchParams.get('classId') ?? '');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { showToast } = useToast();

  const load = useCallback((cid?: number) => {
    setPageLoading(true);
    getStudents(cid).then(setStudents).catch(() => {}).finally(() => setTimeout(() => setPageLoading(false), PAGE_LOADING_DELAY));
  }, []);

  const loadPending = useCallback(() => {
    getPendingStudents().then(setPending).catch(() => {});
  }, []);

  const loadResets = useCallback(() => {
    getPasswordResetRequests().then(setResetRequests).catch(() => {});
  }, []);

  useEffect(() => {
    getClasses().then(setClasses);
    loadPending();
    loadResets();
  }, []);

  useEffect(() => {
    load(classFilter ? Number(classFilter) : undefined);
  }, [classFilter, load]);

  const filtered = students.filter((s) => s.fullname.toLowerCase().includes(search.toLowerCase()));
  const activeClassName = classes.find((c) => String(c.id) === classFilter)?.name;

  return (
    <Box>
      {modal?.kind === 'create' && (
        <CreateModal classes={classes} onClose={() => setModal(null)}
          onSaved={() => { load(classFilter ? Number(classFilter) : undefined); showToast(t('toasts.student_added'), 'success'); }} />
      )}
      {modal?.kind === 'edit' && (
        <EditModal student={modal.student} classes={classes} onClose={() => setModal(null)}
          onSaved={() => { load(classFilter ? Number(classFilter) : undefined); showToast(t('toasts.changes_saved'), 'success'); }} />
      )}
      {modal?.kind === 'approve' && (
        <ApproveModal pending={modal.pending} classes={classes} onClose={() => setModal(null)}
          onSaved={() => { load(classFilter ? Number(classFilter) : undefined); loadPending(); showToast(t('toasts.student_approved'), 'success'); }} />
      )}
      {modal?.kind === 'reset' && (
        <ResetModal request={modal.request} onClose={() => setModal(null)}
          onSaved={() => { loadResets(); showToast(t('toasts.password_updated'), 'success'); }} />
      )}

      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: '16px', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField size="small" placeholder={t('toolbar.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} color="#94A3B8" /></InputAdornment> } }} />
          <FormControl size="small" sx={{ width: 180, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
            <MuiSelect value={classFilter} onChange={(e) => setClassFilter(e.target.value)} displayEmpty>
              <MenuItem value="">{t('toolbar.allClasses')}</MenuItem>
              {classes.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
            </MuiSelect>
          </FormControl>
          {students.length > 0 && (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              {t('toolbar.countOf', { filtered: filtered.length, total: students.length })}
              {activeClassName && <Box component="span" sx={{ ml: 0.5, color: ACCENT, fontWeight: 600 }}>&middot; {activeClassName}</Box>}
            </Typography>
          )}
        </Box>
        <Button variant="contained" onClick={() => setModal({ kind: 'create' })}
          sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, borderRadius: '8px', gap: 1 }}>
          <Plus size={16} /> {t('toolbar.addStudent')}
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
              <Typography sx={{ fontWeight: 700, color: '#92400E', fontSize: 14 }}>{t('pendingSection.title')}</Typography>
              <Chip label={pending.length} size="small" sx={{ bgcolor: '#FDE68A', color: '#92400E', fontWeight: 700, height: 20 }} />
            </Box>
            <Button size="small" onClick={loadPending} sx={{ fontSize: 12, fontWeight: 600, color: '#B45309' }}>{t('pendingSection.refresh')}</Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {pending.map((p) => (
              <Paper key={p.id} variant="outlined" sx={{ borderRadius: 3, px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: '#FDE68A' }}>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: 14 }}>{p.registrationData?.fullname ?? p.upn}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{p.upn} &middot; {new Date(p.createdAt).toLocaleString()}</Typography>
                </Box>
                <Button size="small" variant="contained" onClick={() => setModal({ kind: 'approve', pending: p })}
                  sx={{ fontSize: 12, fontWeight: 700, borderRadius: 3, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
                  {t('pendingSection.reviewApprove')}
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
              <Typography sx={{ fontWeight: 700, color: '#1E3A8A', fontSize: 14 }}>{t('resetSection.title')}</Typography>
              <Chip label={resetRequests.length} size="small" sx={{ bgcolor: '#BFDBFE', color: '#1E40AF', fontWeight: 700, height: 20 }} />
            </Box>
            <Button size="small" onClick={loadResets} sx={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>{t('resetSection.refresh')}</Button>
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
                  {t('resetSection.setPassword')}
                </Button>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}

      {/* Table */}
      {pageLoading ? (
        <PageLoading />
      ) : students.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary', bgcolor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <Box sx={{ width: 56, height: 56, bgcolor: 'grey.100', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <Users size={24} color="#94A3B8" />
          </Box>
          <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{t('table.emptyTitle')}</Typography>
          <Typography sx={{ fontSize: 14, mt: 0.5 }}>{t('table.emptySubtitle')}</Typography>
        </Box>
      ) : (
        <TableShell columns={[
          { label: t('table.columnStudent'), width: '2fr' },
          { label: t('table.columnClass'), width: '1fr' },
          { label: t('table.columnParent'), width: '1.4fr' },
          { label: t('table.columnStatus'), width: '1.2fr' },
        ]}>
          {filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{t('table.noMatch')}</Typography>
            </Box>
          ) : (
            filtered.map((s, i) => {
              const isDeleting = deletingId === s.id;
              const statusCell = isDeleting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t('table.deleteConfirm')}</Typography>
                  <Button size="small" onClick={() => setDeletingId(null)}
                    sx={{ fontSize: 11, borderRadius: 1.5, color: 'text.secondary', minWidth: 0, px: 0.75 }}>{t('table.no')}</Button>
                  <Button size="small" variant="contained" disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await deleteStudent(s.id);
                        setDeletingId(null);
                        load(classFilter ? Number(classFilter) : undefined);
                        showToast(t('toasts.student_removed'), 'success');
                      } catch (err) {
                        setDeletingId(null);
                        showToast(err instanceof Error ? err.message : t('toasts.remove_error'), 'error');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    sx={{ fontSize: 11, borderRadius: 1.5, bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' }, minWidth: 0, px: 0.75 }}>
                    {submitting ? '…' : t('table.yes')}
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={t('table.approved')} size="small" sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontWeight: 700, height: 22 }} />
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <IconButton size="small" onClick={() => setModal({ kind: 'edit', student: s })}
                      sx={{ color: ACCENT, width: 26, height: 26 }} title={t('table.editTitle')}>
                      <Pencil size={13} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeletingId(s.id)}
                      sx={{ color: 'error.main', width: 26, height: 26 }} title={t('table.deleteTitle')}>
                      <UserMinus size={13} />
                    </IconButton>
                  </Box>
                </Box>
              );

              return (
                <TableShellRow
                  key={s.id}
                  columns={[
                    { label: t('table.columnStudent'), width: '2fr' },
                    { label: t('table.columnClass'), width: '1fr' },
                    { label: t('table.columnParent'), width: '1.4fr' },
                    { label: t('table.columnStatus'), width: '1.2fr' },
                  ]}
                  last={i === filtered.length - 1}
                  cells={[
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0, bgcolor: s.sex === 'MALE' ? '#3B82F6' : '#EC4899' }}>
                        {s.fullname[0].toUpperCase()}
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}>{s.fullname}</Typography>
                        <Typography sx={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <User size={11} />{s.sex === 'MALE' ? t('sexToggle.male') : t('sexToggle.female')}
                        </Typography>
                      </Box>
                    </Box>,
                    s.class
                      ? <Chip label={s.class.name} size="small" sx={{ bgcolor: '#EDE9FE', color: '#8B5CF6', fontWeight: 600, height: 22 }} />
                      : <Typography sx={{ color: 'text.disabled', fontSize: 14 }}>&#8212;</Typography>,
                    s.parents.length > 0
                      ? <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          {s.parents.map((p) => (
                            <Typography key={p.id} sx={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <User size={11} style={{ flexShrink: 0 }} />
                              {p.type === 'FATHER' ? t('parentFields.father') : t('parentFields.mother')}: {p.name} &middot; {p.phoneNumber}
                            </Typography>
                          ))}
                        </Box>
                      : <Typography sx={{ color: 'text.disabled', fontSize: 14 }}>&#8212;</Typography>,
                    statusCell,
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
