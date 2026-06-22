import { Test, TestingModule } from '@nestjs/testing';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateClassDto, UpdateClassDto } from './class.dto';

describe('ClassController', () => {
  let controller: ClassController;
  let service: jest.Mocked<ClassService>;

  const mockClassService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassController],
      providers: [
        { provide: ClassService, useValue: mockClassService },
        { provide: AuthGuard, useValue: { canActivate: () => true } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClassController>(ClassController);
    service = module.get(ClassService);

    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    it('should call classService.findAll() and return its result', async () => {
      const result = [{ id: 1, name: 'Class A' }];
      service.findAll.mockResolvedValue(result as any);

      const response = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('findOne()', () => {
    it('should call classService.findById(1) and return its result', async () => {
      const result = { id: 1, name: 'Class A' };
      service.findById.mockResolvedValue(result as any);

      const response = await controller.findOne(1);

      expect(service.findById).toHaveBeenCalledWith(1);
      expect(service.findById).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('create()', () => {
    it('should call classService.create(dto, 42) when req.user.sub is 42', async () => {
      const dto: CreateClassDto = { name: 'New Class' } as CreateClassDto;
      const mockReq = { user: { sub: 42 } } as any;
      const result = { id: 10, name: 'New Class' };
      service.create.mockResolvedValue(result as any);

      const response = await controller.create(dto, mockReq);

      expect(service.create).toHaveBeenCalledWith(dto, 42);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });

    it('should call classService.create(dto, undefined) when req.user is missing', async () => {
      const dto: CreateClassDto = { name: 'New Class' } as CreateClassDto;
      const mockReq = {} as any;
      const result = { id: 11, name: 'New Class' };
      service.create.mockResolvedValue(result as any);

      const response = await controller.create(dto, mockReq);

      expect(service.create).toHaveBeenCalledWith(dto, undefined);
      expect(response).toBe(result);
    });
  });

  describe('update()', () => {
    it('should call classService.update(1, dto) and return its result', async () => {
      const dto: UpdateClassDto = { name: 'Updated Class' } as UpdateClassDto;
      const result = { id: 1, name: 'Updated Class' };
      service.update.mockResolvedValue(result as any);

      const response = await controller.update(1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('delete()', () => {
    it('should call classService.delete(1) and return its result', async () => {
      const result = { id: 1, name: 'Class A' };
      service.delete.mockResolvedValue(result as any);

      const response = await controller.delete(1);

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(service.delete).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });
});
