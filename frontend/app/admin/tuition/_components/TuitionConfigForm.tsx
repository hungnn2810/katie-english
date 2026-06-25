'use client';
import { useEffect, useState } from 'react';
import {
  getTuitionConfig,
  updateTuitionConfig,
  CreateTuitionConfigInput,
} from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export default function TuitionConfigForm({
  classId,
  onClose,
  onSaved,
}: {
  classId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<CreateTuitionConfigInput>({
    pricePerSession: 0,
    bookFee: null,
    dueDayOfMonth: 5,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!classId) {
      setFetching(false);
      return;
    }
    getTuitionConfig(classId)
      .then((config) => {
        setForm({
          pricePerSession: config.pricePerSession,
          bookFee: config.bookFee,
          dueDayOfMonth: config.dueDayOfMonth,
        });
      })
      .catch(() => {
        // 404 = no config yet, keep defaults
      })
      .finally(() => setFetching(false));
  }, [classId]);

  function setField<K extends keyof CreateTuitionConfigInput>(
    k: K,
    v: CreateTuitionConfigInput[K],
  ) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateTuitionConfig(classId, form);
      showToast('Cấu hình học phí đã lưu', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lưu thất bại', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <CircularProgress size={24} />;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Cấu hình học phí
      </Typography>

      <Box>
        <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
          Giá/buổi (VNĐ) *
        </FormLabel>
        <TextField
          size="small"
          type="number"
          fullWidth
          required
          value={form.pricePerSession}
          onChange={(e) => setField('pricePerSession', parseInt(e.target.value) || 0)}
          slotProps={{ htmlInput: { min: 0 } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          helperText={form.pricePerSession > 0 ? `${form.pricePerSession.toLocaleString('vi-VN')} đ` : undefined}
        />
      </Box>

      <Box>
        <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
          Tiền sách (VNĐ, tuỳ chọn)
        </FormLabel>
        <TextField
          size="small"
          type="number"
          fullWidth
          value={form.bookFee ?? ''}
          onChange={(e) =>
            setField('bookFee', e.target.value ? parseInt(e.target.value) : null)
          }
          slotProps={{ htmlInput: { min: 0 } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          helperText={form.bookFee && form.bookFee > 0 ? `${form.bookFee.toLocaleString('vi-VN')} đ` : undefined}
        />
      </Box>

      <Box>
        <FormLabel sx={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
          Ngày hạn trong tháng (1–31) *
        </FormLabel>
        <TextField
          size="small"
          type="number"
          fullWidth
          required
          value={form.dueDayOfMonth}
          onChange={(e) => setField('dueDayOfMonth', parseInt(e.target.value) || 5)}
          slotProps={{ htmlInput: { min: 1, max: 31 } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
        <Button type="button" variant="outlined" onClick={onClose} sx={{ borderRadius: 2, fontWeight: 600 }}>
          Huỷ
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {loading ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
      </Box>
    </Box>
  );
}
