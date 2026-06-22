import { getAdminToken } from '@/lib/admin-auth';
import { getToken } from '@/lib/auth';
import { fetchWithRetry } from '@/lib/fetch-with-retry';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ---- Types ----------------------------------------------------------------

export interface ImportError {
  sheet: 'Classes' | 'Students' | 'Homework';
  row: number;
  column: string;
  message: string;
}

export interface ImportResult {
  imported: {
    classes: number;
    students: number;
    homework: number;
  };
}

export interface ImportErrorResult {
  errors: ImportError[];
}

export type ImportResponse = ImportResult | ImportErrorResult;

// ---- Type guard -----------------------------------------------------------

export function isImportError(response: ImportResponse): response is ImportErrorResult {
  return 'errors' in response;
}

// ---- API helpers ----------------------------------------------------------

/**
 * Upload an import file (.xlsx) to the backend.
 * role='admin' uses getAdminToken(); role='teacher' uses getToken().
 * CRITICAL: do NOT set Content-Type header — browser sets the multipart
 * boundary automatically when body is FormData.
 */
export async function uploadImportFile(
  file: File,
  role: 'admin' | 'teacher',
): Promise<ImportResponse> {
  const token = role === 'admin' ? getAdminToken() : getToken();

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetchWithRetry(`${API_URL}/import/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(body.message ?? 'Upload failed');
  }

  return res.json() as Promise<ImportResponse>;
}

/**
 * Download the import Excel template.
 * Triggers a browser download via a programmatic anchor click.
 */
export async function downloadTemplate(role: 'admin' | 'teacher'): Promise<void> {
  const token = role === 'admin' ? getAdminToken() : getToken();

  const res = await fetchWithRetry(`${API_URL}/import/template`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Failed to download template');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'import-template.xlsx';
  a.click();

  URL.revokeObjectURL(url);
}
