import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClassRepository } from './class.repository';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';

@Module({ imports: [PrismaModule], providers: [ClassRepository, ClassService], controllers: [ClassController] })
export class ClassModule {}
