import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ClassService } from './class.service';
import { CreateClassDto, UpdateClassDto } from './class.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get() findAll() { return this.classService.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.classService.findById(id); }
  @Post() create(@Body() dto: CreateClassDto, @Req() req: Request) {
    const teacherId = (req as any).user?.sub as number | undefined;
    return this.classService.create(dto, teacherId);
  }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClassDto) { return this.classService.update(id, dto); }
  @Delete(':id') delete(@Param('id', ParseIntPipe) id: number) { return this.classService.delete(id); }
}
