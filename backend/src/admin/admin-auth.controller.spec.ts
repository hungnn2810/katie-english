import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './admin-auth.dto';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let authService: { login: jest.Mock };

  beforeEach(async () => {
    authService = { login: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        { provide: AdminAuthService, useValue: authService },
        { provide: ThrottlerGuard, useValue: { canActivate: () => true } },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login with the provided dto', async () => {
      const dto: AdminLoginDto = { email: 'admin@katie.com', password: 'secret' };
      authService.login.mockResolvedValue({ accessToken: 'token-abc' });

      await controller.login(dto);

      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });

    it('should return the value from authService.login', async () => {
      const dto: AdminLoginDto = { email: 'admin@katie.com', password: 'secret' };
      const expected = { accessToken: 'token-abc' };
      authService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(result).toBe(expected);
    });
  });
});
