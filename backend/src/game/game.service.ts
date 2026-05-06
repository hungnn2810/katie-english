import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { GameRepository } from './game.repository';
import { StorageService } from '../storage/storage.service';
import { BfaService } from '../bfa/bfa.service';
import { BfaAlignResult } from '../bfa/bfa.dto';
import { StartSessionDto, SaveWordResultDto } from './game.dto';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function calcScore(transcribed: string, target: string): number {
  const b = target.toLowerCase().trim();
  if (!b) return 0;
  const words = transcribed.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  if (words.includes(b)) return 100;
  const bestSim = words.reduce((max, w) => {
    const sim = 1 - levenshtein(w, b) / Math.max(w.length, b.length);
    return Math.max(max, sim);
  }, 0);
  return Math.max(0, Math.round(bestSim * 100));
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly repo: GameRepository,
    private readonly storage: StorageService,
    private readonly bfa: BfaService,
  ) {}

  async getAvailableHomework(studentId: number) {
    const student = await this.repo.getAvailableHomework(studentId);
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    return student.class?.homeworks ?? [];
  }

  async startSession(dto: StartSessionDto) {
    return this.repo.createSession(dto.studentId, dto.homeworkId);
  }

  async getSession(id: number) {
    const session = await this.repo.getSession(id);
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  async saveWordResult(
    sessionId: number,
    dto: SaveWordResultDto,
    audioBuffer?: Buffer,
    mimeType?: string,
  ) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.completedAt) throw new BadRequestException('Session already completed');

    const wordEntry = session.homework.words.find((w) => w.wordId === dto.wordId);
    if (!wordEntry) throw new BadRequestException(`Word ${dto.wordId} not in homework`);

    let score: number;
    let bfaResult: BfaAlignResult | null = null;

    this.logger.log(
      `[session=${sessionId}] word="${wordEntry.word.text}" transcribed="${dto.transcribedText ?? ''}" audio=${audioBuffer ? `${audioBuffer.length}B ${mimeType}` : 'none'}`,
    );

    if (audioBuffer && audioBuffer.length > 0) {
      const expectedPhonemes = wordEntry.word.wordPhonemes
        .map((wp) => wp.phoneme.symbol);

      this.logger.log(`[session=${sessionId}] expected phonemes: [${expectedPhonemes.join(', ')}]`);

      try {
        bfaResult = await this.bfa.align(
          audioBuffer,
          mimeType ?? 'audio/webm',
          wordEntry.word.text,
          expectedPhonemes,
        );

        this.logger.log(
          `[session=${sessionId}] BFA result: success=${bfaResult.success} score=${bfaResult.score} aligned=[${bfaResult.phonemes.map((p) => p.ipa).join(', ')}]`,
        );

        if (bfaResult.success) {
          score = bfaResult.score;
        } else {
          this.logger.warn(`[session=${sessionId}] BFA alignment failed for "${wordEntry.word.text}", falling back to Levenshtein`);
          score = calcScore(dto.transcribedText ?? '', wordEntry.word.text);
        }
      } catch (err) {
        this.logger.warn(`[session=${sessionId}] BFA service error for "${wordEntry.word.text}", falling back to Levenshtein: ${(err as Error).message}`);
        score = calcScore(dto.transcribedText ?? '', wordEntry.word.text);
      }
    } else {
      this.logger.log(`[session=${sessionId}] no audio — Levenshtein only`);
      score = calcScore(dto.transcribedText ?? '', wordEntry.word.text);
    }

    this.logger.log(`[session=${sessionId}] final score=${score} for word="${wordEntry.word.text}"`);


    const result = await this.repo.saveWordResult(sessionId, dto.wordId, dto.transcribedText, score);
    return { ...result, bfa: bfaResult };
  }

  listSessions(homeworkId?: number, studentId?: number) {
    return this.repo.listSessions(homeworkId, studentId);
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

    let videoUrl: string | null = null;
    if (videoBuffer && videoBuffer.length > 0) {
      const ext = mimeType?.includes('webm') ? 'webm' : 'mp4';
      const key = `sessions/${sessionId}/recording.${ext}`;
      videoUrl = await this.storage.upload(key, videoBuffer, mimeType ?? 'video/webm');
    }

    const results = session.wordResults;
    const totalWords = session.homework.words.length;
    const avgScore = totalWords > 0
      ? results.reduce((s, r) => s + r.score, 0) / totalWords
      : 0;

    return this.repo.completeSession(sessionId, videoUrl, Math.round(avgScore));
  }
}
