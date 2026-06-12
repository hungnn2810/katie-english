import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GameService } from './game.service';
import { GameRepository } from './game.repository';
import { StorageService } from '../storage/storage.service';
import { BfaService } from '../bfa/bfa.service';
import { WordRepository } from '../word/word.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/jwt.service';
import { levenshtein, calcSpeakingScore, calcFreeSpeak } from './game.scoring';
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

const mockBfaError = (code: string, msg: string) => ({
  success: false,
  error: code,
  message: msg,
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

// ── calcFreeSpeak ─────────────────────────────────────────────────────────────

describe('calcFreeSpeak', () => {
  it('returns 0 score and 0 matchedWords for empty keyword list', () => {
    const r = calcFreeSpeak('hello world', '');
    expect(r.score).toBe(0);
    expect(r.matchedWords).toBe(0);
    expect(r.totalWords).toBe(0);
  });

  it('counts word-boundary exact match', () => {
    const r = calcFreeSpeak('I have a cat at home', 'cat');
    expect(r.matchedWords).toBe(1);
    expect(r.totalWords).toBe(1);
    expect(r.score).toBe(100);
  });

  it('does NOT count substring inside a larger word (catapult does not match cat)', () => {
    const r = calcFreeSpeak('the catapult fires rocks', 'cat');
    expect(r.matchedWords).toBe(0);
    expect(r.score).toBe(0);
  });

  it('counts fuzzy match at >= 0.75 Levenshtein similarity (single-char substitution on long word)', () => {
    // "elephnt" vs "elephant": levenshtein=1, maxLen=8, sim=0.875 >= 0.75 → match
    const r = calcFreeSpeak('I saw an elephnt today', 'elephant');
    expect(r.matchedWords).toBe(1);
  });

  it('does NOT count fuzzy match below 0.75 similarity (short words)', () => {
    // "set" vs "sit": levenshtein=1, maxLen=3, sim=0.666 < 0.75 → NO match
    const r = calcFreeSpeak('please set down', 'sit');
    expect(r.matchedWords).toBe(0);
  });

  it('counts case-insensitive word-boundary match', () => {
    const r = calcFreeSpeak('The Cat sat down', 'cat');
    expect(r.matchedWords).toBe(1);
  });

  it('handles regex special characters in keyword without throwing', () => {
    // ensure `cat.` keyword does not throw, and does not falsely match unrelated text
    expect(() => calcFreeSpeak('a regular cat is here', 'cat.')).not.toThrow();
    // "cat." regex with \b boundaries — \b is between word and non-word, so "cat." in transcript "(cat.)" would match but plain "cat" alone in transcript would NOT match exact "cat." keyword via word-boundary stage; fuzzy stage: levenshtein("cat","cat.")=1, maxLen=4, sim=0.75 >= 0.75 → match
    const r = calcFreeSpeak('a regular cat is here', 'cat.');
    // either word-boundary "cat." does not match in transcript "cat" (no trailing dot), but fuzzy fallback hits exactly at 0.75 → match
    expect(r.matchedWords).toBe(1);
  });

  it('scores partial match proportionally with multiple keywords', () => {
    // keywords: "cat", "sits", "mat"; transcript has only "cat" and "mat" → 2/3
    const r = calcFreeSpeak('the cat is on the mat', 'cat, sits, mat');
    expect(r.matchedWords).toBe(2);
    expect(r.totalWords).toBe(3);
    expect(r.score).toBe(67); // round(2/3 * 100) = 67
  });

  it('handles empty transcript with non-empty keywords', () => {
    const r = calcFreeSpeak('', 'cat, dog');
    expect(r.matchedWords).toBe(0);
    expect(r.totalWords).toBe(2);
    expect(r.score).toBe(0);
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
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn(), analyzeSpeaking: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
        { provide: PrismaService, useValue: { homework: { findUnique: jest.fn() } } },
        { provide: TokenService, useValue: { sign: jest.fn() } },
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

  describe('BFA error forwarding', () => {
    it('forwards audio_too_short through savePhonicsResult', async () => {
      repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
      bfa.analyze.mockResolvedValue(mockBfaError('audio_too_short', 'Recording too short — hold the button longer') as any);
      const result = await service.savePhonicsResult(1, { wordId: 1 }, Buffer.from('audio'), 'audio/webm');
      expect(repo.savePhonicsResult).toHaveBeenCalledWith(1, 1, '', 0);
      expect(result.bfa?.error).toBe('audio_too_short');
      expect(result.bfa?.message).toBe('Recording too short — hold the button longer');
      expect(result.bfa?.success).toBe(false);
    });

    it('forwards audio_too_long through savePhonicsResult', async () => {
      repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
      bfa.analyze.mockResolvedValue(mockBfaError('audio_too_long', 'Recording too long — keep it under 15 seconds') as any);
      const result = await service.savePhonicsResult(1, { wordId: 1 }, Buffer.from('audio'), 'audio/webm');
      expect(repo.savePhonicsResult).toHaveBeenCalledWith(1, 1, '', 0);
      expect(result.bfa?.error).toBe('audio_too_long');
      expect(result.bfa?.message).toBe('Recording too long — keep it under 15 seconds');
      expect(result.bfa?.success).toBe(false);
    });

    it('forwards recording_too_noisy through savePhonicsResult', async () => {
      repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
      bfa.analyze.mockResolvedValue(mockBfaError('recording_too_noisy', 'Mic quá ồn — tìm chỗ yên tĩnh hơn nhé') as any);
      const result = await service.savePhonicsResult(1, { wordId: 1 }, Buffer.from('audio'), 'audio/webm');
      expect(repo.savePhonicsResult).toHaveBeenCalledWith(1, 1, '', 0);
      expect(result.bfa?.error).toBe('recording_too_noisy');
      expect(result.bfa?.message).toBe('Mic quá ồn — tìm chỗ yên tĩnh hơn nhé');
      expect(result.bfa?.success).toBe(false);
    });

    it('forwards speech_not_detected through savePhonicsResult', async () => {
      repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
      bfa.analyze.mockResolvedValue(mockBfaError('speech_not_detected', 'Không nghe rõ — nói to hơn nhé') as any);
      const result = await service.savePhonicsResult(1, { wordId: 1 }, Buffer.from('audio'), 'audio/webm');
      expect(repo.savePhonicsResult).toHaveBeenCalledWith(1, 1, '', 0);
      expect(result.bfa?.error).toBe('speech_not_detected');
      expect(result.bfa?.message).toBe('Không nghe rõ — nói to hơn nhé');
      expect(result.bfa?.success).toBe(false);
    });

    it('forwards wrong_language through savePhonicsResult', async () => {
      repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
      bfa.analyze.mockResolvedValue(mockBfaError('wrong_language', 'Please speak in English') as any);
      const result = await service.savePhonicsResult(1, { wordId: 1 }, Buffer.from('audio'), 'audio/webm');
      expect(repo.savePhonicsResult).toHaveBeenCalledWith(1, 1, '', 0);
      expect(result.bfa?.error).toBe('wrong_language');
      expect(result.bfa?.message).toBe('Please speak in English');
      expect(result.bfa?.success).toBe(false);
    });
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
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn(), analyzeSpeaking: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
        { provide: PrismaService, useValue: { homework: { findUnique: jest.fn() } } },
        { provide: TokenService, useValue: { sign: jest.fn() } },
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
    expect(repo.completeSession).toHaveBeenCalledWith(1, 33);
  });

  it('gives 100 when all phonics words perfect', async () => {
    repo.getSession.mockResolvedValue({
      ...mockPhonicsSession(),
      phonicsResults: [{ score: 100 }, { score: 100 }, { score: 100 }],
    } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, 100);
  });

  it('uses speaking result score for SPEAKING homework', async () => {
    repo.getSession.mockResolvedValue({
      ...mockSpeakingSession(),
      speakingResults: [{ score: 75 }],
    } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, 75);
  });

  it('gives 0 when no speaking result', async () => {
    repo.getSession.mockResolvedValue(mockSpeakingSession() as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, 0);
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
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn(), analyzeSpeaking: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
        { provide: PrismaService, useValue: { homework: { findUnique: jest.fn() } } },
        { provide: TokenService, useValue: { sign: jest.fn() } },
      ],
    }).compile();
    service = module.get(GameService);
    repo = module.get(GameRepository);
    // mockReadingSession has 3 matchPairs + 2 fillBlanks = 5 server-computed items
    repo.saveReadingResult.mockResolvedValue({ id: 1, sessionId: 1, totalItems: 5, correctItems: 3, score: 60 } as any);
  });

  it('throws NotFoundException when session is missing', async () => {
    repo.getSession.mockResolvedValue(null as any);
    const dto: SaveReadingResultDto = { correctItems: 5 };
    await expect(service.saveReadingResult(1, dto)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when session already completed', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession({ completedAt: new Date() }) as any);
    const dto: SaveReadingResultDto = { correctItems: 5 };
    await expect(service.saveReadingResult(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when homework type is not READING', async () => {
    repo.getSession.mockResolvedValue(mockPhonicsSession() as any);
    const dto: SaveReadingResultDto = { correctItems: 5 };
    await expect(service.saveReadingResult(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when correctItems exceeds server-computed totalItems', async () => {
    // mock has 5 server items; correctItems: 6 > 5 → throws
    repo.getSession.mockResolvedValue(mockReadingSession() as any);
    const dto: SaveReadingResultDto = { correctItems: 6 };
    await expect(service.saveReadingResult(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when correctItems is negative', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession() as any);
    const dto: SaveReadingResultDto = { correctItems: -1 };
    await expect(service.saveReadingResult(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('computes score = round(correctItems/serverTotalItems*100) and calls repo.saveReadingResult', async () => {
    // server total = 3 matchPairs + 2 fillBlanks = 5; 3/5 = 60
    repo.getSession.mockResolvedValue(mockReadingSession() as any);
    const dto: SaveReadingResultDto = { correctItems: 3 };
    await service.saveReadingResult(1, dto);
    expect(repo.saveReadingResult).toHaveBeenCalledWith(1, 5, 3, 60);
  });

  it('returns score=0 when homework has no reading activities', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession({
      assignment: {
        homework: {
          type: 'READING', parts: [], speakingText: null, speakingPictureUrl: null,
          readingActivities: [],
        },
      },
    }) as any);
    repo.saveReadingResult.mockResolvedValue({ id: 1, sessionId: 1, totalItems: 0, correctItems: 0, score: 0 } as any);
    const dto: SaveReadingResultDto = { correctItems: 0 };
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
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn(), analyzeSpeaking: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
        { provide: PrismaService, useValue: { homework: { findUnique: jest.fn() } } },
        { provide: TokenService, useValue: { sign: jest.fn() } },
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
    expect(repo.completeSession).toHaveBeenCalledWith(1, 80);
  });

  it('handles empty readingActivityResults (no division-by-zero) — score from ReadingResult', async () => {
    repo.getSession.mockResolvedValue(
      mockReadingSession({ readingActivityResults: [] }) as any,
    );
    repo.getReadingResult.mockResolvedValue(null as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, 0);
  });

  it('SPEAKING branch unchanged — additive guarantee', async () => {
    repo.getSession.mockResolvedValue({ ...mockSpeakingSession(), speakingResults: [{ score: 90 }] } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, 90);
  });

  it('PHONICS branch unchanged — additive guarantee', async () => {
    repo.getSession.mockResolvedValue({
      ...mockPhonicsSession(),
      phonicsResults: [{ score: 60 }, { score: 80 }, { score: 100 }],
    } as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, 80);
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
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn(), analyzeSpeaking: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
        { provide: PrismaService, useValue: { homework: { findUnique: jest.fn() } } },
        { provide: TokenService, useValue: { sign: jest.fn() } },
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
    expect(repo.completeSession).toHaveBeenCalledWith(1, 75);
  });

  it('uses 0 when ReadingResult is missing', async () => {
    repo.getSession.mockResolvedValue(mockReadingSession() as any);
    repo.getReadingResult.mockResolvedValue(null as any);
    await service.completeSession(1);
    expect(repo.completeSession).toHaveBeenCalledWith(1, 0);
  });
});

// ── GameService.saveSpeakingResult ────────────────────────────────────────────

describe('GameService.saveSpeakingResult', () => {
  let service: GameService;
  let repo: jest.Mocked<GameRepository>;
  let bfa: jest.Mocked<BfaService>;

  const mockBfaSpeakingSuccess = () => ({
    success: true,
    transcription: { text: 'hello my name is katie' },
    words: [{ word: 'hello', phonemes: [], score: 90, feedback: [] }],
    overall_score: 85,
    matched_words: 4,
    total_words: 5,
  });

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
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyze: jest.fn(), analyzeSpeaking: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
        { provide: PrismaService, useValue: { homework: { findUnique: jest.fn() } } },
        { provide: TokenService, useValue: { sign: jest.fn() } },
      ],
    }).compile();
    service = module.get(GameService);
    repo = module.get(GameRepository);
    bfa = module.get(BfaService);
    repo.saveSpeakingResult.mockResolvedValue({ id: 1, sessionId: 1, transcribedText: '', score: 0 } as any);
  });

  it('uses BFA overall_score when SCRIPT_MATCH BFA succeeds', async () => {
    repo.getSession.mockResolvedValue(mockSpeakingSession() as any);
    bfa.analyzeSpeaking.mockResolvedValue(mockBfaSpeakingSuccess() as any);
    await service.saveSpeakingResult(1, Buffer.from('audio'), 'audio/webm');
    expect(bfa.analyzeSpeaking).toHaveBeenCalled();
    expect(repo.saveSpeakingResult).toHaveBeenCalledWith(1, 'hello my name is katie', 85, 4, 5, expect.any(String));
  });

  it('falls back to transcribe when BFA analyzeSpeaking throws', async () => {
    repo.getSession.mockResolvedValue(mockSpeakingSession() as any);
    bfa.analyzeSpeaking.mockRejectedValue(new Error('BFA down'));
    bfa.transcribe.mockResolvedValue({ text: 'hello my name is katie' } as any);
    await service.saveSpeakingResult(1, Buffer.from('audio'), 'audio/webm');
    expect(bfa.transcribe).toHaveBeenCalled();
    expect(repo.saveSpeakingResult).toHaveBeenCalled();
  });

  it('scores 0 and skips BFA when no audio provided', async () => {
    repo.getSession.mockResolvedValue(mockSpeakingSession() as any);
    await service.saveSpeakingResult(1);
    expect(bfa.analyzeSpeaking).not.toHaveBeenCalled();
    expect(repo.saveSpeakingResult).toHaveBeenCalledWith(1, '', 0, 0, expect.any(Number), null);
  });

  it('throws NotFoundException when session not found', async () => {
    repo.getSession.mockResolvedValue(null as any);
    await expect(service.saveSpeakingResult(99)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when session already completed', async () => {
    repo.getSession.mockResolvedValue(mockSpeakingSession({ completedAt: new Date() }) as any);
    await expect(service.saveSpeakingResult(1)).rejects.toThrow(BadRequestException);
  });
});

// ── GameService.trySpeakingHomework ───────────────────────────────────────────

describe('GameService.trySpeakingHomework', () => {
  let service: GameService;
  let repo: jest.Mocked<GameRepository>;
  let bfa: jest.Mocked<BfaService>;
  let prisma: { homework: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = { homework: { findUnique: jest.fn() } };
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
        { provide: BfaService, useValue: { align: jest.fn(), transcribe: jest.fn(), analyzeSpeaking: jest.fn() } },
        { provide: WordRepository, useValue: { findByText: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: { sign: jest.fn() } },
      ],
    }).compile();
    service = module.get(GameService);
    repo = module.get(GameRepository);
    bfa = module.get(BfaService);
  });

  it('throws NotFoundException when homework not found', async () => {
    prisma.homework.findUnique.mockResolvedValue(null);
    await expect(service.trySpeakingHomework(999)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when homework type is not SPEAKING', async () => {
    prisma.homework.findUnique.mockResolvedValue({
      type: 'PHONICS', speakingMode: null, speakingText: null, speakingPictureUrl: null,
    });
    await expect(service.trySpeakingHomework(1)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when speakingText is missing', async () => {
    prisma.homework.findUnique.mockResolvedValue({
      type: 'SPEAKING', speakingMode: 'FREE_SPEAK', speakingText: null, speakingPictureUrl: null,
    });
    await expect(service.trySpeakingHomework(1)).rejects.toThrow(BadRequestException);
  });

  it('returns FREE_SPEAK score from calcFreeSpeak with real BFA transcript', async () => {
    prisma.homework.findUnique.mockResolvedValue({
      type: 'SPEAKING', speakingMode: 'FREE_SPEAK',
      speakingText: 'cat, sits, mat', speakingPictureUrl: 'https://example.com/p.jpg',
    });
    bfa.transcribe.mockResolvedValue({ text: 'the cat is on the mat', words: [] } as any);
    const r = await service.trySpeakingHomework(1, Buffer.from('audio'), 'audio/webm');
    expect(r.transcribedText).toBe('the cat is on the mat');
    expect(r.matchedWords).toBe(2);  // "cat" + "mat" match, "sits" does not
    expect(r.totalWords).toBe(3);
    expect(r.score).toBe(67);  // round(2/3 * 100)
    expect(r.speakingMode).toBe('FREE_SPEAK');
    expect(r.speakingPictureUrl).toBe('https://example.com/p.jpg');
  });

  it('returns SCRIPT_MATCH score from analyzeSpeaking (Azure PA)', async () => {
    prisma.homework.findUnique.mockResolvedValue({
      type: 'SPEAKING', speakingMode: 'SCRIPT_MATCH',
      speakingText: 'hello world', speakingPictureUrl: null,
    });
    bfa.analyzeSpeaking.mockResolvedValue({
      success: true,
      transcription: { text: 'hello world' },
      words: [],
      overall_score: 100,
      matched_words: 2,
      total_words: 2,
    } as any);
    const r = await service.trySpeakingHomework(1, Buffer.from('audio'), 'audio/webm');
    expect(bfa.analyzeSpeaking).toHaveBeenCalledWith(expect.any(Buffer), 'audio/webm', 'hello world');
    expect(bfa.transcribe).not.toHaveBeenCalled();
    expect(r.matchedWords).toBe(2);
    expect(r.totalWords).toBe(2);
    expect(r.score).toBe(100);
    expect(r.speakingMode).toBe('SCRIPT_MATCH');
  });

  it('falls back to transcribe+calcSpeakingScore when SCRIPT_MATCH analyzeSpeaking throws', async () => {
    prisma.homework.findUnique.mockResolvedValue({
      type: 'SPEAKING', speakingMode: 'SCRIPT_MATCH',
      speakingText: 'hello world', speakingPictureUrl: null,
    });
    bfa.analyzeSpeaking.mockRejectedValue(new Error('BFA down'));
    bfa.transcribe.mockResolvedValue({ text: 'hello world', words: [] } as any);
    const r = await service.trySpeakingHomework(1, Buffer.from('audio'), 'audio/webm');
    expect(bfa.transcribe).toHaveBeenCalled();
    expect(r.score).toBe(100);
    expect(r.matchedWords).toBe(2);
  });

  it('returns score=0 when no audio buffer is provided', async () => {
    prisma.homework.findUnique.mockResolvedValue({
      type: 'SPEAKING', speakingMode: 'FREE_SPEAK',
      speakingText: 'cat', speakingPictureUrl: null,
    });
    const r = await service.trySpeakingHomework(1);
    expect(bfa.transcribe).not.toHaveBeenCalled();
    expect(r.transcribedText).toBe('');
    expect(r.score).toBe(0);
    expect(r.matchedWords).toBe(0);
  });

  it('continues with empty transcript when BFA throws', async () => {
    prisma.homework.findUnique.mockResolvedValue({
      type: 'SPEAKING', speakingMode: 'FREE_SPEAK',
      speakingText: 'cat', speakingPictureUrl: null,
    });
    bfa.transcribe.mockRejectedValue(new Error('BFA down'));
    const r = await service.trySpeakingHomework(1, Buffer.from('audio'), 'audio/webm');
    expect(r.transcribedText).toBe('');
    expect(r.score).toBe(0);
    expect(r.matchedWords).toBe(0);
  });

  it('does NOT write to the database (no repo.saveSpeakingResult / completeSession / createSession calls)', async () => {
    prisma.homework.findUnique.mockResolvedValue({
      type: 'SPEAKING', speakingMode: 'FREE_SPEAK',
      speakingText: 'cat', speakingPictureUrl: null,
    });
    bfa.transcribe.mockResolvedValue({ text: 'cat', words: [] } as any);
    await service.trySpeakingHomework(1, Buffer.from('audio'), 'audio/webm');
    expect(repo.saveSpeakingResult).not.toHaveBeenCalled();
    expect(repo.completeSession).not.toHaveBeenCalled();
    expect(repo.createSession).not.toHaveBeenCalled();
    expect(repo.savePhonicsResult).not.toHaveBeenCalled();
  });
});
