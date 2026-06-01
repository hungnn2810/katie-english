'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import AuthGate from '@/components/AuthGate';
import {
  getHomework,
  trySpeakingHomework,
  tryPhonicsHomework,
  SpeakingMode,
  HomeworkDetail,
  HomeworkWord,
  ReadingActivity,
  MatchPair,
  FillBlank,
  FillBlankChoice,
  PhonemeOp,
} from '@/lib/admin-api';
import { gradients, scoreHexColor } from '@/lib/colors';
import { shake } from '@/lib/theme';
import { Check, ImageIcon } from 'lucide-react';

// ── Shared helpers ─────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function PreviewBanner() {
  return (
    <Box sx={{
      bgcolor: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 3,
      px: 2,
      py: 1,
      textAlign: 'center',
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    }}>
      Preview Mode — Results not saved
    </Box>
  );
}

// ── Reading activity types (local, mirrors game page) ─────────────────────────

type MatchPairState = { pair: MatchPair; status: 'idle' | 'shaking' | 'locked' };
type FillBlankItemState = { blank: FillBlank; chosenChoiceId: number | null; correct: boolean | null };
type ActivityState =
  | { type: 'MATCH'; activityId: number; pairs: MatchPairState[]; shuffledWords: number[]; selectedImageId: number | null; complete: boolean }
  | { type: 'FILL_BLANK'; activityId: number; items: FillBlankItemState[]; currentItemIndex: number; complete: boolean };

// ── Reading renderers ──────────────────────────────────────────────────────────

