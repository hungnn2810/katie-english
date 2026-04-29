import { Module } from '@nestjs/common';
import { WordController } from './word.controller';
import { WordService } from './word.service';
import { WordRepository } from './word.repository';

@Module({
  controllers: [WordController],
  providers: [WordService, WordRepository],
  exports: [WordService],
})
export class WordModule {}
