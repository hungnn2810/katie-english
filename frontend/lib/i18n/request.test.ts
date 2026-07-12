jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// next-intl/server ships ESM-only with no require() entry point; stub it out
// since these tests only exercise resolveLocale(), not the getRequestConfig default export.
jest.mock('next-intl/server', () => ({
  getRequestConfig: (fn: unknown) => fn,
}));

import { cookies } from 'next/headers';
import { resolveLocale } from './request';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('resolveLocale', () => {
  it('returns "vi" when NEXT_LOCALE cookie is undefined', async () => {
    (cookies as jest.Mock).mockResolvedValue({ get: () => undefined });

    const locale = await resolveLocale();

    expect(locale).toBe('vi');
  });

  it('returns "en" when NEXT_LOCALE cookie value is "en"', async () => {
    (cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'en' }) });

    const locale = await resolveLocale();

    expect(locale).toBe('en');
  });

  it('returns "vi" (falls back, does not throw) when cookie value is invalid/tampered', async () => {
    (cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: '../../etc/passwd' }) });

    const locale = await resolveLocale();

    expect(locale).toBe('vi');
  });
});
