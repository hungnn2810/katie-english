import { Test } from '@nestjs/testing';
import { AdminAuthService } from './admin-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/jwt.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockUser = {
  id: 1,
  upn: 'admin@katie.com',
  password: 'hashed',
  role: 'ADMIN' as const,
  approved: true,
  studentId: null,
  email: 'admin@katie.com',
  name: null,
  phone: null,
  disabled: false,
  passwordResetRequested: false,
  registrationData: null,
  createdAt: new Date(),
};

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let tokenService: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };
    tokenService = { sign: jest.fn().mockReturnValue('signed-token') };

    const module = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get(AdminAuthService);
  });

  describe('login', () => {
    it('returns token and user on valid admin credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      const result = await service.login({ email: 'admin@katie.com', password: 'pass' });

      expect(result).toEqual({
        token: 'signed-token',
        user: { id: 1, email: 'admin@katie.com', role: 'ADMIN' },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { upn: 'admin@katie.com' } });
    });

    it('throws UnauthorizedException with generic message when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@test.com', password: 'pass' })).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('throws UnauthorizedException with generic message when user role is not ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'TEACHER' });

      await expect(service.login({ email: 'teacher@test.com', password: 'pass' })).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('throws UnauthorizedException with generic message when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      await expect(service.login({ email: 'admin@katie.com', password: 'wrong' })).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });
  });
});
