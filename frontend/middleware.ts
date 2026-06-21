import { NextRequest, NextResponse } from 'next/server';

type Subdomain = 'admin' | 'app' | 'student';

interface SubdomainConfig {
  cookieName: string;
  allowedPrefixes: string[];
  loginPath: string;
  expectedRole: string;
  defaultRedirect: string;
}

const SUBDOMAIN_CONFIG: Record<Subdomain, SubdomainConfig> = {
  admin: {
    cookieName: 'admin-token',
    allowedPrefixes: ['/admin'],
    loginPath: '/admin/login',
    expectedRole: 'ADMIN',
    defaultRedirect: '/admin',
  },
  app: {
    cookieName: 'teacher-token',
    allowedPrefixes: ['/teacher'],
    loginPath: '/teacher/login',
    expectedRole: 'TEACHER',
    defaultRedirect: '/teacher',
  },
  student: {
    cookieName: 'student-token',
    allowedPrefixes: ['/game', '/game/login'],
    loginPath: '/game/login',
    expectedRole: 'STUDENT',
    defaultRedirect: '/game/homework',
  },
};

function detectSubdomain(
  req: NextRequest,
): Subdomain | 'root' | 'unknown' {
  // D-02: env var overrides Host header for local dev
  const envSubdomain = process.env.NEXT_PUBLIC_SUBDOMAIN;
  if (envSubdomain === 'marketing') {
    return 'root';
  }
  if (
    envSubdomain === 'admin' ||
    envSubdomain === 'app' ||
    envSubdomain === 'student'
  ) {
    return envSubdomain as Subdomain;
  }

  const host = req.headers.get('host') ?? '';

  if (host.startsWith('admin.')) return 'admin';
  if (host.startsWith('app.')) return 'app';
  if (host.startsWith('student.')) return 'student';
  if (host === 'katie-english.com.vn' || host === 'www.katie-english.com.vn') return 'root';
  // Local dev: detect by convention port — 3001=admin, 3002=app, 3003=student
  if (host === 'localhost:3001') return 'admin';
  if (host === 'localhost:3002') return 'app';
  if (host === 'localhost:3003') return 'student';
  if (host === 'localhost' || host.startsWith('localhost:')) return 'root';

  return 'unknown';
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
  const subdomain = detectSubdomain(req);
  const { pathname } = req.nextUrl;

  // D-08 (updated): root domain rewrites to /marketing (marketing landing page)
  if (subdomain === 'root') {
    // Passthrough for Next.js-generated files so they are served directly
    if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
      return NextResponse.next();
    }
    // Rewrite all root domain requests to the marketing page at /marketing
    const rewriteUrl = new URL('/marketing', req.url);
    return NextResponse.rewrite(rewriteUrl);
  }

  // D-09: unknown subdomains rewrite to /not-found
  if (subdomain === 'unknown') {
    return NextResponse.rewrite(new URL('/not-found', req.url));
  }

  // One of 'admin' | 'app' | 'student'
  const subConfig = SUBDOMAIN_CONFIG[subdomain];

  // Special case for app.* subdomain: redirect old /login bookmark to /teacher/login
  if (subdomain === 'app' && pathname === '/login') {
    return NextResponse.redirect(new URL('/teacher/login', req.url));
  }

  // Redirect root path to subdomain default
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(subConfig.defaultRedirect, req.url),
    );
  }

  // Always allow Next.js API routes through regardless of subdomain prefix config.
  // Without this early-return, /api/auth/* calls from admin.katie-english.com.vn would be
  // blocked by the isAllowed check below (since '/api' is not in allowedPrefixes)
  // and rewritten to /not-found, breaking all auth route handlers in production.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // D-10: route containment — check that pathname starts with one of the allowed prefixes
  const isAllowed = subConfig.allowedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isAllowed) {
    return NextResponse.rewrite(new URL('/not-found', req.url));
  }

  // Auth check: read subdomain-specific cookie
  const tokenValue = req.cookies.get(subConfig.cookieName)?.value;

  if (tokenValue) {
    // Cookie present — decode role. If wrong role, let client-side layout
    // guard handle it (D-04); middleware returns next() without redirecting.
    // Role mismatch → 403 shown by layout, not by middleware.
    decodeJwtRole(tokenValue); // decode but do not enforce here per D-04
    return NextResponse.next();
  }

  // No cookie — if not on the login path, redirect to login
  if (pathname !== subConfig.loginPath && pathname !== '/not-found') {
    return NextResponse.redirect(
      new URL(subConfig.loginPath, req.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
