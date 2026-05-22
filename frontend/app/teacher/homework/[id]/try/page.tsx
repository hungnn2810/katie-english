'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { getHomework, trySpeakingHomework, SpeakingMode } from '@/lib/admin-api';
import { gradients, scoreHexColor } from '@/lib/colors';

type PageState = 'loading' | 'upload' | 'uploading' | 'results' | 'error';

interface SpeakHw {
  type: 'PHONICS' | 'SPEAKING';
  speakingMode: SpeakingMode | null;
  speakingText: string | null;
  speakingPictureUrl: string | null;
}

interface TryResult {
  score: number;
  matchedWords: number;
  totalWords: number;
  transcribedText: string;
  speakingMode: SpeakingMode | null;
  speakingPictureUrl: string | null;
}

export default function TeacherTryHomeworkPage() {
  const { id } = useParams<{ id: string }>();
  const hwId = Number(id);
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [hw, setHw] = useState<SpeakHw | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [tryResult, setTryResult] = useState<TryResult | null>(null);

  useEffect(() => {
    getHomework(hwId)
      .then((h) => {
        if (h.type !== 'SPEAKING') {
          setPageState('error');
          return;
        }
        setHw({
          type: h.type,
          speakingMode: (h.speakingMode as SpeakingMode | null) ?? null,
          speakingText: h.speakingText ?? null,
          speakingPictureUrl: h.speakingPictureUrl ?? null,
        });
        setPageState('upload');
      })
      .catch(() => setPageState('error'));
  }, [hwId]);

  async function handleSubmit() {
    if (!uploadFile) return;
    setPageState('uploading');
    try {
      const r = await trySpeakingHomework(hwId, uploadFile);
      setTryResult(r);
      setPageState('results');
    } catch (err) {
      console.error('[try-speak] failed:', err);
      setPageState('error');
    }
  }

  function handleTryAgain() {
    setUploadFile(null);
    setTryResult(null);
    setPageState('upload');
  }

  if (pageState === 'loading') {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
            <div className="w-12 h-12 border-4 border-white/70 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">Loading…</p>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'uploading') {
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: gradients.gameBg }}>
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-accent font-bold">Scoring…</p>
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
            <p className="text-highlight text-lg font-bold">Scoring failed. Please try again.</p>
            <button onClick={() => router.push(`/teacher/homework/${hwId}`)} className="text-white/60 text-sm hover:text-white">← Back</button>
          </div>
        )}
      </AuthGate>
    );
  }

  if (pageState === 'results' && tryResult) {
    const isFreespeak = tryResult.speakingMode === 'FREE_SPEAK';
    return (
      <AuthGate requiredRole="TEACHER">
        {() => (
          <div className="min-h-screen py-12 px-8" style={{ background: gradients.gameBg, minWidth: 1024 }}>
            <div className="max-w-xl mx-auto">
              <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center text-white/70 text-xs font-bold mb-6 uppercase tracking-wide">
                Preview Mode — Results not saved
              </div>

              <div className="text-center mb-10">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-white text-2xl font-black mb-2">Preview Complete!</h1>
                <div className="text-7xl font-black mt-4" style={{ color: scoreHexColor(tryResult.score) }}>
                  {tryResult.score}%
                </div>
                <p className="text-white/60 text-sm mt-2">This is how students experience the scoring</p>
              </div>

              <div className="bg-white/10 rounded-2xl px-5 py-4 mb-8">
                {isFreespeak && tryResult.speakingPictureUrl && (
                  <div className="rounded-xl overflow-hidden mb-3 max-h-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tryResult.speakingPictureUrl} alt="Speaking prompt" className="w-full object-contain" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {tryResult.transcribedText && (
                      <div className="text-white/70 text-sm">
                        You said: <span className="text-white italic">&quot;{tryResult.transcribedText}&quot;</span>
                      </div>
                    )}
                    {isFreespeak && (
                      <div className="text-white/70 text-sm mt-1">
                        Keywords matched: {tryResult.matchedWords}/{tryResult.totalWords}
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-black tabular-nums shrink-0" style={{ color: scoreHexColor(tryResult.score) }}>
                    {tryResult.score}%
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleTryAgain} className="flex-1 py-4 rounded-2xl text-white font-bold text-base" style={{ background: gradients.primarySecondary }}>
                  Try Again
                </button>
                <button onClick={() => router.push(`/teacher/homework/${hwId}`)} className="flex-1 py-4 rounded-2xl text-white font-black text-base" style={{ background: gradients.primaryPurple }}>
                  Back to Homework
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    );
  }

  // pageState === 'upload'
  const isFreespeak = hw?.speakingMode === 'FREE_SPEAK';
  return (
    <AuthGate requiredRole="TEACHER">
      {() => (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-6" style={{ background: gradients.gameBg, minWidth: 1024 }}>
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center text-white/70 text-xs font-bold uppercase tracking-wide w-full max-w-sm">
            Preview Mode — Results not saved
          </div>
          <button onClick={() => router.push(`/teacher/homework/${hwId}`)} className="self-start text-white/60 hover:text-white text-sm">← Back</button>

          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">{isFreespeak ? '🖼️' : '🎤'}</div>
              <h2 className="text-white text-2xl font-black mb-1">
                {isFreespeak ? 'Free Speak' : 'Script Match'}
              </h2>
              <p className="text-white/60 text-sm">Upload a recording to preview scoring</p>
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

            <div className="w-full">
              <label className="flex flex-col items-center gap-3 w-full cursor-pointer rounded-2xl border-2 border-dashed border-white/30 py-8 px-4 hover:border-white/60 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <span className="text-3xl">{uploadFile ? '✅' : '📁'}</span>
                {uploadFile ? (
                  <div className="text-center">
                    <p className="text-white font-bold text-sm">{uploadFile.name}</p>
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
              onClick={handleSubmit}
              disabled={!uploadFile}
              className="w-full py-4 rounded-2xl text-white font-black text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
              style={{ background: gradients.primaryPurple }}>
              Submit for Preview
            </button>
          </div>
        </div>
      )}
    </AuthGate>
  );
}
