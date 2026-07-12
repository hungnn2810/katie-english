import { resolveLocale } from './request';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

import { cookies } from 'next/headers';

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
