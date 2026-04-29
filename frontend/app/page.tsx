'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'TEACHER') router.replace('/teacher');
    else router.replace('/game/homework');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
