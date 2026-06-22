'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { getAvailableHomework, startSession, AssignmentItem, HomeworkType } from '@/lib/admin-api';
import { AuthUser, clearAuth, changePassword } from '@/lib/auth';
import { gradients } from '@/lib/colors';
import { Hash, Mic, BookOpen, ImageIcon, Lock, RefreshCw, Play, PartyPopper, School, AlertTriangle, Star, Trophy, Calendar, Zap, Headphones } from 'lucide-react';
import { parseApiDateTime } from '@/lib/datetime';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

const TYPE_META: Record<HomeworkType, { label: string; icon: React.ElementType }> = {
  PHONICS:    { label: 'Phát âm',   icon: Hash },
  SPEAKING:   { label: 'Nói',       icon: Mic },
  READING:    { label: 'Đọc',       icon: BookOpen },
  VOCABULARY: { label: 'Từ vựng',   icon: ImageIcon },
  LISTEN:     { label: 'Nghe',      icon: Headphones },
};

const CARD_GRADS = [
  'linear-gradient(135deg, #F97316, #FBBF24)',
  'linear-gradient(135deg, #EC4899, #F472B6)',
  'linear-gradient(135deg, #8B5CF6, #A78BFA)',
  'linear-gradient(135deg, #10B981, #34D399)',
  'linear-gradient(135deg, #EF4444, #F87171)',
  'linear-gradient(135deg, #06B6D4, #67E8F9)',
];

