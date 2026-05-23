'use client';
import { useEffect, useState } from 'react';
import { getAdminStats, AdminStats } from '@/lib/admin-portal-api';
import { Users, School, GraduationCap, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="animate-fade-in">
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-red-600">Something went wrong. Please try again.</div>
          <Button
            onClick={loadDashboard}
            size="sm"
            className="text-xs font-semibold text-white"
            style={{ background: ACCENT }}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="bg-white rounded-2xl border border-border shadow-card p-6"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79, 157, 255, 0.08)' }}>
                  <Icon className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
              </div>
              <div
                className="text-[28px] font-bold tracking-tight mb-1"
                style={{ color: ACCENT }}
              >
                {loading
                  ? <div className="h-8 w-10 bg-slate-100 rounded-lg animate-pulse" />
                  : stats[card.key]
                }
              </div>
              <div className="text-sm text-textSecondary">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {allZero && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-textPrimary font-semibold text-sm">No data yet. Create teacher accounts to get started.</p>
        </div>
      )}
    </div>
  );
}
