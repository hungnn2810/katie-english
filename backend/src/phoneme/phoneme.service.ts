import { Injectable } from '@nestjs/common';
import { PhonemeRepository } from './phoneme.repository';

@Injectable()
export class PhonemeService {
  constructor(private readonly phonemeRepository: PhonemeRepository) {}

  findAll() {
    return this.phonemeRepository.findAll();
  }
}
