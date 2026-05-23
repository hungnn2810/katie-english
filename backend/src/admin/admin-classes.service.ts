import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUpdateClassDto } from './admin-classes.dto';
import { ClassStatus, Prisma } from '@prisma/client';

@Injectable()
export class AdminClassesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(teacherId?: number) {
    return this.prisma.class.findMany({
      where: teacherId !== undefined ? { teacherId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { students: true } },
        teacher: { select: { id: true, name: true, upn: true } },
      },
    });
  }

  async findById(id: number) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException(`Class ${id} not found`);
    return cls;
  }

  async update(id: number, dto: AdminUpdateClassDto) {
    await this.findById(id);
    return this.prisma.class.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.status && { status: dto.status as ClassStatus }),
        ...(dto.scheduleSlots !== undefined && { scheduleSlots: dto.scheduleSlots as unknown as Prisma.InputJsonValue }),
      },
    });
  }

  async delete(id: number): Promise<{ deleted: true }> {
    await this.findById(id);

    await this.prisma.$transaction(async (tx) => {
      // Step 1: Capture students currently in this class BEFORE nulling classId
      const students = await tx.student.findMany({ where: { classId: id }, select: { id: true } });
      const studentIds = students.map((s) => s.id);

      // Step 2: Find assignment IDs linked to this class
      const linkRows = await tx.homeworkAssignmentClass.findMany({ where: { classId: id }, select: { assignmentId: true } });
      const assignmentIds = linkRows.map((r) => r.assignmentId);

      // Step 3: Delete ONLY the sessions of THIS class's students for those assignments (REVIEW M-01 scope)
      if (assignmentIds.length > 0 && studentIds.length > 0) {
        await tx.homeworkSession.deleteMany({
          where: {
            assignmentId: { in: assignmentIds },
            studentId: { in: studentIds },
          },
        });
      }

      // Step 4: Remove HomeworkAssignmentClass join rows for THIS class only (NOT the parent HomeworkAssignment)
      await tx.homeworkAssignmentClass.deleteMany({ where: { classId: id } });

      // Step 5: Detach the class's students (now safe — sessions already removed)
      await tx.student.updateMany({ where: { classId: id }, data: { classId: null } });

      // Step 6: Delete the class
      await tx.class.delete({ where: { id } });
    });

    return { deleted: true };
  }
}
