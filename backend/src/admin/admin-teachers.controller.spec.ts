import { Test, TestingModule } from '@nestjs/testing';
import { AdminTeachersController } from './admin-teachers.controller';
import { AdminTeachersService } from './admin-teachers.service';
import { AdminGuard } from '../auth/auth.guard';
import { CreateTeacherDto, UpdateTeacherDto } from './admin-teachers.dto';

describe('AdminTeachersController', () => {
  let controller: AdminTeachersController;
  let service: { findAll: jest.Mock; create: jest.Mock; update: jest.Mock; setDisabled: jest.Mock };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setDisabled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTeachersController],
      providers: [
        { provide: AdminTeachersService, useValue: service },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminTeachersController>(AdminTeachersController);
  });

  describe('findAll', () => {
    it('should call service.findAll and return its result', async () => {
      const expected = [{ id: 1, name: 'Teacher A' }];
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toBe(expected);
    });
  });

  describe('create', () => {
    it('should call service.create with the provided dto and return its result', async () => {
      const dto: CreateTeacherDto = { email: 'teacher1@test.com', password: 'pass', name: 'Teacher One', phone: '0901234567' };
      const expected = { id: 2, ...dto };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with the id and dto and return its result', async () => {
      const dto: UpdateTeacherDto = { name: 'Updated Name' } as UpdateTeacherDto;
      const expected = { id: 1, name: 'Updated Name' };
      service.update.mockResolvedValue(expected);

      const result = await controller.update(1, dto);

      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toBe(expected);
    });
  });

  describe('disable', () => {
    it('should call service.setDisabled with id and true', async () => {
      const expected = { id: 1, disabled: true };
      service.setDisabled.mockResolvedValue(expected);

      const result = await controller.disable(1);

      expect(service.setDisabled).toHaveBeenCalledTimes(1);
      expect(service.setDisabled).toHaveBeenCalledWith(1, true);
      expect(result).toBe(expected);
    });
  });

  describe('enable', () => {
    it('should call service.setDisabled with id and false', async () => {
      const expected = { id: 1, disabled: false };
      service.setDisabled.mockResolvedValue(expected);

      const result = await controller.enable(1);

      expect(service.setDisabled).toHaveBeenCalledTimes(1);
      expect(service.setDisabled).toHaveBeenCalledWith(1, false);
      expect(result).toBe(expected);
    });
  });
});
