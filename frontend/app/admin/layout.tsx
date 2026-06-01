'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAdminUser, AdminUser } from '@/lib/admin-auth';
import AdminShell from '@/components/AdminShell';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

const TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/teachers': 'Teachers',
  '/admin/classes': 'Classes',
  '/admin/students': 'Students',
  '/admin/homework': 'Homework',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined);

  useEffect(() => {
    // Bypass auth gate for login page to prevent redirect loop
    if (pathname === '/admin/login') return;
    const u = getAdminUser();
    if (!u || u.role !== 'ADMIN') { router.replace('/admin/login'); return; }
    setUser(u);
  }, [pathname, router]);

  // Login page — render children directly, no AdminShell
  if (pathname === '/admin/login') return <>{children}</>;

  // Loading spinner while checking auth
  if (user === undefined) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 1280 }}>
      <CircularProgress size={32} />
    </Box>
  );

  // Null while redirect is in flight
  if (!user) return null;

  return (
    <AdminShell user={user} title={TITLES[pathname] ?? 'Admin Portal'}>
      {children}
    </AdminShell>
  );
}
