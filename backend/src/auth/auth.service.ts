import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './jwt.service';
import { LoginDto, RegisterDto } from './auth.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const token = this.tokenService.sign({
      sub: user.id, email: user.email, role: user.role as 'TEACHER' | 'STUDENT', studentId: user.studentId ?? undefined,
    });
    return { token, user: { id: user.id, email: user.email, role: user.role, studentId: user.studentId } };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        role: dto.role as UserRole,
        studentId: dto.studentId ?? null,
      },
    });
    const token = this.tokenService.sign({
      sub: user.id, email: user.email, role: user.role as 'TEACHER' | 'STUDENT', studentId: user.studentId ?? undefined,
    });
    return { token, user: { id: user.id, email: user.email, role: user.role, studentId: user.studentId } };
  }

  async me(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, studentId: true },
    });
  }
}
