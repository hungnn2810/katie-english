import type { ReactNode } from 'react';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <div style={{ minWidth: 1280 }}>{children}</div>;
}
