import { Controller, Get } from '@nestjs/common';
import { PhonemeService } from './phoneme.service';

@Controller('phonics/phonemes')
export class PhonemeController {
  constructor(private readonly phonemeService: PhonemeService) {}

  @Get()
  findAll() {
    return this.phonemeService.findAll();
  }
}
