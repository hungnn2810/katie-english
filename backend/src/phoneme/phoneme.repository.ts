import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PhonemeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.phoneme.findMany();
  }

  findBySymbol(symbol: string) {
    return this.prisma.phoneme.findUnique({ where: { symbol } });
  }
}
