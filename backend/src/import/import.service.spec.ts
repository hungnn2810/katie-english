import * as XLSX from 'xlsx';
import { ImportService } from './import.service';

describe('ImportService', () => {
  let service: ImportService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      class: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      student: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(),
    };
    service = new ImportService(mockPrisma as any);
  });

  // IMPORT-01: parseClassesSheet with a row missing 'name' returns ImportError
  describe('IMPORT-01: validation - missing required class field', () => {
    it('returns ImportError for class row missing name', async () => {
      // Build a buffer with Classes sheet that has a row missing 'name'
      const wb = XLSX.utils.book_new();
      const rows = [{ code: 'LA01', startDate: '2026-01-01', endDate: '2026-06-30' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Classes');
      const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

      const result = await service.processUpload(buffer, { id: 1, role: 'TEACHER' });

      expect(result).toHaveProperty('errors');
      const { errors } = result as { errors: any[] };
      const nameError = errors.find(e => e.sheet === 'Classes' && e.column === 'name');
      expect(nameError).toBeDefined();
      expect(nameError.message).toMatch(/required/i);
    });
  });

  // IMPORT-02: validateAll with duplicate class name returns ImportError
  describe('IMPORT-02: validation - duplicate class name', () => {
    it('returns ImportError for duplicate class name in upload', async () => {
      const wb = XLSX.utils.book_new();
      const rows = [
        { name: 'Lớp A', startDate: '2026-01-01', endDate: '2026-06-30' },
        { name: 'Lớp A', startDate: '2026-02-01', endDate: '2026-07-30' }, // duplicate
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Classes');
      const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

      const result = await service.processUpload(buffer, { id: 1, role: 'TEACHER' });

      expect(result).toHaveProperty('errors');
      const { errors } = result as { errors: any[] };
      const dupError = errors.find(e => e.sheet === 'Classes' && e.row === 2);
      expect(dupError).toBeDefined();
    });
  });

  // IMPORT-03: validateAll with duplicate student (fullname + className) returns ImportError
  describe('IMPORT-03: validation - duplicate student', () => {
    it('returns ImportError for second student with same fullname+className', async () => {
      const wb = XLSX.utils.book_new();
      const classRows = [{ name: 'Lớp A', startDate: '2026-01-01', endDate: '2026-06-30' }];
      const studentRows = [
        { fullname: 'Nguyễn Văn A', sex: 'M', dateOfBirth: '2018-05-10', className: 'Lớp A' },
        { fullname: 'Nguyễn Văn A', sex: 'M', dateOfBirth: '2018-05-10', className: 'Lớp A' }, // duplicate
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classRows), 'Classes');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentRows), 'Students');
      const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

      const result = await service.processUpload(buffer, { id: 1, role: 'TEACHER' });

      expect(result).toHaveProperty('errors');
      const { errors } = result as { errors: any[] };
      const dupError = errors.find(e => e.sheet === 'Students' && e.row === 2);
      expect(dupError).toBeDefined();
    });
  });

  // IMPORT-04: processUpload with one error returns errors and never calls prisma.$transaction
  describe('IMPORT-04: collect-all-errors, import nothing on error', () => {
    it('does not call prisma.$transaction when there are validation errors', async () => {
      const wb = XLSX.utils.book_new();
      const rows = [{ code: 'LA01', startDate: '2026-01-01', endDate: '2026-06-30' }]; // missing name
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Classes');
      const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

      const result = await service.processUpload(buffer, { id: 1, role: 'TEACHER' });

      expect(result).toHaveProperty('errors');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // IMPORT-05: groupHomeworkRows groups correctly
  describe('IMPORT-05: groupHomeworkRows - correct nesting', () => {
    it('groups flat rows into homework -> part -> words map', () => {
      const rows = [
        { homework_name: 'Bài 1', part_name: 'Part 1', word_text: 'cat', word_highlight: 'c' },
        { homework_name: 'Bài 1', part_name: 'Part 1', word_text: 'car', word_highlight: 'c' },
        { homework_name: 'Bài 1', part_name: 'Part 2', word_text: 'red', word_highlight: 'r' },
      ];

      const result = (service as any).groupHomeworkRows(rows);

      expect(result.size).toBe(1);
      const parts = result.get('Bài 1');
      expect(parts).toBeDefined();
      expect(parts.size).toBe(2);
      expect(parts.get('Part 1').length).toBe(2);
      expect(parts.get('Part 2').length).toBe(1);
    });
  });

  // IMPORT-06: generateTemplate() returns a Buffer with 3 sheets
  describe('IMPORT-06: generateTemplate returns valid xlsx buffer', () => {
    it('returns Buffer with Classes, Students, Homework sheets', () => {
      const buffer = service.generateTemplate();

      expect(buffer).toBeInstanceOf(Buffer);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      expect(wb.SheetNames).toContain('Classes');
      expect(wb.SheetNames).toContain('Students');
      expect(wb.SheetNames).toContain('Homework');
    });
  });

  // IMPORT-07: processUpload throws BadRequestException for non-.xlsx
  describe('IMPORT-07: rejects non-.xlsx files', () => {
    it('throws BadRequestException for .csv file', async () => {
      const csvBuffer = Buffer.from('name,code\nLop A,LA01');

      await expect(
        service.processUpload(csvBuffer, { id: 1, role: 'TEACHER' }, 'data.csv'),
      ).rejects.toThrow();
    });
  });
});
