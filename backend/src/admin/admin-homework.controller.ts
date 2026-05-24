import { Controller, Get, Delete, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminHomeworkService } from './admin-homework.service';
import { AdminGuard } from '../auth/auth.guard';

@UseGuards(AdminGuard)
@Controller('admin/homework')
export class AdminHomeworkController {
  constructor(private readonly service: AdminHomeworkService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
