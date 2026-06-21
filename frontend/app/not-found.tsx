'use client';
import { Globe } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function NotFound() {
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
          maxWidth: 440,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Icon circle */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'rgba(79,157,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <Globe size={40} color="#4F9DFF" />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Page not found
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          This subdomain is not recognized.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
          <Button
            component="a"
            href={`${process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'https://admin.katie-english.com.vn'}/admin/login`}
            variant="text"
            sx={{ color: '#4F9DFF' }}
          >
            Admin Login — admin.katie-english.com.vn
          </Button>

          <Button
            component="a"
            href={`${process.env.NEXT_PUBLIC_TEACHER_ORIGIN ?? 'https://app.katie-english.com.vn'}/teacher/login`}
            variant="text"
            sx={{ color: '#F0623A' }}
          >
            Teacher Login — app.katie-english.com.vn
          </Button>

          <Button
            component="a"
            href={`${process.env.NEXT_PUBLIC_STUDENT_ORIGIN ?? 'https://student.katie-english.com.vn'}/login`}
            variant="text"
            sx={{ color: '#A78BFA' }}
          >
            Student Login — student.katie-english.com.vn
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
