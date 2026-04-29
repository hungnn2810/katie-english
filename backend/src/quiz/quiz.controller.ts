import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { SubmitAnswerDto } from './quiz.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('phonics')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('submit')
  submit(@Body() dto: SubmitAnswerDto) {
    return this.quizService.submitAnswer(dto);
  }
}
