jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

import { cookies } from 'next/headers';
import { setLocale } from './actions';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('setLocale', () => {
  it('sets the NEXT_LOCALE cookie with a 1-year maxAge and root path', async () => {
    const set = jest.fn();
    (cookies as jest.Mock).mockResolvedValue({ set });

    await setLocale('en');

    expect(set).toHaveBeenCalledWith('NEXT_LOCALE', 'en', { maxAge: 31536000, path: '/' });
  });
});
