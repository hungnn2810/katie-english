import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from './jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('No token');
    const payload = this.tokenService.verify(auth.slice(7));
    if (!payload) throw new UnauthorizedException('Invalid token');
    (req as any).user = payload;
    return true;
  }
}

@Injectable()
export class TeacherGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('No token');
    const payload = this.tokenService.verify(auth.slice(7));
    if (!payload) throw new UnauthorizedException('Invalid token');
    if (payload.role !== 'TEACHER') throw new ForbiddenException('Teachers only');
    (req as any).user = payload;
    return true;
  }
}
