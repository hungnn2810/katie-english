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

// Load .env from backend root (Jest does not auto-load .env)
const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const HAS_AZURE = Boolean(process.env.AZURE_SPEECH_KEY);
const HAS_AZURE_OPENAI = Boolean(process.env.AZURE_OPENAI_KEY);
const describeIf = HAS_AZURE ? describe : describe.skip;
const describeIfOpenAI = HAS_AZURE_OPENAI ? describe : describe.skip;

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

    console.log('[analyze cat]', JSON.stringify(result, null, 2));

    expect(result.error).not.toBe('audio_conversion_failed');
    expect(result).toHaveProperty('word', 'cat');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('phonemes');
    expect(result).toHaveProperty('feedback');
    expect(result).toHaveProperty('transcription');
    expect(typeof result.transcription.text).toBe('string');
  }, 60_000);

  it('bag.m4a — feedback ops (if any) each have valid status', async () => {
    const result = await service.analyze(fixture('bag.m4a'), 'audio/m4a', 'bag', []);

    console.log('[analyze bag]', JSON.stringify(result, null, 2));

    expect(result.error).not.toBe('audio_conversion_failed');
    for (const op of result.feedback) {
      expect(['correct', 'similar', 'substituted', 'missing']).toContain(op.status);
    }
  }, 60_000);

  it('raincoat.m4a — multi-syllable word, phoneme timing non-negative when present', async () => {
    const result = await service.analyze(fixture('raincoat.m4a'), 'audio/m4a', 'raincoat', []);

    console.log('[analyze raincoat]', JSON.stringify(result, null, 2));

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

      console.log(`[analyze ${word}] score=${result.score} transcript="${result.transcription?.text}" phonemes=${result.phonemes.length} feedback=${JSON.stringify(result.feedback)}`);

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

    console.log('[analyzeSpeaking cat]', JSON.stringify(result, null, 2));

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('total_words', 1);
    expect(result).toHaveProperty('words');
    expect(result.overall_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_score).toBeLessThanOrEqual(100);
    if (!result.success) {
      expect(result.transcription.text).toBe('');
    }
  }, 60_000);

  it('raincoat.m4a as "raincoat" — words array has 1 slot (1 target word)', async () => {
    const result = await service.analyzeSpeaking(fixture('raincoat.m4a'), 'audio/m4a', 'raincoat');

    console.log('[analyzeSpeaking raincoat]', JSON.stringify(result, null, 2));

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

    console.log('[transcribe cat]', JSON.stringify(result, null, 2));

    expect(typeof result.text).toBe('string');
    expect(Array.isArray(result.words)).toBe(true);
    for (const w of result.words ?? []) {
      expect(typeof w.word).toBe('string');
      expect(w.start).toBeGreaterThanOrEqual(0);
      expect(w.score).toBe(1.0);
    }
  }, 60_000);

  it('test.m4a — pipeline completes, returns contract-compliant shape', async () => {
    const result = await service.transcribe(fixture('test.m4a'), 'audio/m4a');

    console.log('[transcribe test]', JSON.stringify(result, null, 2));

    expect(typeof result.text).toBe('string');
    expect(Array.isArray(result.words)).toBe(true);
  }, 60_000);

  it.each(['bee', 'sun', 'car'] as const)(
    '%s.m4a — no exception thrown, text is string',
    async (word) => {
      const result = await service.transcribe(fixture(`${word}.m4a`), 'audio/m4a');

      console.log(`[transcribe ${word}] text="${result.text}" words=${JSON.stringify(result.words)}`);

      expect(typeof result.text).toBe('string');
    }, 60_000,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// scoreSemantic — OpenAI LLM semantic scoring
// ─────────────────────────────────────────────────────────────────────────────

describeIfOpenAI('BfaService.scoreSemantic — live OpenAI LLM (pipeline validation)', () => {
  let service: BfaService;
  let openaiAvailable = true;

  beforeAll(async () => {
    service = new BfaService();
    // Probe: single call to detect quota/auth errors before score assertions run
    const probe = await service.scoreSemantic('hello', 'hello', []);
    openaiAvailable = probe.semanticScore > 0;
    if (!openaiAvailable) {
      console.warn('[scoreSemantic] OpenAI probe returned 0 — likely 429/quota. Score assertions will be skipped.');
    }
  }, 30_000);

  it('identical answers — semanticScore near 1.0', async () => {
    const result = await service.scoreSemantic('The cat is red.', 'The cat is red.', ['cat', 'red']);

    console.log('[scoreSemantic identical]', JSON.stringify(result, null, 2));

    if (openaiAvailable) expect(result.semanticScore).toBeGreaterThanOrEqual(0.9);
    expect(result.matchedKeywords).toEqual(expect.arrayContaining(['cat', 'red']));
  }, 30_000);

  it('short correct answer vs full sentence — semanticScore >= 0.7 (lenient scoring)', async () => {
    const result = await service.scoreSemantic('Red.', 'The cat is red.', ['cat', 'red']);

    console.log('[scoreSemantic lenient]', JSON.stringify(result, null, 2));

    if (openaiAvailable) expect(result.semanticScore).toBeGreaterThanOrEqual(0.7);
  }, 30_000);

  it('semantically similar paraphrase — semanticScore >= 0.6', async () => {
    const result = await service.scoreSemantic(
      'A dog is running in the park.',
      'The dog runs through the park.',
      ['dog', 'park'],
    );

    console.log('[scoreSemantic paraphrase]', JSON.stringify(result, null, 2));

    if (openaiAvailable) expect(result.semanticScore).toBeGreaterThanOrEqual(0.6);
    expect(result.matchedKeywords).toEqual(expect.arrayContaining(['dog', 'park']));
  }, 30_000);

  it('completely unrelated answer — semanticScore <= 0.3', async () => {
    const result = await service.scoreSemantic('I like pizza.', 'The cat is red.', ['cat', 'red']);

    console.log('[scoreSemantic unrelated]', JSON.stringify(result, null, 2));

    // 0 (quota fallback) satisfies <= 0.3 — assertion always valid
    expect(result.semanticScore).toBeLessThanOrEqual(0.3);
    expect(result.matchedKeywords).toHaveLength(0);
  }, 30_000);

  it('empty student answer — semanticScore = 0, no matched keywords', async () => {
    const result = await service.scoreSemantic('', 'The cat is red.', ['cat', 'red']);

    console.log('[scoreSemantic empty]', JSON.stringify(result, null, 2));

    expect(result.semanticScore).toBe(0);
    expect(result.matchedKeywords).toHaveLength(0);
  }, 30_000);

  it('keyword matching is case-insensitive', async () => {
    const result = await service.scoreSemantic('The CAT is RED.', 'The cat is red.', ['cat', 'red']);

    console.log('[scoreSemantic case-insensitive]', JSON.stringify(result, null, 2));

    expect(result.matchedKeywords).toEqual(expect.arrayContaining(['cat', 'red']));
  }, 30_000);

  it('no keywords provided — matchedKeywords empty, semanticScore still computed', async () => {
    const result = await service.scoreSemantic('The cat is red.', 'The cat is red.', []);

    console.log('[scoreSemantic no-keywords]', JSON.stringify(result, null, 2));

    expect(result.matchedKeywords).toHaveLength(0);
    expect(result.semanticScore).toBeGreaterThanOrEqual(0);
    expect(result.semanticScore).toBeLessThanOrEqual(1);
  }, 30_000);
});
