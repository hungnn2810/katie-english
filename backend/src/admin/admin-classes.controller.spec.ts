import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../auth/auth.guard';
import { AdminClassesController } from './admin-classes.controller';
import { AdminClassesService } from './admin-classes.service';
import { AdminUpdateClassDto } from './admin-classes.dto';

describe('AdminClassesController', () => {
  let controller: AdminClassesController;
  let service: { findAll: jest.Mock; update: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminClassesController],
      providers: [{ provide: AdminClassesService, useValue: service }],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminClassesController>(AdminClassesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll(undefined) when no query param provided', () => {
      service.findAll.mockReturnValue([]);
      controller.findAll(undefined);
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should call service.findAll(undefined) when teacherId is "ALL"', () => {
      service.findAll.mockReturnValue([]);
      controller.findAll('ALL');
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should call service.findAll(5) when teacherId is "5"', () => {
      service.findAll.mockReturnValue([]);
      controller.findAll('5');
      expect(service.findAll).toHaveBeenCalledWith(5);
    });

    it('should throw BadRequestException when teacherId is not a valid number', () => {
      expect(() => controller.findAll('invalid')).toThrow(BadRequestException);
      expect(() => controller.findAll('invalid')).toThrow('teacherId must be a number');
    });
  });

  describe('update', () => {
    it('should call service.update with the given id and dto', () => {
      const dto: AdminUpdateClassDto = { name: 'Updated Class', status: 'INPROGRESS' };
      const expected = { id: 1, ...dto };
      service.update.mockReturnValue(expected);

      const result = controller.update(1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toBe(expected);
    });
  });

  describe('delete', () => {
    it('should call service.delete with the given id', () => {
      service.delete.mockReturnValue({ deleted: true });

      const result = controller.delete(1);

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ deleted: true });
    });
  });
});
