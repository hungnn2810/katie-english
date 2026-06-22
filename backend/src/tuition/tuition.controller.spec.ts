import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TuitionController } from './tuition.controller';
import { TuitionService } from './tuition.service';
import { TeacherOrAdminGuard } from '../auth/auth.guard';

const mockService = {
  getConfig: jest.fn(),
  createOrUpdateConfig: jest.fn(),
  generateMonthlyRecords: jest.fn(),
  recordPayment: jest.fn(),
  sendNotifications: jest.fn(),
  getReport: jest.fn(),
};

describe('TuitionController', () => {
  let controller: TuitionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TuitionController],
      providers: [{ provide: TuitionService, useValue: mockService }],
    })
      .overrideGuard(TeacherOrAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TuitionController>(TuitionController);
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return config when service returns a config', async () => {
      const config = { classId: 1, monthlyFee: 500000 };
      mockService.getConfig.mockResolvedValue(config);

      const result = await controller.getConfig(1);

      expect(mockService.getConfig).toHaveBeenCalledWith(1);
      expect(result).toBe(config);
    });

    it('should throw NotFoundException when service returns null', async () => {
      mockService.getConfig.mockResolvedValue(null);

      await expect(controller.getConfig(1)).rejects.toThrow(NotFoundException);
      expect(mockService.getConfig).toHaveBeenCalledWith(1);
    });
  });

  describe('updateConfig', () => {
    it('should call service.createOrUpdateConfig with classId and dto', () => {
      const dto = { monthlyFee: 600000 } as any;
      const expected = { classId: 1, ...dto };
      mockService.createOrUpdateConfig.mockReturnValue(expected);

      const result = controller.updateConfig(1, dto);

      expect(mockService.createOrUpdateConfig).toHaveBeenCalledWith(1, dto);
      expect(result).toBe(expected);
    });
  });

  describe('generateRecords', () => {
    it('should call service.generateMonthlyRecords with dto', () => {
      const dto = { month: 6, year: 2024, classIds: [1, 2] } as any;
      const expected = { created: 10 };
      mockService.generateMonthlyRecords.mockReturnValue(expected);

      const result = controller.generateRecords(dto);

      expect(mockService.generateMonthlyRecords).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('recordPayment', () => {
    it('should call service.recordPayment with id and dto', () => {
      const dto = { amountPaid: 500000, paidAt: new Date() } as any;
      const expected = { id: 1, status: 'PAID' };
      mockService.recordPayment.mockReturnValue(expected);

      const result = controller.recordPayment(1, dto);

      expect(mockService.recordPayment).toHaveBeenCalledWith(1, dto);
      expect(result).toBe(expected);
    });
  });

  describe('sendNotifications', () => {
    it('should call service.sendNotifications with dto', () => {
      const dto = { month: 6, year: 2024, classIds: [1] } as any;
      const expected = { sent: 5 };
      mockService.sendNotifications.mockReturnValue(expected);

      const result = controller.sendNotifications(dto);

      expect(mockService.sendNotifications).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('getReport', () => {
    it('should call service.getReport with parsed statuses when status string is provided', () => {
      const expected = { records: [] };
      mockService.getReport.mockReturnValue(expected);

      const result = controller.getReport(1, 6, 2024, 'PENDING,OVERDUE');

      expect(mockService.getReport).toHaveBeenCalledWith(1, 6, 2024, ['PENDING', 'OVERDUE']);
      expect(result).toBe(expected);
    });

    it('should call service.getReport with undefined statuses when status is not provided', () => {
      const expected = { records: [] };
      mockService.getReport.mockReturnValue(expected);

      const result = controller.getReport(1, 6, 2024, undefined);

      expect(mockService.getReport).toHaveBeenCalledWith(1, 6, 2024, undefined);
      expect(result).toBe(expected);
    });
  });
});
