import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthGuard } from './auth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: Request) { return this.authService.me((req as any).user.sub); }
}
