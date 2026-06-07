import { createTheme } from '@mui/material/styles';
import { keyframes } from '@emotion/react';

export const fadeIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

export const slideUp = keyframes`
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
`;

export const baseTheme = createTheme({
  palette: {
    primary: { main: '#4F9DFF', contrastText: '#ffffff' },
    secondary: { main: '#6ED6C1', contrastText: '#0F172A' },
    error: { main: '#FF7B7B' },
    warning: { main: '#FFD166' },
    background: { default: '#F7F9FC', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B' },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
  },
  shape: { borderRadius: 4 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F7F9FC',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
});
