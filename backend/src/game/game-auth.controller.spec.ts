import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GameAuthController } from './game-auth.controller';
import { GameService } from './game.service';

describe('GameAuthController', () => {
  let controller: GameAuthController;
  let service: jest.Mocked<Pick<GameService, 'gameLogin'>>;

  const mockService = {
    gameLogin: jest.fn().mockResolvedValue({ token: 'abc' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameAuthController],
      providers: [
        { provide: GameService, useValue: mockService },
        { provide: ThrottlerGuard, useValue: { canActivate: () => true } },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GameAuthController>(GameAuthController);
    service = module.get(GameService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('gameLogin', () => {
    it('should call service.gameLogin with classCode, name, password and return result', async () => {
      const dto = { classCode: 'CLASS01', name: 'Alice', password: 'pass123' };

      const result = await controller.gameLogin(dto);

      expect(service.gameLogin).toHaveBeenCalledTimes(1);
      expect(service.gameLogin).toHaveBeenCalledWith(dto.classCode, dto.name, dto.password);
      expect(result).toEqual({ token: 'abc' });
    });
  });
});
