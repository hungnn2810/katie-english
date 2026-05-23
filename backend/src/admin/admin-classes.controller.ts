import { Controller, Get, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { AdminClassesService } from './admin-classes.service';
import { AdminUpdateClassDto } from './admin-classes.dto';
import { AdminGuard } from '../auth/auth.guard';

@UseGuards(AdminGuard)
@Controller('admin/classes')
export class AdminClassesController {
  constructor(private readonly service: AdminClassesService) {}

  @Get()
  findAll(@Query('teacherId') teacherId?: string) {
    const tid = teacherId && teacherId !== 'ALL' ? parseInt(teacherId, 10) : undefined;
    if (tid !== undefined && isNaN(tid)) throw new BadRequestException('teacherId must be a number');
    return this.service.findAll(tid);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminUpdateClassDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
