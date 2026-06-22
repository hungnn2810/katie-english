import { Controller, UseGuards } from '@nestjs/common';
import { TeacherOrAdminGuard } from '../auth/auth.guard';
import { ImportService } from './import.service';

@Controller('import')
@UseGuards(TeacherOrAdminGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}
}
