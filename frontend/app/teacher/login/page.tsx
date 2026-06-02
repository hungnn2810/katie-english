'use client';
import { useState } from 'react';
import { GraduationCap, Mic } from 'lucide-react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

const ACCENT = '#F0623A';

export default function TeacherLoginPage() {
  const [upn, setUpn] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/teacher-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upn, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Invalid credentials');
      }
      window.location.href = (process.env.NEXT_PUBLIC_APP_ORIGIN ?? '') + '/teacher';
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', minWidth: 1024 }}>
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
            Teacher Portal<br />
            <Box component="span" sx={{ color: ACCENT }}>the smart way</Box>
          </Typography>
          <Typography sx={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6, maxWidth: 280 }}>
            Create homework, manage classes, and track student progress with AI-powered scoring.
          </Typography>
        </Box>

        {/* Feature list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { icon: GraduationCap, text: 'Manage your classes and students' },
            { icon: Mic, text: 'AI-scored pronunciation homework' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: 'rgba(240,98,58,0.15)' }}>
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
            <Typography sx={{ fontSize: 24, fontWeight: 900, color: 'text.primary', mb: 1, letterSpacing: '-0.02em' }}>Teacher Login</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Sign in to your teacher account</Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              id="upn"
              type="email"
              label="Email"
              value={upn}
              onChange={(e) => setUpn(e.target.value)}
              placeholder="teacher@katie.com"
              required
              autoComplete="email"
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <Box>
              <TextField
                id="password"
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
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
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
