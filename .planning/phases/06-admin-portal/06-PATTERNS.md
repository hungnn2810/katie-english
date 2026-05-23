# Phase 6: Admin Portal - Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 16 new/modified files
**Analogs found:** 15 / 16

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/prisma/schema.prisma` | model/config | — | `backend/prisma/schema.prisma` (existing) | exact — extend in place |
| `backend/src/auth/auth.guard.ts` | middleware/guard | request-response | `backend/src/auth/auth.guard.ts` (existing) | exact — add `AdminGuard` |
| `backend/src/auth/jwt.service.ts` | service/utility | request-response | `backend/src/auth/jwt.service.ts` (existing) | exact — extend `JwtPayload` |
| `backend/src/admin/admin.module.ts` | config | — | `backend/src/class/class.module.ts` | role-match |
| `backend/src/admin/admin-auth.controller.ts` | controller | request-response | `backend/src/auth/auth.controller.ts` | exact |
| `backend/src/admin/admin-auth.service.ts` | service | request-response | `backend/src/auth/auth.service.ts` | exact |
| `backend/src/admin/admin-auth.dto.ts` | model | — | `backend/src/auth/auth.dto.ts` | exact |
| `backend/src/admin/admin-teachers.controller.ts` | controller | CRUD | `backend/src/class/class.controller.ts` | exact |
| `backend/src/admin/admin-teachers.service.ts` | service | CRUD | `backend/src/class/class.service.ts` | exact |
| `backend/src/admin/admin-classes.controller.ts` | controller | CRUD | `backend/src/class/class.controller.ts` | exact |
| `backend/src/admin/admin-classes.service.ts` | service | CRUD | `backend/src/class/class.service.ts` | exact |
| `backend/src/admin/admin-students.controller.ts` | controller | CRUD | `backend/src/student/student.controller.ts` | exact |
| `backend/src/admin/admin-students.service.ts` | service | CRUD | `backend/src/student/student.service.ts` | exact |
| `backend/src/main.ts` | config | — | `backend/src/main.ts` (existing) | exact — add `ensureAdminUser` |
| `backend/src/app.module.ts` | config | — | `backend/src/app.module.ts` (existing) | exact — add `AdminModule` |
| `frontend/lib/admin-auth.ts` | utility | request-response | `frontend/lib/auth.ts` | exact |
| `frontend/lib/admin-portal-api.ts` | service | CRUD | `frontend/lib/admin-api.ts` | exact |
| `frontend/components/AdminShell.tsx` | component | request-response | `frontend/components/TeacherShell.tsx` | exact |
| `frontend/app/admin/layout.tsx` | component | request-response | `frontend/app/teacher/layout.tsx` | exact |
| `frontend/app/admin/login/page.tsx` | component | request-response | `frontend/app/login/page.tsx` | role-match |
| `frontend/app/admin/page.tsx` | component | CRUD | `frontend/app/teacher/page.tsx` | exact |
| `frontend/app/admin/teachers/page.tsx` | component | CRUD | `frontend/app/teacher/classes/page.tsx` | exact |
| `frontend/app/admin/classes/page.tsx` | component | CRUD | `frontend/app/teacher/classes/page.tsx` | exact |
| `frontend/app/admin/students/page.tsx` | component | CRUD | `frontend/app/teacher/classes/page.tsx` | role-match |

---

## Pattern Assignments

### `backend/prisma/schema.prisma` — extend UserRole enum + User model

**Analog:** `backend/prisma/schema.prisma` (existing, lines 283–301)

**Current enum pattern** (lines 283–286):
```prisma
enum UserRole {
  TEACHER
  STUDENT
}
```

**Required change — add ADMIN variant:**
```prisma
enum UserRole {
  TEACHER
  STUDENT
  ADMIN
}
```

**Current User model** (lines 288–301):
```prisma
model User {
  id                     Int      @id @default(autoincrement())
  upn                    String   @unique
  password               String
  role                   UserRole
  approved               Boolean  @default(false)
  studentId              Int?     @unique
  student                Student? @relation(fields: [studentId], references: [id])
  registrationData       Json?
  passwordResetRequested Boolean  @default(false)
  createdAt              DateTime @default(now())

  @@map("users")
}
```

**Required fields to add to User** (insert after `upn`):
```prisma
  email    String?  @unique   -- teacher-only; UPN stays as primary login key for students
  name     String?            -- teacher display name
  phone    String?            -- teacher phone (D-02)
  disabled Boolean @default(false)  -- soft-delete flag (D-07)
