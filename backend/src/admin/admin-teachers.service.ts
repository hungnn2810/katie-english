import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto } from './admin-teachers.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole, Prisma } from '@prisma/client';

const TEACHER_SELECT = {
  id: true,
  upn: true,
  name: true,
  phone: true,
  disabled: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminTeachersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { role: UserRole.TEACHER },
      select: TEACHER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateTeacherDto) {
    // REVIEW H-02: OR(upn, email) pre-check covers both unique constraints
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ upn: dto.email }, { email: dto.email }] },
      select: { id: true },
    });
    if (exists !== null) {
      throw new ConflictException('An account with this email already exists.');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    // REVIEW H-02: P2002 backstop — catch race-condition unique violation
    try {
      return await this.prisma.user.create({
        data: {
          upn: dto.email,
          email: dto.email,
          name: dto.name,
          phone: dto.phone,
          password: hashed,
          role: UserRole.TEACHER,
          approved: true,
        },
        select: TEACHER_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('An account with this email already exists.');
      }
      throw err;
    }
  }

  async findById(id: number) {
    const u = await this.prisma.user.findFirst({
      where: { id, role: UserRole.TEACHER },
    });
    if (!u) throw new NotFoundException(`Teacher ${id} not found`);
    return u;
  }

  async update(id: number, dto: UpdateTeacherDto) {
    await this.findById(id);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({
      where: { id },
      data,
      select: TEACHER_SELECT,
    });
  }

  async setDisabled(id: number, disabled: boolean) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { disabled },
      select: { id: true, upn: true, disabled: true },
    });
  }
}
