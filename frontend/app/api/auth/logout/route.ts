import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(_req: Request) {
  const cookieStore = cookies();
  cookieStore.set('teacher-token', '', { maxAge: 0, path: '/' });
  cookieStore.set('admin-token', '', { maxAge: 0, path: '/' });
  cookieStore.set('student-token', '', { maxAge: 0, path: '/' });
  return NextResponse.json({ ok: true });
}
