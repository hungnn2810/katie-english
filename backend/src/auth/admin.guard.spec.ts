import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { TokenService, JwtPayload } from './jwt.service';
import { AdminGuard } from './auth.guard';

function makeCtx(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('TokenService with ADMIN role', () => {
  let tokenService: TokenService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [TokenService],
    }).compile();
    tokenService = module.get(TokenService);
  });

  it('Test 1: sign accepts ADMIN role payload and returns non-empty string', () => {
    const payload: JwtPayload = { sub: 1, upn: 'admin@katie.com', role: 'ADMIN' };
    const token = tokenService.sign(payload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('Test 2: verify on ADMIN-role token returns payload with role === ADMIN', () => {
    const payload: JwtPayload = { sub: 1, upn: 'admin@katie.com', role: 'ADMIN' };
    const token = tokenService.sign(payload);
    const verified = tokenService.verify(token);
    expect(verified).not.toBeNull();
    expect(verified!.role).toBe('ADMIN');
  });
});

describe('AdminGuard', () => {
  let adminGuard: AdminGuard;
  let tokenService: TokenService;
  let prismaFindUnique: jest.Mock;

  beforeEach(async () => {
    prismaFindUnique = jest.fn().mockResolvedValue({ approved: true, disabled: false, role: 'ADMIN' });
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        TokenService,
        {
          provide: AdminGuard,
          useFactory: (ts: TokenService) => new AdminGuard(ts, { user: { findUnique: prismaFindUnique } } as any),
          inject: [TokenService],
        },
      ],
    }).compile();
    adminGuard = module.get(AdminGuard);
    tokenService = module.get(TokenService);
  });

  it('Test 3: throws UnauthorizedException when authorization header is missing', async () => {
    const ctx = makeCtx({});
    await expect(adminGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('Test 3b: throws UnauthorizedException when authorization header does not start with Bearer', async () => {
    const ctx = makeCtx({ authorization: 'Basic abc123' });
    await expect(adminGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('Test 4: throws ForbiddenException with "Admins only" when JWT role is TEACHER', async () => {
    const token = tokenService.sign({ sub: 1, upn: 'teacher@katie.com', role: 'TEACHER' });
    const ctx = makeCtx({ authorization: `Bearer ${token}` });
    await expect(adminGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(adminGuard.canActivate(ctx)).rejects.toThrow('Admins only');
  });

  it('Test 4b: throws ForbiddenException when JWT role is STUDENT', async () => {
    const token = tokenService.sign({ sub: 2, upn: 'student@katie.com', role: 'STUDENT', studentId: 5 });
    const ctx = makeCtx({ authorization: `Bearer ${token}` });
    await expect(adminGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('Test 5: returns true and sets req.user when JWT role is ADMIN', async () => {
    const payload: JwtPayload = { sub: 1, upn: 'admin@katie.com', role: 'ADMIN' };
    const token = tokenService.sign(payload);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    const result = await adminGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user.role).toBe('ADMIN');
  });
});
