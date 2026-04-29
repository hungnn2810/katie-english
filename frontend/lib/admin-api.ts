const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Students
export const getStudents = () => req<Student[]>('/students');
export const getStudent = (id: number) => req<StudentDetail>(`/students/${id}`);
export const createStudent = (data: { name: string; email: string }) =>
  req<Student>('/students', { method: 'POST', body: JSON.stringify(data) });
export const updateStudent = (id: number, data: { name?: string; email?: string }) =>
  req<Student>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStudent = (id: number) =>
  req<Student>(`/students/${id}`, { method: 'DELETE' });

// Classes
export const getClasses = () => req<ClassItem[]>('/classes');
export const getClass = (id: number) => req<ClassDetail>(`/classes/${id}`);
export const createClass = (data: { name: string; description?: string }) =>
  req<ClassItem>('/classes', { method: 'POST', body: JSON.stringify(data) });
export const updateClass = (id: number, data: { name?: string; description?: string }) =>
  req<ClassItem>(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClass = (id: number) =>
  req<ClassItem>(`/classes/${id}`, { method: 'DELETE' });
export const addStudentToClass = (classId: number, studentId: number) =>
  req(`/classes/${classId}/students/${studentId}`, { method: 'POST', body: '{}' });
export const removeStudentFromClass = (classId: number, studentId: number) =>
  req(`/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
export const assignHomeworkToClass = (classId: number, homeworkId: number, dueDate?: string) =>
  req(`/classes/${classId}/homework/${homeworkId}`, {
    method: 'POST',
    body: JSON.stringify({ dueDate }),
  });
export const removeHomeworkFromClass = (classId: number, homeworkId: number) =>
  req(`/classes/${classId}/homework/${homeworkId}`, { method: 'DELETE' });

// Phonemes (read-only, for homework builder)
export const fetchPhonemes = () =>
  req<{ id: number; symbol: string; audioUrl: string; type: string }[]>('/phonics/phonemes');

// Homework
export const getHomeworkList = () => req<HomeworkItem[]>('/homework');
export const getHomework = (id: number) => req<HomeworkDetail>(`/homework/${id}`);
export const createHomework = (data: { title: string; description?: string; phonemeIds: number[] }) =>
  req<HomeworkDetail>('/homework', { method: 'POST', body: JSON.stringify(data) });
export const updateHomework = (id: number, data: { title?: string; description?: string; phonemeIds?: number[] }) =>
  req<HomeworkDetail>(`/homework/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteHomework = (id: number) =>
  req<HomeworkItem>(`/homework/${id}`, { method: 'DELETE' });

// Types
export interface Student {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface StudentDetail extends Student {
  classes: { class: ClassItem; joinedAt: string }[];
}

export interface ClassItem {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  _count: { students: number; homeworks: number };
}

export interface ClassDetail {
  id: number;
  name: string;
  description?: string;
  students: { student: Student; joinedAt: string }[];
  homeworks: { homework: HomeworkDetail; dueDate?: string; assignedAt: string }[];
}

export interface HomeworkItem {
  id: number;
  title: string;
  description?: string;
  createdAt: string;
  _count: { phonemes: number; classes: number };
}

export interface HomeworkDetail {
  id: number;
  title: string;
  description?: string;
  phonemes: { orderIndex: number; phoneme: { id: number; symbol: string; audioUrl: string; type: string } }[];
  classes?: { class: ClassItem }[];
}
