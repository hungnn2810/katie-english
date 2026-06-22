import { uploadImportFile, downloadTemplate, isImportError, ImportResponse } from './import-api';

// Mock modules before imports resolve
jest.mock('./admin-auth', () => ({
  getAdminToken: jest.fn(() => 'test-admin-token'),
}));

jest.mock('./auth', () => ({
  getToken: jest.fn(() => 'test-teacher-token'),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:http://localhost/mock-url');
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(global.URL, 'createObjectURL', { value: mockCreateObjectURL, writable: true });
Object.defineProperty(global.URL, 'revokeObjectURL', { value: mockRevokeObjectURL, writable: true });

// Mock document.createElement to capture anchor click
const mockClick = jest.fn();
const mockCreateElement = jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  const el = Object.create(HTMLElement.prototype) as HTMLAnchorElement;
  el.click = mockClick;
  return el as unknown as HTMLElement;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateObjectURL.mockReturnValue('blob:http://localhost/mock-url');
});

afterAll(() => {
  mockCreateElement.mockRestore();
});

describe('uploadImportFile', () => {
  it('happy path: returns ImportResult on successful upload', async () => {
    const mockFile = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const mockResponse = { imported: { classes: 1, students: 1, homework: 1 } };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as unknown as Response);

    const result = await uploadImportFile(mockFile, 'admin');

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledTimes(1);

    const [, options] = (fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ Authorization: 'Bearer test-admin-token' });
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('error path: throws Error on failed upload', async () => {
    const mockFile = new File([''], 'test.xlsx');

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Bad Request' }),
    } as unknown as Response);

    await expect(uploadImportFile(mockFile, 'admin')).rejects.toThrow();
  });
});

describe('downloadTemplate', () => {
  it('happy path: calls URL.createObjectURL and triggers anchor click', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    } as unknown as Response);

    await expect(downloadTemplate('teacher')).resolves.not.toThrow();

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('error path: throws Error on failed download', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
    } as unknown as Response);

    await expect(downloadTemplate('admin')).rejects.toThrow();
  });
});

describe('isImportError', () => {
  it('returns true for ImportErrorResult (has errors array)', () => {
    const errorResult: ImportResponse = { errors: [] };
    expect(isImportError(errorResult)).toBe(true);
  });

  it('returns false for ImportResult (has imported object)', () => {
    const importResult: ImportResponse = { imported: { classes: 0, students: 0, homework: 0 } };
    expect(isImportError(importResult)).toBe(false);
  });
});
