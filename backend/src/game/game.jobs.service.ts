import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { GameService } from './game.service';
import { StorageService } from '../storage/storage.service';
import { SavePhonicsResultDto } from './game.dto';

const QUEUE_NAME = 'bfa-jobs';

type JobKind = 'phonics' | 'speaking';

interface BaseJobData {
  kind: JobKind;
  sessionId: number;
  audioKey: string;
  mimeType: string;
}

interface PhonicsJobData extends BaseJobData {
  kind: 'phonics';
  wordId: number;
  transcribedText?: string;
}

interface SpeakingJobData extends BaseJobData {
  kind: 'speaking';
}

type BfaJobData = PhonicsJobData | SpeakingJobData;

@Injectable()
export class GameJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameJobsService.name);
  private readonly connection: IORedis;
  private readonly queue: Queue<BfaJobData>;
  private worker: Worker<BfaJobData> | null = null;
  private readonly webhookUrl = process.env.BFA_WEBHOOK_URL ?? '';
  private readonly concurrency = parseInt(process.env.BFA_QUEUE_CONCURRENCY ?? '1', 10);

  constructor(
    private readonly gameService: GameService,
    private readonly storage: StorageService,
  ) {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<BfaJobData>(QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 },
      },
    });
  }

  async onModuleInit() {
    this.worker = new Worker<BfaJobData>(
      QUEUE_NAME,
      async (job) => this.processJob(job),
      { connection: this.connection, concurrency: this.concurrency },
    );

    this.worker.on('completed', async (job, result) => {
      await this.emitWebhook(job, 'completed', result);
    });

    this.worker.on('failed', async (job, err) => {
      await this.emitWebhook(job, 'failed', { message: err?.message ?? 'Job failed' });
    });

    this.logger.log(`Queue worker started name=${QUEUE_NAME} concurrency=${this.concurrency}`);
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
    await this.queue.close();
    await this.connection.quit();
  }

  async enqueuePhonicsResult(
    sessionId: number,
    dto: SavePhonicsResultDto,
    audioBuffer?: Buffer,
    mimeType?: string,
  ) {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new NotFoundException('Audio buffer missing for phonics job');
    }
    const contentType = mimeType ?? 'audio/webm';
    const ext = contentType.includes('webm') ? 'webm' : contentType.includes('mp4') ? 'mp4' : 'wav';
    const jobId = randomUUID();
    const key = `queue/phonics/${sessionId}/${jobId}.${ext}`;
    await this.storage.upload(key, audioBuffer, contentType);

    await this.queue.add('phonics', {
      kind: 'phonics',
      sessionId,
      wordId: dto.wordId,
      transcribedText: dto.transcribedText,
      audioKey: key,
      mimeType: contentType,
    }, { jobId });

    return { jobId, statusUrl: `/game/job/${jobId}` };
  }

  async enqueueSpeakingResult(
    sessionId: number,
    audioBuffer?: Buffer,
    mimeType?: string,
  ) {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new NotFoundException('Audio buffer missing for speaking job');
    }
    const contentType = mimeType ?? 'audio/webm';
    const ext = contentType.includes('webm') ? 'webm' : contentType.includes('mp4') ? 'mp4' : 'wav';
    const jobId = randomUUID();
    const key = `queue/speaking/${sessionId}/${jobId}.${ext}`;
    await this.storage.upload(key, audioBuffer, contentType);

    await this.queue.add('speaking', {
      kind: 'speaking',
      sessionId,
      audioKey: key,
      mimeType: contentType,
    }, { jobId });

    return { jobId, statusUrl: `/game/job/${jobId}` };
  }

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    const state = await job.getState();
    return {
      jobId,
      state,
      progress: job.progress,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    };
  }

  private async processJob(job: Job<BfaJobData>) {
    const { sessionId, audioKey, mimeType } = job.data;
    const audioBuffer = await this.storage.getObjectBuffer(audioKey);
    try {
      if (job.data.kind === 'speaking') {
        return await this.gameService.saveSpeakingResult(sessionId, audioBuffer, mimeType);
      }
      const dto: SavePhonicsResultDto = {
        wordId: job.data.wordId,
        transcribedText: job.data.transcribedText,
      };
      return await this.gameService.savePhonicsResult(sessionId, dto, audioBuffer, mimeType);
    } finally {
      await this.storage.removeObject(audioKey);
    }
  }

  private async emitWebhook(job: Job, status: 'completed' | 'failed', payload: unknown) {
    if (!this.webhookUrl) {
      return;
    }
    try {
      await axios.post(this.webhookUrl, {
        jobId: job.id,
        status,
        payload,
      }, { timeout: 5000 });
    } catch (err) {
      this.logger.warn(`Webhook failed job=${job.id} status=${status} error=${(err as Error).message}`);
    }
  }
}
