export interface PhonemeAlignment {
  symbol: string;
  ipa: string;
  start: number;
  end: number;
  duration: number;
}

export interface PhonemeOp {
  status: 'correct' | 'similar' | 'substituted' | 'missing' | 'extra' | 'error';
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
  espeak_fallback?: boolean;
}

export interface BfaAnalyzeResult extends BfaAlignResult {
  transcription: { text: string };
}

export interface BfaSpeakingWordResult {
  word: string;
  phonemes: PhonemeAlignment[];
  score: number;
  feedback: PhonemeOp[];
}

export interface BfaSpeakingResult {
  success: boolean;
  transcription: { text: string };
  words: BfaSpeakingWordResult[];
  overall_score: number;
  matched_words: number;
  total_words: number;
}
