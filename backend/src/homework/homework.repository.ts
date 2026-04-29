import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto, UpdateHomeworkDto } from './homework.dto';

@Injectable()
export class HomeworkRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.homework.findMany({
      orderBy: { dayAssigned: 'desc' },
      include: {
        class: true,
        words: { orderBy: { orderIndex: 'asc' }, include: { word: true } },
        _count: { select: { sessions: true } },
      },
    });
  }

  findById(id: number) {
    return this.prisma.homework.findUnique({
      where: { id },
      include: {
        class: true,
        words: { orderBy: { orderIndex: 'asc' }, include: { word: true } },
        sessions: { include: { student: true, wordResults: { include: { word: true } } } },
      },
    });
  }

  findByClass(classId: number) {
    return this.prisma.homework.findMany({
      where: { classId },
      orderBy: { dayAssigned: 'desc' },
      include: { words: { orderBy: { orderIndex: 'asc' }, include: { word: true } } },
    });
  }

  async create(dto: CreateHomeworkDto) {
    return this.prisma.homework.create({
      data: {
        dayAssigned: new Date(dto.dayAssigned),
        closedDatetime: new Date(dto.closedDatetime),
        timeInSeconds: dto.timeInSeconds,
        classId: dto.classId,
        words: {
          create: dto.wordIds.map((wordId, i) => ({ wordId, orderIndex: i })),
        },
      },
      include: { words: { orderBy: { orderIndex: 'asc' }, include: { word: true } } },
    });
  }

  async update(id: number, dto: UpdateHomeworkDto) {
    if (dto.wordIds !== undefined) {
      await this.prisma.homeworkWord.deleteMany({ where: { homeworkId: id } });
      await this.prisma.homeworkWord.createMany({
        data: dto.wordIds.map((wordId, i) => ({ homeworkId: id, wordId, orderIndex: i })),
      });
    }
    return this.prisma.homework.update({
      where: { id },
      data: {
        ...(dto.dayAssigned && { dayAssigned: new Date(dto.dayAssigned) }),
        ...(dto.closedDatetime && { closedDatetime: new Date(dto.closedDatetime) }),
        ...(dto.timeInSeconds !== undefined && { timeInSeconds: dto.timeInSeconds }),
        ...(dto.classId !== undefined && { classId: dto.classId }),
      },
      include: { words: { orderBy: { orderIndex: 'asc' }, include: { word: true } } },
    });
  }

  delete(id: number) {
    return this.prisma.homework.delete({ where: { id } });
  }
}
