import { adminAuthHeaders } from './admin-auth';
import type { ScheduleSlot, ClassStatus } from './admin-api';

export type { ScheduleSlot, ClassStatus };

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

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...adminAuthHeaders(), ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) return parseApiError(res);
  return res.json();
}

export interface AdminStats {
  teachers: number;
  classes: number;
  students: number;
  submissions: number;
}

export const getAdminStats = () => req<AdminStats>('/admin/stats');

// Teachers
export interface TeacherItem {
  id: number;
  upn: string;
  name: string | null;
  phone: string | null;
  disabled: boolean;
  createdAt: string;
}

export interface CreateTeacherInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface UpdateTeacherInput {
  name?: string;
  phone?: string;
  password?: string;
}

export const getTeachers = () => req<TeacherItem[]>('/admin/teachers');
export const createTeacher = (data: CreateTeacherInput) =>
  req<TeacherItem>('/admin/teachers', { method: 'POST', body: JSON.stringify(data) });
export const updateTeacher = (id: number, data: UpdateTeacherInput) =>
  req<TeacherItem>(`/admin/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const disableTeacher = (id: number) =>
  req<{ id: number; disabled: boolean }>(`/admin/teachers/${id}/disable`, { method: 'PATCH' });
export const enableTeacher = (id: number) =>
  req<{ id: number; disabled: boolean }>(`/admin/teachers/${id}/enable`, { method: 'PATCH' });

// Classes
export interface AdminClassItem {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status: ClassStatus;
  scheduleSlots: ScheduleSlot[];
  teacherId: number | null;
  teacher: { id: number; name: string | null; upn: string } | null;
  _count: { students: number };
  createdAt: string;
  updatedAt: string;
}

export interface AdminUpdateClassInput {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  status?: ClassStatus;
  scheduleSlots?: ScheduleSlot[];
}

export const getAdminClasses = (teacherId?: number) =>
  req<AdminClassItem[]>(teacherId !== undefined ? `/admin/classes?teacherId=${teacherId}` : '/admin/classes');
export const updateAdminClass = (id: number, data: AdminUpdateClassInput) =>
  req<AdminClassItem>(`/admin/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAdminClass = (id: number) =>
  req<{ deleted: true }>(`/admin/classes/${id}`, { method: 'DELETE' });

// ─── Students ─────────────────────────────────────────────────────────────────

export interface AdminStudentItem {
  id: number;
  fullname: string;
  sex: 'MALE' | 'FEMALE';
  classId: number | null;
  class: {
    id: number;
    name: string;
    code: string;
    teacher: { id: number; name: string | null; upn: string } | null;
  } | null;
  _count: { sessions: number };
  createdAt: string;
}

export interface AdminStudentResultItem {
  id: number;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  assignment: {
    id: number;
    endDate: string;
    homework: { id: number; name: string | null; type: 'PHONICS' | 'SPEAKING' | 'READING' };
  };
}

export const getAdminStudents = () => req<AdminStudentItem[]>('/admin/students');
export const getStudentResults = (id: number) => req<AdminStudentResultItem[]>(`/admin/students/${id}/results`);

// ─── Homework ──────────────────────────────────────────────────────────────────

export interface AdminHomeworkItem {
  id: number;
  name: string | null;
  type: 'PHONICS' | 'SPEAKING' | 'READING';
  speakingMode: 'FREE_SPEAK' | 'SCRIPT_MATCH' | null;
  createdAt: string;
  updatedAt: string;
  _count: { assignments: number };
  submissionCount: number;
}

export const getAdminHomework = () => req<AdminHomeworkItem[]>('/admin/homework');
export const deleteAdminHomework = (id: number) => req<{ deleted: true }>(`/admin/homework/${id}`, { method: 'DELETE' });
export const deleteAdminSession = (sessionId: number) => req<{ deleted: true }>(`/admin/students/sessions/${sessionId}`, { method: 'DELETE' });
