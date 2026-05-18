import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto, UpdateHomeworkDto, CreateAssignmentDto, UpdateAssignmentDto, CreateReadingHomeworkDto, UpdateReadingHomeworkDto } from './homework.dto';
import { AuthGuard } from '../auth/auth.guard';
import { StorageService } from '../storage/storage.service';

@UseGuards(AuthGuard)
@Controller('homework')
export class HomeworkController {
  constructor(
    private readonly service: HomeworkService,
    private readonly storage: StorageService,
  ) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `homework-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    return { key };
  }

  // ── Reading-specific routes (must precede generic :id routes) ────────────
  @Post('reading') createReading(@Body() dto: CreateReadingHomeworkDto) { return this.service.createReadingHomework(dto); }
  @Get('reading/:id') findReading(@Param('id', ParseIntPipe) id: number) { return this.service.findReadingById(id); }
  @Put('reading/:id') updateReading(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReadingHomeworkDto) { return this.service.updateReadingHomework(id, dto); }

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); }
  @Post() create(@Body() dto: CreateHomeworkDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHomeworkDto) { return this.service.update(id, dto); }
  @Delete(':id') delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }

  @Post('assignment') createAssignment(@Body() dto: CreateAssignmentDto) { return this.service.createAssignment(dto); }
  @Get('assignment/:id') findAssignment(@Param('id', ParseIntPipe) id: number) { return this.service.findAssignmentById(id); }
  @Put('assignment/:id') updateAssignment(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssignmentDto) { return this.service.updateAssignment(id, dto); }
  @Delete('assignment/:id') deleteAssignment(@Param('id', ParseIntPipe) id: number) { return this.service.deleteAssignment(id); }
}
