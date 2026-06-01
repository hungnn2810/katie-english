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
import { shake } from '@/lib/theme';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
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
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: gradients.gameBg, minWidth: 1024 }}>
      <CircularProgress size={48} sx={{ color: 'rgba(255,255,255,0.7)' }} />
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Loading…</p>
    </Box>
  );
}

function ErrorState({ kind, onBack }: { kind: ErrorKind; onBack: () => void }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: gradients.gameBg, minWidth: 1024 }}>
      <Typography sx={{ color: '#FF7B7B', fontSize: 18, fontWeight: 700 }}>Homework not found</Typography>
      {kind === 'no-activities' && (
        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', maxWidth: 320 }}>This reading homework has no activities yet.</Typography>
      )}
      <Button onClick={onBack} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' }, fontSize: 14, textTransform: 'none', minWidth: 0 }}>← Back to Homework</Button>
    </Box>
  );
}

function SubmittingState() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: gradients.gameBg, minWidth: 1024 }}>
      <CircularProgress size={48} sx={{ color: '#FFD166' }} />
      <p style={{ color: '#FFD166', fontWeight: 700 }}>Saving your score…</p>
    </Box>
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
    <Box sx={{ minHeight: '100vh', py: 6, px: 4, background: gradients.gameBg, minWidth: 1024 }}>
      <Box sx={{ maxWidth: 560, mx: 'auto', textAlign: 'center', mb: 5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PartyPopper size={32} color="white" />
          </Box>
        </Box>
        <Typography sx={{ color: 'white', fontSize: 24, fontWeight: 900, mb: 1 }}>Homework Complete!</Typography>
        <Typography sx={{ fontSize: 72, fontWeight: 900, mt: 2, color: scoreHexColor(score), fontVariantNumeric: 'tabular-nums' }}>{score}%</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, mt: 1 }}>Your score has been saved</Typography>
        {saveError && <Typography sx={{ color: '#FF7B7B', fontSize: 12, mt: 1 }}>{saveError}</Typography>}
      </Box>

      <Box sx={{ maxWidth: 560, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
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
            <Box key={idx} sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, px: 2.5, py: 2 }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', mb: 1 }}>{typeTag}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{label}</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: scoreHexColor(activityPct) }}>
                  {activityPct}%
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Button
        onClick={onFinish}
        fullWidth
        sx={{
          display: 'block', maxWidth: 560, mx: 'auto', py: 2, borderRadius: 3,
          color: 'white', fontWeight: 900, fontSize: 18,
          background: gradients.primaryPurple, '&:hover': { opacity: 0.9, background: gradients.primaryPurple },
          textTransform: 'none',
        }}
      >
        Finish
      </Button>
    </Box>
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
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: gradients.gameBgAlt, minWidth: 1024 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 4, py: 2, flexShrink: 0 }}>
        <Button onClick={onBack} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' }, fontSize: 14, textTransform: 'none', minWidth: 0 }}>← Back</Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {activityStates.map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 32, height: 8, borderRadius: '9999px', transition: 'all 0.15s',
                background:
                  i < currentActivityIndex
                    ? 'rgba(255,255,255,0.5)'
                    : i === currentActivityIndex
                    ? '#FFD166'
                    : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700 }}>
          Activity {currentActivityIndex + 1} of {activityStates.length}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 4, pb: 4, overflowY: 'auto' }}>
        {children}
      </Box>
    </Box>
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
    <Box sx={{ maxWidth: 768, mx: 'auto', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 4 }}>
        <ImageIcon size={16} />Match each image to its word
      </Box>

      {/* Image row */}
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mb: 4 }}>
        {state.pairs.map((p) => {
          const isSelected = state.selectedImageId === p.pair.id;
          const isLocked = p.status === 'locked';
          const isShaking = p.status === 'shaking';

          return (
            <Box
              component="button"
              key={p.pair.id}
              onClick={() => handleImageClick(p.pair.id)}
              disabled={isLocked}
              sx={{
                position: 'relative', width: 112, height: 112, borderRadius: 4,
                overflow: 'hidden', cursor: isLocked ? 'default' : 'pointer',
                border: '4px solid', transition: 'all 0.15s', p: 0, background: 'none',
                animation: isShaking ? `${shake} 0.4s ease-in-out` : 'none',
                ...(isLocked
                  ? { borderColor: '#7BD88F', bgcolor: 'rgba(123,216,143,0.2)' }
                  : isSelected
                  ? { borderColor: 'primary.main', boxShadow: 3, transform: 'scale(1.05)' }
                  : { borderColor: 'rgba(255,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.1)' }),
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.pair.imageUrl} alt={p.pair.word} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {isLocked && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(123,216,143,0.3)' }}>
                  <Check size={24} color="#7BD88F" />
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Word row (shuffled) */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
        {state.shuffledWords.map((pairId) => {
          const p = state.pairs.find((x) => x.pair.id === pairId);
          if (!p) return null;
          const isLocked = p.status === 'locked';
          const isShaking = p.status === 'shaking';

          return (
            <Button
              key={pairId}
              onClick={() => handleWordClick(pairId)}
              disabled={isLocked}
              sx={{
                px: 3, py: 1.5, borderRadius: '9999px', fontSize: 14, fontWeight: 700,
                border: '2px solid', transition: 'all 0.15s',
                animation: isShaking ? `${shake} 0.4s ease-in-out` : 'none',
                ...(isLocked
                  ? { bgcolor: 'rgba(123,216,143,0.2)', color: '#7BD88F', borderColor: '#7BD88F' }
                  : { bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' } }),
              }}
            >
              {p.pair.word}
            </Button>
          );
        })}
      </Box>
    </Box>
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
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      {/* Item progress dots */}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
        {state.items.map((it, i) => (
          <Box
            key={i}
            sx={{
              width: 10, height: 10, borderRadius: '50%', transition: 'all 0.15s',
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
      </Box>

      {/* Sentence display */}
      <Box sx={{ textAlign: 'center', mb: 4, lineHeight: 2 }}>
        {parts.flatMap((part, idx, arr) =>
          idx < arr.length - 1
            ? [
                <Box component="span" key={`t${idx}`} sx={{ color: 'white', fontSize: 24, fontWeight: 900 }}>{part}</Box>,
                <Box
                  component="span"
                  key={`b${idx}`}
                  sx={{ display: 'inline-block', width: 96, height: 32, borderRadius: 2, border: '2px solid rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.1)', verticalAlign: 'middle', mx: 0.5 }}
                />,
              ]
            : [<Box component="span" key={`t${idx}`} sx={{ color: 'white', fontSize: 24, fontWeight: 900 }}>{part}</Box>]
        )}
      </Box>

      {/* Choices */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
        {currentItem.blank.choices.map((c) => {
          const isChosen = currentItem.chosenChoiceId === c.id;
          const answered = currentItem.chosenChoiceId !== null;
          const isRight = isChosen && currentItem.correct === true;
          const isWrong = isChosen && currentItem.correct === false;

          return (
            <Button
              key={c.id}
              onClick={() => handleChoiceClick(c)}
              disabled={answered}
              sx={{
                px: 3, py: 1.5, borderRadius: '9999px', fontSize: 14, fontWeight: 700,
                border: '2px solid', transition: 'all 0.15s',
                animation: isWrong ? `${shake} 0.4s ease-in-out` : 'none',
                ...(isRight
                  ? { bgcolor: 'rgba(123,216,143,0.2)', color: '#7BD88F', borderColor: '#7BD88F' }
                  : isWrong
                  ? { bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: '#FF7B7B' }
                  : answered
                  ? { opacity: 0.4, cursor: 'not-allowed', bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }
                  : { bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' } }),
              }}
            >
              {c.word}
            </Button>
          );
        })}
      </Box>
    </Box>
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
