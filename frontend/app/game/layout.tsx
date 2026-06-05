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
      <Box sx={{ minHeight: '100vh', bgcolor: '#2D0B2E', position: 'relative', overflow: 'hidden' }}>
        {/* Concentric-circle arc decoration */}
        <Box
          component="svg"
          sx={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', opacity: 0.07, zIndex: 0 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {[150, 230, 320].map((r) => (
            <circle key={`l${r}`} cx="-30" cy="320" r={r} fill="none" stroke="white" strokeWidth="1" />
          ))}
          {[150, 230, 320].map((r) => (
            <circle key={`r${r}`} cx="420" cy="320" r={r} fill="none" stroke="white" strokeWidth="1" />
          ))}
        </Box>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
