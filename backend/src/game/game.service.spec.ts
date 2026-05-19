import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GameService } from './game.service';
import { GameRepository } from './game.repository';
import { StorageService } from '../storage/storage.service';
import { BfaService } from '../bfa/bfa.service';
import { WordRepository } from '../word/word.repository';
import { calcScore, levenshtein, calcSpeakingScore } from './game.scoring';
import { SaveReadingResultDto } from './game.dto';

// ── helpers ──────────────────────────────────────────────────────────────────

const mockPhonicsSession = (overrides = {}) => ({
  id: 1,
  studentId: 1,
  assignmentId: 1,
  completedAt: null,
  assignment: {
    homework: {
      type: 'PHONICS',
      parts: [
        { id: 1, name: 'sh', order: 0, words: [{ id: 1, text: 'sh', order: 0 }] },
        { id: 2, name: 'ch', order: 1, words: [{ id: 2, text: 'ch', order: 0 }] },
        { id: 3, name: 'th', order: 2, words: [{ id: 3, text: 'th', order: 0 }] },
      ],
      speakingText: null,
      speakingPictureUrl: null,
    },
  },
  speakingResults: [],
  phonicsResults: [],
  ...overrides,
});

const mockSpeakingSession = (overrides = {}) => ({
  id: 1,
  studentId: 1,
  assignmentId: 1,
  completedAt: null,
  assignment: {
    homework: {
      type: 'SPEAKING',
      parts: [],
      speakingText: 'Hello my name is Katie',
      speakingPictureUrl: null,
    },
  },
  speakingResults: [],
  phonicsResults: [],
  ...overrides,
});

const mockBfaSuccess = (score: number) => ({
  success: true,
  score,
  phonemes: [],
  feedback: [],
  word: 'sh',
  transcription: { text: 'sh' },
  espeak_fallback: false,
});

const mockBfaFail = () => ({
  success: false,
  score: 0,
  phonemes: [],
  feedback: [],
  word: 'sh',
  transcription: { text: '' },
  espeak_fallback: false,
});

