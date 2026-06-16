import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StudentRepository } from './student.repository';
import { CreateStudentDto, UpdateStudentDto } from './student.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

@Injectable()
export class StudentService {
  constructor(
    private readonly repo: StudentRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll() { return this.repo.findAll(); }
  findByClass(classId: number) { return this.repo.findByClass(classId); }

  async findById(id: number) {
    const s = await this.repo.findById(id);
    if (!s) throw new NotFoundException(`Student ${id} not found`);
    return s;
  }

  async create(dto: CreateStudentDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { upn: dto.upn } });
      if (existing) throw new ConflictException('UPN already registered');
      const student = await tx.student.create({
        data: {
          fullname: dto.fullname,
          sex: dto.sex as import('@prisma/client').Sex,
          dateOfBirth: new Date(dto.dateOfBirth),
          classId: dto.classId ?? null,
          parents: {
            create: dto.parents.map((p) => ({
              name: p.name,
              phoneNumber: p.phoneNumber,
              type: p.type as import('@prisma/client').ParentType,
            })),
          },
        },
        include: { class: true, parents: true, user: { select: { upn: true } } },
      });
      await tx.user.create({
        data: { upn: dto.upn, password: hashed, role: UserRole.STUDENT, approved: true, studentId: student.id },
      });
      return student;
    });
  }

  async update(id: number, dto: UpdateStudentDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    await this.prisma.user.deleteMany({ where: { studentId: id } });
    return this.repo.delete(id);
  }
}
