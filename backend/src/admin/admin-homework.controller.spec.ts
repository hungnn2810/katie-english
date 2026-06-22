import { Test, TestingModule } from '@nestjs/testing';
import { AdminHomeworkController } from './admin-homework.controller';
import { AdminHomeworkService } from './admin-homework.service';
import { AdminGuard } from '../auth/auth.guard';

describe('AdminHomeworkController', () => {
  let controller: AdminHomeworkController;
  let service: { findAll: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminHomeworkController],
      providers: [
        { provide: AdminHomeworkService, useValue: service },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminHomeworkController>(AdminHomeworkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll and return its result', async () => {
      const expected = [{ id: 1, title: 'Homework 1' }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toBe(expected);
    });
  });

  describe('delete', () => {
    it('should call service.delete with the provided id and return its result', async () => {
      const expected = { id: 1 };
      service.delete.mockResolvedValue(expected);

      const result = await controller.delete(1);

      expect(service.delete).toHaveBeenCalledTimes(1);
      expect(service.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(expected);
    });
  });
});
