import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // T-12-02-02: return generic error, not raw backend message
    return NextResponse.json({ error: 'Invalid email or password' }, { status: res.status });
  }

  const data = await res.json();
  const cookieStore = cookies();
  cookieStore.set('admin-token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    ...(process.env.NODE_ENV === 'production' && { domain: 'admin.katie.vn' }),
  });

  return NextResponse.json(data);
}
