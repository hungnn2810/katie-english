import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

const homeworkInclude = {
  parts: {
    include: { words: { orderBy: { order: 'asc' as const } } },
    orderBy: { order: 'asc' as const },
  },
  ...readingActivitiesInclude,
};

const sessionInclude = {
  assignment: {
    include: {
      homework: { include: homeworkInclude },
      classes: { include: { class: true } },
    },
  },
  student: true,
  speakingResults: true,
  phonicsResults: { include: { word: true } },
  // NOTE: Per-activity result tracking (readingActivityResults with matchingResults/fillInBlankResults)
  // was deferred — the DB schema stores only the aggregate ReadingResult (correctItems/totalItems/score).
  // The homework's readingActivities structure is available via assignment.homework.readingActivities
  // (included above through homeworkInclude → readingActivitiesInclude).
  readingResult: true,
};

@Injectable()
export class GameRepository {
  constructor(private readonly prisma: PrismaService) {}

  getAvailableAssignments(studentId: number) {
    return this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            assignments: {
              where: { assignment: { endDate: { gte: new Date() } } },
              include: {
                assignment: {
                  include: {
                    homework: { include: homeworkInclude },
                    classes: { include: { class: true } },
                    sessions: {
                      where: { studentId, completedAt: { not: null } },
                      orderBy: { score: 'desc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  createSession(studentId: number, assignmentId: number) {
    return this.prisma.homeworkSession.create({
      data: { studentId, assignmentId },
      include: { assignment: { include: { homework: { include: homeworkInclude } } } },
    });
  }

  getSession(id: number) {
    return this.prisma.homeworkSession.findUnique({
      where: { id },
      include: sessionInclude,
    });
  }

  saveSpeakingResult(sessionId: number, transcribedText: string, score: number, matchedWords: number, totalWords: number, phonemesJson: string | null = null) {
    return this.prisma.speakingResult.upsert({
      where: { sessionId },
      update: { transcribedText, score, matchedWords, totalWords, phonemes: phonemesJson },
      create: { sessionId, transcribedText, score, matchedWords, totalWords, phonemes: phonemesJson },
    });
  }

  savePhonicsResult(sessionId: number, wordId: number, transcribedText: string, score: number) {
    return this.prisma.phonicsItemResult.upsert({
      where: { sessionId_wordId: { sessionId, wordId } },
      update: { transcribedText, score },
      create: { sessionId, wordId, transcribedText, score },
      include: { word: true },
    });
  }

  completeSession(id: number, score: number) {
    return this.prisma.homeworkSession.update({
      where: { id },
      data: { score, completedAt: new Date() },
      include: {
        speakingResults: true,
        phonicsResults: { include: { word: true } },
      },
    });
  }

  saveReadingResult(sessionId: number, totalItems: number, correctItems: number, score: number) {
    return this.prisma.readingResult.upsert({
      where: { sessionId },
      update: { totalItems, correctItems, score },
      create: { sessionId, totalItems, correctItems, score },
    });
  }

  getReadingResult(sessionId: number) {
    return this.prisma.readingResult.findUnique({ where: { sessionId } });
  }

  listSessions(assignmentId?: number, studentId?: number) {
    return this.prisma.homeworkSession.findMany({
      where: {
        ...(assignmentId ? { assignmentId } : {}),
        ...(studentId ? { studentId } : {}),
      },
      orderBy: { startedAt: 'desc' },
      include: {
        student: true,
        assignment: { include: { homework: { include: homeworkInclude } } },
      },
    });
  }
}
