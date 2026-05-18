import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto, UpdateHomeworkDto, CreateAssignmentDto, UpdateAssignmentDto, CreateReadingHomeworkDto, UpdateReadingHomeworkDto } from './homework.dto';

const partsInclude = {
  parts: {
    include: { words: { orderBy: { order: 'asc' as const } } },
    orderBy: { order: 'asc' as const },
  },
};

const readingActivitiesInclude = {
  readingActivities: {
    include: {
      matchPairs: { orderBy: { order: 'asc' as const } },
      fillBlanks: {
        include: { choices: true },
        orderBy: { order: 'asc' as const },
      },
    },
    orderBy: { order: 'asc' as const },
  },
};

const assignmentInclude = {
  classes: { include: { class: { include: { _count: { select: { students: true } } } } } },
  _count: { select: { sessions: true } },
};

const assignmentDetailInclude = {
  classes: {
    include: {
      class: {
        include: {
          _count: { select: { students: true } },
          students: { select: { id: true, fullname: true } },
        },
      },
    },
  },
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
        ...readingActivitiesInclude,
        assignments: { include: assignmentInclude },
      },
    });
  }

  findById(id: number) {
    return this.prisma.homework.findUnique({
      where: { id },
      include: {
        ...partsInclude,
        ...readingActivitiesInclude,
        assignments: {
          include: {
            ...assignmentDetailInclude,
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
    if (dto.type === 'READING') return this.createReading(dto);
    return this.prisma.homework.create({
      data: {
        type: dto.type,
        name: dto.name ?? null,
        speakingMode: dto.type === 'SPEAKING' ? (dto.speakingMode ?? null) : null,
        speakingPictureUrl: dto.type === 'SPEAKING' ? (dto.speakingPictureUrl ?? null) : null,
        speakingText: dto.type === 'SPEAKING' ? (dto.speakingText ?? null) : null,
        parts: dto.type === 'PHONICS' ? buildPartsCreate(dto.parts) : undefined,
      },
      include: { ...partsInclude, ...readingActivitiesInclude, assignments: { include: assignmentInclude } },
    });
  }

  async createReading(dto: CreateHomeworkDto) {
    return this.prisma.$transaction(async (tx) => {
      const hw = await tx.homework.create({
        data: { type: 'READING', name: dto.name ?? null },
      });
      for (const [actIdx, act] of (dto.readingActivities ?? []).entries()) {
        const activity = await tx.readingActivity.create({
          data: { homeworkId: hw.id, type: act.type, order: actIdx },
        });
        if (act.type === 'MATCH') {
          await tx.matchPair.createMany({
            data: (act.pairs ?? []).map((p, i) => ({
              activityId: activity.id, imageUrl: p.imageUrl, word: p.word, order: i,
            })),
          });
        } else {
          for (const [blankIdx, item] of (act.items ?? []).entries()) {
            const blank = await tx.fillBlank.create({
              data: { activityId: activity.id, sentence: item.sentence, order: blankIdx },
            });
            await tx.fillBlankChoice.createMany({
              data: item.choices.map((c) => ({
                blankId: blank.id, word: c.word, isCorrect: c.isCorrect,
              })),
            });
          }
        }
      }
      return tx.homework.findUnique({
        where: { id: hw.id },
        include: { ...partsInclude, ...readingActivitiesInclude, assignments: { include: assignmentInclude } },
      });
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
      include: { ...partsInclude, ...readingActivitiesInclude, assignments: { include: assignmentInclude } },
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
      include: { classes: { include: { class: true } }, homework: { include: { ...partsInclude, ...readingActivitiesInclude } } },
    });
  }

  findAssignmentById(id: number) {
    return this.prisma.homeworkAssignment.findUnique({
      where: { id },
      include: {
        homework: { include: { ...partsInclude, ...readingActivitiesInclude } },
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
      include: { classes: { include: { class: true } }, homework: { include: { ...partsInclude, ...readingActivitiesInclude } } },
    });
  }

  deleteAssignment(id: number) {
    return this.prisma.homeworkAssignment.delete({ where: { id } });
  }

  // ── Plan 03-01 reading stubs (real queries added in Plan 04) ──────────────

  findReadingById(id: number) {
    return this.prisma.homework.findUnique({
      where: { id },
      include: { assignments: { include: assignmentInclude } },
    });
  }

  async createReadingHomework(_dto: CreateReadingHomeworkDto): Promise<{ id: number; placeholder: true }> {
    return { id: -1, placeholder: true };
  }

  async updateReadingHomework(_id: number, _dto: UpdateReadingHomeworkDto): Promise<{ id: number; placeholder: true }> {
    return { id: _id, placeholder: true };
  }
}
