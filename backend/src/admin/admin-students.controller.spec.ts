import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../auth/auth.guard';
import { AdminStudentsController } from './admin-students.controller';
import { AdminStudentsService } from './admin-students.service';

describe('AdminStudentsController', () => {
  let controller: AdminStudentsController;
  let service: { findAll: jest.Mock; deleteSession: jest.Mock; getResults: jest.Mock };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      deleteSession: jest.fn(),
      getResults: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStudentsController],
      providers: [{ provide: AdminStudentsService, useValue: service }],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminStudentsController>(AdminStudentsController);
  });

  describe('findAll', () => {
    it('should call service.findAll() and return its result', () => {
      const expected = [{ id: 1, name: 'Student A' }];
      service.findAll.mockReturnValue(expected);

      const result = controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toBe(expected);
    });
  });

  describe('deleteSession', () => {
    it('should call service.deleteSession(5) and return its result', () => {
      const expected = { deleted: true };
      service.deleteSession.mockReturnValue(expected);

      const result = controller.deleteSession(5);

      expect(service.deleteSession).toHaveBeenCalledWith(5);
      expect(result).toBe(expected);
    });
  });

  describe('getResults', () => {
    it('should call service.getResults(3) and return its result', () => {
      const expected = [{ sessionId: 10, score: 95 }];
      service.getResults.mockReturnValue(expected);

      const result = controller.getResults(3);

      expect(service.getResults).toHaveBeenCalledWith(3);
      expect(result).toBe(expected);
    });
  });
});
