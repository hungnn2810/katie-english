import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto, UpdateStudentDto } from './student.dto';

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  findAll() {
    return this.studentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.studentService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStudentDto) {
    return this.studentService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.studentService.delete(id);
  }
}
