'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createTuitionRecords, GenerateRecordsInput, TuitionRecord } from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ModalShell, { sectionInputSx } from '@/components/ui/ModalShell';
import FormSection from '@/components/ui/FormSection';

export default function GenerateRecordsModal({
  open,
  classId,
  onClose,
  onSaved,
  createRecordsFn = createTuitionRecords,
}: {
  open: boolean;
  classId: number;
  onClose: () => void;
  onSaved: () => void;
  createRecordsFn?: (data: GenerateRecordsInput) => Promise<TuitionRecord[]>;
}) {
  const t = useTranslations('teacher.tuition.generateModal');
  const { showToast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createRecordsFn({ classId, month, year });
      showToast(t('toasts.created'), 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('toasts.create_error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell
      open={open}
      title={t('title')}
      onClose={onClose}
      onSubmit={handleGenerate}
      submitLabel={loading ? t('creating') : t('generate')}
      loading={loading}
    >
      <Typography variant="body2" color="warning.main" sx={{ fontStyle: 'italic', px: 0.5 }}>
        {t('warning')}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <FormSection label={t('monthLabel')}>
          <TextField
            size="small" type="number" fullWidth required
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
            slotProps={{ htmlInput: { min: 1, max: 12 } }}
            sx={sectionInputSx}
          />
        </FormSection>
        <FormSection label={t('yearLabel')}>
          <TextField
            size="small" type="number" fullWidth required
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            slotProps={{ htmlInput: { min: 2020, max: 2099 } }}
            sx={sectionInputSx}
          />
        </FormSection>
      </Box>
    </ModalShell>
  );
}
