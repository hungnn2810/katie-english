import { Controller, Get, Param, NotFoundException, Res } from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from '../storage/storage.service';

@Controller('homework/image')
export class ImageController {
  constructor(private readonly storage: StorageService) {}

  @Get(':key(*)')
  async serveImage(@Param('key') key: string, @Res() res: Response) {
    try {
      const meta = await this.storage.getObjectMeta(key);
      const contentType = (meta.metaData?.['content-type'] as string | undefined) ?? 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      const stream = await this.storage.getObject(key);
      stream.pipe(res);
    } catch {
      throw new NotFoundException('Image not found');
    }
  }
}
