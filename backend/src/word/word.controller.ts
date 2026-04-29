import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { WordService } from './word.service';

@Controller('phonics/words')
export class WordController {
  constructor(private readonly wordService: WordService) {}

  @Get('random')
  getRandom(
    @Query('level', new DefaultValuePipe(1), ParseIntPipe) level: number,
  ) {
    return this.wordService.getRandomWord(level);
  }
}
