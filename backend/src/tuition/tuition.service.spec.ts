import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TuitionService } from './tuition.service';
import { TuitionRepository } from './tuition.repository';
import { ZaloZnsService } from './zalo-zns.service';

describe('TuitionService', () => {
  let service: TuitionService;
  let repo: jest.Mocked<TuitionRepository>;
  let zaloZns: jest.Mocked<ZaloZnsService>;

  const mockConfig = {
    id: 1,
    classId: 10,
    pricePerSession: 100_000,
    bookFee: 50_000,
    dueDayOfMonth: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClass = {
    id: 10,
    name: 'Class A',
    code: 'CA-01',
    startDate: new Date(),
    endDate: new Date(),
    status: 'INPROGRESS' as const,
    // 1 Monday slot → June 2026 has 5 Mondays
    scheduleSlots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '09:30' }],
    teacherId: null,
    tuitionConfig: null,
    tuitionRecords: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStudents = [
    { id: 1, fullname: 'Nguyen Van A', classId: 10 },
    { id: 2, fullname: 'Tran Thi B', classId: 10 },
  ];

  const mockRecord = {
    id: 101,
    studentId: 1,
    classId: 10,
    month: 6,
    year: 2026,
    tuitionAmount: 500_000,
    bookFee: 50_000,
    totalAmount: 550_000,
    dueDate: new Date(2026, 5, 15), // June 15, 2026
    status: 'PENDING' as const,
    paidAt: null,
    paidBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repo = {
      findConfig: jest.fn(),
      upsertConfig: jest.fn(),
      findClassById: jest.fn(),
      findStudentsByClass: jest.fn(),
      countRecords: jest.fn(),
      createRecord: jest.fn(),
      findRecordsByReport: jest.fn(),
      findRecordsByIds: jest.fn(),
      updateRecord: jest.fn(),
      logNotification: jest.fn(),
    } as unknown as jest.Mocked<TuitionRepository>;

    zaloZns = {
      sendTemplate: jest.fn(),
    } as unknown as jest.Mocked<ZaloZnsService>;

    service = new TuitionService(repo, zaloZns);
  });

  // ─── createOrUpdateConfig ─────────────────────────────────────────────────

  describe('createOrUpdateConfig', () => {
    it('throws BadRequestException when pricePerSession is 0', async () => {
      await expect(
        service.createOrUpdateConfig(10, { pricePerSession: 0, dueDayOfMonth: 15 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when pricePerSession is negative', async () => {
      await expect(
        service.createOrUpdateConfig(10, { pricePerSession: -100, dueDayOfMonth: 15 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('calls repo.upsertConfig with valid dto', async () => {
      repo.upsertConfig.mockResolvedValue(mockConfig as any);
      const dto = { pricePerSession: 100_000, bookFee: 50_000, dueDayOfMonth: 15 };
      await service.createOrUpdateConfig(10, dto);
      expect(repo.upsertConfig).toHaveBeenCalledWith(10, dto);
    });
  });

  // ─── generateMonthlyRecords ───────────────────────────────────────────────

  describe('generateMonthlyRecords', () => {
    it('throws BadRequestException for invalid month (13)', async () => {
      await expect(
        service.generateMonthlyRecords({ classId: 10, month: 13, year: 2026 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for month 0', async () => {
      await expect(
        service.generateMonthlyRecords({ classId: 10, month: 0, year: 2026 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when no tuition config found', async () => {
      repo.findClassById.mockResolvedValue(mockClass as any);
      repo.findConfig.mockResolvedValue(null);
      await expect(
        service.generateMonthlyRecords({ classId: 10, month: 6, year: 2026 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when records already exist', async () => {
      repo.findClassById.mockResolvedValue(mockClass as any);
      repo.findConfig.mockResolvedValue(mockConfig as any);
      repo.findStudentsByClass.mockResolvedValue(mockStudents as any);
      repo.countRecords.mockResolvedValue(1);
      await expect(
        service.generateMonthlyRecords({ classId: 10, month: 6, year: 2026 }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.countRecords).toHaveBeenCalledWith(10, 6, 2026);
    });

    it('creates records for each student with correct totalAmount', async () => {
      repo.findClassById.mockResolvedValue(mockClass as any);
      repo.findConfig.mockResolvedValue(mockConfig as any);
      repo.findStudentsByClass.mockResolvedValue(mockStudents as any);
      repo.countRecords.mockResolvedValue(0);
      repo.createRecord.mockResolvedValue(mockRecord as any);

      const result = await service.generateMonthlyRecords({ classId: 10, month: 6, year: 2026 });

      // 2 students → 2 records created
      expect(repo.createRecord).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);

      // Verify amounts: June 2026 has 5 Mondays → 5 sessions × 100_000 + 50_000 book = 550_000
      const firstCall = repo.createRecord.mock.calls[0][0];
      expect(firstCall.tuitionAmount).toBe(500_000); // 5 × 100_000
      expect(firstCall.bookFee).toBe(50_000);
      expect(firstCall.totalAmount).toBe(550_000);
    });
  });

  // ─── recordPayment ────────────────────────────────────────────────────────

  describe('recordPayment', () => {
    it('calls repo.updateRecord with status PAID and paidAt as Date', async () => {
      repo.updateRecord.mockResolvedValue({ ...mockRecord, status: 'PAID' } as any);
      const dto = { paidAt: '2026-06-10', paidBy: 'admin_user' };
      await service.recordPayment(101, dto);

      expect(repo.updateRecord).toHaveBeenCalledWith(101, {
        status: 'PAID',
        paidAt: new Date('2026-06-10'),
        paidBy: 'admin_user',
      });
    });
  });

  // ─── getReport ────────────────────────────────────────────────────────────

  describe('getReport', () => {
    it('returns OVERDUE for PENDING record with dueDate in the past', async () => {
      const pastRecord = {
        ...mockRecord,
        status: 'PENDING' as const,
        dueDate: new Date(2020, 0, 1), // Jan 1 2020 — definitely in past
        student: { id: 1, fullname: 'Nguyen Van A' },
        class: { id: 10, name: 'Class A' },
      };
      repo.findRecordsByReport.mockResolvedValue([pastRecord] as any);

      const result = await service.getReport(10, 6, 2026);
      expect(result[0].status).toBe('OVERDUE');
      expect(result[0].daysOverdue).toBeGreaterThan(0);
    });

    it('returns PAID for PAID record even if dueDate is in the past', async () => {
      const paidRecord = {
        ...mockRecord,
        status: 'PAID' as const,
        dueDate: new Date(2020, 0, 1), // past date
        paidAt: new Date(2020, 0, 5),
        student: { id: 1, fullname: 'Nguyen Van A' },
        class: { id: 10, name: 'Class A' },
      };
      repo.findRecordsByReport.mockResolvedValue([paidRecord] as any);

      const result = await service.getReport(10, 6, 2026);
      expect(result[0].status).toBe('PAID');
    });

    it('returns PENDING for PENDING record with future dueDate', async () => {
      const futureRecord = {
        ...mockRecord,
        status: 'PENDING' as const,
        dueDate: new Date(2099, 11, 31), // far future
        student: { id: 1, fullname: 'Nguyen Van A' },
        class: { id: 10, name: 'Class A' },
      };
      repo.findRecordsByReport.mockResolvedValue([futureRecord] as any);

      const result = await service.getReport(10, 6, 2026);
      expect(result[0].status).toBe('PENDING');
      expect(result[0].daysOverdue).toBe(0);
    });

    it('filters by status when statuses array is provided', async () => {
      const records = [
        {
          ...mockRecord,
          id: 1,
          status: 'PAID' as const,
          dueDate: new Date(2020, 0, 1),
          paidAt: new Date(),
          student: { id: 1, fullname: 'Student A' },
          class: { id: 10, name: 'Class A' },
        },
        {
          ...mockRecord,
          id: 2,
          status: 'PENDING' as const,
          dueDate: new Date(2020, 0, 1),
          student: { id: 2, fullname: 'Student B' },
          class: { id: 10, name: 'Class A' },
        },
      ];
      repo.findRecordsByReport.mockResolvedValue(records as any);

      const result = await service.getReport(10, 6, 2026, ['PAID']);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PAID');
    });
  });

  // ─── sendNotifications ────────────────────────────────────────────────────

  describe('sendNotifications', () => {
    it('logs success when ZNS sendTemplate returns status 0', async () => {
      const recordWithParent = {
        ...mockRecord,
        student: {
          id: 1,
          fullname: 'Nguyen Van A',
          parents: [{ id: 1, name: 'Nguyen Van Ba', phoneNumber: '0912345678' }],
        },
        class: { id: 10, name: 'Class A' },
      };
      repo.findRecordsByIds.mockResolvedValue([recordWithParent] as any);
      zaloZns.sendTemplate.mockResolvedValue({ status: 0 });
      repo.logNotification.mockResolvedValue({} as any);

      const result = await service.sendNotifications({ recordIds: [101] });

      expect(zaloZns.sendTemplate).toHaveBeenCalledTimes(1);
      expect(zaloZns.sendTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '84912345678' }),
      );
      expect(repo.logNotification).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, tuitionRecordId: 101 }),
      );
      expect(result.successCount).toBe(1);
      expect(result.totalRecords).toBe(1);
    });

    it('logs failure when ZNS sendTemplate throws error', async () => {
      const recordWithParent = {
        ...mockRecord,
        student: {
          id: 1,
          fullname: 'Nguyen Van A',
          parents: [{ id: 1, name: 'Nguyen Van Ba', phoneNumber: '0912345678' }],
        },
        class: { id: 10, name: 'Class A' },
      };
      repo.findRecordsByIds.mockResolvedValue([recordWithParent] as any);
      zaloZns.sendTemplate.mockRejectedValue(new Error('ZNS API error'));
      repo.logNotification.mockResolvedValue({} as any);

      const result = await service.sendNotifications({ recordIds: [101] });

      expect(repo.logNotification).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
      expect(result.successCount).toBe(0);
    });

    it('returns success: false when student has no parents', async () => {
      const recordNoParents = {
        ...mockRecord,
        student: { id: 1, fullname: 'Nguyen Van A', parents: [] },
        class: { id: 10, name: 'Class A' },
      };
      repo.findRecordsByIds.mockResolvedValue([recordNoParents] as any);

      const result = await service.sendNotifications({ recordIds: [101] });

      expect(zaloZns.sendTemplate).not.toHaveBeenCalled();
      expect(result.successCount).toBe(0);
      expect(result.results[0].error).toContain('No parent');
    });
  });
});
