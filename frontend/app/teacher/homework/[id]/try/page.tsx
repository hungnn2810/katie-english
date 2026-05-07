'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { getHomework } from '@/lib/admin-api';
import { gradients, scoreHexColor, timerHexColor } from '@/lib/colors';

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
    getHomework(hwId).then((h) => {
      const list = h.parts.flatMap((p) =>
        p.type === 'PHONICS'
          ? (p.phonicsItems ?? []).map((text) => ({ text, transcribed: '', score: 0, state: 'waiting' as ItemState }))
          : p.words.map((w) => ({ text: w.word.text, transcribed: '', score: 0, state: 'waiting' as ItemState }))
      );
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
    rec.onend = () => {
      if (recognitionRef.current === rec) {
        try { rec.start(); } catch {}
      }
    };
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

    startSpeech((text) => {
      finalTextRef.current = text;
      setTranscript(text);
    });

    let t = timeInSeconds;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) processItem(index, finalTextRef.current);
    }, 1000);
  }

  function handleStart() {
    setPageState('playing');
    setCurrentIndex(0);
    playItem(0);
  }

  function handleSubmitItem() {
    stopTimer();
    stopSpeech();
    processItem(currentIndex, finalTextRef.current);
  }

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
            <div className="text-6xl">📷</div>
            <div className="text-center">
              <h2 className="text-white text-2xl font-black mb-2">Camera Required</h2>
              <p className="text-white/70 text-sm max-w-sm">Camera and microphone access is required to preview the homework experience. Please allow access in your browser settings and retry.</p>
            </div>
            <button onClick={requestCamera} className="px-6 py-3 rounded-xl text-white font-bold" style={{ background: gradients.pinkHighlight }}>
              Try Again
            </button>
            <button onClick={() => router.push(`/teacher/homework/${hwId}`)} className="text-white/60 text-sm hover:text-white">
              ← Back to Homework
            </button>
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
                <div className="text-6xl mb-4">🎉</div>
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
            <button onClick={() => router.push(`/teacher/homework/${hwId}`)} className="text-white/60 hover:text-white text-sm transition-colors">
              ← Back
            </button>
            <div className="bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white/60 text-xs font-semibold tracking-wide uppercase">
              Preview Mode
            </div>
            <div className="flex items-center gap-3">
              {items.map((w, i) => (
                <div key={i} className="h-2 w-8 rounded-full transition-all"
                  style={{
                    background: w.state === 'done'
                      ? scoreHexColor(w.score)
                      : i === currentIndex && pageState === 'playing' ? '#A78BFA' : '#ffffff20',
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
                    <span className="text-white text-xs font-semibold">🎤 Listening</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              {pageState === 'ready' && (
                <div className="text-center">
                  <div className="text-6xl mb-6">👁️</div>
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
                    {transcript ? (
                      <p className="text-white/80 text-2xl italic font-medium">&quot;{transcript}&quot;</p>
                    ) : (
                      <p className="text-white/40 text-lg animate-pulse">Listening…</p>
                    )}
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
