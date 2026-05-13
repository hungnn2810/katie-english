import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { HomeworkRepository } from './homework.repository';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';
import { ImageController } from './image.controller';

@Module({
  imports: [PrismaModule, AuthModule, MulterModule.register()],
  providers: [HomeworkRepository, HomeworkService],
  controllers: [HomeworkController, ImageController],
})
export class HomeworkModule {}
