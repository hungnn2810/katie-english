import { NextIntlClientProvider } from 'next-intl';
import { resolveLocale } from '@/lib/i18n/request';
import TeacherLayoutClient from './TeacherLayoutClient';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();
  const messages = (await import(`@/messages/${locale}/teacher.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TeacherLayoutClient>{children}</TeacherLayoutClient>
    </NextIntlClientProvider>
  );
}
