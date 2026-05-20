'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { getAvailableHomework, startSession, AssignmentItem, HomeworkType } from '@/lib/admin-api';
import { AuthUser, clearAuth, changePassword } from '@/lib/auth';
import { cardGradients, gradients } from '@/lib/colors';
import { Hash, Mic, BookOpen, Lock, CheckCircle2, Loader2, RefreshCw, Play, PartyPopper, School, AlertTriangle, Star, Trophy, Calendar, Zap } from 'lucide-react';

const TYPE_META: Record<HomeworkType, { label: string; icon: React.ElementType }> = {
  PHONICS:  { label: 'Phonics',  icon: Hash },
  SPEAKING: { label: 'Speaking', icon: Mic },
  READING:  { label: 'Reading',  icon: BookOpen },
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

  useEffect(() => {
    if (!user.studentId) { setLoading(false); return; }
    getAvailableHomework(user.studentId)
      .then((data) => setAssignments([...data].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())))
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
    <div className="min-h-screen" style={{ background: gradients.gameBg, minWidth: 1024 }}>
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-textPrimary text-lg flex items-center gap-2"><Lock className="w-5 h-5" /> Change Password</h3>
              <button onClick={() => { setShowPwModal(false); setPwError(''); setPwSuccess(false); setCurrentPw(''); setNewPw(''); }}
                className="text-textSecondary hover:text-textPrimary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {pwSuccess ? (
              <div className="text-center py-6">
                <div className="flex justify-center mb-3"><CheckCircle2 className="w-12 h-12 text-emerald-500" /></div>
                <div className="font-black text-textPrimary text-lg">Password updated!</div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-textSecondary mb-1.5">Current Password</label>
                  <input type="password" className="input-base" placeholder="••••••••" value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-textSecondary mb-1.5">New Password</label>
                  <input type="password" className="input-base" placeholder="Min 6 characters" value={newPw}
                    onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
                </div>
                {pwError && <div className="text-highlight text-sm bg-highlight/10 border border-highlight/20 px-3 py-2.5 rounded-xl">{pwError}</div>}
                <button type="submit" disabled={pwLoading}
                  className="btn-primary w-full py-3 rounded-2xl font-black text-base disabled:opacity-60"
                  style={{ background: gradients.pinkHighlight }}>
                  {pwLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : <><CheckCircle2 className="w-4 h-4" /> Update Password</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <header className="px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-primary font-black text-xl">K</span>
          </div>
          <span className="text-white text-xl font-black">Katie English</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white"
              style={{ background: gradients.pinkHighlight }}>
              {user.upn[0].toUpperCase()}
            </div>
            <span className="text-white/90 text-sm font-semibold">{displayName}</span>
          </div>
          <button onClick={() => setShowPwModal(true)}
            className="flex items-center gap-1.5 text-white/60 hover:text-white/90 text-sm font-medium transition-colors px-3 py-2 rounded-xl hover:bg-white/10">
            <Lock className="w-3.5 h-3.5" /> Password
          </button>
          <button onClick={() => { clearAuth(); router.push('/login'); }}
            className="text-white/60 hover:text-white/90 text-sm font-medium transition-colors px-3 py-2 rounded-xl hover:bg-white/10">
            Sign out
          </button>
        </div>
      </header>

      <main className="px-10 py-8">
        <div className="mb-10">
          <h1 className="text-5xl font-black text-white mb-3">
            Hi, {displayName}!
          </h1>
          <p className="text-white/80 text-lg font-semibold">Ready to learn something awesome today?</p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <BookOpen className="w-12 h-12 text-white/70 animate-bounce" />
            <p className="text-white/70 text-lg font-semibold">Loading your homework...</p>
          </div>
        )}

        {!user.studentId && !loading && (
          <div className="bg-white/10 rounded-3xl p-10 text-center max-w-md mx-auto">
            <div className="flex justify-center mb-5"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center"><School className="w-8 h-8 text-white" /></div></div>
            <h2 className="text-white font-black text-2xl mb-3">Account not linked</h2>
            <p className="text-white/70">Your account hasn&apos;t been linked to a student profile yet. Please ask your teacher!</p>
          </div>
        )}

        {error && (
          <div className="bg-highlight/20 border border-highlight/50 rounded-2xl px-6 py-4 text-white font-semibold mb-6">
            <AlertTriangle className="w-4 h-4 inline mr-1" />{error}
          </div>
        )}

        {!loading && user.studentId && assignments.length === 0 && !error && (
          <div className="text-center py-24">
            <div className="flex justify-center mb-5"><div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center"><PartyPopper className="w-10 h-10 text-white" /></div></div>
            <p className="text-white font-black text-2xl mb-2">All done! No homework right now!</p>
            <p className="text-white/60 text-base mt-2">Check back later when your teacher assigns something.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-7">
          {assignments.map((a, i) => {
            const g = cardGradients[i % cardGradients.length];
            const hw = a.homework;
            const meta = TYPE_META[hw.type];
            const dueDate = new Date(a.endDate);
            const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
            const completedSessions = (a.sessions ?? []).filter((s) => s.completedAt);
            const bestScore = completedSessions.length > 0
              ? Math.max(...completedSessions.map((s) => s.score ?? 0))
              : null;

            return (
              <div key={a.id}
                className="rounded-3xl overflow-hidden shadow-2xl transition-all hover:scale-105 cursor-pointer"
                onClick={() => handleStart(a.id)}
                style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
                <div className="p-7">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                      {bestScore !== null ? <Star className="w-6 h-6 text-white" /> : <meta.icon className="w-6 h-6 text-white" />}
                    </div>
                    {bestScore !== null ? (
                      <span className="flex items-center gap-1 text-sm font-black px-4 py-1.5 rounded-full bg-brand-green text-white">
                        <Trophy className="w-3.5 h-3.5" /> Best: {bestScore}%
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1 text-sm font-black px-4 py-1.5 rounded-full ${daysLeft <= 1 ? 'bg-highlight text-white' : 'bg-white/25 text-white'}`}>
                        {daysLeft < 0 ? <><AlertTriangle className="w-3.5 h-3.5" /> Overdue</> : daysLeft === 0 ? <><Calendar className="w-3.5 h-3.5" /> Due today</> : daysLeft === 1 ? <><Zap className="w-3.5 h-3.5" /> 1 day left</> : <><Calendar className="w-3.5 h-3.5" /> {daysLeft} days left</>}
                      </span>
                    )}
                  </div>

                  <div className="mb-5">
                    <div className="flex items-center gap-1.5 text-white font-black text-sm mb-2 uppercase tracking-wide">
                      <meta.icon className="w-4 h-4" /> {meta.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hw.type === 'PHONICS' && (hw.parts ?? []).slice(0, 4).map((part) => (
                        <span key={part.id} className="bg-white/25 text-white text-sm px-3 py-1 rounded-xl font-bold">
                          {part.name} ({part.words.length})
                        </span>
                      ))}
                      {hw.type === 'PHONICS' && (hw.parts ?? []).length > 4 && (
                        <span className="bg-white/15 text-white text-sm px-3 py-1 rounded-xl font-semibold">+{hw.parts.length - 4} more</span>
                      )}
                      {hw.type === 'SPEAKING' && hw.speakingText && (
                        <span className="bg-white/25 text-white text-sm px-3 py-1 rounded-xl font-bold truncate max-w-[200px]">
                          {hw.speakingText.slice(0, 40)}{hw.speakingText.length > 40 ? '…' : ''}
                        </span>
                      )}
                      {hw.type === 'READING' && (
                        <span className="flex items-center gap-1 bg-white/25 text-white text-sm px-3 py-1 rounded-xl font-bold">
                          <BookOpen className="w-3.5 h-3.5" /> {(hw.readingActivities ?? []).length} activit{(hw.readingActivities ?? []).length !== 1 ? 'ies' : 'y'}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={starting === a.id}
                    className="flex items-center justify-center gap-2 w-full bg-white/25 hover:bg-white/35 text-white font-black text-base px-5 py-3 rounded-2xl transition-all disabled:opacity-60">
                    {starting === a.id ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> : bestScore !== null ? <><RefreshCw className="w-4 h-4" /> Try Again</> : <><Play className="w-4 h-4" /> Let&apos;s Go!</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default function HomeworkSelectPage() {
  return <AuthGate requiredRole="STUDENT">{(user) => <PageContent user={user} />}</AuthGate>;
}
