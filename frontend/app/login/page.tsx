'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register, RegisterInput } from '@/lib/auth';
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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [reg, setReg] = useState(emptyReg());

  function setParentField(i: number, k: string, v: string) {
    setReg((r) => { const ps = [...r.parents]; ps[i] = { ...ps[i], [k]: v }; return { ...r, parents: ps }; });
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
    <div className="min-h-screen flex" style={{ minWidth: 1024 }}>
      {/* Left panel */}
      <div className="w-1/2 relative overflow-hidden flex flex-col justify-between p-12"
        style={{ background: gradients.gameBg }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-primary font-black text-lg">K</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-wide">Katie English</span>
          </div>
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Learn English<br />
            <span style={{ color: colors.accent }}>the fun way</span>
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-sm">
            Blend phonemes, complete homework, and track your progress with interactive lessons.
          </p>
        </div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${colors.purple}, transparent)` }} />
        <div className="absolute top-40 -right-10 w-40 h-40 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${colors.secondary}, transparent)` }} />
        <div className="text-white/60 text-sm">© 2024 Katie English Learning Platform</div>
      </div>

      {/* Right panel */}
      <div className="w-1/2 bg-background flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          {!role ? (
            <div>
              <h2 className="text-3xl font-black text-textPrimary mb-2">Welcome back</h2>
              <p className="text-textSecondary mb-10">Who are you logging in as?</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setRole('TEACHER'); setMode('login'); }}
                  className="group flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border-2 border-border hover:border-primary hover:shadow-lg transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform"
                    style={{ background: gradients.primaryPurple }}>
                    👩‍🏫
                  </div>
                  <div>
                    <div className="font-bold text-textPrimary text-lg">Teacher</div>
                    <div className="text-textSecondary text-sm">Manage classes</div>
                  </div>
                </button>
                <button
                  onClick={() => { setRole('STUDENT'); setMode('login'); }}
                  className="group flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border-2 border-border hover:border-accent hover:shadow-lg transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform"
                    style={{ background: gradients.pinkHighlight }}>
                    🧒
                  </div>
                  <div>
                    <div className="font-bold text-textPrimary text-lg">Student</div>
                    <div className="text-textSecondary text-sm">Do homework</div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => { setRole(null); setError(''); setNotice(''); }} className="text-textSecondary text-sm hover:text-textPrimary mb-8 flex items-center gap-1">
                ← Back
              </button>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: role === 'TEACHER' ? gradients.primaryPurple : gradients.pinkHighlight }}>
                  {role === 'TEACHER' ? '👩‍🏫' : '🧒'}
                </div>
                <div>
                  <div className="font-black text-xl text-textPrimary">
                    {role === 'TEACHER' ? 'Teacher' : 'Student'} {mode === 'register' ? 'Register' : 'Login'}
                  </div>
                  <div className="text-textSecondary text-sm">
                    {mode === 'register' ? 'Create account — teacher will approve' : 'Enter your credentials'}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {(role === 'TEACHER' || mode === 'login') && (
                  <div>
                    <label className="block text-sm font-semibold text-textSecondary mb-1">
                      {role === 'TEACHER' ? 'Email' : 'Phone Number'}
                    </label>
                    <input
                      type="text"
                      className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
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
                      <label className="block text-sm font-semibold text-textSecondary mb-1">Student Full Name *</label>
                      <input className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-brand-pink focus:outline-none"
                        placeholder="Student's full name" value={reg.fullname}
                        onChange={(e) => setReg((r) => ({ ...r, fullname: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-textSecondary mb-1">Sex</label>
                        <select className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm"
                          value={reg.sex} onChange={(e) => setReg((r) => ({ ...r, sex: e.target.value as 'MALE' | 'FEMALE' }))}>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-textSecondary mb-1">Date of Birth *</label>
                        <input type="date" className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm"
                          value={reg.dateOfBirth} onChange={(e) => setReg((r) => ({ ...r, dateOfBirth: e.target.value }))} required />
                      </div>
                    </div>
                    <div className="border-t border-border pt-3">
                      <label className="block text-sm font-semibold text-textSecondary mb-2">Parent / Guardian</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="border-2 border-border rounded-xl px-3 py-2 text-sm" placeholder="Parent name *"
                          value={reg.parents[0].name} onChange={(e) => setParentField(0, 'name', e.target.value)} required />
                        <input className="border-2 border-border rounded-xl px-3 py-2 text-sm" placeholder="Phone number *"
                          value={reg.parents[0].phoneNumber} onChange={(e) => setParentField(0, 'phoneNumber', e.target.value)} required />
                        <select className="border-2 border-border rounded-xl px-3 py-2 text-sm col-span-2"
                          value={reg.parents[0].type} onChange={(e) => setParentField(0, 'type', e.target.value)}>
                          <option value="FATHER">Father</option>
                          <option value="MOTHER">Mother</option>
                        </select>
                      </div>
                      <p className="text-xs text-textSecondary mt-1">Parent&apos;s phone number will be used as the login.</p>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-textSecondary mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {notice && (
                  <div className="bg-brand-green/10 border border-brand-green/40 text-brand-green rounded-xl px-4 py-3 text-sm">{notice}</div>
                )}
                {error && (
                  <div className="bg-highlight/10 border border-highlight/40 text-highlight rounded-xl px-4 py-3 text-sm">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
                  style={{ background: role === 'TEACHER' ? gradients.primaryPurple : gradients.pinkHighlight }}
                >
                  {loading ? (mode === 'register' ? 'Creating account...' : 'Signing in...') : (mode === 'register' ? 'Create Account' : 'Sign In')}
                </button>
                {role === 'STUDENT' && (
                  <button
                    type="button"
                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setNotice(''); }}
                    className="w-full text-sm text-textSecondary hover:text-textPrimary"
                  >
                    {mode === 'login' ? 'Create a student account' : 'Back to sign in'}
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
