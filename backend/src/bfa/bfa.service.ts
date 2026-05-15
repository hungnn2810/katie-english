import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData = require('form-data');
import { BfaAlignResult, WhisperXResult } from './bfa.dto';

function mimeToExt(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('quicktime')) return 'mov';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('aac')) return 'aac';
  return 'wav';
}

@Injectable()
export class BfaService {
  private readonly logger = new Logger(BfaService.name);
  private readonly baseUrl = process.env.BFA_URL ?? 'http://localhost:3002';

  async align(
    audioBuffer: Buffer,
    mimeType: string,
    word: string,
    expectedPhonemes: string[],
  ): Promise<BfaAlignResult> {
    const form = new FormData();
    const ext = mimeToExt(mimeType);
    form.append('audio', audioBuffer, { filename: `audio.${ext}`, contentType: mimeType });
    form.append('word', word);
    form.append('expected_phonemes', JSON.stringify(expectedPhonemes));

    const response = await axios.post<BfaAlignResult>(
      `${this.baseUrl}/align`,
      form,
      { headers: form.getHeaders(), timeout: 60_000 },
    );
    return response.data;
  }

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<WhisperXResult> {
    const form = new FormData();
    const ext = mimeToExt(mimeType);
    form.append('audio', audioBuffer, { filename: `audio.${ext}`, contentType: mimeType });

    const response = await axios.post<WhisperXResult>(
      `${this.baseUrl}/transcribe`,
      form,
      { headers: form.getHeaders(), timeout: 120_000 },
    );
    return response.data;
  }
}
