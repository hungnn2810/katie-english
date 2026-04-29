import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ClassRepository } from './class.repository';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';

@Module({ imports: [PrismaModule, AuthModule], providers: [ClassRepository, ClassService], controllers: [ClassController] })
export class ClassModule {}