```

> Note: `upn` remains the primary login identifier for both TEACHER and STUDENT. The `email` field holds the teacher's email (same value as `upn` for teacher logins — keeping backward compat). `disabled` replaces hard-delete for teachers.

---

### `backend/src/auth/auth.guard.ts` — add AdminGuard

**Analog:** `backend/src/auth/auth.guard.ts` (lines 31–53, `TeacherGuard`)

**Pattern to copy verbatim, replace role check:**
```typescript
// Copy TeacherGuard exactly, rename to AdminGuard, change role check:
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('No token');
    const payload = this.tokenService.verify(auth.slice(7));
    if (!payload) throw new UnauthorizedException('Invalid token');
    if (payload.role !== 'ADMIN') throw new ForbiddenException('Admins only');
    (req as any).user = payload;
    return true;
  }
}
```

> AdminGuard does NOT check `approved` or DB lookup — the admin account is env-seeded and never disabled via UI (D-04). The role check on the JWT payload is sufficient.

**Export in auth.module.ts** (line 13 — add `AdminGuard` to providers + exports):
```typescript
providers: [TokenService, AuthGuard, TeacherGuard, AdminGuard, AuthService],
exports: [TokenService, AuthGuard, TeacherGuard, AdminGuard],
```

---

### `backend/src/auth/jwt.service.ts` — extend JwtPayload

**Analog:** `backend/src/auth/jwt.service.ts` (lines 6–11)

**Current payload:**
```typescript
export interface JwtPayload {
  sub: number;
  upn: string;
  role: 'TEACHER' | 'STUDENT';
  studentId?: number;
}
```

**Required change — add ADMIN to role union:**
```typescript
export interface JwtPayload {
  sub: number;
  upn: string;
  role: 'TEACHER' | 'STUDENT' | 'ADMIN';
  studentId?: number;
}
```

---

### `backend/src/admin/admin.module.ts` — NestJS module

**Analog:** `backend/src/class/class.module.ts` (lines 1–9)

```typescript
// class.module.ts — exact structure to copy:
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ClassRepository } from './class.repository';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';

@Module({ imports: [PrismaModule, AuthModule], providers: [ClassRepository, ClassService], controllers: [ClassController] })
export class ClassModule {}
```

**Admin module adaptation** — import all admin sub-services/controllers, import `AuthModule` for `AdminGuard`:
```typescript
@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AdminAuthService, AdminTeachersService, AdminClassesService, AdminStudentsService],
  controllers: [AdminAuthController, AdminTeachersController, AdminClassesController, AdminStudentsController],
})
export class AdminModule {}
```

---

### `backend/src/admin/admin-auth.controller.ts` — admin login endpoint

**Analog:** `backend/src/auth/auth.controller.ts` (lines 1–13)

**Imports pattern** (copy from auth.controller.ts lines 1–5, adapt):
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './admin-auth.dto';
```

**Core pattern** — single login route, no register, no guards on the login endpoint itself:
```typescript
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) { return this.authService.login(dto); }
}
```

---

### `backend/src/admin/admin-auth.service.ts` — admin login logic

**Analog:** `backend/src/auth/auth.service.ts` (lines 1–25, `login` method)

**Imports pattern** (lines 1–6):
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/jwt.service';
import { AdminLoginDto } from './admin-auth.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
```

**Core pattern** — validate against env-seeded admin, sign JWT with role ADMIN:
```typescript
@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: AdminLoginDto) {
    const user = await this.prisma.user.findUnique({ where: { upn: dto.email } });
    if (!user || user.role !== UserRole.ADMIN) throw new UnauthorizedException('Invalid email or password');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');
    const token = this.tokenService.sign({ sub: user.id, upn: user.upn, role: 'ADMIN' });
    return { token, user: { id: user.id, email: user.upn, role: 'ADMIN' } };
  }
}
```

---

### `backend/src/admin/admin-auth.dto.ts`

**Analog:** `backend/src/auth/auth.dto.ts` (lines 1–4)

```typescript
export class AdminLoginDto {
  email: string;
  password: string;
}
```

---

### `backend/src/admin/admin-teachers.controller.ts` — teacher CRUD

**Analog:** `backend/src/class/class.controller.ts` (full file, 16 lines)

**Imports pattern** (lines 1–5):
```typescript
import { Controller, Get, Post, Put, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminTeachersService } from './admin-teachers.service';
import { CreateTeacherDto, UpdateTeacherDto } from './admin-teachers.dto';
import { AdminGuard } from '../auth/auth.guard';
```

**Guard + controller pattern** (lines 6–16):
```typescript
@UseGuards(AdminGuard)
@Controller('admin/teachers')
export class AdminTeachersController {
  constructor(private readonly service: AdminTeachersService) {}

