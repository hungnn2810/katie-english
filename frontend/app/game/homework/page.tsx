'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { getAvailableHomework, startSession, AssignmentItem, HomeworkType } from '@/lib/admin-api';
import { AuthUser, clearAuth, changePassword } from '@/lib/auth';
import { cardGradients, gradients } from '@/lib/colors';
import { Hash, Mic, BookOpen, Lock, CheckCircle2, RefreshCw, Play, PartyPopper, School, AlertTriangle, Star, Trophy, Calendar, Zap } from 'lucide-react';
import { parseApiDateTime } from '@/lib/datetime';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

const TYPE_META: Record<HomeworkType, { label: string; icon: React.ElementType }> = {
  PHONICS:    { label: 'Phonics',    icon: Hash },
  SPEAKING:   { label: 'Speaking',   icon: Mic },
  READING:    { label: 'Reading',    icon: BookOpen },
  VOCABULARY: { label: 'Vocabulary', icon: BookOpen },
};

function PageContent({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(''); setPwSuccess(false); setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw(''); setNewPw('');
      setTimeout(() => { setShowPwModal(false); setPwSuccess(false); }, 2000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally { setPwLoading(false); }
  }

  function closePwModal() {
    setShowPwModal(false);
    setPwError('');
    setPwSuccess(false);
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
      .catch(() => setError('Failed to load homework'))
      .finally(() => setLoading(false));
  }, [user.studentId]);

  async function handleStart(assignmentId: number) {
    if (!user.studentId) return;
    setStarting(assignmentId); setError('');
    try {
      const session = await startSession(user.studentId, assignmentId);
      const hwType = session.assignment?.homework?.type;
      if (hwType === 'READING') {
        router.push(`/game/reading/${session.id}`);
      } else {
        router.push(`/game/session/${session.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setStarting(null);
    }
  }

  const rawName = user.upn.split(/[.@]/)[0] ?? user.upn;
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: gradients.gameBg, minWidth: 1024 }}>
      {/* Quizizz-style decorative arcs */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.07 }} xmlns="http://www.w3.org/2000/svg">
        <circle cx="-80" cy="400" r="380" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="-80" cy="400" r="500" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="-80" cy="400" r="620" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="1360" cy="400" r="380" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="1360" cy="400" r="500" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="1360" cy="400" r="620" fill="none" stroke="white" strokeWidth="1"/>
      </svg>

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
          {pwSuccess ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                <CheckCircle2 size={48} color="#10b981" />
              </Box>
              <Typography sx={{ fontWeight: 900, fontSize: 18 }}>Password updated!</Typography>
            </Box>
          ) : (
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
              {pwError && <Alert severity="error" sx={{ borderRadius: 3 }}>{pwError}</Alert>}
              <Button
                type="submit"
                variant="contained"
                disabled={pwLoading}
                fullWidth
                sx={{ py: 1.5, borderRadius: 4, fontWeight: 900, background: gradients.pinkHighlight, '&:hover': { opacity: 0.9, background: gradients.pinkHighlight } }}
              >
                {pwLoading
                  ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} color="inherit" /> Updating...</Box>
                  : <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckCircle2 size={16} /> Update Password</Box>}
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <Box component="header" sx={{ position: 'relative', zIndex: 10, px: 5, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 48, height: 48, bgcolor: 'white', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 3 }}>
            <Typography sx={{ color: 'primary.main', fontWeight: 900, fontSize: 20 }}>K</Typography>
          </Box>
          <Typography sx={{ color: 'white', fontSize: 20, fontWeight: 900 }}>Katie English</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, px: 2, py: 1 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 14, fontWeight: 900, color: 'white',
              background: gradients.pinkHighlight,
            }}>
              {user.upn[0].toUpperCase()}
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600 }}>{displayName}</Typography>
          </Box>
          <Button
            onClick={() => setShowPwModal(true)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.75, color: 'rgba(255,255,255,0.6)',
              '&:hover': { color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.1)' },
              fontSize: 14, fontWeight: 500, px: 1.5, py: 1, borderRadius: 3, textTransform: 'none', minWidth: 0,
            }}
          >
            <Lock size={14} /> Password
          </Button>
          <Button
            onClick={() => { clearAuth(); router.push('/login'); }}
            sx={{
              color: 'rgba(255,255,255,0.6)',
              '&:hover': { color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.1)' },
              fontSize: 14, fontWeight: 500, px: 1.5, py: 1, borderRadius: 3, textTransform: 'none', minWidth: 0,
            }}
          >
            Sign out
          </Button>
        </Box>
      </Box>

      {/* Main */}
      <Box component="main" sx={{ position: 'relative', zIndex: 10, px: 5, py: 4 }}>
        <Box sx={{ mb: 5 }}>
          <Typography variant="h3" sx={{ fontWeight: 900, color: 'white', mb: 1.5 }}>
            Hi, {displayName}!
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: 600 }}>
            Ready to learn something awesome today?
          </Typography>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 2 }}>
            <BookOpen size={48} color="rgba(255,255,255,0.7)" />
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 600 }}>
              Loading your homework...
            </Typography>
          </Box>
        )}

        {!user.studentId && !loading && (
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 6, p: 5, textAlign: 'center', maxWidth: 448, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
              <Box sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <School size={32} color="white" />
              </Box>
            </Box>
            <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 24, mb: 1.5 }}>Account not linked</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>Your account hasn&apos;t been linked to a student profile yet. Please ask your teacher!</Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ bgcolor: 'rgba(255,123,123,0.2)', border: '1px solid rgba(255,123,123,0.5)', borderRadius: 3, px: 3, py: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AlertTriangle size={16} color="white" />
            <Typography sx={{ color: 'white', fontWeight: 600 }}>{error}</Typography>
          </Box>
        )}

        {!loading && user.studentId && assignments.length === 0 && !error && (
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
              <Box sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PartyPopper size={40} color="white" />
              </Box>
            </Box>
            <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 24, mb: 1 }}>All done! No homework right now!</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, mt: 1 }}>Check back later when your teacher assigns something.</Typography>
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3.5 }}>
          {assignments.map((a, i) => {
            const g = cardGradients[i % cardGradients.length];
            const hw = a.homework;
            const meta = TYPE_META[hw.type];
            const dueDate = parseApiDateTime(a.endDate) ?? new Date(0);
            const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
            const completedSessions = (a.sessions ?? []).filter((s) => s.completedAt);
            const bestScore = completedSessions.length > 0
              ? Math.max(...completedSessions.map((s) => s.score ?? 0))
              : null;

            return (
              <Box
                key={a.id}
                onClick={() => handleStart(a.id)}
                sx={{
                  borderRadius: 6, overflow: 'hidden', boxShadow: 8,
                  transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.05)' },
                  cursor: 'pointer', background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                }}
              >
                <Box sx={{ p: 3.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
                    <Box sx={{ width: 48, height: 48, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {bestScore !== null ? <Star size={24} color="white" /> : <meta.icon size={24} color="white" />}
                    </Box>
                    {bestScore !== null ? (
                      <Chip
                        icon={<Trophy size={14} color="white" />}
                        label={`Best: ${bestScore}%`}
                        size="small"
                        sx={{ bgcolor: '#7BD88F', color: 'white', fontWeight: 900, fontSize: 14, height: 'auto', py: 0.75, px: 1 }}
                      />
                    ) : (
                      <Chip
                        size="small"
                        label={
                          daysLeft < 0 ? 'Overdue'
                          : daysLeft === 0 ? 'Due today'
                          : daysLeft === 1 ? '1 day left'
                          : `${daysLeft} days left`
                        }
                        icon={
                          daysLeft < 0 ? <AlertTriangle size={14} color="white" />
                          : daysLeft <= 1 ? <Zap size={14} color="white" />
                          : <Calendar size={14} color="white" />
                        }
                        sx={{
                          bgcolor: daysLeft <= 1 ? '#FF7B7B' : 'rgba(255,255,255,0.25)',
                          color: 'white', fontWeight: 900, fontSize: 14, height: 'auto', py: 0.75, px: 1,
                        }}
                      />
                    )}
                  </Box>

                  <Box sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'white', fontWeight: 900, fontSize: 14, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <meta.icon size={16} /> {meta.label}
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {hw.type === 'PHONICS' && (hw.parts ?? []).slice(0, 4).map((part) => (
                        <Box key={part.id} component="span" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 14, px: 1.5, py: 0.5, borderRadius: 3, fontWeight: 700 }}>
                          {part.name} ({part.words.length})
                        </Box>
                      ))}
                      {hw.type === 'PHONICS' && (hw.parts ?? []).length > 4 && (
                        <Box component="span" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 14, px: 1.5, py: 0.5, borderRadius: 3, fontWeight: 600 }}>
                          +{hw.parts.length - 4} more
                        </Box>
                      )}
                      {hw.type === 'SPEAKING' && hw.speakingText && (
                        <Box component="span" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 14, px: 1.5, py: 0.5, borderRadius: 3, fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {hw.speakingText.slice(0, 40)}{hw.speakingText.length > 40 ? '…' : ''}
                        </Box>
                      )}
                      {hw.type === 'READING' && (
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 14, px: 1.5, py: 0.5, borderRadius: 3, fontWeight: 700 }}>
                          <BookOpen size={14} /> {(hw.readingActivities ?? []).length} activit{(hw.readingActivities ?? []).length !== 1 ? 'ies' : 'y'}
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Button
                    disabled={starting === a.id}
                    fullWidth
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.25)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' },
                      color: 'white', fontWeight: 900, fontSize: 16, px: 2.5, py: 1.5, borderRadius: 3,
                      '&.Mui-disabled': { opacity: 0.6, color: 'white' },
                      textTransform: 'none',
                    }}
                  >
                    {starting === a.id
                      ? <><CircularProgress size={16} color="inherit" /> Starting...</>
                      : bestScore !== null
                        ? <><RefreshCw size={16} /> Try Again</>
                        : <><Play size={16} /> Let&apos;s Go!</>}
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export default function HomeworkSelectPage() {
  return <AuthGate requiredRole="STUDENT">{(user) => <PageContent user={user} />}</AuthGate>;
}
