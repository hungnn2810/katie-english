export interface AdminUser {
  id: number;
  email: string;
  role: 'ADMIN';
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  const lsToken = localStorage.getItem('admin_token');
  if (lsToken) return lsToken;
  // Cookie fallback for sessions established via /api/auth/admin-login route handler
  return document.cookie.split(';').find(c => c.trim().startsWith('admin-token='))?.split('=').slice(1).join('=') ?? null;
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('admin_user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function setAdminAuth(token: string, user: AdminUser) {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
}

export function clearAdminAuth() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  // Expire the client-written cookie as well
  document.cookie = 'admin-token=; path=/; max-age=0';
}

export function adminAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

