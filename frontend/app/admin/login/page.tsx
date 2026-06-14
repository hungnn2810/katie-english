'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import { useToast } from '@/lib/toast-context';
import { colors } from '@/lib/colors';

const ACCENT = colors.primary;

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      router.push('/admin');
    } catch {
      showToast('Invalid email or password', 'error');
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
