import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TuitionRepository } from './tuition.repository';
import { TuitionService } from './tuition.service';
import { ZaloZnsService } from './zalo-zns.service';
import { TuitionController } from './tuition.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [TuitionRepository, TuitionService, ZaloZnsService],
  controllers: [TuitionController],
})
export class TuitionModule {}
