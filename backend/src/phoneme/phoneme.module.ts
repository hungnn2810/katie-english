import { Module } from '@nestjs/common';
import { PhonemeController } from './phoneme.controller';
import { PhonemeService } from './phoneme.service';
import { PhonemeRepository } from './phoneme.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PhonemeController],
  providers: [PhonemeService, PhonemeRepository],
  exports: [PhonemeRepository],
})
export class PhonemeModule {}
