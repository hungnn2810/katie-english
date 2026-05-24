import { Test } from '@nestjs/testing';
import { AdminStudentsService } from './admin-students.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockStudent = {
  id: 1,
  fullname: 'Alice',
  sex: 'FEMALE' as const,
  classId: 10,
  createdAt: new Date('2026-01-01'),
  class: {
    id: 10,
    name: 'Class A',
    code: 'CA01',
    teacher: { id: 5, name: 'Mr T', upn: 'teacher@test.com' },
  },
  _count: { sessions: 3 },
};

const mockStudentNoClass = {
  id: 2,
  fullname: 'Bob',
  sex: 'MALE' as const,
  classId: null,
  createdAt: new Date('2026-02-01'),
  class: null,
  _count: { sessions: 0 },
};

const mockStudentClassNoTeacher = {
  id: 3,
  fullname: 'Charlie',
  sex: 'MALE' as const,
  classId: 20,
  createdAt: new Date('2026-03-01'),
  class: {
    id: 20,
    name: 'Class B',
    code: 'CB01',
    teacher: null,
  },
  _count: { sessions: 1 },
};

const mockSession = {
  id: 100,
  startedAt: new Date('2026-04-01'),
  completedAt: new Date('2026-04-02'),
  score: 85,
  assignment: {
    id: 50,
    endDate: new Date('2026-04-30'),
    homework: { id: 10, name: 'Phonics HW 1', type: 'PHONICS' },
  },
};

const mockSessionInProgress = {
  id: 101,
  startedAt: new Date('2026-04-03'),
  completedAt: null,
  score: null,
  assignment: {
    id: 51,
    endDate: new Date('2026-04-30'),
    homework: { id: 11, name: 'Speaking HW 1', type: 'SPEAKING' },
  },
};

describe('AdminStudentsService', () => {
  let service: AdminStudentsService;
  let prisma: {
    student: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    homeworkSession: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      student: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      homeworkSession: {
        findMany: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AdminStudentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AdminStudentsService);
  });

  // Test 1: findAll returns every Student ordered by fullname asc with _count and class
  describe('findAll', () => {
    it('returns all students ordered by fullname asc with _count.sessions and class.teacher', async () => {
      prisma.student.findMany.mockResolvedValue([mockStudent, mockStudentNoClass]);

      await service.findAll();

      expect(prisma.student.findMany).toHaveBeenCalledWith({
        orderBy: { fullname: 'asc' },
        select: {
          id: true,
          fullname: true,
          sex: true,
          classId: true,
          createdAt: true,
          class: {
            select: {
              id: true,
              name: true,
              code: true,
              teacher: { select: { id: true, name: true, upn: true } },
            },
          },
          _count: { select: { sessions: true } },
        },
      });
    });
  });

  // Test 2: Students with classId === null are still returned with class: null
  describe('findAll - students without class', () => {
    it('includes students with no class (classId null)', async () => {
      prisma.student.findMany.mockResolvedValue([mockStudentNoClass]);
      const result = await service.findAll();
      expect(result).toEqual([mockStudentNoClass]);
      expect(result[0].class).toBeNull();
    });
  });

  // Test 3: A class with teacherId === null returns class.teacher === null (no crash)
  describe('findAll - class with no teacher', () => {
    it('includes students whose class has no teacher (teacher: null)', async () => {
      prisma.student.findMany.mockResolvedValue([mockStudentClassNoTeacher]);
      const result = await service.findAll();
      expect(result[0].class?.teacher).toBeNull();
    });
  });

  // Test 4: getResults returns HomeworkSession rows ordered by startedAt desc (including in-progress)
  describe('getResults', () => {
    it('returns session rows ordered by startedAt desc for existing student', async () => {
      prisma.student.findUnique.mockResolvedValue({ id: 1 });
      prisma.homeworkSession.findMany.mockResolvedValue([mockSession, mockSessionInProgress]);

      await service.getResults(1);

      expect(prisma.homeworkSession.findMany).toHaveBeenCalledWith({
        where: { studentId: 1 },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          startedAt: true,
          completedAt: true,
          score: true,
          assignment: {
            select: {
              id: true,
              endDate: true,
              homework: { select: { id: true, name: true, type: true } },
            },
          },
        },
      });
    });

    it('includes in-progress sessions (completedAt === null)', async () => {
      prisma.student.findUnique.mockResolvedValue({ id: 1 });
      prisma.homeworkSession.findMany.mockResolvedValue([mockSessionInProgress]);

      const result = await service.getResults(1);
      expect(result[0].completedAt).toBeNull();
    });
  });

  // Test 5: getResults throws NotFoundException for non-existent studentId
  describe('getResults - not found', () => {
    it('throws NotFoundException when student does not exist', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.getResults(999)).rejects.toThrow(
        new NotFoundException('Student 999 not found'),
      );
    });
  });

  // Test 6: getResults returns [] for a student with zero sessions
  describe('getResults - zero sessions', () => {
    it('returns empty array when student has no sessions', async () => {
      prisma.student.findUnique.mockResolvedValue({ id: 1 });
      prisma.homeworkSession.findMany.mockResolvedValue([]);

      const result = await service.getResults(1);
      expect(result).toEqual([]);
    });
  });
});
