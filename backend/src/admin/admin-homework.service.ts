import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminHomeworkService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.homework.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        speakingMode: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { assignments: true } },
        assignments: {
          select: {
            _count: { select: { sessions: true } },
          },
        },
      },
    });

    return rows.map((row) => {
      const { assignments, ...rest } = row;
      const submissionCount = assignments.reduce(
        (sum, a) => sum + a._count.sessions,
        0,
      );
      return { ...rest, submissionCount };
    });
  }

  async findById(id: number) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!homework) throw new NotFoundException(`Homework ${id} not found`);
    return homework;
  }

  async delete(id: number): Promise<{ deleted: true }> {
    await this.findById(id);

    await this.prisma.$transaction(async (tx) => {
      const assignmentRows = await tx.homeworkAssignment.findMany({
        where: { homeworkId: id },
        select: { id: true },
      });
      const assignmentIds = assignmentRows.map((r) => r.id);

      if (assignmentIds.length > 0) {
        await tx.homeworkSession.deleteMany({
          where: { assignmentId: { in: assignmentIds } },
        });
      }

      await tx.homework.delete({ where: { id } });
    });

    return { deleted: true };
  }
}
