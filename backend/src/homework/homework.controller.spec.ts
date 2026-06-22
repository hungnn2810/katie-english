import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HomeworkController } from './homework.controller';
import { HomeworkService } from './homework.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, TeacherOrAdminGuard } from '../auth/auth.guard';

const mockService = {
  createReadingHomework: jest.fn(),
  findReadingById: jest.fn(),
  updateReadingHomework: jest.fn(),
  createVocabHomework: jest.fn(),
  findVocabById: jest.fn(),
  updateVocabHomework: jest.fn(),
  createListenHomework: jest.fn(),
  findListenById: jest.fn(),
  updateListenHomework: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createAssignment: jest.fn(),
  findAssignmentById: jest.fn(),
  updateAssignment: jest.fn(),
  deleteAssignment: jest.fn(),
};

const mockStorage = {
  upload: jest.fn().mockResolvedValue('https://example.com/file.jpg'),
};

describe('HomeworkController', () => {
  let controller: HomeworkController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeworkController],
      providers: [
        { provide: HomeworkService, useValue: mockService },
        { provide: StorageService, useValue: mockStorage },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeacherOrAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HomeworkController>(HomeworkController);
  });

  // --- uploadImage ---

  describe('uploadImage', () => {
    it('should throw BadRequestException when no file is provided', async () => {
      await expect(controller.uploadImage(undefined)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file has invalid mime type', async () => {
      const file = {
        buffer: Buffer.from('data'),
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
      } as Express.Multer.File;

      await expect(controller.uploadImage(file)).rejects.toThrow(BadRequestException);
    });

    it('should upload a valid jpeg file and return { url }', async () => {
      const file = {
        buffer: Buffer.from('data'),
        mimetype: 'image/jpeg',
        originalname: 'test.jpg',
      } as Express.Multer.File;

      const result = await controller.uploadImage(file);

      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^homework-images\/.+\.jpg$/),
        file.buffer,
        file.mimetype,
      );
      expect(result).toEqual({ url: 'https://example.com/file.jpg' });
    });
  });

  // --- uploadAudio ---

  describe('uploadAudio', () => {
    it('should throw BadRequestException when no file is provided', async () => {
      await expect(controller.uploadAudio(undefined)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file has invalid mime type', async () => {
      const file = {
        buffer: Buffer.from('data'),
        mimetype: 'video/mp4',
        originalname: 'test.mp4',
      } as Express.Multer.File;

      await expect(controller.uploadAudio(file)).rejects.toThrow(BadRequestException);
    });

    it('should upload a valid mp3 file and return { url }', async () => {
      const file = {
        buffer: Buffer.from('data'),
        mimetype: 'audio/mpeg',
        originalname: 'test.mp3',
      } as Express.Multer.File;

      const result = await controller.uploadAudio(file);

      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.any(String),
        file.buffer,
        file.mimetype,
      );
      expect(result).toEqual({ url: 'https://example.com/file.jpg' });
    });
  });

  // --- Reading ---

  describe('createReading', () => {
    it('should call service.createReadingHomework with dto', () => {
      const dto = { name: 'Reading HW', activities: [] } as any;
      mockService.createReadingHomework.mockReturnValue(dto);

      controller.createReading(dto);

      expect(mockService.createReadingHomework).toHaveBeenCalledWith(dto);
    });
  });

  describe('findReading', () => {
    it('should call service.findReadingById with id', () => {
      mockService.findReadingById.mockReturnValue({ id: 1 });

      controller.findReading(1);

      expect(mockService.findReadingById).toHaveBeenCalledWith(1);
    });
  });

  describe('updateReading', () => {
    it('should call service.updateReadingHomework with id and dto', () => {
      const dto = { name: 'Updated' } as any;
      mockService.updateReadingHomework.mockReturnValue({ id: 1, ...dto });

      controller.updateReading(1, dto);

      expect(mockService.updateReadingHomework).toHaveBeenCalledWith(1, dto);
    });
  });

  // --- Vocab ---

  describe('createVocab', () => {
    it('should call service.createVocabHomework with dto', () => {
      const dto = { name: 'Vocab HW', items: [] } as any;
      mockService.createVocabHomework.mockReturnValue(dto);

      controller.createVocab(dto);

      expect(mockService.createVocabHomework).toHaveBeenCalledWith(dto);
    });
  });

  describe('findVocab', () => {
    it('should call service.findVocabById with id', () => {
      mockService.findVocabById.mockReturnValue({ id: 1 });

      controller.findVocab(1);

      expect(mockService.findVocabById).toHaveBeenCalledWith(1);
    });
  });

  describe('updateVocab', () => {
    it('should call service.updateVocabHomework with id and dto', () => {
      const dto = { name: 'Updated Vocab' } as any;
      mockService.updateVocabHomework.mockReturnValue({ id: 1, ...dto });

      controller.updateVocab(1, dto);

      expect(mockService.updateVocabHomework).toHaveBeenCalledWith(1, dto);
    });
  });

  // --- Listen ---

  describe('createListen', () => {
    it('should call service.createListenHomework with dto', () => {
      const dto = { name: 'Listen HW', items: [] } as any;
      mockService.createListenHomework.mockReturnValue(dto);

      controller.createListen(dto);

      expect(mockService.createListenHomework).toHaveBeenCalledWith(dto);
    });
  });

  describe('findListen', () => {
    it('should call service.findListenById with id', () => {
      mockService.findListenById.mockReturnValue({ id: 1 });

      controller.findListen(1);

      expect(mockService.findListenById).toHaveBeenCalledWith(1);
    });
  });

  describe('updateListen', () => {
    it('should call service.updateListenHomework with id and dto', () => {
      const dto = { name: 'Updated Listen' } as any;
      mockService.updateListenHomework.mockReturnValue({ id: 1, ...dto });

      controller.updateListen(1, dto);

      expect(mockService.updateListenHomework).toHaveBeenCalledWith(1, dto);
    });
  });

  // --- Homework CRUD ---

  describe('findAll', () => {
    it('should call service.findAll', () => {
      mockService.findAll.mockReturnValue([]);

      controller.findAll();

      expect(mockService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call service.findById with id', () => {
      mockService.findById.mockReturnValue({ id: 1 });

      controller.findOne(1);

      expect(mockService.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto', () => {
      const dto = { type: 'PHONICS' } as any;
      mockService.create.mockReturnValue({ id: 1, ...dto });

      controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', () => {
      const dto = { name: 'Updated HW' } as any;
      mockService.update.mockReturnValue({ id: 1, ...dto });

      controller.update(1, dto);

      expect(mockService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('delete', () => {
    it('should call service.delete with id', () => {
      mockService.delete.mockReturnValue({ deleted: true });

      controller.delete(1);

      expect(mockService.delete).toHaveBeenCalledWith(1);
    });
  });

  // --- Assignment ---

  describe('createAssignment', () => {
    it('should call service.createAssignment with dto', () => {
      const dto = { homeworkId: 1, classIds: [2], endDate: '2026-07-01' };
      mockService.createAssignment.mockReturnValue({ id: 1, ...dto });

      controller.createAssignment(dto);

      expect(mockService.createAssignment).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAssignment', () => {
    it('should call service.findAssignmentById with id', () => {
      mockService.findAssignmentById.mockReturnValue({ id: 1 });

      controller.findAssignment(1);

      expect(mockService.findAssignmentById).toHaveBeenCalledWith(1);
    });
  });

  describe('updateAssignment', () => {
    it('should call service.updateAssignment with id and dto', () => {
      const dto = { classIds: [3] } as any;
      mockService.updateAssignment.mockReturnValue({ id: 1, ...dto });

      controller.updateAssignment(1, dto);

      expect(mockService.updateAssignment).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('deleteAssignment', () => {
    it('should call service.deleteAssignment with id', () => {
      mockService.deleteAssignment.mockReturnValue({ deleted: true });

      controller.deleteAssignment(1);

      expect(mockService.deleteAssignment).toHaveBeenCalledWith(1);
    });
  });
});
