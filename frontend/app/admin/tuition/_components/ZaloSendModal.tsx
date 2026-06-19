'use client';
import { useState } from 'react';
import { sendTuitionNotifications } from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

export default function ZaloSendModal({
  open,
  recordIds,
  onClose,
  onSent,
}: {
  open: boolean;
  recordIds: number[];
  onClose: () => void;
  onSent: () => void;
}) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      const result = await sendTuitionNotifications({ recordIds });
      showToast(
        `Đã gửi ${result.successCount}/${result.totalRecords} thông báo`,
        result.successCount === result.totalRecords ? 'success' : 'warning',
      );
      onSent();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gửi thông báo thất bại', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Gửi thông báo Zalo ZNS</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Gửi thông báo học phí tới phụ huynh của <strong>{recordIds.length}</strong> học sinh qua Zalo ZNS?
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Thông tin số điện thoại sẽ không hiển thị ở đây. Hệ thống sẽ gửi tới số đã đăng ký trong hồ sơ phụ huynh.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600 }}>
          Huỷ
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={loading || recordIds.length === 0}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {loading ? 'Đang gửi...' : 'Gửi thông báo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