  @Get()    findAll() { return this.service.findAll(); }
  @Post()   create(@Body() dto: CreateTeacherDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeacherDto) { return this.service.update(id, dto); }
  @Patch(':id/disable') disable(@Param('id', ParseIntPipe) id: number) { return this.service.setDisabled(id, true); }
  @Patch(':id/enable')  enable(@Param('id', ParseIntPipe) id: number) { return this.service.setDisabled(id, false); }
}
```

---

### `backend/src/admin/admin-teachers.service.ts` — teacher CRUD + disable

**Analog:** `backend/src/class/class.service.ts` (full file) + `backend/src/student/student.service.ts` (lines 24–33 for create with User)

**Imports + class pattern** (copy from class.service.ts lines 1–6):
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto } from './admin-teachers.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
```

**Core CRUD pattern** (adapted from class.service.ts lines 7–31):
```typescript
@Injectable()
export class AdminTeachersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { role: UserRole.TEACHER },
      select: { id: true, upn: true, name: true, phone: true, disabled: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateTeacherDto) {
    const existing = await this.prisma.user.findUnique({ where: { upn: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists.');
    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { upn: dto.email, name: dto.name, phone: dto.phone, password: hashed, role: UserRole.TEACHER, approved: true },
      select: { id: true, upn: true, name: true, phone: true, disabled: true, createdAt: true },
    });
  }

  async update(id: number, dto: UpdateTeacherDto) {
    await this.findById(id);
    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.phone) data.phone = dto.phone;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({ where: { id }, data, select: { id: true, upn: true, name: true, phone: true, disabled: true, createdAt: true } });
  }

  async setDisabled(id: number, disabled: boolean) {
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { disabled }, select: { id: true, upn: true, disabled: true } });
  }

  async findById(id: number) {
    const u = await this.prisma.user.findUnique({ where: { id, role: UserRole.TEACHER } });
    if (!u) throw new NotFoundException(`Teacher ${id} not found`);
    return u;
  }
}
```

---

### `backend/src/admin/admin-classes.controller.ts` — admin classes CRUD

**Analog:** `backend/src/class/class.controller.ts` (full file)

```typescript
import { Controller, Get, Put, Delete, Param, Body, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AdminClassesService } from './admin-classes.service';
import { AdminUpdateClassDto } from './admin-classes.dto';
import { AdminGuard } from '../auth/auth.guard';

@UseGuards(AdminGuard)
@Controller('admin/classes')
export class AdminClassesController {
  constructor(private readonly service: AdminClassesService) {}

  @Get()    findAll(@Query('teacherId') teacherId?: string) { return this.service.findAll(teacherId ? Number(teacherId) : undefined); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminUpdateClassDto) { return this.service.update(id, dto); }
  @Delete(':id') delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
```

---

### `backend/src/admin/admin-classes.service.ts`

**Analog:** `backend/src/class/class.service.ts` + `backend/src/class/class.repository.ts`

**Error handling pattern** (from class.service.ts lines 11–14):
```typescript
async findById(id: number) {
  const cls = await this.prisma.class.findUnique({ where: { id } });
  if (!cls) throw new NotFoundException(`Class ${id} not found`);
  return cls;
}
```

**findAll with teacher filter + include teacher field** (new, no analog — compose from class.repository.ts line 11–14 + teacherId filter):
```typescript
findAll(teacherId?: number) {
  return this.prisma.class.findMany({
    where: teacherId ? { teacherId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { students: true } }, teacher: { select: { id: true, name: true, upn: true } } },
  });
}
```

> Note: Requires adding `teacherId` relation to `Class` model in Prisma schema (see schema changes below).

---

### `backend/src/admin/admin-students.controller.ts` — admin students read + delete session

**Analog:** `backend/src/student/student.controller.ts` (full file)

