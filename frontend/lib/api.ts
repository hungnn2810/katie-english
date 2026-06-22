import { authHeaders } from './auth';
import { fetchWithRetry } from './fetch-with-retry';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface PhonemeData {
  symbol: string;
  audioUrl: string;
}

export interface WordData {
  wordId: number;
  word: string;
  phonemes: PhonemeData[];
  wordAudioUrl: string;
}

export interface SubmitResult {
  isCorrect: boolean;
  correctAnswer: string[];
}

export async function fetchRandomWord(level = 1): Promise<WordData> {
  const res = await fetchWithRetry(`${API_URL}/phonics/words/random?level=${level}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to fetch word');
  return res.json();
}

export async function submitAnswer(
  wordId: number,
  selectedPhonemes: string[],
): Promise<SubmitResult> {
  const res = await fetchWithRetry(`${API_URL}/phonics/submit`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: JSON.stringify({ wordId, selectedPhonemes }),
  });
  if (!res.ok) throw new Error('Failed to submit answer');
  return res.json();
}
