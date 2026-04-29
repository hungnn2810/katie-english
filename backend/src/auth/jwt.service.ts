import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

const JWT_SECRET = process.env.JWT_SECRET ?? 'katie-secret-2024';

export interface JwtPayload {
  sub: number;
  upn: string;
  role: 'TEACHER' | 'STUDENT';
  studentId?: number;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwt: NestJwtService) {}

  sign(payload: JwtPayload): string {
    return this.jwt.sign(payload, { secret: JWT_SECRET, expiresIn: '7d' });
  }

  verify(token: string): JwtPayload | null {
    try {
      return this.jwt.verify<JwtPayload>(token, { secret: JWT_SECRET });
    } catch {
      return null;
    }
  }
}
