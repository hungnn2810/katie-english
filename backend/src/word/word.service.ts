import { Injectable, NotFoundException } from '@nestjs/common';
import { WordRepository } from './word.repository';

@Injectable()
export class WordService {
  constructor(private readonly wordRepository: WordRepository) {}

  async getRandomWord(level: number) {
    const word = await this.wordRepository.findRandomByDifficulty(level);
    if (!word) throw new NotFoundException(`No words found for level ${level}`);

    return {
      wordId: word.id,
      word: word.text,
      wordAudioUrl: word.audioUrl,
      phonemes: word.wordPhonemes.map((wp) => ({
        symbol: wp.phoneme.symbol,
        audioUrl: wp.phoneme.audioUrl,
      })),
    };
  }

  async getWordById(id: number) {
    const word = await this.wordRepository.findById(id);
    if (!word) throw new NotFoundException(`Word ${id} not found`);
    return word;
  }
}
