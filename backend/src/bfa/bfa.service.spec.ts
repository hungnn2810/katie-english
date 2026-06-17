/**
 * Unit tests for BfaService — Azure Pronunciation Assessment integration.
 *
 * Covers: mapPhonemeOps score-band logic, analyze(), analyzeSpeaking(),
 * transcribe(), and scoreSemantic(). All external I/O (axios, execFile, fs/promises)
 * is mocked — no live Azure calls or filesystem access.
 *
 * VOCAB-04: 'similar' status is purely score-band driven via Azure AccuracyScore.
 * D-08 (old Python phoneme-pair frozenset) no longer applies.
 */

import { BfaService, mapPhonemeOps } from './bfa.service';
import axios from 'axios';
import { execFile } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import * as path from 'path';

jest.mock('axios');
jest.mock('child_process', () => ({ execFile: jest.fn() }));
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
}));

const mockPost = axios.post as jest.Mock;
// execFile has complex overloads — cast through unknown so mockImplementation accepts any fn shape
const mockExecFile = execFile as unknown as jest.Mock;
const mockReadFile = readFile as unknown as jest.Mock;
const mockWriteFile = writeFile as unknown as jest.Mock;
const mockUnlink = unlink as unknown as jest.Mock;

const WAV = Buffer.from('RIFF....wav');

// ─────────────────────────────────────────────────────────────────────────────
// Test data builders
// ─────────────────────────────────────────────────────────────────────────────

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
    Phonemes: [{
      Phoneme: phonemeSymbol,
      PronunciationAssessment: { AccuracyScore: accuracyScore },
      Offset: offset,
      Duration: duration,
    }],
  };
}

function singleWordPA(word: string, wordScore: number, phonemes: any[]) {
  return {
    RecognitionStatus: 'Success',
    DisplayText: `${word}.`,
    NBest: [{
      PronunciationAssessment: { AccuracyScore: wordScore },
      Words: [{
        Word: word,
        Offset: 1_000_000,
        Duration: 4_000_000,
        PronunciationAssessment: { AccuracyScore: wordScore, ErrorType: 'None' },
        Phonemes: phonemes,
      }],
    }],
  };
}

const CAT_PHONEMES = [
  { Phoneme: 'k', PronunciationAssessment: { AccuracyScore: 95 }, Offset: 1_000_000, Duration: 800_000 },
  { Phoneme: 'ae', PronunciationAssessment: { AccuracyScore: 85 }, Offset: 1_800_000, Duration: 1_200_000 },
  { Phoneme: 't', PronunciationAssessment: { AccuracyScore: 92 }, Offset: 3_000_000, Duration: 800_000 },
];

const THREE_WORD_PA = {
  RecognitionStatus: 'Success',
  DisplayText: 'the cat sat.',
  NBest: [{
    PronunciationAssessment: { AccuracyScore: 88 },
    Words: [
      {
        Word: 'the',
        PronunciationAssessment: { AccuracyScore: 92, ErrorType: 'None' },
        Phonemes: [{ Phoneme: 'dh', PronunciationAssessment: { AccuracyScore: 92 }, Offset: 0, Duration: 300_000 }],
      },
      {
        Word: 'cat',
        PronunciationAssessment: { AccuracyScore: 85, ErrorType: 'None' },
        Phonemes: [{ Phoneme: 'k', PronunciationAssessment: { AccuracyScore: 85 }, Offset: 300_000, Duration: 500_000 }],
      },
      {
        Word: 'sat',
        PronunciationAssessment: { AccuracyScore: 78, ErrorType: 'None' },
        Phonemes: [{ Phoneme: 's', PronunciationAssessment: { AccuracyScore: 78 }, Offset: 800_000, Duration: 500_000 }],
      },
    ],
  }],
};

const STT_RESPONSE = {
  RecognitionStatus: 'Success',
  DisplayText: 'hello world.',
  NBest: [{
    Words: [
      { Word: 'hello', Offset: 0, Duration: 3_000_000 },
      { Word: 'world', Offset: 4_000_000, Duration: 3_000_000 },
    ],
  }],
};

