import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, Query } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto, UpdateHomeworkDto } from './homework.dto';

@Controller('homework')
export class HomeworkController {
  constructor(private readonly service: HomeworkService) {}

  @Get() findAll(@Query('classId') classId?: string) {
    return classId ? this.service.findByClass(Number(classId)) : this.service.findAll();
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); }
  @Post() create(@Body() dto: CreateHomeworkDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHomeworkDto) { return this.service.update(id, dto); }
  @Delete(':id') delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
