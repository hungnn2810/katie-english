import { NextRequest, NextResponse } from 'next/server';

type AppContext = 'admin' | 'teacher' | 'student';

interface AppConfig {
  cookieName: string;
  loginPath: string;
}

const APP_CONFIG: Record<AppContext, AppConfig> = {
  admin: {
    cookieName: 'admin-token',
    loginPath: '/admin/login',
  },
  teacher: {
    cookieName: 'teacher-token',
    loginPath: '/teacher/login',
  },
  student: {
    cookieName: 'student-token',
    loginPath: '/student/login',
  },
};

function detectAppContext(pathname: string): AppContext | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/teacher')) return 'teacher';
  if (pathname.startsWith('/student')) return 'student';
  return null;
}

function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export default function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const appContext = detectAppContext(pathname);

  if (!appContext) {
    return NextResponse.next();
  }

  const appConfig = APP_CONFIG[appContext];

  const tokenValue = req.cookies.get(appConfig.cookieName)?.value;

  if (tokenValue) {
    decodeJwtRole(tokenValue);
    return NextResponse.next();
  }

  if (pathname !== appConfig.loginPath) {
    return NextResponse.redirect(new URL(appConfig.loginPath, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
