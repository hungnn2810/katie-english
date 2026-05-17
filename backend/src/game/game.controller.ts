import {
  Controller, Get, Post, Param, Body, ParseIntPipe,
  UseInterceptors, UploadedFile, UseGuards, Res, NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { GameService } from './game.service';
import { StartSessionDto, SavePhonicsResultDto, SaveReadingResultDto } from './game.dto';
import { AuthGuard } from '../auth/auth.guard';
import { GameJobsService } from './game.jobs.service';

@UseGuards(AuthGuard)
@Controller('game')
export class GameController {
  constructor(
    private readonly service: GameService,
    private readonly jobs: GameJobsService,
  ) {}

  @Get('homework/:studentId')
  getHomework(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.service.getAvailableAssignments(studentId);
  }

  @Post('session/start')
  startSession(@Body() dto: StartSessionDto) {
    return this.service.startSession(dto);
  }

  @Get('session/:id')
  getSession(@Param('id', ParseIntPipe) id: number) {
    return this.service.getSession(id);
  }

  @Post('session/:id/phonics-result')
  @HttpCode(202)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  savePhonicsResult(
    @Param('id', ParseIntPipe) id: number,
    @Body('wordId') wordId: string,
    @Body('transcribedText') transcribedText: string,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    const dto: SavePhonicsResultDto = { wordId: Number(wordId), transcribedText };
    return this.jobs.enqueuePhonicsResult(id, dto, audio?.buffer, audio?.mimetype);
  }

  @Post('session/:id/speaking-result')
  @HttpCode(202)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 100 * 1024 * 1024 } }))
  saveSpeakingResult(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    return this.jobs.enqueueSpeakingResult(id, audio?.buffer, audio?.mimetype);
  }

  @Post('session/:id/reading-result')
  saveReadingResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveReadingResultDto,
  ) {
    return this.service.saveReadingResult(id, dto);
  }

  @Get('job/:jobId')
  getJobStatus(@Param('jobId') jobId: string) {
    return this.jobs.getJobStatus(jobId);
  }

  @Post('session/:id/complete')
  @UseInterceptors(FileInterceptor('recording', { limits: { fileSize: 200 * 1024 * 1024 } }))
  completeSession(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.completeSession(id, file?.buffer, file?.mimetype);
  }

  @Get('session/:id/recording')
  async streamRecording(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const session = await this.service.getSession(id);
    if (!session.videoUrl) throw new NotFoundException('No recording for this session');
    const stream = await this.service.streamRecording(session.videoUrl);
    const ext = session.videoUrl.endsWith('.webm') ? 'webm' : 'mp4';
    res.setHeader('Content-Type', `video/${ext}`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    stream.pipe(res);
  }
}
