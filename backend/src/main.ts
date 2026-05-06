import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function ensureTeacherUser(prisma: PrismaService) {
  const upn = process.env.TEACHER_EMAIL;
  const password = process.env.TEACHER_PASSWORD;
  if (!upn || !password) return;
  const existing = await prisma.user.findUnique({ where: { upn } });
  if (existing) return;
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { upn, password: hashed, role: UserRole.TEACHER, approved: true },
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });
  app.enableCors({ origin: '*' });
  await ensureTeacherUser(app.get(PrismaService));
  await app.listen(process.env.PORT ?? 3001);
  console.log(`Backend running on port ${process.env.PORT ?? 3001}`);
}

bootstrap();
