import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuizRepository {
  constructor(private readonly prisma: PrismaService) {}

  getCorrectPhonemes(wordId: number) {
    return this.prisma.wordPhoneme.findMany({
      where: { wordId },
      orderBy: { orderIndex: 'asc' },
      include: { phoneme: true },
    });
  }
}
