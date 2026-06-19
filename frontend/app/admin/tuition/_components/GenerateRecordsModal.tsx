'use client';
import { useState } from 'react';
import { createTuitionRecords } from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

export default function GenerateRecordsModal({
  open,
  classId,
  onClose,
  onSaved,
}: {
  open: boolean;
  classId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createTuitionRecords({ classId, month, year });
      showToast('Tạo phiếu thu thành công', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Tạo phiếu thu thất bại', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Tạo phiếu thu tháng</DialogTitle>
      <Box component="form" onSubmit={handleGenerate}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="warning.main" sx={{ fontStyle: 'italic' }}>
            Nếu phiếu thu đã tồn tại cho tháng này, hệ thống sẽ báo lỗi.
          </Typography>

          <Box>
            <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
              Tháng (1–12) *
            </FormLabel>
            <TextField
              size="small"
              type="number"
              fullWidth
              required
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
              slotProps={{ htmlInput: { min: 1, max: 12 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          <Box>
            <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
              Năm *
            </FormLabel>
            <TextField
              size="small"
              type="number"
              fullWidth
              required
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
              slotProps={{ htmlInput: { min: 2020, max: 2099 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600 }}>
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {loading ? 'Đang tạo...' : 'Tạo phiếu thu'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
