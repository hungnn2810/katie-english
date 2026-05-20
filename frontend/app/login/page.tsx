'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register, forgotPassword, RegisterInput } from '@/lib/auth';
import { BookOpen, Mic, BarChart2, CheckCircle2, GraduationCap, User } from 'lucide-react';

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
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [upn, setUpn] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
    setError(''); setLoading(true);
    try {
      await forgotPassword(forgotUpn);
      setForgotDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setNotice(''); setLoading(true);
    try {
      if (mode === 'register') {
        const parentPhone = reg.parents[0]?.phoneNumber ?? upn;
        await register({ upn: parentPhone, password, ...reg });
        setNotice('Account created. A teacher must approve your account before you can sign in.');
        setMode('login');
        setPassword('');
        setReg(emptyReg());
      } else {
        const user = await login(upn, password);
        router.push(user.role === 'TEACHER' ? '/teacher' : '/game/homework');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      setError(message || (mode === 'register' ? 'Registration failed' : 'Invalid credentials'));
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex font-sans" style={{ minWidth: 1024 }}>
      {/* Left panel — dark navy */}
      <div
        className="w-[420px] flex-shrink-0 flex flex-col justify-between p-12"
        style={{ background: '#0C1220' }}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: ACCENT }}
            >
              <span className="text-white font-black text-base">K</span>
            </div>
            <span className="text-white text-lg font-bold tracking-tight">Katie English</span>
          </div>

          <h1 className="text-4xl font-black text-white leading-[1.15] mb-4 tracking-tight">
            Learn English<br />
            <span style={{ color: ACCENT }}>the fun way</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Blend phonemes, complete homework, and track your progress with interactive lessons.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(240, 98, 58, 0.15)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <span className="text-slate-400 text-sm">{f.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white flex items-center justify-center p-12">
        <div className="w-full max-w-md animate-fade-in">

          {/* Role picker */}
          {!role && (
            <div>
              <div className="mb-10">
                <h2 className="text-2xl font-black text-textPrimary mb-2 tracking-tight">Welcome back</h2>
                <p className="text-textSecondary text-sm">Who are you signing in as?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setRole('TEACHER'); setMode('login'); }}
                  className="group flex flex-col items-center gap-4 p-8 bg-background rounded-2xl border-2 border-border hover:shadow-card-hover transition-all duration-200"
                  style={{ '--tw-border-opacity': 1 } as React.CSSProperties}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                    style={{ background: '#FFF2EF' }}
                  >
                    <GraduationCap className="w-7 h-7" style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <div className="font-bold text-textPrimary">Teacher</div>
                    <div className="text-textSecondary text-sm">Manage classes</div>
                  </div>
                </button>
                <button
                  onClick={() => { setRole('STUDENT'); setMode('login'); }}
                  className="group flex flex-col items-center gap-4 p-8 bg-background rounded-2xl border-2 border-border hover:shadow-card-hover transition-all duration-200"
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#A78BFA')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                    style={{ background: '#F5F3FF' }}
                  >
                    <User className="w-7 h-7" style={{ color: '#A78BFA' }} />
                  </div>
                  <div>
                    <div className="font-bold text-textPrimary">Student</div>
                    <div className="text-textSecondary text-sm">Do homework</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {role && (
            <div className="animate-slide-up">
              <button
                onClick={() => {
                  if (mode === 'forgot') { setMode('login'); setForgotDone(false); setForgotUpn(''); setError(''); }
                  else { setRole(null); setError(''); setNotice(''); }
                }}
                className="text-textSecondary text-sm hover:text-textPrimary mb-8 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ background: role === 'TEACHER' ? '#FFF2EF' : '#F5F3FF' }}
                >
                  {role === 'TEACHER'
                    ? <GraduationCap className="w-6 h-6" style={{ color: ACCENT }} />
                    : <User className="w-6 h-6" style={{ color: '#A78BFA' }} />}
                </div>
                <div>
                  <div className="font-black text-xl text-textPrimary tracking-tight">
                    {role === 'TEACHER' ? 'Teacher' : 'Student'}{' '}
                    {mode === 'register' ? 'Registration' : mode === 'forgot' ? 'Forgot Password' : 'Sign In'}
                  </div>
                  <div className="text-textSecondary text-sm">
                    {mode === 'register' ? 'Create account — teacher will approve'
                      : mode === 'forgot' ? 'Your teacher will be notified to reset your password'
                      : 'Enter your credentials to continue'}
                  </div>
                </div>
              </div>

              {/* Forgot password */}
              {mode === 'forgot' && (
                <div className="animate-slide-up">
                  {forgotDone ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                      <div className="font-bold text-textPrimary mb-1">Request sent!</div>
                      <div className="text-textSecondary text-sm">Your teacher has been notified. They will set a new password and share it with you.</div>
                      <button
                        onClick={() => { setMode('login'); setForgotDone(false); setForgotUpn(''); }}
                        className="mt-4 text-sm font-semibold hover:underline"
                        style={{ color: ACCENT }}
                      >
                        Back to sign in
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgot} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-textSecondary mb-1.5">Phone Number</label>
                        <input type="text" className="input-base" placeholder="Your phone number" value={forgotUpn}
                          onChange={(e) => setForgotUpn(e.target.value)} required />
                      </div>
                      {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm font-medium">{error}</div>}
                      <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60 text-white hover:opacity-90"
                        style={{ background: ACCENT }}>
                        {loading ? 'Sending...' : 'Request Password Reset'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Login / Register */}
              {mode !== 'forgot' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {(role === 'TEACHER' || mode === 'login') && (
                    <div>
                      <label className="block text-sm font-semibold text-textSecondary mb-1.5">
                        {role === 'TEACHER' ? 'Email' : 'Phone Number'}
                      </label>
                      <input
                        type="text"
                        className="input-base"
                        placeholder={role === 'TEACHER' ? 'teacher@email.com' : 'phone number'}
                        value={upn}
                        onChange={(e) => setUpn(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  {role === 'STUDENT' && mode === 'register' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-textSecondary mb-1.5">Student Full Name *</label>
                        <input className="input-base" placeholder="Student's full name" value={reg.fullname}
                          onChange={(e) => setReg((r) => ({ ...r, fullname: e.target.value }))} required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-textSecondary mb-1.5">Sex</label>
                          <select className="input-base" value={reg.sex}
                            onChange={(e) => setReg((r) => ({ ...r, sex: e.target.value as 'MALE' | 'FEMALE' }))}>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-textSecondary mb-1.5">Date of Birth *</label>
                          <input type="date" className="input-base" value={reg.dateOfBirth}
                            onChange={(e) => setReg((r) => ({ ...r, dateOfBirth: e.target.value }))} required />
                        </div>
                      </div>
                      <div className="rounded-xl border border-border p-4 space-y-3">
                        <label className="block text-xs font-bold text-textSecondary uppercase tracking-wide">Parent / Guardian</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input-base" placeholder="Parent name *"
                            value={reg.parents[0].name} onChange={(e) => setParentField(0, 'name', e.target.value)} required />
                          <input className="input-base" placeholder="Phone number *"
                            value={reg.parents[0].phoneNumber} onChange={(e) => setParentField(0, 'phoneNumber', e.target.value)} required />
                          <select className="input-base col-span-2" value={reg.parents[0].type}
                            onChange={(e) => setParentField(0, 'type', e.target.value)}>
                            <option value="FATHER">Father</option>
                            <option value="MOTHER">Mother</option>
                          </select>
                        </div>
                        <p className="text-xs text-textSecondary">Parent&apos;s phone will be used as the login.</p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-textSecondary mb-1.5">Password</label>
                    <input
                      type="password"
                      className="input-base"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {notice && (
                    <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">{notice}</div>
                  )}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm font-medium">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3 text-[15px] disabled:opacity-60 text-white hover:opacity-90"
                    style={{ background: ACCENT }}
                  >
                    {loading
                      ? (mode === 'register' ? 'Creating account...' : 'Signing in...')
                      : (mode === 'register' ? 'Create Account' : 'Sign In')}
                  </button>

                  {role === 'STUDENT' && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setNotice(''); }}
                        className="w-full text-sm text-textSecondary hover:text-textPrimary transition-colors py-1"
                      >
                        {mode === 'login' ? 'Create a student account' : 'Back to sign in'}
                      </button>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => { setMode('forgot'); setError(''); setForgotDone(false); }}
                          className="w-full text-sm font-medium transition-colors py-1 hover:opacity-70"
                          style={{ color: ACCENT }}
                        >
                          Forgot password?
                        </button>
                      )}
                    </>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
