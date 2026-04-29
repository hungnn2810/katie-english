import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto, UpdateClassDto } from './class.dto';

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get() findAll() { return this.classService.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.classService.findById(id); }
  @Post() create(@Body() dto: CreateClassDto) { return this.classService.create(dto); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClassDto) { return this.classService.update(id, dto); }
  @Delete(':id') delete(@Param('id', ParseIntPipe) id: number) { return this.classService.delete(id); }
}
