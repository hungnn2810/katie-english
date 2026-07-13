'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  getSessionResults, getSession, getStudents, getHomeworkList,
  GameSession, Student, HomeworkItem,
} from '@/lib/admin-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { ChevronDown, AlignLeft, Mic, ExternalLink } from 'lucide-react';
import { useToast } from '@/lib/toast-context';
import { formatDate } from '@/lib/datetime';
import { colors } from '@/lib/colors';
import PageLoading, { PAGE_LOADING_DELAY } from '@/components/ui/PageLoading';


function formatDuration(startedAt: string, completedAt: string): string {
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms <= 0) return '—';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return <Typography component="span" sx={{ color: 'text.secondary' }}>—</Typography>;
  const pct = Math.round(score);
  const sx = pct >= 80
    ? { bgcolor: '#dcfce7', color: '#15803d' }
    : pct >= 50
      ? { bgcolor: '#fef9c3', color: '#a16207' }
      : { bgcolor: '#fee2e2', color: '#b91c1c' };
  return <Chip label={`${pct}%`} size="small" sx={{ ...sx, fontWeight: 700, height: 22, fontSize: 12 }} />;
}

export default function SessionsPage() {
  const t = useTranslations('teacher.sessions');
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [studentFilter, setStudentFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, GameSession>>({});
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSessionResults(
        assignmentFilter ? Number(assignmentFilter) : undefined,
        studentFilter ? Number(studentFilter) : undefined,
      );
      setSessions(data);
      setExpanded(null);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : t('toasts.load_error'), 'error');
    } finally {
      setTimeout(() => setLoading(false), PAGE_LOADING_DELAY);
    }
  }, [assignmentFilter, studentFilter, showToast]);

  useEffect(() => {
    getStudents().then(setStudents).catch(() => {});
    getHomeworkList().then(setHomeworks).catch(() => {});
  }, []);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const toggleExpand = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!details[id]) {
      try {
        const d = await getSession(id);
        setDetails(prev => ({ ...prev, [id]: d }));
      } catch { /* ignore */ }
    }
  };

  const displayed = sessions.filter(s => {
    if (dateFrom && new Date(s.startedAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(s.startedAt) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const assignments = homeworks.flatMap(hw =>
    hw.assignments.map(a => ({
      id: a.id,
      label: `${hw.name ?? hw.type} — due ${formatDate(a.endDate)}`,
    }))
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Filters */}
      <Paper variant="outlined" sx={{ borderRadius: 4, p: 2.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
          <Box sx={{ flex: 1, minWidth: 144 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 0.75 }}>{t('filters.studentLabel')}</Typography>
            <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
              <MuiSelect value={studentFilter} onChange={e => setStudentFilter(e.target.value as string)} displayEmpty>
                <MenuItem value="">{t('filters.allStudents')}</MenuItem>
                {students.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.fullname}</MenuItem>)}
              </MuiSelect>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1, minWidth: 192 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 0.75 }}>{t('filters.assignmentLabel')}</Typography>
            <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
              <MuiSelect value={assignmentFilter} onChange={e => setAssignmentFilter(e.target.value as string)} displayEmpty>
                <MenuItem value="">{t('filters.allAssignments')}</MenuItem>
                {assignments.map(a => <MenuItem key={a.id} value={String(a.id)}>{a.label}</MenuItem>)}
              </MuiSelect>
            </FormControl>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 0.75 }}>{t('filters.fromLabel')}</Typography>
            <TextField type="date" size="small" value={dateFrom} onChange={e => setDateFrom(e.target.value)} sx={{ width: 144, '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 0.75 }}>{t('filters.toLabel')}</Typography>
            <TextField type="date" size="small" value={dateTo} onChange={e => setDateTo(e.target.value)} sx={{ width: 144, '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
          </Box>
          <Button variant="contained" onClick={doSearch} disabled={loading}
            sx={{ borderRadius: 3, bgcolor: colors.teacherAccent, '&:hover': { bgcolor: colors.teacherAccent, opacity: 0.9 }, gap: 1, alignSelf: 'flex-end' }}>
            {loading && <CircularProgress size={14} sx={{ color: 'white' }} />}
            {loading ? t('filters.loading') : t('filters.search')}
          </Button>
        </Box>
      </Paper>

      {displayed.length > 0 && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 500, px: 0.5 }}>
          {t('resultsCount', { count: displayed.length })}
          {(dateFrom || dateTo) && <Box component="span" sx={{ ml: 0.5, color: 'primary.main' }}>{t('dateFiltered')}</Box>}
        </Typography>
      )}

      {loading && sessions.length === 0 ? (
        <PageLoading />
      ) : displayed.length === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 4, textAlign: 'center', py: 8, color: 'text.secondary', fontSize: 14 }}>
          <Mic size={32} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
          {sessions.length === 0
            ? t('emptyNoSessions')
            : t('emptyNoMatch')}
        </Paper>
      ) : null}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {displayed.map(s => {
          const isOpen = expanded === s.id;
          const detail = details[s.id];
          const hw = s.assignment?.homework;
          const isPhonics = hw?.type === 'PHONICS';
          const hwId = (s.assignment as { homeworkId?: number } | undefined)?.homeworkId ?? hw?.id;

          return (
            <Paper key={s.id} variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
              <Box component="button" onClick={() => toggleExpand(s.id)}
                sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 2, textAlign: 'left', cursor: 'pointer', border: 'none', bgcolor: 'transparent', '&:hover': { bgcolor: 'grey.50' } }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: isPhonics ? '#4F9DFF22' : '#A78BFA22' }}>
                  {isPhonics
                    ? <AlignLeft size={20} color="#4F9DFF" />
                    : <Mic size={20} color="#A78BFA" />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.student?.fullname ?? t('unknownStudent', { id: s.studentId })}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {hw?.name ?? hw?.type ?? t('unknownHomework')} · {new Date(s.startedAt).toLocaleString()}
                    {s.completedAt && <Box component="span"> · {formatDuration(s.startedAt, s.completedAt)}</Box>}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  {s.completedAt
                    ? <ScoreBadge score={s.score} />
                    : <Chip label={t('inProgress')} size="small" sx={{ bgcolor: '#FFFBEB', color: '#B45309', fontWeight: 600, height: 22 }} />}
                  {hwId && (
                    <Link href={`/teacher/homework/${hwId}/session/${s.id}`} onClick={e => e.stopPropagation()}
                      style={{ fontSize: 12, fontWeight: 600, color: '#4F9DFF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 8, border: '1px solid #4F9DFF40' }}>
                      {t('view')} <ExternalLink size={12} />
                    </Link>
                  )}
                  <ChevronDown size={16} color="#94A3B8" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                </Box>
              </Box>

              {isOpen && (
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {!detail && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: 14 }}>
                      <CircularProgress size={16} />
                      {t('loadingDetails')}
                    </Box>
                  )}
                  {detail && (
                    <>
                      {isPhonics && detail.phonicsResults && detail.phonicsResults.length > 0 && (
                        <Box>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 1 }}>{t('wordResults')}</Typography>
                          <Box sx={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                  <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 600, paddingRight: 16, color: '#64748B', fontSize: 12 }}>{t('tableWord')}</th>
                                  <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 600, paddingRight: 16, color: '#64748B', fontSize: 12 }}>{t('tableTranscribed')}</th>
                                  <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 600, color: '#64748B', fontSize: 12 }}>{t('tableScore')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detail.phonicsResults.map(r => (
                                  <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '8px 16px 8px 0', fontWeight: 500 }}>{r.word?.text ?? `#${r.wordId}`}</td>
                                    <td style={{ padding: '8px 16px 8px 0', color: '#64748B' }}>{r.transcribedText || '—'}</td>
                                    <td style={{ padding: '8px 0' }}><ScoreBadge score={r.score} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </Box>
                        </Box>
                      )}
                      {!isPhonics && detail.speakingResults && detail.speakingResults.length > 0 && (
                        <Box>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 1 }}>{t('speakingResult')}</Typography>
                          {detail.speakingResults.map(r => (
                            <Paper key={r.id} variant="outlined" sx={{ borderRadius: 3, p: 1.5, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Typography sx={{ fontSize: 14 }}><Box component="span" sx={{ color: 'text.secondary' }}>{t('transcribedLabel')}</Box>{r.transcribedText || '—'}</Typography>
                              <Typography sx={{ fontSize: 14 }}>{t('matched', { matched: r.matchedWords, total: r.totalWords })}</Typography>
                              <Box sx={{ pt: 0.5 }}><ScoreBadge score={r.score} /></Box>
                            </Paper>
                          ))}
                        </Box>
                      )}
                      {!detail.phonicsResults?.length && !detail.speakingResults?.length && (
                        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t('noResultsYet')}</Typography>
                      )}
                    </>
                  )}
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
