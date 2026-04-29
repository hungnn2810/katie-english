import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WordRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.word.findMany({
      orderBy: { text: 'asc' },
      select: { id: true, text: true, difficulty: true },
    });
  }

  async findRandomByDifficulty(difficulty: number) {
    const words = await this.prisma.word.findMany({
      where: { difficulty },
      include: {
        wordPhonemes: {
          orderBy: { orderIndex: 'asc' },
          include: { phoneme: true },
        },
      },
    });

    if (words.length === 0) return null;
    return words[Math.floor(Math.random() * words.length)];
  }

  findById(id: number) {
    return this.prisma.word.findUnique({
      where: { id },
      include: {
        wordPhonemes: {
          orderBy: { orderIndex: 'asc' },
          include: { phoneme: true },
        },
      },
    });
  }
}
