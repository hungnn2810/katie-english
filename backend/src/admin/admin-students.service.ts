import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminStudentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.student.findMany({
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
  }

  async findById(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!student) throw new NotFoundException(`Student ${id} not found`);
    return student;
  }

  async getResults(studentId: number) {
    await this.findById(studentId);
    return this.prisma.homeworkSession.findMany({
      where: { studentId },
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
  }

  async findSessionById(id: number) {
    const session = await this.prisma.homeworkSession.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  async deleteSession(id: number): Promise<{ deleted: true }> {
    await this.findSessionById(id);
    await this.prisma.homeworkSession.delete({ where: { id } });
    return { deleted: true };
  }
}
