'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/admin-auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, Lock } from 'lucide-react';

const ACCENT = '#4F9DFF';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email, password);
      router.push('/admin');
    } catch {
      // D-14 + T-06-02-04: never reveal which field failed.
      // Also handles HTTP 429 throttle responses — UI shows the same generic message
      // so the rate-limit counter is never exposed to the user (M-02).
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
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
            Admin Login<br />
            <span style={{ color: ACCENT }}>portal access</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Manage teachers, classes, students, and review platform-wide statistics.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-4">
          {[
            { icon: Shield, text: 'Secure administrator access' },
            { icon: Lock, text: 'Rate-limited login protection' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(79, 157, 255, 0.15)' }}
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
          <div className="mb-10">
            <h2 className="text-2xl font-black text-textPrimary mb-2 tracking-tight">Admin Login</h2>
            <p className="text-textSecondary text-sm">Platform administrator access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@katie.com"
                required
                autoComplete="email"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="rounded-xl"
              />
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-semibold text-white disabled:opacity-50"
              style={{ background: ACCENT }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
