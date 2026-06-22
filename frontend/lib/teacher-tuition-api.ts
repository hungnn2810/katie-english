import { authHeaders } from './auth';
import { fetchWithRetry } from './fetch-with-retry';
import type {
  TuitionConfig,
  TuitionRecord,
  TuitionReportItem,
  CreateTuitionConfigInput,
  GenerateRecordsInput,
  RecordPaymentInput,
  SendNotificationsInput,
  SendNotificationsResult,
} from './admin-portal-api';

export type {
  TuitionConfig,
  TuitionRecord,
  TuitionReportItem,
  CreateTuitionConfigInput,
  GenerateRecordsInput,
  RecordPaymentInput,
  SendNotificationsInput,
  SendNotificationsResult,
};

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
  const res = await fetchWithRetry(`${API_URL}${path}`, {
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) return parseApiError(res);
  return res.json();
}

export const getTuitionConfig = (classId: number) =>
  req<TuitionConfig>(`/admin/tuition/config/${classId}`);

export const updateTuitionConfig = (classId: number, data: CreateTuitionConfigInput) =>
  req<TuitionConfig>(`/admin/tuition/config/${classId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const createTuitionRecords = (data: GenerateRecordsInput) =>
  req<TuitionRecord[]>('/admin/tuition/records/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const recordTuitionPayment = (recordId: number, data: RecordPaymentInput) =>
  req<TuitionRecord>(`/admin/tuition/records/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const sendTuitionNotifications = (data: SendNotificationsInput) =>
  req<SendNotificationsResult>('/admin/tuition/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const getTuitionReport = (params: { classId: number; month: number; year: number; statuses?: string[] }) =>
  req<TuitionReportItem[]>(
    `/admin/tuition/report?classId=${params.classId}&month=${params.month}&year=${params.year}${params.statuses?.length ? '&status=' + params.statuses.join(',') : ''}`,
  );
