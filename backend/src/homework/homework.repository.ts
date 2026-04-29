import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto, UpdateHomeworkDto } from './homework.dto';

@Injectable()
export class HomeworkRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.homework.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { phonemes: true, classes: true } },
      },
    });
  }

  findById(id: number) {
    return this.prisma.homework.findUnique({
      where: { id },
      include: {
        phonemes: {
          orderBy: { orderIndex: 'asc' },
          include: { phoneme: true },
        },
        classes: { include: { class: true } },
      },
    });
  }

  async create(dto: CreateHomeworkDto) {
    return this.prisma.homework.create({
      data: {
        title: dto.title,
        description: dto.description,
        phonemes: {
          create: dto.phonemeIds.map((phonemeId, i) => ({
            phonemeId,
            orderIndex: i,
          })),
        },
      },
      include: {
        phonemes: { orderBy: { orderIndex: 'asc' }, include: { phoneme: true } },
      },
    });
  }

  async update(id: number, dto: UpdateHomeworkDto) {
    if (dto.phonemeIds !== undefined) {
      await this.prisma.homeworkPhoneme.deleteMany({ where: { homeworkId: id } });
      await this.prisma.homeworkPhoneme.createMany({
        data: dto.phonemeIds.map((phonemeId, i) => ({
          homeworkId: id,
          phonemeId,
          orderIndex: i,
        })),
      });
    }

    return this.prisma.homework.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: {
        phonemes: { orderBy: { orderIndex: 'asc' }, include: { phoneme: true } },
      },
    });
  }

  delete(id: number) {
    return this.prisma.homework.delete({ where: { id } });
  }
}
