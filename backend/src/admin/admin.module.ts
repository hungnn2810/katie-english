import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminTeachersService } from './admin-teachers.service';
import { AdminTeachersController } from './admin-teachers.controller';
import { AdminClassesService } from './admin-classes.service';
import { AdminClassesController } from './admin-classes.controller';
import { AdminStudentsService } from './admin-students.service';
import { AdminStudentsController } from './admin-students.controller';
import { AdminHomeworkService } from './admin-homework.service';
import { AdminHomeworkController } from './admin-homework.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AdminAuthService, AdminStatsService, AdminTeachersService, AdminClassesService, AdminStudentsService, AdminHomeworkService],
  controllers: [AdminAuthController, AdminStatsController, AdminTeachersController, AdminClassesController, AdminStudentsController, AdminHomeworkController],
})
export class AdminModule {}
