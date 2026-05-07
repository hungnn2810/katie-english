'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { getAvailableHomework, startSession, HomeworkItem } from '@/lib/admin-api';
import { AuthUser, clearAuth, changePassword } from '@/lib/auth';
import { cardGradients, gradients } from '@/lib/colors';

function PageContent({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
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
      .then(setHomework)
      .catch(() => setError('Failed to load homework'))
      .finally(() => setLoading(false));
  }, [user.studentId]);

  async function handleStart(homeworkId: number) {
    if (!user.studentId) return;
    setStarting(homeworkId); setError('');
    try {
      const session = await startSession(user.studentId, homeworkId);
      router.push(`/game/session/${session.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setStarting(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: gradients.gameBg, minWidth: 1024 }}>
      {/* Change password modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-textPrimary text-base">Change Password</h3>
              <button onClick={() => { setShowPwModal(false); setPwError(''); setPwSuccess(false); setCurrentPw(''); setNewPw(''); }}
                className="text-textSecondary hover:text-textPrimary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {pwSuccess ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <div className="font-bold text-textPrimary">Password updated!</div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-textSecondary mb-1.5">Current Password</label>
                  <input type="password" className="input-base" placeholder="••••••••" value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-textSecondary mb-1.5">New Password</label>
                  <input type="password" className="input-base" placeholder="Min 6 characters" value={newPw}
                    onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
                </div>
                {pwError && <div className="text-highlight text-sm bg-highlight/10 border border-highlight/20 px-3 py-2 rounded-xl">{pwError}</div>}
                <button type="submit" disabled={pwLoading}
                  className="btn-primary w-full py-2.5 disabled:opacity-60"
                  style={{ background: gradients.pinkHighlight }}>
                  {pwLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-primary font-black text-lg">K</span>
          </div>
          <span className="text-white text-xl font-bold">Katie English</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: gradients.pinkHighlight }}>
              {user.upn[0].toUpperCase()}
            </div>
            <span className="text-white/70 text-sm">{user.upn}</span>
          </div>
          <button onClick={() => setShowPwModal(true)}
            className="text-white/60 hover:text-white text-sm transition-colors">
            Change password
          </button>
          <button onClick={() => { clearAuth(); router.push('/login'); }}
            className="text-white/60 hover:text-white text-sm transition-colors">
            Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="px-10 py-6">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">My Homework</h1>
          <p className="text-white/70">Choose an assignment to start practicing</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!user.studentId && !loading && (
          <div className="bg-white bg-opacity-10 rounded-2xl p-8 text-center max-w-md mx-auto">
            <div className="text-5xl mb-4">🎓</div>
            <h2 className="text-white font-bold text-xl mb-2">Account not linked</h2>
            <p className="text-white/70 text-sm">Your account hasn&apos;t been linked to a student profile yet. Please ask your teacher.</p>
          </div>
        )}

        {error && (
          <div className="bg-highlight/20 border border-highlight/60 rounded-2xl px-6 py-4 text-white/90 text-sm mb-6">{error}</div>
        )}

        {!loading && user.studentId && homework.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-white/80 text-lg font-semibold">No homework right now!</p>
            <p className="text-white/60 text-sm mt-1">Check back later when your teacher assigns something.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {homework.map((h, i) => {
            const g = cardGradients[i % cardGradients.length];
            const wordList = h.parts.flatMap((p) => p.words.map((w) => w.word.text));
            const dueDate = new Date(h.closedDatetime);
            const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
            const completedSessions = h.sessions?.filter((s) => s.completedAt) ?? [];
            const bestScore = completedSessions.length > 0
              ? Math.max(...completedSessions.map((s) => s.score ?? 0))
              : null;
            return (
              <div key={h.id}
                className="rounded-2xl overflow-hidden shadow-xl transition-transform hover:scale-105 cursor-pointer"
                onClick={() => handleStart(h.id)}
                style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{bestScore !== null ? '✅' : '📝'}</div>
                    {bestScore !== null ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-green text-white">
                        Best: {bestScore}%
                      </span>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${daysLeft <= 1 ? 'bg-highlight text-white' : 'bg-white bg-opacity-20 text-white'}`}>
                        {daysLeft <= 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-white font-bold text-sm mb-2 opacity-80">WORDS TO PRACTICE</div>
                    <div className="flex flex-wrap gap-1">
                      {wordList.slice(0, 5).map((w) => (
                        <span key={w} className="bg-white bg-opacity-20 text-white text-sm px-3 py-1 rounded-lg font-semibold">{w}</span>
                      ))}
                      {wordList.length > 5 && (
                        <span className="bg-white bg-opacity-10 text-white text-sm px-3 py-1 rounded-lg">+{wordList.length - 5}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
<button
                      disabled={starting === h.id}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-bold text-sm px-5 py-2 rounded-xl transition-all disabled:opacity-60">
                      {starting === h.id ? 'Starting...' : bestScore !== null ? 'Try Again →' : 'Start →'}
                    </button>
                  </div>
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
