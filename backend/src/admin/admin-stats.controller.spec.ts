import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../auth/auth.guard';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';

describe('AdminStatsController', () => {
  let controller: AdminStatsController;
  let service: { getStats: jest.Mock };

  beforeEach(async () => {
    service = {
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStatsController],
      providers: [{ provide: AdminStatsService, useValue: service }],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminStatsController>(AdminStatsController);
  });

  describe('get', () => {
    it('should call service.getStats() and return its result', () => {
      const expected = { totalStudents: 42, totalClasses: 7 };
      service.getStats.mockReturnValue(expected);

      const result = controller.get();

      expect(service.getStats).toHaveBeenCalledTimes(1);
      expect(result).toBe(expected);
    });
  });
});
