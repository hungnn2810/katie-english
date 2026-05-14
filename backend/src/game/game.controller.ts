import {
  Controller, Get, Post, Param, Body, ParseIntPipe,
  UseInterceptors, UploadedFile, UseGuards, Res, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { GameService } from './game.service';
import { StartSessionDto, SavePhonicsResultDto } from './game.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('game')
export class GameController {
  constructor(private readonly service: GameService) {}

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
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  savePhonicsResult(
    @Param('id', ParseIntPipe) id: number,
    @Body('wordId') wordId: string,
    @Body('transcribedText') transcribedText: string,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    const dto: SavePhonicsResultDto = { wordId: Number(wordId), transcribedText };
    return this.service.savePhonicsResult(id, dto, audio?.buffer, audio?.mimetype);
  }

  @Post('session/:id/speaking-result')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 100 * 1024 * 1024 } }))
  saveSpeakingResult(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    return this.service.saveSpeakingResult(id, audio?.buffer, audio?.mimetype);
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
