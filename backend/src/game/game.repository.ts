import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const homeworkPartsInclude = {
  parts: {
    orderBy: { orderIndex: 'asc' as const },
    include: {
      words: {
        orderBy: { orderIndex: 'asc' as const },
        include: {
          word: {
            include: {
              wordPhonemes: { orderBy: { orderIndex: 'asc' as const }, include: { phoneme: true } },
            },
          },
        },
      },
    },
  },
};

const homeworkPartsSimpleInclude = {
  parts: {
    orderBy: { orderIndex: 'asc' as const },
    include: { words: { orderBy: { orderIndex: 'asc' as const }, include: { word: true } } },
  },
};

@Injectable()
export class GameRepository {
  constructor(private readonly prisma: PrismaService) {}

  getAvailableHomework(studentId: number) {
    return this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            homeworks: {
              where: { closedDatetime: { gte: new Date() } },
              include: {
                ...homeworkPartsSimpleInclude,
                sessions: {
                  where: { studentId, completedAt: { not: null } },
                  orderBy: { score: 'desc' },
                },
              },
            },
          },
        },
      },
    });
  }

  findCompletedSession(studentId: number, homeworkId: number) {
    return this.prisma.homeworkSession.findFirst({
      where: { studentId, homeworkId, completedAt: { not: null } },
    });
  }

  createSession(studentId: number, homeworkId: number) {
    return this.prisma.homeworkSession.create({
      data: { studentId, homeworkId },
      include: { homework: { include: homeworkPartsSimpleInclude } },
    });
  }

  getSession(id: number) {
    return this.prisma.homeworkSession.findUnique({
      where: { id },
      include: {
        homework: { include: homeworkPartsInclude },
        student: true,
        wordResults: { include: { word: true } },
      },
    });
  }

  saveWordResult(sessionId: number, wordId: number, transcribedText: string, score: number) {
    return this.prisma.homeworkWordResult.upsert({
      where: { sessionId_wordId: { sessionId, wordId } },
      update: { transcribedText, score },
      create: { sessionId, wordId, transcribedText, score },
    });
  }

  completeSession(id: number, videoUrl: string | null, score: number) {
    return this.prisma.homeworkSession.update({
      where: { id },
      data: { videoUrl, score, completedAt: new Date() },
      include: { wordResults: { include: { word: true } } },
    });
  }

  listSessions(homeworkId?: number, studentId?: number) {
    return this.prisma.homeworkSession.findMany({
      where: {
        ...(homeworkId ? { homeworkId } : {}),
        ...(studentId ? { studentId } : {}),
      },
      orderBy: { startedAt: 'desc' },
      include: {
        student: true,
        homework: { include: homeworkPartsSimpleInclude },
        wordResults: { orderBy: { id: 'asc' }, include: { word: true } },
      },
    });
  }
}
