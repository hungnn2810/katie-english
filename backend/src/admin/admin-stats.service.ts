import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [teachers, classes, students, submissions] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.TEACHER } }),
      this.prisma.class.count(),
      this.prisma.student.count(),
      this.prisma.homeworkSession.count({ where: { completedAt: { not: null } } }),
    ]);
    return { teachers, classes, students, submissions };
  }
}
