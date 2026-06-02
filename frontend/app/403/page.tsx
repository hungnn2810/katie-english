'use client';
import { ShieldOff } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

// Detect subdomain accent color from env var set at build/start time
const subdomain = process.env.NEXT_PUBLIC_SUBDOMAIN ?? '';
const accent =
  subdomain === 'admin' ? '#4F9DFF' :
  subdomain === 'student' ? '#A78BFA' :
  '#F0623A'; // default: app/teacher subdomain

export default function AccessDeniedPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F7F9FC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          p: 6,
          textAlign: 'center',
          maxWidth: 400,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Icon circle */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: `${accent}26`, // 15% opacity hex (26 = ~15% of 255)
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <ShieldOff size={40} color={accent} />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Access Denied
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 0 }}>
          You don&apos;t have access to this area
        </Typography>

        <Button
          variant="outlined"
          onClick={() => { window.location.href = '/login'; }}
          sx={{ mt: 3, borderColor: accent, color: accent, '&:hover': { borderColor: accent } }}
        >
          Go to Login
        </Button>
      </Box>
    </Box>
  );
}
