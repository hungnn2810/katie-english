'use client';
import { useState } from 'react';
import { recordTuitionPayment } from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

export default function PaymentRecordDialog({
  open,
  recordId,
  studentName,
  totalAmount,
  onClose,
  onSaved,
}: {
  open: boolean;
  recordId: number;
  studentName: string;
  totalAmount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await recordTuitionPayment(recordId, { paidAt, paidBy });
      showToast('Đã ghi nhận đóng học phí', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ghi nhận thất bại', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Ghi nhận đóng học phí — {studentName} ({totalAmount.toLocaleString('vi-VN')} VNĐ)
      </DialogTitle>
      <Box component="form" onSubmit={handleRecord}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
              Ngày đóng *
            </FormLabel>
            <TextField
              size="small"
              type="date"
              fullWidth
              required
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          <Box>
            <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
              Người ghi nhận *
            </FormLabel>
            <TextField
              size="small"
              fullWidth
              required
              placeholder="Tên admin hoặc giáo viên"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
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
            {loading ? 'Đang lưu...' : 'Xác nhận đã đóng'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
