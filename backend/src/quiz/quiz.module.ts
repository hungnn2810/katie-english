import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizRepository } from './quiz.repository';

@Module({
  controllers: [QuizController],
  providers: [QuizService, QuizRepository],
})
export class QuizModule {}
