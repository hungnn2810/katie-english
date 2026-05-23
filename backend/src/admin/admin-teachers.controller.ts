import { Controller, Get, Post, Put, Patch, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminTeachersService } from './admin-teachers.service';
import { CreateTeacherDto, UpdateTeacherDto } from './admin-teachers.dto';
import { AdminGuard } from '../auth/auth.guard';

@UseGuards(AdminGuard)
@Controller('admin/teachers')
export class AdminTeachersController {
  constructor(private readonly service: AdminTeachersService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Post()
  create(@Body() dto: CreateTeacherDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeacherDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/disable')
  disable(@Param('id', ParseIntPipe) id: number) { return this.service.setDisabled(id, true); }

  @Patch(':id/enable')
  enable(@Param('id', ParseIntPipe) id: number) { return this.service.setDisabled(id, false); }
}
