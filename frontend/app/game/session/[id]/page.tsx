'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { authHeaders } from '@/lib/auth';
import { saveSpeakingResult, savePhonicsResult, completeSession, GameSession, BfaResult, SpeakingMode } from '@/lib/admin-api';
import { gradients, scoreHexColor, timerHexColor } from '@/lib/colors';
import PhonemeChips from './_components/PhonemeChips';
import RecordButton from './_components/RecordButton';
import { School, Mic, Hash, PartyPopper, CheckCircle2, ImageIcon, Play, Pause } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

type ItemKind = 'speaking' | 'phonics';
type ItemState = 'waiting' | 'recording' | 'done';
type PageState = 'loading' | 'cam-check' | 'cam-denied' | 'ready' | 'playing' | 'uploading' | 'results' | 'error' | 'record';
type RecordState = 'idle' | 'recording' | 'recorded';

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
  audioUrl?: string;
}

function itemTime(kind: ItemKind) {
  if (kind === 'speaking') return 60;
  return 15;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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
    <Box component="svg" sx={{ width: { xs: 110, sm: 140 }, height: { xs: 110, sm: 140 }, transform: 'rotate(-90deg)' }} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }} />
      <text x="60" y="66" textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="28" fontWeight="900"
        style={{ transform: 'rotate(90deg)', transformOrigin: '60px 60px', fontVariantNumeric: 'tabular-nums' }}>
        {seconds}
      </text>
    </Box>
  );
}

