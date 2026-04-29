import { Injectable, NotFoundException } from '@nestjs/common';
import { QuizRepository } from './quiz.repository';
import { SubmitAnswerDto } from './quiz.dto';

@Injectable()
export class QuizService {
  constructor(private readonly quizRepository: QuizRepository) {}

  async submitAnswer(dto: SubmitAnswerDto) {
    const wordPhonemes = await this.quizRepository.getCorrectPhonemes(dto.wordId);

    if (wordPhonemes.length === 0) {
      throw new NotFoundException(`Word ${dto.wordId} not found`);
    }

    const correctAnswer = wordPhonemes.map((wp) => wp.phoneme.symbol);
    const isCorrect =
      correctAnswer.length === dto.selectedPhonemes.length &&
      correctAnswer.every((s, i) => s === dto.selectedPhonemes[i]);

    return { isCorrect, correctAnswer };
  }
}
