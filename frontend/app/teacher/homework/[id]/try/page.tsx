'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { getHomework, getReadingHomework } from '@/lib/admin-api';
import type { ReadingHomeworkDetail, ReadingActivity, MatchPair, FillBlank, FillBlankChoice } from '@/lib/admin-api';
import { gradients, scoreHexColor, timerHexColor } from '@/lib/colors';
import { Check, X, BookOpen, PartyPopper, Camera, Eye, Mic, Hash, ImageIcon as ImageLucide } from 'lucide-react';

type ItemState = 'waiting' | 'recording' | 'done';
type PageState = 'loading' | 'cam-check' | 'cam-denied' | 'ready' | 'playing' | 'results' | 'error';

interface ItemEntry {
  text: string;
  transcribed: string;
  score: number;
  state: ItemState;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function calcScore(transcribed: string, target: string): number {
  const b = target.toLowerCase().trim();
  if (!b) return 0;
  const words = transcribed.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  if (words.includes(b)) return 100;
  const bestSim = words.reduce((max, w) => {
    const sim = 1 - levenshtein(w, b) / Math.max(w.length, b.length);
    return Math.max(max, sim);
  }, 0);
  return Math.max(0, Math.round(bestSim * 100));
}

function CircleTimer({ seconds, total }: { seconds: number; total: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * (total > 0 ? seconds / total : 0);
  const color = timerHexColor(seconds);
  return (
    <svg width="140" height="140" viewBox="0 0 120 120" className="-rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#ffffff15" strokeWidth="8" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }} />
      <text x="60" y="66" textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="28" fontWeight="900" className="rotate-90"
        style={{ transform: 'rotate(90deg)', transformOrigin: '60px 60px', fontVariantNumeric: 'tabular-nums' }}>
        {seconds}
      </text>
    </svg>
  );
}

// ── ReadingPreview component (inline, D-05) ───────────────────────────────────
// No API calls to /game/session/* are made — this is a scored-but-not-saved teacher preview.

type PairState = { chosen: string | null; correct: boolean | null };

interface MatchingActivityPreviewProps {
  activity: ReadingActivity;
  onNext: (score: number) => void;
}

