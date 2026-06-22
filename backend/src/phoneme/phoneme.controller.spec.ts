import { Test, TestingModule } from '@nestjs/testing';
import { PhonemeController } from './phoneme.controller';
import { PhonemeService } from './phoneme.service';
import { AuthGuard } from '../auth/auth.guard';

describe('PhonemeController', () => {
  let controller: PhonemeController;
  let phonemeService: jest.Mocked<PhonemeService>;

  const mockPhonemeService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhonemeController],
      providers: [
        { provide: PhonemeService, useValue: mockPhonemeService },
        { provide: AuthGuard, useValue: { canActivate: () => true } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PhonemeController>(PhonemeController);
    phonemeService = module.get(PhonemeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call phonemeService.findAll and return result', async () => {
      const result = [{ id: 1, symbol: 'æ' }, { id: 2, symbol: 't' }];
      phonemeService.findAll.mockResolvedValue(result as any);

      const response = await controller.findAll();

      expect(phonemeService.findAll).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });
});
