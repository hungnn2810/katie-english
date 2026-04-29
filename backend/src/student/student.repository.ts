import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './student.dto';
import { Sex, ParentType } from '@prisma/client';

@Injectable()
export class StudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.student.findMany({
      orderBy: { fullname: 'asc' },
      include: { class: true, parents: true },
    });
  }

  findById(id: number) {
    return this.prisma.student.findUnique({
      where: { id },
      include: { class: true, parents: true },
    });
  }

  findByClass(classId: number) {
    return this.prisma.student.findMany({
      where: { classId },
      include: { parents: true },
    });
  }

  create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        fullname: dto.fullname,
        sex: dto.sex as Sex,
        dateOfBirth: new Date(dto.dateOfBirth),
        classId: dto.classId ?? null,
        parents: {
          create: dto.parents.map((p) => ({
            name: p.name,
            phoneNumber: p.phoneNumber,
            type: p.type as ParentType,
          })),
        },
      },
      include: { class: true, parents: true },
    });
  }

  async update(id: number, dto: UpdateStudentDto) {
    if (dto.parents !== undefined) {
      await this.prisma.parentInfo.deleteMany({ where: { studentId: id } });
    }
    return this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.fullname && { fullname: dto.fullname }),
        ...(dto.sex && { sex: dto.sex as Sex }),
        ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.classId !== undefined && { classId: dto.classId }),
        ...(dto.parents !== undefined && {
          parents: {
            create: dto.parents.map((p) => ({
              name: p.name,
              phoneNumber: p.phoneNumber,
              type: p.type as ParentType,
            })),
          },
        }),
      },
      include: { class: true, parents: true },
    });
  }

  delete(id: number) {
    return this.prisma.student.delete({ where: { id } });
  }
}
