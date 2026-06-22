import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto, UpdateHomeworkDto, CreateAssignmentDto, UpdateAssignmentDto, CreateReadingHomeworkDto, UpdateReadingHomeworkDto, CreateVocabHomeworkDto, UpdateVocabHomeworkDto, CreateListenHomeworkDto, UpdateListenHomeworkDto } from './homework.dto';
import { AuthGuard, TeacherOrAdminGuard } from '../auth/auth.guard';
import { StorageService } from '../storage/storage.service';

@UseGuards(AuthGuard)
@Controller('homework')
export class HomeworkController {
  constructor(
    private readonly service: HomeworkService,
    private readonly storage: StorageService,
  ) {}

  private static readonly ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  private static readonly MIME_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };

  @UseGuards(TeacherOrAdminGuard)
  @Post('image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!HomeworkController.ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, and GIF images are accepted');
    }
    const ext = HomeworkController.MIME_EXT[file.mimetype] ?? 'jpg';
    const key = `homework-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const url = await this.storage.upload(key, file.buffer, file.mimetype);
    return { url };
  }

  // ── Reading-specific routes (must precede generic :id routes) ────────────
  @UseGuards(TeacherOrAdminGuard)
  @Post('reading') createReading(@Body() dto: CreateReadingHomeworkDto) { return this.service.createReadingHomework(dto); }
  @Get('reading/:id') findReading(@Param('id', ParseIntPipe) id: number) { return this.service.findReadingById(id); }
  @UseGuards(TeacherOrAdminGuard)
  @Put('reading/:id') updateReading(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReadingHomeworkDto) { return this.service.updateReadingHomework(id, dto); }

  // ── Vocab-specific routes (must precede generic :id routes) ──────────────
  @UseGuards(TeacherOrAdminGuard)
  @Post('vocab') createVocab(@Body() dto: CreateVocabHomeworkDto) { return this.service.createVocabHomework(dto); }
  @Get('vocab/:id') findVocab(@Param('id', ParseIntPipe) id: number) { return this.service.findVocabById(id); }
  @UseGuards(TeacherOrAdminGuard)
  @Put('vocab/:id') updateVocab(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVocabHomeworkDto) { return this.service.updateVocabHomework(id, dto); }

  // ── Audio upload for LISTEN prompts ──────────────────────────────────────
  private static readonly ALLOWED_AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg']);

  @UseGuards(TeacherOrAdminGuard)
  @Post('audio')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadAudio(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!HomeworkController.ALLOWED_AUDIO_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only mp3, wav, and webm audio files are accepted');
    }
    const ext = file.mimetype.includes('mpeg') || file.mimetype.includes('mp3') ? 'mp3'
      : file.mimetype.includes('wav') ? 'wav' : 'webm';
    const key = `listen-audio/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const url = await this.storage.upload(key, file.buffer, file.mimetype);
    return { url };
  }

  // ── LISTEN-specific routes (must precede generic :id routes) ─────────────
  @UseGuards(TeacherOrAdminGuard)
  @Post('listen') createListen(@Body() dto: CreateListenHomeworkDto) { return this.service.createListenHomework(dto); }
  @Get('listen/:id') findListen(@Param('id', ParseIntPipe) id: number) { return this.service.findListenById(id); }
  @UseGuards(TeacherOrAdminGuard)
  @Put('listen/:id') updateListen(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateListenHomeworkDto) { return this.service.updateListenHomework(id, dto); }

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); }
  @UseGuards(TeacherOrAdminGuard)
  @Post() create(@Body() dto: CreateHomeworkDto) { return this.service.create(dto); }
  @UseGuards(TeacherOrAdminGuard)
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHomeworkDto) { return this.service.update(id, dto); }
  @UseGuards(TeacherOrAdminGuard)
  @Delete(':id') delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }

  @UseGuards(TeacherOrAdminGuard)
  @Post('assignment') createAssignment(@Body() dto: CreateAssignmentDto) { return this.service.createAssignment(dto); }
  @Get('assignment/:id') findAssignment(@Param('id', ParseIntPipe) id: number) { return this.service.findAssignmentById(id); }
  @UseGuards(TeacherOrAdminGuard)
  @Put('assignment/:id') updateAssignment(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssignmentDto) { return this.service.updateAssignment(id, dto); }
  @UseGuards(TeacherOrAdminGuard)
  @Delete('assignment/:id') deleteAssignment(@Param('id', ParseIntPipe) id: number) { return this.service.deleteAssignment(id); }
}
