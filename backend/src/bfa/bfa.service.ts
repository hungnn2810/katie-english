import { Injectable, Logger } from '@nestjs/common';
import { execFileSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { BfaAlignResult, BfaAnalyzeResult, BfaSpeakingResult, WhisperXResult } from './bfa.dto';

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY ?? '';
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION ?? 'eastus';
const PHONEME_CORRECT_THRESHOLD = parseInt(process.env.AZURE_PHONEME_CORRECT_THRESHOLD ?? '80', 10);
const PHONEME_SIMILAR_THRESHOLD = parseInt(process.env.AZURE_PHONEME_SIMILAR_THRESHOLD ?? '50', 10);
const MIN_WORD_SCORE = parseInt(process.env.AZURE_MIN_WORD_SCORE ?? '70', 10);

function mimeToExt(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('quicktime')) return 'mov';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('aac')) return 'aac';
  return 'wav';
}

function toWav(audioBuffer: Buffer, mimeType: string): Buffer {
  const ext = mimeToExt(mimeType);
  const tmpIn = path.join(os.tmpdir(), `apa-in-${process.hrtime.bigint()}.${ext}`);
  const tmpOut = path.join(os.tmpdir(), `apa-out-${process.hrtime.bigint()}.wav`);
  try {
    fs.writeFileSync(tmpIn, audioBuffer);
    execFileSync('ffmpeg', ['-y', '-i', tmpIn, '-ar', '16000', '-ac', '1', '-f', 'wav', tmpOut], {
      timeout: 30_000,
      stdio: 'pipe',
    });
    return fs.readFileSync(tmpOut);
  } finally {
    try { fs.unlinkSync(tmpIn); } catch { /* best-effort */ }
    try { fs.unlinkSync(tmpOut); } catch { /* best-effort */ }
  }
}

function mapPhonemeOps(wordData: Record<string, any>) {
  const errorType: string = wordData?.PronunciationAssessment?.ErrorType ?? 'None';
  const phonemes: Record<string, any>[] = wordData?.Phonemes ?? [];
  return phonemes.map((p) => {
    const symbol: string = p.Phoneme ?? '';
    const score: number = p.PronunciationAssessment?.AccuracyScore ?? 0;
    const offsetTicks: number = p.Offset ?? 0;
    const durationTicks: number = p.Duration ?? 0;
    const start = Math.round((offsetTicks / 10_000_000) * 10000) / 10000;
    const dur = Math.round((durationTicks / 10_000_000) * 10000) / 10000;

    let status: 'correct' | 'similar' | 'substituted' | 'missing';
    if (errorType === 'Omission') {
      status = 'missing';
    } else if (score >= PHONEME_CORRECT_THRESHOLD) {
      status = 'correct';
    } else if (score >= PHONEME_SIMILAR_THRESHOLD) {
      status = 'similar';
    } else {
      status = 'substituted';
    }

    return {
      status,
      expected: symbol,
      aligned: status === 'missing' ? null : symbol,
      start: status === 'missing' ? undefined : start,
      end: status === 'missing' ? undefined : Math.round((start + dur) * 10000) / 10000,
      duration: status === 'missing' ? undefined : dur,
    };
  });
}

