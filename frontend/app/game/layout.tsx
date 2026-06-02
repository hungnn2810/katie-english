'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@mui/material/styles';
import { studentTheme } from '@/lib/student-theme';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

function getStudentToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = document.cookie.split(';').find(c => c.trim().startsWith('student-token='));
  return raw ? raw.split('=').slice(1).join('=') : null;
}

function decodeJwtRole(token: string): string | null {
  try { return JSON.parse(atob(token.split('.')[1])).role ?? null; } catch { return null; }
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Bypass auth check on the login page to prevent redirect loop
    if (pathname === '/game/login') {
      setAuthed(true);
      return;
    }
    const t = getStudentToken();
    const role = t ? decodeJwtRole(t) : null;
    if (role === 'STUDENT') {
      setAuthed(true);
    } else {
      window.location.replace('/game/login');
      setAuthed(false);
    }
  }, [pathname]);

  // Loading state while checking auth
  if (authed === undefined) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  // Redirect in flight
  if (authed === false) return null;

  return (
    <ThemeProvider theme={studentTheme}>
      {children}
    </ThemeProvider>
  );
}
