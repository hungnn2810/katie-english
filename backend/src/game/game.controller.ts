import {
  Controller, Get, Post, Param, Body, ParseIntPipe,
  UseInterceptors, UploadedFile, UseGuards,
  HttpCode, Query, Req, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { GameService } from './game.service';
import { StartSessionDto, SavePhonicsResultDto, SaveReadingResultDto, SaveVocabResultDto, SaveListenResultDto } from './game.dto';
import { AuthGuard, TeacherGuard } from '../auth/auth.guard';
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
  startSession(@Body() dto: StartSessionDto, @Req() req: Request) {
    const callerStudentId: number | undefined = (req as any).user?.studentId;
    if (!callerStudentId || callerStudentId !== dto.studentId) {
      throw new ForbiddenException('Cannot start a session for another student');
    }
    return this.service.startSession(dto);
  }

  @Get('session/:id')
  async getSession(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const session = await this.service.getSession(id);
    const callerStudentId: number | undefined = (req as any).user?.studentId;
    const role: string = (req as any).user?.role;
    if (role === 'STUDENT' && session.studentId !== callerStudentId) {
      throw new ForbiddenException('Cannot access another student\'s session');
    }
    return session;
  }

  @Post('session/:id/phonics-result')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  savePhonicsResult(
    @Param('id', ParseIntPipe) id: number,
    @Body('wordId') wordId: string,
    @Body('transcribedText') transcribedText: string,
    @Req() req: Request,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    const requestingStudentId: number | undefined = (req as any).user?.studentId;
    if (!requestingStudentId) throw new ForbiddenException('Student identity required');
    const wordIdNum = Number(wordId);
    if (!Number.isFinite(wordIdNum) || wordIdNum <= 0) {
      throw new BadRequestException('wordId must be a positive integer');
    }
    const dto: SavePhonicsResultDto = { wordId: wordIdNum, transcribedText };
    return this.service.savePhonicsResult(id, dto, requestingStudentId, audio?.buffer, audio?.mimetype);
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

  @Post('homework/:id/try-speak')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 100 * 1024 * 1024 } }))
  trySpeakingHomework(
    @Param('id', ParseIntPipe) hwId: number,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    return this.service.trySpeakingHomework(hwId, audio?.buffer, audio?.mimetype);
  }

  @Post('homework/:id/try-phonics')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  tryPhonicsHomework(
    @Param('id', ParseIntPipe) hwId: number,
    @Body('wordId') wordId: string,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    return this.service.tryPhonicsHomework(hwId, Number(wordId), audio?.buffer, audio?.mimetype);
  }

  @Post('session/:id/vocab-result')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  saveVocabResult(
    @Param('id', ParseIntPipe) id: number,
    @Body('vocabItemId') vocabItemId: string,
    @Body('transcribedText') transcribedText: string,
    @Req() req: Request,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    const vocabItemIdNum = Number(vocabItemId);
    if (!Number.isFinite(vocabItemIdNum) || vocabItemIdNum <= 0) {
      throw new BadRequestException('vocabItemId must be a positive integer');
    }
    const requestingStudentId: number | undefined = (req as any).user?.studentId;
    if (!requestingStudentId) throw new ForbiddenException('Student identity required');
    const dto: SaveVocabResultDto = { vocabItemId: vocabItemIdNum, transcribedText };
    return this.service.saveVocabResult(id, dto, requestingStudentId, audio?.buffer, audio?.mimetype);
  }

  @Post('session/:id/listen-result')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  saveListenResult(
    @Param('id', ParseIntPipe) id: number,
    @Body('listenItemId') listenItemId: string,
    @Body('transcribedText') transcribedText: string,
    @Req() req: Request,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    const listenItemIdNum = Number(listenItemId);
    if (!Number.isFinite(listenItemIdNum) || listenItemIdNum <= 0) {
      throw new BadRequestException('listenItemId must be a positive integer');
    }
    const requestingStudentId: number | undefined = (req as any).user?.studentId;
    if (!requestingStudentId) throw new ForbiddenException('Student identity required');
    const dto: SaveListenResultDto = { listenItemId: listenItemIdNum, transcribedText };
    return this.service.saveListenResult(id, dto, requestingStudentId, audio?.buffer, audio?.mimetype);
  }

  @Post('session/:id/reading-result')
  saveReadingResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveReadingResultDto,
    @Req() req: Request,
  ) {
    const requestingStudentId: number | undefined = (req as any).user?.studentId;
    if (!requestingStudentId) throw new ForbiddenException('Student identity required');
    return this.service.saveReadingResult(id, dto, requestingStudentId);
  }

  @Get('job/:jobId')
  getJobStatus(@Param('jobId') jobId: string, @Req() req: Request) {
    const callerStudentId: number | undefined = (req as any).user?.studentId;
    return this.jobs.getJobStatus(jobId, callerStudentId);
  }

  @Post('session/:id/complete')
  completeSession(@Param('id', ParseIntPipe) id: number) {
    return this.service.completeSession(id);
  }

  @Get('sessions')
  @UseGuards(TeacherGuard)
  listSessions(
    @Query('assignmentId') assignmentId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.service.listSessions(
      assignmentId ? Number(assignmentId) : undefined,
      studentId ? Number(studentId) : undefined,
    );
  }
}
