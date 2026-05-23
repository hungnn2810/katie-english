'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminAuth, AdminUser } from '@/lib/admin-auth';
import { LayoutDashboard, Users, School, GraduationCap, LogOut, X } from 'lucide-react';

const ACCENT = '#4F9DFF';
const ACCENT_BG = 'rgba(79, 157, 255, 0.12)';
const ACCENT_TEXT = '#60A5FA';

const NAV_GROUPS = [
  {
    label: 'GENERAL',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/teachers', label: 'Teachers', icon: Users },
      { href: '/admin/classes', label: 'Classes', icon: School },
      { href: '/admin/students', label: 'Students', icon: GraduationCap },
    ],
  },
];

interface Props {
  user: AdminUser;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AdminShell({ user, children, title, subtitle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  function logout() { clearAdminAuth(); router.push('/admin/login'); }

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
              <div className="text-slate-500 text-[10px] tracking-wide mt-0.5">Admin Portal</div>
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
                  const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
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
                      <span className={active ? 'font-bold' : ''}>{item.label}</span>
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
                Admin Portal
                <span className="text-textSecondary/40 mx-0.5">›</span>
                <span className="text-textPrimary/50 font-medium">{title}</span>
              </p>
              <h1 className="text-[26px] font-bold text-textPrimary tracking-tight leading-none">{title}</h1>
              {subtitle && <p className="text-sm text-textSecondary mt-1.5">{subtitle}</p>}
            </div>

            {/* User avatar */}
            <div className="relative flex-shrink-0 mt-1">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white transition-all hover:opacity-80"
                style={{ background: ACCENT }}
              >
                {user.email[0].toUpperCase()}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-card-hover border border-border z-50 p-4 animate-slide-up">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: ACCENT }}
                      >
                        {user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-textPrimary text-sm font-semibold truncate max-w-[160px]">{user.email}</div>
                        <div className="text-textSecondary text-xs">Administrator</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowUserMenu(false)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-textSecondary hover:bg-background transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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
