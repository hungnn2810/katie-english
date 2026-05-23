import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './admin-auth.dto';

@UseGuards(ThrottlerGuard)
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @Throttle({ 'admin-login': { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.authService.login(dto);
  }
}
