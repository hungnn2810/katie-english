import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(_req: Request) {
  const cookieStore = cookies();
  const clear = (name: string) =>
    cookieStore.set(name, '', { maxAge: 0, path: '/' });
  clear('teacher-token');
  clear('admin-token');
  clear('student-token');
  return NextResponse.json({ ok: true });
}
