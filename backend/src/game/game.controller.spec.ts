import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameJobsService } from './game.jobs.service';
import { AuthGuard, TeacherGuard } from '../auth/auth.guard';

const mockService = {
  getAvailableAssignments: jest.fn(),
  startSession: jest.fn(),
  getSession: jest.fn(),
  savePhonicsResult: jest.fn(),
  trySpeakingHomework: jest.fn(),
  tryPhonicsHomework: jest.fn(),
  saveVocabResult: jest.fn(),
  saveListenResult: jest.fn(),
  saveReadingResult: jest.fn(),
  completeSession: jest.fn(),
  listSessions: jest.fn(),
  gameLogin: jest.fn(),
};

const mockJobs = {
  enqueueSpeakingResult: jest.fn(),
  getJobStatus: jest.fn(),
};

function makeReq(overrides: Record<string, any> = {}) {
  return { user: {}, ...overrides } as any;
}

describe('GameController', () => {
  let controller: GameController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        { provide: GameService, useValue: mockService },
        { provide: GameJobsService, useValue: mockJobs },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeacherGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GameController>(GameController);
  });

  // ── getHomework ────────────────────────────────────────────────────────────

  describe('getHomework', () => {
    it('STUDENT accessing own homework calls service', async () => {
      const req = makeReq({ user: { studentId: 7, role: 'STUDENT' } });
      mockService.getAvailableAssignments.mockResolvedValue([]);
      await controller.getHomework(7, req);
      expect(mockService.getAvailableAssignments).toHaveBeenCalledWith(7);
    });

    it('STUDENT accessing another student homework throws ForbiddenException', async () => {
      const req = makeReq({ user: { studentId: 7, role: 'STUDENT' } });
      expect(() => controller.getHomework(99, req)).toThrow(ForbiddenException);
      expect(mockService.getAvailableAssignments).not.toHaveBeenCalled();
    });

    it('TEACHER can access any student homework', async () => {
      const req = makeReq({ user: { studentId: 1, role: 'TEACHER' } });
      mockService.getAvailableAssignments.mockResolvedValue([]);
      await controller.getHomework(99, req);
      expect(mockService.getAvailableAssignments).toHaveBeenCalledWith(99);
    });
  });

  // ── startSession ───────────────────────────────────────────────────────────

  describe('startSession', () => {
    it('matching studentId calls service', async () => {
      const req = makeReq({ user: { studentId: 5 } });
      const dto = { studentId: 5, homeworkId: 1 } as any;
      mockService.startSession.mockResolvedValue({ id: 10 });
      await controller.startSession(dto, req);
      expect(mockService.startSession).toHaveBeenCalledWith(dto);
    });

    it('mismatched studentId throws ForbiddenException', async () => {
      const req = makeReq({ user: { studentId: 5 } });
      const dto = { studentId: 9, homeworkId: 1 } as any;
      expect(() => controller.startSession(dto, req)).toThrow(ForbiddenException);
      expect(mockService.startSession).not.toHaveBeenCalled();
    });

    it('no studentId in token throws ForbiddenException', () => {
      const req = makeReq({ user: {} });
      const dto = { studentId: 5, homeworkId: 1 } as any;
      expect(() => controller.startSession(dto, req)).toThrow(ForbiddenException);
    });
  });

  // ── getSession ─────────────────────────────────────────────────────────────

  describe('getSession', () => {
    it('TEACHER role returns session regardless of owner', async () => {
      const req = makeReq({ user: { studentId: 1, role: 'TEACHER' } });
      const session = { id: 10, studentId: 99 };
      mockService.getSession.mockResolvedValue(session);
      const result = await controller.getSession(10, req);
      expect(result).toEqual(session);
    });

    it('STUDENT accessing own session returns session', async () => {
      const req = makeReq({ user: { studentId: 5, role: 'STUDENT' } });
      const session = { id: 10, studentId: 5 };
      mockService.getSession.mockResolvedValue(session);
      const result = await controller.getSession(10, req);
      expect(result).toEqual(session);
    });

    it("STUDENT accessing another student's session throws ForbiddenException", async () => {
      const req = makeReq({ user: { studentId: 5, role: 'STUDENT' } });
      const session = { id: 10, studentId: 99 };
      mockService.getSession.mockResolvedValue(session);
      await expect(controller.getSession(10, req)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ── savePhonicsResult ──────────────────────────────────────────────────────

  describe('savePhonicsResult', () => {
    it('no studentId in token throws ForbiddenException', () => {
      const req = makeReq({ user: {} });
      expect(() => controller.savePhonicsResult(1, '5', 'hello', req)).toThrow(ForbiddenException);
    });

    it('invalid wordId (zero) throws BadRequestException', () => {
      const req = makeReq({ user: { studentId: 5 } });
      expect(() => controller.savePhonicsResult(1, '0', 'hello', req)).toThrow(BadRequestException);
    });

    it('invalid wordId (non-numeric) throws BadRequestException', () => {
      const req = makeReq({ user: { studentId: 5 } });
      expect(() => controller.savePhonicsResult(1, 'abc', 'hello', req)).toThrow(BadRequestException);
    });

    it('valid params call service with correct args', async () => {
      const req = makeReq({ user: { studentId: 5 } });
      const audio = { buffer: Buffer.from('audio'), mimetype: 'audio/webm' } as any;
      mockService.savePhonicsResult.mockResolvedValue({ ok: true });
      await controller.savePhonicsResult(1, '3', 'hello', req, audio);
      expect(mockService.savePhonicsResult).toHaveBeenCalledWith(
        1,
        { wordId: 3, transcribedText: 'hello' },
        5,
        audio.buffer,
        audio.mimetype,
      );
    });
  });

  // ── saveSpeakingResult ─────────────────────────────────────────────────────

  describe('saveSpeakingResult', () => {
    it('no studentId in token throws ForbiddenException', async () => {
      const req = makeReq({ user: {} });
      await expect(controller.saveSpeakingResult(10, req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("studentId different from session owner throws ForbiddenException", async () => {
      const req = makeReq({ user: { studentId: 5 } });
      mockService.getSession.mockResolvedValue({ id: 10, studentId: 99 });
      await expect(controller.saveSpeakingResult(10, req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('valid owner enqueues speaking result job', async () => {
      const req = makeReq({ user: { studentId: 5 } });
      const session = { id: 10, studentId: 5 };
      const audio = { buffer: Buffer.from('audio'), mimetype: 'audio/webm' } as any;
      mockService.getSession.mockResolvedValue(session);
      mockJobs.enqueueSpeakingResult.mockResolvedValue({ jobId: 'abc' });
      await controller.saveSpeakingResult(10, req, audio);
      expect(mockJobs.enqueueSpeakingResult).toHaveBeenCalledWith(
        10,
        audio.buffer,
        audio.mimetype,
      );
    });
  });

  // ── trySpeakingHomework ────────────────────────────────────────────────────

  describe('trySpeakingHomework', () => {
    it('calls service with hwId, buffer, and mimetype', async () => {
      const audio = { buffer: Buffer.from('audio'), mimetype: 'audio/webm' } as any;
      mockService.trySpeakingHomework.mockResolvedValue({ score: 90 });
      await controller.trySpeakingHomework(3, audio);
      expect(mockService.trySpeakingHomework).toHaveBeenCalledWith(3, audio.buffer, audio.mimetype);
    });
  });

  // ── tryPhonicsHomework ─────────────────────────────────────────────────────

  describe('tryPhonicsHomework', () => {
    it('invalid wordId throws BadRequestException', () => {
      expect(() => controller.tryPhonicsHomework(1, 'bad')).toThrow(BadRequestException);
    });

    it('valid wordId calls service', async () => {
      const audio = { buffer: Buffer.from('audio'), mimetype: 'audio/ogg' } as any;
      mockService.tryPhonicsHomework.mockResolvedValue({ ok: true });
      await controller.tryPhonicsHomework(1, '4', audio);
      expect(mockService.tryPhonicsHomework).toHaveBeenCalledWith(1, 4, audio.buffer, audio.mimetype);
    });
  });

  // ── saveVocabResult ────────────────────────────────────────────────────────

  describe('saveVocabResult', () => {
    it('invalid vocabItemId throws BadRequestException', () => {
      const req = makeReq({ user: { studentId: 5 } });
      expect(() => controller.saveVocabResult(1, '-1', 'word', req)).toThrow(BadRequestException);
    });

    it('no studentId in token throws ForbiddenException', () => {
      const req = makeReq({ user: {} });
      expect(() => controller.saveVocabResult(1, '2', 'word', req)).toThrow(ForbiddenException);
    });

    it('valid params call service', async () => {
      const req = makeReq({ user: { studentId: 5 } });
      const audio = { buffer: Buffer.from('audio'), mimetype: 'audio/webm' } as any;
      mockService.saveVocabResult.mockResolvedValue({ ok: true });
      await controller.saveVocabResult(1, '2', 'word', req, audio);
      expect(mockService.saveVocabResult).toHaveBeenCalledWith(
        1,
        { vocabItemId: 2, transcribedText: 'word' },
        5,
        audio.buffer,
        audio.mimetype,
      );
    });
  });

  // ── saveListenResult ───────────────────────────────────────────────────────

  describe('saveListenResult', () => {
    it('invalid listenItemId throws BadRequestException', () => {
      const req = makeReq({ user: { studentId: 5 } });
      expect(() => controller.saveListenResult(1, '0', 'text', req)).toThrow(BadRequestException);
    });

    it('no studentId in token throws ForbiddenException', () => {
      const req = makeReq({ user: {} });
      expect(() => controller.saveListenResult(1, '3', 'text', req)).toThrow(ForbiddenException);
    });

    it('valid params call service', async () => {
      const req = makeReq({ user: { studentId: 5 } });
      const audio = { buffer: Buffer.from('audio'), mimetype: 'audio/mp4' } as any;
      mockService.saveListenResult.mockResolvedValue({ ok: true });
      await controller.saveListenResult(1, '3', 'text', req, audio);
      expect(mockService.saveListenResult).toHaveBeenCalledWith(
        1,
        { listenItemId: 3, transcribedText: 'text' },
        5,
        audio.buffer,
        audio.mimetype,
      );
    });
  });

  // ── saveReadingResult ──────────────────────────────────────────────────────

  describe('saveReadingResult', () => {
    it('no studentId in token throws ForbiddenException', async () => {
      const req = makeReq({ user: {} });
      expect(() => controller.saveReadingResult(1, { correctItems: 0 }, req)).toThrow(
        ForbiddenException,
      );
    });

    it('valid params call service', async () => {
      const req = makeReq({ user: { studentId: 5 } });
      const dto = { correctItems: 3 };
      mockService.saveReadingResult.mockResolvedValue({ ok: true });
      await controller.saveReadingResult(1, dto, req);
      expect(mockService.saveReadingResult).toHaveBeenCalledWith(1, dto, 5);
    });
  });

  // ── getJobStatus ───────────────────────────────────────────────────────────

  describe('getJobStatus', () => {
    it('calls jobs.getJobStatus with jobId and callerStudentId', async () => {
      const req = makeReq({ user: { studentId: 5 } });
      mockJobs.getJobStatus.mockResolvedValue({ state: 'completed' });
      await controller.getJobStatus('job-42', req);
      expect(mockJobs.getJobStatus).toHaveBeenCalledWith('job-42', 5);
    });
  });

  // ── completeSession ────────────────────────────────────────────────────────

  describe('completeSession', () => {
    it('no studentId in token throws ForbiddenException', async () => {
      const req = makeReq({ user: {} });
      await expect(controller.completeSession(10, req)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('valid studentId calls service', async () => {
      const req = makeReq({ user: { studentId: 5 } });
      mockService.completeSession.mockResolvedValue({ done: true });
      await controller.completeSession(10, req);
      expect(mockService.completeSession).toHaveBeenCalledWith(10, 5);
    });
  });

  // ── listSessions ───────────────────────────────────────────────────────────

  describe('listSessions', () => {
    it('passes numeric assignmentId and studentId when provided', async () => {
      mockService.listSessions.mockResolvedValue([]);
      await controller.listSessions('2', '7');
      expect(mockService.listSessions).toHaveBeenCalledWith(2, 7);
    });

    it('passes undefined for both params when not provided', async () => {
      mockService.listSessions.mockResolvedValue([]);
      await controller.listSessions();
      expect(mockService.listSessions).toHaveBeenCalledWith(undefined, undefined);
    });
  });
});
