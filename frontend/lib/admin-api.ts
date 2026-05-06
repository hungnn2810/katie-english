import { authHeaders } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Approvals
export interface PendingStudent {
  id: number;
  upn: string;
  createdAt: string;
  registrationData?: {
    fullname: string;
    sex: 'MALE' | 'FEMALE';
    dateOfBirth: string;
    classId?: number | null;
    parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[];
  } | null;
}

export interface ApproveStudentInput {
  userId: number;
  studentId?: number;
  fullname?: string;
  sex?: 'MALE' | 'FEMALE';
  dateOfBirth?: string;
  classId?: number;
  parents?: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[];
}

export const getPendingStudents = () => req<PendingStudent[]>('/auth/pending-students');
export const approveStudent = (data: ApproveStudentInput) =>
  req<{ approved: true; studentId: number }>('/auth/approve-student', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Classes
export const getClasses = () => req<ClassItem[]>('/classes');
export const getClass = (id: number) => req<ClassDetail>(`/classes/${id}`);
export const createClass = (data: CreateClassInput) =>
  req<ClassItem>('/classes', { method: 'POST', body: JSON.stringify(data) });
export const updateClass = (id: number, data: Partial<CreateClassInput>) =>
  req<ClassItem>(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClass = (id: number) =>
  req<ClassItem>(`/classes/${id}`, { method: 'DELETE' });

// Students
export const getStudents = (classId?: number) =>
  req<Student[]>(classId ? `/students?classId=${classId}` : '/students');
export const getStudent = (id: number) => req<Student>(`/students/${id}`);
export const createStudent = (data: CreateStudentInput) =>
  req<Student>('/students', { method: 'POST', body: JSON.stringify(data) });
export const updateStudent = (id: number, data: Partial<CreateStudentInput>) =>
  req<Student>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStudent = (id: number) =>
  req<Student>(`/students/${id}`, { method: 'DELETE' });

// Homework
export const getHomeworkList = (classId?: number) =>
  req<HomeworkItem[]>(classId ? `/homework?classId=${classId}` : '/homework');
export const getHomework = (id: number) => req<HomeworkDetail>(`/homework/${id}`);
export const createHomework = (data: CreateHomeworkInput) =>
  req<HomeworkDetail>('/homework', { method: 'POST', body: JSON.stringify(data) });
export const updateHomework = (id: number, data: Partial<CreateHomeworkInput>) =>
  req<HomeworkDetail>(`/homework/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteHomework = (id: number) =>
  req<HomeworkItem>(`/homework/${id}`, { method: 'DELETE' });

// Words (for homework builder)
export const getWords = () =>
  req<{ id: number; text: string; difficulty: number }[]>('/phonics/words');

// Game
export const getSession = (id: number) => req<GameSession>(`/game/session/${id}`);
export const getAvailableHomework = (studentId: number) =>
  req<HomeworkItem[]>(`/game/homework/${studentId}`);
export const startSession = (studentId: number, homeworkId: number) =>
  req<GameSession>('/game/session/start', {
    method: 'POST',
    body: JSON.stringify({ studentId, homeworkId }),
  });
export async function saveWordResult(
  sessionId: number,
  wordId: number,
  transcribedText: string,
  audio?: Blob,
): Promise<WordResult> {
  const form = new FormData();
  form.append('wordId', String(wordId));
  form.append('transcribedText', transcribedText);
  if (audio && audio.size > 0) form.append('audio', audio, 'audio.webm');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_URL}/game/session/${sessionId}/word-result`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function completeSession(sessionId: number, videoBlob?: Blob) {
  const form = new FormData();
  if (videoBlob) form.append('recording', videoBlob, 'recording.webm');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_URL}/game/session/${sessionId}/complete`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<GameSession>;
}

// Types
export type ClassStatus = 'PENDING' | 'INPROGRESS' | 'ENDED';

export interface ScheduleSlot {
  day: string;
  time: string;
}

export interface CreateClassInput {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status?: ClassStatus;
  scheduleSlots?: ScheduleSlot[];
}

export interface ClassItem {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status: ClassStatus;
  scheduleSlots: ScheduleSlot[];
  createdAt: string;
  _count?: { students: number; homeworks: number };
}

export interface ClassDetail extends ClassItem {
  students: Student[];
  homeworks: HomeworkItem[];
}

export interface CreateStudentInput {
  fullname: string;
  sex: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  classId?: number;
  parents: { name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[];
  upn: string;
  password: string;
}

export interface Student {
  id: number;
  fullname: string;
  sex: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  classId?: number;
  class?: ClassItem;
  parents: { id: number; name: string; phoneNumber: string; type: 'FATHER' | 'MOTHER' }[];
  createdAt: string;
}

export type HomeworkType = 'PHONICS' | 'READING' | 'SPELLING' | 'VOCABULARY';

export interface CreateHomeworkInput {
  type: HomeworkType;
  dayAssigned: string;
  closedDatetime: string;
  timeInSeconds: number;
  classId: number;
  wordIds: number[];
}

export interface HomeworkItem {
  id: number;
  type: HomeworkType;
  dayAssigned: string;
  closedDatetime: string;
  timeInSeconds: number;
  classId: number;
  class?: ClassItem;
  words: { orderIndex: number; word: { id: number; text: string } }[];
  createdAt: string;
  sessions?: GameSession[];
}

export interface HomeworkDetail extends HomeworkItem {
  sessions: GameSession[];
}

export interface GameSession {
  id: number;
  studentId: number;
  homeworkId: number;
  videoUrl?: string;
  score?: number;
  completedAt?: string;
  startedAt: string;
  homework?: HomeworkItem;
  student?: Student;
  wordResults?: WordResult[];
}

export interface PhonemeAlignment {
  symbol: string;
  ipa: string;
  start: number;
  end: number;
  duration: number;
}

export interface PhonemeOp {
  status: 'correct' | 'substituted' | 'missing' | 'extra' | 'error';
  expected: string | null;
  aligned: string | null;
  start?: number;
  end?: number;
  duration?: number;
  message?: string;
}

export interface BfaResult {
  success: boolean;
  phonemes: PhonemeAlignment[];
  score: number;
  feedback: PhonemeOp[];
  word: string;
}

export interface WordResult {
  id: number;
  sessionId: number;
  wordId: number;
  transcribedText?: string;
  score: number;
  word?: { id: number; text: string };
  bfa?: BfaResult | null;
}
