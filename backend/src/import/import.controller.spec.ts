import { BadRequestException } from '@nestjs/common';
import { ImportController } from './import.controller';

describe('ImportController', () => {
  let controller: ImportController;
  let mockImportService: any;

  beforeEach(() => {
    mockImportService = {
      processUpload: jest.fn(),
      generateTemplate: jest.fn().mockReturnValue(Buffer.from('fake-xlsx')),
    };
    controller = new ImportController(mockImportService);
  });

  // POST /import/upload — no file
  describe('upload - no file provided', () => {
    it('throws BadRequestException when no file is uploaded', async () => {
      await expect(
        controller.upload(undefined as any, { user: { id: 1, role: 'TEACHER' } } as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockImportService.processUpload).not.toHaveBeenCalled();
    });
  });

  // POST /import/upload — wrong extension
  describe('upload - wrong file extension', () => {
    it('throws BadRequestException for .csv file', async () => {
      const csvFile = {
        originalname: 'data.csv',
        buffer: Buffer.from('name,code'),
      } as Express.Multer.File;

      await expect(
        controller.upload(csvFile, { user: { id: 1, role: 'TEACHER' } } as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockImportService.processUpload).not.toHaveBeenCalled();
    });
  });

  // GET /import/template
  describe('template endpoint', () => {
    it('calls generateTemplate and sends buffer with correct headers', () => {
      const fakeBuffer = Buffer.from('fake-xlsx-content');
      mockImportService.generateTemplate.mockReturnValue(fakeBuffer);

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
      };

      controller.getTemplate(mockRes as any);

      expect(mockImportService.generateTemplate).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="import-template.xlsx"',
      );
      expect(mockRes.end).toHaveBeenCalledWith(fakeBuffer);
    });
  });
});
