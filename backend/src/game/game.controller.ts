import {
  Controller, Get, Post, Param, Body, ParseIntPipe,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GameService } from './game.service';
import { StartSessionDto, SaveWordResultDto } from './game.dto';

@Controller('game')
export class GameController {
  constructor(private readonly service: GameService) {}

  @Get('homework/:studentId')
  getHomework(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.service.getAvailableHomework(studentId);
  }

  @Post('session/start')
  startSession(@Body() dto: StartSessionDto) {
    return this.service.startSession(dto);
  }

  @Get('session/:id')
  getSession(@Param('id', ParseIntPipe) id: number) {
    return this.service.getSession(id);
  }

  @Post('session/:id/word-result')
  saveWordResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveWordResultDto,
  ) {
    return this.service.saveWordResult(id, dto);
  }

  @Post('session/:id/complete')
  @UseInterceptors(FileInterceptor('recording'))
  completeSession(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.completeSession(id, file?.buffer, file?.mimetype);
  }
}
