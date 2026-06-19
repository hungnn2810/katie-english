import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTuitionConfigDto } from './tuition.dto';

@Injectable()
export class TuitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findConfig(classId: number) {
    return this.prisma.tuitionConfig.findUnique({ where: { classId } });
  }

  upsertConfig(classId: number, dto: CreateTuitionConfigDto) {
    const data = {
      pricePerSession: dto.pricePerSession,
      bookFee: dto.bookFee ?? null,
      dueDayOfMonth: dto.dueDayOfMonth,
    };
    return this.prisma.tuitionConfig.upsert({
      where: { classId },
      update: data,
      create: { classId, ...data },
    });
  }

  findClassById(classId: number) {
    return this.prisma.class.findUnique({ where: { id: classId } });
  }

  findStudentsByClass(classId: number) {
    return this.prisma.student.findMany({ where: { classId } });
  }

  countRecords(classId: number, month: number, year: number) {
    return this.prisma.tuitionRecord.count({ where: { classId, month, year } });
  }

  createRecord(data: {
    studentId: number;
    classId: number;
    month: number;
    year: number;
    tuitionAmount: number;
    bookFee: number;
    totalAmount: number;
    dueDate: Date;
    status: string;
  }) {
    return this.prisma.tuitionRecord.create({ data: data as any });
  }

  findRecordsByReport(classId: number, month: number, year: number) {
    return this.prisma.tuitionRecord.findMany({
      where: { classId, month, year },
      include: { student: true, class: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findRecordsByIds(ids: number[]) {
    return this.prisma.tuitionRecord.findMany({
      where: { id: { in: ids } },
      include: {
        student: { include: { parents: true } },
        class: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  updateRecord(id: number, data: Record<string, any>) {
    return this.prisma.tuitionRecord.update({ where: { id }, data });
  }

  logNotification(data: {
    tuitionRecordId: number;
    sentAt: Date;
    zaloResponse: string;
    success: boolean;
  }) {
    return this.prisma.tuitionNotificationLog.create({ data });
  }
}
