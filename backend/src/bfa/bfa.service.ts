import { Injectable, Logger } from '@nestjs/common';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { toWavPcm } from './azure-audio.util';
import {
  BfaAlignResult,
  BfaAnalyzeResult,
  BfaSpeakingResult,
  BfaSpeakingWordResult,
  PhonemeAlignment,
  PhonemeOp,
  WhisperXResult,
} from './bfa.dto';

@Injectable()
export class BfaService {
  private readonly logger = new Logger(BfaService.name);

  private get speechKey(): string {
    return process.env.AZURE_SPEECH_KEY ?? '';
  }

  private get speechRegion(): string {
    return process.env.AZURE_SPEECH_REGION ?? 'eastus';
  }

  // ── analyze (phonics single word) ────────────────────────────────────────

  async analyze(
    audioBuffer: Buffer,
    mimeType: string,
    word: string,
    _expectedPhonemes: string[],
  ): Promise<BfaAnalyzeResult> {
    const wavBuf = await toWavPcm(audioBuffer, mimeType);

    const speechConfig = sdk.SpeechConfig.fromSubscription(this.speechKey, this.speechRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';

    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = sdk.AudioInputStream.createPushStream(format);
    pushStream.write(wavBuf as unknown as ArrayBuffer);
    pushStream.close();

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

    const pronConfig = new sdk.PronunciationAssessmentConfig(
      word,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true,
    );

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronConfig.applyTo(recognizer);

    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          recognizer.close();
          try {
            resolve(this._mapAnalyzeResult(result, word));
          } catch (e) {
            reject(e);
          }
        },
        (err) => {
          recognizer.close();
          reject(new Error(String(err)));
        },
      );
    });
  }

  // ── transcribe (STT only, no PA scoring) ─────────────────────────────────

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<WhisperXResult> {
    const wavBuf = await toWavPcm(audioBuffer, mimeType);

    const speechConfig = sdk.SpeechConfig.fromSubscription(this.speechKey, this.speechRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';
    speechConfig.requestWordLevelTimestamps();

    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = sdk.AudioInputStream.createPushStream(format);
    pushStream.write(wavBuf as unknown as ArrayBuffer);
    pushStream.close();

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          recognizer.close();
          const json = this._parseJson(result);
          const words = (json?.NBest?.[0]?.Words ?? []).map((w: any) => ({
            word: w.Word,
            start: (w.Offset ?? 0) / 10_000_000,
            end: ((w.Offset ?? 0) + (w.Duration ?? 0)) / 10_000_000,
            score: w.Confidence ?? 0,
          }));
          resolve({ text: result.text ?? '', words });
        },
        (err) => {
          recognizer.close();
          reject(new Error(String(err)));
        },
      );
    });
  }

  // ── analyzeSpeaking ───────────────────────────────────────────────────────

  async analyzeSpeaking(
    audioBuffer: Buffer,
    mimeType: string,
    targetText: string,
    mode: 'SCRIPT_MATCH' | 'FREE_SPEAK' = 'SCRIPT_MATCH',
  ): Promise<BfaSpeakingResult> {
    const wavBuf = await toWavPcm(audioBuffer, mimeType);

    const speechConfig = sdk.SpeechConfig.fromSubscription(this.speechKey, this.speechRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';

    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = sdk.AudioInputStream.createPushStream(format);
    pushStream.write(wavBuf as unknown as ArrayBuffer);
    pushStream.close();

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

    const pronConfig = new sdk.PronunciationAssessmentConfig(
      mode === 'SCRIPT_MATCH' ? targetText : '',
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Word,
      true,
    );

    if (mode === 'FREE_SPEAK') {
      (pronConfig as any).enableContentAssessmentWithTopic('general');
    }

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronConfig.applyTo(recognizer);

    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          recognizer.close();
          try {
            resolve(this._mapSpeakingResult(result, targetText));
          } catch (e) {
            reject(e);
          }
        },
        (err) => {
          recognizer.close();
          reject(new Error(String(err)));
        },
      );
    });
  }

  // ── legacy align() — delegates to analyze(), strips transcription ─────────

  async align(
    audioBuffer: Buffer,
    mimeType: string,
    word: string,
    expectedPhonemes: string[],
  ): Promise<BfaAlignResult> {
    const { transcription: _t, ...rest } = await this.analyze(audioBuffer, mimeType, word, expectedPhonemes);
    return rest;
  }

  // ── private mappers ───────────────────────────────────────────────────────

  private _parseJson(result: sdk.SpeechRecognitionResult): any {
    try {
      return JSON.parse(
        result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult, '{}'),
      );
    } catch {
      return {};
    }
  }

  private _mapPhonemeOp(p: any): PhonemeOp {
    const accuracy: number = p.PronunciationAssessment?.AccuracyScore ?? 0;
    const errorType: string = p.PronunciationAssessment?.ErrorType ?? 'None';

    let status: PhonemeOp['status'];
    if (errorType === 'Omission') status = 'missing';
    else if (errorType === 'Insertion') status = 'extra';
    else if (accuracy >= 80) status = 'correct';
    else if (accuracy >= 50) status = 'similar';
    else status = 'substituted';

    const startSec = (p.Offset ?? 0) / 10_000_000;
    const durSec = (p.Duration ?? 0) / 10_000_000;

    return {
      status,
      expected: errorType === 'Insertion' ? null : p.Phoneme,
      aligned: errorType === 'Omission' ? null : p.Phoneme,
      start: startSec,
      end: startSec + durSec,
      duration: durSec,
    };
  }

  private _mapAnalyzeResult(result: sdk.SpeechRecognitionResult, word: string): BfaAnalyzeResult {
    const json = this._parseJson(result);
    const nBest = json?.NBest?.[0] ?? {};
    const wordResult = nBest?.Words?.[0] ?? {};
    const azPhonemes: any[] = wordResult?.Phonemes ?? [];
    const wordPa = wordResult?.PronunciationAssessment ?? {};
    const sentPa = nBest?.PronunciationAssessment ?? {};

    const feedback: PhonemeOp[] = azPhonemes.map(p => this._mapPhonemeOp(p));
    const phonemes: PhonemeAlignment[] = azPhonemes
      .filter(p => (p.PronunciationAssessment?.ErrorType ?? 'None') !== 'Omission')
      .map(p => ({
        symbol: p.Phoneme,
        ipa: p.Phoneme,
        start: (p.Offset ?? 0) / 10_000_000,
        end: ((p.Offset ?? 0) + (p.Duration ?? 0)) / 10_000_000,
        duration: (p.Duration ?? 0) / 10_000_000,
      }));

    const score = Math.round(wordPa.AccuracyScore ?? sentPa.AccuracyScore ?? 0);

    return {
      success: true,
      transcription: { text: result.text ?? '' },
      phonemes,
      score,
      feedback,
      word,
      espeak_fallback: false,
    };
  }

  private _mapSpeakingResult(
    result: sdk.SpeechRecognitionResult,
    targetText: string,
  ): BfaSpeakingResult {
    const json = this._parseJson(result);
    const nBest = json?.NBest?.[0] ?? {};
    const azWords: any[] = nBest?.Words ?? [];
    const sentPa = nBest?.PronunciationAssessment ?? {};

    const words: BfaSpeakingWordResult[] = azWords.map(w => {
      const azPhonemes: any[] = w.Phonemes ?? [];
      const wordPa = w.PronunciationAssessment ?? {};
      const feedback: PhonemeOp[] = azPhonemes.map(p => this._mapPhonemeOp(p));
      const phonemes: PhonemeAlignment[] = azPhonemes
        .filter(p => (p.PronunciationAssessment?.ErrorType ?? 'None') !== 'Omission')
        .map(p => ({
          symbol: p.Phoneme,
          ipa: p.Phoneme,
          start: (p.Offset ?? 0) / 10_000_000,
          end: ((p.Offset ?? 0) + (p.Duration ?? 0)) / 10_000_000,
          duration: (p.Duration ?? 0) / 10_000_000,
        }));
      return {
        word: w.Word,
        phonemes,
        score: Math.round(wordPa.AccuracyScore ?? 0),
        feedback,
      };
    });

    const matchedWords = words.filter(w => w.score >= 70).length;
    const totalWords = targetText.trim().split(/\s+/).filter(Boolean).length;
    const overallScore = Math.round(sentPa.PronScore ?? sentPa.AccuracyScore ?? 0);

    return {
      success: true,
      transcription: { text: result.text ?? '' },
      words,
      overall_score: overallScore,
      matched_words: matchedWords,
      total_words: totalWords,
    };
  }
}
