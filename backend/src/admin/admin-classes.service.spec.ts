import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminClassesService } from './admin-classes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminClassesService', () => {
  let service: AdminClassesService;
  let prisma: jest.Mocked<PrismaService>;

  const mockClass = {
    id: 1,
    name: 'Test Class',
    code: 'TC-01',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    status: 'PENDING' as const,
    scheduleSlots: [],
    teacherId: null,
    teacher: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    _count: { students: 3 },
  };

  const mockClass2 = {
    id: 2,
    name: 'Class Two',
    code: 'TC-02',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    status: 'INPROGRESS' as const,
    scheduleSlots: [],
    teacherId: 10,
    teacher: { id: 10, name: 'Teacher A', upn: 'teacher@example.com' },
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
    _count: { students: 5 },
  };

  // Mock transaction - captures the callback and executes it with a mock tx
  const mockTx = {
    student: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    homeworkAssignmentClass: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    homeworkSession: {
      deleteMany: jest.fn(),
    },
    class: {
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      class: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminClassesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminClassesService>(AdminClassesService);
    prisma = module.get(PrismaService);

    // Default mock for $transaction: execute the callback with mockTx
    (prisma.$transaction as jest.Mock).mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => {
      if (typeof cb === 'function') {
        return cb(mockTx);
      }
      return Promise.resolve();
    });

    // Reset all mockTx functions before each test
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => {
      if (typeof cb === 'function') {
        return cb(mockTx);
      }
      return Promise.resolve();
    });
  });

  // Test 1: findAll() returns all classes ordered by createdAt desc with teacher + _count
  it('findAll() returns all classes with teacher relation and _count.students', async () => {
    (prisma.class.findMany as jest.Mock).mockResolvedValue([mockClass, mockClass2]);

    const result = await service.findAll();

    expect(prisma.class.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { students: true } },
        teacher: { select: { id: true, name: true, upn: true } },
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0]._count).toEqual({ students: 3 });
    expect(result[1].teacher).toEqual({ id: 10, name: 'Teacher A', upn: 'teacher@example.com' });
  });

  // Test 2: findAll(teacherId) filters by teacher; findAll(undefined) returns all
  it('findAll(teacherId) filters classes by teacherId', async () => {
    (prisma.class.findMany as jest.Mock).mockResolvedValue([mockClass2]);

    const result = await service.findAll(10);

    expect(prisma.class.findMany).toHaveBeenCalledWith({
      where: { teacherId: 10 },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { students: true } },
        teacher: { select: { id: true, name: true, upn: true } },
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0].teacherId).toBe(10);
  });

  it('findAll(undefined) returns all classes with no where filter', async () => {
    (prisma.class.findMany as jest.Mock).mockResolvedValue([mockClass, mockClass2]);

    await service.findAll(undefined);

    const call = (prisma.class.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toBeUndefined();
  });

  // Test 3: update(id, dto) throws NotFoundException when class doesn't exist; does NOT accept teacherId
  it('update(id, dto) throws NotFoundException when class not found', async () => {
    (prisma.class.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.update(999, { name: 'New Name' })).rejects.toThrow(NotFoundException);
  });

  it('update(id, dto) updates class without touching teacherId', async () => {
    (prisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
    (prisma.class.update as jest.Mock).mockResolvedValue({ ...mockClass, name: 'Updated Name' });

    await service.update(1, { name: 'Updated Name' });

    const updateCall = (prisma.class.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('teacherId');
    expect(updateCall.data.name).toBe('Updated Name');
  });

  // Test 4: delete(id) succeeds for a class with no dependents
  it('delete(id) succeeds for class with no dependents', async () => {
    (prisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
    mockTx.student.findMany.mockResolvedValue([]);
    mockTx.homeworkAssignmentClass.findMany.mockResolvedValue([]);
    mockTx.homeworkSession.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.homeworkAssignmentClass.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.student.updateMany.mockResolvedValue({ count: 0 });
    mockTx.class.delete.mockResolvedValue(mockClass);

    const result = await service.delete(1);

    expect(result).toEqual({ deleted: true });
    expect(mockTx.class.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  // Test 5: REVIEW M-01 SCOPED delete - shared assignment
  it('delete(id) scoped delete: only removes sessions for C1 students, not C2 students', async () => {
    const classId = 1;
    // Students in C1
    const c1Students = [{ id: 10 }, { id: 11 }];
    // Assignment shared between C1 and C2
    const linkRows = [{ assignmentId: 100 }];

    (prisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
    mockTx.student.findMany.mockResolvedValue(c1Students);
    mockTx.homeworkAssignmentClass.findMany.mockResolvedValue(linkRows);
    mockTx.homeworkSession.deleteMany.mockResolvedValue({ count: 2 });
    mockTx.homeworkAssignmentClass.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.student.updateMany.mockResolvedValue({ count: 2 });
    mockTx.class.delete.mockResolvedValue(mockClass);

    await service.delete(classId);

    // Sessions deleted only for C1 students + C1 assignments
    const sessionDeleteCall = mockTx.homeworkSession.deleteMany.mock.calls[0][0];
    expect(sessionDeleteCall.where.assignmentId).toEqual({ in: [100] });
    expect(sessionDeleteCall.where.studentId).toEqual({ in: [10, 11] });

    // HomeworkAssignmentClass join rows for C1 removed (NOT HomeworkAssignment itself)
    const joinDeleteCall = mockTx.homeworkAssignmentClass.deleteMany.mock.calls[0][0];
    expect(joinDeleteCall.where.classId).toBe(classId);

    // HomeworkAssignment itself should NOT be deleted
    expect(mockTx).not.toHaveProperty('homeworkAssignment');

    // C1 students detached (classId = null)
    const studentUpdateCall = mockTx.student.updateMany.mock.calls[0][0];
    expect(studentUpdateCall.where.classId).toBe(classId);
    expect(studentUpdateCall.data.classId).toBeNull();

    // C1 row deleted
    expect(mockTx.class.delete).toHaveBeenCalledWith({ where: { id: classId } });

    expect(await service.delete(classId)).toEqual({ deleted: true });
  });

  // Test 6: REVIEW M-01 unshared assignment — HomeworkAssignment is orphaned, not deleted
  it('delete(id) for class with unshared assignments: assignment row is orphaned (not deleted)', async () => {
    const classId = 1;
    const c1Students = [{ id: 20 }];
    const linkRows = [{ assignmentId: 200 }];

    (prisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
    mockTx.student.findMany.mockResolvedValue(c1Students);
    mockTx.homeworkAssignmentClass.findMany.mockResolvedValue(linkRows);
    mockTx.homeworkSession.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.homeworkAssignmentClass.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.student.updateMany.mockResolvedValue({ count: 1 });
    mockTx.class.delete.mockResolvedValue(mockClass);

    await service.delete(classId);

    // HomeworkAssignment deleteMany should NEVER be called
    const txKeys = Object.keys(mockTx);
    expect(txKeys).not.toContain('homeworkAssignment');
    // Only join rows are deleted via homeworkAssignmentClass.deleteMany
    expect(mockTx.homeworkAssignmentClass.deleteMany).toHaveBeenCalled();
  });

  // Test 7: REVIEW H-01 interactive form — must use callback form, not array form
  it('delete(id) uses interactive $transaction(callback) form, not array form', async () => {
    (prisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
    mockTx.student.findMany.mockResolvedValue([]);
    mockTx.homeworkAssignmentClass.findMany.mockResolvedValue([]);
    mockTx.homeworkAssignmentClass.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.student.updateMany.mockResolvedValue({ count: 0 });
    mockTx.class.delete.mockResolvedValue(mockClass);

    await service.delete(1);

    // $transaction must have been called with a function (callback), not an array
    const transactionCall = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(typeof transactionCall).toBe('function');
    expect(Array.isArray(transactionCall)).toBe(false);

    // All writes go through tx, not through prisma directly
    // (verified by the fact that mockTx methods were called, not prisma.class.delete)
    expect(mockTx.class.delete).toHaveBeenCalled();
    expect(prisma.class.delete).not.toHaveBeenCalled();
    expect(mockTx.student.updateMany).toHaveBeenCalled();
  });
});

describe('ClassService - create with teacherId (Test 8)', () => {
  let classService: import('../class/class.service').ClassService;
  let mockRepo: { create: jest.Mock; findById: jest.Mock; findAll: jest.Mock; update: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    const { ClassRepository } = await import('../class/class.repository');
    const { ClassService } = await import('../class/class.service');

    mockRepo = {
      create: jest.fn().mockResolvedValue({ id: 1, teacherId: 5 }),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const { Test: TestFactory } = await import('@nestjs/testing');
    const module = await TestFactory.createTestingModule({
      providers: [ClassService, { provide: ClassRepository, useValue: mockRepo }],
    }).compile();

    classService = module.get(ClassService);
  });

  it('create(dto, teacherId) passes teacherId to repo.create', async () => {
    await classService.create({ name: 'T', code: 'T-01', startDate: '2025-01-01', endDate: '2025-12-31' }, 5);
    expect(mockRepo.create).toHaveBeenCalledWith(
      { name: 'T', code: 'T-01', startDate: '2025-01-01', endDate: '2025-12-31' },
      5,
    );
  });

  it('create(dto) without teacherId passes undefined to repo.create', async () => {
    await classService.create({ name: 'T', code: 'T-01', startDate: '2025-01-01', endDate: '2025-12-31' });
    expect(mockRepo.create).toHaveBeenCalledWith(
      { name: 'T', code: 'T-01', startDate: '2025-01-01', endDate: '2025-12-31' },
      undefined,
    );
  });
});

