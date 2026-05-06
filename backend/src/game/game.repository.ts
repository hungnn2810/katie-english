import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
                words: { orderBy: { orderIndex: 'asc' }, include: { word: true } },
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
      include: {
        homework: {
          include: { words: { orderBy: { orderIndex: 'asc' }, include: { word: true } } },
        },
      },
    });
  }

  getSession(id: number) {
    return this.prisma.homeworkSession.findUnique({
      where: { id },
      include: {
        homework: {
          include: {
            words: {
              orderBy: { orderIndex: 'asc' },
              include: {
                word: {
                  include: {
                    wordPhonemes: { orderBy: { orderIndex: 'asc' }, include: { phoneme: true } },
                  },
                },
              },
            },
          },
        },
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
        homework: { include: { words: { orderBy: { orderIndex: 'asc' }, include: { word: true } } } },
        wordResults: { orderBy: { id: 'asc' }, include: { word: true } },
      },
    });
  }
}