@Injectable()
export class BfaService {
  private readonly logger = new Logger(BfaService.name);
  private readonly sttBase = `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;

  private async azurePA(wavBuffer: Buffer, referenceText: string): Promise<Record<string, any>> {
    const params = new URLSearchParams({
      language: 'en-US',
      format: 'detailed',
      'pronunciation.referenceText': referenceText,
      'pronunciation.granularity': 'Phoneme',
      'pronunciation.gradingSystem': 'HundredMark',
      'pronunciation.enableMiscue': 'True',
    });
    const resp = await axios.post(`${this.sttBase}?${params}`, wavBuffer, {
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        Accept: 'application/json',
      },
      timeout: 30_000,
    });
    return resp.data as Record<string, any>;
  }

  private async azureSTT(wavBuffer: Buffer): Promise<Record<string, any>> {
    const params = new URLSearchParams({ language: 'en-US', format: 'detailed' });
    const resp = await axios.post(`${this.sttBase}?${params}`, wavBuffer, {
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        Accept: 'application/json',
      },
      timeout: 30_000,
    });
    return resp.data as Record<string, any>;
  }

  async analyze(audioBuffer: Buffer, mimeType: string, word: string, _expectedPhonemes: string[]): Promise<BfaAnalyzeResult> {
    let wavBuffer: Buffer;
    try {
      wavBuffer = toWav(audioBuffer, mimeType);
    } catch (err) {
      this.logger.warn(`[analyze] ffmpeg failed: ${(err as Error).message}`);
      return { success: false, error: 'audio_conversion_failed', message: '', word, phonemes: [], feedback: [], score: 0, transcription: { text: '' } };
    }

    let paResult: Record<string, any>;
    try {
      paResult = await this.azurePA(wavBuffer, word);
    } catch (err) {
      this.logger.warn(`[analyze] Azure PA failed: ${(err as Error).message}`);
      return { success: false, error: 'speech_not_detected', message: 'Không nghe rõ — nói to hơn nhé', word, phonemes: [], feedback: [], score: 0, transcription: { text: '' } };
    }

    if (paResult.RecognitionStatus !== 'Success') {
      return { success: false, error: 'speech_not_detected', message: 'Không nghe rõ — nói to hơn nhé', word, phonemes: [], feedback: [], score: 0, transcription: { text: '' } };
    }

    const transcript = ((paResult.DisplayText as string) ?? '').replace(/\.$/, '').trim();
    const nbest = ((paResult.NBest as any[]) ?? [{}])[0] ?? {};
    const wordData = ((nbest.Words as any[]) ?? [])[0] ?? {};
    const score = Math.round((wordData.PronunciationAssessment?.AccuracyScore as number) ?? 0);
    const ops = mapPhonemeOps(wordData);
    const phonemes = ops
      .filter((op) => op.status !== 'missing')
      .map((op) => ({ symbol: op.expected ?? '', ipa: op.expected ?? '', start: op.start ?? 0, end: op.end ?? 0, duration: op.duration ?? 0 }));

    return { success: true, transcription: { text: transcript }, phonemes, score, feedback: ops, word, espeak_fallback: false };
  }

  async align(audioBuffer: Buffer, mimeType: string, word: string, expectedPhonemes: string[]): Promise<BfaAlignResult> {
    return this.analyze(audioBuffer, mimeType, word, expectedPhonemes);
  }

  async analyzeSpeaking(audioBuffer: Buffer, mimeType: string, targetText: string): Promise<BfaSpeakingResult> {
    let wavBuffer: Buffer;
    try {
      wavBuffer = toWav(audioBuffer, mimeType);
    } catch (err) {
      this.logger.warn(`[analyzeSpeaking] ffmpeg failed: ${(err as Error).message}`);
      const targetWords = targetText.trim().split(/\s+/).filter(Boolean);
      return { success: false, transcription: { text: '' }, words: [], overall_score: 0, matched_words: 0, total_words: targetWords.length };
    }

    const targetWords = targetText.trim().split(/\s+/).filter(Boolean);

    let paResult: Record<string, any>;
    try {
      paResult = await this.azurePA(wavBuffer, targetText);
    } catch (err) {
      this.logger.warn(`[analyzeSpeaking] Azure PA failed: ${(err as Error).message}`);
      return { success: false, transcription: { text: '' }, words: [], overall_score: 0, matched_words: 0, total_words: targetWords.length };
    }

    if (paResult.RecognitionStatus !== 'Success') {
      return { success: false, transcription: { text: '' }, words: [], overall_score: 0, matched_words: 0, total_words: targetWords.length };
    }

    const transcript = ((paResult.DisplayText as string) ?? '').replace(/\.$/, '').trim();
    const nbest = ((paResult.NBest as any[]) ?? [{}])[0] ?? {};
    const overallScore = Math.round((nbest.PronunciationAssessment?.AccuracyScore as number) ?? 0);
    const azureWords: any[] = (nbest.Words as any[]) ?? [];

    // Filter student insertions so positional index aligns with targetWords
    const alignedWords = azureWords.filter(
      (w: any) => (w.PronunciationAssessment?.ErrorType ?? 'None') !== 'Insertion',
    );

    const wordResults = targetWords.map((tw, i) => {
      const aw = alignedWords[i] ?? {};
      const wScore = Math.round((aw.PronunciationAssessment?.AccuracyScore as number) ?? 0);
      const ops = mapPhonemeOps(aw);
      const phonemes = ops
        .filter((op) => op.status !== 'missing')
        .map((op) => ({ symbol: op.expected ?? '', ipa: op.expected ?? '', start: op.start ?? 0, end: op.end ?? 0, duration: op.duration ?? 0 }));
      return { word: tw, phonemes, score: wScore, feedback: ops };
    });

    const matched = wordResults.filter((w) => w.score >= MIN_WORD_SCORE).length;
    return { success: true, transcription: { text: transcript }, words: wordResults, overall_score: overallScore, matched_words: matched, total_words: targetWords.length };
  }

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<WhisperXResult> {
    let wavBuffer: Buffer;
    try {
      wavBuffer = toWav(audioBuffer, mimeType);
    } catch (err) {
      this.logger.warn(`[transcribe] ffmpeg failed: ${(err as Error).message}`);
      return { text: '', words: [] };
    }

    let sttResult: Record<string, any>;
    try {
      sttResult = await this.azureSTT(wavBuffer);
    } catch (err) {
      this.logger.warn(`[transcribe] Azure STT failed: ${(err as Error).message}`);
      return { text: '', words: [] };
    }

    if (sttResult.RecognitionStatus !== 'Success') {
      return { text: '', words: [] };
    }

    const transcript = ((sttResult.DisplayText as string) ?? '').replace(/\.$/, '').trim();
    const nbest = ((sttResult.NBest as any[]) ?? [{}])[0] ?? {};
    const words = ((nbest.Words as any[]) ?? []).map((w: any) => ({
      word: w.Word ?? '',
      start: Math.round(((w.Offset ?? 0) / 10_000_000) * 10000) / 10000,
      end: Math.round((((w.Offset ?? 0) + (w.Duration ?? 0)) / 10_000_000) * 10000) / 10000,
      score: 1.0,
    }));

    return { text: transcript, words };
  }
}