const BFA_ERROR_MESSAGES: Record<string, string> = {
  audio_too_short:     'Bấm lâu hơn nhé — ghi âm quá ngắn',
  audio_too_long:      'Ghi âm quá dài — nói dưới 15 giây',
  recording_too_noisy: 'Mic quá ồn — tìm chỗ yên tĩnh hơn',
  speech_not_detected: 'Không nghe rõ — nói to hơn nhé',
  wrong_language:      'Please speak in English',
};

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
    setPlaying(!playing);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, px: 1.25, py: 0.75, bgcolor: '#F5F3FF', borderRadius: 2 }}>
      <audio ref={audioRef} src={src}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); if (audioRef.current) audioRef.current.currentTime = 0; }}
      />
      <Box onClick={toggle} sx={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: gradients.primaryPurple,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'opacity 0.15s', '&:hover': { opacity: 0.82 },
      }}>
        {playing ? <Pause size={13} color="white" fill="white" /> : <Play size={13} color="white" fill="white" style={{ marginLeft: 1 }} />}
      </Box>
      <Box sx={{ flex: 1, position: 'relative', height: 4, bgcolor: '#DDD6FE', borderRadius: 2, cursor: 'pointer' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const a = audioRef.current;
          if (a && duration) { a.currentTime = ((e.clientX - rect.left) / rect.width) * duration; }
        }}
      >
        <Box sx={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
          background: gradients.primaryPurple, borderRadius: 2,
          transition: 'width 0.15s linear',
        }} />
      </Box>
      <Typography sx={{ color: '#6B7280', fontSize: 11, fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
        {duration > 0 ? fmt(currentTime) : '0:00'}
        {duration > 0 ? ` / ${fmt(duration)}` : ''}
      </Typography>
    </Box>
  );
}

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

  // Speaking record state
  const [speakHw, setSpeakHw] = useState<{
    speakingMode: SpeakingMode | null;
    speakingText: string | null;
    speakingPictureUrl: string | null;
  } | null>(null);
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

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
  const speakStreamRef = useRef<MediaStream | null>(null);
  const speakRecorderRef = useRef<MediaRecorder | null>(null);
  const speakChunksRef = useRef<Blob[]>([]);
  const speakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        setPageState('record');
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
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(100);
    } catch {
      recorder = new MediaRecorder(audioStream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(100);
    }
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
    const audioUrls = audioBlobsRef.current.map((blob) => blob ? URL.createObjectURL(blob) : undefined);

    for (let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i];
      const audioBlob = audioBlobsRef.current[i] ?? undefined;
      try {
        if (item.kind === 'speaking') {
          const r = await saveSpeakingResult(sessionId, audioBlob ?? undefined);
          scored[i] = { ...scored[i], score: r.score, audioUrl: audioUrls[i] };
        } else if (item.kind === 'phonics') {
          const r = await savePhonicsResult(sessionId, item.wordId!, audioBlob);
          const bfaError = r.bfa?.error ?? null;
          scored[i] = { ...scored[i], score: bfaError ? 0 : r.score, bfa: r.bfa ?? null, bfaError, audioUrl: audioUrls[i] };
        }
      } catch (err) {
        console.error(`[score] item="${item.text}"`, err);
        setSaveError(true);
        scored[i] = { ...scored[i], audioUrl: audioUrls[i] };
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

  async function startSpeakRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      speakStreamRef.current = stream;
      speakChunksRef.current = [];
      const mimeType = pickAudioMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorder.ondataavailable = (e) => { if (e.data.size > 0) speakChunksRef.current.push(e.data); };
        recorder.start(100);
      } catch {
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => { if (e.data.size > 0) speakChunksRef.current.push(e.data); };
        recorder.start(100);
      }
      speakRecorderRef.current = recorder;
      setRecordingSeconds(0);
      setRecordState('recording');
      speakTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      // mic denied — stay idle
    }
  }

  function stopSpeakRecording() {
    if (speakTimerRef.current) { clearInterval(speakTimerRef.current); speakTimerRef.current = null; }
    const recorder = speakRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') { setRecordState('recorded'); return; }
    speakRecorderRef.current = null;
    const chunks = [...speakChunksRef.current];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      speakStreamRef.current?.getTracks().forEach((t) => t.stop());
      speakStreamRef.current = null;
      const blob = chunks.length > 0 ? new Blob(chunks, { type: chunks[0].type || 'audio/webm' }) : null;
      setRecordedBlob(blob);
      setRecordState('recorded');
    };
    try { recorder.stop(); } catch {
      speakStreamRef.current?.getTracks().forEach((t) => t.stop());
      speakStreamRef.current = null;
      setRecordedBlob(null);
      setRecordState('recorded');
    }
  }

  async function handleSpeakingUpload() {
    setPageState('uploading');
    const audioUrl = recordedBlob ? URL.createObjectURL(recordedBlob) : undefined;
    try {
      const r = await saveSpeakingResult(sessionId, recordedBlob ?? undefined);
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
        audioUrl,
      }]);
    } catch (err) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
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
    if (speakTimerRef.current) clearInterval(speakTimerRef.current);
    if (speakRecorderRef.current?.state !== 'inactive') speakRecorderRef.current?.stop();
    speakStreamRef.current?.getTracks().forEach((t) => t.stop());
    itemsRef.current.forEach((item) => { if (item.audioUrl) URL.revokeObjectURL(item.audioUrl); });
  }, [stopTimer, stopSpeech]);

  if (pageState === 'record' && speakHw) {
    const isFreespeak = speakHw.speakingMode === 'FREE_SPEAK';
    const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const secs = String(recordingSeconds % 60).padStart(2, '0');
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 3 }, py: { xs: 4, sm: 5 }, gap: 3, background: 'transparent' }}>
            <Button onClick={() => router.push('/game/homework')}
              sx={{ alignSelf: 'flex-start', color: '#6B7280', '&:hover': { color: '#1E1B4B' }, fontSize: 14, textTransform: 'none', minWidth: 0 }}>
              ← Quay lại
            </Button>

            <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: 384 }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                  <Box sx={{ width: 56, height: 56, bgcolor: '#F0EEFF', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isFreespeak ? <ImageIcon size={28} color="#1E1B4B" /> : <Mic size={28} color="#1E1B4B" />}
                  </Box>
                </Box>
                <Typography sx={{ color: '#1E1B4B', fontSize: 24, fontWeight: 900, mb: 0.5 }}>
                  {isFreespeak ? 'Nói tự do' : 'Đọc theo kịch bản'}
                </Typography>
                <Typography sx={{ color: '#6B7280', fontSize: 14 }}>Ghi âm câu trả lời của em</Typography>
              </Box>

              {isFreespeak && speakHw.speakingPictureUrl && (
                <Box sx={{ borderRadius: 4, overflow: 'hidden', border: '4px solid rgba(0,0,0,0.1)', maxWidth: 320, width: '100%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={speakHw.speakingPictureUrl} alt="Speaking prompt" style={{ width: '100%', objectFit: 'contain' }} />
                </Box>
              )}

              {!isFreespeak && speakHw.speakingText && (
                <Box sx={{ bgcolor: '#FFFFFF', borderRadius: 4, px: 3, py: 2.5, width: '100%', textAlign: 'center' }}>
                  <Typography sx={{ color: '#1E1B4B', fontSize: 20, fontWeight: 700, lineHeight: 1.6 }}>{speakHw.speakingText}</Typography>
                </Box>
              )}

              {isFreespeak && speakHw.speakingText && (
                <Box sx={{ bgcolor: '#FFFFFF', borderRadius: 3, px: 2, py: 1.5, width: '100%' }}>
                  <Typography sx={{ color: '#6B7280', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>Nói về:</Typography>
                  <Typography sx={{ color: '#374151', fontSize: 14 }}>{speakHw.speakingText.split(',').map((k) => k.trim()).join(' · ')}</Typography>
                </Box>
              )}

              {/* Recording controls */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
                {recordState === 'idle' && (
                  <RecordButton state="idle" onStart={startSpeakRecording} />
                )}

                {recordState === 'recording' && (
                  <>
                    <RecordButton state="recording" onStop={stopSpeakRecording} />
                    <Typography sx={{ color: '#1E1B4B', fontFamily: 'monospace', fontSize: 30, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{mins}:{secs}</Typography>
                  </>
                )}

                {recordState === 'recorded' && (
                  <>
                    <RecordButton state="done" />
                    <Typography sx={{ color: '#6B7280', fontSize: 14 }}>Đã ghi: {mins}:{secs}</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                      <Button
                        onClick={() => { setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); }}
                        sx={{
                          flex: 1, py: 1.5, borderRadius: 3, color: '#1E1B4B', fontWeight: 700, fontSize: 14,
                          border: '1px solid rgba(0,0,0,0.12)', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                          textTransform: 'none',
                        }}
                      >
                        Ghi lại
                      </Button>
                      <Button
                        onClick={handleSpeakingUpload}
                        sx={{
                          flex: 1, py: 1.5, borderRadius: 3, color: 'white', fontWeight: 900, fontSize: 14,
                          background: gradients.primaryPurple,
                          '&:hover': { transform: 'scale(1.02)', background: gradients.primaryPurple },
                          textTransform: 'none',
                        }}
                      >
                        Nộp bài!
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'loading' || pageState === 'cam-check') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'transparent' }}>
            <CircularProgress size={48} sx={{ color: '#4C4F7A' }} />
            <Typography sx={{ color: '#4C4F7A', fontSize: 14 }}>
              {pageState === 'cam-check' ? 'Đang yêu cầu quyền mic…' : 'Đang tải…'}
            </Typography>
          </Box>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'cam-denied') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, px: { xs: 3, sm: 4 }, background: 'transparent' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ width: 64, height: 64, bgcolor: '#F0EEFF', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={32} color="#1E1B4B" />
              </Box>
            </Box>
            <Box sx={{ textAlign: 'center', maxWidth: 480, mx: 'auto' }}>
              <Typography sx={{ color: '#1E1B4B', fontSize: 24, fontWeight: 900, mb: 1 }}>Cần quyền Microphone</Typography>
              <Typography sx={{ color: '#4C4F7A', fontSize: 14, maxWidth: 384 }}>
                Em cần cấp quyền microphone để ghi âm. Hãy vào cài đặt trình duyệt, cấp quyền cho trang này, rồi nhấn Thử lại nhé.
              </Typography>
            </Box>
            <Button
              onClick={() => window.location.reload()}
              sx={{ px: 3, py: 1.5, borderRadius: 3, color: 'white', fontWeight: 700, background: gradients.pinkHighlight, '&:hover': { opacity: 0.9, background: gradients.pinkHighlight }, textTransform: 'none' }}
            >
              Thử lại
            </Button>
            <Button
              onClick={() => router.push('/game/homework')}
              sx={{ color: '#6B7280', '&:hover': { color: '#1E1B4B' }, fontSize: 14, textTransform: 'none', minWidth: 0 }}
            >
              ← Về trang chủ
            </Button>
          </Box>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'error') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'transparent' }}>
            <Typography sx={{ color: '#FF7B7B', fontSize: 18, fontWeight: 700 }}>Session not found.</Typography>
            <Button onClick={() => router.push('/game/homework')}
              sx={{ color: '#6B7280', '&:hover': { color: '#1E1B4B' }, fontSize: 14, textTransform: 'none', minWidth: 0 }}>
              ← Quay lại
            </Button>
          </Box>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'uploading') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'transparent' }}>
            <CircularProgress size={48} sx={{ color: '#FFD166' }} />
            <Typography sx={{ color: '#FFD166', fontWeight: 600 }}>Đang chấm điểm và lưu…</Typography>
          </Box>
        )}
      </AuthGate>
    );
  }

  const RESULT_MSG = (s: number) => s >= 80 ? 'Tuyệt vời! Em làm rất tốt!' : s >= 50 ? 'Làm tốt lắm! Cố thêm chút nữa nhé!' : 'Đừng lo, thử lại nhé!';

  if (pageState === 'results') {
    const finalScore = results?.score ?? (items.length > 0
      ? Math.round(items.reduce((s, w) => s + w.score, 0) / items.length)
      : 0);
    const scoreColor = scoreHexColor(finalScore);
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', py: { xs: 4, sm: 6 }, px: { xs: 2, sm: 4 } }}>
            <Box sx={{ maxWidth: 560, mx: 'auto' }}>
              <Box sx={{ textAlign: 'center', mb: 5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Box sx={{ width: 76, height: 76, bgcolor: '#EEF2FF', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PartyPopper size={38} color="#1E1B4B" />
                  </Box>
                </Box>
                <Typography sx={{ color: '#1E1B4B', fontSize: 26, fontWeight: 900, mb: 1 }}>Hoàn thành bài tập!</Typography>
                {items.length > 0 && (
                  <Typography sx={{ fontSize: 78, fontWeight: 900, mt: 2, color: scoreColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                    {finalScore}%
                  </Typography>
                )}
                <Typography sx={{ color: '#1F2937', fontSize: 16, fontWeight: 700, mt: '4px' }}>
                  {RESULT_MSG(finalScore)}
                </Typography>
                {saveError
                  ? <Typography sx={{ color: '#f87171', mt: 0.5, fontSize: 14 }}>Không thể lưu bản ghi âm</Typography>
                  : null
                }
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
                {items.map((item, idx) => (
                  <Box key={idx} sx={{ bgcolor: '#FFFFFF', borderRadius: 3, px: 2.5, py: 2, boxShadow: '0 2px 8px rgba(124,58,237,0.08)' }}>
                    {item.kind === 'phonics' ? (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6B7280', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', mb: 0.5 }}>
                              <Hash size={14} /> Phonics
                            </Box>
                            <Typography sx={{ color: '#1E1B4B', fontWeight: 700, fontSize: 18 }}>{item.text}</Typography>
                            {item.audioUrl ? (
                              <Box sx={{ mt: 0.5 }}>
                                <AudioPlayer src={item.audioUrl} />
                                {item.transcribed && (
                                  <Typography sx={{ color: '#4C4F7A', fontSize: 12, mt: 0.5 }}>
                                    Em nói: <Box component="span" sx={{ color: '#1E1B4B', fontStyle: 'italic' }}>"{item.transcribed}"</Box>
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography sx={{ color: '#4C4F7A', fontSize: 14, mt: 0.5 }}>
                                Em nói: <Box component="span" sx={{ color: '#1E1B4B', fontStyle: 'italic' }}>"{item.transcribed || '—'}"</Box>
                              </Typography>
                            )}
                          </Box>
                          <Typography sx={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: scoreHexColor(item.score) }}>
                            {item.score}%
                          </Typography>
                        </Box>
                        {item.bfaError && (
                          <Typography sx={{ mt: 1, fontSize: 14, fontWeight: 600, color: '#fbbf24' }}>
                            {BFA_ERROR_MESSAGES[item.bfaError] ?? 'Có lỗi — thử lại nhé'}
                          </Typography>
                        )}
                        {!item.bfaError && item.bfa?.success && item.bfa.feedback.length > 0 && (
                          <PhonemeChips feedback={item.bfa.feedback} />
                        )}
                      </Box>
                    ) : (
                      <Box>
                        <Typography sx={{ color: '#6B7280', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', mb: 1 }}>
                          🎤 Speaking{speakHw?.speakingMode === 'FREE_SPEAK' ? ' · Free Speak' : speakHw?.speakingMode === 'SCRIPT_MATCH' ? ' · Script Match' : ''}
                        </Typography>
                        {speakHw?.speakingMode === 'FREE_SPEAK' && item.pictureUrl && (
                          <Box sx={{ borderRadius: 3, overflow: 'hidden', mb: 1.5, maxHeight: 160 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.pictureUrl} alt="Speaking prompt" style={{ width: '100%', objectFit: 'contain' }} />
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            {speakHw?.speakingMode !== 'FREE_SPEAK' && (
                              <Typography sx={{ color: '#1E1B4B', fontWeight: 500, fontSize: 14, mb: 0.5 }}>{item.text}</Typography>
                            )}
                            {item.audioUrl ? (
                              <Box sx={{ mt: 0.5 }}>
                                <AudioPlayer src={item.audioUrl} />
                                {item.transcribed && (
                                  <Typography sx={{ color: '#4C4F7A', fontSize: 12, mt: 0.5 }}>
                                    Em nói: <Box component="span" sx={{ color: '#1E1B4B', fontStyle: 'italic' }}>"{item.transcribed}"</Box>
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography sx={{ color: '#4C4F7A', fontSize: 14 }}>
                                Em nói: <Box component="span" sx={{ color: '#1E1B4B', fontStyle: 'italic' }}>"{item.transcribed || '—'}"</Box>
                              </Typography>
                            )}
                            {speakHw?.speakingMode === 'FREE_SPEAK' && item.matchedWords !== undefined && item.totalWords !== undefined && (
                              <Typography sx={{ color: '#4C4F7A', fontSize: 14, mt: 0.5 }}>
                                Từ khớp: {item.matchedWords}/{item.totalWords}
                              </Typography>
                            )}
                          </Box>
                          <Typography sx={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: 'tabular-nums', flexShrink: 0, color: scoreHexColor(item.score) }}>
                            {item.score}%
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>

              <Button
                onClick={() => router.push('/game/homework')}
                fullWidth
                sx={{
                  py: 2, borderRadius: '16px', color: 'white', fontWeight: 900, fontSize: 19,
                  background: gradients.greenSecondary,
                  '&:hover': { opacity: 0.9, background: gradients.greenSecondary },
                  textTransform: 'none',
                }}
              >
                Về trang chủ
              </Button>
            </Box>
          </Box>
        )}
      </AuthGate>
    );
  }

  const current = pageState === 'playing' ? items[currentIndex] : null;
  const doneCount = items.filter((w) => w.state === 'done').length;

  return (
    <AuthGate requiredRole="STUDENT">
      {() => (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 2, sm: 4 }, py: 2, flexShrink: 0 }}>
            <Button onClick={() => router.push('/game/homework')}
              sx={{ color: '#6B7280', '&:hover': { color: '#1E1B4B' }, fontSize: 14, textTransform: 'none', minWidth: 0 }}>
              ← Quay lại
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {items.map((item, i) => (
                <Box key={i} sx={{
                  height: 8, width: 32, borderRadius: '9999px',
                  transition: 'all 0.15s',
                  background: item.state === 'done' ? '#A78BFA' : i === currentIndex && pageState === 'playing' ? '#FFD166' : '#E5E7EB',
                }} />
              ))}
            </Box>
            <Typography sx={{ color: '#4C4F7A', fontSize: 14, fontWeight: 600 }}>
              {pageState === 'playing' ? `${doneCount + 1} / ${items.length}` : `${items.length} câu`}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, display: 'flex', gap: 3, px: { xs: 2, sm: 4 }, pb: { xs: 3, sm: 4 }, minHeight: 0 }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', maxWidth: { sm: 600, md: 640 }, mx: 'auto' }}>
              {pageState === 'ready' && (
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <Box sx={{ width: 64, height: 64, bgcolor: '#F0EEFF', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <School size={32} color="#1E1B4B" />
                    </Box>
                  </Box>
                  <Typography sx={{ color: '#1E1B4B', fontSize: 30, fontWeight: 900, mb: 1.5 }}>Sẵn sàng chưa?</Typography>
                  <Typography sx={{ color: '#6B7280', fontSize: 14, mb: 5 }}>Đọc to từng từ thật rõ ràng</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mb: 5 }}>
                    {items.map((item, i) => (
                      <Box key={i} component="span" sx={{
                        bgcolor: item.kind === 'speaking' ? 'rgba(167,139,250,0.2)' : 'rgba(79,157,255,0.2)',
                        border: `1.5px solid ${item.kind === 'speaking' ? 'rgba(167,139,250,0.5)' : 'rgba(79,157,255,0.5)'}`,
                        color: '#1E1B4B', fontSize: 15, px: 2, py: 0.875, borderRadius: '10px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 0.75,
                      }}>
                        {item.kind === 'speaking' ? <Mic size={13} style={{ opacity: 0.8 }} /> : <Hash size={13} style={{ opacity: 0.8 }} />}
                        {item.kind === 'speaking'
                          ? `${item.text.slice(0, 32)}${item.text.length > 32 ? '…' : ''}`
                          : item.text}
                      </Box>
                    ))}
                  </Box>
                  <Button
                    onClick={handleStart}
                    sx={{
                      px: 5, py: 2, borderRadius: '16px', color: 'white', fontWeight: 900, fontSize: 20,
                      boxShadow: 8, '&:hover': { transform: 'scale(1.05)' },
                      background: gradients.primaryPurple, textTransform: 'none',
                      transition: 'transform 0.15s',
                    }}
                  >
                    Bắt đầu →
                  </Button>
                </Box>
              )}

              {pageState === 'playing' && current && (
                <Box sx={{ textAlign: 'center', width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <CircleTimer seconds={timeLeft} total={totalTime} />
                  </Box>

                  {current.kind === 'speaking' ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, color: '#6B7280', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
                        <Mic size={16} /> Đọc to
                      </Box>
                      {current.pictureUrl && (
                        <Box sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', maxHeight: 192, maxWidth: 320, mx: 'auto' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={current.pictureUrl} alt="Speaking prompt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </Box>
                      )}
                      <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1E1B4B', mb: 2, lineHeight: 1.6, maxWidth: 512, mx: 'auto' }}>
                        {current.text}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, color: '#6B7280', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
                        <Hash size={16} /> Đọc to âm này
                      </Box>
                      <Typography sx={{ fontSize: 72, fontWeight: 900, color: '#1E1B4B', mb: 2, letterSpacing: '0.1em' }}>
                        {current.text}
                      </Typography>
                    </>
                  )}

                  <Box sx={{ minHeight: 48, mb: 4 }}>
                    {transcript
                      ? <Typography sx={{ color: '#374151', fontSize: 24, fontStyle: 'italic', fontWeight: 500 }}>"{transcript}"</Typography>
                      : <Typography sx={{ color: '#9CA3AF', fontSize: 18 }}>Đang nghe…</Typography>
                    }
                  </Box>

                  <Button
                    onClick={handleSubmitItem}
                    sx={{
                      px: 4, py: 1.5, borderRadius: 3, color: 'white', fontWeight: 700, fontSize: 18,
                      background: gradients.greenSecondary, '&:hover': { transform: 'scale(1.05)', background: gradients.greenSecondary },
                      textTransform: 'none', transition: 'transform 0.15s',
                    }}
                  >
                    Tiếp →
                  </Button>

                  {doneCount > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 4, flexWrap: 'wrap' }}>
                      {items.filter((w) => w.state === 'done').map((item, i) => (
                        <Box key={i} component="span" sx={{
                          fontSize: 12, px: 1.5, py: 0.5, borderRadius: '9999px', fontWeight: 700,
                          background: '#E5E7EB', color: '#4C4F7A',
                          display: 'flex', alignItems: 'center', gap: 0.5,
                        }}>
                          {item.kind === 'phonics' ? <><Hash size={12} /> {item.text}</> : <Mic size={12} />}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </AuthGate>
  );
}
