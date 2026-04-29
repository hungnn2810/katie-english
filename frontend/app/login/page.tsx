'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';

type Role = 'TEACHER' | 'STUDENT';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(email, password);
      router.push(user.role === 'TEACHER' ? '/teacher' : '/student');
    } catch {
      setError('Invalid email or password');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex" style={{ minWidth: 1024 }}>
      {/* Left panel */}
      <div className="w-1/2 relative overflow-hidden flex flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%)' }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-indigo-700 font-black text-lg">K</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-wide">Katie English</span>
          </div>
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Learn English<br />
            <span className="text-yellow-400">the fun way</span>
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed max-w-sm">
            Blend phonemes, complete homework, and track your progress with interactive lessons.
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
        <div className="absolute top-40 -right-10 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #c7d2fe, transparent)' }} />
        <div className="text-indigo-300 text-sm">© 2024 Katie English Learning Platform</div>
      </div>

      {/* Right panel */}
      <div className="w-1/2 bg-gray-50 flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          {!role ? (
            <div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">Welcome back</h2>
              <p className="text-gray-500 mb-10">Who are you logging in as?</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRole('TEACHER')}
                  className="group flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-500 hover:shadow-lg transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                    👩‍🏫
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-lg">Teacher</div>
                    <div className="text-gray-400 text-sm">Manage classes</div>
                  </div>
                </button>
                <button
                  onClick={() => setRole('STUDENT')}
                  className="group flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-yellow-400 hover:shadow-lg transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
                    🧒
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-lg">Student</div>
                    <div className="text-gray-400 text-sm">Do homework</div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => setRole(null)} className="text-gray-400 text-sm hover:text-gray-600 mb-8 flex items-center gap-1">
                ← Back
              </button>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: role === 'TEACHER' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
                  {role === 'TEACHER' ? '👩‍🏫' : '🧒'}
                </div>
                <div>
                  <div className="font-black text-xl text-gray-800">{role === 'TEACHER' ? 'Teacher' : 'Student'} Login</div>
                  <div className="text-gray-400 text-sm">Enter your credentials</div>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none transition-colors"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none transition-colors"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
                  style={{ background: role === 'TEACHER' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'linear-gradient(135deg, #f093fb, #f5576c)' }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
