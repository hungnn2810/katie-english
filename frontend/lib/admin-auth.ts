const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function parseApiError(res: Response): Promise<never> {
  const text = await res.text();
  let message = text;
  try {
    const json = JSON.parse(text);
    message = Array.isArray(json.message) ? json.message.join(', ') : (json.message ?? text);
  } catch { /* not JSON */ }
  throw new Error(message || 'An error occurred. Please try again.');
}

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
  // Dual-write: non-HttpOnly cookie for client-side API calls (T-12-02-03: transitional fallback)
  document.cookie = `admin-token=${token}; path=/; SameSite=Lax; max-age=604800`;
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

export async function adminLogin(email: string, password: string): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return parseApiError(res);
  const data = await res.json();
  setAdminAuth(data.token, data.user);
  return data.user as AdminUser;
}
