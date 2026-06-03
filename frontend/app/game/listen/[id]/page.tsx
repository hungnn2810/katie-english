'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { authHeaders } from '@/lib/auth';
import { saveListenResult, completeSession, GameSession, ListenItem, ListenItemResult } from '@/lib/admin-api';
import { gradients, scoreHexColor } from '@/lib/colors';
import { fadeIn } from '@/lib/theme';
import { Mic, CheckCircle2, PartyPopper, Headphones, Play, RotateCcw } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type PageState = 'loading' | 'mic-check' | 'mic-denied' | 'ready' | 'playing' | 'uploading' | 'results' | 'error';
type RecordState = 'idle' | 'recording' | 'recorded' | 'scoring';
type AudioPlayState = 'idle' | 'playing' | 'played';

interface ListenGameItem {
  listenItemId: number;
  audioUrl: string;
  keywords: string;         // JSON array string
  expectedText: string;
  compositeScore: number;   // 0.0–1.0 from API
  semanticScore: number;    // 0.0–1.0
  pronScore: number;        // 0.0–100
  transcript: string;
  matchedKeywords: string[];
  scoreError: string | null;
  recordState: RecordState;
}

const SCORE_ERROR_MESSAGES: Record<string, string> = {
  audio_too_short:     'Bấm lâu hơn nhé — ghi âm quá ngắn',
  audio_too_long:      'Ghi âm quá dài — nói dưới 15 giây',
  recording_too_noisy: 'Mic quá ồn — tìm chỗ yên tĩnh hơn',
  speech_not_detected: 'Không nghe rõ — nói to hơn nhé',
  wrong_language:      'Please speak in English',
};

function pickAudioMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

