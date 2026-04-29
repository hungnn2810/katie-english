'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, AuthUser } from '@/lib/auth';

const nav = [
  { href: '/teacher', label: 'Dashboard', icon: '🏠' },
  { href: '/teacher/classes', label: 'Classes', icon: '🏫' },
  { href: '/teacher/students', label: 'Students', icon: '👦' },
  { href: '/teacher/homework', label: 'Homework', icon: '📚' },
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

  function logout() { clearAuth(); router.push('/login'); }

  return (
    <div className="flex h-screen bg-gray-100" style={{ minWidth: 1280 }}>
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)' }}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-indigo-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center">
              <span className="text-indigo-900 font-black text-base">K</span>
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight">Katie English</div>
              <div className="text-indigo-300 text-xs">Teacher Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/teacher' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-500 bg-opacity-80 text-white shadow-lg'
                    : 'text-indigo-200 hover:bg-indigo-700 hover:bg-opacity-50 hover:text-white'
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-indigo-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.email}</div>
              <div className="text-indigo-300 text-xs">Teacher</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full text-left text-indigo-300 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-black text-gray-800">{title}</h1>
            {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
