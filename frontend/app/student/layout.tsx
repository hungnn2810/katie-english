'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@mui/material/styles';
import { studentTheme } from '@/lib/student-theme';
import { gradients } from '@/lib/colors';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

function getStudentToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = document.cookie.split(';').find(c => c.trim().startsWith('student-token='));
  return raw ? raw.split('=').slice(1).join('=') : null;
}

// SECURITY NOTE (WR-01): JWT role is decoded client-side WITHOUT signature
// verification. This is intentional defense-in-depth UX only — it prevents
// rendering the game shell for obviously wrong roles. The backend is the
// sole authoritative authorization gate; every API call validates the JWT
// signature server-side and returns 401/403 for invalid or forged tokens.
function decodeJwtRole(token: string): string | null {
  try { return JSON.parse(atob(token.split('.')[1])).role ?? null; } catch { return null; }
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Bypass auth check on the login page to prevent redirect loop
    if (pathname === '/student/login') {
      setAuthed(true);
      return;
    }
    const t = getStudentToken();
    const role = t ? decodeJwtRole(t) : null;
    if (role === 'STUDENT') {
      setAuthed(true);
    } else {
      window.location.replace('/student/login');
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
      <Box sx={{ minHeight: '100vh', background: gradients.gameBg, position: 'relative', overflow: 'hidden' }}>
        {/* Jolly-Phonics-style soft blob decoration */}
        <Box
          component="svg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          sx={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="-60" cy="500" rx="200" ry="270" fill="#C4B5FD" opacity="0.22" transform="rotate(-15 -60 500)" />
          <ellipse cx="1520" cy="160" rx="180" ry="250" fill="#C4B5FD" opacity="0.18" transform="rotate(12 1520 160)" />
          <ellipse cx="170" cy="870" rx="160" ry="220" fill="#C4B5FD" opacity="0.16" transform="rotate(20 170 870)" />
          <ellipse cx="1370" cy="700" rx="190" ry="260" fill="#C4B5FD" opacity="0.20" transform="rotate(-18 1370 700)" />
          <ellipse cx="830" cy="-30" rx="140" ry="190" fill="#C4B5FD" opacity="0.13" transform="rotate(5 830 -30)" />
          <ellipse cx="1100" cy="450" rx="100" ry="140" fill="#A78BFA" opacity="0.09" transform="rotate(-10 1100 450)" />
          <ellipse cx="320" cy="200" rx="90" ry="120" fill="#A78BFA" opacity="0.08" transform="rotate(25 320 200)" />
        </Box>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
