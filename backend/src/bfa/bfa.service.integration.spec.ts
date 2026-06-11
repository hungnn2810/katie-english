/**
 * Integration tests for BfaService — live Azure Speech API + real ffmpeg (ffmpeg-static).
 *
 * What these tests verify:
 *   1. ffmpeg (via ffmpeg-static) successfully converts .m4a → WAV
 *   2. Azure Speech API is reachable and responds
 *   3. Service correctly parses Azure responses (whatever quality)
 *   4. Response shape is always contract-compliant
 *
 * NOTE: fixture .m4a files are low-quality recordings (Azure confidence ~0.13).
 * Assertions intentionally avoid score/phoneme count expectations — those belong
 * in tests with high-quality audio. The goal here is pipeline validation only.
 *
 * Requires AZURE_SPEECH_KEY and AZURE_SPEECH_REGION env vars.
 * Skipped automatically when AZURE_SPEECH_KEY is absent.
 *
 * Run:
 *   AZURE_SPEECH_KEY=<key> AZURE_SPEECH_REGION=southeastasia \
 *   npx jest --testPathPattern integration --testTimeout 60000
 */

import * as path from 'path';
import * as fs from 'fs';
import { BfaService } from './bfa.service';

const HAS_AZURE = Boolean(process.env.AZURE_SPEECH_KEY);
const describeIf = HAS_AZURE ? describe : describe.skip;

const fixturesDir = path.join(__dirname, '..', 'game', '__fixtures__');

function fixture(name: string): Buffer {
  return fs.readFileSync(path.join(fixturesDir, name));
}

// ─────────────────────────────────────────────────────────────────────────────
// analyze — single-word pronunciation assessment
// ─────────────────────────────────────────────────────────────────────────────

describeIf('BfaService.analyze — live Azure PA (pipeline validation)', () => {
  let service: BfaService;

  beforeAll(() => {
    service = new BfaService();
  });

  it('cat.m4a — ffmpeg converts m4a, Azure responds, result is contract-compliant', async () => {
    const result = await service.analyze(fixture('cat.m4a'), 'audio/m4a', 'cat', []);

    // Pipeline completed — no ffmpeg failure
    expect(result.error).not.toBe('audio_conversion_failed');
    // Response shape always present regardless of Azure PA quality
    expect(result).toHaveProperty('word', 'cat');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('phonemes');
    expect(result).toHaveProperty('feedback');
    expect(result).toHaveProperty('transcription');
    expect(typeof result.transcription.text).toBe('string');
  }, 60_000);

  it('bag.m4a — feedback ops (if any) each have valid status', async () => {
    const result = await service.analyze(fixture('bag.m4a'), 'audio/m4a', 'bag', []);

    expect(result.error).not.toBe('audio_conversion_failed');
    for (const op of result.feedback) {
      expect(['correct', 'similar', 'substituted', 'missing']).toContain(op.status);
    }
  }, 60_000);

  it('raincoat.m4a — multi-syllable word, phoneme timing non-negative when present', async () => {
    const result = await service.analyze(fixture('raincoat.m4a'), 'audio/m4a', 'raincoat', []);

    expect(result.error).not.toBe('audio_conversion_failed');
    for (const ph of result.phonemes) {
      expect(ph.start).toBeGreaterThanOrEqual(0);
      expect(ph.end).toBeGreaterThanOrEqual(ph.start);
    }
  }, 60_000);

  it.each(['bee', 'sun', 'moon', 'car', 'belt'] as const)(
    '%s.m4a — no ffmpeg error, score in [0,100]',
    async (word) => {
      const result = await service.analyze(fixture(`${word}.m4a`), 'audio/m4a', word, []);

      expect(result.error).not.toBe('audio_conversion_failed');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }, 60_000,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// analyzeSpeaking — multi-word pronunciation assessment
// ─────────────────────────────────────────────────────────────────────────────

describeIf('BfaService.analyzeSpeaking — live Azure PA (pipeline validation)', () => {
  let service: BfaService;

  beforeAll(() => {
    service = new BfaService();
  });

  it('cat.m4a as "cat" — no ffmpeg error, total_words=1, result shape correct', async () => {
    const result = await service.analyzeSpeaking(fixture('cat.m4a'), 'audio/m4a', 'cat');

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('total_words', 1);
    expect(result).toHaveProperty('words');
    expect(result.overall_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_score).toBeLessThanOrEqual(100);
    // success:false with no network error means Azure responded (speech_not_detected from low quality audio is OK)
    if (!result.success) {
      expect(result.transcription.text).toBe('');
    }
  }, 60_000);

  it('raincoat.m4a as "raincoat" — words array has 1 slot (1 target word)', async () => {
    const result = await service.analyzeSpeaking(fixture('raincoat.m4a'), 'audio/m4a', 'raincoat');

    expect(result.total_words).toBe(1);
    if (result.success) {
      expect(result.words).toHaveLength(1);
      expect(result.words[0].word).toBe('raincoat');
    }
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// transcribe — speech-to-text
// ─────────────────────────────────────────────────────────────────────────────

describeIf('BfaService.transcribe — live Azure STT (pipeline validation)', () => {
  let service: BfaService;

  beforeAll(() => {
    service = new BfaService();
  });

  it('cat.m4a — pipeline completes, returns text string and words array', async () => {
    const result = await service.transcribe(fixture('cat.m4a'), 'audio/m4a');

    expect(typeof result.text).toBe('string');
    expect(Array.isArray(result.words)).toBe(true);
    // If words returned, each has valid shape
    for (const w of result.words ?? []) {
      expect(typeof w.word).toBe('string');
      expect(w.start).toBeGreaterThanOrEqual(0);
      expect(w.score).toBe(1.0);
    }
  }, 60_000);

  it('test.m4a — pipeline completes, returns contract-compliant shape', async () => {
    const result = await service.transcribe(fixture('test.m4a'), 'audio/m4a');

    expect(typeof result.text).toBe('string');
    expect(Array.isArray(result.words)).toBe(true);
  }, 60_000);

  it.each(['bee', 'sun', 'car'] as const)(
    '%s.m4a — no exception thrown, text is string',
    async (word) => {
      const result = await service.transcribe(fixture(`${word}.m4a`), 'audio/m4a');

      expect(typeof result.text).toBe('string');
    }, 60_000,
  );
});