const mockReadingSession = (overrides = {}) => ({
  id: 1,
  studentId: 1,
  assignmentId: 1,
  completedAt: null,
  assignment: {
    homework: {
      type: 'READING',
      parts: [],
      speakingText: null,
      speakingPictureUrl: null,
      readingActivities: [
        {
          id: 1,
          type: 'MATCH',
          order: 0,
          matchPairs: [
            { id: 1, imageUrl: 'a.png', word: 'apple', order: 0 },
            { id: 2, imageUrl: 'b.png', word: 'banana', order: 1 },
            { id: 3, imageUrl: 'c.png', word: 'cat', order: 2 },
          ],
          fillBlanks: [],
        },
        {
          id: 2,
          type: 'FILL_BLANK',
          order: 1,
          matchPairs: [],
          fillBlanks: [
            {
              id: 1,
              sentence: 'The ___ is red',
              order: 0,
              choices: [
                { id: 1, word: 'apple', isCorrect: true },
                { id: 2, word: 'car', isCorrect: false },
                { id: 3, word: 'sky', isCorrect: false },
              ],
            },
            {
              id: 2,
              sentence: 'I have a ___',
              order: 1,
              choices: [
                { id: 4, word: 'book', isCorrect: true },
                { id: 5, word: 'jump', isCorrect: false },
                { id: 6, word: 'run', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
  },
  speakingResults: [],
  phonicsResults: [],
  readingResult: null,
  // readingActivityResults: per-activity result records not stored in DB (only aggregate ReadingResult)
  readingActivityResults: [],
  ...overrides,
});

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
  it('returns 0 for empty transcription', () => expect(calcScore('', 'cat')).toBe(0));
  it('returns 0 for empty target', () => expect(calcScore('cat', '')).toBe(0));
  it('scores close words higher than distant words', () => {
    expect(calcScore('bat', 'cat')).toBeGreaterThan(calcScore('dog', 'cat'));
  });
  it('scores partial match proportionally', () => {
    const score = calcScore('bat', 'cat');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

// ── calcSpeakingScore ─────────────────────────────────────────────────────────

describe('calcSpeakingScore', () => {
  it('scores 100 for exact match', () => {
    const r = calcSpeakingScore('hello world', 'hello world');
    expect(r.score).toBe(100);
    expect(r.matchedWords).toBe(2);
  });
  it('handles punctuation in expected text', () => {
    const r = calcSpeakingScore('i am', 'I am.');
    expect(r.score).toBe(100);
  });
  it('scores 0 for empty transcribed', () => {
    const r = calcSpeakingScore('', 'hello world');
    expect(r.score).toBe(0);
    expect(r.totalWords).toBe(2);
  });
  it('scores partial match proportionally', () => {
    const r = calcSpeakingScore('hello', 'hello world');
    expect(r.score).toBe(50);
    expect(r.matchedWords).toBe(1);
  });
  it('accepts fuzzy matches above threshold', () => {
    const r = calcSpeakingScore('helo world', 'hello world');
    expect(r.matchedWords).toBe(2);
  });
});

// ── GameService.savePhonicsResult ─────────────────────────────────────────────

describe('GameService.savePhonicsResult', () => {
  let service: GameService;
  let repo: jest.Mocked<GameRepository>;
  let bfa: jest.Mocked<BfaService>;
  let wordRepo: { findByText: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: GameRepository,
          useValue: {
            getSession: jest.fn(), createSession: jest.fn(),
            saveSpeakingResult: jest.fn(), savePhonicsResult: jest.fn(),
            completeSession: jest.fn(), listSessions: jest.fn(),
            getAvailableAssignments: jest.fn(),
          },
        },
        { provide: StorageService, useValue: { upload: jest.fn(), getObject: jest.fn() } },
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
      ],
    }).compile();
    service = module.get(GameService);
    repo = module.get(GameRepository);
    bfa = module.get(BfaService);
    wordRepo = module.get<{ findByText: jest.Mock }>(WordRepository);
    repo.savePhonicsResult.mockResolvedValue({ id: 1, sessionId: 1, wordId: 1, transcribedText: '', score: 0, word: { id: 1, text: 'sh' } } as any);
    wordRepo.findByText.mockResolvedValue(null);  // default — no stored phonemes
  });

  it('uses BFA score when BFA succeeds', async () => {
    repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
    bfa.analyze.mockResolvedValue(mockBfaSuccess(87) as any);
    await service.savePhonicsResult(1, { wordId: 1 }, Buffer.from('audio'), 'audio/webm');
    expect(repo.savePhonicsResult).toHaveBeenCalledWith(1, 1, 'sh', 87);
  });

  it('scores 0 when BFA fails', async () => {
    repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
    bfa.analyze.mockResolvedValue(mockBfaFail() as any);
    await service.savePhonicsResult(1, { wordId: 1 }, Buffer.from('audio'), 'audio/webm');
    expect(repo.savePhonicsResult).toHaveBeenCalledWith(1, 1, '', 0);
  });

  it('scores 0 when no audio', async () => {
    repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
    await service.savePhonicsResult(1, { wordId: 1 });
    expect(bfa.analyze).not.toHaveBeenCalled();
    expect(repo.savePhonicsResult).toHaveBeenCalledWith(1, 1, '', 0);
  });

  it('throws NotFoundException when session not found', async () => {
    repo.getSession.mockResolvedValue(null as any);
    await expect(service.savePhonicsResult(99, { wordId: 1 }))
      .rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when homework is not PHONICS type', async () => {
    repo.getSession.mockResolvedValue(mockSpeakingSession() as any);
    await expect(service.savePhonicsResult(1, { wordId: 1 }))
      .rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when session already completed', async () => {
    repo.getSession.mockResolvedValue(mockPhonicsSession({ completedAt: new Date() }) as any);
    await expect(service.savePhonicsResult(1, { wordId: 1 }))
      .rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when wordId not found in homework', async () => {
    repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
    await expect(service.savePhonicsResult(1, { wordId: 999 }))
      .rejects.toThrow(BadRequestException);
  });

  it('passes stored phonemes from Word table to BFA analyze', async () => {
    repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
    bfa.analyze.mockResolvedValue(mockBfaSuccess(90) as any);
    wordRepo.findByText.mockResolvedValue({ id: 1, text: 'sh', phonemes: '["sh"]' } as any);
    await service.savePhonicsResult(1, { wordId: 1 }, Buffer.from('audio'), 'audio/webm');
    expect(wordRepo.findByText).toHaveBeenCalledWith('sh');
    expect(bfa.analyze).toHaveBeenCalledWith(expect.any(Buffer), 'audio/webm', 'sh', ['sh']);
  });

  it('falls back to empty phonemes array when Word not in DB', async () => {
    repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
    bfa.analyze.mockResolvedValue(mockBfaSuccess(80) as any);
    wordRepo.findByText.mockResolvedValue(null);
    await service.savePhonicsResult(1, { wordId: 1 }, Buffer.from('audio'), 'audio/webm');
    expect(bfa.analyze).toHaveBeenCalledWith(expect.any(Buffer), 'audio/webm', 'sh', []);
  });
});

// ── GameService.completeSession ───────────────────────────────────────────────

describe('GameService.completeSession', () => {
  let service: GameService;
  let repo: jest.Mocked<GameRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: GameRepository,
          useValue: {
            getSession: jest.fn(), createSession: jest.fn(),
            saveSpeakingResult: jest.fn(), savePhonicsResult: jest.fn(),
            completeSession: jest.fn(), listSessions: jest.fn(),
            getAvailableAssignments: jest.fn(),
          },
        },
        { provide: StorageService, useValue: { upload: jest.fn(), getObject: jest.fn() } },
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
      ],
    }).compile();
    service = module.get(GameService);
    repo = module.get(GameRepository);
    repo.completeSession.mockResolvedValue({} as any);
  });

  it('averages phonics scores over total words', async () => {
    repo.getSession.mockResolvedValue({
      ...mockPhonicsSession(),
      phonicsResults: [{ score: 100 }, { score: 0 }, { score: 0 }],
    } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 33);
  });

  it('gives 100 when all phonics words perfect', async () => {
    repo.getSession.mockResolvedValue({
      ...mockPhonicsSession(),
      phonicsResults: [{ score: 100 }, { score: 100 }, { score: 100 }],
    } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 100);
  });

  it('uses speaking result score for SPEAKING homework', async () => {
    repo.getSession.mockResolvedValue({
      ...mockSpeakingSession(),
      speakingResults: [{ score: 75 }],
    } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 75);
  });

  it('gives 0 when no speaking result', async () => {
    repo.getSession.mockResolvedValue(mockSpeakingSession() as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 0);
  });

  it('throws NotFoundException when session not found', async () => {
    repo.getSession.mockResolvedValue(null as any);
    await expect(service.completeSession(99)).rejects.toThrow(NotFoundException);
  });
});

