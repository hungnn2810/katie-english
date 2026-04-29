'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchRandomWord, submitAnswer, WordData, SubmitResult } from '@/lib/api';
import PhonemeButton from '@/components/PhonemeButton';
import SelectedPhonemes from '@/components/SelectedPhonemes';
import ResultBanner from '@/components/ResultBanner';

type GameState = 'loading' | 'playing' | 'submitted';

export default function GamePage() {
  const [word, setWord] = useState<WordData | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [state, setState] = useState<GameState>('loading');
  const [level, setLevel] = useState(1);
  const [error, setError] = useState('');

  const loadWord = useCallback(async (lvl: number) => {
    setState('loading');
    setSelected([]);
    setResult(null);
    setError('');
    try {
      const data = await fetchRandomWord(lvl);
      setWord(data);
      setState('playing');
    } catch {
      setError('Failed to load word. Is the backend running?');
      setState('playing');
    }
  }, []);

  useEffect(() => {
    loadWord(level);
  }, []);

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
      setError('Failed to submit. Try again.');
    }
  };

  const handleNext = () => {
    loadWord(level);
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-blue-600">Phonics Blending</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Level</span>
          {[1, 2, 3].map((l) => (
            <button
              key={l}
              onClick={() => { setLevel(l); loadWord(l); }}
              className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                level === l ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      {state === 'loading' && (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      )}

      {word && state !== 'loading' && (
        <div className="space-y-6">
          {/* Phoneme palette */}
          <section>
            <p className="text-sm font-medium text-gray-500 mb-3">Available phonemes — click to add, ▶ to hear</p>
            <div className="flex flex-wrap gap-4 justify-center">
              {word.phonemes.map((p) => (
                <PhonemeButton
                  key={p.symbol}
                  symbol={p.symbol}
                  audioUrl={p.audioUrl}
                  selected={false}
                  onClick={() => handlePhonemeClick(p.symbol)}
                />
              ))}
            </div>
          </section>

          {/* Answer area */}
          <section>
            <p className="text-sm font-medium text-gray-500 mb-3">Your answer — click a tile to remove it</p>
            <SelectedPhonemes selected={selected} onRemove={handleRemove} />
          </section>

          {/* Actions */}
          <section className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={handleBlend}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
            >
              Blend
            </button>
            <button
              onClick={handleSubmit}
              disabled={selected.length === 0 || state === 'submitted'}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Next Word
            </button>
          </section>

          {/* Result */}
          {result && <ResultBanner isCorrect={result.isCorrect} correctAnswer={result.correctAnswer} />}
        </div>
      )}
    </main>
  );
}
