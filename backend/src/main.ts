import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

async function ensureAdminUser(prisma: PrismaService) {
  const upn = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!upn || !password) return;
  const existing = await prisma.user.findUnique({ where: { upn } });
  if (existing) return;
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { upn, email: upn, password: hashed, role: UserRole.ADMIN, approved: true },
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.enableCors({
    origin: [
      process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'https://admin.katie.vn',
      process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://app.katie.vn',
      process.env.NEXT_PUBLIC_STUDENT_ORIGIN ?? 'https://student.katie.vn',
    ],
    credentials: true,
  });
  await ensureTeacherUser(app.get(PrismaService));
  await ensureAdminUser(app.get(PrismaService));
  await app.listen(process.env.PORT ?? 3001);
  console.log(`Backend running on port ${process.env.PORT ?? 3001}`);
}

bootstrap();
