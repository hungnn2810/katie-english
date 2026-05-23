import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminClassesService } from './admin-classes.service';
import { AdminClassesController } from './admin-classes.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AdminAuthService, AdminStatsService, AdminClassesService],
  controllers: [AdminAuthController, AdminStatsController, AdminClassesController],
})
export class AdminModule {}
