'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, changePassword, AuthUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutDashboard, School, Users, BookOpen, Video, KeyRound, LogOut, X } from 'lucide-react';

const ACCENT = '#F0623A';
const ACCENT_BG = 'rgba(240, 98, 58, 0.12)';
const ACCENT_TEXT = '#FDA087';

const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: '/teacher', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'GENERAL',
    items: [
      { href: '/teacher/classes', label: 'Classes', icon: School },
      { href: '/teacher/students', label: 'Students', icon: Users },
      { href: '/teacher/homework', label: 'Homework', icon: BookOpen },
      { href: '/teacher/sessions', label: 'Sessions', icon: Video },
    ],
  },
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
  const [showUserMenu, setShowUserMenu] = useState(false);
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
      setTimeout(() => { setShowPwForm(false); setPwSuccess(false); setShowUserMenu(false); }, 1800);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed');
    } finally { setPwLoading(false); }
  }

  return (
    <div className="flex h-screen bg-background" style={{ minWidth: 1280 }}>
      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col"
        style={{ background: '#0C1220', boxShadow: '1px 0 0 rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <div className="px-5 pt-7 pb-6">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: ACCENT }}
            >
              <span className="text-white font-black text-sm">K</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight tracking-tight">Katie English</div>
              <div className="text-slate-500 text-[10px] tracking-wide mt-0.5">Teacher Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.label && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/teacher' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                        active ? '' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                      }`}
                      style={active ? { background: ACCENT_BG, color: ACCENT_TEXT } : {}}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                          style={{ background: ACCENT }}
                        />
                      )}
                      <item.icon className="w-[15px] h-[15px] shrink-0" />
                      <span className={active ? 'font-semibold' : ''}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="px-5 pb-5 pt-3">
          <div className="border-t border-white/[0.07] mb-3" />
          <p className="text-[10px] text-slate-600 text-center">© Katie English</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {/* Page header */}
          <div className="px-8 pt-8 pb-6 flex items-start justify-between">
            <div>
              <p className="text-xs text-textSecondary mb-2 flex items-center gap-1.5">
                Teacher Portal
                <span className="text-textSecondary/40 mx-0.5">›</span>
                <span className="text-textPrimary/50 font-medium">{title}</span>
              </p>
              <h1 className="text-[26px] font-black text-textPrimary tracking-tight leading-none">{title}</h1>
              {subtitle && <p className="text-sm text-textSecondary mt-1.5">{subtitle}</p>}
            </div>

            {/* User avatar */}
            <div className="relative flex-shrink-0 mt-1">
              <button
                onClick={() => { setShowUserMenu((v) => !v); if (!showUserMenu) setShowPwForm(false); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white transition-all hover:opacity-80"
                style={{ background: ACCENT }}
              >
                {user.upn[0].toUpperCase()}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-card-hover border border-border z-50 p-4 animate-slide-up">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: ACCENT }}
                      >
                        {user.upn[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-textPrimary text-sm font-semibold truncate max-w-[160px]">{user.upn}</div>
                        <div className="text-textSecondary text-xs">Teacher</div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); setShowPwForm(false); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-textSecondary hover:bg-background transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setShowPwForm((v) => !v); setPwError(''); setPwSuccess(false); }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-textSecondary hover:text-textPrimary hover:bg-background rounded-xl transition-colors mb-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Change password
                  </button>

                  {showPwForm && (
                    <form onSubmit={handleChangePassword} className="mb-2 px-1 space-y-2 animate-slide-up">
                      <Input
                        type="password"
                        placeholder="Current password"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        required
                        className="h-8 text-xs rounded-xl border-border"
                      />
                      <Input
                        type="password"
                        placeholder="New password (min 6)"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        required
                        minLength={6}
                        className="h-8 text-xs rounded-xl border-border"
                      />
                      {pwError && <p className="text-[10px] text-red-500 px-1">{pwError}</p>}
                      {pwSuccess && <p className="text-[10px] text-green-500 px-1">Password updated!</p>}
                      <Button
                        type="submit"
                        disabled={pwLoading}
                        size="sm"
                        className="w-full text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90"
                        style={{ background: ACCENT }}
                      >
                        {pwLoading ? 'Updating...' : 'Update password'}
                      </Button>
                    </form>
                  )}

                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