function PageContent({ user }: { user: AuthUser }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw(''); setNewPw('');
      setShowPwModal(false);
      showToast('Password changed!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to change password', 'error');
    } finally { setPwLoading(false); }
  }

  function closePwModal() {
    setShowPwModal(false);
    setCurrentPw('');
    setNewPw('');
  }

  useEffect(() => {
    if (!user.studentId) { setLoading(false); return; }
    getAvailableHomework(user.studentId)
      .then((data) => setAssignments([...data].sort((a, b) => {
        const aDate = parseApiDateTime(a.endDate)?.getTime() ?? 0;
        const bDate = parseApiDateTime(b.endDate)?.getTime() ?? 0;
        return aDate - bDate;
      })))
      .catch(() => showToast('Failed to load homework', 'error'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.studentId]);

  async function handleStart(assignmentId: number) {
    if (!user.studentId) return;
    setStarting(assignmentId);
    try {
      const session = await startSession(user.studentId, assignmentId);
      const hwType = session.assignment?.homework?.type;
      if (hwType === 'READING') {
        router.push(`/student/reading/${session.id}`);
      } else if (hwType === 'VOCABULARY') {
        router.push(`/student/vocab/${session.id}`);
      } else {
        router.push(`/student/session/${session.id}`);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to start', 'error');
      setStarting(null);
    }
  }

  const rawName = user.upn.split(/[.@]/)[0] ?? user.upn;
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Change Password Dialog */}
      <Dialog open={showPwModal} onClose={closePwModal} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{
          px: 3.5, pt: 3, pb: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 900, fontSize: 18 }}>
            <Lock size={20} /> Change Password
          </Box>
          <IconButton size="small" onClick={closePwModal} sx={{ color: 'text.secondary' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3.5, py: 3 }}>
          <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              type="password"
              label="Current Password"
              size="small"
              fullWidth
              placeholder="••••••••"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
            <TextField
              type="password"
              label="New Password"
              size="small"
              fullWidth
              placeholder="Min 6 characters"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              slotProps={{ htmlInput: { minLength: 6 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={pwLoading}
              fullWidth
              sx={{ py: 1.5, borderRadius: 4, fontWeight: 900, background: gradients.pinkHighlight, '&:hover': { opacity: 0.9, background: gradients.pinkHighlight } }}
            >
              {pwLoading
                ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} color="inherit" /> Updating...</Box>
                : 'Update Password'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Content column: centered on desktop */}
      <Box sx={{ maxWidth: { sm: 600, md: 640 }, mx: 'auto', width: '100%' }}>

      {/* GameHeader */}
      <Box component="header" sx={{ position: 'relative', zIndex: 10, px: { xs: 2, sm: 3, md: 4 }, py: { xs: 1.75, sm: 2 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '11px', bgcolor: 'white', color: '#4F9DFF', fontWeight: 900, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(124,58,237,0.15)' }}>
            K
          </Box>
          <Typography sx={{ color: '#1E1B4B', fontWeight: 900, fontSize: 17 }}>Katie English</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '12px', px: '12px', py: '6px', pl: '6px' }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, fontWeight: 900, color: 'white',
              background: gradients.pinkHighlight,
            }}>
              {user.upn[0].toUpperCase()}
            </Box>
            <Typography sx={{ color: '#1E1B4B', fontSize: 14, fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>{displayName}</Typography>
          </Box>
          <Button
            onClick={() => setShowPwModal(true)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.75, color: '#6B7280',
              '&:hover': { color: '#1E1B4B', bgcolor: 'rgba(0,0,0,0.06)' },
              fontSize: 13, fontWeight: 500, px: 1, py: { xs: 1.25, sm: 0.75 }, borderRadius: 2, textTransform: 'none', minWidth: 0, minHeight: 44,
            }}
          >
            <Lock size={13} />
          </Button>
          <Button
            onClick={() => { clearAuth(); router.push('/student/login'); }}
            sx={{
              color: '#6B7280',
              '&:hover': { color: '#1E1B4B', bgcolor: 'rgba(0,0,0,0.06)' },
              fontSize: 13, fontWeight: 500, px: 1, py: { xs: 1.25, sm: 0.75 }, borderRadius: 2, textTransform: 'none', minWidth: 0, minHeight: 44,
            }}
          >
            Đăng xuất
          </Button>
        </Box>
      </Box>

      {/* Main */}
      <Box component="main" sx={{ position: 'relative', zIndex: 10, px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 4, sm: 5 } }}>
        <Typography sx={{ fontSize: { xs: 24, sm: 28, md: 30 }, fontWeight: 900, color: '#1E1B4B', mb: '4px' }}>
          Chào, {displayName}!
        </Typography>
        <Typography sx={{ color: '#4C4F7A', fontSize: { xs: 14, sm: 15 }, fontWeight: 600, mb: '24px' }}>
          Hôm nay học gì nào?
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 2 }}>
            <CircularProgress size={40} sx={{ color: '#A78BFA' }} />
            <Typography sx={{ color: '#4C4F7A', fontSize: 15, fontWeight: 600 }}>
              Đang tải bài tập…
            </Typography>
          </Box>
        )}

        {!user.studentId && !loading && (
          <Box sx={{ bgcolor: '#FFFFFF', borderRadius: '20px', p: 5, textAlign: 'center', maxWidth: { xs: '100%', sm: 448 }, mx: 'auto', boxShadow: '0 2px 12px rgba(124,58,237,0.1)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
              <Box sx={{ width: 64, height: 64, bgcolor: '#EDE9FE', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <School size={32} color="#7C3AED" />
              </Box>
            </Box>
            <Typography sx={{ color: '#1E1B4B', fontWeight: 900, fontSize: 21, mb: 1.5 }}>Tài khoản chưa được liên kết</Typography>
            <Typography sx={{ color: '#4C4F7A' }}>Tài khoản của em chưa được liên kết với hồ sơ học sinh. Hỏi cô giáo nhé!</Typography>
          </Box>
        )}

        {!loading && user.studentId && assignments.length === 0 && (
          <Box sx={{ textAlign: 'center', py: '70px' }}>
            <Box sx={{ width: 76, height: 76, borderRadius: '20px', bgcolor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: '18px' }}>
              <PartyPopper size={36} color="#7C3AED" />
            </Box>
            <Typography sx={{ color: '#1E1B4B', fontWeight: 900, fontSize: 21 }}>Hôm nay chưa có bài tập!</Typography>
            <Typography sx={{ color: '#6B7280', fontSize: 14, mt: '8px' }}>Quay lại sau khi cô giao bài nhé.</Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {assignments.map((a, i) => {
            const hw = a.homework;
            const meta = TYPE_META[hw.type];
            const dueDate = parseApiDateTime(a.endDate) ?? new Date(0);
            const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
            const completedSessions = (a.sessions ?? []).filter((s) => s.completedAt);
            const bestScore = completedSessions.length > 0
              ? Math.max(...completedSessions.map((s) => s.score ?? 0))
              : null;
            const grad = CARD_GRADS[i % CARD_GRADS.length];

            return (
              <Box
                key={a.id}
                onClick={() => handleStart(a.id)}
                sx={{
                  background: grad,
                  borderRadius: '24px',
                  padding: { xs: '16px', sm: '20px' },
                  boxShadow: '0 12px 28px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                  '&:hover': { transform: 'scale(1.03)' },
                }}
              >
                {/* Top row: icon well + status badge */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: '16px' }}>
                  <Box sx={{ width: 46, height: 46, borderRadius: '13px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {bestScore !== null ? <Star size={23} color="white" /> : <meta.icon size={23} color="white" />}
                  </Box>
                  {bestScore !== null ? (
                    <Box component="span" sx={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontWeight: 900, fontSize: 13, color: 'white',
                      px: '11px', py: '6px', borderRadius: '999px',
                      bgcolor: '#7BD88F',
                    }}>
                      <Trophy size={13} color="white" /> Tốt nhất: {bestScore}%
                    </Box>
                  ) : (
                    <Box component="span" sx={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontWeight: 900, fontSize: 13, color: 'white',
                      px: '11px', py: '6px', borderRadius: '999px',
                      bgcolor: daysLeft < 0 ? '#FF7B7B' : daysLeft <= 1 ? '#FF7B7B' : 'rgba(255,255,255,0.25)',
                    }}>
                      {daysLeft < 0
                        ? <><AlertTriangle size={13} color="white" /> Quá hạn</>
                        : daysLeft === 0
                        ? <><Zap size={13} color="white" /> Hạn hôm nay</>
                        : daysLeft === 1
                        ? <><Zap size={13} color="white" /> Còn 1 ngày</>
                        : <><Calendar size={13} color="white" /> Còn {daysLeft} ngày</>
                      }
                    </Box>
                  )}
                </Box>

                {/* Type label */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'white', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', mb: '11px' }}>
                  <meta.icon size={16} color="white" /> {meta.label}
                </Box>

                {/* Tag chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '7px', mb: '16px' }}>
                  {hw.type === 'PHONICS' && (hw.parts ?? []).slice(0, 4).map((part) => (
                    <Box key={part.id} component="span" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700, fontSize: 14, px: '11px', py: '5px', borderRadius: '999px' }}>
                      {part.name} ({part.words.length})
                    </Box>
                  ))}
                  {hw.type === 'PHONICS' && (hw.parts ?? []).length > 4 && (
                    <Box component="span" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 14, px: '11px', py: '5px', borderRadius: '999px', fontWeight: 600 }}>
                      +{hw.parts.length - 4}
                    </Box>
                  )}
                  {hw.type === 'SPEAKING' && hw.speakingText && (
                    <Box component="span" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 14, px: '11px', py: '5px', borderRadius: '999px', fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {hw.speakingText.slice(0, 40)}{hw.speakingText.length > 40 ? '…' : ''}
                    </Box>
                  )}
                  {hw.type === 'READING' && (
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px', bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 14, px: '11px', py: '5px', borderRadius: '999px', fontWeight: 700 }}>
                      <BookOpen size={14} /> {(hw.readingActivities ?? []).length} bài
                    </Box>
                  )}
                  {hw.type === 'VOCABULARY' && (
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px', bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 14, px: '11px', py: '5px', borderRadius: '999px', fontWeight: 700 }}>
                      <ImageIcon size={14} /> {(hw.vocabItems ?? []).length} từ
                    </Box>
                  )}
                </Box>

                {/* CTA button */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  bgcolor: 'rgba(255,255,255,0.25)',
                  color: 'white', fontWeight: 900, fontSize: 16,
                  px: 0, py: '13px', borderRadius: '13px',
                  opacity: starting === a.id ? 0.6 : 1,
                }}>
                  {starting === a.id
                    ? <><CircularProgress size={16} color="inherit" /> Đang mở…</>
                    : bestScore !== null
                      ? <><RefreshCw size={16} /> Làm lại →</>
                      : <><Play size={16} /> Bắt đầu →</>}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
      </Box>{/* end maxWidth content column */}
    </Box>
  );
}

export default function HomeworkSelectPage() {
  return <AuthGate requiredRole="STUDENT">{(user) => <PageContent user={user} />}</AuthGate>;
}
