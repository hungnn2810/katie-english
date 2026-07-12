import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export type Locale = 'en' | 'vi';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'vi'];

// D-07: default locale on first visit (no cookie set yet) is always Vietnamese.
export const DEFAULT_LOCALE: Locale = 'vi';

/**
 * Reads the NEXT_LOCALE cookie and resolves it to a supported Locale.
 * T-18-01 mitigation: any value not in SUPPORTED_LOCALES (including
 * path-traversal-shaped tampered strings) falls back to DEFAULT_LOCALE,
 * so the dynamic import path used by getRequestConfig below is always
 * one of two fixed, known-safe strings — never attacker-controlled.
 */
export async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get('NEXT_LOCALE')?.value;
  if (value && (SUPPORTED_LOCALES as string[]).includes(value)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`../../messages/${locale}/teacher.json`)).default;
  return { locale, messages };
});
