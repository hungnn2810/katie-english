'use client';
import { useState } from 'react';
import { sendTuitionNotifications } from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { CheckCircle } from 'lucide-react';
import ModalShell from '@/components/ui/ModalShell';

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
    <ModalShell
      open={open}
      title="Gửi thông báo Zalo ZNS"
      onClose={onClose}
      actions={
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button onClick={onClose} variant="outlined"
            sx={{ borderRadius: '50px', fontWeight: 600, px: 2.5, textTransform: 'none' }}>
            Huỷ
          </Button>
          <Button onClick={handleSend} variant="contained"
            disabled={loading || recordIds.length === 0}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <CheckCircle size={16} />}
            sx={{ borderRadius: '50px', fontWeight: 600, px: 2.5, textTransform: 'none', bgcolor: '#E8ECF6', color: '#6B7280', boxShadow: 'none', '&:hover': { bgcolor: '#DDE2F0', boxShadow: 'none' } }}>
            {loading ? 'Đang gửi...' : 'Gửi thông báo'}
          </Button>
        </Box>
      }
    >
      <Typography variant="body2" sx={{ mb: 0.5, px: 0.5 }}>
        Gửi thông báo học phí tới phụ huynh của <strong>{recordIds.length}</strong> học sinh qua Zalo ZNS?
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
        Thông tin số điện thoại sẽ không hiển thị ở đây. Hệ thống sẽ gửi tới số đã đăng ký trong hồ sơ phụ huynh.
      </Typography>
    </ModalShell>
  );
}
