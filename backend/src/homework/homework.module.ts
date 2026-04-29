import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { HomeworkRepository } from './homework.repository';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';

@Module({ imports: [PrismaModule, AuthModule], providers: [HomeworkRepository, HomeworkService], controllers: [HomeworkController] })
export class HomeworkModule {}
