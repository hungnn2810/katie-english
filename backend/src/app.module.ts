import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { PhonemeModule } from './phoneme/phoneme.module';
import { WordModule } from './word/word.module';
import { QuizModule } from './quiz/quiz.module';
import { StorageModule } from './storage/storage.module';
import { StudentModule } from './student/student.module';
import { ClassModule } from './class/class.module';
import { HomeworkModule } from './homework/homework.module';
import { GameModule } from './game/game.module';
import { AuthModule } from './auth/auth.module';
import { BfaModule } from './bfa/bfa.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuthModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 10 },
      { name: 'admin-login', ttl: 60_000, limit: 5 },
    ]),
    AdminModule,
    BfaModule,
    PhonemeModule,
    WordModule,
    QuizModule,
    StudentModule,
    ClassModule,
    HomeworkModule,
    GameModule,
  ],
})
export class AppModule {}