```typescript
import { Controller, Get, Delete, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminStudentsService } from './admin-students.service';
import { AdminGuard } from '../auth/auth.guard';

@UseGuards(AdminGuard)
@Controller('admin/students')
export class AdminStudentsController {
  constructor(private readonly service: AdminStudentsService) {}

  @Get()        findAll() { return this.service.findAll(); }
  @Get(':id/results') getResults(@Param('id', ParseIntPipe) id: number) { return this.service.getResults(id); }
  @Delete('sessions/:sessionId') deleteSession(@Param('sessionId', ParseIntPipe) id: number) { return this.service.deleteSession(id); }
}
```

---

### `backend/src/main.ts` — add ensureAdminUser seed

**Analog:** `backend/src/main.ts` (lines 7–17, `ensureTeacherUser`)

**Pattern to copy, rename for admin:**
```typescript
// Copy ensureTeacherUser pattern exactly:
async function ensureAdminUser(prisma: PrismaService) {
  const upn = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!upn || !password) return;
  const existing = await prisma.user.findUnique({ where: { upn } });
  if (existing) return;
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { upn, password: hashed, role: UserRole.ADMIN, approved: true },
  });
}
```

**Call in bootstrap** (after existing `ensureTeacherUser` call, line 24):
```typescript
await ensureTeacherUser(app.get(PrismaService));
await ensureAdminUser(app.get(PrismaService));
```

---

### `frontend/lib/admin-auth.ts` — admin auth helpers (localStorage + fetch)

**Analog:** `frontend/lib/auth.ts` (full file, 95 lines)

**Core pattern to copy** (lines 1–56, adapt endpoint + user type):
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AdminUser {
  id: number;
  email: string;
  role: 'ADMIN';
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
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
```

> Use separate localStorage keys (`admin_token`, `admin_user`) to avoid colliding with teacher session.

---

### `frontend/lib/admin-portal-api.ts` — admin API client

**Analog:** `frontend/lib/admin-api.ts` (lines 1–22, the `req` helper pattern)

**Core `req` helper** (copy from admin-api.ts lines 1–22, replace `authHeaders` with `adminAuthHeaders`):
```typescript
import { adminAuthHeaders } from './admin-auth';

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

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...adminAuthHeaders(), ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) return parseApiError(res);
  return res.json();
}
```

**Typed API function pattern** (copy from admin-api.ts lines 70–88 for CRUD operations):
```typescript
// Teachers
export const getTeachers  = () => req<TeacherItem[]>('/admin/teachers');
export const createTeacher = (data: CreateTeacherInput) =>
  req<TeacherItem>('/admin/teachers', { method: 'POST', body: JSON.stringify(data) });
export const updateTeacher = (id: number, data: UpdateTeacherInput) =>
  req<TeacherItem>(`/admin/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const disableTeacher = (id: number) =>
  req<{ id: number; disabled: boolean }>(`/admin/teachers/${id}/disable`, { method: 'PATCH' });
export const enableTeacher = (id: number) =>
  req<{ id: number; disabled: boolean }>(`/admin/teachers/${id}/enable`, { method: 'PATCH' });

// Classes
export const getAdminClasses = (teacherId?: number) =>
  req<AdminClassItem[]>(teacherId ? `/admin/classes?teacherId=${teacherId}` : '/admin/classes');
export const updateAdminClass = (id: number, data: Partial<AdminUpdateClassInput>) =>
  req<AdminClassItem>(`/admin/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAdminClass = (id: number) =>
  req<void>(`/admin/classes/${id}`, { method: 'DELETE' });

// Students
export const getAdminStudents = () => req<AdminStudentItem[]>('/admin/students');
export const getStudentResults = (id: number) => req<StudentResultItem[]>(`/admin/students/${id}/results`);
export const deleteAdminSession = (sessionId: number) =>
  req<void>(`/admin/students/sessions/${sessionId}`, { method: 'DELETE' });

// Dashboard stats
export const getAdminStats = () => req<AdminStats>('/admin/stats');
```

---

### `frontend/components/AdminShell.tsx` — sidebar + header layout

**Analog:** `frontend/components/TeacherShell.tsx` (full file, 241 lines)

**Copy entire TeacherShell.tsx and apply these targeted changes:**

1. **Accent constants** (lines 10–12 — replace orange with blue):
```typescript
// TeacherShell (orange):
const ACCENT = '#F0623A';
const ACCENT_BG = 'rgba(240, 98, 58, 0.12)';
const ACCENT_TEXT = '#FDA087';

// AdminShell (blue):
const ACCENT = '#4F9DFF';
const ACCENT_BG = 'rgba(79, 157, 255, 0.12)';
const ACCENT_TEXT = '#60A5FA';
```

2. **NAV_GROUPS** (lines 14–28 — replace with admin nav):
```typescript
// Import icons used:
import { LayoutDashboard, Users, School, GraduationCap, LogOut } from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'GENERAL',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/teachers', label: 'Teachers', icon: Users },
      { href: '/admin/classes', label: 'Classes', icon: School },
      { href: '/admin/students', label: 'Students', icon: GraduationCap },
    ],
  },
];
```

3. **Props interface** (line 30–35 — replace `AuthUser` with `AdminUser`):
```typescript
import { AdminUser } from '@/lib/admin-auth';

