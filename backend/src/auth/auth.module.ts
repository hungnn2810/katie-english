import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenService } from './jwt.service';
import { AuthGuard, TeacherGuard, AdminGuard, TuitionGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [TokenService, AuthGuard, TeacherGuard, AdminGuard, TuitionGuard, AuthService],
  controllers: [AuthController],
  exports: [TokenService, AuthGuard, TeacherGuard, AdminGuard, TuitionGuard],
})
export class AuthModule {}
