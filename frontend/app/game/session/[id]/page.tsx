'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { authHeaders } from '@/lib/auth';
import { saveSpeakingResult, savePhonicsResult, completeSession, GameSession, BfaResult, SpeakingMode } from '@/lib/admin-api';
import { gradients, scoreHexColor, timerHexColor } from '@/lib/colors';
import PhonemeChips from './_components/PhonemeChips';
import { School, Mic, Hash, PartyPopper, CheckCircle2, FolderOpen, ImageIcon } from 'lucide-react';

type ItemKind = 'speaking' | 'phonics';
type ItemState = 'waiting' | 'recording' | 'done';
type PageState = 'loading' | 'cam-check' | 'cam-denied' | 'ready' | 'playing' | 'uploading' | 'results' | 'error' | 'upload';

interface SessionItem {
  kind: ItemKind;
  text: string;
  wordId?: number;
  highlight?: string;
  imageUrl?: string;
  pictureUrl?: string;
  transcribed: string;
  matchedWords?: number;
  totalWords?: number;
  score: number;
  state: ItemState;
  bfa?: BfaResult | null;
  bfaError?: string | null;
}

function itemTime(kind: ItemKind) {
  if (kind === 'speaking') return 60;
  return 15;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchSession(id: number): Promise<GameSession> {
  const res = await fetch(`${API_URL}/game/session/${id}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Session not found');
  return res.json();
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

const BFA_ERROR_MESSAGES: Record<string, string> = {
  audio_too_short:     'Bấm lâu hơn nhé — ghi âm quá ngắn',
  audio_too_long:      'Ghi âm quá dài — nói dưới 15 giây',
  recording_too_noisy: 'Mic quá ồn — tìm chỗ yên tĩnh hơn',
  speech_not_detected: 'Không nghe rõ — nói to hơn nhé',
  wrong_language:      'Please speak in English',
};

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [items, setItems] = useState<SessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(30);
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState<GameSession | null>(null);
  const [saveError, setSaveError] = useState(false);

  // Speaking file-upload state
  const [speakHw, setSpeakHw] = useState<{
    speakingMode: SpeakingMode | null;
    speakingText: string | null;
    speakingPictureUrl: string | null;
  } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTextRef = useRef('');
  const itemsRef = useRef<SessionItem[]>([]);
  const processingRef = useRef(false);
  const currentIndexRef = useRef(0);
  const audioBlobsRef = useRef<(Blob | null)[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vadRef = useRef<any>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    fetchSession(sessionId).then((session) => {
      const hw = session.assignment!.homework!;

      if (hw.type === 'SPEAKING') {
        setSpeakHw({
          speakingMode: (hw.speakingMode as SpeakingMode | null) ?? null,
          speakingText: hw.speakingText ?? null,
          speakingPictureUrl: hw.speakingPictureUrl ?? null,
        });
        setPageState('upload');
        return;
      }

      const built: SessionItem[] = (hw.parts ?? []).flatMap((part) =>
        part.words.map((word): SessionItem => ({
          kind: 'phonics',
          text: word.text,
          wordId: word.id,
          highlight: word.highlight ?? part.name,
          imageUrl: word.imageUrl ?? undefined,
          transcribed: '', score: 0, state: 'waiting',
        }))
      );
      setItems(built);
      requestCamera();
    }).catch(() => setPageState('error'));
  }, [sessionId]);

  async function requestCamera() {
    setPageState('cam-check');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Init VAD on same stream (no-op pause/resume so MediaRecorder tracks stay alive)
      try {
        const { MicVAD } = await import('@ricky0123/vad-web');
        const vad = await MicVAD.new({
          getStream: () => Promise.resolve(stream),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pauseStream: async (_s: any) => {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          resumeStream: async (s: any) => s,
          startOnLoad: false,
          model: 'legacy',
          baseAssetPath: '/',
          onnxWASMBasePath: '/',
          redemptionMs: 750,
          minSpeechMs: 300,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ortConfig: (ort: any) => { ort.env.logLevel = 'error'; },
          onSpeechEnd: () => {
            if (isPlayingRef.current && !processingRef.current) {
              stopTimer();
              stopSpeech();
              processItem(currentIndexRef.current, finalTextRef.current);
            }
          },
        });
        vadRef.current = vad;
      } catch (e) {
        console.warn('[vad] init failed, timer-only mode:', e);
      }

      setPageState('ready');
    } catch {
      setPageState('cam-denied');
    }
  }

  function startWordRecording(stream: MediaStream) {
    audioChunksRef.current = [];
    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) return;
    const audioStream = new MediaStream(tracks);
    const mimeType = pickAudioMimeType();
    const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    recorder.start(100);
    audioRecorderRef.current = recorder;
  }

  function stopWordRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = audioRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(null); return; }
      audioRecorderRef.current = null;
      const chunks = [...audioChunksRef.current];
      const guard = setTimeout(() => {
        resolve(chunks.length > 0 ? new Blob(chunks, { type: chunks[0].type || 'audio/webm' }) : null);
      }, 2000);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        clearTimeout(guard);
        resolve(chunks.length > 0 ? new Blob(chunks, { type: chunks[0].type || 'audio/webm' }) : null);
      };
      try { recorder.stop(); } catch (e) {
        clearTimeout(guard);
        resolve(chunks.length > 0 ? new Blob(chunks, { type: chunks[0].type || 'audio/webm' }) : null);
      }
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
    if (!SpeechRec) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRec();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      if (recognitionRef.current !== rec) return; // stale — fired after stop(), discard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(' ').trim();
      onUpdate(text);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => { console.error('[speech] error:', e.error); };
    rec.onend = () => { if (recognitionRef.current === rec) { try { rec.start(); } catch {} } };
    rec.start();
    recognitionRef.current = rec;
  }

  const processItem = useCallback(async (index: number, detected: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    isPlayingRef.current = false;
    stopTimer();
    stopSpeech();

    const item = itemsRef.current[index];
    if (!item) { processingRef.current = false; return; }

    const updatedItems = itemsRef.current.map((w, i) => i === index ? { ...w, state: 'done' as const, transcribed: detected } : w);
    itemsRef.current = updatedItems;
    setItems(updatedItems);

    try {
      const audioBlob = await stopWordRecording();
      audioBlobsRef.current[index] = audioBlob;
    } catch {
      audioBlobsRef.current[index] = null;
    }

    processingRef.current = false;
    const next = index + 1;
    if (next < itemsRef.current.length) {
      setCurrentIndex(next);
      playItem(next);
    } else {
      await stopRecordingTracks();
      await finishSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, stopTimer, stopSpeech]);

  function playItem(index: number) {
    currentIndexRef.current = index;
    const item = itemsRef.current[index];
    if (!item) return;
    const t = itemTime(item.kind);
    setTranscript('');
    finalTextRef.current = '';
    setTotalTime(t);
    setTimeLeft(t);
    setItems((prev) => prev.map((w, i) => i === index ? { ...w, state: 'recording' } : w));
    if (streamRef.current) startWordRecording(streamRef.current);
    startSpeech((text) => { finalTextRef.current = text; setTranscript(text); });
    isPlayingRef.current = true;
    vadRef.current?.start();
    let remaining = t;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) processItem(index, finalTextRef.current);
    }, 1000);
  }

  function handleStart() {
    setPageState('playing');
    setCurrentIndex(0);
    playItem(0);
  }

  async function handleSubmitItem() {
    stopTimer();
    stopSpeech();
    await processItem(currentIndexRef.current, finalTextRef.current);
  }

  async function stopRecordingTracks() {
    stopTimer();
    stopSpeech();
    isPlayingRef.current = false;
    await vadRef.current?.destroy();
    vadRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    await stopWordRecording();
  }

  async function finishSession() {
    // Stop all media tracks immediately — mic off before any async work
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioRecorderRef.current?.state !== 'inactive') {
      try { audioRecorderRef.current?.stop(); } catch {}
      audioRecorderRef.current = null;
    }
    setPageState('uploading');
    const currentItems = itemsRef.current;
    const scored = [...currentItems];

    for (let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i];
      const audioBlob = audioBlobsRef.current[i] ?? undefined;
      try {
        if (item.kind === 'speaking') {
          const r = await saveSpeakingResult(sessionId, audioBlob ?? undefined);
          scored[i] = { ...scored[i], score: r.score };
        } else if (item.kind === 'phonics') {
          const r = await savePhonicsResult(sessionId, item.wordId!, audioBlob);
          const bfaError = r.bfa?.error ?? null;
          scored[i] = { ...scored[i], score: bfaError ? 0 : r.score, bfa: r.bfa ?? null, bfaError };
        }
      } catch (err) {
        console.error(`[score] item="${item.text}"`, err);
      }
    }

    setItems(scored);

    try {
      const session = await completeSession(sessionId);
      setResults(session);
    } catch (err) {
      console.error('[finishSession] failed:', err);
      setSaveError(true);
    }
    setPageState('results');
  }

  async function handleSpeakingUpload() {
    setPageState('uploading');
    try {
      const r = await saveSpeakingResult(sessionId, uploadFile ?? undefined);
      const session = await completeSession(sessionId);
      setResults(session);
      setItems([{
        kind: 'speaking',
        text: speakHw?.speakingText ?? '',
        pictureUrl: speakHw?.speakingPictureUrl ?? undefined,
        transcribed: r.transcribedText ?? '',
        matchedWords: r.matchedWords,
        totalWords: r.totalWords,
        score: r.score,
        state: 'done',
      }]);
    } catch (err) {
      console.error('[speakUpload] failed:', err);
      setSaveError(true);
    }
    setPageState('results');
  }

  useEffect(() => () => {
    stopTimer();
    stopSpeech();
    isPlayingRef.current = false;
    vadRef.current?.destroy();
    if (audioRecorderRef.current?.state !== 'inactive') audioRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [stopTimer, stopSpeech]);

  if (pageState === 'upload' && speakHw) {
    const isFreespeak = speakHw.speakingMode === 'FREE_SPEAK';
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-6" style={{ background: gradients.gameBg }}>
            <button onClick={() => router.push('/game/homework')} className="self-start text-white/60 hover:text-white text-sm">← Back</button>

            <div className="w-full max-w-sm flex flex-col items-center gap-6">
              <div className="text-center">
                <div className="flex justify-center mb-3"><div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">{isFreespeak ? <ImageIcon className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}</div></div>
                <h2 className="text-white text-2xl font-black mb-1">
                  {isFreespeak ? 'Free Speak' : 'Script Match'}
                </h2>
                <p className="text-white/60 text-sm">Record on your device, then upload here</p>
              </div>

              {isFreespeak && speakHw.speakingPictureUrl && (
                <div className="rounded-2xl overflow-hidden border-4 border-white/20 max-w-xs w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={speakHw.speakingPictureUrl} alt="Speaking prompt" className="w-full object-contain" />
                </div>
              )}

              {!isFreespeak && speakHw.speakingText && (
                <div className="bg-white/10 rounded-2xl px-6 py-5 w-full text-center">
                  <p className="text-white text-xl font-bold leading-relaxed">{speakHw.speakingText}</p>
                </div>
              )}

              {isFreespeak && speakHw.speakingText && (
                <div className="bg-white/10 rounded-xl px-4 py-3 w-full">
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Talk about:</p>
                  <p className="text-white/80 text-sm">{speakHw.speakingText.split(',').map((k) => k.trim()).join(' · ')}</p>
                </div>
              )}

              <div className="w-full">
                <label className="flex flex-col items-center gap-3 w-full cursor-pointer rounded-2xl border-2 border-dashed border-white/30 py-8 px-4 hover:border-white/60 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {uploadFile ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <FolderOpen className="w-8 h-8 text-white/60" />}
                  {uploadFile ? (
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm">{uploadFile.name}</p>
                      <p className="text-white/50 text-xs mt-0.5">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  ) : (
                    <p className="text-white/70 text-sm font-medium text-center">Tap to select your recording</p>
                  )}
                  <input type="file" accept="audio/*" className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>

              <button
                onClick={handleSpeakingUpload}
                disabled={!uploadFile}
                className="w-full py-4 rounded-2xl text-white font-black text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                style={{ background: gradients.primaryPurple }}>
                Submit Recording
              </button>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'loading' || pageState === 'cam-check') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
            <div className="w-12 h-12 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">{pageState === 'cam-check' ? 'Requesting microphone access…' : 'Loading…'}</p>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'cam-denied') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-8" style={{ background: gradients.gameBg }}>
            <div className="flex justify-center"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center"><Mic className="w-8 h-8 text-white" /></div></div>
            <div className="text-center">
              <h2 className="text-white text-2xl font-black mb-2">Microphone Required</h2>
              <p className="text-white/70 text-sm max-w-sm">Microphone access is required. Please allow access and reload.</p>
            </div>
            <button onClick={requestCamera} className="px-6 py-3 rounded-xl text-white font-bold" style={{ background: gradients.pinkHighlight }}>
              Try Again
            </button>
            <button onClick={() => router.push('/game/homework')} className="text-white/60 text-sm hover:text-white">← Back to Homework</button>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'error') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
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
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-accent font-semibold">Scoring and saving…</p>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'results') {
    const finalScore = results?.score ?? (items.length > 0
      ? Math.round(items.reduce((s, w) => s + w.score, 0) / items.length)
      : 0);
    const scoreColor = scoreHexColor(finalScore);
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <div className="min-h-screen py-12 px-8" style={{ background: gradients.gameBg, minWidth: 1024 }}>
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-10">
                <div className="flex justify-center mb-4"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center"><PartyPopper className="w-8 h-8 text-white" /></div></div>
                <h1 className="text-white text-3xl font-black mb-2">Homework Complete!</h1>
                {items.length > 0 && (
                  <div className="text-7xl font-black mt-4" style={{ color: scoreColor }}>{finalScore}%</div>
                )}
                {saveError
                  ? <p className="text-red-400 mt-1 text-sm">Recording could not be saved</p>
                  : <p className="text-white/70 mt-1 text-sm">Your recording has been saved</p>
                }
              </div>

              <div className="space-y-3 mb-8">
                {items.map((item, idx) => (
                  <div key={idx} className="bg-white bg-opacity-10 rounded-2xl px-5 py-4">
                    {item.kind === 'phonics' ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1 text-white/60 text-xs font-semibold uppercase mb-1"><Hash className="w-3.5 h-3.5" /> Phonics</div>
                            <div className="text-white font-bold text-lg">{item.text}</div>
                            <div className="text-white/70 text-sm mt-0.5">
                              You said: <span className="text-white italic">"{item.transcribed || '—'}"</span>
                            </div>
                          </div>
                          <div className="text-2xl font-black tabular-nums" style={{ color: scoreHexColor(item.score) }}>
                            {item.score}%
                          </div>
                        </div>
                        {item.bfaError && (
                          <div className="mt-2 text-sm font-semibold text-amber-400">
                            {BFA_ERROR_MESSAGES[item.bfaError] ?? 'Có lỗi — thử lại nhé'}
                          </div>
                        )}
                        {!item.bfaError && item.bfa?.success && item.bfa.feedback.length > 0 && (
                          <PhonemeChips feedback={item.bfa.feedback} />
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-white/60 text-xs font-bold uppercase mb-2">
                          🎤 Speaking{speakHw?.speakingMode === 'FREE_SPEAK' ? ' · Free Speak' : speakHw?.speakingMode === 'SCRIPT_MATCH' ? ' · Script Match' : ''}
                        </div>
                        {speakHw?.speakingMode === 'FREE_SPEAK' && item.pictureUrl && (
                          <div className="rounded-xl overflow-hidden mb-3 max-h-40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.pictureUrl} alt="Speaking prompt" className="w-full object-contain" />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {speakHw?.speakingMode !== 'FREE_SPEAK' && (
                              <div className="text-white font-medium text-sm mb-1">{item.text}</div>
                            )}
                            <div className="text-white/70 text-sm">
                              You said: <span className="text-white italic">"{item.transcribed || '—'}"</span>
                            </div>
                            {speakHw?.speakingMode === 'FREE_SPEAK' && item.matchedWords !== undefined && item.totalWords !== undefined && (
                              <div className="text-white/70 text-sm mt-1">
                                Keywords matched: {item.matchedWords}/{item.totalWords}
                              </div>
                            )}
                          </div>
                          <div className="text-2xl font-black tabular-nums shrink-0" style={{ color: scoreHexColor(item.score) }}>
                            {item.score}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={() => router.push('/game/homework')}
                className="w-full py-4 rounded-2xl text-white font-black text-lg"
                style={{ background: gradients.primaryPurple }}>
                Finish
              </button>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  const current = pageState === 'playing' ? items[currentIndex] : null;
  const doneCount = items.filter((w) => w.state === 'done').length;

  return (
    <AuthGate requiredRole="STUDENT">
      {() => (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: gradients.gameBgAlt, minWidth: 1024 }}>
          <div className="flex items-center justify-between px-8 py-4 flex-shrink-0">
            <button onClick={() => router.push('/game/homework')} className="text-white/60 hover:text-white text-sm transition-colors">← Back</button>
            <div className="flex items-center gap-3">
              {items.map((item, i) => (
                <div key={i} className="h-2 w-8 rounded-full transition-all"
                  style={{
                    background: item.state === 'done' ? '#ffffff80' : i === currentIndex && pageState === 'playing' ? '#A78BFA' : '#ffffff20',
                  }} />
              ))}
            </div>
            <div className="text-white/70 text-sm font-semibold">
              {pageState === 'playing' ? `${doneCount + 1} / ${items.length}` : `${items.length} item${items.length !== 1 ? 's' : ''}`}
            </div>
          </div>

          <div className="flex-1 flex gap-6 px-8 pb-8 min-h-0">
            <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
              {pageState === 'ready' && (
                <div className="text-center">
                  <div className="flex justify-center mb-6"><div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center"><School className="w-8 h-8 text-white" /></div></div>
                  <h2 className="text-white text-3xl font-black mb-3">Ready?</h2>
                  <p className="text-white/60 text-sm mb-10">Say each item clearly when it appears</p>
                  <div className="flex flex-wrap gap-2 justify-center mb-10">
                    {items.map((item, i) => (
                      <span key={i} className="bg-white bg-opacity-10 text-white/80 text-sm px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                        {item.kind === 'speaking' ? <Mic className="w-3 h-3 opacity-60" /> : <Hash className="w-3 h-3 opacity-60" />}
                        {item.kind === 'speaking'
                          ? `${item.text.slice(0, 24)}${item.text.length > 24 ? '…' : ''}`
                          : item.text}
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
                    <CircleTimer seconds={timeLeft} total={totalTime} />
                  </div>

                  {current.kind === 'speaking' ? (
                    <>
                      <div className="flex items-center justify-center gap-1.5 text-white/60 text-sm font-semibold uppercase tracking-wide mb-3"><Mic className="w-4 h-4" /> Read aloud</div>
                      {current.pictureUrl && (
                        <div className="mb-4 rounded-2xl overflow-hidden max-h-48 max-w-xs mx-auto">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={current.pictureUrl} alt="Speaking prompt" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="text-2xl font-bold text-white mb-4 leading-relaxed max-w-lg mx-auto"
                        style={{ textShadow: '0 0 20px rgba(255,155,210,0.4)' }}>
                        {current.text}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-1.5 text-white/60 text-sm font-semibold uppercase tracking-wide mb-3"><Hash className="w-4 h-4" /> Say this sound</div>
                      <div className="text-7xl font-black text-white mb-4 tracking-widest"
                        style={{ textShadow: '0 0 40px rgba(167,139,250,0.6)' }}>
                        {current.text}
                      </div>
                    </>
                  )}

                  <div className="min-h-12 mb-8">
                    {transcript
                      ? <p className="text-white/80 text-2xl italic font-medium">"{transcript}"</p>
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
                      {items.filter((w) => w.state === 'done').map((item, i) => (
                        <span key={i} className="text-xs px-3 py-1 rounded-full font-bold"
                          style={{ background: '#ffffff15', color: '#ffffffcc' }}>
                          {item.kind === 'phonics' ? <><Hash className="w-3 h-3" /> {item.text}</> : <Mic className="w-3 h-3" />}
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
