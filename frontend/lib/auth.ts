const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function parseApiError(res: Response): Promise<never> {
  const text = await res.text();
  let message = text;
  try {
    const json = JSON.parse(text);
    message = Array.isArray(json.message) ? json.message.join(', ') : (json.message ?? text);
  } catch { /* not JSON */ }
  throw new Error(message || 'An error occurred. Please try again.');
}

export interface AuthUser {
  id: number;
  upn: string;
  role: 'TEACHER' | 'STUDENT';
  studentId?: number;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Expire the client-written cookie as well
  document.cookie = 'teacher-token=; path=/; max-age=0';
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function login(upn: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upn, password }),
  });
  if (!res.ok) return parseApiError(res);
  const data = await res.json();
  setAuth(data.token, data.user);
  return data.user as AuthUser;
}

export interface RegisterInput {
  upn: string;
  password: string;
  fullname: string;
  sex: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  classId?: number;
  parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[];
}

export async function register(data: RegisterInput): Promise<{ pending: true }> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return parseApiError(res);
  return { pending: true };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) return parseApiError(res);
}

export async function forgotPassword(upn: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upn }),
  });
  if (!res.ok) return parseApiError(res);
}