// ── GameService.saveReadingResult ─────────────────────────────────────────────

describe('saveReadingResult', () => {
  let service: GameService;
  let repo: jest.Mocked<GameRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: GameRepository,
          useValue: {
            getSession: jest.fn(), createSession: jest.fn(),
            saveSpeakingResult: jest.fn(), savePhonicsResult: jest.fn(),
            completeSession: jest.fn(), listSessions: jest.fn(),
            getAvailableAssignments: jest.fn(),
            saveReadingResult: jest.fn(),
            getReadingResult: jest.fn(),
          },
        },
        { provide: StorageService, useValue: { upload: jest.fn(), getObject: jest.fn() } },
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
      ],
    }).compile();
    service = module.get(GameService);
    repo = module.get(GameRepository);
    repo.saveReadingResult.mockResolvedValue({ id: 1, sessionId: 1, totalItems: 8, correctItems: 5, score: 63 } as any);
  });

  it('throws NotFoundException when session is missing', async () => {
    repo.getSession.mockResolvedValue(null as any);
    const dto: SaveReadingResultDto = { correctItems: 5, totalItems: 8 };
    await expect(service.saveReadingResult(1, dto)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when session already completed', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession({ completedAt: new Date() }) as any);
    const dto: SaveReadingResultDto = { correctItems: 5, totalItems: 8 };
    await expect(service.saveReadingResult(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when homework type is not READING', async () => {
    repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
    const dto: SaveReadingResultDto = { correctItems: 5, totalItems: 8 };
    await expect(service.saveReadingResult(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when correctItems > totalItems', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession() as any);
    const dto: SaveReadingResultDto = { correctItems: 5, totalItems: 3 };
    await expect(service.saveReadingResult(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when values are negative', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession() as any);
    const dto: SaveReadingResultDto = { correctItems: -1, totalItems: 5 };
    await expect(service.saveReadingResult(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('computes score = round(correctItems/totalItems*100) and calls repo.saveReadingResult with that score', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession() as any);
    const dto: SaveReadingResultDto = { correctItems: 5, totalItems: 8 };
    await service.saveReadingResult(1, dto);
    expect(repo.saveReadingResult).toHaveBeenCalledWith(1, 8, 5, 63);
  });

  it('returns score=0 when totalItems is 0', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession() as any);
    repo.saveReadingResult.mockResolvedValue({ id: 1, sessionId: 1, totalItems: 0, correctItems: 0, score: 0 } as any);
    const dto: SaveReadingResultDto = { correctItems: 0, totalItems: 0 };
    await service.saveReadingResult(1, dto);
    expect(repo.saveReadingResult).toHaveBeenCalledWith(1, 0, 0, 0);
  });
});

// ── GameService.completeSession READING branch (D-18 score via ReadingResult) ─

describe('completeSession READING branch', () => {
  let service: GameService;
  let repo: jest.Mocked<GameRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: GameRepository,
          useValue: {
            getSession: jest.fn(), createSession: jest.fn(),
            saveSpeakingResult: jest.fn(), savePhonicsResult: jest.fn(),
            completeSession: jest.fn(), listSessions: jest.fn(),
            getAvailableAssignments: jest.fn(),
            saveReadingResult: jest.fn(),
            getReadingResult: jest.fn(),
          },
        },
        { provide: StorageService, useValue: { upload: jest.fn(), getObject: jest.fn() } },
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
      ],
    }).compile();
    service = module.get(GameService);
    repo = module.get(GameRepository);
    repo.completeSession.mockResolvedValue({} as any);
  });

  it('computes average across activity scores per D-18 (ReadingResult.score persisted by saveReadingResult)', async () => {
    // Per D-18: the aggregate ReadingResult.score is persisted when the student submits
    // answers (saveReadingResult computes correctItems/totalItems*100). completeSession
    // reads this pre-computed score via getReadingResult and passes it to repo.completeSession.
    // readingActivityResults: [] reflects the mock session shape (no per-activity DB records).
    repo.getSession.mockResolvedValue(
      mockReadingSession({ readingActivityResults: [] }) as any,
    );
    repo.getReadingResult.mockResolvedValue({ id: 1, sessionId: 1, totalItems: 3, correctItems: 3, score: 80 } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 80);
  });

  it('handles empty readingActivityResults (no division-by-zero) — score from ReadingResult', async () => {
    repo.getSession.mockResolvedValue(
      mockReadingSession({ readingActivityResults: [] }) as any,
    );
    repo.getReadingResult.mockResolvedValue(null as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 0);
  });

  it('SPEAKING branch unchanged — additive guarantee', async () => {
    repo.getSession.mockResolvedValue({ ...mockSpeakingSession(), speakingResults: [{ score: 90 }] } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 90);
  });

  it('PHONICS branch unchanged — additive guarantee', async () => {
    repo.getSession.mockResolvedValue({
      ...mockPhonicsSession(),
      phonicsResults: [{ score: 60 }, { score: 80 }, { score: 100 }],
    } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 80);
  });
});

// ── GameService.completeSession READING ───────────────────────────────────────

describe('completeSession READING', () => {
  let service: GameService;
  let repo: jest.Mocked<GameRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: GameRepository,
          useValue: {
            getSession: jest.fn(), createSession: jest.fn(),
            saveSpeakingResult: jest.fn(), savePhonicsResult: jest.fn(),
            completeSession: jest.fn(), listSessions: jest.fn(),
            getAvailableAssignments: jest.fn(),
            saveReadingResult: jest.fn(),
            getReadingResult: jest.fn(),
          },
        },
        { provide: StorageService, useValue: { upload: jest.fn(), getObject: jest.fn() } },
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
      ],
    }).compile();
    service = module.get(GameService);
    repo = module.get(GameRepository);
    repo.completeSession.mockResolvedValue({} as any);
  });

  it('reads ReadingResult.score when present', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession() as any);
    repo.getReadingResult.mockResolvedValue({ id: 1, sessionId: 1, totalItems: 8, correctItems: 6, score: 75 } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 75);
  });

  it('uses 0 when ReadingResult is missing', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession() as any);
    repo.getReadingResult.mockResolvedValue(null as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, null, 0);
  });
});
