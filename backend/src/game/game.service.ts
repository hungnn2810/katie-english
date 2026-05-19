import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { GameRepository } from './game.repository';
import { StorageService } from '../storage/storage.service';
import { BfaService } from '../bfa/bfa.service';
import { BfaAnalyzeResult } from '../bfa/bfa.dto';
import { WordRepository } from '../word/word.repository';
import { StartSessionDto, SavePhonicsResultDto, SaveReadingResultDto } from './game.dto';
import { calcSpeakingScore, calcFreeSpeak } from './game.scoring';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly repo: GameRepository,
    private readonly storage: StorageService,
    private readonly bfa: BfaService,
    private readonly wordRepository: WordRepository,
  ) {}

  async getAvailableAssignments(studentId: number) {
    const student = await this.repo.getAvailableAssignments(studentId);
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    return (student.class?.assignments ?? []).map((ac) => ac.assignment);
  }

  async startSession(dto: StartSessionDto) {
    return this.repo.createSession(dto.studentId, dto.assignmentId);
  }

  async getSession(id: number) {
    const session = await this.repo.getSession(id);
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  async saveSpeakingResult(sessionId: number, audioBuffer?: Buffer, mimeType?: string) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.completedAt) throw new BadRequestException('Session already completed');

    const hw = session.assignment.homework;
    if (hw.type !== 'SPEAKING') throw new BadRequestException('Homework is not a SPEAKING type');
    if (!hw.speakingText) throw new BadRequestException('Homework has no speaking text');

    let transcribedText = '';
    if (audioBuffer && audioBuffer.length > 0) {
      try {
        const result = await this.bfa.transcribe(audioBuffer, mimeType ?? 'audio/webm');
        transcribedText = result.text;
        this.logger.log(`[session=${sessionId}] WhisperX speaking transcription: "${transcribedText}"`);
      } catch (err) {
        this.logger.warn(`[session=${sessionId}] WhisperX transcribe error: ${(err as Error).message}`);
      }
    }

    const speakingMode = (hw as { speakingMode?: 'FREE_SPEAK' | 'SCRIPT_MATCH' }).speakingMode;
    const { score, matchedWords, totalWords } = speakingMode === 'FREE_SPEAK'
      ? calcFreeSpeak(transcribedText, hw.speakingText)
      : calcSpeakingScore(transcribedText, hw.speakingText);
    this.logger.log(`[session=${sessionId}] speaking score=${score} matched=${matchedWords}/${totalWords} mode=${speakingMode ?? 'SCRIPT_MATCH'}`);

    return this.repo.saveSpeakingResult(sessionId, transcribedText, score, matchedWords, totalWords);
  }

  async savePhonicsResult(
    sessionId: number,
    dto: SavePhonicsResultDto,
    audioBuffer?: Buffer,
    mimeType?: string,
  ) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.completedAt) throw new BadRequestException('Session already completed');

    const hw = session.assignment.homework;
    if (hw.type !== 'PHONICS') throw new BadRequestException('Homework is not a PHONICS type');

    // Find the word text from parts
    let wordText = '';
    for (const part of hw.parts) {
      const found = part.words.find((w) => w.id === dto.wordId);
      if (found) { wordText = found.text; break; }
    }
    if (!wordText) throw new BadRequestException(`Word ${dto.wordId} not found in homework`);

    // Look up stored phonemes for this word (BFA-02: avoids espeak fallback for known words)
    const wordRecord = await this.wordRepository.findByText(wordText.trim().toLowerCase());
    let expectedPhonemes: string[] = [];
    if (wordRecord?.phonemes) {
      try {
        const parsed = JSON.parse(wordRecord.phonemes);
        if (Array.isArray(parsed) && parsed.every((p) => typeof p === 'string')) {
          expectedPhonemes = parsed;
        }
      } catch {
        // malformed JSON in DB — fall through to [] -> espeak fallback
      }
    }

    let score = 0;
    let bfaResult: BfaAnalyzeResult | null = null;
    let transcribedText = dto.transcribedText ?? '';

    this.logger.log(
      `[session=${sessionId}] phonics word="${wordText}" audio=${audioBuffer ? `${audioBuffer.length}B ${mimeType}` : 'none'}`,
    );

    if (audioBuffer && audioBuffer.length > 0) {
      try {
        bfaResult = await this.bfa.analyze(
          audioBuffer,
          mimeType ?? 'audio/webm',
          wordText,
          expectedPhonemes,
        );
        this.logger.log(
          `[session=${sessionId}] BFA analyze: success=${bfaResult.success} score=${bfaResult.score} espeak_fallback=${bfaResult.espeak_fallback ?? false}`,
        );
        transcribedText = bfaResult.transcription?.text ?? transcribedText;
        score = bfaResult.success ? bfaResult.score : 0;
      } catch (err) {
        this.logger.warn(`[session=${sessionId}] BFA analyze error for "${wordText}": ${(err as Error).message}`);
      }
    }

    const result = await this.repo.savePhonicsResult(sessionId, dto.wordId, transcribedText, score);
    return { ...result, bfa: bfaResult };
  }

  async saveReadingResult(sessionId: number, dto: SaveReadingResultDto) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.completedAt) throw new BadRequestException('Session already completed');

    const hw = session.assignment.homework;
    if (hw.type !== 'READING') throw new BadRequestException('Homework is not a READING type');

    if (dto.correctItems < 0 || dto.totalItems < 0) {
      throw new BadRequestException('correctItems and totalItems must be non-negative');
    }
    if (dto.correctItems > dto.totalItems) {
      throw new BadRequestException('correctItems cannot exceed totalItems');
    }

    const score = dto.totalItems > 0 ? Math.round((dto.correctItems / dto.totalItems) * 100) : 0;
    this.logger.log(`[session=${sessionId}] reading score=${score} correct=${dto.correctItems}/${dto.totalItems}`);
    return this.repo.saveReadingResult(sessionId, dto.totalItems, dto.correctItems, score);
  }

  listSessions(assignmentId?: number, studentId?: number) {
    return this.repo.listSessions(assignmentId, studentId);
  }

  streamRecording(videoUrl: string) {
    let key = videoUrl;
    if (videoUrl.startsWith('http')) {
      const bucket = process.env.MINIO_BUCKET ?? 'phonics-audio';
      const marker = `/${bucket}/`;
      const idx = videoUrl.indexOf(marker);
      key = idx >= 0 ? videoUrl.slice(idx + marker.length) : videoUrl.split('/').slice(-1)[0];
    }
    return this.storage.getObject(key);
  }

  async completeSession(sessionId: number, videoBuffer?: Buffer, mimeType?: string) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const hw = session.assignment.homework;

    let videoUrl: string | null = null;
    if (videoBuffer && videoBuffer.length > 0) {
      const ext = mimeType?.includes('webm') ? 'webm' : 'mp4';
      const key = hw.type === 'SPEAKING'
        ? `speaking/${sessionId}/recording.${ext}`
        : `sessions/${sessionId}/recording.${ext}`;
      videoUrl = await this.storage.upload(key, videoBuffer, mimeType ?? 'video/webm');
    }
    let avgScore = 0;

    if (hw.type === 'SPEAKING') {
      const sr = session.speakingResults[0];
      avgScore = sr ? sr.score : 0;
    } else if (hw.type === 'READING') {
      const rr = await this.repo.getReadingResult(sessionId);
      avgScore = rr ? rr.score : 0;
    } else {
      const phonicsResults = session.phonicsResults ?? [];
      const totalWords = hw.parts.reduce((s: number, p: { words: unknown[] }) => s + p.words.length, 0);
      const scoreSum = phonicsResults.reduce((s: number, r: { score: number }) => s + r.score, 0);
      avgScore = totalWords > 0 ? scoreSum / totalWords : 0;
    }

    return this.repo.completeSession(sessionId, videoUrl, Math.round(avgScore));
  }
}
