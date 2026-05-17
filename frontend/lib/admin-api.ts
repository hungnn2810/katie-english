import { authHeaders } from './auth';

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
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) return parseApiError(res);
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

export interface PasswordResetRequest {
  id: number;
  upn: string;
  createdAt: string;
  student: { fullname: string } | null;
}

export const getPasswordResetRequests = () => req<PasswordResetRequest[]>('/auth/password-reset-requests');
export const resetStudentPassword = (userId: number, newPassword: string) =>
  req<{ success: true }>('/auth/reset-student-password', {
    method: 'POST',
    body: JSON.stringify({ userId, newPassword }),
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

// Homework templates
export const getHomeworkList = () => req<HomeworkItem[]>('/homework');
export const getHomework = (id: number) => req<HomeworkDetail>(`/homework/${id}`);
export const createHomework = (data: CreateHomeworkInput) =>
  req<HomeworkItem>('/homework', { method: 'POST', body: JSON.stringify(data) });
export const updateHomework = (id: number, data: UpdateHomeworkInput) =>
  req<HomeworkItem>(`/homework/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteHomework = (id: number) =>
  req<HomeworkItem>(`/homework/${id}`, { method: 'DELETE' });

// Assignments
export const createAssignment = (data: CreateAssignmentInput) =>
  req<AssignmentItem>('/homework/assignment', { method: 'POST', body: JSON.stringify(data) });
export const updateAssignment = (id: number, data: UpdateAssignmentInput) =>
  req<AssignmentItem>(`/homework/assignment/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAssignment = (id: number) =>
  req<AssignmentItem>(`/homework/assignment/${id}`, { method: 'DELETE' });

// Sessions (teacher view)
export const getSessionResults = (assignmentId?: number, studentId?: number) => {
  const params = new URLSearchParams();
  if (assignmentId) params.set('assignmentId', String(assignmentId));
  if (studentId) params.set('studentId', String(studentId));
  return req<GameSession[]>(`/game/sessions?${params}`);
};

// Game
export const getSession = (id: number) => req<GameSession>(`/game/session/${id}`);
export const getAvailableHomework = (studentId: number) =>
  req<AssignmentItem[]>(`/game/homework/${studentId}`);
export const startSession = (studentId: number, assignmentId: number) =>
  req<GameSession>('/game/session/start', {
    method: 'POST',
    body: JSON.stringify({ studentId, assignmentId }),
  });

export async function savePhonicsResult(
  sessionId: number,
  wordId: number,
  audio?: Blob,
): Promise<PhonicsItemResult> {
  const form = new FormData();
  form.append('wordId', String(wordId));
  if (audio && audio.size > 0) form.append('audio', audio, 'audio.webm');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_URL}/game/session/${sessionId}/phonics-result`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) return parseApiError(res);
  return res.json();
}

export async function saveSpeakingResult(
  sessionId: number,
  audio?: Blob,
): Promise<SpeakingResult> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const form = new FormData();
  if (audio && audio.size > 0) {
    const filename = (audio as File).name ?? 'audio.webm';
    form.append('audio', audio, filename);
  }
  const res = await fetch(`${API_URL}/game/session/${sessionId}/speaking-result`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) return parseApiError(res);
  return res.json();
}

export async function uploadSpeakingImage(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/homework/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) return parseApiError(res);
  const { key } = await res.json() as { key: string };
  return `${API_URL}/homework/image/${key}`;
}

export async function completeSession(sessionId: number, videoBlob?: Blob) {
  const form = new FormData();
  if (videoBlob) {
    const filename = (videoBlob as File).name ?? 'recording.webm';
    form.append('recording', videoBlob, filename);
  }
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_URL}/game/session/${sessionId}/complete`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) return parseApiError(res);
  return res.json() as Promise<GameSession>;
}

export async function saveReadingResult(
  sessionId: number,
  data: { correctItems: number; totalItems: number },
): Promise<ReadingResult> {
  return req<ReadingResult>(`/game/session/${sessionId}/reading-result`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
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
  _count?: { students: number };
}

export interface ClassDetail extends ClassItem {
  students: Student[];
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

export type HomeworkType = 'PHONICS' | 'SPEAKING' | 'READING';
export type SpeakingMode = 'FREE_SPEAK' | 'SCRIPT_MATCH';

export type ReadingActivityType = 'MATCH' | 'FILL_BLANK';

export interface MatchPair {
  id: number;
  activityId: number;
  imageUrl: string;
  word: string;
  order: number;
}

export interface FillBlankChoice {
  id: number;
  blankId: number;
  word: string;
  isCorrect: boolean;
}

export interface FillBlank {
  id: number;
  activityId: number;
  sentence: string;
  order: number;
  choices: FillBlankChoice[];
}

export interface ReadingActivity {
  id: number;
  homeworkId: number;
  type: ReadingActivityType;
  order: number;
  matchPairs?: MatchPair[];
  fillBlanks?: FillBlank[];
}

export interface ReadingResult {
  id: number;
  sessionId: number;
  totalItems: number;
  correctItems: number;
  score: number;
}

export interface CreateMatchPairInput {
  imageUrl: string;
  word: string;
}

export interface CreateFillBlankChoiceInput {
  word: string;
  isCorrect: boolean;
}

export interface CreateFillBlankItemInput {
  sentence: string;
  choices: CreateFillBlankChoiceInput[];
}

export interface CreateReadingActivityInput {
  type: ReadingActivityType;
  pairs?: CreateMatchPairInput[];
  items?: CreateFillBlankItemInput[];
}

export interface CreateWordInput {
  text: string;
  highlight?: string;
  imageUrl?: string;
}

export interface CreatePartInput {
  name: string;
  words: CreateWordInput[];
}

export interface CreateHomeworkInput {
  type: HomeworkType;
  speakingMode?: SpeakingMode;
  name?: string;
  parts?: CreatePartInput[];
  speakingPictureUrl?: string;
  speakingText?: string;
  readingActivities?: CreateReadingActivityInput[];
}

export interface UpdateHomeworkInput {
  speakingMode?: SpeakingMode;
  name?: string;
  parts?: CreatePartInput[];
  speakingPictureUrl?: string;
  speakingText?: string;
}

export interface CreateAssignmentInput {
  homeworkId: number;
  classIds: number[];
  endDate: string;
}

export interface UpdateAssignmentInput {
  classIds?: number[];
  endDate?: string;
}

export interface AssignmentClass {
  id: number;
  assignmentId: number;
  classId: number;
  class: ClassItem;
}

export interface AssignmentItem {
  id: number;
  homeworkId: number;
  endDate: string;
  homework: HomeworkItem;
  classes: AssignmentClass[];
  sessions?: GameSession[];
  _count?: { sessions: number };
  createdAt: string;
}

export interface HomeworkWord {
  id: number;
  partId: number;
  text: string;
  highlight?: string | null;
  imageUrl?: string | null;
  order: number;
}

export interface HomeworkPart {
  id: number;
  homeworkId: number;
  name: string;
  order: number;
  words: HomeworkWord[];
}

export interface HomeworkItem {
  id: number;
  type: HomeworkType;
  speakingMode?: SpeakingMode | null;
  name?: string | null;
  parts: HomeworkPart[];
  speakingPictureUrl?: string | null;
  speakingText?: string | null;
  assignments: AssignmentItem[];
  createdAt: string;
  readingActivities?: ReadingActivity[];
}

export interface HomeworkDetail extends HomeworkItem {
  assignments: (AssignmentItem & { sessions: GameSession[] })[];
}

export interface SpeakingResult {
  id: number;
  sessionId: number;
  transcribedText?: string;
  score: number;
  matchedWords: number;
  totalWords: number;
}

export interface GameSession {
  id: number;
  studentId: number;
  assignmentId: number;
  videoUrl?: string;
  score?: number;
  completedAt?: string;
  startedAt: string;
  assignment?: AssignmentItem;
  student?: Student;
  speakingResults?: SpeakingResult[];
  phonicsResults?: PhonicsItemResult[];
  readingResult?: ReadingResult;
}

export interface PhonemeAlignment {
  symbol: string;
  ipa: string;
  start: number;
  end: number;
  duration: number;
}

export interface PhonemeOp {
  status: 'correct' | 'similar' | 'substituted' | 'missing' | 'extra' | 'error';
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

export interface PhonicsItemResult {
  id: number;
  sessionId: number;
  wordId: number;
  word: HomeworkWord;
  transcribedText?: string;
  score: number;
  bfa?: BfaResult | null;
}
