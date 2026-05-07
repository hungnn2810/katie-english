import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GameService } from './game.service';
import { GameRepository } from './game.repository';
import { StorageService } from '../storage/storage.service';
import { BfaService } from '../bfa/bfa.service';
import { calcScore, levenshtein } from './game.scoring';

// ── helpers ──────────────────────────────────────────────────────────────────

const mockSession = (overrides = {}) => ({
  id: 1,
  studentId: 1,
  homeworkId: 1,
  completedAt: null,
  homework: {
    parts: [
      {
        id: 1,
        homeworkId: 1,
        type: 'SPELLING',
        orderIndex: 0,
        phonicsItems: [],
        words: [
          {
            wordId: 10,
            orderIndex: 0,
            word: {
              id: 10,
              text: 'cat',
              wordPhonemes: [
                { phoneme: { symbol: 'c' } },
                { phoneme: { symbol: 'a' } },
                { phoneme: { symbol: 't' } },
              ],
            },
          },
        ],
      },
    ],
  },
  wordResults: [],
  ...overrides,
});

const mockBfaSuccess = (score: number, phonemes = ['k', 'æ', 't']) => ({
  success: true,
  score,
  phonemes: phonemes.map((a) => ({ ipa: a, symbol: a.toLowerCase(), start: 0, end: 0.1, duration: 0.1 })),
  feedback: [],
  word: 'cat',
});

const mockBfaFail = () => ({ success: false, score: 0, phonemes: [], feedback: [], word: 'cat' });

// ── levenshtein ───────────────────────────────────────────────────────────────

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => expect(levenshtein('cat', 'cat')).toBe(0));
  it('returns string length for empty other', () => expect(levenshtein('cat', '')).toBe(3));
  it('returns 1 for single substitution', () => expect(levenshtein('cat', 'bat')).toBe(1));
  it('returns 1 for single insertion', () => expect(levenshtein('cat', 'cats')).toBe(1));
  it('returns 1 for single deletion', () => expect(levenshtein('cats', 'cat')).toBe(1));
  it('handles empty strings', () => expect(levenshtein('', '')).toBe(0));
});

// ── calcScore ─────────────────────────────────────────────────────────────────

