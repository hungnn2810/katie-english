import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './jwt.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const baseUser = {
  id: 1,
  upn: 'teacher@test.com',
  password: 'hashed',
  role: 'TEACHER' as const,
  approved: true,
  disabled: false,
  studentId: null,
  email: 'teacher@test.com',
  name: 'Test Teacher',
  phone: '0901234567',
  passwordResetRequested: false,
  registrationData: null,
  createdAt: new Date(),
};

describe('AuthService - disabled teacher login gate (Test 7)', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let tokenService: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };
    tokenService = { sign: jest.fn().mockReturnValue('signed-token') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('throws ForbiddenException("Account disabled") when teacher is disabled', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, disabled: true });
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    await expect(
      service.login({ upn: 'teacher@test.com', password: 'pw123' }),
    ).rejects.toThrow(new ForbiddenException('Account disabled'));
  });

  it('login succeeds normally for enabled teacher (disabled: false)', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, disabled: false });
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    const result = await service.login({ upn: 'teacher@test.com', password: 'pw123' });
    expect(result).toHaveProperty('token', 'signed-token');
  });

  it('approved check still fires before disabled check (student unapproved still returns 403 pending approval)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      role: 'STUDENT',
      approved: false,
      disabled: false,
    });
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    await expect(
      service.login({ upn: 'student@test.com', password: 'pw123' }),
    ).rejects.toThrow(new ForbiddenException('Account pending approval'));
  });
});
