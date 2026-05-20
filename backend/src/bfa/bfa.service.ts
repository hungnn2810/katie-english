import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData = require('form-data');
import { BfaAlignResult, BfaAnalyzeResult, BfaSpeakingResult, WhisperXResult } from './bfa.dto';

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
    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav';
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
    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav';
    form.append('audio', audioBuffer, { filename: `audio.${ext}`, contentType: mimeType });

    const response = await axios.post<WhisperXResult>(
      `${this.baseUrl}/transcribe`,
      form,
      { headers: form.getHeaders(), timeout: 120_000 },
    );
    return response.data;
  }

  async analyze(
    audioBuffer: Buffer,
    mimeType: string,
    word: string,
    expectedPhonemes: string[],
  ): Promise<BfaAnalyzeResult> {
    const form = new FormData();
    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav';
    form.append('audio', audioBuffer, { filename: `audio.${ext}`, contentType: mimeType });
    form.append('word', word);
    form.append('expected_phonemes', JSON.stringify(expectedPhonemes));

    const response = await axios.post<BfaAnalyzeResult>(
      `${this.baseUrl}/analyze`,
      form,
      { headers: form.getHeaders(), timeout: 120_000 },
    );
    return response.data;
  }

  async analyzeSpeaking(
    audioBuffer: Buffer,
    mimeType: string,
    targetText: string,
    mode: 'SCRIPT_MATCH' | 'FREE_SPEAK' = 'SCRIPT_MATCH',
  ): Promise<BfaSpeakingResult> {
    const form = new FormData();
    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'wav';
    form.append('audio', audioBuffer, { filename: `audio.${ext}`, contentType: mimeType });
    form.append('target_text', targetText);
    form.append('mode', mode);

    const response = await axios.post<BfaSpeakingResult>(
      `${this.baseUrl}/analyze-speaking`,
      form,
      { headers: form.getHeaders(), timeout: 180_000 },
    );
    return response.data;
  }
}
