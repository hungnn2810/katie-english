import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ApproveStudentDto, ChangePasswordDto, ForgotPasswordDto, ResetStudentPasswordDto } from './auth.dto';
import { AuthGuard, TeacherGuard } from './auth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto); }

  @Get('pending-students')
  @UseGuards(TeacherGuard)
  pendingStudents() { return this.authService.listPendingStudents(); }

  @Post('approve-student')
  @UseGuards(TeacherGuard)
  approveStudent(@Body() dto: ApproveStudentDto) { return this.authService.approveStudent(dto); }

  @Get('password-reset-requests')
  @UseGuards(TeacherGuard)
  passwordResetRequests() { return this.authService.listPasswordResetRequests(); }

  @Post('reset-student-password')
  @UseGuards(TeacherGuard)
  resetStudentPassword(@Body() dto: ResetStudentPasswordDto) { return this.authService.resetStudentPassword(dto); }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: Request) { return this.authService.me((req as any).user.sub); }

  @Post('change-password')
  @UseGuards(AuthGuard)
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword((req as any).user.sub, dto);
  }
}