function MatchingRenderer({
  state,
  setState,
  onComplete,
}: {
  state: Extract<ActivityState, { type: 'MATCH' }>;
  setState: (u: (p: ActivityState) => ActivityState) => void;
  onComplete: () => void;
}) {
  const lockedCount = state.pairs.filter((p) => p.status === 'locked').length;

  useEffect(() => {
    if (lockedCount === state.pairs.length && state.pairs.length > 0 && !state.complete) {
      const t = setTimeout(() => { setState((p) => ({ ...p, complete: true })); onComplete(); }, 500);
      return () => clearTimeout(t);
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
    if (sel === wordPairId) {
      setState((prev) => {
        if (prev.type !== 'MATCH') return prev;
        return { ...prev, selectedImageId: null, pairs: prev.pairs.map((p) => p.pair.id === wordPairId ? { ...p, status: 'locked' } : p) };
      });
    } else {
      setState((prev) => {
        if (prev.type !== 'MATCH') return prev;
        return { ...prev, pairs: prev.pairs.map((p) => p.pair.id === sel || p.pair.id === wordPairId ? { ...p, status: 'shaking' } : p) };
      });
      setTimeout(() => {
        setState((prev) => {
          if (prev.type !== 'MATCH') return prev;
          return { ...prev, selectedImageId: null, pairs: prev.pairs.map((p) => (p.pair.id === sel || p.pair.id === wordPairId) && p.status === 'shaking' ? { ...p, status: 'idle' } : p) };
        });
      }, 400);
    }
  }

  return (
    <Box sx={{ maxWidth: 752, mx: 'auto', width: '100%' }}>
      <Box sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 4, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <ImageIcon style={{ width: 16, height: 16 }} />Match each image to its word
      </Box>
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mb: 4 }}>
        {state.pairs.map((p) => {
          const isSelected = state.selectedImageId === p.pair.id;
          const isLocked = p.status === 'locked';
          const isShaking = p.status === 'shaking';
          return (
            <Box
              key={p.pair.id}
              component="button"
              onClick={() => handleImageClick(p.pair.id)}
              disabled={isLocked}
              sx={{
                position: 'relative',
                width: 112,
                height: 112,
                borderRadius: 4,
                overflow: 'hidden',
                cursor: isLocked ? 'default' : 'pointer',
                border: '4px solid',
                borderColor: isLocked ? '#7BD88F' : isShaking ? '#FF7B7B' : isSelected ? '#4F9DFF' : 'rgba(255,255,255,0.2)',
                bgcolor: isLocked ? 'rgba(123,216,143,0.2)' : isSelected ? 'transparent' : 'rgba(255,255,255,0.1)',
                transform: isSelected && !isLocked ? 'scale(1.05)' : 'none',
                animation: isShaking ? `${shake} 0.4s ease-in-out` : 'none',
                transition: 'all 0.2s',
                p: 0,
                background: 'none',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.pair.imageUrl} alt={p.pair.word} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {isLocked && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(123,216,143,0.3)' }}>
                  <Check style={{ width: 24, height: 24, color: '#7BD88F' }} />
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
        {state.shuffledWords.map((pairId) => {
          const p = state.pairs.find((x) => x.pair.id === pairId);
          if (!p) return null;
          const isLocked = p.status === 'locked';
          const isShaking = p.status === 'shaking';
          return (
            <Box
              key={pairId}
              component="button"
              onClick={() => handleWordClick(pairId)}
              disabled={isLocked}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: '9999px',
                fontSize: 14,
                fontWeight: 700,
                border: '2px solid',
                borderColor: isLocked ? '#7BD88F' : isShaking ? '#FF7B7B' : 'rgba(255,255,255,0.2)',
                color: isLocked ? '#7BD88F' : 'white',
                bgcolor: isLocked ? 'rgba(123,216,143,0.2)' : 'rgba(255,255,255,0.1)',
                cursor: isLocked ? 'default' : 'pointer',
                animation: isShaking ? `${shake} 0.4s ease-in-out` : 'none',
                transition: 'all 0.2s',
                '&:hover': isLocked ? {} : { bgcolor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' },
                background: 'none',
              }}
            >
              {p.pair.word}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function FillBlankRenderer({
  state,
  setState,
  onComplete,
}: {
  state: Extract<ActivityState, { type: 'FILL_BLANK' }>;
  setState: (u: (p: ActivityState) => ActivityState) => void;
  onComplete: () => void;
}) {
  const isFinished = state.currentItemIndex >= state.items.length;
  useEffect(() => {
    if (isFinished && !state.complete) {
      setState((p) => p.type === 'FILL_BLANK' ? { ...p, complete: true } : p);
      onComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, state.complete]);

  const currentItem = state.items[state.currentItemIndex];

  function handleChoiceClick(choice: FillBlankChoice) {
    if (!currentItem || currentItem.chosenChoiceId !== null) return;
    setState((prev) => {
      if (prev.type !== 'FILL_BLANK') return prev;
      return { ...prev, items: prev.items.map((it, i) => i === prev.currentItemIndex ? { ...it, chosenChoiceId: choice.id, correct: choice.isCorrect } : it) };
    });
    setTimeout(() => {
      setState((prev) => prev.type === 'FILL_BLANK' ? { ...prev, currentItemIndex: prev.currentItemIndex + 1 } : prev);
    }, 400);
  }

  if (!currentItem) return null;
  const parts = currentItem.blank.sentence.split('___');

  return (
    <Box sx={{ maxWidth: 576, mx: 'auto', width: '100%' }}>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
        {state.items.map((it, i) => (
          <Box key={i} sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            transition: 'all 0.2s',
            background: it.correct === true ? '#7BD88F' : it.correct === false ? '#FF7B7B' : i === state.currentItemIndex ? '#FFD166' : 'rgba(255,255,255,0.2)',
          }} />
        ))}
      </Box>
      <Box sx={{ textAlign: 'center', mb: 4, lineHeight: 2 }}>
        {parts.flatMap((part, idx, arr) =>
          idx < arr.length - 1
            ? [
                <Typography key={`t${idx}`} component="span" sx={{ color: 'white', fontSize: 24, fontWeight: 900 }}>{part}</Typography>,
                <Box key={`b${idx}`} component="span" sx={{ display: 'inline-block', width: 96, height: 32, borderRadius: 2, border: '2px solid rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.1)', verticalAlign: 'middle', mx: 0.5 }} />,
              ]
            : [<Typography key={`t${idx}`} component="span" sx={{ color: 'white', fontSize: 24, fontWeight: 900 }}>{part}</Typography>]
        )}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
        {currentItem.blank.choices.map((c) => {
          const isChosen = currentItem.chosenChoiceId === c.id;
          const answered = currentItem.chosenChoiceId !== null;
          const isCorrect = isChosen && currentItem.correct === true;
          const isWrong = isChosen && currentItem.correct === false;
          const isOther = answered && !isChosen;
          return (
            <Box
              key={c.id}
              component="button"
              onClick={() => handleChoiceClick(c)}
              disabled={answered}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: '9999px',
                fontSize: 14,
                fontWeight: 700,
                border: '2px solid',
                borderColor: isCorrect ? '#7BD88F' : isWrong ? '#FF7B7B' : 'rgba(255,255,255,0.2)',
                color: isCorrect ? '#7BD88F' : 'white',
                bgcolor: isCorrect ? 'rgba(123,216,143,0.2)' : 'rgba(255,255,255,0.1)',
                opacity: isOther ? 0.4 : 1,
                cursor: answered ? 'not-allowed' : 'pointer',
                animation: isWrong ? `${shake} 0.4s ease-in-out` : 'none',
                transition: 'all 0.2s',
                '&:hover': answered ? {} : { bgcolor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' },
                background: 'none',
              }}
            >
              {c.word}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Phonics result display ─────────────────────────────────────────────────────

function PhonemeTag({ op }: { op: PhonemeOp }) {
  const colorMap: Record<string, { bgcolor: string; color: string; borderColor: string }> = {
    correct:     { bgcolor: 'rgba(34,197,94,0.2)',   color: '#86efac', borderColor: 'rgba(34,197,94,0.4)' },
    similar:     { bgcolor: 'rgba(234,179,8,0.2)',   color: '#fde047', borderColor: 'rgba(234,179,8,0.4)' },
    substituted: { bgcolor: 'rgba(249,115,22,0.2)',  color: '#fdba74', borderColor: 'rgba(249,115,22,0.4)' },
    missing:     { bgcolor: 'rgba(239,68,68,0.2)',   color: '#fca5a5', borderColor: 'rgba(239,68,68,0.4)' },
    extra:       { bgcolor: 'rgba(168,85,247,0.2)',  color: '#d8b4fe', borderColor: 'rgba(168,85,247,0.4)' },
    error:       { bgcolor: 'rgba(107,114,128,0.2)', color: '#d1d5db', borderColor: 'rgba(107,114,128,0.4)' },
  };
  const c = colorMap[op.status] ?? colorMap.error;
  const label = op.expected ?? op.aligned ?? '?';
  return (
    <Box component="span" sx={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      px: 1,
      py: 0.5,
      borderRadius: 2,
      border: '1px solid',
      borderColor: c.borderColor,
      bgcolor: c.bgcolor,
      color: c.color,
      fontSize: 12,
      fontWeight: 700,
      gap: 0.25,
    }}>
      <span>{label}</span>
      <span style={{ fontSize: 9, opacity: 0.6, textTransform: 'capitalize' }}>{op.status}</span>
    </Box>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type RecordState = 'idle' | 'recording' | 'recorded';

function pickAudioMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

type PageState =
  | 'loading'
  // Speaking states
  | 'speak_upload' | 'speak_uploading' | 'speak_results'
  // Phonics states
  | 'phonics_word_select' | 'phonics_upload' | 'phonics_uploading' | 'phonics_results'
  // Reading states
  | 'reading_playing' | 'reading_done'
  | 'error';

export default function TeacherTryHomeworkPage() {
  const { id } = useParams<{ id: string }>();
  const hwId = Number(id);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [hw, setHw] = useState<HomeworkDetail | null>(null);

  // Speaking record
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const speakStreamRef = useRef<MediaStream | null>(null);
  const speakRecorderRef = useRef<MediaRecorder | null>(null);
  const speakChunksRef = useRef<Blob[]>([]);
  const speakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [speakResult, setSpeakResult] = useState<{
    score: number; matchedWords: number; totalWords: number;
    transcribedText: string; speakingMode: SpeakingMode | null; speakingPictureUrl: string | null;
  } | null>(null);

  // Phonics
  const [selectedWord, setSelectedWord] = useState<HomeworkWord | null>(null);
  const [phonicsFile, setPhonicsFile] = useState<File | null>(null);
  const [phonicsResult, setPhonicsResult] = useState<{
    score: number; transcribedText: string; wordText: string;
    bfa: { success: boolean; score: number; feedback: PhonemeOp[]; espeak_fallback?: boolean } | null;
  } | null>(null);

  // Reading
  const [activityStates, setActivityStates] = useState<ActivityState[]>([]);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);

  useEffect(() => {
    getHomework(hwId)
      .then((h) => {
        setHw(h);
        if (h.type === 'SPEAKING') {
          setPageState('speak_upload');
        } else if (h.type === 'PHONICS') {
          setPageState('phonics_word_select');
        } else if (h.type === 'READING') {
          const acts = (h.readingActivities ?? []).filter(
            (a: ReadingActivity) => (a.matchPairs?.length ?? 0) > 0 || (a.fillBlanks?.length ?? 0) > 0
          );
          const initial: ActivityState[] = acts.map((a: ReadingActivity) => {
            if (a.type === 'MATCH') {
              const pairs = (a.matchPairs ?? []).map((p: MatchPair) => ({ pair: p, status: 'idle' as const }));
              return { type: 'MATCH' as const, activityId: a.id, pairs, shuffledWords: shuffle(pairs.map((p) => p.pair.id)), selectedImageId: null, complete: false };
            }
            const items = (a.fillBlanks ?? []).map((b: FillBlank) => ({ blank: b, chosenChoiceId: null, correct: null }));
            return { type: 'FILL_BLANK' as const, activityId: a.id, items, currentItemIndex: 0, complete: false };
          });
          setActivityStates(initial);
          setPageState(initial.length > 0 ? 'reading_playing' : 'error');
        } else {
          setPageState('error');
        }
      })
      .catch(() => setPageState('error'));
  }, [hwId]);

  async function startSpeakRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      speakStreamRef.current = stream;
      speakChunksRef.current = [];
      const mimeType = pickAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) speakChunksRef.current.push(e.data); };
      recorder.start(100);
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

  async function handleSpeakSubmit() {
    if (!recordedBlob) return;
    setPageState('speak_uploading');
    try {
      const mimeType = recordedBlob.type || 'audio/webm';
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([recordedBlob], `recording.${ext}`, { type: mimeType });
      const r = await trySpeakingHomework(hwId, file);
      setSpeakResult(r);
      setPageState('speak_results');
    } catch {
      setPageState('speak_upload');
    }
  }

  async function handlePhonicsSubmit() {
    if (!recordedBlob || !selectedWord) return;
    setPageState('phonics_uploading');
    try {
      const mimeType = recordedBlob.type || 'audio/webm';
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([recordedBlob], `recording.${ext}`, { type: mimeType });
      const r = await tryPhonicsHomework(hwId, selectedWord.id, file);
      setPhonicsResult(r);
      setPageState('phonics_results');
    } catch {
      setPageState('phonics_upload');
    }
  }

  function setActivityState(idx: number, updater: (prev: ActivityState) => ActivityState) {
    setActivityStates((prev) => prev.map((s, i) => (i === idx ? updater(s) : s)));
  }

  const advanceActivity = useCallback(() => {
    setCurrentActivityIndex((prev) => {
      if (prev + 1 >= activityStates.length) {
        setPageState('reading_done');
        return prev;
      }
      return prev + 1;
    });
  }, [activityStates.length]);

  const backUrl = `/teacher/homework/${hwId}`;

  function renderContent() {
  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }} style={{ background: gradients.gameBg }}>
            <CircularProgress size={48} sx={{ color: 'rgba(255,255,255,0.7)' }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Loading…</Typography>
          </Box>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }} style={{ background: gradients.gameBg }}>
            <Typography sx={{ color: '#FF7B7B', fontSize: 18, fontWeight: 700 }}>Failed to load homework.</Typography>
            <Box
              component="button"
              onClick={() => router.push(backUrl)}
              sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', '&:hover': { color: 'white' } }}
            >
              ← Back
            </Box>
          </Box>
    );
  }

  // ── Speaking: record ───────────────────────────────────────────────────────
  if (pageState === 'speak_upload') {
    const isFreespeak = hw?.speakingMode === 'FREE_SPEAK';
    const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const secs = String(recordingSeconds % 60).padStart(2, '0');
    return (

          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3, py: 5, gap: 3, minWidth: 1024 }} style={{ background: gradients.gameBg }}>
            <PreviewBanner />
            <Box
              component="button"
              onClick={() => router.push(backUrl)}
              sx={{ alignSelf: 'flex-start', color: 'rgba(255,255,255,0.6)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', '&:hover': { color: 'white' } }}
            >
              ← Back
            </Box>
            <Box sx={{ width: '100%', maxWidth: 384, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 36, mb: 1.5 }}>{isFreespeak ? '🖼️' : '🎤'}</Typography>
                <Typography sx={{ color: 'white', fontSize: 24, fontWeight: 900, mb: 0.5 }}>{isFreespeak ? 'Free Speak' : 'Script Match'}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Record to preview scoring</Typography>
              </Box>
              {isFreespeak && hw?.speakingPictureUrl && (
                <Box sx={{ borderRadius: 4, overflow: 'hidden', border: '4px solid rgba(255,255,255,0.2)', maxWidth: 320, width: '100%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hw.speakingPictureUrl} alt="Speaking prompt" style={{ width: '100%', objectFit: 'contain' }} />
                </Box>
              )}
              {!isFreespeak && hw?.speakingText && (
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4, px: 3, py: 2.5, width: '100%', textAlign: 'center' }}>
                  <Typography sx={{ color: 'white', fontSize: 20, fontWeight: 700, lineHeight: 1.6 }}>{hw.speakingText}</Typography>
                </Box>
              )}
              {isFreespeak && hw?.speakingText && (
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, px: 2, py: 1.5, width: '100%' }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>Talk about:</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{hw.speakingText.split(',').map((k) => k.trim()).join(' · ')}</Typography>
                </Box>
              )}

              {/* Recording controls */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
                {recordState === 'idle' && (
                  <>
                    <Box
                      component="button"
                      onClick={startSpeakRecording}
                      sx={{
                        width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer',
                        '&:hover': { borderColor: 'rgba(255,255,255,0.6)', transform: 'scale(1.05)' },
                        transition: 'all 0.2s',
                      }}
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                      <span style={{ fontSize: 36 }}>🎤</span>
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Tap to start recording</Typography>
                  </>
                )}
                {recordState === 'recording' && (
                  <>
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Box sx={{
                        position: 'absolute', width: 96, height: 96, borderRadius: '50%', opacity: 0.25,
                        animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
                        '@keyframes ping': { '0%,100%': { transform: 'scale(1)', opacity: 0.25 }, '75%': { transform: 'scale(2)', opacity: 0 } },
                      }} style={{ background: '#ef4444' }} />
                      <Box
                        component="button"
                        onClick={stopSpeakRecording}
                        sx={{
                          position: 'relative', width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '4px solid #ef4444', cursor: 'pointer',
                        }}
                        style={{ background: 'rgba(239,68,68,0.2)' }}
                      >
                        <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: '#f87171' }} />
                      </Box>
                    </Box>
                    <Typography sx={{ color: 'white', fontFamily: 'monospace', fontSize: 30, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{mins}:{secs}</Typography>
                    <Typography sx={{ color: '#f87171', fontSize: 14, fontWeight: 600, animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } } }}>Recording… tap to stop</Typography>
                  </>
                )}
                {recordState === 'recorded' && (
                  <>
                    <Box sx={{ width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid rgba(52,211,153,0.5)' }} style={{ background: 'rgba(52,211,153,0.15)' }}>
                      <span style={{ fontSize: 36 }}>✅</span>
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Recorded: {mins}:{secs}</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                      <Box
                        component="button"
                        onClick={() => { setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); }}
                        sx={{ flex: 1, py: 1.5, borderRadius: 4, color: 'white', fontWeight: 700, fontSize: 14, border: '1px solid rgba(255,255,255,0.2)', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }, transition: 'colors 0.2s' }}
                      >
                        Re-record
                      </Box>
                      <Box
                        component="button"
                        onClick={handleSpeakSubmit}
                        sx={{ flex: 1, py: 1.5, borderRadius: 4, color: 'white', fontWeight: 900, fontSize: 14, border: 'none', cursor: 'pointer', '&:hover': { transform: 'scale(1.02)' }, transition: 'transform 0.2s' }}
                        style={{ background: gradients.primaryPurple }}
                      >
                        Submit for Preview
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          </Box>
    );
  }

  // ── Speaking: uploading ────────────────────────────────────────────────────
  if (pageState === 'speak_uploading') {
    return (

          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }} style={{ background: gradients.gameBg }}>
            <CircularProgress size={48} sx={{ color: '#7BD88F' }} />
            <Typography sx={{ color: '#7BD88F', fontWeight: 700 }}>Scoring…</Typography>
          </Box>
    );
  }

  // ── Speaking: results ──────────────────────────────────────────────────────
  if (pageState === 'speak_results' && speakResult) {
    const isFreespeak = speakResult.speakingMode === 'FREE_SPEAK';
    return (

          <Box sx={{ minHeight: '100vh', py: 6, px: 4, minWidth: 1024 }} style={{ background: gradients.gameBg }}>
            <Box sx={{ maxWidth: 576, mx: 'auto' }}>
              <PreviewBanner />
              <Box sx={{ textAlign: 'center', my: 5 }}>
                <Typography sx={{ fontSize: 60, mb: 2 }}>🎉</Typography>
                <Typography sx={{ color: 'white', fontSize: 24, fontWeight: 900, mb: 1 }}>Preview Complete!</Typography>
                <Typography sx={{ fontSize: 72, fontWeight: 900, mt: 2 }} style={{ color: scoreHexColor(speakResult.score) }}>{speakResult.score}%</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, mt: 1 }}>This is how students experience the scoring</Typography>
              </Box>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4, px: 2.5, py: 2, mb: 4 }}>
                {isFreespeak && speakResult.speakingPictureUrl && (
                  <Box sx={{ borderRadius: 3, overflow: 'hidden', mb: 1.5, maxHeight: 160 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={speakResult.speakingPictureUrl} alt="Speaking prompt" style={{ width: '100%', objectFit: 'contain' }} />
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    {speakResult.transcribedText && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>You said: <em style={{ color: 'white' }}>&quot;{speakResult.transcribedText}&quot;</em></Typography>
                    )}
                    {isFreespeak && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, mt: 0.5 }}>Keywords matched: {speakResult.matchedWords}/{speakResult.totalWords}</Typography>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }} style={{ color: scoreHexColor(speakResult.score) }}>{speakResult.score}%</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Box
                  component="button"
                  onClick={() => { setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); setSpeakResult(null); setPageState('speak_upload'); }}
                  sx={{ flex: 1, py: 2, borderRadius: 4, color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}
                  style={{ background: gradients.primarySecondary }}
                >
                  Try Again
                </Box>
                <Box
                  component="button"
                  onClick={() => router.push(backUrl)}
                  sx={{ flex: 1, py: 2, borderRadius: 4, color: 'white', fontWeight: 900, fontSize: 16, border: 'none', cursor: 'pointer' }}
                  style={{ background: gradients.primaryPurple }}
                >
                  Back to Homework
                </Box>
              </Box>
            </Box>
          </Box>
    );
  }

  // ── Phonics: word select ───────────────────────────────────────────────────
  if (pageState === 'phonics_word_select') {
    const allWords = (hw?.parts ?? []).flatMap((p) => p.words);
    return (

          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3, py: 5, gap: 3, minWidth: 1024 }} style={{ background: gradients.gameBg }}>
            <PreviewBanner />
            <Box
              component="button"
              onClick={() => router.push(backUrl)}
              sx={{ alignSelf: 'flex-start', color: 'rgba(255,255,255,0.6)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', '&:hover': { color: 'white' } }}
            >
              ← Back
            </Box>
            <Box sx={{ width: '100%', maxWidth: 384, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 36, mb: 1.5 }}>#️⃣</Typography>
                <Typography sx={{ color: 'white', fontSize: 24, fontWeight: 900, mb: 0.5 }}>Phonics Preview</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Pick a word to test pronunciation scoring</Typography>
              </Box>
              <Box sx={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {allWords.map((w) => (
                  <Box
                    key={w.id}
                    component="button"
                    onClick={() => { setSelectedWord(w); setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); setPageState('phonics_upload'); }}
                    sx={{
                      px: 2.5, py: 1.25, borderRadius: '9999px', fontSize: 14, fontWeight: 700,
                      border: '2px solid rgba(255,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.1)', color: 'white',
                      cursor: 'pointer', transition: 'all 0.2s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' },
                      background: 'none',
                    }}
                  >
                    {w.text}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
    );
  }

  // ── Phonics: record ────────────────────────────────────────────────────────
  if (pageState === 'phonics_upload') {
    const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const secs = String(recordingSeconds % 60).padStart(2, '0');
    return (

          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3, py: 5, gap: 3, minWidth: 1024 }} style={{ background: gradients.gameBg }}>
            <PreviewBanner />
            <Box
              component="button"
              onClick={() => { stopSpeakRecording(); setPageState('phonics_word_select'); }}
              sx={{ alignSelf: 'flex-start', color: 'rgba(255,255,255,0.6)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', '&:hover': { color: 'white' } }}
            >
              ← Back
            </Box>
            <Box sx={{ width: '100%', maxWidth: 384, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 36, mb: 1.5 }}>🎤</Typography>
                <Typography sx={{ color: 'white', fontSize: 24, fontWeight: 900, mb: 0.5 }}>Say the word</Typography>
                <Typography sx={{ color: 'white', fontSize: 48, fontWeight: 900, mt: 1.5, mb: 0.5 }}>{selectedWord?.text}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Record to see phoneme scoring</Typography>
              </Box>
              {selectedWord?.imageUrl && (
                <Box sx={{ borderRadius: 4, overflow: 'hidden', border: '4px solid rgba(255,255,255,0.2)', maxWidth: 320, width: '100%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedWord.imageUrl} alt={selectedWord.text} style={{ width: '100%', objectFit: 'contain' }} />
                </Box>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
                {recordState === 'idle' && (
                  <>
                    <Box
                      component="button"
                      onClick={startSpeakRecording}
                      sx={{
                        width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer',
                        '&:hover': { borderColor: 'rgba(255,255,255,0.6)', transform: 'scale(1.05)' },
                        transition: 'all 0.2s',
                      }}
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                      <span style={{ fontSize: 36 }}>🎤</span>
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Tap to start recording</Typography>
                  </>
                )}
                {recordState === 'recording' && (
                  <>
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Box sx={{
                        position: 'absolute', width: 96, height: 96, borderRadius: '50%', opacity: 0.25,
                        animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
                        '@keyframes ping': { '0%,100%': { transform: 'scale(1)', opacity: 0.25 }, '75%': { transform: 'scale(2)', opacity: 0 } },
                      }} style={{ background: '#ef4444' }} />
                      <Box
                        component="button"
                        onClick={stopSpeakRecording}
                        sx={{
                          position: 'relative', width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '4px solid #ef4444', cursor: 'pointer',
                        }}
                        style={{ background: 'rgba(239,68,68,0.2)' }}
                      >
                        <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: '#f87171' }} />
                      </Box>
                    </Box>
                    <Typography sx={{ color: 'white', fontFamily: 'monospace', fontSize: 30, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{mins}:{secs}</Typography>
                    <Typography sx={{ color: '#f87171', fontSize: 14, fontWeight: 600, animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } } }}>Recording… tap to stop</Typography>
                  </>
                )}
                {recordState === 'recorded' && (
                  <>
                    <Box sx={{ width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid rgba(52,211,153,0.5)' }} style={{ background: 'rgba(52,211,153,0.15)' }}>
                      <span style={{ fontSize: 36 }}>✅</span>
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Recorded: {mins}:{secs}</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                      <Box
                        component="button"
                        onClick={() => { setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); }}
                        sx={{ flex: 1, py: 1.5, borderRadius: 4, color: 'white', fontWeight: 700, fontSize: 14, border: '1px solid rgba(255,255,255,0.2)', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }, transition: 'colors 0.2s' }}
                      >
                        Re-record
                      </Box>
                      <Box
                        component="button"
                        onClick={handlePhonicsSubmit}
                        sx={{ flex: 1, py: 1.5, borderRadius: 4, color: 'white', fontWeight: 900, fontSize: 14, border: 'none', cursor: 'pointer', '&:hover': { transform: 'scale(1.02)' }, transition: 'transform 0.2s' }}
                        style={{ background: gradients.primaryPurple }}
                      >
                        Submit for Preview
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          </Box>
    );
  }

  // ── Phonics: uploading ─────────────────────────────────────────────────────
  if (pageState === 'phonics_uploading') {
    return (

          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }} style={{ background: gradients.gameBg }}>
            <CircularProgress size={48} sx={{ color: '#7BD88F' }} />
            <Typography sx={{ color: '#7BD88F', fontWeight: 700 }}>Analyzing pronunciation…</Typography>
          </Box>
    );
  }

  // ── Phonics: results ───────────────────────────────────────────────────────
  if (pageState === 'phonics_results' && phonicsResult) {
    return (

          <Box sx={{ minHeight: '100vh', py: 6, px: 4, minWidth: 1024 }} style={{ background: gradients.gameBg }}>
            <Box sx={{ maxWidth: 576, mx: 'auto' }}>
              <PreviewBanner />
              <Box sx={{ textAlign: 'center', my: 5 }}>
                <Typography sx={{ fontSize: 60, mb: 2 }}>🎤</Typography>
                <Typography sx={{ color: 'white', fontSize: 24, fontWeight: 900, mb: 1 }}>Pronunciation Score</Typography>
                <Typography sx={{ color: 'white', fontSize: 30, fontWeight: 900, mt: 1, mb: 0.5 }}>{phonicsResult.wordText}</Typography>
                <Typography sx={{ fontSize: 72, fontWeight: 900, mt: 2 }} style={{ color: scoreHexColor(phonicsResult.score) }}>{phonicsResult.score}%</Typography>
              </Box>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4, px: 2.5, py: 2, mb: 3 }}>
                {phonicsResult.transcribedText && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, mb: 1.5 }}>You said: <em style={{ color: 'white' }}>&quot;{phonicsResult.transcribedText}&quot;</em></Typography>
                )}
                {phonicsResult.bfa?.feedback && phonicsResult.bfa.feedback.length > 0 && (
                  <Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1 }}>Phoneme breakdown</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {phonicsResult.bfa.feedback.map((op, i) => <PhonemeTag key={i} op={op} />)}
                    </Box>
                  </Box>
                )}
                {phonicsResult.bfa?.espeak_fallback && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, mt: 1.5 }}>Used eSpeak fallback for expected phonemes</Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Box
                  component="button"
                  onClick={() => { setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); setPhonicsResult(null); setPageState('phonics_upload'); }}
                  sx={{ flex: 1, py: 2, borderRadius: 4, color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}
                  style={{ background: gradients.primarySecondary }}
                >
                  Try Again
                </Box>
                <Box
                  component="button"
                  onClick={() => { setPhonicsResult(null); setPageState('phonics_word_select'); }}
                  sx={{ flex: 1, py: 2, borderRadius: 4, color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}
                  style={{ background: gradients.primarySecondary }}
                >
                  Other Word
                </Box>
                <Box
                  component="button"
                  onClick={() => router.push(backUrl)}
                  sx={{ flex: 1, py: 2, borderRadius: 4, color: 'white', fontWeight: 900, fontSize: 16, border: 'none', cursor: 'pointer' }}
                  style={{ background: gradients.primaryPurple }}
                >
                  Back
                </Box>
              </Box>
            </Box>
          </Box>
    );
  }

  // ── Reading: playing ───────────────────────────────────────────────────────
  if (pageState === 'reading_playing') {
    const cur = activityStates[currentActivityIndex];
    return (

          <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 1024 }} style={{ background: gradients.gameBgAlt }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 4, py: 2, flexShrink: 0 }}>
              <Box
                component="button"
                onClick={() => router.push(backUrl)}
                sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', '&:hover': { color: 'white' } }}
              >
                ← Back
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {activityStates.map((_, i) => (
                  <Box key={i} sx={{
                    width: 32, height: 8, borderRadius: '9999px', transition: 'all 0.2s',
                    background: i < currentActivityIndex ? 'rgba(255,255,255,0.5)' : i === currentActivityIndex ? '#FFD166' : 'rgba(255,255,255,0.2)',
                  }} />
                ))}
              </Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700 }}>Activity {currentActivityIndex + 1} of {activityStates.length}</Typography>
            </Box>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', px: 4, py: 0.75, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>
              Preview Mode — Not saved
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 4, pb: 4, overflow: 'auto' }}>
              {cur ? (
                cur.type === 'MATCH' ? (
                  <MatchingRenderer
                    state={cur}
                    setState={(u) => setActivityState(currentActivityIndex, u)}
                    onComplete={advanceActivity}
                  />
                ) : (
                  <FillBlankRenderer
                    state={cur as Extract<ActivityState, { type: 'FILL_BLANK' }>}
                    setState={(u) => setActivityState(currentActivityIndex, u)}
                    onComplete={advanceActivity}
                  />
                )
              ) : null}
            </Box>
          </Box>
    );
  }

  // ── Reading: done ──────────────────────────────────────────────────────────
  if (pageState === 'reading_done') {
    let total = 0;
    let correct = 0;
    for (const a of activityStates) {
      if (a.type === 'MATCH') {
        total += a.pairs.length;
        correct += a.pairs.filter((p) => p.status === 'locked').length;
      } else {
        total += a.items.length;
        correct += a.items.filter((it) => it.correct === true).length;
      }
    }
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (

          <Box sx={{ minHeight: '100vh', py: 6, px: 4, minWidth: 1024 }} style={{ background: gradients.gameBg }}>
            <Box sx={{ maxWidth: 576, mx: 'auto' }}>
              <PreviewBanner />
              <Box sx={{ textAlign: 'center', my: 5 }}>
                <Typography sx={{ fontSize: 60, mb: 2 }}>🎉</Typography>
                <Typography sx={{ color: 'white', fontSize: 24, fontWeight: 900, mb: 1 }}>Preview Complete!</Typography>
                <Typography sx={{ fontSize: 72, fontWeight: 900, mt: 2 }} style={{ color: scoreHexColor(score) }}>{score}%</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, mt: 1 }}>{correct} / {total} correct</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Box
                  component="button"
                  onClick={() => {
                    setCurrentActivityIndex(0);
                    setActivityStates((prev) => prev.map((a) => {
                      if (a.type === 'MATCH') return { ...a, pairs: a.pairs.map((p) => ({ ...p, status: 'idle' as const })), selectedImageId: null, complete: false };
                      return { ...a, items: a.items.map((it) => ({ ...it, chosenChoiceId: null, correct: null })), currentItemIndex: 0, complete: false };
                    }));
                    setPageState('reading_playing');
                  }}
                  sx={{ flex: 1, py: 2, borderRadius: 4, color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}
                  style={{ background: gradients.primarySecondary }}
                >
                  Try Again
                </Box>
                <Box
                  component="button"
                  onClick={() => router.push(backUrl)}
                  sx={{ flex: 1, py: 2, borderRadius: 4, color: 'white', fontWeight: 900, fontSize: 16, border: 'none', cursor: 'pointer' }}
                  style={{ background: gradients.primaryPurple }}
                >
                  Back to Homework
                </Box>
              </Box>
            </Box>
          </Box>
    );
  }

  return null;
  } // end renderContent

  return (
    <AuthGate requiredRole="TEACHER">
      {() => renderContent()}
    </AuthGate>
  );
}
