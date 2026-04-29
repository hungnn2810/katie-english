import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe, UseGuards } from '@nestjs/common';
import { WordService } from './word.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('phonics/words')
export class WordController {
  constructor(private readonly wordService: WordService) {}

  @Get()
  findAll() {
    return this.wordService.findAll();
  }

  @Get('random')
  getRandom(
    @Query('level', new DefaultValuePipe(1), ParseIntPipe) level: number,
  ) {
    return this.wordService.getRandomWord(level);
  }
}