async function fetchSession(id: number): Promise<GameSession> {
  const res = await fetch(`${API_URL}/game/session/${id}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

function buildItems(session: GameSession): ListenGameItem[] {
  const hw = session.assignment?.homework;
  const listenItems: ListenItem[] =
    (session.listenItems ?? (hw as any)?.listenItems ?? []).slice().sort((a: ListenItem, b: ListenItem) => a.order - b.order);
  return listenItems.map((li) => ({
    listenItemId: li.id,
    audioUrl: li.audioUrl,
    keywords: li.keywords,
    expectedText: li.expectedText,
    compositeScore: 0,
    semanticScore: 0,
    pronScore: 0,
    transcript: '',
    matchedKeywords: [],
    scoreError: null,
    recordState: 'idle' as RecordState,
  }));
}

export default function ListenGamePage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [items, setItems] = useState<ListenGameItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameSession | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [audioPlayState, setAudioPlayState] = useState<AudioPlayState>('idle');

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const itemsRef = useRef<ListenGameItem[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { itemsRef.current = items; }, [items]);

  // Load session on mount
  useEffect(() => {
    fetchSession(sessionId)
      .then((session) => {
        const built = buildItems(session);
        if (built.length === 0) {
          setPageState('error');
          return;
        }
        setItems(built);
        requestMic();
      })
      .catch(() => setPageState('error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function requestMic() {
    setPageState('mic-check');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPageState('ready');
    } catch {
      setPageState('mic-denied');
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = pickAudioMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start(100);
    recorderRef.current = recorder;
    setItems((prev) => prev.map((item, i) => i === currentIndex ? { ...item, recordState: 'recording' } : item));
  }

  function stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(null); return; }
      recorderRef.current = null;
      const chunks = [...chunksRef.current];
      const guard = setTimeout(() => {
        resolve(chunks.length > 0 ? new Blob(chunks, { type: chunks[0].type || 'audio/webm' }) : null);
      }, 2000);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        clearTimeout(guard);
        resolve(chunks.length > 0 ? new Blob(chunks, { type: chunks[0].type || 'audio/webm' }) : null);
      };
      try { recorder.stop(); } catch {
        clearTimeout(guard);
        resolve(chunks.length > 0 ? new Blob(chunks, { type: chunks[0].type || 'audio/webm' }) : null);
      }
    });
  }

  // Auto-play audio prompt when item changes (D-08)
  useEffect(() => {
    if (pageState !== 'playing') return;
    setAudioPlayState('idle');
    const audio = audioRef.current;
    if (!audio) return;
    const current = itemsRef.current[currentIndex];
    if (!current) return;
    audio.src = current.audioUrl;
    audio.load();
    setAudioPlayState('playing');
    audio.play().catch(() => {
      // Browser may block autoplay — fall back to idle state so student can tap Play
      setAudioPlayState('idle');
    });
    audio.onended = () => setAudioPlayState('played');
  }, [currentIndex, pageState]);

  const handleStopAndScore = useCallback(async () => {
    const capturedIndex = currentIndex;
    setItems((prev) => prev.map((item, i) => i === capturedIndex ? { ...item, recordState: 'scoring' } : item));
    const blob = await stopRecording();
    const item = itemsRef.current[capturedIndex];
    if (!item) return;
    try {
      const result: ListenItemResult = await saveListenResult(sessionId, item.listenItemId, blob ?? undefined);
      const scoreError = (result as any).error ?? null;
      // Parse matched keywords from item keywords list, matched against transcript
      let matchedKeywords: string[] = [];
      try {
        let kwArr: string[] = [];
        try { kwArr = JSON.parse(item.keywords); } catch { /* ignore */ }
        // Show keywords where student transcript contains them (word-boundary match)
        matchedKeywords = result.semanticScore >= 0.2 ? kwArr.filter((kw) =>
          new RegExp('\\b' + kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(result.transcript.toLowerCase())
        ) : [];
      } catch { /* ignore */ }
      setItems((prev) => prev.map((it, i) => i === capturedIndex ? {
        ...it,
        compositeScore: result.compositeScore,
        semanticScore: result.semanticScore,
        pronScore: result.pronScore,
        transcript: result.transcript,
        matchedKeywords,
        scoreError,
        recordState: 'recorded',
      } : it));
    } catch {
      setSaveError(true);
      setItems((prev) => prev.map((it, i) => i === capturedIndex ? { ...it, recordState: 'recorded', scoreError: 'speech_not_detected' } : it));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, sessionId]);

  async function handleNext() {
    const next = currentIndex + 1;
    if (next < items.length) {
      setAudioPlayState('idle');
      setCurrentIndex(next);
      setItems((prev) => prev.map((item, i) => i === next ? { ...item, recordState: 'idle' } : item));
    } else {
      // Last item done — stop mic, go to uploading, then complete session
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setPageState('uploading');
      try {
        const session = await completeSession(sessionId);
        setResults(session);
        setPageState('results');
      } catch {
        setSaveError(true);
        setPageState('results');
      }
    }
  }

  function handleReRecord() {
    setItems((prev) => prev.map((item, i) => i === currentIndex ? {
      ...item,
      recordState: 'idle',
      compositeScore: 0,
      semanticScore: 0,
      pronScore: 0,
      transcript: '',
      matchedKeywords: [],
      scoreError: null,
    } : item));
  }

  // Cleanup on unmount
  useEffect(() => () => {
    if (recorderRef.current?.state !== 'inactive') {
      try { recorderRef.current?.stop(); } catch {}
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  // ── Loading / mic-check ────────────────────────────────────────────────────
  if (pageState === 'loading' || pageState === 'mic-check') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: gradients.gameBg }}>
            <CircularProgress size={48} sx={{ color: 'rgba(255,255,255,0.7)' }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              {pageState === 'mic-check' ? 'Requesting microphone access…' : 'Loading…'}
            </Typography>
          </Box>
        )}
      </AuthGate>
    );
  }

  // ── Mic denied ─────────────────────────────────────────────────────────────
  if (pageState === 'mic-denied') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, px: 4, background: gradients.gameBg }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={32} color="white" />
              </Box>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: 'white', fontSize: 24, fontWeight: 700, mb: 1 }}>Microphone Required</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, maxWidth: 384 }}>
                Microphone access is required. Please allow access and reload.
              </Typography>
            </Box>
            <Button
              onClick={requestMic}
              sx={{ px: 3, py: 1.5, borderRadius: 3, color: 'white', fontWeight: 700, background: gradients.pinkHighlight, '&:hover': { opacity: 0.9, background: gradients.pinkHighlight }, textTransform: 'none' }}
            >
              Try Again
            </Button>
            <Button
              onClick={() => router.push('/game/homework')}
              sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' }, fontSize: 14, textTransform: 'none', minWidth: 0 }}
            >
              ← Back to Homework
            </Button>
          </Box>
        )}
      </AuthGate>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: gradients.gameBg }}>
            <Typography sx={{ color: '#FF7B7B', fontSize: 18, fontWeight: 700 }}>Session not found. Please go back and try again.</Typography>
            <Button onClick={() => router.push('/game/homework')}
              sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' }, fontSize: 14, textTransform: 'none', minWidth: 0 }}>
              ← Back to Homework
            </Button>
          </Box>
        )}
      </AuthGate>
    );
  }

  // ── Uploading ─────────────────────────────────────────────────────────────
  if (pageState === 'uploading') {
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: gradients.gameBg }}>
            <CircularProgress size={48} sx={{ color: '#FFD166' }} />
            <Typography sx={{ color: '#FFD166', fontWeight: 600 }}>Scoring and saving…</Typography>
          </Box>
        )}
      </AuthGate>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (pageState === 'results') {
    const finalScore = results?.score ?? (items.length > 0
      ? Math.round(items.reduce((s, it) => s + it.compositeScore * 100, 0) / items.length)
      : 0);
    const scoreColor = scoreHexColor(finalScore);
    return (
      <AuthGate requiredRole="STUDENT">
        {() => (
          <Box sx={{ minHeight: '100vh', py: 6, px: 4, background: gradients.gameBg }}>
            <Box sx={{ maxWidth: 560, mx: 'auto' }}>
              <Box sx={{ textAlign: 'center', mb: 5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Box sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PartyPopper size={32} color="white" />
                  </Box>
                </Box>
                <Typography sx={{ color: 'white', fontSize: 30, fontWeight: 700, mb: 1 }}>Homework Complete!</Typography>
                <Typography sx={{ fontSize: 72, fontWeight: 700, mt: 2, color: scoreColor, fontVariantNumeric: 'tabular-nums' }}>
                  {finalScore}%
                </Typography>
                {saveError
                  ? <Typography sx={{ color: '#f87171', mt: 0.5, fontSize: 14 }}>Recording could not be saved</Typography>
                  : <Typography sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5, fontSize: 14 }}>Your recording has been saved</Typography>
                }
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
                {items.map((item, idx) => (
                  <Box key={idx} sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, px: 2.5, py: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {/* Row 1: Question label + composite score */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Headphones size={24} color="rgba(255,255,255,0.5)" />
                          <Typography sx={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                            Question {idx + 1}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: scoreHexColor(Math.round(item.compositeScore * 100)) }}>
                          {Math.round(item.compositeScore * 100)}%
                        </Typography>
                      </Box>
                      {/* Row 2: Transcript */}
                      {item.transcript && (
                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontStyle: 'italic' }}>
                          &quot;{item.transcript}&quot;
                        </Typography>
                      )}
                      {/* Row 3: Matched keyword chips */}
                      {item.matchedKeywords.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {item.matchedKeywords.map((kw) => (
                            <Chip key={kw} label={kw} size="small" sx={{ bgcolor: 'rgba(52,211,153,0.2)', color: '#34d399', fontWeight: 700, border: 0 }} />
                          ))}
                        </Box>
                      )}
                      {/* Row 4: Error state */}
                      {item.scoreError && (
                        <Typography sx={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
                          {item.semanticScore < 0.2 ? 'hãy thử lại, nghe kỹ câu hỏi nhé' : (SCORE_ERROR_MESSAGES[item.scoreError] ?? 'Có lỗi')}
                        </Typography>
                      )}
                      {/* Row 5: Score breakdown */}
                      <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        Semantic: {Math.round(item.semanticScore * 100)}% · Pronunciation: {Math.round(item.pronScore)}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              <Button
                onClick={() => router.push('/game/homework')}
                fullWidth
                sx={{
                  py: 2, borderRadius: 3, color: 'white', fontWeight: 700, fontSize: 18,
                  background: gradients.primaryPurple,
                  '&:hover': { opacity: 0.9, background: gradients.primaryPurple },
                  textTransform: 'none',
                }}
              >
                Finish
              </Button>
            </Box>
          </Box>
        )}
      </AuthGate>
    );
  }

  // ── Ready / Playing ───────────────────────────────────────────────────────
  const current = items[currentIndex];
  const isLastItem = currentIndex === items.length - 1;
  const isScored = current?.recordState === 'recorded';
  const isScoring = current?.recordState === 'scoring';

  return (
    <AuthGate requiredRole="STUDENT">
      {() => (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: gradients.gameBg, px: 3, py: 4, gap: 3 }}>

          {/* Hidden audio element for prompt playback */}
          <audio ref={audioRef} style={{ display: 'none' }} />

          {/* Progress header */}
          <Box sx={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {items.map((_, i) => (
                <Box key={i} sx={{
                  height: 8, width: 32, borderRadius: '9999px',
                  transition: 'all 0.15s',
                  background: i < currentIndex ? '#ffffff80' : i === currentIndex && pageState === 'playing' ? '#A78BFA' : '#ffffff20',
                }} />
              ))}
            </Box>
            {pageState === 'playing' && (
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600 }}>
                {currentIndex + 1} / {items.length}
              </Typography>
            )}
          </Box>

          {/* Ready state */}
          {pageState === 'ready' && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 3, maxWidth: 480, width: '100%' }}>
              <Typography sx={{ color: 'white', fontSize: 30, fontWeight: 700 }}>Ready?</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>
                Listen to each question, then record your answer
              </Typography>
              <Button
                onClick={() => setPageState('playing')}
                sx={{
                  px: 5, py: 2, borderRadius: 3, color: 'white', fontWeight: 700, fontSize: 20,
                  background: gradients.primaryPurple,
                  '&:hover': { opacity: 0.9, background: gradients.primaryPurple },
                  textTransform: 'none',
                }}
              >
                Start
              </Button>
            </Box>
          )}

          {/* Playing state */}
          {pageState === 'playing' && current && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, maxWidth: 480, width: '100%' }}>

              {/* Audio prompt player */}
              <Box sx={{
                width: '100%', maxWidth: 480,
                bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, p: 2,
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                <Headphones size={28} color="white" style={{ flexShrink: 0 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 700, flex: 1 }}>
                  Question {currentIndex + 1}
                </Typography>
                {/* Play/Replay button */}
                <Box
                  component="button"
                  aria-label={audioPlayState === 'idle' ? 'Play question' : 'Replay'}
                  onClick={() => {
                    const audio = audioRef.current;
                    if (!audio) return;
                    setAudioPlayState('playing');
                    audio.currentTime = 0;
                    audio.play().catch(() => setAudioPlayState('idle'));
                    audio.onended = () => setAudioPlayState('played');
                  }}
                  disabled={audioPlayState === 'playing'}
                  sx={{
                    width: 56, height: 56, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.1)',
                    cursor: audioPlayState === 'playing' ? 'default' : 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {audioPlayState === 'playing'
                    ? <CircularProgress size={24} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                    : audioPlayState === 'played'
                    ? <RotateCcw size={20} color="white" />
                    : <Play size={24} color="white" />}
                </Box>
              </Box>

              {/* Record button */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                {current.recordState === 'idle' && (
                  <>
                    <Box
                      component="button"
                      aria-label="Start recording"
                      onClick={startRecording}
                      sx={{
                        width: 96, height: 96, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '4px solid rgba(255,255,255,0.3)',
                        background: 'rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: 'rgba(255,255,255,0.6)', transform: 'scale(1.05)' },
                      }}
                    >
                      <Mic size={40} color="white" />
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Tap to record</Typography>
                  </>
                )}

                {current.recordState === 'recording' && (
                  <>
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* Ping ring animation */}
                      <Box sx={{
                        position: 'absolute',
                        width: 96, height: 96, borderRadius: '50%',
                        background: '#ef4444', opacity: 0.25,
                        animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
                        '@keyframes ping': { '75%,100%': { transform: 'scale(2)', opacity: 0 } },
                      }} />
                      <Box
                        component="button"
                        aria-label="Stop recording"
                        onClick={handleStopAndScore}
                        sx={{
                          position: 'relative',
                          width: 96, height: 96, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '4px solid #ef4444',
                          background: 'rgba(239,68,68,0.2)',
                          cursor: 'pointer',
                        }}
                      >
                        <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: '#f87171' }} />
                      </Box>
                    </Box>
                    <Typography sx={{ color: '#f87171', fontSize: 14, fontWeight: 600 }}>Recording… tap to stop</Typography>
                  </>
                )}

                {current.recordState === 'scoring' && (
                  <>
                    <Box sx={{
                      width: 96, height: 96, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '4px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                    }}>
                      <CircularProgress size={40} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Scoring…</Typography>
                  </>
                )}

                {current.recordState === 'recorded' && (
                  <>
                    <Box sx={{
                      width: 96, height: 96, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '4px solid rgba(52,211,153,0.5)',
                      background: 'rgba(52,211,153,0.15)',
                    }}>
                      <CheckCircle2 size={40} color="#34d399" />
                    </Box>
                  </>
                )}
              </Box>

              {/* Feedback zone (visible when recorded) */}
              {current.recordState === 'recorded' && (
                <Box sx={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* D-09: semantic error banner */}
                  {current.semanticScore < 0.2 && (
                    <Box sx={{
                      bgcolor: 'rgba(251,191,36,0.15)', border: '1px solid #fbbf24',
                      borderRadius: 2, px: 2, py: 1,
                    }}>
                      <Typography sx={{ color: '#fbbf24', fontSize: 14, fontWeight: 600 }}>
                        hãy thử lại, nghe kỹ câu hỏi nhé
                      </Typography>
                    </Box>
                  )}
                  {/* BFA/score error (not semantic threshold) */}
                  {current.scoreError && current.semanticScore >= 0.2 && (
                    <Typography sx={{ color: '#fbbf24', fontSize: 14, fontWeight: 600 }}>
                      {SCORE_ERROR_MESSAGES[current.scoreError] ?? 'Có lỗi — thử lại nhé'}
                    </Typography>
                  )}
                  {/* Transcript */}
                  {current.transcript && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, fontStyle: 'italic' }}>
                      Bạn nói: &quot;{current.transcript}&quot;
                    </Typography>
                  )}
                  {/* Matched keywords chips */}
                  {current.matchedKeywords.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, animation: `${fadeIn} 0.3s ease` }}>
                      {current.matchedKeywords.map((kw) => (
                        <Chip
                          key={kw}
                          label={kw}
                          size="small"
                          sx={{ bgcolor: 'rgba(52,211,153,0.2)', color: '#34d399', fontWeight: 700, border: 0 }}
                        />
                      ))}
                    </Box>
                  )}
                  {/* Composite score */}
                  <Typography sx={{
                    fontSize: 48, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: scoreHexColor(Math.round(current.compositeScore * 100)),
                  }}>
                    {Math.round(current.compositeScore * 100)}%
                  </Typography>
                </Box>
              )}

              {/* Action buttons */}
              {isScored && !isScoring && (
                current.scoreError ? (
                  <Button
                    onClick={handleReRecord}
                    sx={{
                      px: 4, py: 1.5, borderRadius: 3, color: 'white', fontWeight: 700, fontSize: 16,
                      border: '1px solid rgba(255,255,255,0.3)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                      textTransform: 'none',
                    }}
                  >
                    Try Again
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    sx={{
                      px: 4, py: 1.5, borderRadius: 3, color: 'white', fontWeight: 700, fontSize: 18,
                      background: gradients.greenSecondary,
                      '&:hover': { transform: 'scale(1.05)', background: gradients.greenSecondary },
                      textTransform: 'none',
                      transition: 'transform 0.15s',
                    }}
                  >
                    {isLastItem ? 'View Results' : 'Next →'}
                  </Button>
                )
              )}
            </Box>
          )}
        </Box>
      )}
    </AuthGate>
  );
}
