import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto, UpdateHomeworkDto, CreateAssignmentDto, UpdateAssignmentDto } from './homework.dto';

const partsInclude = {
  parts: {
    include: { words: { orderBy: { order: 'asc' as const } } },
    orderBy: { order: 'asc' as const },
  },
};

const assignmentInclude = {
  classes: { include: { class: true } },
  _count: { select: { sessions: true } },
};

function buildPartsCreate(parts: CreateHomeworkDto['parts']) {
  if (!parts || parts.length === 0) return undefined;
  return {
    create: parts.map((part, partIdx) => ({
      name: part.name,
      order: partIdx,
      words: {
        create: part.words.map((word, wordIdx) => ({
          text: word.text,
          highlight: word.highlight ?? null,
          imageUrl: word.imageUrl ?? null,
          order: wordIdx,
        })),
      },
    })),
  };
}

@Injectable()
export class HomeworkRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.homework.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ...partsInclude,
        assignments: { include: assignmentInclude },
      },
    });
  }

  findById(id: number) {
    return this.prisma.homework.findUnique({
      where: { id },
      include: {
        ...partsInclude,
        assignments: {
          include: {
            classes: { include: { class: true } },
            sessions: {
              include: { student: true },
              orderBy: { startedAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  create(dto: CreateHomeworkDto) {
    return this.prisma.homework.create({
      data: {
        type: dto.type,
        name: dto.name ?? null,
        speakingMode: dto.type === 'SPEAKING' ? (dto.speakingMode ?? null) : null,
        speakingPictureUrl: dto.type === 'SPEAKING' ? (dto.speakingPictureUrl ?? null) : null,
        speakingText: dto.type === 'SPEAKING' ? (dto.speakingText ?? null) : null,
        parts: dto.type === 'PHONICS' ? buildPartsCreate(dto.parts) : undefined,
      },
      include: { ...partsInclude, assignments: { include: assignmentInclude } },
    });
  }

  async update(id: number, dto: UpdateHomeworkDto) {
    if (dto.parts !== undefined) {
      await this.prisma.homeworkPart.deleteMany({ where: { homeworkId: id } });
    }
    return this.prisma.homework.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.speakingMode !== undefined && { speakingMode: dto.speakingMode }),
        ...(dto.speakingPictureUrl !== undefined && { speakingPictureUrl: dto.speakingPictureUrl }),
        ...(dto.speakingText !== undefined && { speakingText: dto.speakingText }),
        ...(dto.parts !== undefined && { parts: buildPartsCreate(dto.parts) }),
      },
      include: { ...partsInclude, assignments: { include: assignmentInclude } },
    });
  }

  delete(id: number) {
    return this.prisma.homework.delete({ where: { id } });
  }

  createAssignment(dto: CreateAssignmentDto) {
    return this.prisma.homeworkAssignment.create({
      data: {
        homeworkId: dto.homeworkId,
        endDate: new Date(dto.endDate),
        classes: { create: dto.classIds.map((classId) => ({ classId })) },
      },
      include: { classes: { include: { class: true } }, homework: { include: partsInclude } },
    });
  }

  findAssignmentById(id: number) {
    return this.prisma.homeworkAssignment.findUnique({
      where: { id },
      include: {
        homework: { include: partsInclude },
        classes: { include: { class: true } },
        sessions: { include: { student: true }, orderBy: { startedAt: 'desc' } },
      },
    });
  }

  async updateAssignment(id: number, dto: UpdateAssignmentDto) {
    if (dto.classIds !== undefined) {
      await this.prisma.homeworkAssignmentClass.deleteMany({ where: { assignmentId: id } });
      await this.prisma.homeworkAssignmentClass.createMany({
        data: dto.classIds.map((classId) => ({ assignmentId: id, classId })),
      });
    }
    return this.prisma.homeworkAssignment.update({
      where: { id },
      data: { ...(dto.endDate && { endDate: new Date(dto.endDate) }) },
      include: { classes: { include: { class: true } }, homework: { include: partsInclude } },
    });
  }

  deleteAssignment(id: number) {
    return this.prisma.homeworkAssignment.delete({ where: { id } });
  }
}
