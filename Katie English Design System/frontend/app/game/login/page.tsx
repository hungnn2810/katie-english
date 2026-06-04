'use client';
import { useState } from 'react';
import { BookOpen, Star, Gamepad2 } from 'lucide-react';
import { ThemeProvider } from '@mui/material/styles';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { studentTheme } from '@/lib/student-theme';

// Student purple accent — #A78BFA (matches studentTheme primary)
const ACCENT = '#A78BFA';

export default function StudentLoginPage() {
  const [classCode, setClassCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode, name }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Invalid class code or name');
      }
      window.location.href = (process.env.NEXT_PUBLIC_STUDENT_ORIGIN ?? '') + '/game/homework';
    } catch {
      setError('Invalid class code or name');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemeProvider theme={studentTheme}>
      <Box sx={{ minHeight: '100vh', display: 'flex' }}>
        {/* Left panel — dark navy */}
        <Box sx={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 6, bgcolor: '#0C1220' }}>
          <Box>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 8 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: ACCENT, flexShrink: 0, boxShadow: 3 }}>
                <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 16 }}>K</Typography>
              </Box>
              <Typography sx={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Katie English</Typography>
            </Box>

            <Typography sx={{ fontSize: 36, fontWeight: 900, color: 'white', lineHeight: 1.15, mb: 2, letterSpacing: '-0.02em' }}>
              Play &amp; Learn<br />
              <Box component="span" sx={{ color: ACCENT }}>English</Box>
            </Typography>
            <Typography sx={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6, maxWidth: 280 }}>
              Join your class and start learning English the fun way!
            </Typography>
          </Box>

          {/* Feature list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { icon: BookOpen, text: 'Learn new words every day' },
              { icon: Star, text: 'Earn stars for great pronunciation' },
              { icon: Gamepad2, text: 'Fun games and activities' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: 'rgba(167,139,250,0.15)' }}>
                    <Icon style={{ width: 16, height: 16, color: ACCENT }} />
                  </Box>
                  <Typography sx={{ color: '#94A3B8', fontSize: 14 }}>{f.text}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Right panel */}
        <Box sx={{ flex: 1, bgcolor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6 }}>
          <Box sx={{ width: '100%', maxWidth: 448 }}>
            <Box sx={{ mb: 5 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 900, color: 'text.primary', mb: 1, letterSpacing: '-0.02em' }}>Enter Your Class</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Ask your teacher for the class code</Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                id="classCode"
                type="text"
                label="Class Code"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder="ABC123"
                required
                autoComplete="off"
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              />

              <Box>
                <TextField
                  id="name"
                  type="text"
                  label="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                  fullWidth
                  size="small"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                />
                {error && <Alert severity="error" sx={{ mt: 1, borderRadius: 1 }}>{error}</Alert>}
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                fullWidth
                sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, fontWeight: 600, color: 'white', borderRadius: 1, py: 1.5 }}
              >
                {loading ? 'Entering...' : 'Enter Class'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
