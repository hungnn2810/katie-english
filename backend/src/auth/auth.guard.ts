import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from './jwt.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('No token');
    const payload = this.tokenService.verify(auth.slice(7));
    if (!payload) throw new UnauthorizedException('Invalid token');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { approved: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Invalid token');
    if (!user.approved) throw new ForbiddenException('Account pending approval');
    (req as any).user = payload;
    return true;
  }
}

@Injectable()
export class TeacherGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('No token');
    const payload = this.tokenService.verify(auth.slice(7));
    if (!payload) throw new UnauthorizedException('Invalid token');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { approved: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Invalid token');
    if (!user.approved) throw new ForbiddenException('Account pending approval');
    if (payload.role !== 'TEACHER') throw new ForbiddenException('Teachers only');
    (req as any).user = payload;
    return true;
  }
}
