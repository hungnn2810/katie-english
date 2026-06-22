import { Test, TestingModule } from '@nestjs/testing';
import { WordController } from './word.controller';
import { WordService } from './word.service';
import { AuthGuard } from '../auth/auth.guard';

describe('WordController', () => {
  let controller: WordController;
  let wordService: jest.Mocked<WordService>;

  const mockWordService = {
    findAll: jest.fn(),
    getRandomWord: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WordController],
      providers: [
        { provide: WordService, useValue: mockWordService },
        { provide: AuthGuard, useValue: { canActivate: () => true } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WordController>(WordController);
    wordService = module.get(WordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call wordService.findAll and return result', async () => {
      const result = [{ id: 1, word: 'cat' }, { id: 2, word: 'dog' }];
      wordService.findAll.mockResolvedValue(result as any);

      const response = await controller.findAll();

      expect(wordService.findAll).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('getRandom', () => {
    it('should call wordService.getRandomWord with the given level and return result', async () => {
      const result = { id: 3, word: 'bat' };
      wordService.getRandomWord.mockResolvedValue(result as any);

      const response = await controller.getRandom(2);

      expect(wordService.getRandomWord).toHaveBeenCalledWith(2);
      expect(wordService.getRandomWord).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });
});
