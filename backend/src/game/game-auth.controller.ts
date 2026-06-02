import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { GameService } from './game.service';
import { GameLoginDto } from './game.dto';

@Controller('game')
export class GameAuthController {
  constructor(private readonly service: GameService) {}

  @Post('auth/login')
  @HttpCode(200)
  gameLogin(@Body() dto: GameLoginDto) {
    return this.service.gameLogin(dto.classCode, dto.name);
  }
}
