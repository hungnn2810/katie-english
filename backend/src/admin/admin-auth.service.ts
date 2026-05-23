import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/jwt.service';
import { AdminLoginDto } from './admin-auth.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: AdminLoginDto) {
    const user = await this.prisma.user.findUnique({ where: { upn: dto.email } });
    if (!user || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');
    const token = this.tokenService.sign({ sub: user.id, upn: user.upn, role: 'ADMIN' });
    return { token, user: { id: user.id, email: user.upn, role: 'ADMIN' as const } };
  }
}
