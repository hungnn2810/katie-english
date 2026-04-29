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
    const existing = await this.prisma.user.findUnique({ where: { upn: dto.upn } });
    if (existing) throw new ConflictException('UPN already registered');
    const student = await this.repo.create(dto);
    const hashed = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.create({
      data: { upn: dto.upn, password: hashed, role: UserRole.STUDENT, approved: true, studentId: student.id },
    });
    return student;
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
