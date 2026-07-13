'use client';
// Teacher tuition: uses authHeaders() (teacher JWT) via teacher-tuition-api for all direct API calls
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getClasses, ClassItem } from '@/lib/admin-api';
import {
  getTuitionConfig,
  updateTuitionConfig,
  createTuitionRecords,
  getTuitionReport,
} from '@/lib/teacher-tuition-api';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import PageLoading, { PAGE_LOADING_DELAY } from '@/components/ui/PageLoading';
import FormLabel from '@mui/material/FormLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import TuitionConfigForm from '../../admin/tuition/_components/TuitionConfigForm';
import GenerateRecordsModal from '../../admin/tuition/_components/GenerateRecordsModal';
import TuitionReportTable from '../../admin/tuition/_components/TuitionReportTable';

export default function TeacherTuitionPage() {
  const t = useTranslations('teacher.tuition.page');
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);

  // Report period state
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      // getClasses uses teacher JWT — backend filters to teacher's own classes
      const data = await getClasses();
      setClasses(data);
      if (data.length > 0) setSelectedClassId(data[0].id);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('toasts.load_classes_error'), 'error');
    } finally {
      setTimeout(() => setLoading(false), PAGE_LOADING_DELAY);
    }
  }, [showToast]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  if (loading) {
    return <PageLoading />;
  }

  if (classes.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('emptyClasses')}</Typography>
      </Box>
    );
  }

  const classId = typeof selectedClassId === 'number' ? selectedClassId : 0;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
        {t('heading')}
      </Typography>

      {/* Class selector */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormLabel sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', minWidth: 60 }}>
          {t('classLabel')}
        </FormLabel>
        <Select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value as number)}
          size="small"
          sx={{ minWidth: 240, borderRadius: 2 }}
        >
          {classes.map((cls) => (
            <MenuItem key={cls.id} value={cls.id}>
              {cls.name} ({cls.code})
            </MenuItem>
          ))}
        </Select>
      </Box>

      {classId === 0 ? (
        <Typography color="text.secondary">{t('noClassSelected')}</Typography>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
          >
            <Tab label={t('tabs.config')} />
            <Tab label={t('tabs.generate')} />
            <Tab label={t('tabs.report')} />
          </Tabs>

          <CardContent sx={{ p: 3 }}>
            {activeTab === 0 && (
              <TuitionConfigForm
                classId={classId}
                onClose={() => {}}
                onSaved={() => {}}
                getConfigFn={getTuitionConfig}
                updateConfigFn={updateTuitionConfig}
              />
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('generateIntro')}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setGenerateOpen(true)}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  {t('generateButton')}
                </Button>
                <GenerateRecordsModal
                  open={generateOpen}
                  classId={classId}
                  onClose={() => setGenerateOpen(false)}
                  onSaved={() => {}}
                  createRecordsFn={createTuitionRecords}
                />
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box>
                    <FormLabel sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      {t('monthLabel')}
                    </FormLabel>
                    <TextField
                      type="number"
                      size="small"
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      sx={{ width: 80 }}
                    />
                  </Box>
                  <Box>
                    <FormLabel sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      {t('yearLabel')}
                    </FormLabel>
                    <TextField
                      type="number"
                      size="small"
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      sx={{ width: 110 }}
                    />
                  </Box>
                </Box>
                {classId !== 0 ? (
                  <TuitionReportTable
                    classId={classId}
                    month={reportMonth}
                    year={reportYear}
                    getReportFn={getTuitionReport}
                  />
                ) : (
                  <Typography color="text.secondary">{t('selectClassForReport')}</Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
