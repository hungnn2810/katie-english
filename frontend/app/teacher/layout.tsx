'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, AuthUser } from '@/lib/auth';
import TeacherShell from '@/components/TeacherShell';
import { TeacherUserContext } from './_context';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

const TITLES: Record<string, string> = {
  '/teacher': 'Dashboard',
  '/teacher/classes': 'Classes',
  '/teacher/students': 'Students',
  '/teacher/homework': 'Homework',
  '/teacher/sessions': 'Sessions',
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'TEACHER') { router.replace('/login'); return; }
    setUser(u);
  }, [router]);

  if (user === undefined) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 1280 }}>
      <CircularProgress size={32} />
    </Box>
  );
  if (!user) return null;

  return (
    <TeacherUserContext.Provider value={user}>
      <TeacherShell user={user} title={TITLES[pathname] ?? 'Teacher Portal'}>
        {children}
      </TeacherShell>
    </TeacherUserContext.Provider>
  );
}
