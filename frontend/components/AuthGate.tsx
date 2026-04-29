'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, AuthUser } from '@/lib/auth';

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
  }, []);

  if (user === undefined) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;
  if (!user) return null;
  return <>{children(user)}</>;
}
