'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { authHeaders } from '@/lib/auth';
import { saveWordResult, completeSession, GameSession, BfaResult } from '@/lib/admin-api';
import { gradients, scoreHexColor, timerHexColor } from '@/lib/colors';

type WordState = 'waiting' | 'recording' | 'done';
type PageState = 'loading' | 'cam-check' | 'cam-denied' | 'ready' | 'playing' | 'uploading' | 'results' | 'error';

interface WordEntry {
  wordId: number;
  text: string;
  transcribed: string;
  score: number;
  state: WordState;
  bfa?: BfaResult | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchSession(id: number): Promise<GameSession> {
  const res = await fetch(`${API_URL}/game/session/${id}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

function pickMimeType(): string {
  const types = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

function pickAudioMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

function CircleTimer({ seconds, total }: { seconds: number; total: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const progress = total > 0 ? seconds / total : 0;
  const dash = circ * progress;
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

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [words, setWords] = useState<WordEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState<GameSession | null>(null);
  const [timeInSeconds, setTimeInSeconds] = useState(30);
  const [saveError, setSaveError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTextRef = useRef('');
  const wordsRef = useRef<WordEntry[]>([]);
  const processingRef = useRef(false);

  useEffect(() => { wordsRef.current = words; }, [words]);

  useEffect(() => {
    fetchSession(sessionId).then((session) => {
      const hw = session.homework!;
      const allWords = hw.parts.flatMap((p) => p.words);
      setWords(allWords.map((w) => ({
        wordId: w.word.id, text: w.word.text, transcribed: '', score: 0, state: 'waiting' as WordState,
      })));
      requestCamera();
    }).catch(() => setPageState('error'));
  }, [sessionId]);

  async function requestCamera() {
    setPageState('cam-check');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current = recorder;
      setPageState('ready');
    } catch {
      setPageState('cam-denied');
    }
  }

  function startWordRecording(stream: MediaStream) {
    audioChunksRef.current = [];
    const audioStream = new MediaStream(stream.getAudioTracks());
    const mimeType = pickAudioMimeType();
    const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    recorder.start(200);
    audioRecorderRef.current = recorder;
  }

  function stopWordRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = audioRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(null); return; }
      recorder.onstop = () => {
        const chunks = audioChunksRef.current;
        resolve(chunks.length > 0 ? new Blob(chunks, { type: chunks[0].type || 'audio/webm' }) : null);
      };
      recorder.stop();
      audioRecorderRef.current = null;
    });
  }

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
    if (!SpeechRec) {
      console.warn('[speech] SpeechRecognition not supported in this browser — transcribedText will be empty');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRec();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(' ').trim();
      console.log('[speech] result:', text);
      onUpdate(text);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      console.error('[speech] error:', e.error, e.message ?? '');
    };
    rec.onend = () => {
      if (recognitionRef.current === rec) {
        try { rec.start(); } catch {}
      }
    };
    rec.start();
    recognitionRef.current = rec;
  }

  const processWord = useCallback(async (index: number, detected: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    stopTimer();
    stopSpeech();
    const word = wordsRef.current[index];
    setWords((prev) => prev.map((w, i) => i === index ? { ...w, state: 'done', transcribed: detected } : w));

    const audioBlob = await stopWordRecording();

    console.log(`[submit] word="${word.text}" detected="${detected}" audioSize=${audioBlob?.size ?? 0}B`);

    let score = 0;
    let bfa: BfaResult | null = null;
    try {
      const r = await saveWordResult(sessionId, word.wordId, detected, audioBlob ?? undefined);
      score = r.score;
      bfa = r.bfa ?? null;
      console.log(`[result] word="${word.text}" score=${score} bfa_success=${bfa?.success ?? 'n/a'} bfa_score=${bfa?.score ?? 'n/a'} aligned=${bfa?.phonemes.map(p => p.ipa).join(',') ?? 'n/a'}`);
    } catch (err) {
      console.error(`[error] word="${word.text}"`, err);
    }

    setWords((prev) => prev.map((w, i) => i === index ? { ...w, score, bfa } : w));
    const next = index + 1;
    processingRef.current = false;
    if (next < wordsRef.current.length) {
      setCurrentIndex(next);
      playWord(next);
    } else {
      await finishSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, stopTimer, stopSpeech]);

  function playWord(index: number) {
    setTranscript('');
    finalTextRef.current = '';
    setTimeLeft(timeInSeconds);
    setWords((prev) => prev.map((w, i) => i === index ? { ...w, state: 'recording' } : w));

    if (streamRef.current) startWordRecording(streamRef.current);

    startSpeech((text) => {
      finalTextRef.current = text;
      setTranscript(text);
    });

    let t = timeInSeconds;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) processWord(index, finalTextRef.current);
    }, 1000);
  }

  function handleStart() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      mediaRecorderRef.current.start(1000);
    }
    setPageState('playing');
    setCurrentIndex(0);
    playWord(0);
  }

  async function handleSubmitWord() {
    stopTimer();
    stopSpeech();
    await processWord(currentIndex, finalTextRef.current);
  }

  async function finishSession() {
    setPageState('uploading');
    stopTimer();
    stopSpeech();
    await stopWordRecording();

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        await Promise.race([
          new Promise<void>((resolve) => {
            mediaRecorderRef.current!.onstop = () => resolve();
            mediaRecorderRef.current!.stop();
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 2000)),
        ]);
      }
    } finally {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    const blob = chunksRef.current.length > 0
      ? new Blob(chunksRef.current, { type: chunksRef.current[0].type || 'video/webm' })
      : undefined;
    try {
      const session = await completeSession(sessionId, blob);
      setResults(session);
    } catch (err) {
      console.error('[finishSession] failed to save session:', err);
      setSaveError(true);
    }
    setPageState('results');
  }

  useEffect(() => () => {
    stopTimer();
    stopSpeech();
    if (audioRecorderRef.current?.state !== 'inactive') audioRecorderRef.current?.stop();
    mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopTimer, stopSpeech]);

  // ── Loading / error / uploading screens ──────────────────────────────────
  if (pageState === 'loading' || pageState === 'cam-check') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4"
            style={{ background: gradients.gameBg }}>
            <div className="w-12 h-12 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">{pageState === 'cam-check' ? 'Requesting camera access…' : 'Loading…'}</p>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'cam-denied') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-8"
            style={{ background: gradients.gameBg }}>
            <div className="text-6xl">📷</div>
            <div className="text-center">
              <h2 className="text-white text-2xl font-black mb-2">Camera Required</h2>
              <p className="text-white/70 text-sm max-w-sm">Camera and microphone access is required to record your homework session. Please allow access in your browser settings and reload.</p>
            </div>
            <button onClick={requestCamera}
              className="px-6 py-3 rounded-xl text-white font-bold"
              style={{ background: gradients.pinkHighlight }}>
              Try Again
            </button>
            <button onClick={() => router.push('/game/homework')} className="text-white/60 text-sm hover:text-white">
              ← Back to Homework
            </button>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'error') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4"
            style={{ background: gradients.gameBg }}>
            <p className="text-highlight text-lg font-bold">Session not found.</p>
            <button onClick={() => router.push('/game/homework')} className="text-white/60 text-sm hover:text-white">← Back</button>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'uploading') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4"
            style={{ background: gradients.gameBg }}>
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-accent font-semibold">Saving your recording…</p>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (pageState === 'results') {
    const finalScore = results?.score ?? Math.round(words.reduce((s, w) => s + w.score, 0) / (words.length || 1));
    const scoreColor = scoreHexColor(finalScore);
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <div className="min-h-screen py-12 px-8" style={{ background: gradients.gameBg, minWidth: 1024 }}>
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-10">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-white text-3xl font-black mb-2">Homework Complete!</h1>
                <div className="text-7xl font-black mt-4" style={{ color: scoreColor }}>{finalScore}%</div>
                {saveError
                  ? <p className="text-red-400 mt-1 text-sm">Recording could not be saved — check your connection</p>
                  : <p className="text-white/70 mt-1 text-sm">Your recording has been saved</p>
                }
              </div>

              <div className="space-y-3 mb-8">
                {words.map((w) => (
                  <div key={w.wordId} className="bg-white bg-opacity-10 rounded-2xl px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold text-lg">{w.text}</div>
                        <div className="text-white/70 text-sm mt-0.5">
                          You said: <span className="text-white italic">&quot;{w.transcribed || '—'}&quot;</span>
                        </div>
                      </div>
                      <div className="text-2xl font-black tabular-nums"
                        style={{ color: scoreHexColor(w.score) }}>
                        {w.score}%
                      </div>
                    </div>
                    {w.bfa?.success && w.bfa.feedback.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {w.bfa.feedback.map((op, i) => (
                          <span key={i}
                            className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                            style={{
                              background: op.status === 'correct' ? '#22c55e22' : '#ef444422',
                              color: op.status === 'correct' ? '#22c55e' : '#ef4444',
                            }}>
                            {op.expected ?? op.aligned}
                            {op.status === 'substituted' && ` → ${op.aligned}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={() => router.push('/game/homework')}
                className="w-full py-4 rounded-2xl text-white font-black text-lg"
                style={{ background: gradients.primaryPurple }}>
                Back to Homework
              </button>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Ready / Playing ───────────────────────────────────────────────────────
  const current = pageState === 'playing' ? words[currentIndex] : null;
  const doneCount = words.filter((w) => w.state === 'done').length;

  return (
    <AuthGate requiredRole="STUDENT">
      {() => (
        <div className="h-screen flex flex-col overflow-hidden"
          style={{ background: gradients.gameBgAlt, minWidth: 1024 }}>

          {/* Top bar */}
          <div className="flex items-center justify-between px-8 py-4 flex-shrink-0">
            <button onClick={() => router.push('/game/homework')} className="text-white/60 hover:text-white text-sm transition-colors">
              ← Back
            </button>
            <div className="flex items-center gap-3">
              {words.map((w, i) => (
                <div key={w.wordId} className="h-2 w-8 rounded-full transition-all"
                  style={{
                    background: w.state === 'done'
                      ? scoreHexColor(w.score)
                      : i === currentIndex && pageState === 'playing' ? '#A78BFA' : '#ffffff20'
                  }} />
              ))}
            </div>
            <div className="text-white/70 text-sm font-semibold">
              {pageState === 'playing' ? `${doneCount + 1} / ${words.length}` : `${words.length} words`}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex gap-6 px-8 pb-8 min-h-0">

            {/* Left: camera */}
            <div className="w-2/5 flex-shrink-0 flex flex-col">
              <div className="relative flex-1 bg-black rounded-3xl overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                {pageState === 'playing' && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black bg-opacity-50 px-3 py-1.5 rounded-full">
                    <div className="w-2.5 h-2.5 rounded-full bg-highlight animate-pulse" />
                    <span className="text-white text-xs font-bold tracking-wider">REC</span>
                  </div>
                )}
                {pageState === 'playing' && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-primary/80 px-4 py-2 rounded-full">
                    <span className="text-white text-xs font-semibold">🎤 Listening</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: word + controls */}
            <div className="flex-1 flex flex-col items-center justify-center">
              {pageState === 'ready' && (
                <div className="text-center">
                  <div className="text-6xl mb-6">🎓</div>
                  <h2 className="text-white text-3xl font-black mb-3">Ready?</h2>
                  <p className="text-white/70 mb-2">{words.length} word{words.length !== 1 ? 's' : ''} · {timeInSeconds}s each</p>
                  <p className="text-white/60 text-sm mb-10">Say each word clearly when it appears</p>
                  <div className="flex flex-wrap gap-2 justify-center mb-10">
                    {words.map((w) => (
                      <span key={w.wordId} className="bg-white bg-opacity-10 text-white/80 text-sm px-3 py-1.5 rounded-lg font-semibold">
                        {w.text}
                      </span>
                    ))}
                  </div>
                  <button onClick={handleStart}
                    className="px-10 py-4 rounded-2xl text-white font-black text-xl shadow-2xl hover:scale-105 transition-transform"
                    style={{ background: gradients.primaryPurple }}>
                    Start Recording
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
                      <p className="text-white/80 text-2xl italic font-medium">"{transcript}"</p>
                    ) : (
                      <p className="text-white/40 text-lg animate-pulse">Listening…</p>
                    )}
                  </div>

                  <button onClick={handleSubmitWord}
                    className="px-8 py-3 rounded-2xl text-white font-bold text-lg hover:scale-105 transition-transform"
                    style={{ background: gradients.greenSecondary }}>
                    Next Word →
                  </button>

                  {doneCount > 0 && (
                    <div className="flex gap-2 justify-center mt-8 flex-wrap">
                      {words.filter((w) => w.state === 'done').map((w) => (
                        <span key={w.wordId} className="text-xs px-3 py-1 rounded-full font-bold"
                          style={{
                            background: `${scoreHexColor(w.score)}22`,
                            color: scoreHexColor(w.score),
                          }}>
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
