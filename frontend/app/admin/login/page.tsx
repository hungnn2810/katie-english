'use client';
import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';

const ACCENT = '#4F9DFF';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Invalid email or password');
      }
      window.location.href = (process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? '') + '/admin';
    } catch {
      // D-14 + T-06-02-04: never reveal which field failed.
      // Also handles HTTP 429 throttle responses — UI shows the same generic message
      // so the rate-limit counter is never exposed to the user (M-02).
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#F7F9FC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
    }}>
      <Card sx={{
        width: '100%',
        maxWidth: 420,
        borderRadius: 4,
        boxShadow: '0 6px 16px rgba(15,23,42,0.12)',
        p: '40px',
      }}>
        {/* Logo + title */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 3, bgcolor: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79,157,255,0.4)', mb: 1.5,
          }}>
            <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 20 }}>K</Typography>
          </Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary', letterSpacing: '-0.01em' }}>
            Katie English
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25 }}>
            Admin Portal
          </Typography>
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            id="email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@katie.com"
            required
            autoComplete="email"
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            {error && <Alert severity="error" sx={{ mt: 1, borderRadius: 2 }}>{error}</Alert>}
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth
            sx={{
              bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 },
              fontWeight: 600, color: 'white', borderRadius: 2, py: 1.25, mt: 0.5,
            }}
          >
            {loading ? 'Đăng nhập...' : 'Đăng nhập'}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
