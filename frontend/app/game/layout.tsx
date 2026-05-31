'use client';
import { ThemeProvider } from '@mui/material/styles';
import { studentTheme } from '@/lib/student-theme';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={studentTheme}>
      {children}
    </ThemeProvider>
  );
}
