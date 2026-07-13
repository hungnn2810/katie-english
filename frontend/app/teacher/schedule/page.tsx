'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { CalendarDays } from 'lucide-react';
import { getClasses, ClassItem, ClassStatus } from '@/lib/admin-api';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import PageLoading, { PAGE_LOADING_DELAY } from '@/components/ui/PageLoading';
import { colors } from '@/lib/colors';

const ACCENT = colors.teacherAccent;

export default function TeacherSchedulePage() {
  const t = useTranslations('teacher.schedule');
  const [classes, setClasses]           = useState<ClassItem[]>([]);
  const [pageLoading, setPageLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState<ClassStatus | 'ALL'>('INPROGRESS');

  const FILTERS: { key: ClassStatus | 'ALL'; label: string }[] = [
    { key: 'INPROGRESS', label: t('filters.inProgress') },
    { key: 'PENDING',    label: t('filters.pending') },
    { key: 'ALL',        label: t('filters.all') },
    { key: 'ENDED',      label: t('filters.ended') },
  ];

  useEffect(() => {
    getClasses()
      .then(setClasses)
      .catch(() => {})
      .finally(() => setTimeout(() => setPageLoading(false), PAGE_LOADING_DELAY));
  }, []);

  if (pageLoading) return <PageLoading />;

  const filtered     = statusFilter === 'ALL' ? classes : classes.filter(c => c.status === statusFilter);
  const withSchedule = filtered.filter(c => Array.isArray(c.scheduleSlots) && c.scheduleSlots.some(s => s.time));

  return (
    <Box>
      {/* Filter bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        {FILTERS.map(({ key, label }) => {
          const active = statusFilter === key;
          return (
            <Button
              key={key}
              variant="outlined"
              size="small"
              onClick={() => setStatusFilter(key)}
              sx={{
                borderRadius: 3, fontSize: 12, fontWeight: 600, border: '1px solid',
                ...(active
                  ? { bgcolor: colors.teacherAccentBg, color: ACCENT, borderColor: ACCENT, '&:hover': { bgcolor: colors.teacherAccentBg } }
                  : { bgcolor: 'white', color: 'text.secondary', borderColor: '#E2E8F0' }),
              }}
            >
              {label}
            </Button>
          );
        })}
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 13, color: '#64748B' }}>
          {t('scheduledCount', { count: withSchedule.length })}
        </Typography>
      </Box>

      {withSchedule.length > 0 ? (
        <WeeklyCalendar classes={withSchedule} accentColor={ACCENT} />
      ) : (
        <Box sx={{
          textAlign: 'center', py: 10,
          bgcolor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
        }}>
          <Box sx={{ width: 56, height: 56, bgcolor: '#F1F5F9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <CalendarDays size={26} color="#94A3B8" />
          </Box>
          <Typography sx={{ fontWeight: 600, color: '#374151' }}>{t('emptyTitle')}</Typography>
          <Typography sx={{ fontSize: 14, color: '#6B7280', mt: 0.5 }}>
            {t('emptySubtitle')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
