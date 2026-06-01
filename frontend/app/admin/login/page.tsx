'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/admin-auth';
import { Shield, Lock } from 'lucide-react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

const ACCENT = '#4F9DFF';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email, password);
      router.push('/admin');
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
    <Box sx={{ minHeight: '100vh', display: 'flex', minWidth: 1024 }}>
      {/* Left panel — dark navy */}
      <Box sx={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 6, bgcolor: '#0C1220' }}>
        <Box>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 8 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: ACCENT, flexShrink: 0, boxShadow: 3 }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 16 }}>K</Typography>
            </Box>
            <Typography sx={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Katie English</Typography>
          </Box>

          <Typography sx={{ fontSize: 36, fontWeight: 900, color: 'white', lineHeight: 1.15, mb: 2, letterSpacing: '-0.02em' }}>
            Admin Login<br />
            <Box component="span" sx={{ color: ACCENT }}>portal access</Box>
          </Typography>
          <Typography sx={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6, maxWidth: 280 }}>
            Manage teachers, classes, students, and review platform-wide statistics.
          </Typography>
        </Box>

        {/* Feature list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { icon: Shield, text: 'Secure administrator access' },
            { icon: Lock, text: 'Rate-limited login protection' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: 'rgba(79,157,255,0.15)' }}>
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
            <Typography sx={{ fontSize: 24, fontWeight: 900, color: 'text.primary', mb: 1, letterSpacing: '-0.02em' }}>Admin Login</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Platform administrator access</Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              {error && <Alert severity="error" sx={{ mt: 1, borderRadius: 2 }}>{error}</Alert>}
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, fontWeight: 600, color: 'white', borderRadius: 3, py: 1.5 }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