interface Props {
  user: AdminUser;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}
```

4. **Logo subtitle** (line 81 — change "Teacher Portal" to "Admin Portal"):
```typescript
<div className="text-slate-500 text-[10px] tracking-wide mt-0.5">Admin Portal</div>
```

5. **Breadcrumb prefix** (line 138 — change "Teacher Portal" to "Admin Portal"):
```typescript
<p className="text-xs text-textSecondary mb-2 flex items-center gap-1.5">
  Admin Portal
  <span className="text-textSecondary/40 mx-0.5">›</span>
  <span className="text-textPrimary/50 font-medium">{title}</span>
</p>
```

6. **User menu role label** (line 168 — change "Teacher" to "Administrator"):
```typescript
<div className="text-textSecondary text-xs">Administrator</div>
```

7. **Active nav detection** (line 97 — admin root is `/admin` exact, sub-pages use startsWith):
```typescript
const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
```

8. **Remove change-password form** — AdminShell has no password change UI. Replace user menu body with just a sign-out button:
```typescript
// Simplified user menu — sign out only:
<button type="button" onClick={logout}
  className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
  <LogOut className="w-3.5 h-3.5" />
  Sign out
</button>
```

9. **logout function** — calls `clearAdminAuth` (from admin-auth.ts) then pushes to `/admin/login`:
```typescript
import { clearAdminAuth } from '@/lib/admin-auth';
function logout() { clearAdminAuth(); router.push('/admin/login'); }
```

---

### `frontend/app/admin/layout.tsx` — admin route group layout

**Analog:** `frontend/app/teacher/layout.tsx` (full file, 41 lines)

**Copy entire file, apply these changes:**
```typescript
'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAdminUser, AdminUser } from '@/lib/admin-auth';
import AdminShell from '@/components/AdminShell';

const TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/teachers': 'Teachers',
  '/admin/classes': 'Classes',
  '/admin/students': 'Students',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined);

  useEffect(() => {
    const u = getAdminUser();
    if (!u || u.role !== 'ADMIN') { router.replace('/admin/login'); return; }
    setUser(u);
  }, []);

  // Loading spinner pattern (copy from teacher/layout.tsx lines 27–31):
  if (user === undefined) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ minWidth: 1280 }}>
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return null;

  return (
    <AdminShell user={user} title={TITLES[pathname] ?? 'Admin Portal'}>
      {children}
    </AdminShell>
  );
}
```

> Note: `/admin/login` must be placed OUTSIDE this layout (e.g., at `frontend/app/admin/login/page.tsx` with no wrapping AdminLayout), otherwise the layout auth check loops.

---

### `frontend/app/admin/login/page.tsx` — admin login page

**Analog:** `frontend/app/login/page.tsx` (simplified — no role picker, no register, no forgot)

**Structural pattern** (2-panel layout from login/page.tsx lines 73–119, left dark panel + right form):
```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/admin-auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const ACCENT = '#4F9DFF';  // Blue, not orange

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await adminLogin(email, password);
      router.push('/admin');
    } catch {
      // D-14: never reveal which field failed
      setError('Invalid email or password');
    } finally { setLoading(false); }
  }
  // ...
}
```

**Error display pattern** (inline red text below password, NOT a banner — from UI-SPEC):
```tsx
{error && <p className="text-sm text-red-500 mt-1">{error}</p>}
```

**Submit button loading pattern** (from teacher/classes/page.tsx lines 200–204):
```tsx
<Button type="submit" disabled={loading} className="w-full" style={{ background: ACCENT }}>
  {loading ? 'Signing in...' : 'Sign in'}
