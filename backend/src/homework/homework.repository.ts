import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto, UpdateHomeworkDto, CreateAssignmentDto, UpdateAssignmentDto, CreateReadingHomeworkDto, UpdateReadingHomeworkDto, CreateVocabHomeworkDto, UpdateVocabHomeworkDto } from './homework.dto';

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

const vocabItemsInclude = {
  vocabItems: {
    orderBy: { order: 'asc' as const },
  },
};

const assignmentInclude = {
  classes: { include: { class: { include: { _count: { select: { students: true } } } } } },
  _count: { select: { sessions: true } },
  sessions: {
    where: { completedAt: { not: null } },
    select: { studentId: true, completedAt: true },
    orderBy: { startedAt: 'desc' as const },
  },
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

function buildReadingActivitiesCreate(activities: CreateReadingHomeworkDto['activities'] | undefined) {
  if (!activities || activities.length === 0) return undefined;
  return {
    create: activities.map((act, idx) => ({
      type: act.type,
      order: idx,
      ...(act.type === 'MATCH'
        ? {
            matchPairs: {
              create: (act.pairs ?? []).map((p, pIdx) => ({
                imageUrl: p.imageUrl,
                word: p.word,
                order: pIdx,
              })),
            },
          }
        : {
            // FILL_BLANK: reconstruct sentence from segments, build choices from blank segments
            fillBlanks: {
              create: (() => {
                const segs = act.segments ?? [];
                // Group segments into one FillBlank row per blank segment
                // Build a single sentence string; choices come from blank segments
                const sentence = segs.map((s) => (s.blank ? '___' : s.text)).join('');
                const blankSegs = segs.filter((s) => s.blank);
                if (blankSegs.length === 0) return [];
                return [{
                  sentence,
                  order: 0,
                  choices: {
                    create: blankSegs.flatMap((s) => {
                      const distractors = (s.distractors ?? []).map((w) => ({ word: w, isCorrect: false }));
                      return [{ word: s.correctWord ?? s.text, isCorrect: true }, ...distractors];
                    }),
                  },
                }];
              })(),
            },
          }),
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
        homework: { include: { ...partsInclude, ...readingActivitiesInclude, ...vocabItemsInclude } },
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

  // ── Plan 03-04 reading — real Prisma implementations ─────────────────────

  findReadingById(id: number) {
    return this.prisma.homework.findUnique({
      where: { id },
      include: { ...readingActivitiesInclude, assignments: { include: assignmentInclude } },
    });
  }

  createReadingHomework(dto: CreateReadingHomeworkDto) {
    return this.prisma.homework.create({
      data: {
        type: 'READING',
        name: dto.name,
        readingActivities: buildReadingActivitiesCreate(dto.activities),
      },
      include: { ...readingActivitiesInclude, assignments: { include: assignmentInclude } },
    });
  }

  async updateReadingHomework(id: number, dto: UpdateReadingHomeworkDto) {
    if (dto.activities !== undefined) {
      await this.prisma.readingActivity.deleteMany({ where: { homeworkId: id } });
    }
    return this.prisma.homework.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.activities !== undefined ? { readingActivities: buildReadingActivitiesCreate(dto.activities) } : {}),
      },
      include: { ...readingActivitiesInclude, assignments: { include: assignmentInclude } },
    });
  }

  // ── Plan 08-02 vocab CRUD ─────────────────────────────────────────────────

  findVocabById(id: number) {
    return this.prisma.homework.findUnique({
      where: { id },
      include: {
        ...vocabItemsInclude,
        assignments: { include: assignmentInclude },
      },
    });
  }

  createVocabHomework(dto: CreateVocabHomeworkDto) {
    return this.prisma.homework.create({
      data: {
        type: 'VOCABULARY',
        name: dto.name,
        vocabItems: {
          create: dto.items.map((item, idx) => ({
            imageUrl: item.imageUrl,
            word: item.word,
            phonemes: item.phonemes ? JSON.stringify(item.phonemes) : null,
            order: idx,
          })),
        },
      },
      include: { ...vocabItemsInclude, assignments: { include: assignmentInclude } },
    });
  }

  async updateVocabHomework(id: number, dto: UpdateVocabHomeworkDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.items !== undefined) {
        await tx.vocabItem.deleteMany({ where: { homeworkId: id } });
      }
      return tx.homework.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.items !== undefined
            ? {
                vocabItems: {
                  create: dto.items.map((item, idx) => ({
                    imageUrl: item.imageUrl,
                    word: item.word,
                    phonemes: item.phonemes ? JSON.stringify(item.phonemes) : null,
                    order: idx,
                  })),
                },
              }
            : {}),
        },
        include: { ...vocabItemsInclude, assignments: { include: assignmentInclude } },
      });
    });
  }
}
