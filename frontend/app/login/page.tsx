'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register, forgotPassword, RegisterInput } from '@/lib/auth';
import { gradients, colors } from '@/lib/colors';

type Role = 'TEACHER' | 'STUDENT';
type ParentType = 'FATHER' | 'MOTHER';
const emptyParent = () => ({ name: '', phoneNumber: '', type: 'FATHER' as ParentType });
const emptyReg = (): Omit<RegisterInput, 'upn' | 'password'> => ({
  fullname: '', sex: 'MALE', dateOfBirth: '', classId: undefined, parents: [emptyParent()],
});

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
      {/* Left panel */}
      <div className="w-1/2 relative overflow-hidden flex flex-col justify-between p-12"
        style={{ background: gradients.gameBg }}>
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${colors.primary}, transparent)` }} />
        <div className="absolute bottom-20 -right-20 w-80 h-80 rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${colors.purple}, transparent)` }} />
        <div className="absolute top-1/2 right-10 w-40 h-40 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${colors.secondary}, transparent)` }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: gradients.pinkAccent }}>
              <span className="text-white font-black text-lg">K</span>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">Katie English</span>
          </div>
          <h1 className="text-5xl font-black text-white leading-[1.1] mb-5 tracking-tight">
            Learn English<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${colors.accent}, ${colors.pink})` }}>
              the fun way
            </span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            Blend phonemes, complete homework, and track your progress with interactive lessons.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 flex flex-col gap-3">
          {[
            { icon: '🎯', text: 'Interactive phonics blending' },
            { icon: '📊', text: 'Track student progress' },
            { icon: '📚', text: 'Assign and manage homework' },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm flex-shrink-0">{f.icon}</div>
              <span className="text-white/50 text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-1/2 bg-white flex items-center justify-center p-12">
        <div className="w-full max-w-md animate-fade-in">
          {!role ? (
            <div>
              <div className="mb-10">
                <h2 className="text-2xl font-black text-textPrimary mb-2 tracking-tight">Welcome back</h2>
                <p className="text-textSecondary text-sm">Who are you signing in as?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setRole('TEACHER'); setMode('login'); }}
                  className="group flex flex-col items-center gap-4 p-8 bg-background rounded-2xl border-2 border-border hover:border-primary hover:shadow-card-hover transition-all duration-200"
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-200"
                    style={{ background: gradients.primaryPurple }}>
                    👩‍🏫
                  </div>
                  <div>
                    <div className="font-bold text-textPrimary">Teacher</div>
                    <div className="text-textSecondary text-sm">Manage classes</div>
                  </div>
                </button>
                <button
                  onClick={() => { setRole('STUDENT'); setMode('login'); }}
                  className="group flex flex-col items-center gap-4 p-8 bg-background rounded-2xl border-2 border-border hover:border-accent hover:shadow-card-hover transition-all duration-200"
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-200"
                    style={{ background: gradients.pinkHighlight }}>
                    🧒
                  </div>
                  <div>
                    <div className="font-bold text-textPrimary">Student</div>
                    <div className="text-textSecondary text-sm">Do homework</div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-slide-up">
              <button
                onClick={() => { if (mode === 'forgot') { setMode('login'); setForgotDone(false); setForgotUpn(''); setError(''); } else { setRole(null); setError(''); setNotice(''); } }}
                className="text-textSecondary text-sm hover:text-textPrimary mb-8 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                  style={{ background: role === 'TEACHER' ? gradients.primaryPurple : gradients.pinkHighlight }}>
                  {role === 'TEACHER' ? '👩‍🏫' : '🧒'}
                </div>
                <div>
                  <div className="font-black text-xl text-textPrimary tracking-tight">
                    {role === 'TEACHER' ? 'Teacher' : 'Student'}{' '}
                    {mode === 'register' ? 'Registration' : mode === 'forgot' ? 'Forgot Password' : 'Sign In'}
                  </div>
                  <div className="text-textSecondary text-sm">
                    {mode === 'register' ? 'Create account — teacher will approve'
                      : mode === 'forgot' ? 'Your teacher will be notified to set a new password'
                      : 'Enter your credentials to continue'}
                  </div>
                </div>
              </div>

              {/* Forgot password flow */}
              {mode === 'forgot' && (
                <div className="animate-slide-up">
                  {forgotDone ? (
                    <div className="bg-brand-green/10 border border-brand-green/30 rounded-2xl p-6 text-center">
                      <div className="text-3xl mb-3">✅</div>
                      <div className="font-bold text-textPrimary mb-1">Request sent!</div>
                      <div className="text-textSecondary text-sm">Your teacher has been notified. They will set a new password and share it with you.</div>
                      <button onClick={() => { setMode('login'); setForgotDone(false); setForgotUpn(''); }} className="mt-4 text-sm text-primary hover:underline">
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
                      {error && <div className="bg-highlight/10 border border-highlight/30 text-highlight rounded-xl px-4 py-3 text-sm font-medium">{error}</div>}
                      <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60"
                        style={{ background: gradients.pinkHighlight }}>
                        {loading ? 'Sending...' : 'Request Password Reset'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Normal login/register flow */}
              {mode !== 'forgot' && <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div className="border-t border-border pt-4">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Parent / Guardian</label>
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
                      <p className="text-xs text-textSecondary mt-1.5">Parent&apos;s phone will be used as the login.</p>
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
                  <div className="bg-brand-green/10 border border-brand-green/30 text-brand-green rounded-xl px-4 py-3 text-sm font-medium">{notice}</div>
                )}
                {error && (
                  <div className="bg-highlight/10 border border-highlight/30 text-highlight rounded-xl px-4 py-3 text-sm font-medium">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-[15px] disabled:opacity-60"
                  style={{ background: role === 'TEACHER' ? gradients.primaryPurple : gradients.pinkHighlight }}
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
                        className="w-full text-sm text-textSecondary hover:text-primary transition-colors py-1"
                      >
                        Forgot password?
                      </button>
                    )}
                  </>
                )}
              </form>}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
