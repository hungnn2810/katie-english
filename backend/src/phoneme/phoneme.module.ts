import { Module } from '@nestjs/common';
import { PhonemeController } from './phoneme.controller';
import { PhonemeService } from './phoneme.service';
import { PhonemeRepository } from './phoneme.repository';

@Module({
  controllers: [PhonemeController],
  providers: [PhonemeService, PhonemeRepository],
  exports: [PhonemeRepository],
})
export class PhonemeModule {}
