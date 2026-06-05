'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAdminUser, AdminUser } from '@/lib/admin-auth';
import AdminShell from '@/components/AdminShell';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { adminTheme } from '@/lib/theme';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/admin': { title: 'Dashboard', subtitle: 'School-wide overview' },
  '/admin/teachers': { title: 'Teachers', subtitle: 'Approve, deactivate and manage teacher accounts' },
  '/admin/classes': { title: 'Classes', subtitle: 'Create classes and assign teachers' },
  '/admin/students': { title: 'Students', subtitle: 'Filter by class and bulk-approve registrations' },
  '/admin/homework': { title: 'Homework', subtitle: 'Cross-teacher homework overview' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined);

  useEffect(() => {
    // Bypass auth gate for login page to prevent redirect loop
    if (pathname === '/admin/login') return;

    // D-04: detect wrong-role cookie before checking admin token
    function getAnyRoleCookie(): string | null {
      if (typeof window === 'undefined') return null;
      for (const name of ['teacher-token', 'student-token']) {
        const c = document.cookie.split(';').find(s => s.trim().startsWith(name + '='));
        if (c) return c.split('=').slice(1).join('=');
      }
      return null;
    }
    // SECURITY NOTE (WR-01): JWT role is decoded client-side WITHOUT signature
    // verification. This is intentional defense-in-depth UX only — it prevents
    // rendering the admin shell for obviously wrong roles. The backend is the
    // sole authoritative authorization gate; every API call validates the JWT
    // signature server-side and returns 401/403 for invalid or forged tokens.
    function decodeJwtRole(token: string): string | null {
      try { return JSON.parse(atob(token.split('.')[1])).role ?? null; } catch { return null; }
    }

    const u = getAdminUser();
    if (!u || u.role !== 'ADMIN') {
      // If a non-admin role cookie exists, show 403 instead of redirecting to login
      const wrongRoleCookie = getAnyRoleCookie();
      const wrongRole = wrongRoleCookie ? decodeJwtRole(wrongRoleCookie) : null;
      if (wrongRole && wrongRole !== 'ADMIN') {
        router.replace('/403');
        return;
      }
      router.replace('/admin/login');
      return;
    }
    setUser(u);
  }, [pathname, router]);

  // Login page — render children directly inside theme (no AdminShell)
  if (pathname === '/admin/login') {
    return (
      <ThemeProvider theme={adminTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    );
  }

  // Loading spinner while checking auth
  if (user === undefined) return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 1280 }}>
        <CircularProgress size={32} />
      </Box>
    </ThemeProvider>
  );

  // Null while redirect is in flight
  if (!user) return null;

  const meta = TITLES[pathname] ?? { title: 'Admin Portal', subtitle: undefined };

  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <AdminShell user={user} title={meta.title} subtitle={meta.subtitle}>
        {children}
      </AdminShell>
    </ThemeProvider>
  );
}
