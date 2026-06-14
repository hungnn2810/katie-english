'use client';
import { useEffect, useState } from 'react';
import { getAdminStats, AdminStats } from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import { Users, School, GraduationCap, FileText, KeyRound } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

const ACCENT = '#4F9DFF';

// MiniStat: horizontal layout — 42×42 icon well + value (24px 900) + label (12.5px #64748B)
function MiniStat({
  icon: Icon,
  value,
  label,
  color,
  bgColor,
  loading,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
  bgColor: string;
  loading?: boolean;
}) {
  return (
    <Card sx={{
      padding: '18px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      transition: 'all 0.2s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(15,23,42,0.10)' },
    }}>
      <Box sx={{
        width: 42, height: 42, borderRadius: '10px', bgcolor: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={19} color={color} />
      </Box>
      <Box>
        {loading ? (
          <Box sx={{ height: 24, width: 40, bgcolor: 'grey.100', borderRadius: 1, mb: 0.5 }} />
        ) : (
          <Typography sx={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, color: 'text.primary' }}>
            {value}
          </Typography>
        )}
        <Typography sx={{ fontSize: 12.5, color: '#64748B', mt: 0.5 }}>{label}</Typography>
      </Box>
    </Card>
  );
}

const APPROVALS = [
  { text: '4 teacher accounts', icon: Users },
  { text: '11 student registrations', icon: GraduationCap },
  { text: '2 password resets', icon: KeyRound },
];

const ACTIVITY = [
  { text: 'Katie Tran created class "Moon 4A"', time: '2h' },
  { text: '12 students completed Phonics — week 3', time: '5h' },
  { text: 'Admin approved 3 teachers', time: 'Yesterday' },
  { text: 'New homework "Listen: routines" published', time: 'Yesterday' },
];

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminStats>({ teachers: 0, classes: 0, students: 0, submissions: 0 });
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  return (
    <Box>

      {/* 4 MiniStat cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: '22px' }}>
        <MiniStat icon={Users}         value={stats.teachers}    label="Teachers"  color={ACCENT}    bgColor="#EFF6FF"  loading={loading} />
        <MiniStat icon={School}        value={stats.classes}     label="Classes"   color="#6ED6C1"   bgColor="#F0FDFB"  loading={loading} />
        <MiniStat icon={GraduationCap} value={stats.students}    label="Students"  color="#A78BFA"   bgColor="#F5F3FF"  loading={loading} />
        <MiniStat icon={FileText}      value={stats.submissions} label="Homework"  color="#F97316"   bgColor="#FFF7ED"  loading={loading} />
      </Box>

      {/* Bottom 2-column grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
        {/* Approvals pending */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: '22px', py: '15px', borderBottom: '1px solid #E2E8F0', fontWeight: 700, fontSize: 14 }}>
            Approvals pending
          </Box>
          <Box sx={{ px: '22px', py: '6px' }}>
            {APPROVALS.map((item, i) => {
              const Icon = item.icon;
              return (
                <Box key={i}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', py: '13px' }}>
                    <Icon size={16} color={ACCENT} />
                    <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{item.text}</Typography>
                    <Button variant="text" size="small" sx={{ fontSize: 13, p: 0, minWidth: 0, color: ACCENT }}>
                      Review
                    </Button>
                  </Box>
                  {i < APPROVALS.length - 1 && <Divider sx={{ borderColor: '#E2E8F0' }} />}
                </Box>
              );
            })}
          </Box>
        </Card>

        {/* Recent activity */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: '22px', py: '15px', borderBottom: '1px solid #E2E8F0', fontWeight: 700, fontSize: 14 }}>
            Recent activity
          </Box>
          <Box sx={{ px: '22px', py: '6px' }}>
            {ACTIVITY.map((item, i) => (
              <Box key={i}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', py: '12px' }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: ACCENT, flexShrink: 0 }} />
                  <Typography sx={{ flex: 1, fontSize: 13.5 }}>{item.text}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>{item.time}</Typography>
                </Box>
                {i < ACTIVITY.length - 1 && <Divider sx={{ borderColor: '#E2E8F0' }} />}
              </Box>
            ))}
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
