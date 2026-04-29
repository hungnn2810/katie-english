import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PhonemeModule } from './phoneme/phoneme.module';
import { WordModule } from './word/word.module';
import { QuizModule } from './quiz/quiz.module';
import { StudentModule } from './student/student.module';
import { ClassModule } from './class/class.module';
import { HomeworkModule } from './homework/homework.module';

@Module({
  imports: [PrismaModule, PhonemeModule, WordModule, QuizModule, StudentModule, ClassModule, HomeworkModule],
})
export class AppModule {}