describe('calcScore', () => {
  it('returns 100 for exact match', () => expect(calcScore('cat', 'cat')).toBe(100));
  it('returns 100 when target word appears in sentence', () => expect(calcScore('I said cat loudly', 'cat')).toBe(100));
  it('returns 100 for case-insensitive match', () => expect(calcScore('CAT', 'cat')).toBe(100));
  it('returns 100 with extra whitespace', () => expect(calcScore('  cat  ', 'cat')).toBe(100));

  it('returns 0 for empty transcription', () => expect(calcScore('', 'cat')).toBe(0));
  it('returns 0 for blank transcription', () => expect(calcScore('   ', 'cat')).toBe(0));
  it('returns 0 for empty target', () => expect(calcScore('cat', '')).toBe(0));

  it('picks best word from multi-word transcription', () => {
    // "bat" is 1 edit from "cat", "xyz" is 3 edits — should pick "bat"
    expect(calcScore('bat xyz', 'cat')).toBeGreaterThan(calcScore('xyz', 'cat'));
  });

  it('scores close words higher than distant words', () => {
    const close = calcScore('bat', 'cat');   // 1 edit / max(3,3) = 67%
    const distant = calcScore('dog', 'cat'); // 3 edits / max(3,3) = 0%
    expect(close).toBeGreaterThan(distant);
  });

  it('scores partial match proportionally', () => {
    const score = calcScore('bat', 'cat');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it('handles longer word vs shorter target', () => {
    // "cats" vs "cat": 1 edit / max(4,3) = 75%
    const score = calcScore('cats', 'cat');
    expect(score).toBe(75);
  });

  it('handles shorter word vs longer target', () => {
    // "ca" vs "cat": 1 edit / max(2,3) = 67%
    const score = calcScore('ca', 'cat');
    expect(score).toBe(67);
  });

  it('returns 0 when nothing close', () => {
    expect(calcScore('xyz', 'cat')).toBe(0);
  });
});

// ── GameService.saveWordResult ────────────────────────────────────────────────

describe('GameService.saveWordResult', () => {
  let service: GameService;
  let repo: jest.Mocked<GameRepository>;
  let bfa: jest.Mocked<BfaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: GameRepository,
          useValue: {
            getSession: jest.fn(), createSession: jest.fn(), saveWordResult: jest.fn(),
            completeSession: jest.fn(), listSessions: jest.fn(), getAvailableHomework: jest.fn(),
          },
        },
        { provide: StorageService, useValue: { upload: jest.fn(), getObject: jest.fn() } },
        { provide: BfaService, useValue: { align: jest.fn() } },
      ],
    }).compile();

    service = module.get(GameService);
    repo = module.get(GameRepository);
    bfa = module.get(BfaService);

    repo.saveWordResult.mockResolvedValue({ id: 1, sessionId: 1, wordId: 10, transcribedText: '', score: 0 } as any);
  });

  it('uses BFA score when BFA succeeds', async () => {
    repo.getSession.mockResolvedValue(mockSession() as any);
    bfa.align.mockResolvedValue(mockBfaSuccess(87) as any);

    await service.saveWordResult(1, { wordId: 10, transcribedText: '' }, Buffer.from('audio'), 'audio/webm');

    expect(repo.saveWordResult).toHaveBeenCalledWith(1, 10, '', 87);
  });

  it('uses BFA score when word has no DB phonemes (espeak fallback in BFA)', async () => {
    const session = mockSession();
    (session.homework.parts[0].words[0].word as any).wordPhonemes = [];
    repo.getSession.mockResolvedValue(session as any);
    bfa.align.mockResolvedValue(mockBfaSuccess(75) as any);

    await service.saveWordResult(1, { wordId: 10, transcribedText: '' }, Buffer.from('audio'), 'audio/webm');

    expect(repo.saveWordResult).toHaveBeenCalledWith(1, 10, '', 75);
  });

  it('falls back to Levenshtein when BFA returns success=false', async () => {
    repo.getSession.mockResolvedValue(mockSession() as any);
    bfa.align.mockResolvedValue(mockBfaFail() as any);

    await service.saveWordResult(1, { wordId: 10, transcribedText: 'cat' }, Buffer.from('audio'), 'audio/webm');

    expect(repo.saveWordResult).toHaveBeenCalledWith(1, 10, 'cat', 100);
  });

  it('falls back to Levenshtein when BFA throws', async () => {
    repo.getSession.mockResolvedValue(mockSession() as any);
    bfa.align.mockRejectedValue(new Error('BFA service unreachable'));

    await service.saveWordResult(1, { wordId: 10, transcribedText: 'cat' }, Buffer.from('audio'), 'audio/webm');

    expect(repo.saveWordResult).toHaveBeenCalledWith(1, 10, 'cat', 100);
  });

  it('scores 0 when BFA fails AND transcribedText empty', async () => {
    repo.getSession.mockResolvedValue(mockSession() as any);
    bfa.align.mockResolvedValue(mockBfaFail() as any);

    await service.saveWordResult(1, { wordId: 10, transcribedText: '' }, Buffer.from('audio'), 'audio/webm');

    expect(repo.saveWordResult).toHaveBeenCalledWith(1, 10, '', 0);
  });

  it('uses Levenshtein only when no audio buffer', async () => {
    repo.getSession.mockResolvedValue(mockSession() as any);

    await service.saveWordResult(1, { wordId: 10, transcribedText: 'cat' });

    expect(bfa.align).not.toHaveBeenCalled();
    expect(repo.saveWordResult).toHaveBeenCalledWith(1, 10, 'cat', 100);
  });

  it('scores 0 when no audio and transcribedText empty', async () => {
    repo.getSession.mockResolvedValue(mockSession() as any);

    await service.saveWordResult(1, { wordId: 10, transcribedText: '' });

    expect(repo.saveWordResult).toHaveBeenCalledWith(1, 10, '', 0);
  });

  it('throws NotFoundException when session not found', async () => {
    repo.getSession.mockResolvedValue(null as any);
    await expect(service.saveWordResult(99, { wordId: 10, transcribedText: 'cat' }))
      .rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when word not in homework', async () => {
    repo.getSession.mockResolvedValue(mockSession() as any);
    await expect(service.saveWordResult(1, { wordId: 999, transcribedText: 'cat' }))
      .rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when session already completed', async () => {
    repo.getSession.mockResolvedValue(mockSession({ completedAt: new Date() }) as any);
    await expect(service.saveWordResult(1, { wordId: 10, transcribedText: 'cat' }))
      .rejects.toThrow(BadRequestException);
  });
});

// ── GameService.completeSession ───────────────────────────────────────────────

describe('GameService.completeSession', () => {
  let service: GameService;
  let repo: jest.Mocked<GameRepository>;

  const makeSession = (wordScores: number[]) => ({
    id: 1,
    completedAt: null,
    videoUrl: null,
    homework: { words: wordScores.map((_, i) => ({ wordId: i + 1 })) },
    wordResults: wordScores.map((score, i) => ({ id: i + 1, wordId: i + 1, score })),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: GameRepository,
          useValue: {
            getSession: jest.fn(), createSession: jest.fn(), saveWordResult: jest.fn(),
            completeSession: jest.fn(), listSessions: jest.fn(), getAvailableHomework: jest.fn(),
          },
        },
        { provide: StorageService, useValue: { upload: jest.fn(), getObject: jest.fn() } },
        { provide: BfaService, useValue: { align: jest.fn() } },
      ],
    }).compile();

    service = module.get(GameService);
    repo = module.get(GameRepository);
    repo.completeSession.mockResolvedValue({} as any);
  });

  it('averages over total words, not answered words', async () => {
    // 5 words total, only 2 answered with 100 → avg should be 40, not 100
    repo.getSession.mockResolvedValue(makeSession([100, 100, 0, 0, 0]) as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 40);
  });

  it('gives 0 when no words answered', async () => {
    repo.getSession.mockResolvedValue(makeSession([0, 0, 0]) as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 0);
  });

  it('gives 100 when all words perfect', async () => {
    repo.getSession.mockResolvedValue(makeSession([100, 100, 100]) as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 100);
  });

  it('rounds score to integer', async () => {
    // [100, 0, 0] / 3 = 33.33 → rounds to 33
    repo.getSession.mockResolvedValue(makeSession([100, 0, 0]) as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 33);
  });

  it('throws NotFoundException when session not found', async () => {
    repo.getSession.mockResolvedValue(null as any);
    await expect(service.completeSession(99)).rejects.toThrow(NotFoundException);
  });
});
