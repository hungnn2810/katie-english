import { Controller, Get, UseGuards } from '@nestjs/common';
import { PhonemeService } from './phoneme.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('phonics/phonemes')
export class PhonemeController {
  constructor(private readonly phonemeService: PhonemeService) {}

  @Get()
  findAll() {
    return this.phonemeService.findAll();
  }
}
