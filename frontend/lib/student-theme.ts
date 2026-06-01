import { createTheme } from '@mui/material/styles';
import { baseTheme } from './theme';

export const studentTheme = createTheme(baseTheme, {
  // Extends base — only overrides are specified (D-05)
  palette: {
    primary: { main: '#A78BFA', contrastText: '#ffffff' }, // playful purple
  },
  typography: {
    fontSize: 16, // slightly larger base (default is 14)
  },
  shape: { borderRadius: 16 }, // rounder corners for kids
});
