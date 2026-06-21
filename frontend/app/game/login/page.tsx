'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { useToast } from '@/lib/toast-context';
import { setAuth } from '@/lib/auth';
import { colors } from '@/lib/colors';

const ACCENT = colors.purple;
const FIELD_STYLE = {
  width: '100%',
  fontFamily: 'Inter',
  fontSize: 17,
  fontWeight: 600,
  padding: '15px 16px',
  borderRadius: 14,
  border: '2px solid rgba(167,139,250,0.25)',
  background: 'rgba(255,255,255,0.85)',
  color: '#1F2937',
  outline: 'none',
  boxSizing: 'border-box' as const,
};
const CLASS_CODE_STYLE = {
  ...FIELD_STYLE,
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  padding: '17px 16px',
  background: '#FAF5FF',
  border: '2.5px solid #C4B5FD',
  borderRadius: 16,
  color: '#5B21B6',
};

export default function StudentLoginPage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const ready = classCode.trim().length >= 2 && name.trim().length >= 1 && password.length >= 4;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!ready) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode, name, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Mã lớp hoặc tên không đúng');
      }
      const data = await res.json();
      setAuth(data.token, data.user);
      window.location.href = '/game/homework';
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Mã lớp hoặc tên không đúng', 'error');
    } finally {
      setLoading(false);
    }
  }

  const codeBad = tried && classCode.trim().length < 2;
  const nameBad = tried && name.trim().length < 1;
  const pwBad = tried && password.length < 4;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: { sm: 'center' }, justifyContent: { sm: 'center' }, px: { xs: '26px', sm: 3 }, py: '32px' }}>
      <Box sx={{ width: '100%', maxWidth: { sm: 440 }, display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF', borderRadius: { sm: '24px' }, p: { xs: '28px', sm: '40px' }, boxShadow: { sm: '0 8px 40px rgba(109,40,217,0.12), 0 2px 8px rgba(0,0,0,0.06)' }, border: { sm: '1.5px solid rgba(167,139,250,0.2)' } }}>
      {/* K monogram + brand name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '11px', mb: '28px' }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '13px',
          bgcolor: ACCENT, color: '#fff',
          fontWeight: 900, fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          K
        </Box>
        <Typography sx={{ color: '#4C1D95', fontWeight: 900, fontSize: 20 }}>Katie English</Typography>
      </Box>

      {/* Heading */}
      <Typography sx={{ fontSize: { xs: 28, sm: 34 }, fontWeight: 900, color: '#1F2937', lineHeight: 1.1, letterSpacing: '-0.02em', mb: '10px' }}>
        Học tiếng Anh<br />
        <Box component="span" sx={{ color: ACCENT }}>thật vui!</Box>
      </Typography>
      <Typography sx={{ color: '#6B7280', fontSize: 15, mb: '24px' }}>
        Đăng nhập để bắt đầu nào.
      </Typography>

      {/* Fields */}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Class code */}
        <Box>
          <Typography sx={{ color: '#4B5563', fontSize: 13, fontWeight: 700, mb: '7px' }}>Mã lớp</Typography>
          <input
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="VD: SUN2A"
            autoComplete="off"
            style={{ ...CLASS_CODE_STYLE, borderColor: codeBad ? '#FF7B7B' : '#C4B5FD' }}
          />
        </Box>

        {/* Name */}
        <Box>
          <Typography sx={{ color: '#4B5563', fontSize: 13, fontWeight: 700, mb: '7px' }}>Tên đăng nhập</Typography>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên đăng nhập"
            autoComplete="username"
            style={{ ...FIELD_STYLE, borderColor: nameBad ? '#FF7B7B' : 'rgba(255,255,255,0.18)' }}
          />
        </Box>

        {/* Password */}
        <Box>
          <Typography sx={{ color: '#4B5563', fontSize: 13, fontWeight: 700, mb: '7px' }}>Mật khẩu</Typography>
          <Box sx={{ position: 'relative' }}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 4 ký tự"
              type={showPw ? 'text' : 'password'}
              style={{ ...FIELD_STYLE, paddingRight: 48, borderColor: pwBad ? '#FF7B7B' : 'rgba(255,255,255,0.18)' }}
            />
            <IconButton
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              sx={{
                position: 'absolute', right: { xs: 4, sm: 8 }, top: '50%', transform: 'translateY(-50%)',
                width: { xs: 44, sm: 36 }, height: { xs: 44, sm: 36 }, borderRadius: '10px',
                background: 'rgba(167,139,250,0.1)',
                color: '#6B7280',
                '&:hover': { background: 'rgba(167,139,250,0.2)' },
                p: 0,
              }}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </IconButton>
          </Box>
        </Box>

        {/* Validation error */}
        {tried && !ready && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#FF9BD2', fontSize: 13, fontWeight: 700 }}>
            <AlertCircle size={15} color="#FF9BD2" />
            Em hãy điền đầy đủ thông tin để đăng nhập nhé!
          </Box>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          fullWidth
          sx={{
            mt: 2,
            background: ready
              ? 'linear-gradient(135deg, #4F9DFF, #A78BFA)'
              : '#E5E7EB',
            color: ready ? '#fff' : '#9CA3AF',
            fontWeight: 900, fontSize: 18,
            borderRadius: '16px',
            py: '16px',
            minHeight: 44,
            textTransform: 'none',
            '&:hover': { opacity: 0.9, background: ready ? 'linear-gradient(135deg, #4F9DFF, #A78BFA)' : '#E5E7EB' },
            '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)' },
          }}
        >
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập →'}
        </Button>
      </Box>

      {/* Footer */}
      <Typography sx={{ textAlign: 'center', mt: '14px', color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>
        Quên mật khẩu?{' '}
        <Box component="span" sx={{ color: ACCENT, cursor: 'pointer' }}>Hỏi cô giáo nhé</Box>
      </Typography>
      </Box>
    </Box>
  );
}
