import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HomeworkRepository } from './homework.repository';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';

@Module({ imports: [PrismaModule], providers: [HomeworkRepository, HomeworkService], controllers: [HomeworkController] })
export class HomeworkModule {}
