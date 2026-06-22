import { Test, TestingModule } from '@nestjs/testing';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { AuthGuard } from '../auth/auth.guard';
import { SubmitAnswerDto } from './quiz.dto';

describe('QuizController', () => {
  let controller: QuizController;
  let quizService: jest.Mocked<QuizService>;

  const mockQuizService = {
    submitAnswer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizController],
      providers: [
        { provide: QuizService, useValue: mockQuizService },
        { provide: AuthGuard, useValue: { canActivate: () => true } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<QuizController>(QuizController);
    quizService = module.get(QuizService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submit', () => {
    it('should call quizService.submitAnswer with dto and return result', async () => {
      const dto: SubmitAnswerDto = { wordId: 1, selectedPhonemes: ['æ', 't'] };
      const result = { correct: true, score: 10 };
      quizService.submitAnswer.mockResolvedValue(result as any);

      const response = await controller.submit(dto);

      expect(quizService.submitAnswer).toHaveBeenCalledWith(dto);
      expect(quizService.submitAnswer).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });
});
