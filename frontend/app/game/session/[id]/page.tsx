'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { authHeaders } from '@/lib/auth';
import { saveWordResult, completeSession, GameSession } from '@/lib/admin-api';

type WordState = 'waiting' | 'recording' | 'done';
type PageState = 'loading' | 'ready' | 'playing' | 'uploading' | 'results' | 'error';

interface WordEntry {
  wordId: number;
  text: string;
  transcribed: string;
  score: number;
  state: WordState;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchSession(id: number): Promise<GameSession> {
  const res = await fetch(`${API_URL}/game/session/${id}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Session not found');
  return res.json();
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
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchSession(sessionId).then((session) => {
      const hw = session.homework!;
      setTimeInSeconds(hw.timeInSeconds);
      setWords(hw.words!.map((w) => ({
        wordId: w.word.id,
        text: w.word.text,
        transcribed: '',
        score: 0,
        state: 'waiting' as WordState,
      })));
      setPageState('ready');
    }).catch(() => setPageState('error'));
  }, [sessionId]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stopSpeech = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      return true;
    } catch {
      setCameraError('Camera access denied. Recording disabled.');
      return false;
    }
  }

  function startSpeechForWord(_word: string, onResult: (text: string) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRec) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRec();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join('');
      setTranscript(text);
      if (e.results[e.results.length - 1].isFinal) onResult(text);
    };
    rec.start();
    recognitionRef.current = rec;
  }

  async function processWord(index: number, detected: string) {
    stopTimer();
    stopSpeech();

    const word = words[index];
    setWords((prev) => prev.map((w, i) => i === index ? { ...w, state: 'done', transcribed: detected } : w));

    let score = 0;
    try {
      const result = await saveWordResult(sessionId, word.wordId, detected);
      score = result.score;
    } catch {}

    setWords((prev) => prev.map((w, i) => i === index ? { ...w, score } : w));

    const next = index + 1;
    if (next < words.length) {
      setCurrentIndex(next);
      playWord(next);
    } else {
      await finishSession();
    }
  }

  function playWord(index: number) {
    setTranscript('');
    setTimeLeft(timeInSeconds);
    setWords((prev) => prev.map((w, i) => i === index ? { ...w, state: 'recording' } : w));

    let finalDetected = '';
    startSpeechForWord(words[index].text, (text) => { finalDetected = text; });

    let t = timeInSeconds;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) processWord(index, finalDetected);
    }, 1000);
  }

  async function handleStart() {
    setPageState('playing');
    await startCamera();
    setCurrentIndex(0);
    playWord(0);
  }

  async function handleSubmitWord() {
    stopTimer();
    stopSpeech();
    await processWord(currentIndex, transcript);
  }

  async function finishSession() {
    setPageState('uploading');
    stopTimer();
    stopSpeech();

    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
      await new Promise((r) => setTimeout(r, 500));
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());

    let blob: Blob | undefined;
    if (chunksRef.current.length > 0) {
      blob = new Blob(chunksRef.current, { type: 'video/webm' });
    }

    try {
      const session = await completeSession(sessionId, blob);
      setResults(session);
      setPageState('results');
    } catch {
      setPageState('results');
    }
  }

  useEffect(() => () => {
    stopTimer();
    stopSpeech();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [stopTimer, stopSpeech]);

  if (pageState === 'loading') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => <main className="p-8 text-center text-gray-400">Loading session...</main>}
      </AuthGate>
    );
  }
  if (pageState === 'error') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => <main className="p-8 text-center text-red-500">Session not found.</main>}
      </AuthGate>
    );
  }
  if (pageState === 'uploading') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => <main className="p-8 text-center text-gray-400">Saving your results...</main>}
      </AuthGate>
    );
  }

  if (pageState === 'results') {
    const avg = words.length ? Math.round(words.reduce((s, w) => s + w.score, 0) / words.length) : 0;
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <main className="max-w-xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Results</h1>
            <div className="text-4xl font-bold text-blue-600 mb-6">{results?.score ?? avg}%</div>
            <div className="space-y-2 mb-8">
              {words.map((w) => (
                <div key={w.wordId} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
                  <div>
                    <div className="font-medium text-gray-800">{w.text}</div>
                    <div className="text-sm text-gray-400">You said: &quot;{w.transcribed || '—'}&quot;</div>
                  </div>
                  <div className={`text-lg font-bold ${w.score >= 80 ? 'text-green-600' : w.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {w.score}%
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => router.push('/game/homework')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700">
              Done
            </button>
          </main>
        )}
      </AuthGate>
    );
  }

  const current = words[currentIndex];

  return (
    <AuthGate requiredRole="STUDENT">
      {() => (
        <main className="max-w-xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">
              Word {currentIndex + 1} / {words.length}
            </h1>
            {pageState === 'playing' && (
              <div className={`text-2xl font-bold tabular-nums ${timeLeft <= 5 ? 'text-red-500' : 'text-blue-600'}`}>
                {timeLeft}s
              </div>
            )}
          </div>

          {/* Camera preview */}
          <div className="relative mb-4 bg-black rounded-xl overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-gray-900 bg-opacity-80">
                {cameraError}
              </div>
            )}
          </div>

          {pageState === 'ready' && (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4 text-sm">
                You have {words.length} word{words.length !== 1 ? 's' : ''} to blend. {timeInSeconds} seconds per word.
              </p>
              <button onClick={handleStart} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-blue-700">
                Start
              </button>
            </div>
          )}

          {pageState === 'playing' && current && (
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-800 mb-4 tracking-wide">{current.text}</div>
              <div className="min-h-8 mb-4 text-lg text-blue-600 italic">
                {transcript || <span className="text-gray-300">Listening...</span>}
              </div>
              <button
                onClick={handleSubmitWord}
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700"
              >
                Submit
              </button>

              {/* Word progress */}
              <div className="flex gap-1 justify-center mt-6">
                {words.map((w, i) => (
                  <div key={w.wordId} className={`h-2 flex-1 rounded-full ${
                    w.state === 'done' ? 'bg-green-400' : i === currentIndex ? 'bg-blue-400' : 'bg-gray-200'
                  }`} />
                ))}
              </div>
            </div>
          )}
        </main>
      )}
    </AuthGate>
  );
}
