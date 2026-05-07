import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto, UpdateHomeworkDto } from './homework.dto';

const partInclude = {
  parts: {
    orderBy: { orderIndex: 'asc' as const },
    include: { words: { orderBy: { orderIndex: 'asc' as const }, include: { word: true } } },
  },
};

@Injectable()
export class HomeworkRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.homework.findMany({
      orderBy: { dayAssigned: 'desc' },
      include: {
        class: true,
        ...partInclude,
        _count: { select: { sessions: true } },
      },
    });
  }

  findById(id: number) {
    return this.prisma.homework.findUnique({
      where: { id },
      include: {
        class: true,
        ...partInclude,
        sessions: { include: { student: true, wordResults: { include: { word: true } } } },
      },
    });
  }

  findByClass(classId: number) {
    return this.prisma.homework.findMany({
      where: { classId },
      orderBy: { dayAssigned: 'desc' },
      include: partInclude,
    });
  }

  async create(dto: CreateHomeworkDto) {
    return this.prisma.homework.create({
      data: {
        dayAssigned: new Date(dto.dayAssigned),
        closedDatetime: new Date(dto.closedDatetime),
        classId: dto.classId,
        parts: {
          create: dto.parts.map((p, i) => ({
            type: p.type,
            orderIndex: i,
            phonicsItems: p.type === 'PHONICS' ? (p.phonicsItems ?? []) : [],
            ...(p.type !== 'PHONICS' && p.wordIds?.length
              ? { words: { create: p.wordIds.map((wordId, j) => ({ wordId, orderIndex: j })) } }
              : {}),
          })),
        },
      },
      include: { ...partInclude },
    });
  }

  async update(id: number, dto: UpdateHomeworkDto) {
    if (dto.parts !== undefined) {
      await this.prisma.homeworkPart.deleteMany({ where: { homeworkId: id } });
      for (let i = 0; i < dto.parts.length; i++) {
        const p = dto.parts[i];
        await this.prisma.homeworkPart.create({
          data: {
            homeworkId: id,
            type: p.type,
            orderIndex: i,
            phonicsItems: p.type === 'PHONICS' ? (p.phonicsItems ?? []) : [],
            ...(p.type !== 'PHONICS' && p.wordIds?.length
              ? { words: { create: p.wordIds.map((wordId, j) => ({ wordId, orderIndex: j })) } }
              : {}),
          },
        });
      }
    }
    return this.prisma.homework.update({
      where: { id },
      data: {
        ...(dto.dayAssigned && { dayAssigned: new Date(dto.dayAssigned) }),
        ...(dto.closedDatetime && { closedDatetime: new Date(dto.closedDatetime) }),
        ...(dto.classId !== undefined && { classId: dto.classId }),
      },
      include: { ...partInclude },
    });
  }

  delete(id: number) {
    return this.prisma.homework.delete({ where: { id } });
  }
}
