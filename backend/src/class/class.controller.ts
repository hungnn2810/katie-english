import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto, UpdateClassDto, AssignHomeworkDto } from './class.dto';

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  findAll() {
    return this.classService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateClassDto) {
    return this.classService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClassDto) {
    return this.classService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.classService.delete(id);
  }

  @Post(':id/students/:studentId')
  addStudent(
    @Param('id', ParseIntPipe) id: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.classService.addStudent(id, studentId);
  }

  @Delete(':id/students/:studentId')
  removeStudent(
    @Param('id', ParseIntPipe) id: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.classService.removeStudent(id, studentId);
  }

  @Post(':id/homework/:homeworkId')
  addHomework(
    @Param('id', ParseIntPipe) id: number,
    @Param('homeworkId', ParseIntPipe) homeworkId: number,
    @Body() dto: AssignHomeworkDto,
  ) {
    return this.classService.addHomework(id, homeworkId, dto);
  }

  @Delete(':id/homework/:homeworkId')
  removeHomework(
    @Param('id', ParseIntPipe) id: number,
    @Param('homeworkId', ParseIntPipe) homeworkId: number,
  ) {
    return this.classService.removeHomework(id, homeworkId);
  }
}
