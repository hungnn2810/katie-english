import { Controller, Post, Body } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { SubmitAnswerDto } from './quiz.dto';

@Controller('phonics')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('submit')
  submit(@Body() dto: SubmitAnswerDto) {
    return this.quizService.submitAnswer(dto);
  }
}