function MatchingActivityPreview({ activity, onNext }: MatchingActivityPreviewProps) {
  const pairs = activity.matchPairs ?? [];

  // Deterministic shuffle: seeded by pair count so order is stable across re-renders
  const shuffledWords = useMemo(() => {
    const words = pairs.map((p) => p.word);
    // Simple deterministic sort by character code sum (stable within session)
    return [...words].sort((a, b) => {
      const sumA = a.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const sumB = b.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return sumA - sumB;
    });
  }, [pairs]);

  const [selectedImage, setSelectedImage] = useState<number | null>(null); // pair index
  const [pairStates, setPairStates] = useState<Record<number, PairState>>({});
  const [completed, setCompleted] = useState(false);

  const answeredCount = Object.keys(pairStates).length;
  const correctCount = Object.values(pairStates).filter((s) => s.correct).length;

  function handleImageClick(pairIdx: number) {
    if (pairStates[pairIdx]) return; // already answered
    setSelectedImage(pairIdx);
  }

  function handleWordClick(word: string) {
    if (selectedImage === null) return;
    const pairIdx = selectedImage;
    const pair = pairs[pairIdx];
    if (!pair) return;
    const isCorrect = word === pair.word;
    setPairStates((prev) => ({ ...prev, [pairIdx]: { chosen: word, correct: isCorrect } }));
    setSelectedImage(null);

    if (answeredCount + 1 >= pairs.length) {
      setCompleted(true);
    }
  }

  const score = pairs.length > 0 ? Math.round((correctCount / pairs.length) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4 text-center">
        <span className="text-xs font-bold text-white/60 uppercase tracking-wide">
          Matching Activity — click an image, then click its matching word
        </span>
      </div>

      <div className="flex gap-8 justify-center mb-6">
        {/* Image column */}
        <div className="flex flex-col gap-3">
          {pairs.map((pair, i) => {
            const state = pairStates[i];
            const isSelected = selectedImage === i;
            return (
              <button
                key={pair.id ?? i}
                type="button"
                onClick={() => handleImageClick(i)}
                disabled={!!state}
                className="relative rounded-xl overflow-hidden transition-all"
                style={{
                  outline: isSelected ? '3px solid #A78BFA' : state?.correct ? '3px solid #22c55e' : state ? '3px solid #ef4444' : '3px solid transparent',
                  opacity: state ? 0.8 : 1,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pair.imageUrl} alt="" className="w-20 h-20 object-cover" />
                {state && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    {state.correct ? <Check className="w-8 h-8 text-white" /> : <X className="w-8 h-8 text-white" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Word column */}
        <div className="flex flex-col gap-3 justify-center">
          {shuffledWords.map((word) => {
            const matchedPair = pairs.find((p) => p.word === word);
            const matchedIdx = matchedPair ? pairs.indexOf(matchedPair) : -1;
            const state = matchedIdx >= 0 ? pairStates[matchedIdx] : undefined;
            const isChosen = state?.chosen === word;
            return (
              <button
                key={word}
                type="button"
                onClick={() => handleWordClick(word)}
                disabled={!!isChosen || selectedImage === null}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: isChosen
                    ? state?.correct ? '#22c55e30' : '#ef444430'
                    : selectedImage !== null ? '#A78BFA30' : '#ffffff15',
                  color: isChosen
                    ? state?.correct ? '#22c55e' : '#ef4444'
                    : 'white',
                  border: isChosen
                    ? `2px solid ${state?.correct ? '#22c55e' : '#ef4444'}`
                    : selectedImage !== null ? '2px solid #A78BFA60' : '2px solid transparent',
                }}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {selectedImage !== null && (
        <p className="text-center text-white/60 text-sm mb-4">
          Selected: <strong className="text-white">{pairs[selectedImage]?.word ? '(image selected)' : '...'}</strong> — now click a word
        </p>
      )}

      {completed && (
        <div className="text-center mt-4">
          <div className="text-4xl font-black mb-2" style={{ color: scoreHexColor(score) }}>
            {score}%
          </div>
          <p className="text-white/60 text-sm mb-4">
            {correctCount} / {pairs.length} correct
          </p>
          <button
            type="button"
            onClick={() => onNext(score)}
            className="px-8 py-3 rounded-2xl text-white font-bold"
            style={{ background: gradients.primaryPurple }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

interface FillInBlankPreviewProps {
  activity: ReadingActivity;
  onNext: (score: number) => void;
}

// Reconstruct blanks from FillBlank DB shape for preview rendering
interface BlankPreview {
  blankIdx: number;
  correctWord: string;
  distractors: string[];
  chosen: string | null;
}

function buildBlanksFromFillBlanks(fillBlanks: FillBlank[]): { sentence: string; blanks: BlankPreview[] } {
  if (!fillBlanks?.length) return { sentence: '', blanks: [] };
  const fb = fillBlanks[0];
  const sentence = fb.sentence;
  const choices: FillBlankChoice[] = fb.choices ?? [];

  // Group choices: each isCorrect:true starts a new blank group
  const blankGroups: { correctWord: string; distractors: string[] }[] = [];
  let current: { correctWord: string; distractors: string[] } | null = null;
  for (const c of choices) {
    if (c.isCorrect) {
      if (current) blankGroups.push(current);
      current = { correctWord: c.word, distractors: [] };
    } else if (current) {
      current.distractors.push(c.word);
    }
  }
  if (current) blankGroups.push(current);

  const blanks: BlankPreview[] = blankGroups.map((g, i) => ({
    blankIdx: i,
    correctWord: g.correctWord,
    distractors: g.distractors,
    chosen: null,
  }));

  return { sentence, blanks };
}

function FillInBlankPreview({ activity, onNext }: FillInBlankPreviewProps) {
  const { sentence, blanks: initialBlanks } = useMemo(
    () => buildBlanksFromFillBlanks(activity.fillBlanks ?? []),
    [activity.fillBlanks]
  );

  const [blanks, setBlanks] = useState<BlankPreview[]>(initialBlanks);
  const [activeBlankIdx, setActiveBlankIdx] = useState<number>(0);
  const [completed, setCompleted] = useState(false);

  const allAnswered = blanks.every((b) => b.chosen !== null);
  const correctCount = blanks.filter((b) => b.chosen === b.correctWord).length;
  const score = blanks.length > 0 ? Math.round((correctCount / blanks.length) * 100) : 0;

  // Deterministic shuffle for choices — seeded by blankIdx for stable order across re-renders
  function deterministicShuffle(words: string[], seed: number): string[] {
    const indexed = words.map((w, i) => ({ w, sort: (w.charCodeAt(0) + seed * 31 + i) % 97 }));
    return indexed.sort((a, b) => a.sort - b.sort).map((x) => x.w);
  }

  function handleChoiceClick(blankIdx: number, word: string) {
    const next = blanks.map((b) =>
      b.blankIdx === blankIdx ? { ...b, chosen: word } : b
    );
    setBlanks(next);
    // Advance to next unanswered blank
    const nextUnanswered = next.findIndex((b) => b.chosen === null);
    if (nextUnanswered >= 0) {
      setActiveBlankIdx(nextUnanswered);
    } else {
      setCompleted(true);
    }
  }

  // Render sentence with inline blank chips
  const parts = sentence.split('___');

  const activeBlank = blanks.find((b) => b.blankIdx === activeBlankIdx);
  const choices = activeBlank
    ? deterministicShuffle(
        [activeBlank.correctWord, ...activeBlank.distractors],
        activeBlankIdx
      )
    : [];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4 text-center">
        <span className="text-xs font-bold text-white/60 uppercase tracking-wide">
          Fill in the Blank — click a word below to fill the highlighted blank
        </span>
      </div>

      {/* Sentence with inline blank chips */}
      <div className="bg-white/10 rounded-2xl px-6 py-4 mb-6 text-white text-lg leading-relaxed text-center">
        {parts.map((part, i) => {
          const blank = blanks.find((b) => b.blankIdx === i);
          return (
            <span key={i}>
              {part}
              {blank && (
                <button
                  type="button"
                  onClick={() => !blank.chosen && setActiveBlankIdx(i)}
                  className="inline-block mx-1 px-3 py-0.5 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: blank.chosen
                      ? blank.chosen === blank.correctWord ? '#22c55e40' : '#ef444440'
                      : activeBlankIdx === i ? '#A78BFA40' : '#ffffff20',
                    border: blank.chosen
                      ? `2px solid ${blank.chosen === blank.correctWord ? '#22c55e' : '#ef4444'}`
                      : activeBlankIdx === i ? '2px solid #A78BFA' : '2px dashed #ffffff40',
                    color: blank.chosen
                      ? blank.chosen === blank.correctWord ? '#22c55e' : '#ef4444'
                      : 'white',
                  }}
                >
                  {blank.chosen ?? '___'}
                </button>
              )}
            </span>
          );
        })}
      </div>

      {/* Choice palette for the active blank */}
      {!completed && activeBlank && !activeBlank.chosen && (
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {choices.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => handleChoiceClick(activeBlankIdx, word)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: '#A78BFA40', border: '2px solid #A78BFA60' }}
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {completed && (
        <div className="text-center mt-4">
          <div className="text-4xl font-black mb-2" style={{ color: scoreHexColor(score) }}>
            {score}%
          </div>
          <p className="text-white/60 text-sm mb-4">
            {correctCount} / {blanks.length} correct
          </p>
          <button
            type="button"
            onClick={() => onNext(score)}
            className="px-8 py-3 rounded-2xl text-white font-bold"
            style={{ background: gradients.primaryPurple }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

interface ReadingPreviewProps {
  homework: ReadingHomeworkDetail;
  hwId: number;
}

function ReadingPreview({ homework, hwId }: ReadingPreviewProps) {
  const router = useRouter();
  const activities = homework.readingActivities ?? [];
  const [activityIdx, setActivityIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const current = activities[activityIdx];
  const total = activities.length;

  function handleNext(score: number) {
    const newScores = [...scores, score];
    setScores(newScores);
    if (activityIdx + 1 < total) {
      setActivityIdx((i) => i + 1);
    } else {
      setDone(true);
    }
  }

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  if (done) {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen py-12 px-8" style={{ background: gradients.gameBg }}>
            <div className="max-w-xl mx-auto">
              {/* This was a preview — no result was saved */}
              <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center text-white/70 text-xs font-semibold mb-6 tracking-wide uppercase">
                Preview Mode — Results not saved to database
              </div>
              <div className="text-center mb-10">
                <div className="flex justify-center mb-4"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center"><BookOpen className="w-8 h-8 text-white" /></div></div>
                <h1 className="text-white text-3xl font-black mb-2">Reading Preview Complete!</h1>
                <div className="text-7xl font-black mt-4" style={{ color: scoreHexColor(avgScore) }}>
                  {avgScore}%
                </div>
                <p className="text-white/60 text-sm mt-2">Average across {scores.length} activit{scores.length !== 1 ? 'ies' : 'y'}</p>
              </div>
              <div className="space-y-3 mb-8">
                {scores.map((s, i) => {
                  const act = activities[i];
                  return (
                    <div key={i} className="bg-white/10 rounded-2xl px-5 py-4 flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold">
                          Activity {i + 1}: {act?.type === 'MATCH' ? 'Matching' : 'Fill in Blank'}
                        </div>
                      </div>
                      <div className="text-2xl font-black tabular-nums" style={{ color: scoreHexColor(s) }}>
                        {s}%
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/teacher/homework/${hwId}/try`)}
                  className="flex-1 py-4 rounded-2xl text-white font-bold text-base"
                  style={{ background: gradients.primarySecondary }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push(`/teacher/homework/${hwId}`)}
                  className="flex-1 py-4 rounded-2xl text-white font-black text-base"
                  style={{ background: gradients.primaryPurple }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  return (
    <AuthGate requiredRole="TEACHER">
      {() => (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: gradients.gameBgAlt }}>
          {/* Header bar — reuses game shell pattern */}
          <div className="flex items-center justify-between px-8 py-4 flex-shrink-0">
            <button
              onClick={() => router.push(`/teacher/homework/${hwId}`)}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              ← Back
            </button>
            <div className="bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white/60 text-xs font-semibold tracking-wide uppercase">
              Preview Mode
            </div>
            {/* Activity progress chips */}
            <div className="flex items-center gap-3">
              {activities.map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-8 rounded-full transition-all"
                  style={{
                    background: i < scores.length
                      ? scoreHexColor(scores[i])
                      : i === activityIdx
                      ? '#A78BFA'
                      : '#ffffff20',
                  }}
                />
              ))}
            </div>
            <div className="text-white/70 text-sm font-semibold">
              {activityIdx + 1} / {total}
            </div>
          </div>

          {/* Activity content */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 overflow-auto">
            <div className="mb-6 text-center">
              <span className="bg-white/10 text-white/70 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide">
                {current?.type === 'MATCH' ? 'Matching' : 'Fill in the Blank'} · Activity {activityIdx + 1}
              </span>
            </div>
            {current && current.type === 'MATCH' && (
              <MatchingActivityPreview
                key={activityIdx}
                activity={current}
                onNext={handleNext}
              />
            )}
            {current && current.type === 'FILL_BLANK' && (
              <FillInBlankPreview
                key={activityIdx}
                activity={current}
                onNext={handleNext}
              />
            )}
          </div>
        </div>
      )}
    </AuthGate>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeacherTryHomeworkPage() {
  const { id } = useParams<{ id: string }>();
  const hwId = Number(id);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [items, setItems] = useState<ItemEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [transcript, setTranscript] = useState('');
  const timeInSeconds = 30;

  // Reading-specific state
  const [readingHomework, setReadingHomework] = useState<ReadingHomeworkDetail | null>(null);
  const isReadingPreview = readingHomework !== null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTextRef = useRef('');
  const itemsRef = useRef<ItemEntry[]>([]);
  const processingRef = useRef(false);

  useEffect(() => { itemsRef.current = items; }, [items]);

  const requestCamera = useCallback(async () => {
    setPageState('cam-check');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPageState('ready');
    } catch {
      setPageState('cam-denied');
    }
  }, []);

  useEffect(() => {
    getHomework(hwId).then(async (h) => {
      // READING branch: fetch full reading detail and render interactive preview.
      // No network calls to /game/session/* are made in this path — preview only (D-05).
      if (h.type === 'READING') {
        try {
          const rh = await getReadingHomework(hwId);
          setReadingHomework(rh);
          setPageState('ready'); // skip camera check for reading
        } catch {
          setPageState('error');
        }
        return;
      }

      // PHONICS / SPEAKING branch (unchanged)
      const list: ItemEntry[] = h.type === 'PHONICS'
        ? (h.parts ?? []).flatMap((part) =>
            part.words.map((word) => ({ text: word.text, transcribed: '', score: 0, state: 'waiting' as ItemState }))
          )
        : h.speakingText
          ? [{ text: h.speakingText, transcribed: '', score: 0, state: 'waiting' as ItemState }]
          : [];
      setItems(list);
      requestCamera();
    }).catch(() => setPageState('error'));
  }, [hwId, requestCamera]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stopSpeech = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  }, []);

  function startSpeech(onUpdate: (text: string) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRec) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRec();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(' ').trim();
      onUpdate(text);
    };
    rec.onend = () => { if (recognitionRef.current === rec) { try { rec.start(); } catch {} } };
    rec.start();
    recognitionRef.current = rec;
  }

  const processItem = useCallback((index: number, detected: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    stopTimer();
    stopSpeech();

    const item = itemsRef.current[index];
    const score = calcScore(detected, item.text);
    setItems((prev) => prev.map((w, i) => i === index ? { ...w, state: 'done', transcribed: detected, score } : w));

    const next = index + 1;
    processingRef.current = false;
    if (next < itemsRef.current.length) {
      setCurrentIndex(next);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      playItem(next);
    } else {
      setPageState('results');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopTimer, stopSpeech]);

  function playItem(index: number) {
    setTranscript('');
    finalTextRef.current = '';
    setTimeLeft(timeInSeconds);
    setItems((prev) => prev.map((w, i) => i === index ? { ...w, state: 'recording' } : w));
    startSpeech((text) => { finalTextRef.current = text; setTranscript(text); });
    let t = timeInSeconds;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) processItem(index, finalTextRef.current);
    }, 1000);
  }

  function handleStart() { setPageState('playing'); setCurrentIndex(0); playItem(0); }
  function handleSubmitItem() { stopTimer(); stopSpeech(); processItem(currentIndex, finalTextRef.current); }

  useEffect(() => {
    if (pageState !== 'results') return;
    stopTimer();
    stopSpeech();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [pageState, stopTimer, stopSpeech]);

  useEffect(() => () => {
    stopTimer();
    stopSpeech();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopTimer, stopSpeech]);

  // READING branch: render interactive preview (no camera, no /game/session/* calls)
  if (isReadingPreview && readingHomework) {
    return <ReadingPreview homework={readingHomework} hwId={hwId} />;
  }

  if (pageState === 'loading' || pageState === 'cam-check') {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
            <div className="w-12 h-12 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">{pageState === 'cam-check' ? 'Requesting camera access…' : 'Loading…'}</p>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'cam-denied') {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-8" style={{ background: gradients.gameBg }}>
            <div className="flex justify-center"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center"><Camera className="w-8 h-8 text-white" /></div></div>
            <div className="text-center">
              <h2 className="text-white text-2xl font-black mb-2">Camera Required</h2>
              <p className="text-white/70 text-sm max-w-sm">Camera and microphone access is required to preview. Please allow access and retry.</p>
            </div>
            <button onClick={requestCamera} className="px-6 py-3 rounded-xl text-white font-bold" style={{ background: gradients.pinkHighlight }}>
              Try Again
            </button>
            <button onClick={() => router.push(`/teacher/homework/${hwId}`)} className="text-white/60 text-sm hover:text-white">← Back</button>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'error') {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
            <p className="text-highlight text-lg font-bold">Homework not found.</p>
            <button onClick={() => router.push('/teacher/homework')} className="text-white/60 text-sm hover:text-white">← Back</button>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'results') {
    const finalScore = Math.round(items.reduce((s, w) => s + w.score, 0) / (items.length || 1));
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen py-12 px-8" style={{ background: gradients.gameBg, minWidth: 1024 }}>
            <div className="max-w-xl mx-auto">
              <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center text-white/70 text-xs font-semibold mb-6 tracking-wide uppercase">
                Preview Mode — Results not saved
              </div>
              <div className="text-center mb-10">
                <div className="flex justify-center mb-4"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center"><PartyPopper className="w-8 h-8 text-white" /></div></div>
                <h1 className="text-white text-3xl font-black mb-2">Preview Complete!</h1>
                <div className="text-7xl font-black mt-4" style={{ color: scoreHexColor(finalScore) }}>{finalScore}%</div>
                <p className="text-white/60 text-sm mt-2">This is how students experience the scoring</p>
              </div>
              <div className="space-y-3 mb-8">
                {items.map((w, i) => (
                  <div key={i} className="bg-white bg-opacity-10 rounded-2xl px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold text-lg">{w.text}</div>
                        <div className="text-white/70 text-sm mt-0.5">
                          You said: <span className="text-white italic">&quot;{w.transcribed || '—'}&quot;</span>
                        </div>
                      </div>
                      <div className="text-2xl font-black tabular-nums" style={{ color: scoreHexColor(w.score) }}>
                        {w.score}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => router.push(`/teacher/homework/${hwId}/try`)}
                  className="flex-1 py-4 rounded-2xl text-white font-bold text-base"
                  style={{ background: gradients.primarySecondary }}>
                  Try Again
                </button>
                <button onClick={() => router.push(`/teacher/homework/${hwId}`)}
                  className="flex-1 py-4 rounded-2xl text-white font-black text-base"
                  style={{ background: gradients.primaryPurple }}>
                  Back to Homework
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  const current = pageState === 'playing' ? items[currentIndex] : null;
  const doneCount = items.filter((w) => w.state === 'done').length;

  return (
    <AuthGate requiredRole="TEACHER">
      {() => (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: gradients.gameBgAlt, minWidth: 1024 }}>
          <div className="flex items-center justify-between px-8 py-4 flex-shrink-0">
            <button onClick={() => router.push(`/teacher/homework/${hwId}`)} className="text-white/60 hover:text-white text-sm transition-colors">← Back</button>
            <div className="bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white/60 text-xs font-semibold tracking-wide uppercase">Preview Mode</div>
            <div className="flex items-center gap-3">
              {items.map((w, i) => (
                <div key={i} className="h-2 w-8 rounded-full transition-all"
                  style={{
                    background: w.state === 'done' ? scoreHexColor(w.score) : i === currentIndex && pageState === 'playing' ? '#A78BFA' : '#ffffff20',
                  }} />
              ))}
            </div>
            <div className="text-white/70 text-sm font-semibold">
              {pageState === 'playing' ? `${doneCount + 1} / ${items.length}` : `${items.length} items`}
            </div>
          </div>

          <div className="flex-1 flex gap-6 px-8 pb-8 min-h-0">
            <div className="w-2/5 flex-shrink-0 flex flex-col">
              <div className="relative flex-1 bg-black rounded-3xl overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                {pageState === 'playing' && (
                  <div className="absolute top-4 left-4 bg-white/10 px-3 py-1.5 rounded-full">
                    <span className="text-white/70 text-xs font-semibold">Preview</span>
                  </div>
                )}
                {pageState === 'playing' && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-primary/80 px-4 py-2 rounded-full">
                    <Mic className="w-3.5 h-3.5 text-white" /><span className="text-white text-xs font-semibold">Listening</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              {pageState === 'ready' && (
                <div className="text-center">
                  <div className="flex justify-center mb-6"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center"><Eye className="w-8 h-8 text-white" /></div></div>
                  <h2 className="text-white text-3xl font-black mb-3">Preview Homework</h2>
                  <p className="text-white/70 mb-2">{items.length} item{items.length !== 1 ? 's' : ''} · {timeInSeconds}s each</p>
                  <p className="text-white/40 text-xs mb-10">Results not saved — teacher preview only</p>
                  <div className="flex flex-wrap gap-2 justify-center mb-10">
                    {items.map((w, i) => (
                      <span key={i} className="bg-white bg-opacity-10 text-white/80 text-sm px-3 py-1.5 rounded-lg font-semibold">
                        {w.text}
                      </span>
                    ))}
                  </div>
                  <button onClick={handleStart}
                    className="px-10 py-4 rounded-2xl text-white font-black text-xl shadow-2xl hover:scale-105 transition-transform"
                    style={{ background: gradients.primaryPurple }}>
                    Start Preview
                  </button>
                </div>
              )}

              {pageState === 'playing' && current && (
                <div className="text-center w-full">
                  <div className="flex justify-center mb-6">
                    <CircleTimer seconds={timeLeft} total={timeInSeconds} />
                  </div>
                  <div className="text-7xl font-black text-white mb-4 tracking-widest" style={{ textShadow: '0 0 40px rgba(167,139,250,0.6)' }}>
                    {current.text}
                  </div>
                  <div className="min-h-12 mb-8">
                    {transcript
                      ? <p className="text-white/80 text-2xl italic font-medium">&quot;{transcript}&quot;</p>
                      : <p className="text-white/40 text-lg animate-pulse">Listening…</p>
                    }
                  </div>
                  <button onClick={handleSubmitItem}
                    className="px-8 py-3 rounded-2xl text-white font-bold text-lg hover:scale-105 transition-transform"
                    style={{ background: gradients.greenSecondary }}>
                    Next →
                  </button>
                  {doneCount > 0 && (
                    <div className="flex gap-2 justify-center mt-8 flex-wrap">
                      {items.filter((w) => w.state === 'done').map((w, i) => (
                        <span key={i} className="text-xs px-3 py-1 rounded-full font-bold"
                          style={{ background: `${scoreHexColor(w.score)}22`, color: scoreHexColor(w.score) }}>
                          {w.text} {w.score}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  );
}