// ─────────────────────────────────────────────────────────────────────────────
// mapPhonemeOps — score-band logic (VOCAB-04)
// ─────────────────────────────────────────────────────────────────────────────

describe('mapPhonemeOps — score-band [50, 80)', () => {
  it('score 65 → similar (VOCAB-04: cat→cap /t/→/p/ confusion)', () => {
    const ops = mapPhonemeOps(makeWordData({ phonemeSymbol: 'p', accuracyScore: 65 }));
    expect(ops).toHaveLength(1);
    expect(ops[0].status).toBe('similar');
    expect(ops[0].expected).toBe('p');
  });

  it('score 50 (lower boundary) → similar', () => {
    expect(mapPhonemeOps(makeWordData({ accuracyScore: 50 }))[0].status).toBe('similar');
  });

  it('score 79 (just below correct threshold) → similar', () => {
    expect(mapPhonemeOps(makeWordData({ accuracyScore: 79 }))[0].status).toBe('similar');
  });

  it('score 80 (correct threshold) → correct', () => {
    expect(mapPhonemeOps(makeWordData({ accuracyScore: 80 }))[0].status).toBe('correct');
  });

  it('score 100 → correct', () => {
    expect(mapPhonemeOps(makeWordData({ accuracyScore: 100 }))[0].status).toBe('correct');
  });

  it('score 49 (below similar threshold) → substituted', () => {
    expect(mapPhonemeOps(makeWordData({ accuracyScore: 49 }))[0].status).toBe('substituted');
  });

  it('score 0 → substituted', () => {
    expect(mapPhonemeOps(makeWordData({ accuracyScore: 0 }))[0].status).toBe('substituted');
  });

  it('ErrorType Omission → missing regardless of score, no timing fields', () => {
    const ops = mapPhonemeOps(makeWordData({ errorType: 'Omission', accuracyScore: 90 }));
    expect(ops[0].status).toBe('missing');
    expect(ops[0].aligned).toBeNull();
    expect(ops[0].start).toBeUndefined();
    expect(ops[0].end).toBeUndefined();
    expect(ops[0].duration).toBeUndefined();
  });

  it('timing: 1_000_000 ticks offset → 0.1s start, 500_000 ticks → 0.05s duration', () => {
    const ops = mapPhonemeOps(makeWordData({ accuracyScore: 85, offset: 1_000_000, duration: 500_000 }));
    expect(ops[0].status).toBe('correct');
    expect(ops[0].start).toBeCloseTo(0.1, 3);
    expect(ops[0].duration).toBeCloseTo(0.05, 3);
    expect(ops[0].end).toBeCloseTo(0.15, 3);
  });

  it('empty Phonemes array → []', () => {
    expect(mapPhonemeOps({ PronunciationAssessment: { ErrorType: 'None' }, Phonemes: [] })).toHaveLength(0);
  });

  it('missing PronunciationAssessment → score defaults 0 → substituted', () => {
    const ops = mapPhonemeOps({ Phonemes: [{ Phoneme: 't', Offset: 0, Duration: 0 }] });
    expect(ops[0].status).toBe('substituted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BfaService — Azure REST integration
// ─────────────────────────────────────────────────────────────────────────────

// Helper: sets up execFile mock to call callback with null (success) or error.
function mockExecSuccess() {
  mockExecFile.mockImplementation((...args: any[]) => {
    const cb = args[args.length - 1];
    if (typeof cb === 'function') cb(null);
  });
}

function mockExecFailOnce(message: string) {
  mockExecFile.mockImplementationOnce((...args: any[]) => {
    const cb = args[args.length - 1];
    if (typeof cb === 'function') cb(new Error(message));
  });
}

describe('BfaService', () => {
  let service: BfaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecSuccess();
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(WAV);
    mockUnlink.mockResolvedValue(undefined);
    service = new BfaService();
  });

  // ── analyze ────────────────────────────────────────────────────────────────

  describe('analyze', () => {
    it('happy path — score, phoneme ops, and transcript from Azure PA', async () => {
      mockPost.mockResolvedValueOnce({ data: singleWordPA('cat', 90, CAT_PHONEMES) });

      const result = await service.analyze(Buffer.from('audio'), 'audio/webm', 'cat', []);

      expect(result.success).toBe(true);
      expect(result.score).toBe(90);
      expect(result.word).toBe('cat');
      expect(result.transcription.text).toBe('cat');
      expect(result.phonemes).toHaveLength(3);
      expect(result.feedback).toHaveLength(3);
      expect(result.feedback.every((op) => op.status === 'correct')).toBe(true);
    });

    it('trailing period stripped from transcript', async () => {
      mockPost.mockResolvedValueOnce({ data: singleWordPA('dog', 85, [
        { Phoneme: 'd', PronunciationAssessment: { AccuracyScore: 88 }, Offset: 0, Duration: 500_000 },
      ]) });

      const result = await service.analyze(Buffer.from('audio'), 'audio/webm', 'dog', []);

      expect(result.transcription.text).toBe('dog');
    });

    it('ffmpeg failure → success:false, error:audio_conversion_failed, no Azure call', async () => {
      mockExecFailOnce('ffmpeg not found');

      const result = await service.analyze(Buffer.from('audio'), 'audio/webm', 'cat', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('audio_conversion_failed');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('Azure PA throws (network error) → success:false, error:speech_not_detected', async () => {
      mockPost.mockRejectedValueOnce(new Error('ECONNRESET'));

      const result = await service.analyze(Buffer.from('audio'), 'audio/webm', 'cat', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('speech_not_detected');
    });

    it('RecognitionStatus NoMatch → success:false, error:speech_not_detected', async () => {
      mockPost.mockResolvedValueOnce({ data: { RecognitionStatus: 'NoMatch', DisplayText: '', NBest: [] } });

      const result = await service.analyze(Buffer.from('audio'), 'audio/webm', 'cat', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('speech_not_detected');
    });

    it('sends audio to Azure PA with Pronunciation-Assessment header containing referenceText', async () => {
      mockPost.mockResolvedValueOnce({ data: singleWordPA('cat', 90, []) });

      await service.analyze(Buffer.from('audio'), 'audio/webm', 'cat', []);

      const [url, , config] = mockPost.mock.calls[0];
      expect(url).toContain('language=en-US');
      const paCfg = config.headers['Pronunciation-Assessment'] as string;
      const decoded = JSON.parse(Buffer.from(paCfg, 'base64').toString('utf8')) as { ReferenceText: string };
      expect(decoded.ReferenceText).toBe('cat');
      expect(config.headers['Content-Type']).toBe('audio/wav; codecs=audio/pcm; samplerate=16000');
    });
  });

  // ── analyzeSpeaking ────────────────────────────────────────────────────────

  describe('analyzeSpeaking', () => {
    it('happy path — overall score, per-word results, and word list', async () => {
      mockPost.mockResolvedValueOnce({ data: THREE_WORD_PA });

      const result = await service.analyzeSpeaking(Buffer.from('audio'), 'audio/webm', 'the cat sat');

      expect(result.success).toBe(true);
      expect(result.overall_score).toBe(88);
      expect(result.total_words).toBe(3);
      expect(result.words).toHaveLength(3);
      expect(result.words.map((w) => w.word)).toEqual(['the', 'cat', 'sat']);
    });

    it('matched_words counts words with score >= MIN_WORD_SCORE (70)', async () => {
      mockPost.mockResolvedValueOnce({ data: THREE_WORD_PA });

      const result = await service.analyzeSpeaking(Buffer.from('audio'), 'audio/webm', 'the cat sat');

      // scores 92, 85, 78 — all above 70
      expect(result.matched_words).toBe(3);
    });

    it('insertion words filtered before positional alignment', async () => {
      const withInsertion = {
        ...THREE_WORD_PA,
        NBest: [{
          ...THREE_WORD_PA.NBest[0],
          Words: [
            { Word: 'um', PronunciationAssessment: { AccuracyScore: 0, ErrorType: 'Insertion' }, Phonemes: [] },
            ...THREE_WORD_PA.NBest[0].Words,
          ],
        }],
      };
      mockPost.mockResolvedValueOnce({ data: withInsertion });

      const result = await service.analyzeSpeaking(Buffer.from('audio'), 'audio/webm', 'the cat sat');

      expect(result.words[0].word).toBe('the');
      expect(result.words[1].word).toBe('cat');
      expect(result.words[2].word).toBe('sat');
    });

    it('ffmpeg failure → success:false, correct total_words count, no Azure call', async () => {
      mockExecFailOnce('ffmpeg error');

      const result = await service.analyzeSpeaking(Buffer.from('audio'), 'audio/webm', 'hello world');

      expect(result.success).toBe(false);
      expect(result.total_words).toBe(2);
      expect(result.words).toHaveLength(0);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('Azure PA throws → success:false, zero scores', async () => {
      mockPost.mockRejectedValueOnce(new Error('timeout'));

      const result = await service.analyzeSpeaking(Buffer.from('audio'), 'audio/webm', 'the cat');

      expect(result.success).toBe(false);
      expect(result.overall_score).toBe(0);
      expect(result.matched_words).toBe(0);
    });

    it('RecognitionStatus InitialSilenceTimeout → success:false, empty transcript', async () => {
      mockPost.mockResolvedValueOnce({ data: { RecognitionStatus: 'InitialSilenceTimeout', DisplayText: '', NBest: [] } });

      const result = await service.analyzeSpeaking(Buffer.from('audio'), 'audio/webm', 'hello');

      expect(result.success).toBe(false);
      expect(result.transcription.text).toBe('');
    });
  });

  // ── transcribe ─────────────────────────────────────────────────────────────

  describe('transcribe', () => {
    it('happy path — text and word timestamps from Azure STT', async () => {
      mockPost.mockResolvedValueOnce({ data: STT_RESPONSE });

      const result = await service.transcribe(Buffer.from('audio'), 'audio/webm');

      expect(result.text).toBe('hello world');
      expect(result.words).toHaveLength(2);
      expect(result.words![0].word).toBe('hello');
      expect(result.words![0].start).toBeCloseTo(0, 3);
      expect(result.words![0].end).toBeCloseTo(0.3, 3);
      expect(result.words![1].start).toBeCloseTo(0.4, 3);
      expect(result.words![1].end).toBeCloseTo(0.7, 3);
    });

    it('all word scores fixed at 1.0', async () => {
      mockPost.mockResolvedValueOnce({ data: STT_RESPONSE });

      const result = await service.transcribe(Buffer.from('audio'), 'audio/webm');

      expect(result.words!.every((w) => w.score === 1.0)).toBe(true);
    });

    it('trailing period stripped from transcript', async () => {
      mockPost.mockResolvedValueOnce({ data: STT_RESPONSE });

      const result = await service.transcribe(Buffer.from('audio'), 'audio/webm');

      expect(result.text).toBe('hello world');
      expect(result.text).not.toMatch(/\.$/);
    });

    it('ffmpeg failure → empty text and words, no Azure call', async () => {
      mockExecFailOnce('no ffmpeg');

      const result = await service.transcribe(Buffer.from('audio'), 'audio/webm');

      expect(result.text).toBe('');
      expect(result.words).toHaveLength(0);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('Azure STT throws → empty text and words', async () => {
      mockPost.mockRejectedValueOnce(new Error('network'));

      const result = await service.transcribe(Buffer.from('audio'), 'audio/webm');

      expect(result.text).toBe('');
      expect(result.words).toHaveLength(0);
    });

    it('RecognitionStatus EndOfDictation → empty text and words', async () => {
      mockPost.mockResolvedValueOnce({ data: { RecognitionStatus: 'EndOfDictation', DisplayText: '', NBest: [] } });

      const result = await service.transcribe(Buffer.from('audio'), 'audio/webm');

      expect(result.text).toBe('');
      expect(result.words).toHaveLength(0);
    });

    it('calls Azure STT URL without pronunciation params', async () => {
      mockPost.mockResolvedValueOnce({ data: STT_RESPONSE });

      await service.transcribe(Buffer.from('audio'), 'audio/webm');

      expect(mockPost).toHaveBeenCalledWith(
        expect.not.stringContaining('pronunciation.referenceText'),
        WAV,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
          }),
        }),
      );
    });
  });

  // ── scoreSemantic ──────────────────────────────────────────────────────────

  describe('scoreSemantic', () => {
    beforeEach(() => {
      process.env.AZURE_OPENAI_KEY = 'test-key';
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
      process.env.AZURE_OPENAI_DEPLOYMENT = 'gpt-4o-mini';
    });
    afterEach(() => {
      delete process.env.AZURE_OPENAI_KEY;
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_DEPLOYMENT;
    });

    it('happy path — keywords matched locally, semantic score from Azure OpenAI', async () => {
      mockPost.mockResolvedValueOnce({
        data: { choices: [{ message: { content: '{"semantic_score": 0.87}' } }] },
      });

      const result = await service.scoreSemantic('the cat sat on mat', 'the cat sat on the mat', ['cat', 'sat', 'mat']);

      expect(result.semanticScore).toBe(0.87);
      expect(result.matchedKeywords).toEqual(['cat', 'sat', 'mat']); // all 3 present in student text
    });

    it('Azure OpenAI throws → fallback {semanticScore: 0, matchedKeywords: local regex result}', async () => {
      mockPost.mockRejectedValueOnce(new Error('Azure OpenAI down'));

      const result = await service.scoreSemantic('hello', 'hello world', []);

      expect(result.semanticScore).toBe(0);
      expect(result.matchedKeywords).toHaveLength(0);
    });

    it('calls Azure OpenAI with api-key header and json_object response_format', async () => {
      mockPost.mockResolvedValueOnce({
        data: { choices: [{ message: { content: '{"semantic_score": 0.5}' } }] },
      });

      await service.scoreSemantic('student answer', 'expected answer', ['kw1']);

      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('test.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions'),
        expect.objectContaining({ response_format: { type: 'json_object' } }),
        expect.objectContaining({
          headers: expect.objectContaining({ 'api-key': 'test-key' }),
        }),
      );
    });

    it('AZURE_OPENAI_KEY not set → semanticScore=0, keywords still matched locally', async () => {
      delete process.env.AZURE_OPENAI_KEY;

      const result = await service.scoreSemantic('the cat sat', 'the cat sat', ['cat']);

      expect(result.semanticScore).toBe(0);
      expect(result.matchedKeywords).toEqual(['cat']);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Real .m4a fixture bytes — mocked execFile + fs/promises (no live I/O)
// ─────────────────────────────────────────────────────────────────────────────

describe('analyze — real .m4a fixture bytes (mocked execFile + fs/promises)', () => {
  const realFs = jest.requireActual<typeof import('fs')>('fs');
  const fixturesDir = path.join(__dirname, '..', 'game', '__fixtures__');

  let service: BfaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecFile.mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb(null);
    });
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(WAV);
    mockUnlink.mockResolvedValue(undefined);
    service = new BfaService();
  });

  it.each(['cat', 'bag', 'raincoat', 'test'] as const)(
    '%s.m4a — ffmpeg called with .m4a input extension',
    async (word) => {
      const m4aBuffer = realFs.readFileSync(path.join(fixturesDir, `${word}.m4a`));
      mockPost.mockResolvedValueOnce({ data: singleWordPA(word, 85, [
        { Phoneme: 'k', PronunciationAssessment: { AccuracyScore: 88 }, Offset: 0, Duration: 500_000 },
      ]) });

      const result = await service.analyze(m4aBuffer, 'audio/m4a', word, []);

      expect(result.success).toBe(true);
      const ffmpegArgs = mockExecFile.mock.calls[0][1] as string[];
      expect(ffmpegArgs[ffmpegArgs.indexOf('-i') + 1]).toMatch(/apa-in-.*\.m4a$/);
    },
  );

  it('audio/x-m4a MIME also maps to .m4a extension', async () => {
    const m4aBuffer = realFs.readFileSync(path.join(fixturesDir, 'cat.m4a'));
    mockPost.mockResolvedValueOnce({ data: singleWordPA('cat', 90, CAT_PHONEMES) });

    await service.analyze(m4aBuffer, 'audio/x-m4a', 'cat', []);

    const ffmpegArgs = mockExecFile.mock.calls[0][1] as string[];
    expect(ffmpegArgs[ffmpegArgs.indexOf('-i') + 1]).toMatch(/apa-in-.*\.m4a$/);
  });

  it('cat.m4a — score, phonemes, and transcript correct', async () => {
    const m4aBuffer = realFs.readFileSync(path.join(fixturesDir, 'cat.m4a'));
    mockPost.mockResolvedValueOnce({ data: singleWordPA('cat', 90, CAT_PHONEMES) });

    const result = await service.analyze(m4aBuffer, 'audio/m4a', 'cat', []);

    expect(result.success).toBe(true);
    expect(result.word).toBe('cat');
    expect(result.score).toBe(90);
    expect(result.transcription.text).toBe('cat');
    expect(result.phonemes).toHaveLength(3);
    expect(result.feedback.every((op) => op.status === 'correct')).toBe(true);
  });

  it('raincoat.m4a — multi-syllable: similar phonemes scored [50,80)', async () => {
    const m4aBuffer = realFs.readFileSync(path.join(fixturesDir, 'raincoat.m4a'));
    const raincoatPhonemes = [
      { Phoneme: 'r',  PronunciationAssessment: { AccuracyScore: 82 }, Offset: 0,         Duration: 600_000 },
      { Phoneme: 'eɪ', PronunciationAssessment: { AccuracyScore: 78 }, Offset: 600_000,   Duration: 800_000 },
      { Phoneme: 'n',  PronunciationAssessment: { AccuracyScore: 91 }, Offset: 1_400_000, Duration: 400_000 },
      { Phoneme: 'k',  PronunciationAssessment: { AccuracyScore: 88 }, Offset: 1_800_000, Duration: 600_000 },
      { Phoneme: 'oʊ', PronunciationAssessment: { AccuracyScore: 76 }, Offset: 2_400_000, Duration: 700_000 },
      { Phoneme: 't',  PronunciationAssessment: { AccuracyScore: 85 }, Offset: 3_100_000, Duration: 500_000 },
    ];
    mockPost.mockResolvedValueOnce({ data: singleWordPA('raincoat', 83, raincoatPhonemes) });

    const result = await service.analyze(m4aBuffer, 'audio/m4a', 'raincoat', []);

    expect(result.success).toBe(true);
    expect(result.score).toBe(83);
    expect(result.phonemes).toHaveLength(6);
    expect(result.feedback.filter((op) => op.status === 'similar')).toHaveLength(2);  // eɪ:78, oʊ:76
  });

  it('bag.m4a — substituted phoneme (score < 50) and similar phonemes', async () => {
    const m4aBuffer = realFs.readFileSync(path.join(fixturesDir, 'bag.m4a'));
    mockPost.mockResolvedValueOnce({ data: singleWordPA('bag', 55, [
      { Phoneme: 'b',  PronunciationAssessment: { AccuracyScore: 45 }, Offset: 0,         Duration: 400_000 },
      { Phoneme: 'ae', PronunciationAssessment: { AccuracyScore: 60 }, Offset: 400_000,   Duration: 600_000 },
      { Phoneme: 'g',  PronunciationAssessment: { AccuracyScore: 55 }, Offset: 1_000_000, Duration: 400_000 },
    ]) });

    const result = await service.analyze(m4aBuffer, 'audio/m4a', 'bag', []);

    expect(result.feedback.filter((op) => op.status === 'substituted')).toHaveLength(1); // b:45 < 50
    expect(result.feedback.filter((op) => op.status === 'similar')).toHaveLength(2);     // ae:60, g:55
  });

  it('buffer identity — real m4a bytes written to ffmpeg tmpIn (not truncated)', async () => {
    const m4aBuffer = realFs.readFileSync(path.join(fixturesDir, 'cat.m4a'));
    mockPost.mockResolvedValueOnce({ data: singleWordPA('cat', 90, []) });

    await service.analyze(m4aBuffer, 'audio/m4a', 'cat', []);

    const writtenBuffer = mockWriteFile.mock.calls[0][1] as Buffer;
    expect(writtenBuffer).toEqual(m4aBuffer);
  });
});

describe('analyzeSpeaking — real .m4a fixture bytes', () => {
  const realFs = jest.requireActual<typeof import('fs')>('fs');
  const fixturesDir = path.join(__dirname, '..', 'game', '__fixtures__');

  let service: BfaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecFile.mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb(null);
    });
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(WAV);
    mockUnlink.mockResolvedValue(undefined);
    service = new BfaService();
  });

  it('cat.m4a as speaking input — ffmpeg called with .m4a extension', async () => {
    const m4aBuffer = realFs.readFileSync(path.join(fixturesDir, 'cat.m4a'));
    mockPost.mockResolvedValueOnce({ data: THREE_WORD_PA });

    const result = await service.analyzeSpeaking(m4aBuffer, 'audio/m4a', 'the cat sat');

    expect(result.success).toBe(true);
    const ffmpegArgs = mockExecFile.mock.calls[0][1] as string[];
    expect(ffmpegArgs[ffmpegArgs.indexOf('-i') + 1]).toMatch(/apa-in-.*\.m4a$/);
  });

  it('audio/x-m4a variant — same .m4a extension', async () => {
    const m4aBuffer = realFs.readFileSync(path.join(fixturesDir, 'bag.m4a'));
    mockPost.mockResolvedValueOnce({ data: THREE_WORD_PA });

    await service.analyzeSpeaking(m4aBuffer, 'audio/x-m4a', 'the cat sat');

    const ffmpegArgs = mockExecFile.mock.calls[0][1] as string[];
    expect(ffmpegArgs[ffmpegArgs.indexOf('-i') + 1]).toMatch(/apa-in-.*\.m4a$/);
  });
});

describe('transcribe — real .m4a fixture bytes', () => {
  const realFs = jest.requireActual<typeof import('fs')>('fs');
  const fixturesDir = path.join(__dirname, '..', 'game', '__fixtures__');

  let service: BfaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecFile.mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb(null);
    });
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(WAV);
    mockUnlink.mockResolvedValue(undefined);
    service = new BfaService();
  });

  it('test.m4a — ffmpeg called with .m4a extension, STT transcript returned', async () => {
    const m4aBuffer = realFs.readFileSync(path.join(fixturesDir, 'test.m4a'));
    mockPost.mockResolvedValueOnce({ data: STT_RESPONSE });

    const result = await service.transcribe(m4aBuffer, 'audio/m4a');

    expect(result.text).toBe('hello world');
    const ffmpegArgs = mockExecFile.mock.calls[0][1] as string[];
    expect(ffmpegArgs[ffmpegArgs.indexOf('-i') + 1]).toMatch(/apa-in-.*\.m4a$/);
  });

  it('bee.m4a — buffer identity preserved to ffmpeg tmpIn', async () => {
    const m4aBuffer = realFs.readFileSync(path.join(fixturesDir, 'bee.m4a'));
    mockPost.mockResolvedValueOnce({ data: STT_RESPONSE });

    await service.transcribe(m4aBuffer, 'audio/m4a');

    const writtenBuffer = mockWriteFile.mock.calls[0][1] as Buffer;
    expect(writtenBuffer).toEqual(m4aBuffer);
  });
});
