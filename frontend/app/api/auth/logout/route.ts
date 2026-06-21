import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(_req: Request) {
  const cookieStore = cookies();
  const isProd = process.env.NODE_ENV === 'production';
  const clear = (name: string, domain?: string) =>
    cookieStore.set(name, '', {
      maxAge: 0,
      path: '/',
      ...(isProd && domain ? { domain } : {}),
    });
  clear('teacher-token', 'app.katie-english.com.vn');
  clear('admin-token', 'admin.katie-english.com.vn');
  clear('student-token', 'student.katie-english.com.vn');
  return NextResponse.json({ ok: true });
}
