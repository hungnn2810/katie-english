import { Test } from '@nestjs/testing';
import { AdminTeachersService } from './admin-teachers.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

const mockTeacher = {
  id: 1,
  upn: 'teacher@test.com',
  name: 'Test Teacher',
  phone: '0901234567',
  disabled: false,
  createdAt: new Date('2026-01-01'),
};

describe('AdminTeachersService', () => {
  let service: AdminTeachersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AdminTeachersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AdminTeachersService);
  });

  // Test 1: findAll returns only TEACHER role users, ordered by createdAt asc, without password
  describe('findAll', () => {
    it('returns only TEACHER-role users ordered by createdAt asc with select fields', async () => {
      prisma.user.findMany.mockResolvedValue([mockTeacher]);

      await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'TEACHER' },
        select: { id: true, upn: true, name: true, phone: true, disabled: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  // Test 2: create throws ConflictException for duplicate email (OR upn/email check)
  describe('create - REVIEW H-02 duplicate check', () => {
    it('(a) throws ConflictException when existing user has matching upn', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 99 }); // upn match
      await expect(
        service.create({ email: 'teacher@test.com', password: 'pw123', name: 'T1', phone: '123' }),
      ).rejects.toThrow(new ConflictException('An account with this email already exists.'));
    });

    it('(b) throws ConflictException when existing user has matching email field (different upn)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 100 }); // email match
      await expect(
        service.create({ email: 't2@test.com', password: 'pw123', name: 'T2', phone: '456' }),
      ).rejects.toThrow(new ConflictException('An account with this email already exists.'));
    });

    it('(c) proceeds normally when no existing user found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'hashed-pw');
      prisma.user.create.mockResolvedValue(mockTeacher);

      const result = await service.create({ email: 'new@test.com', password: 'pw123', name: 'New', phone: '789' });
      expect(result).toEqual(mockTeacher);
    });
  });

  // Test 3: P2002 backstop
  describe('create - P2002 backstop', () => {
    it('catches Prisma P2002 error and rethrows as ConflictException', async () => {
      prisma.user.findFirst.mockResolvedValue(null); // pre-check passes
      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'hashed-pw');

      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.user.create.mockRejectedValue(p2002Error);

      await expect(
        service.create({ email: 'race@test.com', password: 'pw123', name: 'Race', phone: '000' }),
      ).rejects.toThrow(new ConflictException('An account with this email already exists.'));
    });

    it('rethrows non-P2002 errors unchanged', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'hashed-pw');

      const dbError = new Error('DB connection failed');
      prisma.user.create.mockRejectedValue(dbError);

      await expect(
        service.create({ email: 'err@test.com', password: 'pw123', name: 'Err', phone: '000' }),
      ).rejects.toThrow('DB connection failed');
    });
  });

  // Test 4: create hashes password, sets correct fields
  describe('create - correct user data', () => {
    it('hashes password and creates user with TEACHER role, approved:true, disabled:false', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'bcrypt-hashed');
      prisma.user.create.mockResolvedValue(mockTeacher);

      await service.create({ email: 'teacher@test.com', password: 'plaintext', name: 'T1', phone: '123' });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            upn: 'teacher@test.com',
            email: 'teacher@test.com',
            name: 'T1',
            phone: '123',
            password: 'bcrypt-hashed',
            role: 'TEACHER',
            approved: true,
          }),
          select: { id: true, upn: true, name: true, phone: true, disabled: true, createdAt: true },
        }),
      );
    });
  });

  // Test 5: update only provided fields
  describe('update', () => {
    it('updates only name and phone when provided', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockTeacher, role: 'TEACHER' });
      prisma.user.update.mockResolvedValue({ ...mockTeacher, name: 'Updated' });

      await service.update(1, { name: 'Updated', phone: '999' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ name: 'Updated', phone: '999' }),
        }),
      );
    });

    it('re-hashes and updates password when provided', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockTeacher, role: 'TEACHER' });
      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'new-hashed');
      prisma.user.update.mockResolvedValue(mockTeacher);

      await service.update(1, { password: 'newpass' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password: 'new-hashed' }),
        }),
      );
    });
  });

  // Test 6: setDisabled
  describe('setDisabled', () => {
    it('sets disabled to true', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockTeacher, role: 'TEACHER' });
      prisma.user.update.mockResolvedValue({ id: 1, upn: 'teacher@test.com', disabled: true });

      await service.setDisabled(1, true);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { disabled: true },
        select: { id: true, upn: true, disabled: true },
      });
    });

    it('sets disabled to false', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockTeacher, role: 'TEACHER', disabled: true });
      prisma.user.update.mockResolvedValue({ id: 1, upn: 'teacher@test.com', disabled: false });

      await service.setDisabled(1, false);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { disabled: false },
        select: { id: true, upn: true, disabled: true },
      });
    });

    it('throws NotFoundException when teacher not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.setDisabled(999, true)).rejects.toThrow(
        new NotFoundException('Teacher 999 not found'),
      );
    });
  });
});

