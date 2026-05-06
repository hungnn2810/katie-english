import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GameService } from './game.service';
import { GameRepository } from './game.repository';
import { StorageService } from '../storage/storage.service';
import { BfaService } from '../bfa/bfa.service';

const mockSession = (overrides = {}) => ({
  id: 1,
  studentId: 1,
  homeworkId: 1,
  completedAt: null,
  homework: {
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
  wordResults: [],
  ...overrides,
});

const mockBfaSuccess = (score: number, phonemes = ['k', '\u00e6', 't']) => ({
  success: true,
  score,
  phonemes: phonemes.map((a) => ({ ipa: a, symbol: a.toLowerCase(), start: 0, end: 0.1, duration: 0.1 })),
  feedback: [],
  word: 'cat',
});

const mockBfaFail = () => ({ success: false, score: 0, phonemes: [], feedback: [], word: 'cat' });

describe('GameService.saveWordResult', () => {
  let service: GameService;
  let repo: jest.Mocked<GameRepository>;
  let bfa: jest.Mocked<BfaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: GameRepository, useValue: { getSession: jest.fn(), createSession: jest.fn(), saveWordResult: jest.fn(), completeSession: jest.fn(), listSessions: jest.fn(), getAvailableHomework: jest.fn() } },
        { provide: StorageService, useValue: { upload: jest.fn(), getObject: jest.fn() } },
        { provide: BfaService, useValue: { align: jest.fn() } },
      ],
    }).compile();

    service = module.get(GameService);
    repo = module.get(GameRepository);
    bfa = module.get(BfaService);

    repo.saveWordResult.mockResolvedValue({ id: 1, sessionId: 1, wordId: 10, transcribedText: '', score: 0 } as any);
  });

  it('uses BFA score when BFA succeeds and phonemes exist', async () => {
    repo.getSession.mockResolvedValue(mockSession() as any);
    bfa.align.mockResolvedValue(mockBfaSuccess(87) as any);

    await service.saveWordResult(1, { wordId: 10, transcribedText: '' }, Buffer.from('audio'), 'audio/webm');

    expect(repo.saveWordResult).toHaveBeenCalledWith(1, 10, '', 87);
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

  it('uses Levenshtein when no audio buffer', async () => {
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

  it('gives 100 when BFA succeeds but word has no phonemes in DB', async () => {
    const session = mockSession();
    session.homework.words[0].word.wordPhonemes = [];
    repo.getSession.mockResolvedValue(session as any);
    bfa.align.mockResolvedValue(mockBfaSuccess(0, ['k', '\u00e6', 't']) as any);

    await service.saveWordResult(1, { wordId: 10, transcribedText: '' }, Buffer.from('audio'), 'audio/webm');

    expect(repo.saveWordResult).toHaveBeenCalledWith(1, 10, '', 100);
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
});
