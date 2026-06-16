import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { GameService } from './game.service';
import { GameLoginDto } from './game.dto';

@Controller('game')
export class GameAuthController {
  constructor(private readonly service: GameService) {}

  @Post('auth/login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  gameLogin(@Body() dto: GameLoginDto) {
    return this.service.gameLogin(dto.classCode, dto.name, dto.password);
  }
}
