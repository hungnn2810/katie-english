'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, changePassword, AuthUser } from '@/lib/auth';
import { gradients } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const nav = [
  { href: '/teacher', label: 'Dashboard', icon: '🏠' },
  { href: '/teacher/classes', label: 'Classes', icon: '🏫' },
  { href: '/teacher/students', label: 'Students', icon: '👦' },
  { href: '/teacher/homework', label: 'Homework', icon: '📚' },
  { href: '/teacher/sessions', label: 'Sessions', icon: '🎬' },
];

interface Props {
  user: AuthUser;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function TeacherShell({ user, children, title, subtitle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  function logout() { clearAuth(); router.push('/login'); }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(''); setPwSuccess(false); setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw(''); setNewPw('');
      setTimeout(() => { setShowPwForm(false); setPwSuccess(false); }, 1800);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed');
    } finally { setPwLoading(false); }
  }

  return (
    <div className="flex h-screen bg-background" style={{ minWidth: 1280 }}>
      {/* Sidebar */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(180deg, #0C1220 0%, #131E30 100%)', boxShadow: '1px 0 0 rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: gradients.pinkAccent }}
            >
              <span className="text-white font-black text-base">K</span>
            </div>
            <div>
              <div className="text-white font-bold text-[15px] leading-tight tracking-tight">Katie English</div>
              <div className="text-slate-500 text-[11px] tracking-wide mt-0.5">Teacher Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/teacher' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
                style={active ? { background: 'rgba(79,157,255,0.14)', color: '#93C5FD' } : {}}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: '#4F9DFF' }}
                  />
                )}
                <span className="text-[15px] leading-none">{item.icon}</span>
                <span className={active ? 'text-blue-200 font-semibold' : ''}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-3 pb-5 pt-4">
          <div className="border-t border-white/[0.07] mb-4" />
          <div className="flex items-center gap-3 px-3 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: gradients.primaryPurple }}
            >
              {user.upn[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 text-xs font-semibold truncate">{user.upn}</div>
              <div className="text-slate-500 text-[11px]">Teacher</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowPwForm((v) => !v); setPwError(''); setPwSuccess(false); }}
            className="w-full justify-start text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] text-xs px-3 mb-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Change password
          </Button>

          {showPwForm && (
            <form onSubmit={handleChangePassword} className="mb-1 px-1 animate-slide-up space-y-1.5">
              <Input
                type="password"
                placeholder="Current password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                className="bg-white/[0.07] border-white/[0.10] text-slate-200 placeholder:text-slate-600 focus-visible:border-primary/60 h-7 text-xs rounded-lg"
              />
              <Input
                type="password"
                placeholder="New password (min 6)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={6}
                className="bg-white/[0.07] border-white/[0.10] text-slate-200 placeholder:text-slate-600 focus-visible:border-primary/60 h-7 text-xs rounded-lg"
              />
              {pwError && <p className="text-[10px] text-red-400 px-1">{pwError}</p>}
              {pwSuccess && <p className="text-[10px] text-green-400 px-1">Password updated!</p>}
              <Button
                type="submit"
                disabled={pwLoading}
                size="sm"
                className="w-full text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: 'rgba(79,157,255,0.25)', border: '1px solid rgba(79,157,255,0.3)' }}
              >
                {pwLoading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] text-xs px-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-border px-8 py-[18px] flex items-center justify-between flex-shrink-0"
          style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <div>
            <h1 className="text-lg font-bold text-textPrimary tracking-tight">{title}</h1>
            {subtitle && <p className="text-textSecondary text-sm mt-0.5">{subtitle}</p>}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
