import { Test } from '@nestjs/testing';
import { AdminStatsService } from './admin-stats.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminStatsService', () => {
  let service: AdminStatsService;
  let prisma: {
    user: { count: jest.Mock };
    class: { count: jest.Mock };
    student: { count: jest.Mock };
    homeworkSession: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { count: jest.fn().mockResolvedValue(3) },
      class: { count: jest.fn().mockResolvedValue(5) },
      student: { count: jest.fn().mockResolvedValue(20) },
      homeworkSession: { count: jest.fn().mockResolvedValue(42) },
    };

    const module = await Test.createTestingModule({
      providers: [
        AdminStatsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AdminStatsService);
  });

  it('returns stats with all counts as numbers >= 0', async () => {
    const stats = await service.getStats();

    expect(typeof stats.teachers).toBe('number');
    expect(typeof stats.classes).toBe('number');
    expect(typeof stats.students).toBe('number');
    expect(typeof stats.submissions).toBe('number');
    expect(stats.teachers).toBeGreaterThanOrEqual(0);
    expect(stats.classes).toBeGreaterThanOrEqual(0);
    expect(stats.students).toBeGreaterThanOrEqual(0);
    expect(stats.submissions).toBeGreaterThanOrEqual(0);
  });

  it('counts submissions only where completedAt is not null', async () => {
    await service.getStats();

    expect(prisma.homeworkSession.count).toHaveBeenCalledWith({
      where: { completedAt: { not: null } },
    });
  });

  it('counts teachers by TEACHER role', async () => {
    await service.getStats();

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { role: 'TEACHER' },
    });
  });

  it('returns the expected shape { teachers, classes, students, submissions }', async () => {
    const stats = await service.getStats();

    expect(stats).toEqual({
      teachers: 3,
      classes: 5,
      students: 20,
      submissions: 42,
    });
  });
});
