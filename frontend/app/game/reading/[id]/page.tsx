'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { authHeaders } from '@/lib/auth';
import {
  saveReadingResult,
  completeSession,
  GameSession,
  ReadingActivity,
  MatchPair,
  FillBlank,
  FillBlankChoice,
} from '@/lib/admin-api';
import { gradients, scoreHexColor } from '@/lib/colors';
import { PartyPopper, ImageIcon, Check, PenLine } from 'lucide-react';

// ── Constants & helpers ────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchSession(id: number): Promise<GameSession> {
  const res = await fetch(`${API_URL}/game/session/${id}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Type aliases ───────────────────────────────────────────────────────────────

type PageState = 'loading' | 'error' | 'playing' | 'submitting' | 'results';
type ErrorKind = 'not-found' | 'no-activities';

type MatchPairState = { pair: MatchPair; status: 'idle' | 'shaking' | 'locked' };

type FillBlankItemState = { blank: FillBlank; chosenChoiceId: number | null; correct: boolean | null };

type ActivityState =
  | { type: 'MATCH'; activityId: number; pairs: MatchPairState[]; shuffledWords: number[]; selectedImageId: number | null; complete: boolean }
  | { type: 'FILL_BLANK'; activityId: number; items: FillBlankItemState[]; currentItemIndex: number; complete: boolean };

// ── Supporting UI components ───────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg, minWidth: 1024 }}>
      <div className="w-12 h-12 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />
      <p className="text-white/70 text-sm">Loading…</p>
    </div>
  );
}

function ErrorState({ kind, onBack }: { kind: ErrorKind; onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg, minWidth: 1024 }}>
      <p className="text-highlight text-lg font-bold">Homework not found</p>
      {kind === 'no-activities' && (
        <p className="text-white/70 text-sm text-center max-w-xs">This reading homework has no activities yet.</p>
      )}
      <button onClick={onBack} className="text-white/60 text-sm hover:text-white">← Back to Homework</button>
    </div>
  );
}

function SubmittingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg, minWidth: 1024 }}>
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-accent font-bold">Saving your score…</p>
    </div>
  );
}

function ResultsState({
  session,
  activityStates,
  onFinish,
  saveError,
}: {
  session: GameSession | null;
  activityStates: ActivityState[];
  onFinish: () => void;
  saveError: string;
}) {
  const score = session?.score ?? 0;
  return (
    <div className="min-h-screen py-12 px-8" style={{ background: gradients.gameBg, minWidth: 1024 }}>
      <div className="max-w-xl mx-auto text-center mb-10">
        <div className="flex justify-center mb-4"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center"><PartyPopper className="w-8 h-8 text-white" /></div></div>
        <div className="text-white text-2xl font-black mb-2">Homework Complete!</div>
        <div className="text-7xl font-black mt-4" style={{ color: scoreHexColor(score) }}>{score}%</div>
        <div className="text-white/70 text-sm mt-2">Your score has been saved</div>
        {saveError && <div className="text-highlight text-xs mt-2">{saveError}</div>}
      </div>

      <div className="max-w-xl mx-auto space-y-3 mb-8">
        {activityStates.map((act, idx) => {
          let correct = 0;
          let total = 0;
          let label = '';
          let typeTag = '';
          if (act.type === 'MATCH') {
            total = act.pairs.length;
            correct = act.pairs.filter((p) => p.status === 'locked').length;
            label = `${correct} / ${total} pairs matched`;
            typeTag = 'Matching';
          } else {
            total = act.items.length;
            correct = act.items.filter((it) => it.correct === true).length;
            label = `${correct} / ${total} sentences correct`;
            typeTag = 'Fill in the Blank';
          }
          const activityPct = total > 0 ? Math.round((correct / total) * 100) : 0;
          return (
            <div key={idx} className="bg-white/10 rounded-2xl px-5 py-4">
              <div className="text-white/60 text-xs font-bold uppercase mb-2">{typeTag}</div>
              <div className="flex items-center justify-between">
                <div className="text-white/70 text-sm">{label}</div>
                <div className="text-lg font-black tabular-nums" style={{ color: scoreHexColor(activityPct) }}>
                  {activityPct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onFinish}
        className="w-full max-w-xl mx-auto block py-4 rounded-2xl text-white font-black text-lg"
        style={{ background: gradients.primaryPurple }}
      >
        Finish
      </button>
    </div>
  );
}

function PlayingShell({
  activityStates,
  currentActivityIndex,
  onBack,
  children,
}: {
  activityStates: ActivityState[];
  currentActivityIndex: number;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: gradients.gameBgAlt, minWidth: 1024 }}>
      <div className="flex items-center justify-between px-8 py-4 flex-shrink-0">
        <button onClick={onBack} className="text-white/60 hover:text-white text-sm">← Back</button>
        <div className="flex items-center gap-3">
          {activityStates.map((_, i) => (
            <div
              key={i}
              className="w-8 h-2 rounded-full transition-all"
              style={{
                background:
                  i < currentActivityIndex
                    ? 'rgba(255,255,255,0.5)'
                    : i === currentActivityIndex
                    ? '#FFD166'
                    : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
        <div className="text-white/70 text-sm font-bold">
          Activity {currentActivityIndex + 1} of {activityStates.length}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 overflow-auto">
        {children}
      </div>
    </div>
  );
}

// ── Activity Renderers ─────────────────────────────────────────────────────────

function MatchingActivityRenderer({
  state,
  setState,
  onComplete,
}: {
  state: Extract<ActivityState, { type: 'MATCH' }>;
  setState: (updater: (prev: ActivityState) => ActivityState) => void;
  onComplete: () => void;
}) {
  const lockedCount = state.pairs.filter((p) => p.status === 'locked').length;

  useEffect(() => {
    if (lockedCount === state.pairs.length && state.pairs.length > 0 && !state.complete) {
      const timer = setTimeout(() => {
        setState((prev) => ({ ...prev, complete: true }));
        onComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCount, state.pairs.length, state.complete]);

  function handleImageClick(pairId: number) {
    if (state.pairs.find((p) => p.pair.id === pairId)?.status === 'locked') return;
    setState((prev) => {
      if (prev.type !== 'MATCH') return prev;
      return { ...prev, selectedImageId: prev.selectedImageId === pairId ? null : pairId };
    });
  }

  function handleWordClick(wordPairId: number) {
    const sel = state.selectedImageId;
    if (sel == null) return;
    if (state.pairs.find((p) => p.pair.id === wordPairId)?.status === 'locked') return;
    const isCorrect = sel === wordPairId;
    if (isCorrect) {
      setState((prev) => {
        if (prev.type !== 'MATCH') return prev;
        return {
          ...prev,
          selectedImageId: null,
          pairs: prev.pairs.map((p) => p.pair.id === wordPairId ? { ...p, status: 'locked' } : p),
        };
      });
    } else {
      setState((prev) => {
        if (prev.type !== 'MATCH') return prev;
        return {
          ...prev,
          pairs: prev.pairs.map((p) =>
            p.pair.id === sel || p.pair.id === wordPairId ? { ...p, status: 'shaking' } : p
          ),
        };
      });
      setTimeout(() => {
        setState((prev) => {
          if (prev.type !== 'MATCH') return prev;
          return {
            ...prev,
            selectedImageId: null,
            pairs: prev.pairs.map((p) =>
              (p.pair.id === sel || p.pair.id === wordPairId) && p.status === 'shaking'
                ? { ...p, status: 'idle' }
                : p
            ),
          };
        });
      }, 400);
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="text-white/60 text-xs font-bold uppercase tracking-wide mb-8 text-center">
        <ImageIcon className="w-4 h-4 inline mr-1" />Match each image to its word
      </div>

      {/* Image row */}
      <div className="flex gap-6 justify-center mb-8">
        {state.pairs.map((p) => {
          const isSelected = state.selectedImageId === p.pair.id;
          const isLocked = p.status === 'locked';
          const isShaking = p.status === 'shaking';
          let borderClass = 'border-white/20 bg-white/10';
          if (isLocked) borderClass = 'border-brand-green bg-brand-green/20 cursor-default';
          else if (isShaking) borderClass = 'border-highlight animate-shake';
          else if (isSelected) borderClass = 'border-primary shadow-lg scale-105';

          return (
            <button
              key={p.pair.id}
              onClick={() => handleImageClick(p.pair.id)}
              className={`relative w-28 h-28 rounded-2xl overflow-hidden cursor-pointer border-4 transition-all ${borderClass}`}
              disabled={isLocked}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.pair.imageUrl} alt={p.pair.word} className="w-full h-full object-cover" />
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-brand-green/30">
                  <Check className="w-6 h-6 text-brand-green" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Word row (shuffled) */}
      <div className="flex flex-wrap gap-3 justify-center">
        {state.shuffledWords.map((pairId) => {
          const p = state.pairs.find((x) => x.pair.id === pairId);
          if (!p) return null;
          const isLocked = p.status === 'locked';
          const isShaking = p.status === 'shaking';
          let cls = 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40';
          if (isLocked) cls = 'bg-brand-green/20 text-brand-green border-brand-green cursor-default';
          else if (isShaking) cls = 'border-highlight text-white animate-shake';

          return (
            <button
              key={pairId}
              onClick={() => handleWordClick(pairId)}
              disabled={isLocked}
              className={`px-6 py-3 rounded-full text-sm font-bold border-2 transition-all ${cls}`}
            >
              {p.pair.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FillBlankActivityRenderer({
  state,
  setState,
  onComplete,
}: {
  state: Extract<ActivityState, { type: 'FILL_BLANK' }>;
  setState: (updater: (prev: ActivityState) => ActivityState) => void;
  onComplete: () => void;
}) {
  const isFinished = state.currentItemIndex >= state.items.length;

  useEffect(() => {
    if (isFinished && !state.complete) {
      setState((prev) => (prev.type === 'FILL_BLANK' ? { ...prev, complete: true } : prev));
      onComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, state.complete]);

  const currentItem = state.items[state.currentItemIndex];

  function handleChoiceClick(choice: FillBlankChoice) {
    if (!currentItem || currentItem.chosenChoiceId !== null) return;
    const isCorrect = choice.isCorrect;
    setState((prev) => {
      if (prev.type !== 'FILL_BLANK') return prev;
      return {
        ...prev,
        items: prev.items.map((it, i) =>
          i === prev.currentItemIndex
            ? { ...it, chosenChoiceId: choice.id, correct: isCorrect }
            : it
        ),
      };
    });
    setTimeout(() => {
      setState((prev) => {
        if (prev.type !== 'FILL_BLANK') return prev;
        return { ...prev, currentItemIndex: prev.currentItemIndex + 1 };
      });
    }, 400);
  }

  if (!currentItem) return null;

  const parts = currentItem.blank.sentence.split('___');

  return (
    <div className="max-w-xl mx-auto w-full">
      {/* Item progress dots */}
      <div className="flex gap-2 justify-center mb-6">
        {state.items.map((it, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full transition-all"
            style={{
              background:
                it.correct === true
                  ? '#7BD88F'
                  : it.correct === false
                  ? '#FF7B7B'
                  : i === state.currentItemIndex
                  ? '#FFD166'
                  : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Sentence display */}
      <div className="text-center mb-8" style={{ lineHeight: 2 }}>
        {parts.flatMap((part, idx, arr) =>
          idx < arr.length - 1
            ? [
                <span key={`t${idx}`} className="text-white text-2xl font-black">{part}</span>,
                <span
                  key={`b${idx}`}
                  className="inline-block w-24 h-8 rounded-lg border-2 border-white/40 bg-white/10 align-middle mx-1"
                />,
              ]
            : [<span key={`t${idx}`} className="text-white text-2xl font-black">{part}</span>]
        )}
      </div>

      {/* Choices */}
      <div className="flex flex-wrap gap-3 justify-center">
        {currentItem.blank.choices.map((c) => {
          const isChosen = currentItem.chosenChoiceId === c.id;
          const answered = currentItem.chosenChoiceId !== null;
          let cls = 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40';
          if (isChosen && currentItem.correct === true) cls = 'bg-brand-green/20 text-brand-green border-brand-green';
          else if (isChosen && currentItem.correct === false) cls = 'animate-shake border-highlight text-white';
          else if (answered) cls = 'opacity-40 cursor-not-allowed bg-white/10 text-white border-white/20';

          return (
            <button
              key={c.id}
              onClick={() => handleChoiceClick(c)}
              disabled={answered}
              className={`px-6 py-3 rounded-full text-sm font-bold border-2 transition-all ${cls}`}
            >
              {c.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page component ────────────────────────────────────────────────────────

export default function ReadingGamePage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorKind, setErrorKind] = useState<ErrorKind>('not-found');
  const [activityStates, setActivityStates] = useState<ActivityState[]>([]);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [finalResult, setFinalResult] = useState<GameSession | null>(null);
  const [saveError, setSaveError] = useState('');

  function setActivityState(idx: number, updater: (prev: ActivityState) => ActivityState) {
    setActivityStates((prev) => prev.map((s, i) => (i === idx ? updater(s) : s)));
  }

  const computeTotals = useCallback(() => {
    let total = 0;
    let correct = 0;
    setActivityStates((prev) => {
      for (const a of prev) {
        if (a.type === 'MATCH') {
          total += a.pairs.length;
          correct += a.pairs.filter((p) => p.status === 'locked').length;
        } else {
          total += a.items.length;
          correct += a.items.filter((it) => it.correct === true).length;
        }
      }
      return prev; // no-op update to read current state
    });
    return { total, correct };
  }, []);

  const finishSession = useCallback(async () => {
    setPageState('submitting');
    // Capture current state snapshot for totals
    let total = 0;
    let correct = 0;
    setActivityStates((prev) => {
      for (const a of prev) {
        if (a.type === 'MATCH') {
          total += a.pairs.length;
          correct += a.pairs.filter((p) => p.status === 'locked').length;
        } else {
          total += a.items.length;
          correct += a.items.filter((it) => it.correct === true).length;
        }
      }
      return prev;
    });
    // Small delay to let state settle
    await new Promise((r) => setTimeout(r, 50));
    try {
      await saveReadingResult(sessionId, { correctItems: correct, totalItems: total });
      const completed = await completeSession(sessionId);
      setFinalResult(completed);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
    setPageState('results');
  }, [sessionId]);

  useEffect(() => {
    fetchSession(sessionId)
      .then((s) => {
        const hw = s.assignment?.homework;
        if (!hw || hw.type !== 'READING') {
          setErrorKind('not-found');
          setPageState('error');
          return;
        }
        const acts = (hw.readingActivities ?? []).filter(
          (a: ReadingActivity) => (a.matchPairs?.length ?? 0) > 0 || (a.fillBlanks?.length ?? 0) > 0
        );
        if (acts.length === 0) {
          setErrorKind('no-activities');
          setPageState('error');
          return;
        }
        const initial: ActivityState[] = acts.map((a: ReadingActivity) => {
          if (a.type === 'MATCH') {
            const pairs = (a.matchPairs ?? []).map((p: MatchPair) => ({ pair: p, status: 'idle' as const }));
            const shuffledWords = shuffle(pairs.map((p) => p.pair.id));
            return { type: 'MATCH' as const, activityId: a.id, pairs, shuffledWords, selectedImageId: null, complete: false };
          }
          const items = (a.fillBlanks ?? []).map((b: FillBlank) => ({ blank: b, chosenChoiceId: null, correct: null }));
          return { type: 'FILL_BLANK' as const, activityId: a.id, items, currentItemIndex: 0, complete: false };
        });
        setActivityStates(initial);
        setPageState('playing');
      })
      .catch(() => {
        setErrorKind('not-found');
        setPageState('error');
      });
  }, [sessionId]);

  return (
    <AuthGate requiredRole="STUDENT">
      {() => {
        if (pageState === 'loading') return <LoadingState />;
        if (pageState === 'error') return <ErrorState kind={errorKind} onBack={() => router.push('/game/homework')} />;
        if (pageState === 'submitting') return <SubmittingState />;
        if (pageState === 'results')
          return (
            <ResultsState
              session={finalResult}
              activityStates={activityStates}
              onFinish={() => router.push('/game/homework')}
              saveError={saveError}
            />
          );

        // playing state
        const advanceActivity = () => {
          if (currentActivityIndex + 1 >= activityStates.length) {
            finishSession();
          } else {
            setCurrentActivityIndex(currentActivityIndex + 1);
          }
        };

        const cur = activityStates[currentActivityIndex];

        return (
          <PlayingShell
            activityStates={activityStates}
            currentActivityIndex={currentActivityIndex}
            onBack={() => router.push('/game/homework')}
          >
            {cur ? (
              cur.type === 'MATCH' ? (
                <MatchingActivityRenderer
                  state={cur}
                  setState={(updater) => setActivityState(currentActivityIndex, updater)}
                  onComplete={advanceActivity}
                />
              ) : (
                <FillBlankActivityRenderer
                  state={cur as Extract<ActivityState, { type: 'FILL_BLANK' }>}
                  setState={(updater) => setActivityState(currentActivityIndex, updater)}
                  onComplete={advanceActivity}
                />
              )
            ) : null}
          </PlayingShell>
        );
      }}
    </AuthGate>
  );
}
