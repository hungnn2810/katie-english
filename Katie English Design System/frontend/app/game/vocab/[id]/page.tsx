'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { authHeaders } from '@/lib/auth';
import { saveVocabResult, completeSession, GameSession, BfaResult, VocabItem, PhonemeOp } from '@/lib/admin-api';
import { gradients, scoreHexColor } from '@/lib/colors';
import PhonemeChips from '@/app/game/session/[id]/_components/PhonemeChips';
import { shake, fadeIn } from '@/lib/theme';
import { Mic, CheckCircle2, PartyPopper } from 'lucide-react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type PageState = 'loading' | 'mic-check' | 'mic-denied' | 'ready' | 'playing' | 'uploading' | 'results' | 'error';
type RecordState = 'idle' | 'recording' | 'recorded' | 'scoring';

interface VocabGameItem {
  vocabItemId: number;
  imageUrl: string;
  word: string;
  score: number;
  bfa: BfaResult | null;
  bfaError: string | null;
  recordState: RecordState;
  feedback: PhonemeOp[];
}

const BFA_ERROR_MESSAGES: Record<string, string> = {
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

function buildItems(session: GameSession): VocabGameItem[] {
  // vocabItems may be on the session directly or via assignment.homework
  const hw = session.assignment?.homework;
  const vocabItems: VocabItem[] =
    (session.vocabItems ?? hw?.vocabItems ?? []).slice().sort((a, b) => a.order - b.order);
  return vocabItems.map((v) => ({
    vocabItemId: v.id,
    imageUrl: v.imageUrl,
    word: v.word,
    score: 0,
    bfa: null,
    bfaError: null,
    recordState: 'idle',
    feedback: [],
  }));
}

export default function VocabGamePage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [items, setItems] = useState<VocabGameItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameSession | null>(null);
  const [saveError, setSaveError] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const itemsRef = useRef<VocabGameItem[]>([]);

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

  const handleStopAndScore = useCallback(async () => {
    const capturedIndex = currentIndex;  // capture synchronously before any await
    setItems((prev) => prev.map((item, i) => i === capturedIndex ? { ...item, recordState: 'scoring' } : item));
    const blob = await stopRecording();
    const item = itemsRef.current[capturedIndex];
    if (!item) return;
    try {
      const result = await saveVocabResult(sessionId, item.vocabItemId, blob ?? undefined);
      const bfa = result.bfa ?? null;
      const bfaError = bfa?.error ?? null;
      const score = bfaError ? 0 : result.score;
      const feedback = bfa?.feedback ?? [];
      setItems((prev) => prev.map((it, i) => i === capturedIndex ? {
        ...it,
        score,
        bfa,
        bfaError,
        feedback,
        recordState: 'recorded',
      } : it));
    } catch {
      setSaveError(true);
      setItems((prev) => prev.map((it, i) => i === capturedIndex ? { ...it, recordState: 'recorded', bfaError: 'speech_not_detected' } : it));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, sessionId]);

  async function handleNext() {
    const next = currentIndex + 1;
    if (next < items.length) {
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
      bfa: null,
      bfaError: null,
      score: 0,
      feedback: [],
    } : item));
  }

  // Cleanup on unmount
  useEffect(() => () => {
    if (recorderRef.current?.state !== 'inactive') {
      try { recorderRef.current?.stop(); } catch {}
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
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
            <Typography sx={{ color: '#FF7B7B', fontSize: 18, fontWeight: 700 }}>Session not found.</Typography>
            <Button onClick={() => router.push('/game/homework')}
              sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' }, fontSize: 14, textTransform: 'none', minWidth: 0 }}>
              ← Back
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
      ? Math.round(items.reduce((s, it) => s + it.score, 0) / items.length)
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Image thumbnail */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.word}
                        style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}
                      />
                      {/* Word + chips */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{item.word}</Typography>
                        {item.bfaError && (
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', mt: 0.5 }}>
                            {BFA_ERROR_MESSAGES[item.bfaError] ?? 'Có lỗi — thử lại nhé'}
                          </Typography>
                        )}
                        {!item.bfaError && item.feedback.length > 0 && (
                          <PhonemeChips feedback={item.feedback} />
                        )}
                      </Box>
                      {/* Score */}
                      <Typography sx={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0, color: scoreHexColor(item.score) }}>
                        {item.score}%
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
                  background: gradients.greenSecondary,
                  '&:hover': { opacity: 0.9, background: gradients.greenSecondary },
                  textTransform: 'none',
                }}
              >
                Finish Session
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
  const isBfaError = current?.bfaError != null;
  const isScored = current?.recordState === 'recorded';
  const isScoring = current?.recordState === 'scoring';

  return (
    <AuthGate requiredRole="STUDENT">
      {() => (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: gradients.gameBg, px: 3, py: 4, gap: 3 }}>

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
                Look at each image and say the word
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
                Start Recording
              </Button>
            </Box>
          )}

          {/* Playing state */}
          {pageState === 'playing' && current && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, maxWidth: 480, width: '100%' }}>

              {/* Image card — shake on BFA error */}
              <Box sx={{
                width: 280, height: 280,
                border: '4px solid rgba(255,255,255,0.2)',
                borderRadius: '16px',
                overflow: 'hidden',
                flexShrink: 0,
                animation: isBfaError ? `${shake} 0.4s` : undefined,
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.imageUrl}
                  alt={current.word}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>

              {/* Word hint chip — always visible */}
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.10)',
                color: 'white',
                fontSize: 16,
                fontWeight: 700,
                px: 2,
                py: 0.75,
                borderRadius: '999px',
              }}>
                {current.word}
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

              {/* BFA error message */}
              {isBfaError && isScored && (
                <Typography sx={{ color: '#fbbf24', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
                  {BFA_ERROR_MESSAGES[current.bfaError!] ?? 'Có lỗi — thử lại nhé'}
                </Typography>
              )}

              {/* Phoneme chips — fadeIn on reveal */}
              {isScored && !isBfaError && current.feedback.length > 0 && (
                <Box sx={{ animation: `${fadeIn} 0.3s ease` }}>
                  <PhonemeChips feedback={current.feedback} />
                </Box>
              )}

              {/* Action buttons */}
              {isScored && !isScoring && (
                isBfaError ? (
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
