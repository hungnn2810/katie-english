import { Test, TestingModule } from '@nestjs/testing';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { TeacherOrAdminGuard } from '../auth/auth.guard';

describe('StudentController', () => {
  let controller: StudentController;
  let service: jest.Mocked<Pick<StudentService, 'findAll' | 'findByClass' | 'findById' | 'create' | 'update' | 'delete'>>;

  const mockService = {
    findAll: jest.fn(),
    findByClass: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentController],
      providers: [
        { provide: StudentService, useValue: mockService },
      ],
    })
      .overrideGuard(TeacherOrAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StudentController>(StudentController);
    service = mockService;
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('calls service.findAll() when no classId is provided', async () => {
      const result = [{ id: 1, name: 'Alice' }];
      mockService.findAll.mockResolvedValue(result);

      const response = await controller.findAll(undefined);

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(mockService.findByClass).not.toHaveBeenCalled();
      expect(response).toBe(result);
    });

    it('calls service.findByClass(5) when classId is "5"', async () => {
      const result = [{ id: 2, name: 'Bob' }];
      mockService.findByClass.mockResolvedValue(result);

      const response = await controller.findAll('5');

      expect(mockService.findByClass).toHaveBeenCalledWith(5);
      expect(mockService.findAll).not.toHaveBeenCalled();
      expect(response).toBe(result);
    });
  });

  describe('findOne', () => {
    it('calls service.findById(1)', async () => {
      const result = { id: 1, name: 'Alice' };
      mockService.findById.mockResolvedValue(result);

      const response = await controller.findOne(1);

      expect(mockService.findById).toHaveBeenCalledWith(1);
      expect(response).toBe(result);
    });
  });

  describe('create', () => {
    it('calls service.create(dto)', async () => {
      const dto = { name: 'Charlie', classId: 3 } as any;
      const result = { id: 10, ...dto };
      mockService.create.mockResolvedValue(result);

      const response = await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(response).toBe(result);
    });
  });

  describe('update', () => {
    it('calls service.update(1, dto)', async () => {
      const dto = { name: 'Updated Name' } as any;
      const result = { id: 1, ...dto };
      mockService.update.mockResolvedValue(result);

      const response = await controller.update(1, dto);

      expect(mockService.update).toHaveBeenCalledWith(1, dto);
      expect(response).toBe(result);
    });
  });

  describe('delete', () => {
    it('calls service.delete(1)', async () => {
      const result = { id: 1 };
      mockService.delete.mockResolvedValue(result);

      const response = await controller.delete(1);

      expect(mockService.delete).toHaveBeenCalledWith(1);
      expect(response).toBe(result);
    });
  });
});
