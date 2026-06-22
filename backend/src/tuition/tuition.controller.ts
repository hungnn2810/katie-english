import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { TuitionService } from './tuition.service';
import {
  CreateTuitionConfigDto,
  GenerateRecordsDto,
  RecordPaymentDto,
  SendNotificationsDto,
} from './tuition.dto';
import { TeacherOrAdminGuard } from '../auth/auth.guard';

@UseGuards(TeacherOrAdminGuard)
@Controller('admin/tuition')
export class TuitionController {
  constructor(private readonly service: TuitionService) {}

  @Get('config/:classId')
  async getConfig(@Param('classId', ParseIntPipe) classId: number) {
    const config = await this.service.getConfig(classId);
    if (!config) throw new NotFoundException(`No tuition config for class ${classId}`);
    return config;
  }

  @Put('config/:classId')
  updateConfig(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: CreateTuitionConfigDto,
  ) {
    return this.service.createOrUpdateConfig(classId, dto);
  }

  @Post('records/generate')
  generateRecords(@Body() dto: GenerateRecordsDto) {
    return this.service.generateMonthlyRecords(dto);
  }

  @Patch('records/:id')
  recordPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.service.recordPayment(id, dto);
  }

  @Post('notify')
  sendNotifications(@Body() dto: SendNotificationsDto) {
    return this.service.sendNotifications(dto);
  }

  @Get('report')
  getReport(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('status') status?: string,
  ) {
    // Parse comma-separated status filter: ?status=PENDING,OVERDUE
    const statuses = status ? status.split(',').map((s) => s.trim()) : undefined;
    return this.service.getReport(classId, month, year, statuses);
  }
}
