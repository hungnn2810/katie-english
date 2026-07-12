'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getUser, AuthUser } from '@/lib/auth';
import TeacherShell from '@/components/TeacherShell';
import { TeacherUserContext } from './_context';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { teacherTheme } from '@/lib/theme';

export default function TeacherLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const tNav = useTranslations('teacher.nav');
  const TITLES: Record<string, string> = {
    '/teacher': tNav('dashboard'),
    '/teacher/classes': tNav('classes'),
    '/teacher/students': tNav('students'),
    '/teacher/homework': tNav('homework'),
    '/teacher/sessions': tNav('sessions'),
    '/teacher/tuition': tNav('tuition'),
    '/teacher/import': tNav('import'),
  };

  useEffect(() => {
    // D-04: detect wrong-role cookie before checking teacher token
    function getAnyRoleCookie(): string | null {
      if (typeof window === 'undefined') return null;
      for (const name of ['admin-token', 'student-token']) {
        const c = document.cookie.split(';').find(s => s.trim().startsWith(name + '='));
        if (c) return c.split('=').slice(1).join('=');
      }
      return null;
    }
    // SECURITY NOTE (WR-01): JWT role is decoded client-side WITHOUT signature
    // verification. This is intentional defense-in-depth UX only — it prevents
    // rendering the teacher shell for obviously wrong roles. The backend is the
    // sole authoritative authorization gate; every API call validates the JWT
    // signature server-side and returns 401/403 for invalid or forged tokens.
    function decodeJwtRole(token: string): string | null {
      try { return JSON.parse(atob(token.split('.')[1])).role ?? null; } catch { return null; }
    }

    if (pathname === '/teacher/login') {
      setUser(null);
      return;
    }

    const u = getUser();
    if (!u || u.role !== 'TEACHER') {
      // If a non-teacher role cookie exists, show 403 instead of redirecting to login
      const wrongRoleCookie = getAnyRoleCookie();
      const wrongRole = wrongRoleCookie ? decodeJwtRole(wrongRoleCookie) : null;
      if (wrongRole && wrongRole !== 'TEACHER') {
        router.replace('/403');
        return;
      }
      router.replace('/teacher/login');
      return;
    }
    setUser(u);
  }, [router, pathname]);

  if (user === undefined) return (
    <ThemeProvider theme={teacherTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 1280 }}>
        <CircularProgress size={32} />
      </Box>
    </ThemeProvider>
  );
  if (!user) return <>{children}</>;

  return (
    <ThemeProvider theme={teacherTheme}>
      <CssBaseline />
      <TeacherUserContext.Provider value={user}>
        <TeacherShell user={user} title={TITLES[pathname] ?? 'Teacher Portal'}>
          {children}
        </TeacherShell>
      </TeacherUserContext.Provider>
    </ThemeProvider>
  );
}
