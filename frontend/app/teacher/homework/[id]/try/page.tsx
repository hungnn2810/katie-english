'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center text-white/70 text-xs font-bold uppercase tracking-wide">
      Preview Mode — Results not saved
    </div>
  );
}

function Spinner({ color = 'border-white/70' }: { color?: string }) {
  return <div className={`w-12 h-12 border-4 ${color} border-t-transparent rounded-full animate-spin`} />;
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
    <div className="max-w-3xl mx-auto w-full">
      <div className="text-white/60 text-xs font-bold uppercase tracking-wide mb-8 text-center">
        <ImageIcon className="w-4 h-4 inline mr-1" />Match each image to its word
      </div>
      <div className="flex gap-6 justify-center mb-8">
        {state.pairs.map((p) => {
          const isSelected = state.selectedImageId === p.pair.id;
          const isLocked = p.status === 'locked';
          const isShaking = p.status === 'shaking';
          let cls = 'border-white/20 bg-white/10';
          if (isLocked) cls = 'border-brand-green bg-brand-green/20 cursor-default';
          else if (isShaking) cls = 'border-highlight animate-shake';
          else if (isSelected) cls = 'border-primary shadow-lg scale-105';
          return (
            <button key={p.pair.id} onClick={() => handleImageClick(p.pair.id)} disabled={isLocked}
              className={`relative w-28 h-28 rounded-2xl overflow-hidden cursor-pointer border-4 transition-all ${cls}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.pair.imageUrl} alt={p.pair.word} className="w-full h-full object-cover" />
              {isLocked && <div className="absolute inset-0 flex items-center justify-center bg-brand-green/30"><Check className="w-6 h-6 text-brand-green" /></div>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        {state.shuffledWords.map((pairId) => {
          const p = state.pairs.find((x) => x.pair.id === pairId);
          if (!p) return null;
          const isLocked = p.status === 'locked';
          const isShaking = p.status === 'shaking';
          let cls = 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40';
          if (isLocked) cls = 'bg-brand-green/20 text-brand-green border-brand-green cursor-default';
          else if (isShaking) cls = 'border-highlight text-white animate-shake';
          return (
            <button key={pairId} onClick={() => handleWordClick(pairId)} disabled={isLocked}
              className={`px-6 py-3 rounded-full text-sm font-bold border-2 transition-all ${cls}`}>
              {p.pair.word}
            </button>
          );
        })}
      </div>
    </div>
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
    <div className="max-w-xl mx-auto w-full">
      <div className="flex gap-2 justify-center mb-6">
        {state.items.map((it, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-full transition-all"
            style={{ background: it.correct === true ? '#7BD88F' : it.correct === false ? '#FF7B7B' : i === state.currentItemIndex ? '#FFD166' : 'rgba(255,255,255,0.2)' }} />
        ))}
      </div>
      <div className="text-center mb-8" style={{ lineHeight: 2 }}>
        {parts.flatMap((part, idx, arr) =>
          idx < arr.length - 1
            ? [
                <span key={`t${idx}`} className="text-white text-2xl font-black">{part}</span>,
                <span key={`b${idx}`} className="inline-block w-24 h-8 rounded-lg border-2 border-white/40 bg-white/10 align-middle mx-1" />,
              ]
            : [<span key={`t${idx}`} className="text-white text-2xl font-black">{part}</span>]
        )}
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        {currentItem.blank.choices.map((c) => {
          const isChosen = currentItem.chosenChoiceId === c.id;
          const answered = currentItem.chosenChoiceId !== null;
          let cls = 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40';
          if (isChosen && currentItem.correct === true) cls = 'bg-brand-green/20 text-brand-green border-brand-green';
          else if (isChosen && currentItem.correct === false) cls = 'animate-shake border-highlight text-white';
          else if (answered) cls = 'opacity-40 cursor-not-allowed bg-white/10 text-white border-white/20';
          return (
            <button key={c.id} onClick={() => handleChoiceClick(c)} disabled={answered}
              className={`px-6 py-3 rounded-full text-sm font-bold border-2 transition-all ${cls}`}>
              {c.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Phonics result display ─────────────────────────────────────────────────────

function PhonemeTag({ op }: { op: PhonemeOp }) {
  const colors: Record<string, string> = {
    correct: 'bg-green-500/20 text-green-300 border-green-500/40',
    similar: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    substituted: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    missing: 'bg-red-500/20 text-red-300 border-red-500/40',
    extra: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    error: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
  };
  const label = op.expected ?? op.aligned ?? '?';
  return (
    <span className={`inline-flex flex-col items-center px-2 py-1 rounded-lg border text-xs font-bold gap-0.5 ${colors[op.status] ?? colors.error}`}>
      <span>{label}</span>
      <span className="text-[9px] opacity-60 capitalize">{op.status}</span>
    </span>
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
            <Spinner />
            <p className="text-white/70 text-sm">Loading…</p>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
            <p className="text-highlight text-lg font-bold">Failed to load homework.</p>
            <button onClick={() => router.push(backUrl)} className="text-white/60 text-sm hover:text-white">← Back</button>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Speaking: record ───────────────────────────────────────────────────────
  if (pageState === 'speak_upload') {
    const isFreespeak = hw?.speakingMode === 'FREE_SPEAK';
    const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const secs = String(recordingSeconds % 60).padStart(2, '0');
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-6" style={{ background: gradients.gameBg, minWidth: 1024 }}>
            <PreviewBanner />
            <button onClick={() => router.push(backUrl)} className="self-start text-white/60 hover:text-white text-sm">← Back</button>
            <div className="w-full max-w-sm flex flex-col items-center gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">{isFreespeak ? '🖼️' : '🎤'}</div>
                <h2 className="text-white text-2xl font-black mb-1">{isFreespeak ? 'Free Speak' : 'Script Match'}</h2>
                <p className="text-white/60 text-sm">Record to preview scoring</p>
              </div>
              {isFreespeak && hw?.speakingPictureUrl && (
                <div className="rounded-2xl overflow-hidden border-4 border-white/20 max-w-xs w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hw.speakingPictureUrl} alt="Speaking prompt" className="w-full object-contain" />
                </div>
              )}
              {!isFreespeak && hw?.speakingText && (
                <div className="bg-white/10 rounded-2xl px-6 py-5 w-full text-center">
                  <p className="text-white text-xl font-bold leading-relaxed">{hw.speakingText}</p>
                </div>
              )}
              {isFreespeak && hw?.speakingText && (
                <div className="bg-white/10 rounded-xl px-4 py-3 w-full">
                  <p className="text-white/60 text-xs font-bold uppercase tracking-wide mb-1">Talk about:</p>
                  <p className="text-white/80 text-sm">{hw.speakingText.split(',').map((k) => k.trim()).join(' · ')}</p>
                </div>
              )}

              {/* Recording controls */}
              <div className="flex flex-col items-center gap-4 w-full">
                {recordState === 'idle' && (
                  <>
                    <button onClick={startSpeakRecording}
                      className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-white/30 hover:border-white/60 hover:scale-105 transition-all"
                      style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <span className="text-4xl">🎤</span>
                    </button>
                    <p className="text-white/60 text-sm">Tap to start recording</p>
                  </>
                )}
                {recordState === 'recording' && (
                  <>
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-24 h-24 rounded-full animate-ping opacity-25" style={{ background: '#ef4444' }} />
                      <button onClick={stopSpeakRecording}
                        className="relative w-24 h-24 rounded-full flex items-center justify-center border-4 border-red-500"
                        style={{ background: 'rgba(239,68,68,0.2)' }}>
                        <div className="w-8 h-8 rounded-sm bg-red-400" />
                      </button>
                    </div>
                    <div className="text-white font-mono text-3xl font-black tabular-nums">{mins}:{secs}</div>
                    <p className="text-red-400 text-sm font-semibold animate-pulse">Recording… tap to stop</p>
                  </>
                )}
                {recordState === 'recorded' && (
                  <>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-emerald-400/50"
                      style={{ background: 'rgba(52,211,153,0.15)' }}>
                      <span className="text-4xl">✅</span>
                    </div>
                    <p className="text-white/60 text-sm">Recorded: {mins}:{secs}</p>
                    <div className="flex gap-3 w-full">
                      <button onClick={() => { setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); }}
                        className="flex-1 py-3 rounded-2xl text-white font-bold text-sm border border-white/20 hover:bg-white/10 transition-colors">
                        Re-record
                      </button>
                      <button onClick={handleSpeakSubmit}
                        className="flex-1 py-3 rounded-2xl text-white font-black text-sm hover:scale-[1.02] transition-transform"
                        style={{ background: gradients.primaryPurple }}>
                        Submit for Preview
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Speaking: uploading ────────────────────────────────────────────────────
  if (pageState === 'speak_uploading') {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
            <Spinner color="border-accent" />
            <p className="text-accent font-bold">Scoring…</p>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Speaking: results ──────────────────────────────────────────────────────
  if (pageState === 'speak_results' && speakResult) {
    const isFreespeak = speakResult.speakingMode === 'FREE_SPEAK';
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen py-12 px-8" style={{ background: gradients.gameBg, minWidth: 1024 }}>
            <div className="max-w-xl mx-auto">
              <PreviewBanner />
              <div className="text-center my-10">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-white text-2xl font-black mb-2">Preview Complete!</h1>
                <div className="text-7xl font-black mt-4" style={{ color: scoreHexColor(speakResult.score) }}>{speakResult.score}%</div>
                <p className="text-white/60 text-sm mt-2">This is how students experience the scoring</p>
              </div>
              <div className="bg-white/10 rounded-2xl px-5 py-4 mb-8">
                {isFreespeak && speakResult.speakingPictureUrl && (
                  <div className="rounded-xl overflow-hidden mb-3 max-h-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={speakResult.speakingPictureUrl} alt="Speaking prompt" className="w-full object-contain" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {speakResult.transcribedText && (
                      <div className="text-white/70 text-sm">You said: <span className="text-white italic">&quot;{speakResult.transcribedText}&quot;</span></div>
                    )}
                    {isFreespeak && (
                      <div className="text-white/70 text-sm mt-1">Keywords matched: {speakResult.matchedWords}/{speakResult.totalWords}</div>
                    )}
                  </div>
                  <div className="text-2xl font-black tabular-nums shrink-0" style={{ color: scoreHexColor(speakResult.score) }}>{speakResult.score}%</div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); setSpeakResult(null); setPageState('speak_upload'); }}
                  className="flex-1 py-4 rounded-2xl text-white font-bold text-base" style={{ background: gradients.primarySecondary }}>
                  Try Again
                </button>
                <button onClick={() => router.push(backUrl)}
                  className="flex-1 py-4 rounded-2xl text-white font-black text-base" style={{ background: gradients.primaryPurple }}>
                  Back to Homework
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Phonics: word select ───────────────────────────────────────────────────
  if (pageState === 'phonics_word_select') {
    const allWords = (hw?.parts ?? []).flatMap((p) => p.words);
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-6" style={{ background: gradients.gameBg, minWidth: 1024 }}>
            <PreviewBanner />
            <button onClick={() => router.push(backUrl)} className="self-start text-white/60 hover:text-white text-sm">← Back</button>
            <div className="w-full max-w-sm flex flex-col items-center gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">#️⃣</div>
                <h2 className="text-white text-2xl font-black mb-1">Phonics Preview</h2>
                <p className="text-white/60 text-sm">Pick a word to test pronunciation scoring</p>
              </div>
              <div className="w-full flex flex-wrap gap-2 justify-center">
                {allWords.map((w) => (
                  <button key={w.id} onClick={() => { setSelectedWord(w); setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); setPageState('phonics_upload'); }}
                    className="px-5 py-2.5 rounded-full text-sm font-bold border-2 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 transition-all">
                    {w.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Phonics: record ────────────────────────────────────────────────────────
  if (pageState === 'phonics_upload') {
    const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const secs = String(recordingSeconds % 60).padStart(2, '0');
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-6" style={{ background: gradients.gameBg, minWidth: 1024 }}>
            <PreviewBanner />
            <button onClick={() => { stopSpeakRecording(); setPageState('phonics_word_select'); }} className="self-start text-white/60 hover:text-white text-sm">← Back</button>
            <div className="w-full max-w-sm flex flex-col items-center gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🎤</div>
                <h2 className="text-white text-2xl font-black mb-1">Say the word</h2>
                <div className="text-white text-5xl font-black mt-3 mb-1">{selectedWord?.text}</div>
                <p className="text-white/60 text-sm">Record to see phoneme scoring</p>
              </div>
              {selectedWord?.imageUrl && (
                <div className="rounded-2xl overflow-hidden border-4 border-white/20 max-w-xs w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedWord.imageUrl} alt={selectedWord.text} className="w-full object-contain" />
                </div>
              )}
              <div className="flex flex-col items-center gap-4 w-full">
                {recordState === 'idle' && (
                  <>
                    <button onClick={startSpeakRecording}
                      className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-white/30 hover:border-white/60 hover:scale-105 transition-all"
                      style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <span className="text-4xl">🎤</span>
                    </button>
                    <p className="text-white/60 text-sm">Tap to start recording</p>
                  </>
                )}
                {recordState === 'recording' && (
                  <>
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-24 h-24 rounded-full animate-ping opacity-25" style={{ background: '#ef4444' }} />
                      <button onClick={stopSpeakRecording}
                        className="relative w-24 h-24 rounded-full flex items-center justify-center border-4 border-red-500"
                        style={{ background: 'rgba(239,68,68,0.2)' }}>
                        <div className="w-8 h-8 rounded-sm bg-red-400" />
                      </button>
                    </div>
                    <div className="text-white font-mono text-3xl font-black tabular-nums">{mins}:{secs}</div>
                    <p className="text-red-400 text-sm font-semibold animate-pulse">Recording… tap to stop</p>
                  </>
                )}
                {recordState === 'recorded' && (
                  <>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-emerald-400/50"
                      style={{ background: 'rgba(52,211,153,0.15)' }}>
                      <span className="text-4xl">✅</span>
                    </div>
                    <p className="text-white/60 text-sm">Recorded: {mins}:{secs}</p>
                    <div className="flex gap-3 w-full">
                      <button onClick={() => { setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); }}
                        className="flex-1 py-3 rounded-2xl text-white font-bold text-sm border border-white/20 hover:bg-white/10 transition-colors">
                        Re-record
                      </button>
                      <button onClick={handlePhonicsSubmit}
                        className="flex-1 py-3 rounded-2xl text-white font-black text-sm hover:scale-[1.02] transition-transform"
                        style={{ background: gradients.primaryPurple }}>
                        Submit for Preview
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Phonics: uploading ─────────────────────────────────────────────────────
  if (pageState === 'phonics_uploading') {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
            <Spinner color="border-accent" />
            <p className="text-accent font-bold">Analyzing pronunciation…</p>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Phonics: results ───────────────────────────────────────────────────────
  if (pageState === 'phonics_results' && phonicsResult) {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen py-12 px-8" style={{ background: gradients.gameBg, minWidth: 1024 }}>
            <div className="max-w-xl mx-auto">
              <PreviewBanner />
              <div className="text-center my-10">
                <div className="text-6xl mb-4">🎤</div>
                <h1 className="text-white text-2xl font-black mb-2">Pronunciation Score</h1>
                <div className="text-white text-3xl font-black mt-2 mb-1">{phonicsResult.wordText}</div>
                <div className="text-7xl font-black mt-4" style={{ color: scoreHexColor(phonicsResult.score) }}>{phonicsResult.score}%</div>
              </div>

              <div className="bg-white/10 rounded-2xl px-5 py-4 mb-6">
                {phonicsResult.transcribedText && (
                  <p className="text-white/70 text-sm mb-3">You said: <span className="text-white italic">&quot;{phonicsResult.transcribedText}&quot;</span></p>
                )}
                {phonicsResult.bfa?.feedback && phonicsResult.bfa.feedback.length > 0 && (
                  <div>
                    <p className="text-white/50 text-xs font-bold uppercase tracking-wide mb-2">Phoneme breakdown</p>
                    <div className="flex flex-wrap gap-2">
                      {phonicsResult.bfa.feedback.map((op, i) => <PhonemeTag key={i} op={op} />)}
                    </div>
                  </div>
                )}
                {phonicsResult.bfa?.espeak_fallback && (
                  <p className="text-white/40 text-xs mt-3">Used eSpeak fallback for expected phonemes</p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setRecordedBlob(null); setRecordState('idle'); setRecordingSeconds(0); setPhonicsResult(null); setPageState('phonics_upload'); }}
                  className="flex-1 py-4 rounded-2xl text-white font-bold text-base" style={{ background: gradients.primarySecondary }}>
                  Try Again
                </button>
                <button onClick={() => { setPhonicsResult(null); setPageState('phonics_word_select'); }}
                  className="flex-1 py-4 rounded-2xl text-white font-bold text-base" style={{ background: gradients.primarySecondary }}>
                  Other Word
                </button>
                <button onClick={() => router.push(backUrl)}
                  className="flex-1 py-4 rounded-2xl text-white font-black text-base" style={{ background: gradients.primaryPurple }}>
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  // ── Reading: playing ───────────────────────────────────────────────────────
  if (pageState === 'reading_playing') {
    const cur = activityStates[currentActivityIndex];
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="h-screen flex flex-col overflow-hidden" style={{ background: gradients.gameBgAlt, minWidth: 1024 }}>
            <div className="flex items-center justify-between px-8 py-4 flex-shrink-0">
              <button onClick={() => router.push(backUrl)} className="text-white/60 hover:text-white text-sm">← Back</button>
              <div className="flex items-center gap-3">
                {activityStates.map((_, i) => (
                  <div key={i} className="w-8 h-2 rounded-full transition-all"
                    style={{ background: i < currentActivityIndex ? 'rgba(255,255,255,0.5)' : i === currentActivityIndex ? '#FFD166' : 'rgba(255,255,255,0.2)' }} />
                ))}
              </div>
              <div className="text-white/70 text-sm font-bold">Activity {currentActivityIndex + 1} of {activityStates.length}</div>
            </div>
            <div className="bg-white/10 border-b border-white/10 px-8 py-1.5 text-center text-white/50 text-xs font-bold uppercase tracking-wide flex-shrink-0">
              Preview Mode — Not saved
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 overflow-auto">
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
            </div>
          </div>
        )}
      </AuthGate>
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
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen py-12 px-8" style={{ background: gradients.gameBg, minWidth: 1024 }}>
            <div className="max-w-xl mx-auto">
              <PreviewBanner />
              <div className="text-center my-10">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-white text-2xl font-black mb-2">Preview Complete!</h1>
                <div className="text-7xl font-black mt-4" style={{ color: scoreHexColor(score) }}>{score}%</div>
                <p className="text-white/60 text-sm mt-2">{correct} / {total} correct</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => {
                  setCurrentActivityIndex(0);
                  setActivityStates((prev) => prev.map((a) => {
                    if (a.type === 'MATCH') return { ...a, pairs: a.pairs.map((p) => ({ ...p, status: 'idle' as const })), selectedImageId: null, complete: false };
                    return { ...a, items: a.items.map((it) => ({ ...it, chosenChoiceId: null, correct: null })), currentItemIndex: 0, complete: false };
                  }));
                  setPageState('reading_playing');
                }} className="flex-1 py-4 rounded-2xl text-white font-bold text-base" style={{ background: gradients.primarySecondary }}>
                  Try Again
                </button>
                <button onClick={() => router.push(backUrl)}
                  className="flex-1 py-4 rounded-2xl text-white font-black text-base" style={{ background: gradients.primaryPurple }}>
                  Back to Homework
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  return null;
}
