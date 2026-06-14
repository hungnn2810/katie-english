'use client';
import { useState } from 'react';
import { login, register, forgotPassword, RegisterInput } from '@/lib/auth';
import { DATE_FORMAT } from '@/lib/datetime';
import { BookOpen, Mic, BarChart2, CheckCircle2, GraduationCap, User } from 'lucide-react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { useToast } from '@/lib/toast-context';

const ACCENT = '#F0623A';

type Role = 'TEACHER' | 'STUDENT';
type ParentType = 'FATHER' | 'MOTHER';
const emptyParent = () => ({ name: '', phoneNumber: '', type: 'FATHER' as ParentType });
const emptyReg = (): Omit<RegisterInput, 'upn' | 'password'> => ({
  fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [emptyParent()],
});

const FEATURES = [
  { icon: BookOpen, text: 'Assign and manage homework' },
  { icon: Mic, text: 'Interactive phonics blending' },
  { icon: BarChart2, text: 'Track student progress' },
];

export default function LoginPage() {
  const { showToast } = useToast();
  const [role, setRole] = useState<Role | null>(null);
  const [upn, setUpn] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [reg, setReg] = useState(emptyReg());
  const [forgotUpn, setForgotUpn] = useState('');
  const [forgotDone, setForgotDone] = useState(false);

  function setParentField(i: number, k: string, v: string) {
    setReg((r) => { const ps = [...r.parents]; ps[i] = { ...ps[i], [k]: v }; return { ...r, parents: ps }; });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(forgotUpn);
      setForgotDone(true);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to send request', 'error');
    } finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const parentPhone = reg.parents[0]?.phoneNumber ?? upn;
        await register({ upn: parentPhone, password, ...reg });
        showToast('Account created. A teacher must approve your account before you can sign in.', 'info');
        setMode('login');
        setPassword('');
        setReg(emptyReg());
      } else if (role === 'TEACHER') {
        const res = await fetch('/api/auth/teacher-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upn, password }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? 'Invalid credentials');
        }
        window.location.href = (process.env.NEXT_PUBLIC_APP_ORIGIN ?? '') + '/teacher';
      } else {
        // Student password login (existing flow — will be replaced by class-code login in plan 12-03)
        const user = await login(upn, password);
        window.location.href = (process.env.NEXT_PUBLIC_STUDENT_ORIGIN ?? '') + '/game/homework';
        void user;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      showToast(message || (mode === 'register' ? 'Registration failed' : 'Invalid credentials'), 'error');
    } finally { setLoading(false); }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }} style={{ minWidth: 1024 }}>
      {/* Left panel — dark navy */}
      <Box sx={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 6, background: '#0C1220' }}>
        <Box>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 8 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 3, flexShrink: 0, background: ACCENT }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 16 }}>K</Typography>
            </Box>
            <Typography sx={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Katie English</Typography>
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', lineHeight: 1.15, mb: 2, letterSpacing: '-0.02em' }}>
            Learn English<br />
            <Box component="span" sx={{ color: ACCENT }}>the fun way</Box>
          </Typography>
          <Typography sx={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, maxWidth: 320 }}>
            Blend phonemes, complete homework, and track your progress with interactive lessons.
          </Typography>
        </Box>

        {/* Feature list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(240,98,58,0.15)' }}>
                  <Icon size={16} color={ACCENT} />
                </Box>
                <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>{f.text}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Right panel */}
      <Box sx={{ flex: 1, bgcolor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6 }}>
        <Box sx={{ width: '100%', maxWidth: 448 }}>

          {/* Role picker */}
          {!role && (
            <Box>
              <Box sx={{ mb: 5 }}>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mb: 1, letterSpacing: '-0.02em' }}>Welcome back</Typography>
                <Typography sx={{ color: '#64748B', fontSize: 14 }}>Who are you signing in as?</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {/* Teacher card */}
                <Box
                  component="button"
                  onClick={() => { setRole('TEACHER'); setMode('login'); }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = ACCENT)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0')}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    p: 4, bgcolor: '#F7F9FC', borderRadius: 2, border: '2px solid #E2E8F0',
                    cursor: 'pointer', transition: 'all 0.2s', background: 'none',
                    '&:hover': { boxShadow: 4 },
                  }}
                >
                  <Box sx={{ width: 56, height: 56, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF2EF', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' } }}>
                    <GraduationCap size={28} color={ACCENT} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>Teacher</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: 14, textAlign: 'center' }}>Manage classes</Typography>
                  </Box>
                </Box>
                {/* Student card */}
                <Box
                  component="button"
                  onClick={() => { setRole('STUDENT'); setMode('login'); }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#A78BFA')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0')}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    p: 4, bgcolor: '#F7F9FC', borderRadius: 2, border: '2px solid #E2E8F0',
                    cursor: 'pointer', transition: 'all 0.2s', background: 'none',
                    '&:hover': { boxShadow: 4 },
                  }}
                >
                  <Box sx={{ width: 56, height: 56, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3FF', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' } }}>
                    <User size={28} color="#A78BFA" />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>Student</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: 14, textAlign: 'center' }}>Do homework</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* Form */}
          {role && (
            <Box>
              <Button
                onClick={() => {
                  if (mode === 'forgot') { setMode('login'); setForgotDone(false); setForgotUpn(''); }
                  else { setRole(null); }
                }}
                sx={{
                  color: '#64748B', fontSize: 14, mb: 4, display: 'flex', alignItems: 'center', gap: 0.75,
                  '&:hover': { color: '#0F172A' }, textTransform: 'none', minWidth: 0, p: 0,
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 1, background: role === 'TEACHER' ? '#FFF2EF' : '#F5F3FF' }}>
                  {role === 'TEACHER'
                    ? <GraduationCap size={24} color={ACCENT} />
                    : <User size={24} color="#A78BFA" />}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 20, color: '#0F172A', letterSpacing: '-0.02em' }}>
                    {role === 'TEACHER' ? 'Teacher' : 'Student'}{' '}
                    {mode === 'register' ? 'Registration' : mode === 'forgot' ? 'Forgot Password' : 'Sign In'}
                  </Typography>
                  <Typography sx={{ color: '#64748B', fontSize: 14 }}>
                    {mode === 'register' ? 'Create account — teacher will approve'
                      : mode === 'forgot' ? 'Your teacher will be notified to reset your password'
                      : 'Enter your credentials to continue'}
                  </Typography>
                </Box>
              </Box>

              {/* Forgot password */}
              {mode === 'forgot' && (
                <Box>
                  {forgotDone ? (
                    <Box sx={{ borderRadius: 1, border: '1px solid #bbf7d0', bgcolor: '#f0fdf4', p: 3, textAlign: 'center' }}>
                      <CheckCircle2 size={40} color="#22c55e" style={{ margin: '0 auto 12px' }} />
                      <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>Request sent!</Typography>
                      <Typography sx={{ color: '#64748B', fontSize: 14 }}>Your teacher has been notified. They will set a new password and share it with you.</Typography>
                      <Button
                        onClick={() => { setMode('login'); setForgotDone(false); setForgotUpn(''); }}
                        sx={{ mt: 2, fontSize: 14, fontWeight: 600, color: ACCENT, '&:hover': { textDecoration: 'underline' }, textTransform: 'none', p: 0, minWidth: 0 }}
                      >
                        Back to sign in
                      </Button>
                    </Box>
                  ) : (
                    <Box component="form" onSubmit={handleForgot} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        type="text"
                        label="Phone Number"
                        size="small"
                        fullWidth
                        placeholder="Your phone number"
                        value={forgotUpn}
                        onChange={(e) => setForgotUpn(e.target.value)}
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        fullWidth
                        sx={{ py: 1.5, borderRadius: 1, bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, fontWeight: 600, fontSize: 15, textTransform: 'none' }}
                      >
                        {loading ? 'Sending...' : 'Request Password Reset'}
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {/* Login / Register */}
              {mode !== 'forgot' && (
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(role === 'TEACHER' || mode === 'login') && (
                    <TextField
                      type="text"
                      label={role === 'TEACHER' ? 'Email' : 'Phone Number'}
                      size="small"
                      fullWidth
                      placeholder={role === 'TEACHER' ? 'teacher@email.com' : 'phone number'}
                      value={upn}
                      onChange={(e) => setUpn(e.target.value)}
                      required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                    />
                  )}

                  {role === 'STUDENT' && mode === 'register' && (
                    <>
                      <TextField
                        label="Student Full Name *"
                        size="small"
                        fullWidth
                        placeholder="Student's full name"
                        value={reg.fullname}
                        onChange={(e) => setReg((r) => ({ ...r, fullname: e.target.value }))}
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                      />
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Sex</InputLabel>
                          <Select
                            value={reg.sex}
                            label="Sex"
                            onChange={(e) => setReg((r) => ({ ...r, sex: e.target.value as 'MALE' | 'FEMALE' }))}
                            sx={{ borderRadius: 1 }}
                          >
                            <MenuItem value="MALE">Male</MenuItem>
                            <MenuItem value="FEMALE">Female</MenuItem>
                          </Select>
                        </FormControl>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label={`Date of Birth * (${DATE_FORMAT})`}
                            format={DATE_FORMAT}
                            value={reg.dateOfBirth ? new Date(reg.dateOfBirth) : null}
                            onChange={(newValue: Date | null) => {
                              const iso = newValue ? newValue.toISOString().split('T')[0] : '';
                              setReg((r) => ({ ...r, dateOfBirth: iso }));
                            }}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                          />
                        </LocalizationProvider>
                      </Box>
                      <Box sx={{ borderRadius: 1, border: '1px solid #E2E8F0', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Parent / Guardian
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          <TextField
                            size="small"
                            label="Parent name *"
                            value={reg.parents[0].name}
                            onChange={(e) => setParentField(0, 'name', e.target.value)}
                            required
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                          />
                          <TextField
                            size="small"
                            label="Phone number *"
                            value={reg.parents[0].phoneNumber}
                            onChange={(e) => setParentField(0, 'phoneNumber', e.target.value)}
                            required
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                          />
                          <FormControl size="small" sx={{ gridColumn: '1 / -1' }}>
                            <InputLabel>Relation</InputLabel>
                            <Select
                              value={reg.parents[0].type}
                              label="Relation"
                              onChange={(e) => setParentField(0, 'type', e.target.value)}
                              sx={{ borderRadius: 1 }}
                            >
                              <MenuItem value="FATHER">Father</MenuItem>
                              <MenuItem value="MOTHER">Mother</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                        <Typography sx={{ fontSize: 12, color: '#64748B' }}>Parent&apos;s phone will be used as the login.</Typography>
                      </Box>
                    </>
                  )}

                  <TextField
                    type="password"
                    label="Password"
                    size="small"
                    fullWidth
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    fullWidth
                    sx={{
                      py: 1.5, borderRadius: 1, fontSize: 15, fontWeight: 600,
                      bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 },
                      textTransform: 'none',
                      '&.Mui-disabled': { opacity: 0.6, color: 'white', bgcolor: ACCENT },
                    }}
                  >
                    {loading
                      ? (mode === 'register' ? 'Creating account...' : 'Signing in...')
                      : (mode === 'register' ? 'Create Account' : 'Sign In')}
                  </Button>

                  {role === 'STUDENT' && (
                    <>
                      <Button
                        type="button"
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); }}
                        fullWidth
                        sx={{ fontSize: 14, color: '#64748B', '&:hover': { color: '#0F172A' }, textTransform: 'none', py: 0.5 }}
                      >
                        {mode === 'login' ? 'Create a student account' : 'Back to sign in'}
                      </Button>
                      {mode === 'login' && (
                        <Button
                          type="button"
                          onClick={() => { setMode('forgot'); setForgotDone(false); }}
                          fullWidth
                          sx={{ fontSize: 14, fontWeight: 500, color: ACCENT, '&:hover': { opacity: 0.7 }, textTransform: 'none', py: 0.5 }}
                        >
                          Forgot password?
                        </Button>
                      )}
                    </>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
