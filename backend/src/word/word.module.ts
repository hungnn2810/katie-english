import { Module } from '@nestjs/common';
import { WordController } from './word.controller';
import { WordService } from './word.service';
import { WordRepository } from './word.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WordController],
  providers: [WordService, WordRepository],
  exports: [WordService, WordRepository],
})
export class WordModule {}
