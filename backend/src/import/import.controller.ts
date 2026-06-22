import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { TeacherOrAdminGuard } from '../auth/auth.guard';
import { ImportService } from './import.service';

@Controller('import')
@UseGuards(TeacherOrAdminGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.originalname.endsWith('.xlsx')) {
      throw new BadRequestException('Only .xlsx files are accepted');
    }
    const user = (req as any).user as { id: number; role: string };
    return this.importService.processUpload(file.buffer, user);
  }

  @Get('template')
  getTemplate(@Res() res: Response): void {
    const buffer = this.importService.generateTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="import-template.xlsx"');
    res.end(buffer);
  }
}
