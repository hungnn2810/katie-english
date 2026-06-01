'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, AuthUser } from '@/lib/auth';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

interface Props {
  requiredRole?: 'TEACHER' | 'STUDENT';
  children: (user: AuthUser) => React.ReactNode;
}

export default function AuthGate({ requiredRole, children }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    if (requiredRole && u.role !== requiredRole) {
      router.replace(u.role === 'TEACHER' ? '/teacher' : '/game/homework');
      return;
    }
    setUser(u);
  }, [router, requiredRole]);

  if (user === undefined) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={32} />
    </Box>
  );
  if (!user) return null;
  return <>{children(user)}</>;
}
