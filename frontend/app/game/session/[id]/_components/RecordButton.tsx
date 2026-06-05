'use client';
import { Mic, Check } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export type RecordButtonState = 'idle' | 'recording' | 'scoring' | 'done';

interface RecordButtonProps {
  state: RecordButtonState;
  onStart?: () => void;
  onStop?: () => void;
}

export default function RecordButton({ state, onStart, onStop }: RecordButtonProps) {
  const wrap = { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '14px' };

  if (state === 'idle') {
    return (
      <Box sx={wrap}>
        <Box
          component="button"
          onClick={onStart}
          aria-label="Nhấn để ghi âm"
          sx={{
            width: 104, height: 104, borderRadius: '50%',
            border: '4px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
            '&:hover': { borderColor: 'rgba(255,255,255,0.6)', transform: 'scale(1.05)' },
          }}
        >
          <Mic size={42} color="#fff" />
        </Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>Nhấn để ghi âm</Typography>
      </Box>
    );
  }

  if (state === 'recording') {
    return (
      <Box sx={wrap}>
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Ping animation ring */}
          <Box sx={{
            position: 'absolute',
            width: 104, height: 104, borderRadius: '50%',
            background: '#ef4444', opacity: 0.25,
            animation: 'ping 1.3s cubic-bezier(0,0,0.2,1) infinite',
            '@keyframes ping': {
              '0%': { transform: 'scale(1)', opacity: 0.25 },
              '75%, 100%': { transform: 'scale(1.5)', opacity: 0 },
            },
          }} />
          <Box
            component="button"
            onClick={onStop}
            aria-label="Đang ghi âm — nhấn để dừng"
            sx={{
              position: 'relative',
              width: 104, height: 104, borderRadius: '50%',
              border: '4px solid #ef4444',
              background: 'rgba(239,68,68,0.2)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Stop square */}
            <Box sx={{ width: 34, height: 34, borderRadius: '7px', bgcolor: '#f87171' }} />
          </Box>
        </Box>
        <Typography sx={{ color: '#f87171', fontSize: 15, fontWeight: 700 }}>Đang ghi âm… nhấn để dừng</Typography>
      </Box>
    );
  }

  if (state === 'scoring') {
    return (
      <Box sx={wrap}>
        <Box sx={{
          width: 104, height: 104, borderRadius: '50%',
          border: '4px solid rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box sx={{
            width: 40, height: 40,
            border: '4px solid rgba(255,255,255,0.25)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            '@keyframes spin': {
              from: { transform: 'rotate(0deg)' },
              to: { transform: 'rotate(360deg)' },
            },
          }} />
        </Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>Đang chấm điểm…</Typography>
      </Box>
    );
  }

  // done
  return (
    <Box sx={wrap}>
      <Box sx={{
        width: 104, height: 104, borderRadius: '50%',
        border: '4px solid rgba(52,211,153,0.5)',
        background: 'rgba(52,211,153,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Check size={42} color="#34d399" />
      </Box>
      <Typography sx={{ color: '#34d399', fontSize: 16, fontWeight: 800 }}>Xong!</Typography>
    </Box>
  );
}