</Button>
```

---

### `frontend/app/admin/page.tsx` — dashboard stats

**Analog:** `frontend/app/teacher/page.tsx` (lines 43–149)

**Stat cards pattern** (lines 43–48 + lines 127–149):
```typescript
// STAT_CARDS config array pattern:
const STAT_CARDS = [
  { key: 'teachers' as const, label: 'Teachers', icon: Users, ... },
  { key: 'classes' as const, label: 'Classes', icon: School, ... },
  { key: 'students' as const, label: 'Students', icon: GraduationCap, ... },
  { key: 'submissions' as const, label: 'Submissions', icon: Video, ... },
];
```

**Parallel data fetch on mount** (lines 64–89):
```typescript
async function loadDashboard() {
  setLoading(true); setError('');
  try {
    const stats = await getAdminStats();  // single endpoint returning all counts
    setStats(stats);
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
  } finally { setLoading(false); }
}
useEffect(() => { loadDashboard(); }, []);
```

**Stat number display** — 28px bold per UI-SPEC (teacher page uses `text-3xl font-black`; admin uses `text-[28px] font-bold`):
```tsx
<div className="text-[28px] font-bold tracking-tight" style={{ color: ACCENT }}>
  {loading ? <div className="h-8 w-10 bg-slate-100 rounded-lg animate-pulse" /> : stats[card.key]}
