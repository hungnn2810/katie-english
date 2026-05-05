import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { GameRepository } from './game.repository';
import { StorageService } from '../storage/storage.service';
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
  // Exact word match wins immediately
  if (words.includes(b)) return 100;
  // Find closest individual word to avoid penalizing extra words in transcript
  const bestDist = words.reduce((min, w) => Math.min(min, levenshtein(w, b)), Infinity);
  return Math.max(0, Math.round((1 - bestDist / b.length) * 100));
}

@Injectable()
export class GameService {
  constructor(
    private readonly repo: GameRepository,
    private readonly storage: StorageService,
  ) {}

  async getAvailableHomework(studentId: number) {
    const student = await this.repo.getAvailableHomework(studentId);
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    return student.class?.homeworks ?? [];
  }

  async startSession(dto: StartSessionDto) {
    const existing = await this.repo.findCompletedSession(dto.studentId, dto.homeworkId);
    if (existing) throw new BadRequestException('Homework already completed');
    return this.repo.createSession(dto.studentId, dto.homeworkId);
  }

  async getSession(id: number) {
    const session = await this.repo.getSession(id);
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  async saveWordResult(sessionId: number, dto: SaveWordResultDto) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.completedAt) throw new BadRequestException('Session already completed');

    const word = session.homework.words.find((w) => w.wordId === dto.wordId);
    if (!word) throw new BadRequestException(`Word ${dto.wordId} not in homework`);

    const score = calcScore(dto.transcribedText ?? '', word.word.text);
    return this.repo.saveWordResult(sessionId, dto.wordId, dto.transcribedText, score);
  }

  listSessions(homeworkId?: number, studentId?: number) {
    return this.repo.listSessions(homeworkId, studentId);
  }

  streamRecording(videoUrl: string) {
    // Support legacy full URLs (http://host/bucket/key) and new bare keys
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
    const avgScore = results.length
      ? results.reduce((s, r) => s + r.score, 0) / results.length
      : 0;

    return this.repo.completeSession(sessionId, videoUrl, Math.round(avgScore));
  }
}
