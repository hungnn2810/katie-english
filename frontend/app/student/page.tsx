'use client';

import { useEffect, useState, useCallback } from 'react';
import AuthGate from '@/components/AuthGate';
import { fetchRandomWord, submitAnswer, WordData, SubmitResult } from '@/lib/api';
import PhonemeButton from '@/components/PhonemeButton';
import SelectedPhonemes from '@/components/SelectedPhonemes';
import ResultBanner from '@/components/ResultBanner';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useToast } from '@/lib/toast-context';

type GameState = 'loading' | 'playing' | 'submitted';

export default function GamePage() {
  const [word, setWord] = useState<WordData | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [state, setState] = useState<GameState>('loading');
  const [level, setLevel] = useState(1);
  const { showToast } = useToast();

  const loadWord = useCallback(async (lvl: number) => {
    setState('loading');
    setSelected([]);
    setResult(null);
    try {
      const data = await fetchRandomWord(lvl);
      setWord(data);
      setState('playing');
    } catch {
      showToast('Failed to load word. Is the backend running?', 'error');
      setState('playing');
    }
  }, [showToast]);

  useEffect(() => {
    loadWord(level);
  }, [loadWord, level]);

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(() => {});
  };

  const handlePhonemeClick = (symbol: string) => {
    if (state !== 'playing') return;
    setSelected((prev) => [...prev, symbol]);
  };

  const handleRemove = (index: number) => {
    if (state !== 'playing') return;
    setSelected((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBlend = () => {
    if (!word) return;
    playAudio(word.wordAudioUrl);
  };

  const handleSubmit = async () => {
    if (!word || selected.length === 0) return;
    try {
      const res = await submitAnswer(word.wordId, selected);
      setResult(res);
      setState('submitted');
    } catch {
      showToast('Failed to submit. Try again.', 'error');
    }
  };

  const handleNext = () => {
    loadWord(level);
  };

  return (
    <AuthGate requiredRole="STUDENT">
      {() => (
        <Box component="main" sx={{ maxWidth: 672, mx: 'auto', px: 2, py: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Phonics Blending
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Level</Typography>
              {[1, 2, 3].map((l) => (
                <Button
                  key={l}
                  onClick={() => { setLevel(l); loadWord(l); }}
                  sx={{
                    width: 44, height: 44, minWidth: 44, borderRadius: '50%',
                    fontSize: 14, fontWeight: 700, p: 0,
                    ...(level === l
                      ? { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }
                      : { bgcolor: 'grey.200', color: 'grey.600', '&:hover': { bgcolor: 'grey.300' } }),
                  }}
                >
                  {l}
                </Button>
              ))}
            </Box>
          </Box>



          {state === 'loading' && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          )}

          {word && state !== 'loading' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Phoneme palette */}
              <Box component="section">
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mb: 1.5 }}>
                  Available phonemes — click to add, ▶ to hear
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                  {word.phonemes.map((p) => (
                    <PhonemeButton
                      key={p.symbol}
                      symbol={p.symbol}
                      audioUrl={p.audioUrl}
                      selected={false}
                      onClick={() => handlePhonemeClick(p.symbol)}
                    />
                  ))}
                </Box>
              </Box>

              {/* Answer area */}
              <Box component="section">
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mb: 1.5 }}>
                  Your answer — click a tile to remove it
                </Typography>
                <SelectedPhonemes selected={selected} onRemove={handleRemove} />
              </Box>

              {/* Actions */}
              <Box component="section" sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  onClick={handleBlend}
                  variant="contained"
                  sx={{ px: 3, py: 1.5, bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, borderRadius: 3 }}
                >
                  Blend
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={selected.length === 0 || state === 'submitted'}
                  variant="contained"
                  sx={{ px: 3, py: 1.5, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, borderRadius: 3 }}
                >
                  Submit
                </Button>
                <Button
                  onClick={handleNext}
                  variant="contained"
                  sx={{ px: 3, py: 1.5, bgcolor: 'grey.200', color: 'grey.700', '&:hover': { bgcolor: 'grey.300' }, borderRadius: 3 }}
                >
                  Next Word
                </Button>
              </Box>

              {/* Result */}
              {result && <ResultBanner isCorrect={result.isCorrect} correctAnswer={result.correctAnswer} />}
            </Box>
          )}
        </Box>
      )}
    </AuthGate>
  );
}
