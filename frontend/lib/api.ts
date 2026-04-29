const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
  const res = await fetch(`${API_URL}/phonics/words/random?level=${level}`);
  if (!res.ok) throw new Error('Failed to fetch word');
  return res.json();
}

export async function submitAnswer(
  wordId: number,
  selectedPhonemes: string[],
): Promise<SubmitResult> {
  const res = await fetch(`${API_URL}/phonics/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wordId, selectedPhonemes }),
  });
  if (!res.ok) throw new Error('Failed to submit answer');
  return res.json();
}
