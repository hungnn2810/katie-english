export interface PhonemeAlignment {
  symbol: string;
  ipa: string;
  start: number;
  end: number;
  duration: number;
}

export interface PhonemeOp {
  status: 'correct' | 'substituted' | 'missing' | 'extra' | 'error';
  expected: string | null;
  aligned: string | null;
  start?: number;
  end?: number;
  duration?: number;
  message?: string;
}

export interface WhisperXWord {
  word: string;
  start: number;
  end: number;
  score: number;
}

export interface WhisperXResult {
  text: string;
  words?: WhisperXWord[];
}

export interface BfaAlignResult {
  success: boolean;
  phonemes: PhonemeAlignment[];
  score: number;
  feedback: PhonemeOp[];
  word: string;
}
