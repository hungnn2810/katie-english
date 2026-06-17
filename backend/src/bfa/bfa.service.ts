import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as path from 'path';
import { writeFile, readFile, unlink } from 'fs/promises';
import axios from 'axios';

const execFileAsync = promisify(execFile);
import { randomUUID } from 'crypto';
import { BfaAlignResult, BfaAnalyzeResult, BfaSpeakingResult, WhisperXResult } from './bfa.dto';

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY ?? '';
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION ?? 'eastus';
const PHONEME_CORRECT_THRESHOLD = parseInt(process.env.AZURE_PHONEME_CORRECT_THRESHOLD ?? '80', 10);
const PHONEME_SIMILAR_THRESHOLD = parseInt(process.env.AZURE_PHONEME_SIMILAR_THRESHOLD ?? '50', 10);
const MIN_WORD_SCORE = parseInt(process.env.AZURE_MIN_WORD_SCORE ?? '70', 10);

// Prefer bundled ffmpeg-static when available (dev/test), fall back to system ffmpeg (prod)
// eslint-disable-next-line @typescript-eslint/no-require-imports
let FFMPEG_CMD = 'ffmpeg';
try { const s: string | null = require('ffmpeg-static'); if (s) FFMPEG_CMD = s; } catch { /* use system ffmpeg */ }

function mimeToExt(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('quicktime')) return 'mov';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('aac')) return 'aac';
  return 'wav';
}

async function toWav(audioBuffer: Buffer, mimeType: string): Promise<Buffer> {
  const ext = mimeToExt(mimeType);
  const id = randomUUID();
  const tmpIn  = path.join(os.tmpdir(), `apa-in-${id}.${ext}`);
  const tmpOut = path.join(os.tmpdir(), `apa-out-${id}.wav`);
  try {
    await writeFile(tmpIn, audioBuffer);
    await execFileAsync(FFMPEG_CMD, ['-y', '-i', tmpIn, '-ar', '16000', '-ac', '1', '-f', 'wav', tmpOut], {
      timeout: 30_000,
    });
    return await readFile(tmpOut);
  } finally {
    unlink(tmpIn).catch(() => {});
    unlink(tmpOut).catch(() => {});
  }
}

export function mapPhonemeOps(wordData: Record<string, any>) {
  const errorType: string = wordData?.PronunciationAssessment?.ErrorType ?? wordData?.ErrorType ?? 'None';
  const phonemes: Record<string, any>[] = wordData?.Phonemes ?? [];
  return phonemes.map((p) => {
    const symbol: string = p.Phoneme ?? '';
    const score: number = p.PronunciationAssessment?.AccuracyScore ?? p.AccuracyScore ?? 0;
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
    const params = new URLSearchParams({ language: 'en-US', format: 'detailed' });
    const paCfg = Buffer.from(
      JSON.stringify({ ReferenceText: referenceText, GradingSystem: 'HundredMark', Granularity: 'Phoneme', EnableMiscue: true }),
    ).toString('base64');
    const resp = await axios.post(`${this.sttBase}?${params}`, wavBuffer, {
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        Accept: 'application/json',
        'Pronunciation-Assessment': paCfg,
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
      wavBuffer = await toWav(audioBuffer, mimeType);
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
    const azureWords: any[] = (nbest.Words as any[]) ?? [];
    // With enableMiscue=true, extra recognized sounds appear as Insertion words.
    // Find the word matching the reference (non-Insertion); fall back to first non-Insertion word.
    // Never fall back to azureWords[0] — that could be an Insertion with score 0.
    const wordData = azureWords.find(
      (w: any) =>
        (w.PronunciationAssessment?.ErrorType ?? w.ErrorType ?? 'None') !== 'Insertion' &&
        (w.Word ?? '').toLowerCase() === word.toLowerCase(),
    ) ?? azureWords.find((w: any) => (w.PronunciationAssessment?.ErrorType ?? w.ErrorType ?? 'None') !== 'Insertion')
      ?? {};
    const score = Math.round(Number(wordData.PronunciationAssessment?.AccuracyScore ?? wordData.AccuracyScore ?? 0));
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
      wavBuffer = await toWav(audioBuffer, mimeType);
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
    const overallScore = Math.round(Number(nbest.PronunciationAssessment?.AccuracyScore ?? nbest.AccuracyScore ?? 0));
    const azureWords: any[] = (nbest.Words as any[]) ?? [];

    // Filter student insertions so positional index aligns with targetWords
    const alignedWords = azureWords.filter(
      (w: any) => (w.PronunciationAssessment?.ErrorType ?? w.ErrorType ?? 'None') !== 'Insertion',
    );

    const wordResults = targetWords.map((tw, i) => {
      const aw = alignedWords[i] ?? {};
      const wScore = Math.round(Number(aw.PronunciationAssessment?.AccuracyScore ?? aw.AccuracyScore ?? 0));
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
      wavBuffer = await toWav(audioBuffer, mimeType);
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

  async scoreSemantic(
    studentText: string,
    expectedText: string,
    keywords: string[],
  ): Promise<{ semanticScore: number; matchedKeywords: string[] }> {
    // Keyword matching done locally — deterministic, no external call needed
    const lowerStudent = studentText.toLowerCase();
    const matchedKeywords = keywords.filter((kw) =>
      new RegExp(`\\b${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lowerStudent),
    );

    const apiKey = process.env.AZURE_OPENAI_KEY ?? '';
    if (!apiKey) {
      this.logger.warn('[scoreSemantic] AZURE_OPENAI_KEY not set — semanticScore=0');
      return { semanticScore: 0, matchedKeywords };
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT ?? '';
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-mini';
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-08-01-preview';
    const body = {
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a language assessment assistant for young English learners. Score semantic similarity between a student answer and an expected answer. Return only JSON.',
        },
        {
          role: 'user',
          content: `Student answer: "${studentText}"\nExpected answer: "${expectedText}"\n\nReturn: {"semantic_score": <float 0.0-1.0>}\n\nRules: 1.0 = identical meaning, 0.0 = completely unrelated. Be lenient — short correct answers ("Red.") vs full sentences ("The cat is red.") should score 0.7-0.8.`,
        },
      ],
      temperature: 0,
      max_tokens: 50,
    };
    const headers = { 'api-key': apiKey, 'Content-Type': 'application/json' };
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await axios.post(url, body, {
          headers,
          timeout: 15_000,
        });
        const content: string = (resp.data as any)?.choices?.[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(content) as { semantic_score?: number };
        const semanticScore = Math.max(0, Math.min(1, Number(parsed.semantic_score ?? 0)));
        return { semanticScore, matchedKeywords };
      } catch (err: any) {
        const status: number = err?.response?.status ?? 0;
        const errCode: string = err?.response?.data?.error?.code ?? 'unknown';
        const isQuota = errCode === 'insufficient_quota';
        if (isQuota || status !== 429 || attempt === 2) {
          this.logger.warn(`[scoreSemantic] Azure OpenAI error: ${(err as Error).message} | code=${errCode}`);
          return { semanticScore: 0, matchedKeywords };
        }
        const retryAfter = Number(err?.response?.headers?.['retry-after'] ?? 2) * 1000;
        const delay = Math.max(retryAfter, 1000 * 2 ** attempt);
        this.logger.warn(`[scoreSemantic] Azure OpenAI 429 — retry ${attempt + 1}/3 in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    return { semanticScore: 0, matchedKeywords };
  }
}
