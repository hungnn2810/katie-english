import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto, UpdateStudentDto } from './student.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('students')
export class StudentController {
  constructor(private readonly service: StudentService) {}

  @Get() findAll(@Query('classId') classId?: string) {
    return classId ? this.service.findByClass(Number(classId)) : this.service.findAll();
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); }
  @Post() create(@Body() dto: CreateStudentDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStudentDto) { return this.service.update(id, dto); }
  @Delete(':id') delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
