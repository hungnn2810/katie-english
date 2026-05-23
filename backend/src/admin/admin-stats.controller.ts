import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/auth.guard';
import { AdminStatsService } from './admin-stats.service';

@UseGuards(AdminGuard)
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly service: AdminStatsService) {}

  @Get()
  get() {
    return this.service.getStats();
  }
}
