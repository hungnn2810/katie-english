'use client';
import { useEffect, useState } from 'react';
import { getAdminStats, AdminStats } from '@/lib/admin-portal-api';
import { Users, School, GraduationCap, Video } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const ACCENT = '#4F9DFF';

const STAT_CARDS = [
  { key: 'teachers' as const, label: 'Teachers', icon: Users },
  { key: 'classes' as const, label: 'Classes', icon: School },
  { key: 'students' as const, label: 'Students', icon: GraduationCap },
  { key: 'submissions' as const, label: 'Submissions', icon: Video },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({ teachers: 0, classes: 0, students: 0, submissions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const allZero = !loading && stats.teachers === 0 && stats.classes === 0 && stats.students === 0 && stats.submissions === 0;

  return (
    <Box>
      {error && (
        <Box sx={{ mb: 2.5, borderRadius: 3, border: '1px solid #FCA5A5', bgcolor: '#FEF2F2', px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          <Typography sx={{ fontSize: 14, color: '#DC2626' }}>Something went wrong. Please try again.</Typography>
          <Button
            onClick={loadDashboard}
            size="small"
            variant="contained"
            sx={{ fontSize: 12, fontWeight: 600, color: 'white', bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, borderRadius: 2, flexShrink: 0 }}
          >
            Retry
          </Button>
        </Box>
      )}

      {/* Stat cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2.5, mb: 3 }}>
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Box key={card.key} sx={{ bgcolor: 'white', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 1, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', mb: 2.5 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(79,157,255,0.08)' }}>
                  <Icon style={{ width: 20, height: 20, color: ACCENT }} />
                </Box>
              </Box>
              <Typography sx={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', mb: 0.5, color: ACCENT }}>
                {loading
                  ? <Box component="span" sx={{ display: 'block', height: 32, width: 40, bgcolor: 'grey.100', borderRadius: 2 }} />
                  : stats[card.key]
                }
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{card.label}</Typography>
            </Box>
          );
        })}
      </Box>

      {/* Empty state */}
      {allZero && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Box sx={{ width: 56, height: 56, bgcolor: 'grey.100', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <Users style={{ width: 24, height: 24, color: '#94A3B8' }} />
          </Box>
          <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: 14 }}>No data yet. Create teacher accounts to get started.</Typography>
        </Box>
      )}
    </Box>
  );
}
