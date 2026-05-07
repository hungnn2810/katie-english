import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './class.dto';
import { ClassStatus, Prisma } from '@prisma/client';

@Injectable()
export class ClassRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.class.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { students: true, homeworks: true } } },
    });
  }

  findById(id: number) {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        students: true,
        homeworks: { include: { parts: { include: { words: { include: { word: true } } } } } },
      },
    });
  }

  create(dto: CreateClassDto) {
    return this.prisma.class.create({
      data: {
        name: dto.name,
        code: dto.code,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: (dto.status as ClassStatus) ?? 'PENDING',
        scheduleSlots: (dto.scheduleSlots ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  update(id: number, dto: UpdateClassDto) {
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

  delete(id: number) {
    return this.prisma.class.delete({ where: { id } });
  }
}
