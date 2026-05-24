import { Controller, Get, Delete, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminStudentsService } from './admin-students.service';
import { AdminGuard } from '../auth/auth.guard';

@UseGuards(AdminGuard)
@Controller('admin/students')
export class AdminStudentsController {
  constructor(private readonly service: AdminStudentsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Delete('sessions/:sessionId')
  deleteSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.service.deleteSession(sessionId);
  }

  @Get(':id/results')
  getResults(@Param('id', ParseIntPipe) id: number) {
    return this.service.getResults(id);
  }
}
