'use server';

import { cookies } from 'next/headers';
import type { Locale } from './request';

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, { maxAge: 31536000, path: '/' });
}
