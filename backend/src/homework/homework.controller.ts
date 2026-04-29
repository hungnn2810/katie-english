import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto, UpdateHomeworkDto } from './homework.dto';

@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Get()
  findAll() {
    return this.homeworkService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.homeworkService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateHomeworkDto) {
    return this.homeworkService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHomeworkDto) {
    return this.homeworkService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.homeworkService.delete(id);
  }
}
