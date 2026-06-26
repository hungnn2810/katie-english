'use client';
import { useState } from 'react';
import { recordTuitionPayment } from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import TextField from '@mui/material/TextField';
import ModalShell, { sectionInputSx } from '@/components/ui/ModalShell';
import FormSection from '@/components/ui/FormSection';

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
    <ModalShell
      open={open}
      title={`${studentName} — ${totalAmount.toLocaleString('vi-VN')} VNĐ`}
      onClose={onClose}
      onSubmit={handleRecord}
      submitLabel={loading ? 'Đang lưu...' : 'Xác nhận đã đóng'}
      loading={loading}
    >
      <FormSection label="Ngày đóng">
        <TextField
          size="small" type="date" fullWidth required
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          sx={sectionInputSx}
        />
      </FormSection>
      <FormSection label="Người ghi nhận">
        <TextField
          size="small" fullWidth required
          placeholder="Tên admin hoặc giáo viên"
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          sx={sectionInputSx}
        />
      </FormSection>
    </ModalShell>
  );
}