</div>
```

**Grid layout** — 4-column (teacher page uses 3-column `grid-cols-3`; admin uses `grid-cols-4`):
```tsx
<div className="grid grid-cols-4 gap-5 mb-6">
```

---

### `frontend/app/admin/teachers/page.tsx` — teacher CRUD table

**Analog:** `frontend/app/teacher/classes/page.tsx` (full file, 414 lines)

**Modal pattern** (lines 42–212, `ClassModal` component):
```typescript
// Copy ClassModal pattern: local state form, handleSubmit calls API, onSaved/onClose props
function TeacherModal({ editing, onClose, onSaved }: {
  editing: TeacherItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (editing) { await updateTeacher(editing.id, form); }
      else { await createTeacher(form); }
      onSaved(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally { setLoading(false); }
  }
  // ...Dialog with form
}
```

**Table with shadcn `<Table>`** (not card grid — UI-SPEC specifies data table):
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Status badge pattern from UI-SPEC:
// Active:   bg-emerald-50 text-emerald-700
// Disabled: bg-slate-100 text-slate-500
const statusBadge = (disabled: boolean) => disabled
  ? <Badge className="bg-slate-100 text-slate-500">Disabled</Badge>
  : <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>;
```

**Destructive confirm dialog pattern** (adapt from classes page inline delete confirm, lines 374–385):
```tsx
// Use shadcn Dialog for disable/enable confirm — NOT inline row UI:
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Destructive button pattern from UI-SPEC:
<Button className="bg-destructive text-white" onClick={handleConfirm}>
  {loading ? 'Disabling...' : 'Disable account'}
</Button>
<Button variant="outline" onClick={() => setConfirmOpen(false)}>
  Keep teacher
</Button>
```

**Toast pattern** (lines 227, 262–266):
```typescript
const [toast, setToast] = useState('');
function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

// Toast render:
{toast && (
  <div className="fixed bottom-6 right-6 z-50 bg-textPrimary text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl animate-slide-up flex items-center gap-2">
    <CheckCircle2 className="w-4 h-4 text-green-400" /> {toast}
  </div>
)}
```

---

### `frontend/app/admin/classes/page.tsx` — classes table with teacher filter

**Analog:** `frontend/app/teacher/classes/page.tsx` (full file)

**Select filter pattern** — use shadcn `<Select>` (not the classes page's custom button filter tabs):
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select value={teacherFilter} onValueChange={setTeacherFilter}>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="All teachers" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ALL">All teachers</SelectItem>
    {teachers.map((t) => (
      <SelectItem key={t.id} value={String(t.id)}>{t.name ?? t.upn}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Table layout** — `<Table>` with column headers "Class Name", "Teacher", "Students", "Status", "Actions" per UI-SPEC.

**Delete confirmation dialog** (copy disable dialog pattern from teachers page, change copy to "Delete class? All homework and sessions in this class will be permanently deleted." / confirm: "Delete class" / dismiss: "Keep class").

---

### `frontend/app/admin/students/page.tsx` — students table + results drill-down

**Analog:** `frontend/app/teacher/classes/page.tsx` (page structure) + `frontend/app/teacher/sessions/page.tsx` (results display)

**Two-view pattern** — list view vs detail view using local state (not a separate route):
```typescript
const [selectedStudent, setSelectedStudent] = useState<AdminStudentItem | null>(null);

if (selectedStudent) return <StudentResults student={selectedStudent} onBack={() => setSelectedStudent(null)} />;
return <StudentsTable onViewResults={setSelectedStudent} />;
```

**Back link pattern** (from teacher drill-down pages — use `<button>` not `<Link>` since it's a state transition):
```tsx
<button onClick={onBack} className="text-sm text-textSecondary hover:text-textPrimary flex items-center gap-1.5 mb-6">
  ← Back to Students
</button>
```

---

## Shared Patterns

### AdminGuard (backend)
**Source:** `backend/src/auth/auth.guard.ts` lines 31–53 (`TeacherGuard`)
**Apply to:** All admin controllers — copy `TeacherGuard` structure, check `role !== 'ADMIN'`
```typescript
if (payload.role !== 'ADMIN') throw new ForbiddenException('Admins only');
```

### Error handling (backend)
**Source:** `backend/src/class/class.service.ts` + `backend/src/student/student.service.ts`
**Apply to:** All admin services
```typescript
async findById(id: number) {
  const item = await this.prisma.[model].findUnique({ where: { id } });
  if (!item) throw new NotFoundException(`[Entity] ${id} not found`);
  return item;
}
```

### parseApiError helper (frontend)
**Source:** `frontend/lib/admin-api.ts` lines 4–13
**Apply to:** `frontend/lib/admin-portal-api.ts` — copy verbatim, prefix `admin_` localStorage keys
```typescript
async function parseApiError(res: Response): Promise<never> {
  const text = await res.text();
  let message = text;
  try {
    const json = JSON.parse(text);
    message = Array.isArray(json.message) ? json.message.join(', ') : (json.message ?? text);
  } catch { /* not JSON */ }
  throw new Error(message || 'An error occurred. Please try again.');
}
```

### Toast notification (frontend)
**Source:** `frontend/app/teacher/classes/page.tsx` lines 227, 262–266
**Apply to:** All admin page components (teachers, classes, students) — copy same fixed-position toast pattern

### Loading spinner (frontend layout)
**Source:** `frontend/app/teacher/layout.tsx` lines 27–31
**Apply to:** `frontend/app/admin/layout.tsx` — copy verbatim (same `border-primary border-t-transparent` spinner)

### Dialog/modal structure (frontend)
**Source:** `frontend/app/teacher/classes/page.tsx` lines 83–96 (`DialogContent`, `DialogHeader`, `DialogTitle`)
**Apply to:** All admin create/edit/confirm dialogs — same `rounded-3xl p-0` + header with border-b pattern

### Form submit loading state (frontend)
**Source:** `frontend/app/teacher/classes/page.tsx` lines 200–204
**Apply to:** All admin form submit buttons — `disabled={loading}`, text changes to "Saving...", `opacity-50`
```tsx
<Button type="submit" disabled={loading} className="... disabled:opacity-60">
  {loading && <Spinner />}
  {loading ? 'Saving...' : 'Save Changes'}
</Button>
```

---

## Additional Schema Change Required

The `Class` model currently has no `teacherId`. Phase 06 requires teacher-class ownership to support filtering. Add to `Class` model in schema.prisma:
```prisma
model Class {
  // ... existing fields ...
  teacherId Int?
  teacher   User? @relation("TeacherClasses", fields: [teacherId], references: [id])
}

model User {
  // ... existing fields ...
  classes Class[] @relation("TeacherClasses")
}
```

This requires a new migration. Existing classes will have `teacherId = null` — admin filter "All teachers" covers this case.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/src/admin/admin-stats.controller.ts` | controller | CRUD | No existing "aggregate stats" endpoint; closest is teacher dashboard client-side aggregation. Use `prisma.[model].count()` directly. |

---

## Metadata

**Analog search scope:** `backend/src/auth/`, `backend/src/class/`, `backend/src/student/`, `backend/src/main.ts`, `backend/src/app.module.ts`, `backend/prisma/schema.prisma`, `frontend/components/TeacherShell.tsx`, `frontend/app/teacher/`, `frontend/lib/auth.ts`, `frontend/lib/admin-api.ts`
**Files scanned:** 24
**Pattern extraction date:** 2026-05-22
