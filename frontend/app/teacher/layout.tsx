'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, AuthUser } from '@/lib/auth';
import TeacherShell from '@/components/TeacherShell';
import { TeacherUserContext } from './_context';

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
  }, []);

  if (user === undefined) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ minWidth: 1280 }}>
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
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
