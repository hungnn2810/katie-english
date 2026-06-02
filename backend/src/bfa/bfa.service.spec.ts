/**
 * Unit tests for mapPhonemeOps — the Azure PA score-band logic that produces
 * 'correct' | 'similar' | 'substituted' | 'missing' phoneme statuses.
 *
 * VOCAB-04: A phonetically-close final-consonant swap (e.g. cat→cap, /t/→/p/)
 * yields status='similar' (yellow chip), NOT 'substituted' (red chip), when the
 * Azure AccuracyScore falls in the band [PHONEME_SIMILAR_THRESHOLD, PHONEME_CORRECT_THRESHOLD)
 * = [50, 80) by default.
 *
 * D-08 (CONTEXT) was written against the old Python bfa-service with a frozenset of
 * phoneme pairs — that service no longer exists. The 'similar' status is now purely
 * score-band driven via Azure's per-phoneme AccuracyScore. No frozenset needed.
 *
 * The threshold knob for child vocab: AZURE_PHONEME_SIMILAR_THRESHOLD env var (default 50).
 */

import { mapPhonemeOps } from './bfa.service';

/** Build a synthetic Azure PA word-level payload with a single phoneme. */
function makeWordData(opts: {
  errorType?: string;
  phonemeSymbol?: string;
  accuracyScore?: number;
  offset?: number;
  duration?: number;
}): Record<string, any> {
  const {
    errorType = 'None',
    phonemeSymbol = 'p',
    accuracyScore = 75,
    offset = 1_000_000,
    duration = 500_000,
  } = opts;
  return {
    PronunciationAssessment: { ErrorType: errorType },
    Phonemes: [
      {
        Phoneme: phonemeSymbol,
        PronunciationAssessment: { AccuracyScore: accuracyScore },
        Offset: offset,
        Duration: duration,
      },
    ],
  };
}

describe('mapPhonemeOps — VOCAB-04 similar band [50, 80)', () => {
  it('maps AccuracyScore in [50, 80) to status "similar" (yellow chip — VOCAB-04 cat→cap)', () => {
    // Simulate the /p/ in a cat→cap confusion: score 65 falls in [50, 80) → 'similar'
    const wordData = makeWordData({ phonemeSymbol: 'p', accuracyScore: 65 });
    const ops = mapPhonemeOps(wordData);
    expect(ops).toHaveLength(1);
    expect(ops[0].status).toBe('similar');
    expect(ops[0].expected).toBe('p');
  });

  it('maps AccuracyScore exactly at PHONEME_SIMILAR_THRESHOLD (50) to "similar"', () => {
    const wordData = makeWordData({ accuracyScore: 50 });
    const ops = mapPhonemeOps(wordData);
    expect(ops[0].status).toBe('similar');
  });

  it('maps AccuracyScore just below PHONEME_CORRECT_THRESHOLD (79) to "similar"', () => {
    const wordData = makeWordData({ accuracyScore: 79 });
    const ops = mapPhonemeOps(wordData);
    expect(ops[0].status).toBe('similar');
  });

  it('maps AccuracyScore >= PHONEME_CORRECT_THRESHOLD (80) to "correct"', () => {
    const wordData = makeWordData({ accuracyScore: 80 });
    const ops = mapPhonemeOps(wordData);
    expect(ops[0].status).toBe('correct');
  });

  it('maps AccuracyScore of 100 to "correct"', () => {
    const wordData = makeWordData({ accuracyScore: 100 });
    const ops = mapPhonemeOps(wordData);
    expect(ops[0].status).toBe('correct');
  });

  it('maps AccuracyScore < PHONEME_SIMILAR_THRESHOLD (49) to "substituted" (red chip)', () => {
    const wordData = makeWordData({ accuracyScore: 49 });
    const ops = mapPhonemeOps(wordData);
    expect(ops[0].status).toBe('substituted');
  });

  it('maps AccuracyScore of 0 to "substituted"', () => {
    const wordData = makeWordData({ accuracyScore: 0 });
    const ops = mapPhonemeOps(wordData);
    expect(ops[0].status).toBe('substituted');
  });

  it('maps ErrorType "Omission" to "missing" regardless of AccuracyScore', () => {
    const wordData = makeWordData({ errorType: 'Omission', accuracyScore: 90 });
    const ops = mapPhonemeOps(wordData);
    expect(ops[0].status).toBe('missing');
    expect(ops[0].aligned).toBeNull();
    expect(ops[0].start).toBeUndefined();
    expect(ops[0].end).toBeUndefined();
    expect(ops[0].duration).toBeUndefined();
  });

  it('returns correct timing fields for non-missing phonemes', () => {
    // Offset = 1_000_000 ticks → 0.1 s; Duration = 500_000 ticks → 0.05 s
    const wordData = makeWordData({ accuracyScore: 85, offset: 1_000_000, duration: 500_000 });
    const ops = mapPhonemeOps(wordData);
    expect(ops[0].status).toBe('correct');
    expect(ops[0].start).toBeCloseTo(0.1, 3);
    expect(ops[0].duration).toBeCloseTo(0.05, 3);
    expect(ops[0].end).toBeCloseTo(0.15, 3);
  });

  it('handles empty Phonemes array (word with no phoneme data)', () => {
    const wordData = { PronunciationAssessment: { ErrorType: 'None' }, Phonemes: [] };
    const ops = mapPhonemeOps(wordData);
    expect(ops).toHaveLength(0);
  });

  it('handles missing PronunciationAssessment gracefully (defaults to score 0 → substituted)', () => {
    const wordData = { Phonemes: [{ Phoneme: 't', Offset: 0, Duration: 0 }] };
    const ops = mapPhonemeOps(wordData);
    expect(ops[0].status).toBe('substituted'); // score defaults to 0 < 50
  });
});
